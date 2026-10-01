import * as THREE from "three";

/**
 * Gökyüzü kubbesi: kapaktaki aşırı pozlanmış beyaz gökten gece/uzaya kadar
 * geçiş yapabilen tek shader. Anlar (şarkılar) bu uniform'ları yumuşakça değiştirir.
 */
export interface Sky {
  mesh: THREE.Mesh;
  top: THREE.Color;
  horizon: THREE.Color;
  /** 0..1 yıldız görünürlüğü. */
  stars: { value: number };
  /** 0..1 gökteki kırmızı yarık (Bugün Herkes Ölsün İstedim). */
  crack: { value: number };
  /** 0..1 yarım ay. */
  moon: { value: number };
  /** 0..1 ayın dolunaya tamamlanması. */
  moonFull: { value: number };
  crescent: { value: number };
  /** Ayın gökteki yönü (etkileşim için). */
  moonDirection: THREE.Vector3;
  time: { value: number };
  /** HDR parlaklık çarpanı — tonemapping sonrası gökyüzünün bembeyaz kalması için. */
  intensity: { value: number };
  /** 0..1 gece göğünün canlılığı: samanyolu şeridi, renkli bulutsular, yoğun yıldız tozu. */
  nebula: { value: number };
  nebulaA: THREE.Color;
  nebulaB: THREE.Color;
  /** 0..1 uzay: kubbe her yönde siyah boşluk, yıldızlar ve bulutsular ufkun altında da (yükseliş, yörünge). */
  space: { value: number };
}

