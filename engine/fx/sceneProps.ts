import * as THREE from "three";
import { glowSprite, softGlow } from "./glow";

/**
 * Klip sahnelerinin ortak sahne parçaları (bütün evrenler): origami turnalar, kuş sürüleri, kayan yıldızlar,
 * ateşböcekleri, gökyüzü fenerleri, düşen yapraklar, hacimli ışık huzmesi ve masa lambası.
 * Her şarkı bunları kendi hikâyesine göre kurar ve sürer; parçalar yalnızca ne olduklarını bilir.
 */

// ------------------------------------------------------------------ Kanat çırpan figürler

/** Kuş ya da turna: gövde + iki kanat (kanatlar kendi menteşesinde çırpar). */
export interface Flyer {
  readonly group: THREE.Group;
  readonly wings: [THREE.Object3D, THREE.Object3D];
  phase: number;
}

function triangles(points: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Origami turna (burun +z yönünde; kanat açıklığı ~0.7 m). */
export function crane(material: THREE.Material): Flyer {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    triangles([
      // Gövde (baklava)
      0, 0, -0.12, 0, -0.07, 0, 0, 0, 0.12,
      0, 0, -0.12, 0, 0, 0.12, 0, 0.045, 0,
      // Boyun ve baş
      0, 0.01, 0.08, 0, 0.2, 0.3, 0, 0.03, 0.14,
      0, 0.2, 0.3, 0, 0.17, 0.36, 0, 0.19, 0.31,
      // Kuyruk
      0, 0.01, -0.08, 0, 0.17, -0.32, 0, 0.03, -0.14,
    ]),
    material,
  );
  group.add(body);
  const wing = (side: number) => {
    const pivot = new THREE.Group();
    pivot.add(new THREE.Mesh(triangles([0, 0.03, -0.09, 0, 0.03, 0.11, side * 0.36, 0.07, -0.02]), material));
    group.add(pivot);
    return pivot;
  };
  return { group, wings: [wing(-1), wing(1)], phase: Math.random() * 6 };
}

/** Kuş silueti (martı, karga): kavisli kanatlar. */
export function bird(material: THREE.Material): Flyer {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 3, 6), material);
  body.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), material);
  head.position.set(0, 0.02, 0.17);
  group.add(body, head);
  const wing = (side: number) => {
    const pivot = new THREE.Group();
    pivot.add(new THREE.Mesh(triangles([0, 0, -0.07, 0, 0, 0.08, side * 0.22, 0.04, 0.02, side * 0.22, 0.04, 0.02, 0, 0, -0.07, side * 0.46, -0.02, -0.06]), material));
    group.add(pivot);
    return pivot;
  };
  return { group, wings: [wing(-1), wing(1)], phase: Math.random() * 6 };
}

export function flap(flyer: Flyer, time: number, speed = 9, amount = 0.7): void {
  const a = Math.sin(time * speed + flyer.phase) * amount;
  flyer.wings[0].rotation.z = a;
  flyer.wings[1].rotation.z = -a;
}

/** Uçanı bir noktaya taşır ve gidiş yönüne çevirir (burun +z). */
export function flyTo(flyer: Flyer, position: THREE.Vector3): void {
  const g = flyer.group;
  const dx = position.x - g.position.x;
  const dz = position.z - g.position.z;
  const dy = position.y - g.position.y;
  if (dx * dx + dz * dz > 1e-6) {
    g.rotation.set(-Math.atan2(dy, Math.hypot(dx, dz)) * 0.6, Math.atan2(dx, dz), Math.sin(g.rotation.y * 3) * 0.1);
  }
  g.position.copy(position);
}

// ------------------------------------------------------------------ Kayan yıldızlar

export interface Meteors {
  readonly group: THREE.Group;
  /** Bir kayan yıldız atar (renk verilmezse beyaz-mavi). */
  spawn(color?: THREE.ColorRepresentation): void;
  update(dt: number, center: THREE.Vector3): void;
}

