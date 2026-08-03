import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSETS, BLASTER, BUNNY, WORLD } from "../config";
import type { BurrowSystemHandle } from "./burrows";
import type { CollisionWorldHandle, ProjectileCollision } from "./collisionWorld";

interface Projectile {
  object: THREE.Group;
  velocity: THREE.Vector3;
  age: number;
  mode: "flying" | "rolling" | "resting" | "stuck";
  bounceCount: number;
  spin: number;
  impactCompression: number;
  hitBunny: boolean;
  settledTime: number;
}

interface BurstParticle {
  object: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  baseScale: number;
}

export interface CarrotBlasterHandle {
  readonly ready: Promise<void>;
  snapshot(): Array<{
    mode: Projectile["mode"];
    bounces: number;
    speed: number;
    position: [number, number, number];
    velocity: [number, number, number];
  }>;
  fire(): boolean;
  setBudgets(activeProjectiles: number, particles: number): void;
  update(
    time: number,
    delta: number,
    bunnyPosition: THREE.Vector3,
    canHit: boolean,
    onHit: () => void,
  ): void;
  dispose(): void;
}

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const CARROT_LENGTH = 0.72;
const CARROT_RADIUS = 0.085;
const AIR_DRAG = 0.055;
const ROLLING_RESISTANCE = 4.2;

function loadTexture(
  loader: THREE.TextureLoader,
  url: string,
): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        resolve(texture);
      },
      undefined,
      () => resolve(null),
    );
  });
}

function terrainNormal(
  getHeightAt: (x: number, z: number) => number,
  x: number,
  z: number,
  target: THREE.Vector3,
): THREE.Vector3 {
  const sample = 0.24;
  const left = getHeightAt(x - sample, z);
  const right = getHeightAt(x + sample, z);
  const back = getHeightAt(x, z - sample);
  const front = getHeightAt(x, z + sample);
  return target.set(left - right, sample * 2, back - front).normalize();
}

function segmentHitsSphere(
  start: THREE.Vector3,
  end: THREE.Vector3,
  center: THREE.Vector3,
  radius: number,
  segment: THREE.Vector3,
  closest: THREE.Vector3,
): boolean {
  segment.subVectors(end, start);
  const lengthSq = segment.lengthSq();
  if (lengthSq <= 0.000001) return end.distanceToSquared(center) <= radius * radius;
  const amount = THREE.MathUtils.clamp(
    closest.subVectors(center, start).dot(segment) / lengthSq,
    0,
    1,
  );
  closest.copy(start).addScaledVector(segment, amount);
  return closest.distanceToSquared(center) <= radius * radius;
}

function buildCarrot(scale = 1): THREE.Group {
  const root = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.ConeGeometry(0.09 * scale, 0.54 * scale, 12),
    new THREE.MeshStandardMaterial({
      color: "#ee6b25",
      emissive: "#6b1c05",
      emissiveIntensity: 0.2,
      roughness: 0.72,
    }),
  );
  body.position.y = -0.02 * scale;
  const leafMaterial = new THREE.MeshStandardMaterial({
    color: "#719449",
    roughness: 0.9,
  });
  for (let i = 0; i < 3; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.018 * scale, 0.17 * scale, 3, 6),
      leafMaterial,
    );
    leaf.position.y = 0.3 * scale;
    leaf.rotation.z = (i - 1) * 0.42;
    leaf.rotation.y = i * 2.1;
    root.add(leaf);
  }
  root.add(body);
  return root;
}