export function createSky(): Sky {
  const uniforms = {
    uTop: { value: new THREE.Color("#dcdcdd") },
    uHorizon: { value: new THREE.Color("#f6f6f5") },
    uStars: { value: 0 },
    uCrack: { value: 0 },
    uMoon: { value: 0 },
    uMoonFull: { value: 0 },
    uCrescent: { value: 0 },
    uTime: { value: 0 },
    uIntensity: { value: 2.4 },
    uNebula: { value: 0 },
    uNebulaA: { value: new THREE.Color("#3a4cc8") },
    uNebulaB: { value: new THREE.Color("#c43a8a") },
    uSpace: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon;
      uniform float uStars, uCrack, uMoon, uMoonFull, uCrescent, uTime, uIntensity, uNebula, uSpace;
      uniform vec3 uNebulaA, uNebulaB;
      varying vec3 vDir;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
      float vnoise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float n000 = hash(i), n100 = hash(i + vec3(1, 0, 0)), n010 = hash(i + vec3(0, 1, 0)), n110 = hash(i + vec3(1, 1, 0));
        float n001 = hash(i + vec3(0, 0, 1)), n101 = hash(i + vec3(1, 0, 1)), n011 = hash(i + vec3(0, 1, 1)), n111 = hash(i + vec3(1, 1, 1));
        return mix(mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y), mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y), f.z);
      }
      float fbm(vec3 p) {
        float a = 0.5, s = 0.0;
        for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.07; a *= 0.5; }
        return s;
      }
      void main() {
        vec3 d = normalize(vDir);
        float h = clamp(d.y, -0.2, 1.0);
        vec3 col = mix(uHorizon, uTop, smoothstep(0.0, 0.75, h));
        col = mix(col, uHorizon * 0.9, smoothstep(0.02, -0.2, h));
        // Uzay: kubbe her yönde boşluk (ufuk yok).
        col = mix(col, vec3(0.006, 0.008, 0.016), uSpace);
        float skyMask = mix(smoothstep(0.0, 0.25, h), 1.0, uSpace);
        // Yıldızlar
        vec3 cell = floor(d * 380.0);
        float s = hash(cell);
        float star = step(0.9965, s) * skyMask * (0.6 + 0.4 * sin(uTime * 2.0 + s * 60.0));
        // Uzayda ikinci, ince ve sık yıldız katmanı.
        vec3 cell2 = floor(d * 950.0);
        float s2 = hash(cell2 + 3.0);
        col += step(0.9975, s2) * uSpace * (0.45 + 0.35 * sin(uTime * 1.3 + s2 * 40.0)) * vec3(0.85, 0.92, 1.1);
        col += star * mix(vec3(0.72, 0.86, 1.28), vec3(1.22, 0.98, 0.78), fract(s * 7.31)) * uStars;
        // Gece göğünün canlılığı: eğik bir samanyolu şeridi, içinde toz yolları ve renkli bulutsular.
        if (uNebula > 0.001) {
          vec3 bandN = normalize(vec3(0.35, 0.55, 0.76));
          float across = dot(d, bandN);
          float band = exp(-across * across / 0.05);
          float cloud = fbm(d * 3.2 + vec3(0.0, uTime * 0.004, 0.0));
          float lanes = fbm(d * 8.0 + 11.0);
          float patches = smoothstep(0.5, 0.82, fbm(d * 2.1 + 5.0));
          vec3 neb = mix(uNebulaA, uNebulaB, smoothstep(0.35, 0.7, cloud));
          vec3 glow = neb * (band * (0.35 + 0.9 * cloud) * (1.0 - 0.65 * smoothstep(0.52, 0.72, lanes)) + patches * 0.45);
          float sky = mix(smoothstep(-0.04, 0.25, h), 1.0, uSpace);
          // Şeritte yoğun, ince yıldız tozu.
          float fine = step(0.985 - band * 0.02, hash(floor(d * 900.0))) * (0.5 + 0.5 * band);
          col += (glow * (0.55 + 0.75 * uSpace) + vec3(fine) * 0.55) * sky * uNebula;
          // Ufka yakın yumuşak bir ışıma: siluetler gökyüzüne karşı okunur.
          col += mix(uNebulaA, uNebulaB, 0.5) * smoothstep(0.35, 0.0, h) * 0.18 * uNebula;
        }
        // Yarım ay (kuzey-batı gökyüzü)
        vec3 moonDir = normalize(vec3(-0.45, 0.42, -0.78));
        float md = distance(d, moonDir);
        float disc = smoothstep(0.052, 0.047, md);
        float halfLit = smoothstep(-0.01, 0.02, dot(d - moonDir, normalize(vec3(1.0, 0.2, 0.0))));
        // Hilal: aydınlık yarının üstüne kaymış karanlık bir disk; geriye ince, eğri bir ışık kalır.
        float crescent = smoothstep(0.046, 0.051, distance(d, moonDir - normalize(vec3(1.0, 0.2, 0.0)) * 0.03));
        float shade = max(mix(halfLit, crescent, uCrescent), uMoonFull);
        col = mix(col, vec3(0.93, 0.92, 0.88), disc * shade * uMoon);
        // Ay ışığının halesi: hilalde ay küçük ve soluk ışır (tam bir disk halesi değil).
        col += vec3(0.9) * smoothstep(mix(0.25, 0.14, uCrescent), 0.0, md) * mix(0.08, 0.035, uCrescent) * uMoon;
        // Gökteki yarık: kırık bir çizgi boyunca kızıl ışık
        float x = atan(d.x, -d.z);
        float line = abs(d.y - 0.42 - 0.08 * sin(x * 9.0) - 0.035 * sin(x * 31.0 + 1.3));
        float crack = smoothstep(0.012, 0.0, line) * smoothstep(0.9, 0.2, abs(x));
        col = mix(col, vec3(1.0, 0.12, 0.1), crack * uCrack);
        col += vec3(0.8, 0.05, 0.05) * smoothstep(0.08, 0.0, line) * smoothstep(0.9, 0.2, abs(x)) * 0.35 * uCrack;
        gl_FragColor = vec4(col * uIntensity, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return {
    mesh,
    top: uniforms.uTop.value,
    horizon: uniforms.uHorizon.value,
    stars: uniforms.uStars,
    crack: uniforms.uCrack,
    moon: uniforms.uMoon,
    moonFull: uniforms.uMoonFull,
    crescent: uniforms.uCrescent,
    moonDirection: new THREE.Vector3(-0.45, 0.42, -0.78).normalize(),
    time: uniforms.uTime,
    intensity: uniforms.uIntensity,
    nebula: uniforms.uNebula,
    nebulaA: uniforms.uNebulaA.value,
    nebulaB: uniforms.uNebulaB.value,
    space: uniforms.uSpace,
  };
}
