import * as THREE from "three";

/**
 * Rahim: basık bir elipsoit. Zemin ayrı bir yüzey değil, zarın iç tabanıdır;
 * oyuncu zarın üstünde yürür, kenarlar dikişsizce duvara kıvrılır.
 */
export const WOMB_RX = 30;
export const WOMB_RY = 18;
export const WOMB_CY = 14;
export const WALK_RADIUS = 22;
/** Gölge oyununun düştüğü yön: girişe göre solda (bebek ve kapak yazıları onu örtmesin). */
export const SHADOW_AZIMUTH = -1.2;
export const SHADOW_ELEVATION = 0.1;

export function wombGround(x: number, z: number): number {
  const d = Math.min(Math.hypot(x, z), WOMB_RX * 0.98);
  return WOMB_CY - WOMB_RY * Math.sqrt(1 - (d / WOMB_RX) ** 2);
}

/**
 * Damar ağı dokusu: dallanan, kalınlığı azalan çizgiler; yatayda dikişsiz.
 * Bir kez CPU'da çizilir; shader yalnızca örnekler.
 */
function veinCanvas(width: number, height: number, random: () => number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, width, height);
  g.lineCap = "round";
  const branch = (x: number, y: number, angle: number, length: number, thickness: number, depth: number) => {
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    for (const offset of [-width, 0, width]) {
      g.strokeStyle = `rgba(255,255,255,${0.35 + depth * 0.1})`;
      g.lineWidth = thickness;
      g.beginPath();
      g.moveTo(x + offset, y);
      g.quadraticCurveTo(x + offset + (random() - 0.5) * length * 0.6, (y + y2) / 2 + (random() - 0.5) * length * 0.6, x2 + offset, y2);
      g.stroke();
    }
    if (depth <= 0 || thickness < 0.8) return;
    const children = 2 + (random() < 0.4 ? 1 : 0);
    for (let i = 0; i < children; i += 1) {
      branch(x2, y2, angle + (random() - 0.5) * 1.4, length * (0.6 + random() * 0.25), thickness * 0.62, depth - 1);
    }
  };
  for (let i = 0; i < 26; i += 1) {
    branch(random() * width, random() * height, random() * Math.PI * 2, 60 + random() * 90, 5 + random() * 5, 6);
  }
  return canvas;
}

export interface Womb {
  group: THREE.Group;
  uniforms: {
    uTime: { value: number };
    uPulse: { value: number };
    uLight: { value: number };
    uLightColor: { value: THREE.Color };
    uFlicker: { value: number };
    /** Dış dünyanın gölge oyunu (anı): siyah siluetler, arkadan aydınlanan zara düşer. */
    uShadow: { value: THREE.Texture | null };
    uShadowLevel: { value: number };
  };
}

