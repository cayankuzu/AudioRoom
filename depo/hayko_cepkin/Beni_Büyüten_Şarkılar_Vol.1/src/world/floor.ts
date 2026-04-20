import * as THREE from "three";
import { FLOOR, PALETTE, WORLD } from "../config/config";

interface Ripple {
  x: number;
  z: number;
  birth: number;
  amplitude: number;
}

/**
 * 2D hash + value-noise fonksiyonları — vertex shader'da kullanılan
 * FBM ile aynı mantıkta, CPU'da da yumuşak kalın pürüz katmanı üretir.
 * Bu pürüz `getHeightAt` üzerinden hareket sistemine de geçer; oyuncu
 * tıpkı iniş çıkışlı et dokusu üzerindeymiş gibi yürür.
 */
function fHash(x: number, y: number): number {
  let h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  h = h - Math.floor(h);
  return h;
}
function fNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = fHash(ix, iy);
  const b = fHash(ix + 1, iy);
  const c = fHash(ix, iy + 1);
  const d = fHash(ix + 1, iy + 1);
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}
function fFbm(x: number, y: number): number {
  let v = 0;
  let a = 0.5;
  let px = x;
  let py = y;
  for (let i = 0; i < 4; i += 1) {
    v += a * fNoise(px, py);
    px *= 2.07;
    py *= 2.07;
    a *= 0.5;
  }
  return v;
}

function sinHeightAt(x: number, z: number, time: number): number {
  let h = 0;
  for (const w of FLOOR.waves) {
    const cosA = Math.cos(w.angle);
    const sinA = Math.sin(w.angle);
    const proj = x * cosA + z * sinA;
    h += Math.sin(proj * w.k + time * w.speed) * w.amp;
  }
  /**
   * Mikro pürüz: et dokusu yumru/yumru. Statik (zamansız) — yürürken
   * tutarlı bir yer hissi verir. Yüksek frekanslı küçük dalga +
   * orta frekanslı bel/kabarık bölgeler.
   */
  const bumpsBig = (fFbm(x * 0.18, z * 0.18) - 0.5) * 0.55;
  const bumpsSmall = (fFbm(x * 0.55 + 17.3, z * 0.55 - 9.1) - 0.5) * 0.18;
  /** Yavaş nabız ile et dokusu hafifçe şişip iner. */
  const breathe =
    (fFbm(x * 0.06 - 3.1, z * 0.06 + 1.7) - 0.5) *
    0.12 *
    (0.7 + 0.3 * Math.sin(time * 1.4));
  return h + bumpsBig + bumpsSmall + breathe;
}

function rippleHeightAt(
  x: number,
  z: number,
  time: number,
  ripples: readonly Ripple[],
): number {
  let h = 0;
  const speed = FLOOR.step.speed;
  const decay = FLOOR.step.decay;
  for (const r of ripples) {
    const age = time - r.birth;
    if (age < 0) continue;
    const env = Math.exp(-age / decay);
    if (env < 0.02) continue;
    const dx = x - r.x;
    const dz = z - r.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const front = age * speed;
    const delta = dist - front;
    const sigma = 1.6;
    const radial = Math.exp(-(delta * delta) / (2 * sigma * sigma));
    const phase = Math.cos(delta * 1.5);
    h += r.amplitude * env * radial * phase;
  }
  return h;
}

function updateNormals(
  posAttr: THREE.BufferAttribute,
  normalAttr: THREE.BufferAttribute,
  seg: number,
): void {
  const row = seg + 1;
  const n = posAttr.count;
  for (let idx = 0; idx < n; idx++) {
    const j = (idx / row) | 0;
    const i = idx % row;
    const idxL = j * row + (i > 0 ? i - 1 : i);
    const idxR = j * row + (i < seg ? i + 1 : i);
    const idxU = (j > 0 ? j - 1 : j) * row + i;
    const idxD = (j < seg ? j + 1 : j) * row + i;
    const yL = posAttr.getY(idxL);
    const yR = posAttr.getY(idxR);
    const yU = posAttr.getY(idxU);
    const yD = posAttr.getY(idxD);
    const xL = posAttr.getX(idxL);
    const xR = posAttr.getX(idxR);
    const zU = posAttr.getZ(idxU);
    const zD = posAttr.getZ(idxD);
    const dx = xR - xL;
    const dz = zD - zU;
    const dhdx = Math.abs(dx) > 1e-8 ? (yR - yL) / dx : 0;
    const dhdz = Math.abs(dz) > 1e-8 ? (yD - yU) / dz : 0;
    const nx = -dhdx;
    const ny = 1;
    const nz = -dhdz;
    const inv = 1 / Math.hypot(nx, ny, nz);
    normalAttr.setXYZ(idx, nx * inv, ny * inv, nz * inv);
  }
  normalAttr.needsUpdate = true;
}