function prepareCarrotModel(
  source: THREE.Group,
  bodyTexture: THREE.Texture | null,
  leavesTexture: THREE.Texture | null,
): THREE.Group {
  const bounds = new THREE.Box3().setFromObject(source);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  const longest = Math.max(size.x, size.y, size.z, 0.001);
  const normalizedScale = CARROT_LENGTH / longest;
  source.position.set(
    -center.x * normalizedScale,
    -center.y * normalizedScale,
    -center.z * normalizedScale,
  );
  source.scale.setScalar(normalizedScale);

  const root = new THREE.Group();
  root.add(source);
  if (size.x >= size.y && size.x >= size.z) root.rotation.z = Math.PI / 2;
  else if (size.z >= size.x && size.z >= size.y) root.rotation.x = -Math.PI / 2;
  let bodyMesh: THREE.Mesh | null = null;
  let leavesMesh: THREE.Mesh | null = null;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const isLeaves = object.name.toLowerCase().includes("leaves") || object.name.endsWith("_1");
    const oldMaterials = Array.isArray(object.material) ? object.material : [object.material];
    oldMaterials.forEach((material) => {
      if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
      material.dispose();
    });
    object.material = new THREE.MeshStandardMaterial({
      color: isLeaves ? "#75a93d" : "#ff7a18",
      map: isLeaves ? leavesTexture : bodyTexture,
      emissive: isLeaves ? "#172b09" : "#4a1303",
      emissiveIntensity: 0.16,
      roughness: isLeaves ? 0.88 : 0.72,
      metalness: 0,
      side: isLeaves ? THREE.DoubleSide : THREE.FrontSide,
    });
    if (isLeaves) leavesMesh = object;
    else bodyMesh = object;
    object.castShadow = true;
    object.receiveShadow = true;
  });
  root.updateMatrixWorld(true);
  if (bodyMesh && leavesMesh) {
    const bodyCenter = new THREE.Box3().setFromObject(bodyMesh).getCenter(new THREE.Vector3());
    const leavesCenter = new THREE.Box3().setFromObject(leavesMesh).getCenter(new THREE.Vector3());
    if (leavesCenter.y < bodyCenter.y) root.rotateZ(Math.PI);
  }
  return root;
}

function cloneCarrot(template: THREE.Group): THREE.Group {
  const clone = template.clone(true);
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    // Geometri ve materyaller değişmez; yüzlerce kopyayı GPU belleğine çoğaltma.
    object.castShadow = false;
    object.receiveShadow = false;
  });
  return clone;
}

function buildHeldCarrot(): THREE.Group {
  const root = new THREE.Group();
  root.name = "held-carrot";

  const fallbackCarrot = buildCarrot(1.45);
  fallbackCarrot.name = "held-carrot-fallback";
  fallbackCarrot.rotation.x = Math.PI / 2;
  root.add(fallbackCarrot);
  return root;
}

