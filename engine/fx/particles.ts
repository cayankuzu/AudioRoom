import * as THREE from "three";

export interface ParticleOptions {
  count: number;
  /** Kameranın etrafında sarılan kutunun boyutu (metre). */
  box: THREE.Vector3;
  size: number;
  color: THREE.ColorRepresentation;
  opacity: number;
  additive?: boolean;
  /** Yükseklik alt sınırı (ör. yer seviyesi) — kutu bunun altına inmez. */
  floor?: number;
}

export interface Particles {
  readonly points: THREE.Points;
  /** Akış hızı (m/sn) — ör. (0,-1,0) kül yağışı, (0,0.3,0) yükselen toz. */
  velocity: THREE.Vector3;
  turbulence: number;
  color: THREE.Color;
  opacity: number;
  size: number;
  update(dt: number, center: THREE.Vector3): void;
}

/**
 * GPU'da hareket eden parçacık alanı: konumlar shader'da zamana göre hesaplanır,
 * kamera etrafındaki kutuda sarılır. CPU'da parçacık başına iş yoktur.
 */
export function createParticles(options: ParticleOptions): Particles {
  const positions = new Float32Array(options.count * 3);
  const seeds = new Float32Array(options.count);
  for (let i = 0; i < options.count; i += 1) {
    positions[i * 3] = Math.random() * options.box.x;
    positions[i * 3 + 1] = Math.random() * options.box.y;
    positions[i * 3 + 2] = Math.random() * options.box.z;
    seeds[i] = Math.random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1));

  const uniforms = {
    uOffset: { value: new THREE.Vector3() },
    uCenter: { value: new THREE.Vector3() },
    uBox: { value: options.box.clone() },
    uTime: { value: 0 },
    uTurb: { value: 0.4 },
    uSize: { value: options.size },
    uColor: { value: new THREE.Color(options.color) },
    uOpacity: { value: options.opacity },
    uFloor: { value: options.floor ?? -1e5 },
    uPixelRatio: { value: 1 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: options.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform vec3 uOffset, uCenter, uBox;
      uniform float uTime, uTurb, uSize, uFloor, uPixelRatio;
      varying float vSeed; varying float vFade;
      void main() {
        vec3 p = position + uOffset;
        p += uTurb * vec3(sin(uTime * 0.6 + seed * 40.0), sin(uTime * 0.45 + seed * 23.0), cos(uTime * 0.5 + seed * 31.0));
        vec3 local = mod(p - uCenter + uBox * 0.5, uBox) - uBox * 0.5;
        vec3 world = uCenter + local;
        world.y = max(world.y, uFloor + seed * 0.5);
        vec4 mv = modelViewMatrix * vec4(world, 1.0);
        gl_Position = projectionMatrix * mv;
        vec3 edge = abs(local) / (uBox * 0.5);
        vFade = 1.0 - smoothstep(0.7, 1.0, max(max(edge.x, edge.y), edge.z));
        vSeed = seed;
        gl_PointSize = uSize * (0.6 + seed * 0.8) * uPixelRatio * (300.0 / -mv.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity;
      varying float vSeed; varying float vFade;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * uOpacity * vFade * (0.55 + vSeed * 0.45);
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 3;

  const particles: Particles = {
    points,
    velocity: new THREE.Vector3(0, 0, 0),
    get turbulence() {
      return uniforms.uTurb.value;
    },
    set turbulence(value) {
      uniforms.uTurb.value = value;
    },
    color: uniforms.uColor.value,
    get opacity() {
      return uniforms.uOpacity.value;
    },
    set opacity(value) {
      uniforms.uOpacity.value = value;
      points.visible = value > 0.002;
    },
    get size() {
      return uniforms.uSize.value;
    },
    set size(value) {
      uniforms.uSize.value = value;
    },
    update(dt, center) {
      uniforms.uOffset.value.addScaledVector(particles.velocity, dt);
      uniforms.uTime.value += dt;
      uniforms.uCenter.value.copy(center);
      uniforms.uPixelRatio.value = Math.min(2, window.devicePixelRatio || 1);
    },
  };
  return particles;
}
