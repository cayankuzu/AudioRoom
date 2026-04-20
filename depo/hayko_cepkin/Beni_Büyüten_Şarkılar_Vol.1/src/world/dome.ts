import * as THREE from "three";
import { PALETTE, WORLD } from "../config/config";

export interface DomeHandle {
  mesh: THREE.Mesh;
  update(time: number): void;
}

/**
 * Yarımküre kubbe — rahim iç yüzeyi:
 *   - taban renk: koyu maroon → kor (yukarı doğru)
 *   - üzerinde organik damar ağı (FBM tabanlı pürüzlü çizgiler) nabız atıyor
 *   - hafif film grain ile et dokusu
 * BackSide render — oyuncu içeride.
 */
export function createDome(scene: THREE.Scene): DomeHandle {
  const geo = new THREE.SphereGeometry(
    WORLD.domeRadius,
    96,
    64,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.55,
  );

  const uniforms = {
    uTime: { value: 0 },
    uColorDeep: { value: new THREE.Color(PALETTE.bloodDeep) },
    uColorMid: { value: new THREE.Color(PALETTE.maroon) },
    uColorWarm: { value: new THREE.Color(PALETTE.flesh) },
    uColorVessel: { value: new THREE.Color(PALETTE.vessel) },
    uColorEmber: { value: new THREE.Color(PALETTE.emberSoft) },
    uRadius: { value: WORLD.domeRadius },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vLocal;
      uniform float uTime;
      uniform float uRadius;

      /** Hash + value-noise — vertex displacement için aynı yapı, küçültülmüş. */
      float dh_hash(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }
      float dh_noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(dh_hash(i), dh_hash(i + vec2(1.0, 0.0)), u.x),
          mix(dh_hash(i + vec2(0.0, 1.0)), dh_hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        /**
         * Rahim duvarı yumuşakça nefes alıp veriyor — vertex normalini
         * kullanarak yarımküreyi içe-dışa şişiriyoruz. Yavaş kontraksiyon
         * (~0.18 Hz) + ince yüzey titreşimleri.
         */
        vec3 n = normalize(position);
        float lat = clamp(position.y / uRadius, 0.0, 1.0);
        float slowBreath = sin(uTime * 1.1 + position.x * 0.005) *
                          cos(uTime * 0.8 + position.z * 0.005);
        float surface = (dh_noise(position.xz * 0.04 + uTime * 0.02) - 0.5) * 0.6;
        float disp =
          slowBreath * 1.8 * smoothstep(0.0, 0.6, lat) +
          surface * 1.4;
        vec3 displaced = position + n * disp;

        vec4 wp = modelMatrix * vec4(displaced, 1.0);
        vWorldPos = wp.xyz;
        vLocal = displaced;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vWorldPos;
      varying vec3 vLocal;

      uniform float uTime;
      uniform vec3  uColorDeep;
      uniform vec3  uColorMid;
      uniform vec3  uColorWarm;
      uniform vec3  uColorVessel;
      uniform vec3  uColorEmber;
      uniform float uRadius;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 6; i++) {
          v += a * noise(p);
          p *= 2.07;
          a *= 0.5;
        }
        return v;
      }

      /** Damar gibi keskin çizgiler için |fbm-0.5| türevi. */
      float vessel(vec2 p, float warp) {
        vec2 q = p + warp * vec2(fbm(p * 1.3 + 13.0), fbm(p * 1.3 - 7.0));
        float n = fbm(q * 1.6);
        float v = 1.0 - abs(n - 0.5) * 2.0;
        return pow(clamp(v, 0.0, 1.0), 6.0);
      }

      void main() {
        float h = clamp(vLocal.y / uRadius, 0.0, 1.0);

        /** Dikey gradyan: alt → derin maroon, üst → sıcak et tonu. */
        vec3 base = mix(uColorDeep, uColorMid, smoothstep(0.0, 0.55, h));
        base = mix(base, uColorWarm, smoothstep(0.55, 0.95, h));

        /** Damar ağı — küresel projeksiyon (lon/lat) ile düz koordinat. */
        float lon = atan(vLocal.z, vLocal.x);
        float lat = h;
        vec2 uv = vec2(lon * 1.6, lat * 6.0);

        /** Üç katmanlı damar — ana arter + yan damarlar + kapilarya ağı. */
        float v1 = vessel(uv * 0.85, 0.55);
        float v2 = vessel(uv * 2.2 + 4.0, 0.85);
        float v3 = vessel(uv * 5.4 - 2.3, 1.20);
        float vessels = max(max(v1 * 0.85, v2 * 0.55), v3 * 0.32);

        /** Çok yavaş nabız — sistol + diyastol katmanı. */
        float pulse = 0.55 + 0.45 * (
          0.65 * sin(uTime * 1.6) +
          0.35 * sin(uTime * 1.6 * 2.0 + 0.7)
        );
        float vesselGlow = vessels * (0.55 + 0.45 * pulse);

        /**
         * Amniyotik sıvı parıltısı — yavaş kayan caustic-benzeri lekeler;
         * bebeği saran sıvının yanardöner camsı katmanını taklit eder.
         */
        vec2 amni = uv + vec2(uTime * 0.04, uTime * -0.025);
        float amniA = fbm(amni * 1.6);
        float amniB = fbm(amni * 1.6 + 12.0);
        float amniotic = pow(amniA * (1.0 - amniB), 1.6) * 0.75;

        /** Damar rengini taban üzerine koy — koyu kan + kor parıltı karışımı. */
        vec3 vesselColor = mix(uColorVessel, uColorEmber, 0.35 + 0.65 * pulse);
        vec3 col = mix(base, vesselColor, vesselGlow * 0.55);

        /** Sıvı parıltısı — sıcak amber tente üzerinde dönen ışık. */
        col += uColorEmber * amniotic * 0.22;

        /** Tepe sıcak halo — kor merkez yukarıda + nabızla genişler. */
        float halo = smoothstep(0.7, 1.0, h);
        col += uColorEmber * halo * (0.18 + 0.06 * pulse);

        /**
         * Uzaktan yayılan nabız dalgaları — uterus kasılması;
         * boyuna (lat) göre yumuşak periyodik bant.
         */
        float wave = sin(lat * 22.0 - uTime * 1.4) * 0.5 + 0.5;
        wave *= smoothstep(0.05, 0.5, h) * (1.0 - smoothstep(0.85, 1.0, h));
        col += uColorVessel * pow(wave, 6.0) * 0.10;

        /** Et dokusu — micro grain (zamana göre yavaş kayan). */
        float grain = (noise(vWorldPos.xz * 4.5 + uTime * 0.05) - 0.5) * 0.04;
        col += grain;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -1;
  scene.add(mesh);

  return {
    mesh,
    update(time: number) {
      uniforms.uTime.value = time;
    },
  };
}
