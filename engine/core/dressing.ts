import * as THREE from "three";
import type { Colliders } from "./colliders";
import { fitModel, type Models } from "./models";

/**
 * Set döşemesi: hazır modelleri evrenin diline uydurarak yerleştirir.
 *  pbr        — olduğu gibi (dokulu, gerçekçi),
 *  muted      — dokulu ama solgun ve koyu (Redd'in siyah krateri),
 *  silhouette — tek renk, ışıksız siyah (Hayko'nun gölge oyunu),
 *  ink        — mürekkep çizgisi toon (Kuantum'un sarı kutusu).
 */
export type DressStyle = "pbr" | "muted" | "silhouette" | "ink";

export interface Placement {
  model: string;
  x: number;
  z: number;
  /** En uzun yatay kenar (varsayılan) ya da yükseklik (by: "height"), metre. */
  size: number;
  by?: "length" | "height";
  /** Y ekseni dönüşü (radyan). */
  yaw?: number;
  /** Devrilme (radyan; ör. yere düşmüş eşya). */
  tilt?: number;
  /** Zeminden ek yükseklik. */
  lift?: number;
  /** Katı mı (oyuncu içinden geçemez). */
  solid?: boolean;
  /** Katı ayak izi yuvarlak mı (direk, fıçı). */
  round?: boolean;
}

export interface DressOptions {
  ground: (x: number, z: number) => number;
  style: DressStyle;
  colliders?: Colliders;
  /** Toon stil için gradyan dokusu; ink stilinde zorunlu. */
  gradient?: THREE.Texture;
  /** Muted stilinde renk çarpanı (0..1). */
  dim?: number;
}

/** Bir modelin bütün malzemelerini evrenin stiline çevirir (klonlar; kütüphanedeki paylaşılan malzeme bozulmaz). */
export function styleModel(object: THREE.Object3D, style: DressStyle, options: { gradient?: THREE.Texture; dim?: number } = {}): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (style === "silhouette") {
      mesh.material = new THREE.MeshStandardMaterial({ color: "#050506", roughness: 1, metalness: 0 });
      mesh.castShadow = false;
    } else if (style === "ink") {
      mesh.material = new THREE.MeshToonMaterial({ color: "#141008", gradientMap: options.gradient ?? null });
    } else if (style === "muted") {
      const m = (source as THREE.MeshStandardMaterial).clone();
      m.color.multiplyScalar(options.dim ?? 0.55);
      m.roughness = Math.min(1, (m.roughness ?? 0.6) + 0.15);
      mesh.material = m;
    }
  });
}

/** Yerleşimleri bir gruba kurar. Modeli olmayan yerleşimler atlanır (evren yine açılır). */
export function dress(models: Models, placements: readonly Placement[], options: DressOptions): THREE.Group {
  const group = new THREE.Group();
  for (const p of placements) {
    const model = models.get(p.model);
    if (!model) continue;
    const item = fitModel(model, p.size, { by: p.by });
    styleModel(item, options.style, options);
    item.position.set(p.x, options.ground(p.x, p.z) + (p.lift ?? 0), p.z);
    item.rotation.set(p.tilt ?? 0, p.yaw ?? 0, 0);
    group.add(item);
    if (p.solid && options.colliders) options.colliders.solid(item, { shape: p.round ? "round" : "box", pad: 0.05 });
  }
  return group;
}

/**
 * Rastgele saçma: verilen modellerden `count` tane, merkez çevresinde [r0, r1] halkasında, birbirinden ve
 * verilen boş alanlardan uzak. Deterministik `random` ile her girişte aynı yerleşim.
 */
export function scatter(
  random: () => number,
  modelsPool: readonly string[],
  count: number,
  ring: { cx: number; cz: number; r0: number; r1: number },
  size: [number, number],
  avoid: ReadonlyArray<{ x: number; z: number; r: number }> = [],
  extra: Partial<Placement> = {},
): Placement[] {
  const out: Placement[] = [];
  for (let attempt = 0; attempt < count * 30 && out.length < count; attempt += 1) {
    const a = random() * Math.PI * 2;
    const r = ring.r0 + random() * (ring.r1 - ring.r0);
    const x = ring.cx + Math.cos(a) * r;
    const z = ring.cz + Math.sin(a) * r;
    const s = size[0] + random() * (size[1] - size[0]);
    if (avoid.some((v) => Math.hypot(v.x - x, v.z - z) < v.r + s)) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < (o.size + s) * 0.8)) continue;
    out.push({ model: modelsPool[Math.floor(random() * modelsPool.length)], x, z, size: s, yaw: random() * Math.PI * 2, ...extra });
  }
  return out;
}