export interface FloorHandle {
  mesh: THREE.Mesh;
  update(time: number): void;
  getHeightAt(x: number, z: number): number;
  addRipple(x: number, z: number, time: number, amplitude?: number): void;
}

/**
 * Et dokulu zemin — koyu maroon → kor turuncu, üzerinde organik damar
 * deseni. PBR temelli (`MeshStandardMaterial`) bir taban + `onBeforeCompile`
 * ile fragment shader içine FBM tabanlı vasküler ağ enjekte edilir.
 *
 * Sinüs dalgası + step ripple'lar gerçek vertex deformasyonu ile devam eder.
 */
export function createFloor(scene: THREE.Scene): FloorHandle {
  /**
   * Görünür zemin dome'un yatay izdüşümünü (yarıçap = domeRadius)
   * tamamen kaplamalı — aksi hâlde fog ile kapanmadan önce ufukta
   * boşluk görünür. PlaneGeometry kare olduğu için dome çapından
   * %5 büyük tutuyoruz; köşeler kullanıcı görüş alanının dışında
   * kalır ama dome içindeki tüm radyal yönleri kapatır.
   */
  const planeSize = WORLD.domeRadius * 2.1;
  const seg = Math.max(FLOOR.segments, 128);

  const geo = new THREE.PlaneGeometry(planeSize, planeSize, seg, seg);
  geo.rotateX(-Math.PI / 2);

  const fleshColor = new THREE.Color(PALETTE.flesh);
  const vesselColor = new THREE.Color(PALETTE.vessel);
  const emberColor = new THREE.Color(PALETTE.emberSoft);

  const customUniforms = {
    uTime: { value: 0 },
    uVesselColor: { value: vesselColor },
    uEmberColor: { value: emberColor },
    uFleshColor: { value: fleshColor },
  };

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(PALETTE.maroon),
    emissive: new THREE.Color(PALETTE.bloodDeep),
    emissiveIntensity: 0.55,
    /**
     * Yarı-ıslak et yüzeyi — hem nemli parlama (düşük roughness'lı
     * lekeler) hem mat eğimli bel bölgeleri. Ortalama 0.78.
     */
    roughness: 0.78,
    metalness: 0.06,
    flatShading: false,
    fog: true,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = customUniforms.uTime;
    shader.uniforms.uVesselColor = customUniforms.uVesselColor;
    shader.uniforms.uEmberColor = customUniforms.uEmberColor;
    shader.uniforms.uFleshColor = customUniforms.uFleshColor;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      /* glsl */ `
        #include <common>
        varying vec3 vWPos;
      `,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      /* glsl */ `
        #include <worldpos_vertex>
        vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <common>",
      /* glsl */ `
        #include <common>
        uniform float uTime;
        uniform vec3 uVesselColor;
        uniform vec3 uEmberColor;
        uniform vec3 uFleshColor;
        varying vec3 vWPos;

        float h_hash(vec2 p) {
          p = fract(p * vec2(123.34, 345.45));
          p += dot(p, p + 34.345);
          return fract(p.x * p.y);
        }
        float h_noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(h_hash(i), h_hash(i + vec2(1.0, 0.0)), u.x),
            mix(h_hash(i + vec2(0.0, 1.0)), h_hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }
        float h_fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 5; i++) {
            v += a * h_noise(p);
            p *= 2.07;
            a *= 0.5;
          }
          return v;
        }
        float h_vessel(vec2 p, float warp) {
          vec2 q = p + warp * vec2(h_fbm(p * 1.3 + 7.0), h_fbm(p * 1.3 - 3.0));
          float n = h_fbm(q * 1.4);
          float v = 1.0 - abs(n - 0.5) * 2.0;
          return pow(clamp(v, 0.0, 1.0), 7.0);
        }
      `,
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      /* glsl */ `
        #include <emissivemap_fragment>

        vec2 uv = vWPos.xz * 0.085;

        /** Üç katman vasküler ağ — büyük arterler + orta damarlar + kapilarya. */
        float v1 = h_vessel(uv * 0.85, 0.55);
        float v2 = h_vessel(uv * 2.6 + 11.0, 0.85);
        float v3 = h_vessel(uv * 5.8 - 4.7, 1.10);
        float vessels = max(max(v1, v2 * 0.75), v3 * 0.45);

        /** Yavaş nabız — iki katmanlı kalp atışı (sistol + diyastol). */
        float pulse = 0.55 + 0.45 * (
          0.65 * sin(uTime * 1.6) +
          0.35 * sin(uTime * 1.6 * 2.0 + 0.4)
        );
        float vGlow = vessels * (0.45 + 0.55 * pulse);

        /** Et dokusu lekeleri ve mukus parlaması. */
        float fleshPatch = h_fbm(vWPos.xz * 0.04 + 23.0);
        float wetSpots = h_fbm(vWPos.xz * 0.22 + 7.3);

        /** Mikro yapı — bal peteği gibi küçük doku noktacıkları. */
        float micro = h_fbm(vWPos.xz * 1.7 - 13.7);
        float pores = pow(micro, 4.5) * 0.35;

        /** Diffuse'a et tonu lekeleri, damar gölgeleri ve gözenekler. */
        diffuseColor.rgb = mix(diffuseColor.rgb, uFleshColor, fleshPatch * 0.45);
        diffuseColor.rgb = mix(diffuseColor.rgb, uVesselColor, vGlow * 0.72);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.012, 0.008), pores);

        /**
         * Yansıma — ıslak bölgelerde rouhgnessMaterial daha düşük
         * (parlak), pürüzlülük lekelerle modüle ediliyor.
         */
        roughnessFactor = clamp(roughnessFactor - wetSpots * 0.35 + pores * 0.3, 0.18, 0.95);

        /** Emissive — damar üzerinde sıcak kor parıltı, hafif radyal nüve. */
        float radial = 1.0 - smoothstep(0.0, 90.0, length(vWPos.xz));
        totalEmissiveRadiance += uEmberColor * vGlow * 0.65;
        totalEmissiveRadiance += uEmberColor * radial * 0.05 * pulse;
      `,
    );
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = FLOOR.baseY;
  scene.add(mesh);

  const ripples: Ripple[] = [];
  const maxRipples = FLOOR.step.maxAlive;

  const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
  const normalAttr = geo.getAttribute("normal") as THREE.BufferAttribute;
  const baseXZ: { x: number; z: number }[] = [];
  for (let i = 0; i < posAttr.count; i++) {
    baseXZ.push({ x: posAttr.getX(i), z: posAttr.getZ(i) });
  }

  let lastTime = 0;
  let normalTick = 0;

  const getHeightAt = (x: number, z: number): number =>
    sinHeightAt(x, z, lastTime) + rippleHeightAt(x, z, lastTime, ripples);

  const update = (time: number): void => {
    lastTime = time;
    customUniforms.uTime.value = time;

    for (let i = ripples.length - 1; i >= 0; i--) {
      if (time - ripples[i]!.birth > FLOOR.step.decay * 4.5) {
        ripples.splice(i, 1);
      }
    }

    for (let i = 0; i < posAttr.count; i++) {
      const { x, z } = baseXZ[i]!;
      const h = sinHeightAt(x, z, time) + rippleHeightAt(x, z, time, ripples);
      posAttr.setY(i, h);
    }
    posAttr.needsUpdate = true;

    normalTick++;
    if (normalTick >= 2) {
      normalTick = 0;
      updateNormals(posAttr, normalAttr, seg);
    }
  };

  const addRipple = (x: number, z: number, time: number, amplitude?: number) => {
    if (ripples.length >= maxRipples) {
      ripples.shift();
    }
    ripples.push({
      x,
      z,
      birth: time,
      amplitude: amplitude ?? FLOOR.step.amplitude,
    });
  };

  return { mesh, update, getHeightAt, addRipple };
}
