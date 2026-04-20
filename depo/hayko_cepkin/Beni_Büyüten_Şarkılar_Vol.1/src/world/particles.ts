import * as THREE from "three";
import { BOKEH, PALETTE, WORLD } from "../config/config";

/**
 * Bokeh atmosferi — kapaktaki sıcak DOF efektinin 3B karşılığı:
 *  - Geniş yumuşak kor turuncu daireler (büyük boyut, additive).
 *  - İnce amber spark'lar (küçük, parlak, daha yüksek sayı).
 *  - Çok ince kan kırmızısı toz (en uzak katman, hareketli).
 *
 * Tüm bokeh radial bir alana dağılır; kamera dönerken sıcak halka hissi.
 */
export interface ParticlesHandle {
  group: THREE.Group;
  update(time: number, delta: number): void;
}

function makeBokehTexture(color: string): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.Texture();
  }
  const cx = size / 2;
  const cy = size / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
  const c = new THREE.Color(color);
  const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
  grad.addColorStop(0.0, `rgba(${rgb},0.95)`);
  grad.addColorStop(0.35, `rgba(${rgb},0.55)`);
  grad.addColorStop(0.7, `rgba(${rgb},0.18)`);
  grad.addColorStop(1.0, `rgba(${rgb},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

interface Layer {
  points: THREE.Points;
  speeds: Float32Array;
  phases: Float32Array;
}

function makeLayer(
  count: number,
  radius: number,
  ceil: number,
  texture: THREE.Texture,
  size: number,
  opacity: number,
  speedMin: number,
  speedMax: number,
): Layer {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    /** Halka çevresinde dağıt — merkezde fazla yoğunluk olmasın
     *  (uzak DOF ışıkları kapaktaki gibi). */
    const r = (0.35 + Math.sqrt(Math.random()) * 0.65) * radius;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.random() * ceil;
    positions[i * 3 + 2] = Math.sin(a) * r;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = speedMin + Math.random() * (speedMax - speedMin);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    map: texture,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
    alphaTest: 0.001,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, speeds, phases };
}

export function createParticles(scene: THREE.Scene): ParticlesHandle {
  const half = WORLD.half;
  const radius = Math.min(half * 0.92, BOKEH.radius);
  const ceil = Math.min(WORLD.domeRadius * 0.35, BOKEH.ceil);

  const group = new THREE.Group();
  group.name = "bbs-bokeh";

  const emberTex = makeBokehTexture(PALETTE.emberSoft);
  const amberTex = makeBokehTexture(PALETTE.amber);
  const sparkTex = makeBokehTexture(PALETTE.cream);

  /** Ana bokeh — büyük yumuşak kor turuncu daireler. */
  const bokeh = makeLayer(
    BOKEH.count,
    radius,
    ceil,
    emberTex,
    BOKEH.size,
    0.55,
    0.04,
    0.16,
  );

  /** İkinci katman — daha küçük amber. */
  const amber = makeLayer(
    Math.floor(BOKEH.count * 0.55),
    radius * 0.85,
    ceil * 0.95,
    amberTex,
    BOKEH.size * 0.55,
    0.42,
    0.08,
    0.24,
  );

  /** Spark — küçük krem parlak noktalar. */
  const spark = makeLayer(
    Math.floor(BOKEH.count * 0.25),
    radius * 0.7,
    ceil * 0.8,
    sparkTex,
    BOKEH.size * 0.18,
    0.85,
    0.18,
    0.42,
  );

  group.add(bokeh.points);
  group.add(amber.points);
  group.add(spark.points);
  scene.add(group);

  const layers = [bokeh, amber, spark];
  const counts = [BOKEH.count, Math.floor(BOKEH.count * 0.55), Math.floor(BOKEH.count * 0.25)];

  return {
    group,
    update(time, delta) {
      for (let l = 0; l < layers.length; l++) {
        const layer = layers[l]!;
        const n = counts[l]!;
        const pos = layer.points.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < n; i++) {
          let y = pos.getY(i) + layer.speeds[i]! * delta * 0.6;
          if (y > ceil) y = 0.05 + Math.random() * 0.4;
          pos.setY(i, y);
          /** Yatay hafif sallanma — "havada süzülen ışık zerreciği" hissi. */
          const baseX = pos.getX(i);
          const baseZ = pos.getZ(i);
          const wob = 0.0028 * (1 + l * 0.5);
          pos.setX(i, baseX + Math.sin(time * 0.34 + layer.phases[i]!) * wob);
          pos.setZ(i, baseZ + Math.cos(time * 0.27 + layer.phases[i]!) * wob);
        }
        pos.needsUpdate = true;
      }
    },
  };
}
