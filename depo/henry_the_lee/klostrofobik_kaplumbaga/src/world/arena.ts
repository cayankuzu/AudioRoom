import * as THREE from "three";
import { WORLD } from "../config";

export interface ArenaHandle {
  ready: Promise<void>;
  colliders: THREE.Object3D[];
  getHeightAt(x: number, z: number): number;
  update(time: number, delta: number): void;
  dispose(): void;
}

export function getTerrainHeight(x: number, z: number): number {
  const radial = Math.hypot(x, z);
  const longWave = Math.sin(x * 0.075 + z * 0.025) * 0.42;
  const crossWave = Math.cos(z * 0.11 - x * 0.035) * 0.28;
  const ripple = Math.sin(radial * 0.23) * 0.16;
  const centerCalm = Math.min(1, Math.max(0, (radial - 7) / 11));
  return (longWave + crossWave + ripple) * centerCalm - 0.18;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createTopographicTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#c99b50";
  ctx.fillRect(0, 0, size, size);
  const gradient = ctx.createRadialGradient(520, 480, 30, 520, 480, 730);
  gradient.addColorStop(0, "rgba(249, 215, 145, .22)");
  gradient.addColorStop(0.62, "rgba(83, 74, 38, .08)");
  gradient.addColorStop(1, "rgba(34, 28, 12, .28)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const random = mulberry32(19870813);
  ctx.lineCap = "round";
  for (let band = 0; band < 34; band += 1) {
    const baseY = (band / 33) * size + (random() - 0.5) * 48;
    ctx.beginPath();
    for (let x = -40; x <= size + 40; x += 12) {
      const y =
        baseY +
        Math.sin(x * 0.011 + band * 0.62) * (20 + random() * 14) +
        Math.sin(x * 0.029 - band * 0.41) * 8;
      if (x === -40) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(98, 70, 25, ${0.1 + random() * 0.13})`;
    ctx.lineWidth = 2 + random() * 4;
    ctx.stroke();
  }

  for (let i = 0; i < 2300; i += 1) {
    const alpha = 0.018 + random() * 0.035;
    ctx.fillStyle = random() > 0.4
      ? `rgba(37, 29, 12, ${alpha})`
      : `rgba(255, 232, 177, ${alpha})`;
    const x = random() * size;
    const y = random() * size;
    const radius = 0.4 + random() * 1.8;
    ctx.fillRect(x, y, radius, radius);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4.2, 4.2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createArena(
  scene: THREE.Scene,
  _manager: THREE.LoadingManager,
): ArenaHandle {
  const root = new THREE.Group();
  const colliders: THREE.Object3D[] = [];
  root.name = "klostrofobik-arena";
  scene.add(root);

  scene.background = new THREE.Color(WORLD.fogColor);
  scene.fog = new THREE.FogExp2(WORLD.fogColor, WORLD.fogDensity);

  const skyUniforms = { uTime: { value: 0 } };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(150, 48, 28),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: skyUniforms,
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = normalize(world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vWorld;
        void main() {
          float h = vWorld.y * .5 + .5;
          vec3 bottom = vec3(.22, .14, .045);
          vec3 horizon = vec3(.67, .44, .12);
          vec3 top = vec3(.045, .038, .018);
          vec3 color = mix(bottom, horizon, smoothstep(.05, .43, h));
          color = mix(color, top, smoothstep(.43, .98, h));
          float ribbons = sin(atan(vWorld.z, vWorld.x) * 13.0 + vWorld.y * 18.0 + uTime * .025);
          color += vec3(.12, .075, .016) * smoothstep(.72, 1.0, ribbons) * (1.0 - h) * .32;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    }),
  );
  root.add(sky);

  const groundGeometry = new THREE.PlaneGeometry(205, 205, 104, 104);
  groundGeometry.rotateX(-Math.PI / 2);
  const positions = groundGeometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    positions.setY(i, getTerrainHeight(positions.getX(i), positions.getZ(i)));
  }
  positions.needsUpdate = true;
  groundGeometry.computeVertexNormals();
  const terrainTexture = createTopographicTexture();
  const ground = new THREE.Mesh(
    groundGeometry,
    new THREE.MeshStandardMaterial({
      color: "#d0a45d",
      map: terrainTexture,
      roughness: 0.95,
      metalness: 0.02,
    }),
  );
  ground.receiveShadow = true;
  root.add(ground);

  const route = new THREE.Mesh(
    new THREE.RingGeometry(24.3, 24.55, 160, 1),
    new THREE.MeshBasicMaterial({
      color: "#f0c36a",
      transparent: true,
      opacity: 0.17,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  route.rotation.x = -Math.PI / 2;
  route.position.y = 0.2;
  root.add(route);

  const ringGroup = new THREE.Group();
  for (const [radius, y, color] of [
    [8.2, 5.8, "#be512b"],
    [9.7, 8.2, "#e5bd6d"],
    [7.5, 11.1, "#6d7f43"],
  ] as const) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.035, 8, 120),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    ring.position.y = y;
    ring.rotation.x = Math.PI / 2 + (y % 2) * 0.13;
    ring.rotation.z = y * 0.05;
    ringGroup.add(ring);
  }
  root.add(ringGroup);

  const gateMaterial = new THREE.MeshStandardMaterial({
    color: "#604528",
    roughness: 0.88,
    metalness: 0.08,
  });
  const gateAccent = new THREE.MeshBasicMaterial({
    color: "#e6bd6b",
    transparent: true,
    opacity: 0.34,
  });
  const gateGroup = new THREE.Group();
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    const radius = 53 + Math.sin(i * 2.7) * 6;
    const gate = new THREE.Group();
    const height = 5.5 + (i % 3) * 1.6;
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.42, height, 0.5), gateMaterial);
    const right = left.clone();
    left.position.set(-2, height / 2, 0);
    right.position.set(2, height / 2, 0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.42, 0.5), gateMaterial);
    top.position.y = height;
    const light = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.035, 0.06), gateAccent);
    light.position.set(0, height - 0.18, 0.31);
    gate.add(left, right, top, light);
    colliders.push(left, right, top);
    gate.position.set(Math.sin(angle) * radius, getTerrainHeight(Math.sin(angle) * radius, Math.cos(angle) * radius), Math.cos(angle) * radius);
    gate.rotation.y = angle;
    gate.rotation.z = (i % 2 ? 1 : -1) * 0.025;
    gateGroup.add(gate);
  }
  root.add(gateGroup);

  const random = mulberry32(4202020);
  const dustCount = 820;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustPhases = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(random()) * 88;
    dustPositions[i * 3] = Math.sin(angle) * radius;
    dustPositions[i * 3 + 1] = 0.5 + random() * 17;
    dustPositions[i * 3 + 2] = Math.cos(angle) * radius;
    dustPhases[i] = random() * Math.PI * 2;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: "#f6d98d",
      size: 0.075,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  root.add(dust);

  const shardGroup = new THREE.Group();
  const shardMaterial = new THREE.MeshStandardMaterial({
    color: "#a5562d",
    roughness: 0.64,
    metalness: 0.25,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 22; i += 1) {
    const shard = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.22 + random() * 0.8, 0),
      shardMaterial,
    );
    const angle = random() * Math.PI * 2;
    const radius = 14 + random() * 67;
    shard.position.set(
      Math.sin(angle) * radius,
      2 + random() * 13,
      Math.cos(angle) * radius,
    );
    shard.rotation.set(random() * 2, random() * 2, random() * 2);
    shard.userData.baseY = shard.position.y;
    shard.userData.phase = random() * Math.PI * 2;
    shardGroup.add(shard);
    colliders.push(shard);
  }
  root.add(shardGroup);

  const ready = Promise.resolve();

  return {
    ready,
    colliders,
    getHeightAt: getTerrainHeight,
    update(time, delta) {
      skyUniforms.uTime.value = time;
      ringGroup.rotation.y += delta * 0.035;
      ringGroup.children.forEach((ring, index) => {
        ring.rotation.z += delta * (index % 2 === 0 ? 0.025 : -0.02);
      });
      route.material.opacity = 0.12 + Math.sin(time * 0.8) * 0.035;

      const position = dustGeometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dustCount; i += 1) {
        const base = dustPositions[i * 3 + 1];
        position.setY(i, base + Math.sin(time * 0.34 + dustPhases[i]) * 0.22);
      }
      position.needsUpdate = true;

      shardGroup.children.forEach((shard) => {
        shard.rotation.x += delta * 0.09;
        shard.rotation.y -= delta * 0.06;
        shard.position.y =
          Number(shard.userData.baseY) +
          Math.sin(time * 0.45 + Number(shard.userData.phase)) * 0.55;
      });
    },
    dispose() {
      scene.remove(root);
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Points)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      });
      terrainTexture.dispose();
    },
  };
}