export function createMeteors(count = 8): Meteors {
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.translate(-0.5, 0, 0);
  const streaks = Array.from({ length: count }, () => {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color("#dfe8ff") }, uLife: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 uColor; uniform float uLife; varying vec2 vUv; void main() { float head = pow(vUv.x, 3.0); float core = 1.0 - abs(vUv.y - 0.5) * 2.0; gl_FragColor = vec4(uColor * head * core * core * 2.2 * uLife, 1.0); }",
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = false;
    mesh.frustumCulled = false;
    group.add(mesh);
    return { mesh, material, age: 99, life: 1, velocity: new THREE.Vector3() };
  });
  let cursor = 0;
  const dir = new THREE.Vector3();
  return {
    group,
    spawn(color = "#dfe8ff") {
      const s = streaks[cursor++ % streaks.length];
      s.age = 0;
      s.life = 0.9 + Math.random() * 0.8;
      s.material.uniforms.uColor.value.set(color);
      const a = Math.random() * Math.PI * 2;
      s.mesh.position.set(Math.cos(a) * 140, 90 + Math.random() * 90, Math.sin(a) * 140);
      dir.set(-Math.cos(a) + (Math.random() - 0.5) * 0.8, -0.35 - Math.random() * 0.3, -Math.sin(a) + (Math.random() - 0.5) * 0.8).normalize();
      s.velocity.copy(dir).multiplyScalar(160 + Math.random() * 90);
      s.mesh.visible = true;
    },
    update(dt, center) {
      group.position.set(center.x, 0, center.z);
      for (const s of streaks) {
        if (!s.mesh.visible) continue;
        s.age += dt;
        const k = s.age / s.life;
        if (k >= 1) {
          s.mesh.visible = false;
          continue;
        }
        s.mesh.position.addScaledVector(s.velocity, dt);
        // Şerit hız yönünde uzanır; kameraya dönük kalması için yalnız x ekseni hız yönüne hizalanır.
        s.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.copy(s.velocity).normalize());
        s.mesh.scale.set(28 + 20 * Math.sin(k * Math.PI), 0.9, 1);
        s.material.uniforms.uLife.value = Math.sin(k * Math.PI);
      }
    },
  };
}

// ------------------------------------------------------------------ Işık zerreleri

/** Yanıp sönen ışık zerreleri (ateşböceği, kor, deniz ışıması): bir kutu içinde süzülür. */
export interface Motes {
  readonly points: THREE.Points;
  level: number;
  update(time: number, center: THREE.Vector3): void;
}

export function createMotes(count: number, color: THREE.ColorRepresentation, size: number, box: THREE.Vector3, rise = 0): Motes {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = Array.from({ length: count }, () => ({ x: Math.random() - 0.5, y: Math.random(), z: Math.random() - 0.5, p: Math.random() * 6, s: 0.3 + Math.random() * 0.7 }));
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color, size, map: softGlow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  const motes: Motes = {
    points,
    level: 0,
    update(time, center) {
      seeds.forEach((s, i) => {
        const y = rise ? (s.y + time * rise * s.s * 0.05) % 1 : s.y;
        positions[i * 3] = center.x + (s.x + Math.sin(time * 0.3 * s.s + s.p) * 0.08) * box.x;
        positions[i * 3 + 1] = center.y + y * box.y + Math.sin(time * 0.9 * s.s + s.p) * 0.3;
        positions[i * 3 + 2] = center.z + (s.z + Math.cos(time * 0.27 * s.s + s.p) * 0.08) * box.z;
      });
      geometry.attributes.position.needsUpdate = true;
      material.opacity = motes.level * (0.65 + 0.35 * Math.sin(time * 3.1));
      points.visible = motes.level > 0.01;
    },
  };
  return motes;
}

// ------------------------------------------------------------------ Gökyüzü fenerleri

export interface Lanterns {
  readonly group: THREE.Group;
  /** Yükselişin başlangıcı (update sırasında t = 0'dan itibaren çıkar). */
  release(center: THREE.Vector3): void;
  update(dt: number, time: number, level: number): void;
}

