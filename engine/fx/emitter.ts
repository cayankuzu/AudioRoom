import * as THREE from "three";

export interface EmitterOptions {
  count: number;
  /** Ömrün başındaki ve sonundaki renk. */
  colors: [THREE.ColorRepresentation, THREE.ColorRepresentation];
  /** Nokta boyutu (metre, perspektifle küçülür). */
  size: number;
  /** Bir parçacığın ömrü (sn). */
  life: number;
  /** Doğum kutusunun yarı boyutu. */
  spread: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Hıza eklenen rastgele sapma (m/sn). */
  jitter: number;
  /** Dikey ivme (negatif: düşer). */
  gravity?: number;
  additive?: boolean;
  /** true: sürekli akış (ateş, kül); false: tek seferlik patlama (burst ile tetiklenir). */
  loop?: boolean;
}

export interface Emitter {
  readonly points: THREE.Points;
  /** Dünyadaki doğum noktası. */
  readonly origin: THREE.Vector3;
  /** 0..1: sürekli akışta canlı parçacık oranı (0 = söner). */
  rate: number;
  /** 0..1 genel saydamlık. */
  intensity: number;
  /** Tek seferlik patlamayı şimdi başlatır. */
  burst(time: number): void;
  update(time: number): void;
  dispose(): void;
}

/**
 * Durumsuz GPU parçacıkları: her parçacığın konumu zamandan hesaplanır, CPU'da
 * dizi güncellenmez. Ateş, kıvılcım, kül, damla ve patlamalar için tek yayıcı.
 */
export function createEmitter(options: EmitterOptions): Emitter {
  const { count } = options;
  const seeds = new Float32Array(count * 4);
  for (let i = 0; i < seeds.length; i += 1) seeds[i] = Math.random();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 4));

  const uniforms = {
    uTime: { value: 0 },
    uStart: { value: -1000 },
    uLoop: { value: options.loop === false ? 0 : 1 },
    uLife: { value: options.life },
    uOrigin: { value: new THREE.Vector3() },
    uSpread: { value: options.spread.clone() },
    uVelocity: { value: options.velocity.clone() },
    uJitter: { value: options.jitter },
    uGravity: { value: options.gravity ?? 0 },
    uSize: { value: options.size },
    uRate: { value: 1 },
    uIntensity: { value: 1 },
    uColorA: { value: new THREE.Color(options.colors[0]) },
    uColorB: { value: new THREE.Color(options.colors[1]) },
    uScale: { value: window.innerHeight / 2 },
  };

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: options.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */ `
      attribute vec4 seed;
      uniform float uTime, uStart, uLoop, uLife, uJitter, uGravity, uSize, uRate, uScale;
      uniform vec3 uOrigin, uSpread, uVelocity;
      varying float vK; varying float vAlive;
      void main() {
        float t = uLoop > 0.5 ? mod(uTime + seed.x * uLife, uLife) : uTime - uStart;
        float k = clamp(t / uLife, 0.0, 1.0);
        vAlive = (uLoop > 0.5 ? step(seed.w, uRate) : step(0.0, t) * step(t, uLife));
        vK = k;
        vec3 jitter = (seed.yzw * 2.0 - 1.0) * uJitter;
        vec3 spawn = (fract(seed.zwx * 7.13 + seed.y) * 2.0 - 1.0) * uSpread;
        vec3 p = uOrigin + spawn + (uVelocity + jitter) * t + vec3(0.0, 0.5 * uGravity * t * t, 0.0);
        // Hafif kıvrılma: alev ve kül düz çizgide yükselmez.
        p.x += sin(t * 3.0 + seed.y * 20.0) * 0.08 * t;
        p.z += cos(t * 2.6 + seed.z * 20.0) * 0.08 * t;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (1.0 - k * 0.6) * uScale / max(-mv.z, 0.1);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA, uColorB; uniform float uIntensity;
      varying float vK; varying float vAlive;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float soft = pow(clamp(1.0 - d, 0.0, 1.0), 1.6);
        float fade = smoothstep(0.0, 0.08, vK) * (1.0 - vK);
        float a = soft * fade * vAlive * uIntensity;
        if (a < 0.003) discard;
        gl_FragColor = vec4(mix(uColorA, uColorB, vK), a);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 3;

  const emitter: Emitter = {
    points,
    origin: uniforms.uOrigin.value,
    rate: 1,
    intensity: 1,
    burst(time) {
      uniforms.uStart.value = time;
    },
    update(time) {
      uniforms.uTime.value = time;
      uniforms.uRate.value = emitter.rate;
      uniforms.uIntensity.value = emitter.intensity;
      uniforms.uScale.value = window.innerHeight / 2;
      points.visible = emitter.intensity > 0.003 && (options.loop === false ? time - uniforms.uStart.value < options.life : emitter.rate > 0.003);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
  return emitter;
}

/** Hazır ayarlar: alev, kıvılcım, kül, damla. */
export const FIRE = (size = 1): EmitterOptions => ({
  count: 90,
  colors: ["#ffd27a", "#ff3a0a"],
  size: 0.9 * size,
  life: 1.1,
  spread: new THREE.Vector3(0.35 * size, 0.1, 0.35 * size),
  velocity: new THREE.Vector3(0, 2.2 * size, 0),
  jitter: 0.45 * size,
});

export const EMBERS = (size = 1): EmitterOptions => ({
  count: 60,
  colors: ["#ffb347", "#ff2a00"],
  size: 0.14 * size,
  life: 3.2,
  spread: new THREE.Vector3(0.6 * size, 0.2, 0.6 * size),
  velocity: new THREE.Vector3(0, 1.6 * size, 0),
  jitter: 0.9 * size,
});

export const SPARKLE = (color: THREE.ColorRepresentation, size = 1): EmitterOptions => ({
  count: 70,
  colors: ["#ffffff", color],
  size: 0.22 * size,
  life: 1.4,
  spread: new THREE.Vector3(0.2, 0.2, 0.2),
  velocity: new THREE.Vector3(0, 0.8, 0),
  jitter: 3.2 * size,
  gravity: -2.5,
  loop: false,
});