export function createWomb(random: () => number): Womb {
  const veins = new THREE.CanvasTexture(veinCanvas(1024, 512, random));
  veins.wrapS = THREE.RepeatWrapping;
  veins.anisotropy = 8;

  const uniforms = {
    uTime: { value: 0 },
    uPulse: { value: 0 },
    uLight: { value: 0.7 },
    uLightColor: { value: new THREE.Color("#ff9a5a") },
    uFlicker: { value: 0 },
    uVeins: { value: veins },
    uShadow: { value: null as THREE.Texture | null },
    uShadowLevel: { value: 0 },
  };

  const membrane = new THREE.Mesh(
    new THREE.SphereGeometry(1, 128, 96),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms,
      vertexShader: /* glsl */ `
        uniform float uTime, uPulse;
        varying vec3 vDir; varying vec2 vUv; varying vec3 vWorld;
        void main() {
          vDir = normalize(position);
          vUv = uv;
          // Nabız: duvar hafifçe genişler (taban sabit kalır, oyuncu yerinden oynamaz).
          float wall = smoothstep(-0.2, 0.3, position.y);
          vec3 p = position * (1.0 + wall * (0.006 * uPulse + 0.004 * sin(uTime * 0.7 + position.y * 3.0)));
          vec4 world = modelMatrix * vec4(p, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uVeins; uniform sampler2D uShadow;
        uniform float uTime, uPulse, uLight, uFlicker, uShadowLevel;
        uniform vec3 uLightColor;
        varying vec3 vDir; varying vec2 vUv; varying vec3 vWorld;
        vec3 rotateY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(c * v.x - s * v.z, v.y, s * v.x + c * v.z); }
        void main() {
          vec3 lightDir = normalize(vec3(0.0, 0.2, -1.0));
          float facing = max(dot(vDir, lightDir), 0.0);
          // Işık yalnızca bebeğin arkasında toplanır; kenarlar kapaktaki gibi koyu kan kırmızısı.
          float through = pow(facing, 9.0);
          float halo = pow(facing, 26.0);
          vec3 deep = vec3(0.035, 0.004, 0.004);
          vec3 flesh = vec3(0.34, 0.05, 0.028);
          vec3 col = mix(deep, flesh, 0.12 + 0.88 * through) * (0.5 + uLight * 0.6);
          col += uLightColor * halo * uLight * 1.8;

          // Taban: ıslak, koyu et; yürünen yüzey okunur kalsın diye biraz daha açık.
          float floorMask = smoothstep(-0.25, -0.65, vDir.y);
          vec3 floorCol = vec3(0.24, 0.045, 0.028) * (0.7 + uLight * 0.5) + uLightColor * 0.05;
          col = mix(col, floorCol, floorMask);

          // Duvarda küresel UV; tabanda düzlemsel eşleme (kutupta halka/ışın izi kalmaz).
          float wallV = max(texture2D(uVeins, vUv * vec2(2.0, 1.0)).r, texture2D(uVeins, vUv * vec2(4.0, 2.0) + 0.37).r * 0.6);
          float floorV = max(texture2D(uVeins, vWorld.xz * 0.018).r, texture2D(uVeins, vWorld.xz * 0.041 + 0.37).r * 0.6);
          float veins = mix(wallV, floorV, floorMask);
          float beat = 0.75 + 0.25 * uPulse + uFlicker * 0.35 * step(0.5, fract(uTime * 7.0));
          vec3 vesselDark = vec3(0.05, 0.0, 0.0);
          vec3 vesselLit = vec3(0.85, 0.05, 0.02);
          col = mix(col, mix(vesselDark, vesselLit * beat, through), veins * 0.85);

          // Gölge oyunu: arka duvara, dışarıdaki dünyanın siluetleri düşer.
          vec3 sd = rotateY(vDir, ${(-SHADOW_AZIMUTH).toFixed(4)});
          if (sd.z < -0.2 && uShadowLevel > 0.001) {
            vec2 p = sd.xy / -sd.z;
            vec2 suv = vec2(p.x * 0.42 + 0.5, (p.y - ${SHADOW_ELEVATION.toFixed(4)}) * 0.62 + 0.42);
            if (suv.x > 0.0 && suv.x < 1.0 && suv.y > 0.0 && suv.y < 1.0) {
              float a = texture2D(uShadow, suv).a;
              // Yumuşak, eliptik bir perde: dikdörtgen kenar görünmez.
              float edge = smoothstep(1.0, 0.72, length((suv - 0.5) * vec2(2.0, 2.3)));
              col += uLightColor * edge * uShadowLevel * 0.35;
              col = mix(col, vec3(0.03, 0.0, 0.0), a * edge * uShadowLevel * 0.92);
            }
          }
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  membrane.scale.set(WOMB_RX, WOMB_RY, WOMB_RX);
  membrane.position.y = WOMB_CY;

  const group = new THREE.Group();
  group.add(membrane);
  return { group, uniforms };
}

/** Sabun köpüğü gibi yanardöner anı kabarcığı. */
export function createBubbleMaterial(tint: THREE.ColorRepresentation): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uTint: { value: new THREE.Color(tint) }, uOpacity: { value: 1 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOpacity; uniform vec3 uTint;
      varying vec3 vN; varying vec3 vView;
      void main() {
        float f = clamp(1.0 - abs(dot(vN, vView)), 0.0, 1.0);
        vec3 film = 0.5 + 0.5 * cos(6.2831 * (f * 1.6 + uTime * 0.05 + vec3(0.0, 0.33, 0.67)));
        vec3 col = mix(uTint, film, 0.45) * (0.4 + f * 1.4);
        gl_FragColor = vec4(col, (0.08 + pow(f, 2.5) * 0.85) * uOpacity);
      }
    `,
  });
}