export function createLanterns(count: number): Lanterns {
  const group = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: "#ffcf8a", emissive: "#ff9a3a", emissiveIntensity: 1.6, roughness: 0.9, side: THREE.DoubleSide, transparent: true });
  const shape = new THREE.CylinderGeometry(0.28, 0.2, 0.5, 12, 1, true);
  const items = Array.from({ length: count }, () => {
    const lantern = new THREE.Group();
    lantern.add(new THREE.Mesh(shape, paper));
    const halo = glowSprite("#ffb45a", 1.6);
    lantern.add(halo);
    lantern.visible = false;
    group.add(lantern);
    return { lantern, start: new THREE.Vector3(), delay: 0, drift: new THREE.Vector3(), age: -1 };
  });
  return {
    group,
    release(center) {
      items.forEach((item, i) => {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const r = 2 + Math.random() * 14;
        item.start.set(center.x + Math.cos(a) * r, center.y + Math.random() * 1.5, center.z + Math.sin(a) * r);
        item.delay = i * 0.35 + Math.random() * 0.4;
        item.drift.set((Math.random() - 0.5) * 0.6, 0.9 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6);
        item.age = 0;
      });
    },
    update(dt, time, level) {
      paper.opacity = level;
      for (const [i, item] of items.entries()) {
        if (item.age < 0) {
          item.lantern.visible = false;
          continue;
        }
        item.age += dt;
        const t = Math.max(0, item.age - item.delay);
        item.lantern.visible = t > 0 && level > 0.02;
        item.lantern.position.copy(item.start).addScaledVector(item.drift, t);
        item.lantern.position.x += Math.sin(time * 0.5 + i) * 0.4;
        item.lantern.rotation.y = time * 0.2 + i;
        item.lantern.scale.setScalar(1 + Math.sin(time * 7 + i) * 0.02);
      }
    },
  };
}

// ------------------------------------------------------------------ Düşen yapraklar / taç yaprakları

export interface Petals {
  readonly mesh: THREE.InstancedMesh;
  level: number;
  update(time: number, center: THREE.Vector3): void;
}

export function createPetals(count: number, color: THREE.ColorRepresentation, size = 0.12, box = new THREE.Vector3(24, 14, 24), fall = 0.8): Petals {
  const geometry = new THREE.CircleGeometry(size, 6);
  geometry.scale(1, 0.55, 1);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7, side: THREE.DoubleSide, emissive: color, emissiveIntensity: 0.25 });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;
  const seeds = Array.from({ length: count }, () => ({ x: Math.random() - 0.5, y: Math.random(), z: Math.random() - 0.5, p: Math.random() * 6, s: 0.5 + Math.random() }));
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  const petals: Petals = {
    mesh,
    level: 0,
    update(time, center) {
      seeds.forEach((s, i) => {
        const y = 1 - ((s.y + time * fall * s.s * 0.04) % 1);
        pos.set(center.x + s.x * box.x + Math.sin(time * 0.8 * s.s + s.p) * 0.8, center.y + y * box.y, center.z + s.z * box.z + Math.cos(time * 0.6 * s.s + s.p) * 0.8);
        e.set(time * 1.3 * s.s + s.p, time * 0.7 + s.p, time * s.s);
        matrix.compose(pos, q.setFromEuler(e), one);
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = petals.level > 0.02;
      material.opacity = petals.level;
      material.transparent = petals.level < 1;
    },
  };
  return petals;
}

// ------------------------------------------------------------------ Işık huzmesi, lamba

/** Hacimli ışık konisi (tepeden aşağı; ucu grubun orijininde). Deniz feneri, sokak lambası, spot. */
export function lightCone(color: THREE.ColorRepresentation, length: number, radius: number): THREE.Mesh {
  const geometry = new THREE.ConeGeometry(radius, length, 32, 1, true);
  geometry.translate(0, -length / 2, 0);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(color) }, uLevel: { value: 1 }, uLength: { value: length } },
    vertexShader: "varying float vT; varying vec3 vN; varying vec3 vV; uniform float uLength; void main() { vT = -position.y / uLength; vec4 w = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); gl_Position = projectionMatrix * w; }",
    fragmentShader: "uniform vec3 uColor; uniform float uLevel; varying float vT; varying vec3 vN; varying vec3 vV; void main() { float face = pow(abs(dot(vN, vV)), 1.6); float fade = (1.0 - vT) * (1.0 - vT); gl_FragColor = vec4(uColor * face * fade * 0.55 * uLevel, 1.0); }",
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