export function createCarrotBlaster(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  manager: THREE.LoadingManager,
  getHeightAt: (x: number, z: number) => number,
  collisionWorld: CollisionWorldHandle,
  burrows?: Pick<BurrowSystemHandle, "isUndergroundPosition" | "resolveProjectile">,
): CarrotBlasterHandle {
  const heldCarrot = buildHeldCarrot();
  heldCarrot.scale.setScalar(0.86);
  heldCarrot.position.set(0.43, -0.42, -0.92);
  heldCarrot.rotation.set(-0.03, -0.22, -0.12);
  camera.add(heldCarrot);

  const muzzle = new THREE.PointLight("#ff8b45", 0, 3.2, 2);
  muzzle.position.set(0, 0.02, -0.52);
  heldCarrot.add(muzzle);

  const projectileRoot = new THREE.Group();
  scene.add(projectileRoot);
  const projectiles: Projectile[] = [];
  const burstParticles: BurstParticle[] = [];
  const archiveCapacity = 512;
  const archiveBodyGeometry = new THREE.ConeGeometry(0.09, 0.54, 8);
  archiveBodyGeometry.translate(0, -0.02, 0);
  const archiveLeafGeometries = Array.from({ length: 3 }, (_, index) => {
    const geometry = new THREE.CapsuleGeometry(0.018, 0.17, 2, 4);
    const transform = new THREE.Object3D();
    transform.position.y = 0.3;
    transform.rotation.z = (index - 1) * 0.42;
    transform.rotation.y = index * 2.1;
    transform.updateMatrix();
    geometry.applyMatrix4(transform.matrix);
    return geometry;
  });
  const archiveBodyMaterial = new THREE.MeshStandardMaterial({
    color: "#ee6b25",
    emissive: "#6b1c05",
    emissiveIntensity: 0.16,
    roughness: 0.78,
  });
  const archiveLeafMaterial = new THREE.MeshStandardMaterial({ color: "#719449", roughness: 0.9 });
  const archiveMeshes = [
    new THREE.InstancedMesh(archiveBodyGeometry, archiveBodyMaterial, archiveCapacity),
    ...archiveLeafGeometries.map(
      (geometry) => new THREE.InstancedMesh(geometry, archiveLeafMaterial, archiveCapacity),
    ),
  ];
  archiveMeshes.forEach((mesh) => {
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    projectileRoot.add(mesh);
  });
  const particleGeometry = new THREE.TetrahedronGeometry(1, 0);
  const particleMaterials = {
    orange: new THREE.MeshBasicMaterial({
      color: "#ff7b35",
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    }),
    leaf: new THREE.MeshBasicMaterial({
      color: "#a7c766",
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    }),
    dustLight: new THREE.MeshBasicMaterial({
      color: "#e4b566",
      transparent: true,
      opacity: 0.64,
      depthWrite: false,
    }),
    dustDark: new THREE.MeshBasicMaterial({
      color: "#9a632c",
      transparent: true,
      opacity: 0.64,
      depthWrite: false,
    }),
  };
  const particlePool: THREE.Mesh[] = Array.from({ length: 80 }, (_, index) => {
    const particle = new THREE.Mesh(
      particleGeometry,
      index % 3 === 0 ? particleMaterials.leaf : particleMaterials.orange,
    );
    particle.visible = index === 0;
    particle.scale.setScalar(0.0001);
    particle.frustumCulled = false;
    projectileRoot.add(particle);
    return particle;
  });
  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const bunnyCenter = new THREE.Vector3();
  const previousPosition = new THREE.Vector3();
  const groundNormal = new THREE.Vector3();
  const tangentialVelocity = new THREE.Vector3();
  const collisionNormal = new THREE.Vector3();
  const tunnelCollisionNormal = new THREE.Vector3();
  const segment = new THREE.Vector3();
  const closestPoint = new THREE.Vector3();
  const slopeAcceleration = new THREE.Vector3();
  const rollAxis = new THREE.Vector3();
  const targetOrientation = new THREE.Quaternion();
  const objectCollision: ProjectileCollision = {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(),
    restitution: 0.48,
    object: null,
  };
  let elapsed = 100;
  let recoil = 0;
  let muzzleEnergy = 0;
  let carrotTemplate: THREE.Group | null = null;
  let carrotBodyTexture: THREE.Texture | null = null;
  let carrotLeavesTexture: THREE.Texture | null = null;
  let activeProjectileBudget = 36;
  let particleBudget = 46;
  let archiveCount = 0;
  let archiveCursor = 0;
  let particleWarmupFrames = 2;
  const archiveMatrix = new THREE.Matrix4();

  const acquireParticle = (
    material: THREE.MeshBasicMaterial,
    position: THREE.Vector3,
    scale: number,
  ): THREE.Mesh | null => {
    const particle = particlePool.pop();
    if (!particle) return null;
    particle.material = material;
    particle.position.copy(position);
    particle.rotation.set(0, 0, 0);
    particle.scale.setScalar(scale);
    particle.visible = true;
    return particle;
  };

  const releaseParticle = (particle: THREE.Mesh) => {
    particle.visible = false;
    particle.scale.setScalar(0.0001);
    particlePool.push(particle);
  };

  const textureLoader = new THREE.TextureLoader(manager);
  const modelPromise = new Promise<THREE.Group | null>((resolve) => {
    new GLTFLoader(manager).load(ASSETS.carrotModel, (gltf) => resolve(gltf.scene), undefined, () => resolve(null));
  });
  const ready = Promise.all([
    modelPromise,
    loadTexture(textureLoader, ASSETS.carrotBodyTexture),
    loadTexture(textureLoader, ASSETS.carrotLeavesTexture),
  ]).then(([model, bodyTexture, leavesTexture]) => {
    carrotBodyTexture = bodyTexture;
    carrotLeavesTexture = leavesTexture;
    if (model) {
      carrotTemplate = prepareCarrotModel(model, bodyTexture, leavesTexture);
      const fallback = heldCarrot.getObjectByName("held-carrot-fallback");
      if (fallback) {
        heldCarrot.remove(fallback);
        fallback.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        });
      }
      const heldModel = cloneCarrot(carrotTemplate);
      heldModel.name = "held-carrot-model";
      heldModel.scale.setScalar(1.28);
      heldModel.rotation.x = Math.PI / 2;
      heldCarrot.add(heldModel);
    } else {
      console.warn("[Klostrofobik] Havuç modeli yüklenemedi, yedek form kullanılıyor.");
    }
  });

  const removeProjectile = (index: number) => {
    const [projectile] = projectiles.splice(index, 1);
    if (!projectile) return;
    projectileRoot.remove(projectile.object);
  };

  const archiveProjectile = (index: number) => {
    const projectile = projectiles[index];
    if (!projectile) return;
    archiveMatrix.compose(
      projectile.object.position,
      projectile.object.quaternion,
      projectile.object.scale,
    );
    archiveMeshes.forEach((mesh) => {
      mesh.setMatrixAt(archiveCursor, archiveMatrix);
      mesh.instanceMatrix.needsUpdate = true;
    });
    archiveCursor = (archiveCursor + 1) % archiveCapacity;
    archiveCount = Math.min(archiveCapacity, archiveCount + 1);
    archiveMeshes.forEach((mesh) => {
      mesh.count = archiveCount;
    });
    removeProjectile(index);
  };

  const spawnBurst = (position: THREE.Vector3) => {
    const available = Math.max(0, particleBudget - burstParticles.length);
    for (let i = 0; i < Math.min(9, available); i += 1) {
      const particleScale = 0.035 + Math.random() * 0.055;
      const particle = acquireParticle(
        i % 3 === 0 ? particleMaterials.leaf : particleMaterials.orange,
        position,
        particleScale,
      );
      if (!particle) break;
      burstParticles.push({
        object: particle,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4.2,
          1.3 + Math.random() * 3.8,
          (Math.random() - 0.5) * 4.2,
        ),
        age: 0,
        lifetime: 0.85,
        baseScale: particleScale,
      });
    }
  };

  const spawnGroundImpact = (
    position: THREE.Vector3,
    normal: THREE.Vector3,
    strength: number,
  ) => {
    const available = Math.max(0, particleBudget - burstParticles.length);
    const count = Math.min(available, 5, Math.max(2, Math.round(strength * 0.26)));
    for (let index = 0; index < count; index += 1) {
      const particleScale = 0.018 + Math.random() * 0.024;
      const particle = acquireParticle(
        index % 2 === 0 ? particleMaterials.dustLight : particleMaterials.dustDark,
        position,
        particleScale,
      );
      if (!particle) break;
      particle.position.addScaledVector(normal, 0.025);
      const lateral = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() * 0.32,
        Math.random() - 0.5,
      );
      burstParticles.push({
        object: particle,
        velocity: lateral.multiplyScalar(0.8 + strength * 0.055).addScaledVector(normal, 0.45),
        age: 0,
        lifetime: 0.42 + Math.random() * 0.2,
        baseScale: particleScale,
      });
    }
  };

  return {
    ready,
    snapshot: () =>
      projectiles.map((projectile) => ({
        mode: projectile.mode,
        bounces: projectile.bounceCount,
        speed: projectile.velocity.length(),
        position: [
          projectile.object.position.x,
          projectile.object.position.y,
          projectile.object.position.z,
        ],
        velocity: [
          projectile.velocity.x,
          projectile.velocity.y,
          projectile.velocity.z,
        ],
      })),
    fire() {
      if (elapsed < BLASTER.cooldown) return false;
      if (projectiles.length >= activeProjectileBudget) {
        const settledIndex = projectiles.findIndex(
          (projectile) => projectile.mode === "resting" || projectile.mode === "stuck",
        );
        if (settledIndex >= 0) archiveProjectile(settledIndex);
      }
      elapsed = 0;
      recoil = 1;
      muzzleEnergy = 1;
      camera.updateMatrixWorld(true);
      camera.getWorldDirection(direction).normalize();
      camera.getWorldPosition(origin);
      origin.addScaledVector(direction, 0.84);
      const object = carrotTemplate ? cloneCarrot(carrotTemplate) : buildCarrot(1.15);
      object.position.copy(origin);
      object.quaternion.setFromUnitVectors(DOWN, direction);
      projectileRoot.add(object);
      projectiles.push({
        object,
        velocity: direction.clone().multiplyScalar(BLASTER.speed),
        age: 0,
        mode: "flying",
        bounceCount: 0,
        spin: (Math.random() - 0.5) * 4,
        impactCompression: 0,
        hitBunny: false,
        settledTime: 0,
      });
      return true;
    },
    setBudgets(nextActiveProjectiles, nextParticles) {
      activeProjectileBudget = THREE.MathUtils.clamp(Math.round(nextActiveProjectiles), 16, 64);
      particleBudget = THREE.MathUtils.clamp(Math.round(nextParticles), 16, 80);
    },
    update(time, delta, bunnyPosition, canHit, onHit) {
      if (particleWarmupFrames > 0) {
        particleWarmupFrames -= 1;
        if (particleWarmupFrames === 0) particlePool.forEach((particle) => {
          particle.visible = false;
        });
      }
      elapsed += delta;
      recoil = Math.max(0, recoil - delta * 7.5);
      muzzleEnergy = Math.max(0, muzzleEnergy - delta * 15);
      heldCarrot.position.z = -0.92 + recoil * 0.075;
      heldCarrot.rotation.z = -0.12 + Math.sin(time * 1.8) * 0.008;
      muzzle.intensity = muzzleEnergy * 3.2;
      bunnyCenter.copy(bunnyPosition);
      bunnyCenter.y += BUNNY.height * 0.52;

      for (let i = projectiles.length - 1; i >= 0; i -= 1) {
        const projectile = projectiles[i];
        projectile.age += delta;
        const frameDelta = Math.min(delta, 0.05);

        if (projectile.mode === "flying") {
          const stepCount = Math.max(1, Math.ceil(frameDelta / (1 / 120)));
          const stepDelta = frameDelta / stepCount;
          for (let step = 0; step < stepCount && projectile.mode === "flying"; step += 1) {
            previousPosition.copy(projectile.object.position);
            projectile.velocity.y -= BLASTER.gravity * stepDelta;
            projectile.velocity.multiplyScalar(Math.exp(-AIR_DRAG * stepDelta));
            projectile.object.position.addScaledVector(projectile.velocity, stepDelta);

            const hitObject = collisionWorld.sweepSphere(
              previousPosition,
              projectile.object.position,
              CARROT_RADIUS,
              objectCollision,
            );
            if (hitObject) {
              projectile.object.position
                .copy(objectCollision.point)
                .addScaledVector(objectCollision.normal, 0.012);
              const normalSpeed = projectile.velocity.dot(objectCollision.normal);
              if (normalSpeed < 0) {
                const impactSpeed = -normalSpeed;
                tangentialVelocity
                  .copy(projectile.velocity)
                  .addScaledVector(objectCollision.normal, -normalSpeed);
                projectile.velocity
                  .copy(tangentialVelocity)
                  .multiplyScalar(0.78)
                  .addScaledVector(
                    objectCollision.normal,
                    impactSpeed * objectCollision.restitution,
                  );
                projectile.bounceCount += 1;
                projectile.spin = THREE.MathUtils.clamp(
                  projectile.spin + tangentialVelocity.length() * 0.6 + impactSpeed * 0.35,
                  -28,
                  28,
                );
                projectile.impactCompression = 1;
                if (impactSpeed > 2.5) {
                  spawnGroundImpact(
                    projectile.object.position,
                    objectCollision.normal,
                    impactSpeed,
                  );
                }
                if (
                  objectCollision.normal.y > 0.55 &&
                  projectile.velocity.length() < 1.1
                ) {
                  projectile.mode = "resting";
                  projectile.velocity.set(0, 0, 0);
                }
              }
              continue;
            }

            const underground = burrows?.isUndergroundPosition(projectile.object.position) ?? false;
            if (
              underground &&
              burrows?.resolveProjectile(
                projectile.object.position,
                CARROT_RADIUS,
                tunnelCollisionNormal,
              )
            ) {
              const normalSpeed = projectile.velocity.dot(tunnelCollisionNormal);
              if (normalSpeed < 0) {
                const impactSpeed = -normalSpeed;
                tangentialVelocity
                  .copy(projectile.velocity)
                  .addScaledVector(tunnelCollisionNormal, -normalSpeed);
                projectile.velocity
                  .copy(tangentialVelocity)
                  .multiplyScalar(0.76)
                  .addScaledVector(tunnelCollisionNormal, impactSpeed * 0.5);
                projectile.bounceCount += 1;
                projectile.spin = THREE.MathUtils.clamp(
                  projectile.spin + impactSpeed * 0.75,
                  -28,
                  28,
                );
                projectile.impactCompression = 1;
                if (impactSpeed > 2.8) {
                  spawnGroundImpact(
                    projectile.object.position,
                    tunnelCollisionNormal,
                    impactSpeed,
                  );
                }
                if (projectile.velocity.length() < 1.15 && tunnelCollisionNormal.y > 0.35) {
                  projectile.mode = "resting";
                  projectile.velocity.set(0, 0, 0);
                }
              }
              continue;
            }

            const hitBunny =
              canHit &&
              !projectile.hitBunny &&
              projectile.velocity.lengthSq() > 4 &&
              segmentHitsSphere(
                previousPosition,
                projectile.object.position,
                bunnyCenter,
                BUNNY.hitRadius,
                segment,
                closestPoint,
              );
            if (hitBunny) {
              projectile.hitBunny = true;
              projectile.object.position.copy(closestPoint);
              collisionNormal.subVectors(closestPoint, bunnyCenter);
              if (collisionNormal.lengthSq() < 0.0001) {
                collisionNormal.copy(projectile.velocity).normalize().negate();
              } else {
                collisionNormal.normalize();
              }
              projectile.velocity.reflect(collisionNormal).multiplyScalar(0.5);
              projectile.velocity.y = Math.max(1.8, projectile.velocity.y);
              projectile.spin += 9;
              projectile.impactCompression = 1;
              spawnBurst(projectile.object.position);
              onHit();
            }

            const ground = getHeightAt(
              projectile.object.position.x,
              projectile.object.position.z,
            );
            if (!underground && projectile.object.position.y <= ground + CARROT_RADIUS) {
              terrainNormal(
                getHeightAt,
                projectile.object.position.x,
                projectile.object.position.z,
                groundNormal,
              );
              projectile.object.position.y = ground + CARROT_RADIUS;
              const normalSpeed = projectile.velocity.dot(groundNormal);
              if (normalSpeed < 0) {
                const speedBefore = Math.max(0.001, projectile.velocity.length());
                const incidence = -normalSpeed / speedBefore;
                tangentialVelocity
                  .copy(projectile.velocity)
                  .addScaledVector(groundNormal, -normalSpeed);
                const restitution = THREE.MathUtils.clamp(
                  0.59 - (1 - incidence) * 0.16 - projectile.bounceCount * 0.075,
                  0.2,
                  0.59,
                );
                projectile.velocity
                  .copy(tangentialVelocity)
                  .multiplyScalar(0.74)
                  .addScaledVector(groundNormal, -normalSpeed * restitution);
                projectile.bounceCount += 1;
                projectile.spin = THREE.MathUtils.clamp(
                  projectile.spin + tangentialVelocity.length() * 0.7 + incidence * 5,
                  -26,
                  26,
                );
                projectile.impactCompression = 1;
                if (-normalSpeed > 3.2) {
                  spawnGroundImpact(projectile.object.position, groundNormal, -normalSpeed);
                }

                const speedAfter = projectile.velocity.length();
                const shouldStick =
                  (projectile.bounceCount >= 2 && incidence > 0.72 && speedAfter < 7.5) ||
                  (projectile.bounceCount >= 4 && incidence > 0.5 && speedAfter < 4.5);
                if (shouldStick) {
                  projectile.mode = "stuck";
                  projectile.velocity.set(0, 0, 0);
                  projectile.object.position.y = ground + CARROT_LENGTH * 0.23;
                  projectile.object.quaternion.setFromUnitVectors(UP, groundNormal);
                  break;
                }

                const reboundNormalSpeed = -normalSpeed * restitution;
                if (
                  speedAfter < 1.35 ||
                  reboundNormalSpeed < 0.82 ||
                  (projectile.bounceCount >= 4 && incidence < 0.3)
                ) {
                  tangentialVelocity
                    .copy(projectile.velocity)
                    .addScaledVector(groundNormal, -projectile.velocity.dot(groundNormal));
                  if (tangentialVelocity.length() > 0.38) {
                    projectile.mode = "rolling";
                    projectile.velocity.copy(tangentialVelocity);
                  } else {
                    projectile.mode = "resting";
                    projectile.velocity.set(0, 0, 0);
                    direction.copy(tangentialVelocity);
                    if (direction.lengthSq() < 0.0001) direction.set(1, 0, 0);
                    direction.addScaledVector(groundNormal, -direction.dot(groundNormal)).normalize();
                    projectile.object.quaternion.setFromUnitVectors(DOWN, direction);
                  }
                  break;
                }
              }
            }

            const radial = Math.hypot(
              projectile.object.position.x,
              projectile.object.position.z,
            );
            const limit = WORLD.radius - 2.2;
            if (radial > limit) {
              const nx = projectile.object.position.x / radial;
              const nz = projectile.object.position.z / radial;
              projectile.object.position.x = nx * limit;
              projectile.object.position.z = nz * limit;
              const outward = projectile.velocity.x * nx + projectile.velocity.z * nz;
              if (outward > 0) {
                projectile.velocity.x -= (1 + BLASTER.wallBounce) * outward * nx;
                projectile.velocity.z -= (1 + BLASTER.wallBounce) * outward * nz;
                projectile.spin *= -0.72;
                projectile.impactCompression = 0.72;
              }
            }
          }

          if (projectile.mode === "flying" && projectile.velocity.lengthSq() > 0.001) {
            direction.copy(projectile.velocity).normalize();
            targetOrientation.setFromUnitVectors(DOWN, direction);
            projectile.object.quaternion.slerp(
              targetOrientation,
              1 - Math.exp(-24 * frameDelta),
            );
            projectile.object.rotateY(projectile.spin * frameDelta);
            projectile.spin *= Math.exp(-0.18 * frameDelta);
          }
        } else if (projectile.mode === "rolling") {
          if (burrows?.isUndergroundPosition(projectile.object.position)) {
            projectile.mode = "resting";
            projectile.velocity.set(0, 0, 0);
            continue;
          }
          terrainNormal(
            getHeightAt,
            projectile.object.position.x,
            projectile.object.position.z,
            groundNormal,
          );
          slopeAcceleration
            .set(0, -BLASTER.gravity, 0)
            .addScaledVector(groundNormal, BLASTER.gravity * groundNormal.y);
          projectile.velocity.addScaledVector(slopeAcceleration, frameDelta);
          projectile.velocity.addScaledVector(
            groundNormal,
            -projectile.velocity.dot(groundNormal),
          );
          const rollingSpeed = projectile.velocity.length();
          const nextRollingSpeed = Math.max(0, rollingSpeed - ROLLING_RESISTANCE * frameDelta);
          if (rollingSpeed > 0.0001) projectile.velocity.multiplyScalar(nextRollingSpeed / rollingSpeed);
          previousPosition.copy(projectile.object.position);
          projectile.object.position.addScaledVector(projectile.velocity, frameDelta);

          if (
            collisionWorld.sweepSphere(
              previousPosition,
              projectile.object.position,
              CARROT_RADIUS,
              objectCollision,
            )
          ) {
            projectile.object.position
              .copy(objectCollision.point)
              .addScaledVector(objectCollision.normal, 0.012);
            const normalSpeed = projectile.velocity.dot(objectCollision.normal);
            if (normalSpeed < 0) {
              projectile.velocity
                .addScaledVector(
                  objectCollision.normal,
                  -(1 + objectCollision.restitution * 0.55) * normalSpeed,
                )
                .multiplyScalar(0.72);
              projectile.bounceCount += 1;
              projectile.spin *= -0.7;
              projectile.impactCompression = 0.72;
            }
          }

          const radial = Math.hypot(projectile.object.position.x, projectile.object.position.z);
          const limit = WORLD.radius - 2.2;
          if (radial > limit) {
            const nx = projectile.object.position.x / radial;
            const nz = projectile.object.position.z / radial;
            projectile.object.position.x = nx * limit;
            projectile.object.position.z = nz * limit;
            const outward = projectile.velocity.x * nx + projectile.velocity.z * nz;
            if (outward > 0) {
              projectile.velocity.x -= (1 + BLASTER.wallBounce * 0.55) * outward * nx;
              projectile.velocity.z -= (1 + BLASTER.wallBounce * 0.55) * outward * nz;
            }
          }

          const ground = getHeightAt(
            projectile.object.position.x,
            projectile.object.position.z,
          );
          projectile.object.position.y = ground + CARROT_RADIUS;
          if (projectile.velocity.lengthSq() > 0.001) {
            direction.copy(projectile.velocity).normalize();
            rollAxis.crossVectors(groundNormal, direction).normalize();
            projectile.object.rotateOnWorldAxis(
              rollAxis,
              previousPosition.distanceTo(projectile.object.position) / CARROT_RADIUS,
            );
          }
          if (nextRollingSpeed <= 0.18) {
            projectile.mode = "resting";
            projectile.velocity.set(0, 0, 0);
          }
        }

        projectile.impactCompression = Math.max(0, projectile.impactCompression - frameDelta * 8);
        const compression = projectile.impactCompression * 0.14;
        projectile.object.scale.set(1 + compression, 1 - compression, 1 + compression);
        if (projectile.mode === "resting" || projectile.mode === "stuck") {
          projectile.settledTime += frameDelta;
          if (projectile.settledTime >= 0.55) {
            archiveProjectile(i);
          }
        } else {
          projectile.settledTime = 0;
        }
      }

      for (let i = burstParticles.length - 1; i >= 0; i -= 1) {
        const particle = burstParticles[i];
        particle.age += delta;
        particle.velocity.y -= 6.5 * delta;
        particle.object.position.addScaledVector(particle.velocity, delta);
        particle.object.rotation.x += delta * 5;
        particle.object.rotation.y += delta * 4;
        const lifeScale = Math.max(0.04, 1 - particle.age / particle.lifetime);
        particle.object.scale.setScalar(particle.baseScale * lifeScale);
        if (particle.age >= particle.lifetime) {
          releaseParticle(particle.object);
          burstParticles.splice(i, 1);
        }
      }
    },
    dispose() {
      camera.remove(heldCarrot);
      scene.remove(projectileRoot);
      while (projectiles.length > 0) removeProjectile(projectiles.length - 1);
      heldCarrot.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
      burstParticles.length = 0;
      particlePool.length = 0;
      particleGeometry.dispose();
      Object.values(particleMaterials).forEach((material) => material.dispose());
      archiveMeshes.forEach((mesh) => mesh.removeFromParent());
      archiveBodyGeometry.dispose();
      archiveLeafGeometries.forEach((geometry) => geometry.dispose());
      archiveBodyMaterial.dispose();
      archiveLeafMaterial.dispose();
      carrotTemplate?.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      carrotBodyTexture?.dispose();
      carrotLeavesTexture?.dispose();
    },
  };
}
