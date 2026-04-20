import * as THREE from "three";
import { PALETTE, WORLD } from "../config/config";

/**
 * Rahim atmosferinde uçuşan biyolojik hücreler — kan hücresi /
 * lökosit / mikro organelle hissi. Üç katman + sprite-based:
 *
 *  1. RBC katmanı  — büyük, koyu kırmızı disk, çekirdeksiz (alyuvar)
 *  2. WBC katmanı  — orta, soluk amber, çift hatlı çekirdek (akyuvar)
 *  3. Mikro nokta  — küçük, parlak krem zerrecikler (organelle, virüs)
 *
 * Hücreler küresel bir kabuğun içinde rastgele konumlanır, kendi
 * yumuşak Brownian benzeri sapmalarıyla yavaşça süzülür ve dome
 * sınırını aşınca diğer tarafta belirir (toroidal sarma).
 *
 * Sprite + AdditiveBlending kullanmıyoruz — bunlar opak organik
 * canlı dokular. NormalBlending + transparent + depthWrite=false ile
 * kapalı parlama olmadan, et tonu içinde "yüzen lekeler" hissi.
 */

export interface CellsHandle {
  group: THREE.Group;
  update(time: number, delta: number, cameraPos: THREE.Vector3): void;
}

interface CellLayer {
  points: THREE.Points;
  positions: Float32Array;
  baseOffsets: Float32Array; // her hücreye göre başlangıç fazı
  speeds: Float32Array;      // her hücreye göre serbest hız
  scales: Float32Array;      // size attribute (varyasyon için)
  count: number;
  /** drift hızı çarpanı */
  driftMul: number;
}