export function setConeLevel(cone: THREE.Mesh, level: number): void {
  (cone.material as THREE.ShaderMaterial).uniforms.uLevel.value = level;
  cone.visible = level > 0.01;
}

/** Pirinç masa lambası (başlık +z'ye eğik); `bulb` ışığın çıktığı nokta. */
export function deskLamp(): { group: THREE.Group; bulb: THREE.Object3D; glow: THREE.Sprite } {
  const group = new THREE.Group();
  const brass = new THREE.MeshStandardMaterial({ color: "#b8904a", metalness: 0.85, roughness: 0.3 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.05, 24), brass);
  base.position.y = 0.025;
  const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), brass);
  arm1.position.set(0, 0.28, -0.05);
  arm1.rotation.x = -0.25;
  const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.42, 8), brass);
  arm2.position.set(0, 0.6, 0.08);
  arm2.rotation.x = 0.9;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.2, 24, 1, true), new THREE.MeshStandardMaterial({ color: "#1f3a2a", metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }));
  shade.position.set(0, 0.72, 0.26);
  shade.rotation.x = 0.9;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshBasicMaterial({ color: "#fff2cc" }));
  bulb.position.set(0, 0.66, 0.33);
  const glow = glowSprite("#ffd9a0", 1.4);
  glow.position.copy(bulb.position);
  group.add(base, arm1, arm2, shade, bulb, glow);
  return { group, bulb, glow };
}

// ------------------------------------------------------------------ Yağmur

/** Işığı yakalayan ince yağmur çizgileri (bir kutu içinde, merkez oyuncuyu izler). */
export interface Rain {
  readonly lines: THREE.LineSegments;
  level: number;
  update(dt: number, center: THREE.Vector3): void;
}

export function createRain(count: number, color: THREE.ColorRepresentation, box = new THREE.Vector3(40, 22, 40), speed = 18, length = 0.9): Rain {
  const positions = new Float32Array(count * 6);
  const drops = Array.from({ length: count }, () => ({ x: Math.random() - 0.5, y: Math.random(), z: Math.random() - 0.5, s: 0.8 + Math.random() * 0.4 }));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  const rain: Rain = {
    lines,
    level: 0,
    update(dt, center) {
      for (let i = 0; i < count; i += 1) {
        const d = drops[i];
        d.y -= (dt * speed * d.s) / box.y;
        if (d.y < 0) d.y += 1;
        const x = center.x + d.x * box.x;
        const y = center.y + d.y * box.y;
        const z = center.z + d.z * box.z;
        positions.set([x, y, z, x + 0.06, y - length, z], i * 6);
      }
      geometry.attributes.position.needsUpdate = true;
      material.opacity = rain.level * 0.55;
      lines.visible = rain.level > 0.01;
    },
  };
  return rain;
}

/** Işığı kenarlardan yakalayan malzeme: koyu nesnelerin silueti karanlıkta okunur (fresnel). */
export function addRimLight(material: THREE.MeshStandardMaterial, color: THREE.ColorRepresentation, strength = 0.6, power = 2.6): void {
  const rim = new THREE.Color(color).multiplyScalar(strength);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = { value: rim };
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uRim;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += uRim * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), ${power.toFixed(2)});`,
      );
  };
  material.needsUpdate = true;
}
