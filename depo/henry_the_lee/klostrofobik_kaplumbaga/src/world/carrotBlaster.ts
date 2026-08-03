import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSETS, BLASTER, BUNNY, WORLD } from "../config";
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
}

interface BurstParticle {
  object: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
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
    object.geometry = object.geometry.clone();
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();
  });
  return clone;
}

function buildWeapon(): THREE.Group {
  const root = new THREE.Group();
  root.name = "carrot-blaster";
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: "#342619",
    roughness: 0.62,
    metalness: 0.32,
  });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: "#d7612c",
    emissive: "#461508",
    emissiveIntensity: 0.32,
    roughness: 0.48,
    metalness: 0.38,
  });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.62, 16), bodyMaterial);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -0.17;
  const chamber = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.25, 18), accentMaterial);
  chamber.rotation.z = Math.PI / 2;
  chamber.position.set(0, -0.035, 0.1);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.17), bodyMaterial);
  grip.position.set(0, -0.22, 0.17);
  grip.rotation.x = -0.22;
  const sight = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.009, 8, 20), accentMaterial);
  sight.position.set(0, 0.115, -0.44);
  root.add(barrel, chamber, grip, sight);

  const loadedCarrot = buildCarrot(0.38);
  loadedCarrot.name = "loaded-carrot";
  loadedCarrot.position.set(0, 0, -0.57);
  loadedCarrot.rotation.x = Math.PI / 2;
  root.add(loadedCarrot);
  return root;
}

export function createCarrotBlaster(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  manager: THREE.LoadingManager,
  getHeightAt: (x: number, z: number) => number,
  collisionWorld: CollisionWorldHandle,
): CarrotBlasterHandle {
  const weapon = buildWeapon();
  weapon.scale.setScalar(0.68);
  weapon.position.set(0.46, -0.47, -1.06);
  weapon.rotation.set(-0.045, -0.11, -0.045);
  camera.add(weapon);

  const muzzle = new THREE.PointLight("#ff8b45", 0, 3.2, 2);
  muzzle.position.set(0, 0.02, -0.63);
  weapon.add(muzzle);

  const projectileRoot = new THREE.Group();
  scene.add(projectileRoot);
  const projectiles: Projectile[] = [];
  const burstParticles: BurstParticle[] = [];
  const direction = new THREE.Vector3();
  const origin = new THREE.Vector3();
  const bunnyCenter = new THREE.Vector3();
  const previousPosition = new THREE.Vector3();
  const groundNormal = new THREE.Vector3();
  const tangentialVelocity = new THREE.Vector3();
  const collisionNormal = new THREE.Vector3();
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
        const oldLoaded = weapon.getObjectByName("loaded-carrot");
        if (oldLoaded) {
          weapon.remove(oldLoaded);
          oldLoaded.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          });
        }
        const loaded = cloneCarrot(carrotTemplate);
        loaded.name = "loaded-carrot-model";
        loaded.scale.setScalar(0.48);
        loaded.position.set(0, 0, -0.57);
        loaded.rotation.x = Math.PI / 2;
        weapon.add(loaded);
    } else {
      console.warn("[Klostrofobik] Havuç modeli yüklenemedi, yedek form kullanılıyor.");
    }
  });

  const removeProjectile = (index: number) => {
    const [projectile] = projectiles.splice(index, 1);
    if (!projectile) return;
    projectileRoot.remove(projectile.object);
    projectile.object.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => material.dispose());
    });
  };

  const spawnBurst = (position: THREE.Vector3) => {
    for (let i = 0; i < 12; i += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? "#a7c766" : "#ff7b35",
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      });
      const particle = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.035 + Math.random() * 0.055, 0),
        material,
      );
      particle.position.copy(position);
      projectileRoot.add(particle);
      burstParticles.push({
        object: particle,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 4.2,
          1.3 + Math.random() * 3.8,
          (Math.random() - 0.5) * 4.2,
        ),
        age: 0,
        lifetime: 0.85,
      });
    }
  };

  const spawnGroundImpact = (
    position: THREE.Vector3,
    normal: THREE.Vector3,
    strength: number,
  ) => {
    const count = Math.min(7, Math.max(3, Math.round(strength * 0.32)));
    for (let index = 0; index < count; index += 1) {
      const material = new THREE.MeshBasicMaterial({
        color: index % 2 === 0 ? "#e4b566" : "#9a632c",
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      });
      const particle = new THREE.Mesh(
        new THREE.TetrahedronGeometry(0.018 + Math.random() * 0.024, 0),
        material,
      );
      particle.position.copy(position).addScaledVector(normal, 0.025);
      projectileRoot.add(particle);
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
      });
      return true;
    },
    update(time, delta, bunnyPosition, canHit, onHit) {
      elapsed += delta;
      recoil = Math.max(0, recoil - delta * 7.5);
      muzzleEnergy = Math.max(0, muzzleEnergy - delta * 15);
      weapon.position.z = -1.06 + recoil * 0.075;
      weapon.rotation.z = -0.045 + Math.sin(time * 1.8) * 0.006;
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
            if (projectile.object.position.y <= ground + CARROT_RADIUS) {
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
      }

      for (let i = burstParticles.length - 1; i >= 0; i -= 1) {
        const particle = burstParticles[i];
        particle.age += delta;
        particle.velocity.y -= 6.5 * delta;
        particle.object.position.addScaledVector(particle.velocity, delta);
        particle.object.rotation.x += delta * 5;
        particle.object.rotation.y += delta * 4;
        const material = particle.object.material as THREE.MeshBasicMaterial;
        material.opacity = Math.max(0, 1 - particle.age / particle.lifetime);
        if (particle.age >= particle.lifetime) {
          projectileRoot.remove(particle.object);
          particle.object.geometry.dispose();
          material.dispose();
          burstParticles.splice(i, 1);
        }
      }
    },
    dispose() {
      camera.remove(weapon);
      scene.remove(projectileRoot);
      while (projectiles.length > 0) removeProjectile(projectiles.length - 1);
      weapon.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
      burstParticles.forEach((particle) => {
        particle.object.geometry.dispose();
        (particle.object.material as THREE.Material).dispose();
      });
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