function makeCellTexture(opts: {
  size: number;
  outerColor: string;
  innerColor: string;
  /** 0..1, çekirdek var mı? (akyuvar için) */
  nucleus: number;
  /** 0..1, çekirdek tonu */
  nucleusColor?: string;
}): THREE.Texture {
  const size = opts.size;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  const cx = size / 2;
  const cy = size / 2;

  /** Dış zar — yumuşak gradient kenar. */
  const outerGrad = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.48);
  const outer = new THREE.Color(opts.outerColor);
  const inner = new THREE.Color(opts.innerColor);
  const orgb = `${(outer.r * 255) | 0},${(outer.g * 255) | 0},${(outer.b * 255) | 0}`;
  const irgb = `${(inner.r * 255) | 0},${(inner.g * 255) | 0},${(inner.b * 255) | 0}`;
  outerGrad.addColorStop(0.0, `rgba(${irgb},0.92)`);
  outerGrad.addColorStop(0.55, `rgba(${irgb},0.78)`);
  outerGrad.addColorStop(0.82, `rgba(${orgb},0.55)`);
  outerGrad.addColorStop(1.0, `rgba(${orgb},0)`);
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
  ctx.fill();

  /** RBC için merkezde concav daha koyu leke (donut hissi). */
  if (opts.nucleus < 0.01) {
    const dish = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.16);
    dish.addColorStop(0, `rgba(${orgb},0.55)`);
    dish.addColorStop(1, `rgba(${irgb},0)`);
    ctx.fillStyle = dish;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
  } else {
    /** Akyuvar tipi — koyu çekirdek lobu. */
    const nucColor = opts.nucleusColor ?? "#3a0a08";
    ctx.fillStyle = nucColor;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.arc(cx - size * 0.08, cy - size * 0.05, size * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + size * 0.06, cy + size * 0.04, size * 0.10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** İnce yansıma highlight'ı — sıvı içinde şeffaf zar. */
  const hi = ctx.createRadialGradient(cx - size * 0.14, cy - size * 0.12, 0, cx - size * 0.14, cy - size * 0.12, size * 0.18);
  hi.addColorStop(0, "rgba(255,230,200,0.35)");
  hi.addColorStop(1, "rgba(255,230,200,0)");
  ctx.fillStyle = hi;
  ctx.beginPath();
  ctx.arc(cx - size * 0.14, cy - size * 0.12, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

interface LayerOptions {
  count: number;
  /** Yarıçap içinde dağıtım — hücreler bu küre içinde başlar. */
  shellRadius: number;
  /** Y ekseninde [yMin..yMax] aralığı. */
  yMin: number;
  yMax: number;
  /** Sprite boyutu (metre). */
  size: number;
  /** Boyut varyasyonu (0..1) — base ± varyasyon. */
  sizeJitter: number;
  /** Renk opsiyonları — texture için. */
  texture: THREE.Texture;
  /** Genel opaklık. */
  opacity: number;
  /** Drift hızı çarpanı. */
  driftMul: number;
}

function makeLayer(opts: LayerOptions): CellLayer {
  const positions = new Float32Array(opts.count * 3);
  const scales = new Float32Array(opts.count);
  const phases = new Float32Array(opts.count);
  const speeds = new Float32Array(opts.count);

  for (let i = 0; i < opts.count; i += 1) {
    /** Yatay halka dağıtım — merkezde fazla yığılma olmasın. */
    const r = (0.25 + Math.sqrt(Math.random()) * 0.75) * opts.shellRadius;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = opts.yMin + Math.random() * (opts.yMax - opts.yMin);
    positions[i * 3 + 2] = Math.sin(a) * r;
    scales[i] = opts.size * (1 + (Math.random() - 0.5) * opts.sizeJitter);
    phases[i] = Math.random() * Math.PI * 2;
    /** Her hücre kendi serbest süzülme hızıyla — Brownian like. */
    speeds[i] = 0.4 + Math.random() * 1.2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(scales, 1));

  /**
   * Custom ShaderMaterial — point size attribute desteği için.
   * `size` her vertex'e farklı sprite boyutu sağlar.
   */
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: opts.texture },
      uOpacity: { value: opts.opacity },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uFogColor: { value: new THREE.Color(WORLD.fogColor) },
      uFogDensity: { value: WORLD.fogDensity },
    },
    vertexShader: /* glsl */ `
      attribute float size;
      varying float vDist;
      uniform float uPixelRatio;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        vDist = length(mv.xyz);
        /** Sabit dünya boyutu hissi: size / dist. */
        gl_PointSize = size * 320.0 * uPixelRatio / max(vDist, 0.5);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uMap;
      uniform float uOpacity;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      varying float vDist;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        if (tex.a < 0.04) discard;
        /** Fog blend — uzak hücreler kan kırmızısı sise karışır. */
        float fogF = 1.0 - exp(-uFogDensity * uFogDensity * vDist * vDist);
        vec3 col = mix(tex.rgb, uFogColor, fogF);
        gl_FragColor = vec4(col, tex.a * uOpacity * (1.0 - 0.55 * fogF));
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  return {
    points,
    positions,
    baseOffsets: phases,
    speeds,
    scales,
    count: opts.count,
    driftMul: opts.driftMul,
  };
}

/** Tek küresel kabuğa "geri sar" — sınırı aşan hücreyi karşı tarafa ışınla. */
function wrap(value: number, min: number, max: number): number {
  if (value > max) return min + (value - max);
  if (value < min) return max - (min - value);
  return value;
}

export function createCells(scene: THREE.Scene): CellsHandle {
  const half = WORLD.half;
  const shell = Math.min(half * 0.8, 90);

  const group = new THREE.Group();
  group.name = "bbs-cells";
  scene.add(group);

  /** RBC — alyuvar: koyu kırmızı, kalın, donut. */
  const rbcTex = makeCellTexture({
    size: 96,
    outerColor: PALETTE.bloodDeep,
    innerColor: "#a82418",
    nucleus: 0,
  });
  const rbc = makeLayer({
    count: 70,
    shellRadius: shell,
    yMin: 0.5,
    yMax: 38,
    size: 0.55,
    sizeJitter: 0.6,
    texture: rbcTex,
    opacity: 0.75,
    driftMul: 1.0,
  });

  /** WBC — akyuvar: soluk amber/krem, çift loblu çekirdek. */
  const wbcTex = makeCellTexture({
    size: 96,
    outerColor: "#7a3010",
    innerColor: "#f0c890",
    nucleus: 1,
    nucleusColor: "#3a0a08",
  });
  const wbc = makeLayer({
    count: 36,
    shellRadius: shell * 0.85,
    yMin: 1.0,
    yMax: 30,
    size: 0.42,
    sizeJitter: 0.5,
    texture: wbcTex,
    opacity: 0.7,
    driftMul: 0.7,
  });

  /** Mikro zerrecikler — organelle / mikroplazma noktası. */
  const microTex = makeCellTexture({
    size: 48,
    outerColor: "#5a1208",
    innerColor: "#fbe4c8",
    nucleus: 0,
  });
  const micro = makeLayer({
    count: 160,
    shellRadius: shell * 1.05,
    yMin: 0.2,
    yMax: 44,
    size: 0.18,
    sizeJitter: 0.7,
    texture: microTex,
    opacity: 0.85,
    driftMul: 1.6,
  });

  group.add(rbc.points);
  group.add(wbc.points);
  group.add(micro.points);

  const layers: CellLayer[] = [rbc, wbc, micro];

  const _tmp = new THREE.Vector3();
  void _tmp; // future use placeholder

  return {
    group,
    update(time, delta, cameraPos) {
      void cameraPos;
      const dt = Math.min(delta, 0.05);
      for (const layer of layers) {
        const pos = layer.points.geometry.getAttribute("position") as THREE.BufferAttribute;
        const driftMul = layer.driftMul;
        for (let i = 0; i < layer.count; i += 1) {
          const ph = layer.baseOffsets[i]!;
          const sp = layer.speeds[i]!;
          /**
           * Brownian benzeri savrulma — sin/cos bestesiyle yumuşak ama
           * deterministik. Hız layer'a göre çarpılır.
           */
          const vx = Math.sin(time * 0.55 * sp + ph) * 0.22 * driftMul;
          const vy = (0.18 + 0.4 * Math.sin(time * 0.31 * sp + ph * 1.3)) * driftMul;
          const vz = Math.cos(time * 0.43 * sp + ph * 0.7) * 0.22 * driftMul;

          let x = pos.getX(i) + vx * dt;
          let y = pos.getY(i) + vy * dt;
          let z = pos.getZ(i) + vz * dt;

          /** Yumuşak sınırlandırma: Y dome'a yaklaşınca aşağı çekilir. */
          if (y > 48) y = 0.4;
          if (y < 0.2) y = 0.4;

          /** Yatay silindirik kabukta wrap. */
          const r = Math.hypot(x, z);
          const maxR = WORLD.boundary * 1.05;
          if (r > maxR) {
            const k = (maxR - 1) / r;
            x *= k;
            z *= k;
          }

          x = wrap(x, -maxR, maxR);
          z = wrap(z, -maxR, maxR);

          pos.setXYZ(i, x, y, z);
        }
        pos.needsUpdate = true;
      }
    },
  };
}
