import * as THREE from "three";
import { CANONICAL_TRACKS } from "../data/trackLibrary";
import { WORLD } from "../config/config";
import type { InventoryState } from "../state/inventory";
import { createVinyl } from "./vinyl";
import { createRng, scatterSpawnPoints, type SpawnPoint } from "../systems/spawnSystem";

export interface VinylSpawn {
  order: number;
  title: string;
  position: THREE.Vector3;
  group: THREE.Group;
  /** Plağın zemin üstünde asıldığı temel Y ofseti (getHeightAt + bu). */
  yBase: number;
}

export interface VinylSystemHandle {
  root: THREE.Group;
  spawns: VinylSpawn[];
  /**
   * Bir plağı dünya sahnesinden AL (gizle) — ele geçiş için. Envantere eklemez,
   * yalnızca world mesh'i görünmez yapar ve interactable'dan çıkarır.
   * Başarılıysa true.
   */
  pickUp(order: number): boolean;
  /**
   * Bir plağı dünyaya YERLEŞTİR — oyuncunun önüne/ayağına düşürülme için.
   * World mesh'i tekrar görünür yapar ve interactable descriptor'unu geri verir.
   * `position` verilirse oraya, verilmezse önceki yerine konumlandırır.
   */
  dropAt(order: number, position?: THREE.Vector3): void;
  /** Spawn pozisyonunu döner (mevcut spawn'lardan). */
  getSpawn(order: number): VinylSpawn | null;
  /** Her frame çağır — hover/halo animasyonu. */
  update(time: number): void;
}

export interface VinylSystemOptions {
  /** Oturum seed'i — her oturumda farklı yerleşim için. */
  seed: number;
  /** Kaçınılacak noktalar (gramofon, oyuncu başlangıcı, krater merkezi). */
  avoid?: Array<{ x: number; z: number; radius: number }>;
}

/**
 * Yerleştirme stratejisi — seeded random, anlamlı bantlarda dağıtılır:
 *  - 4 plak yakın bant (merkeze 14..32m)
 *  - 4 plak krater dudağı bandı
 *  - 4 plak uzak tepeler (70..100m)
 *
 * Tüm noktalar eğim / minimum spacing / avoid-bölge validation'ından geçer
 * (scatterSpawnPoints). Her oturumda seed değiştiği için farklı, ama
 * mantıklı bir dağılım oluşur.
 */
export function createVinylSystem(
  getHeightAt: (x: number, z: number) => number,
  _inventory: InventoryState,
  options: VinylSystemOptions,
): VinylSystemHandle {
  const root = new THREE.Group();
  root.name = "vinylSystem";

  const rand = createRng(options.seed);
  const avoid = options.avoid ?? [];

  /** 3 bant - her biri için 4 aday çıkarıyoruz. */
  const nearPoints = scatterSpawnPoints(rand, {
    count: 4,
    minDistanceFromCenter: 14,
    maxDistanceFromCenter: 32,
    minSpacing: 6,
    avoid,
    getHeightAt,
    maxSlope: 0.85,
  });
  const rimPoints = scatterSpawnPoints(rand, {
    count: 4,
    minDistanceFromCenter: WORLD.craterRimRadius - 4,
    maxDistanceFromCenter: WORLD.craterRimRadius + 8,
    minSpacing: 7,
    avoid,
    getHeightAt,
    maxSlope: 1.1,
  });
  const farPoints = scatterSpawnPoints(rand, {
    count: 4,
    minDistanceFromCenter: 68,
    maxDistanceFromCenter: Math.min(112, WORLD.boundary - 8),
    minSpacing: 10,
    avoid,
    getHeightAt,
    maxSlope: 1.25,
  });

  const pools: SpawnPoint[][] = [nearPoints, rimPoints, farPoints];
  const spawns: VinylSpawn[] = [];

  /** order 1..12 — her bant 4 plak. */
  const assignments: Array<{ order: number; pool: number }> = [];
  for (let i = 0; i < 4; i += 1) assignments.push({ order: i + 1, pool: 0 });
  for (let i = 0; i < 4; i += 1) assignments.push({ order: i + 5, pool: 1 });
  for (let i = 0; i < 4; i += 1) assignments.push({ order: i + 9, pool: 2 });

  for (const a of assignments) {
    const track = CANONICAL_TRACKS.find((t) => t.order === a.order);
    if (!track) continue;
    const pool = pools[a.pool];
    if (!pool.length) continue;
    /** Pool'dan rasgele bir aday çek — aynı noktaya iki plak gelmesin. */
    const idx = Math.floor(rand() * pool.length);
    const [pt] = pool.splice(idx, 1);
    if (!pt) continue;

    /** yOffset: her zaman ≥ 0.14 — plak diskleri zemine gömülmez. */
    const yOffset = 0.16 + rand() * 0.04;
    const tilt = (rand() - 0.5) * 0.24;

    const y = getHeightAt(pt.x, pt.z) + yOffset;
    const vinyl = createVinyl({ order: a.order, title: track.title });
    vinyl.position.set(pt.x, y, pt.z);
    vinyl.rotation.z = tilt;
    vinyl.rotation.y = rand() * Math.PI * 2;

    root.add(vinyl);
    spawns.push({
      order: a.order,
      title: track.title,
      position: vinyl.position.clone(),
      group: vinyl,
      yBase: yOffset,
    });
  }

  console.log("[VinylSystem]", `Seed: ${options.seed} · Yerleşen plak: ${spawns.length}/12`);

  const handle: VinylSystemHandle = {
    root,
    spawns,
    pickUp(order) {
      const spawn = spawns.find((s) => s.order === order);
      if (!spawn) return false;
      if (!spawn.group.visible) return false;
      /** Plağı sahneden gizle — envanter işlemine DOKUNMAZ, caller yapar. */
      spawn.group.visible = false;
      spawn.group.userData = {};
      return true;
    },
    dropAt(order, position) {
      const spawn = spawns.find((s) => s.order === order);
      if (!spawn) return;
      if (position) {
        /** yBase + zemin: plak havada veya gömülü kalmasın. */
        const y = getHeightAt(position.x, position.z) + spawn.yBase;
        spawn.group.position.set(position.x, y, position.z);
      }
      spawn.group.visible = true;
      spawn.group.userData = {
        interactable: {
          kind: "vinyl",
          vinylOrder: order,
          promptKey: "E",
          promptText: `E — plağı al · "${spawn.title}"`,
        },
      };
    },
    getSpawn(order) {
      return spawns.find((s) => s.order === order) ?? null;
    },
    update(time) {
      /** Hafif yukarı-aşağı bob + halo pulsing — yBase üzerinden. */
      for (const s of spawns) {
        if (!s.group.visible) continue;
        const phase = s.order * 0.83 + time * 0.9;
        const ground = getHeightAt(s.group.position.x, s.group.position.z);
        s.group.position.y = ground + s.yBase + Math.sin(phase) * 0.018;
        const halo = s.group.getObjectByName("vinyl-halo");
        if (halo) {
          const mat = (halo as THREE.Mesh).material as THREE.MeshBasicMaterial;
          mat.opacity = 0.2 + Math.sin(phase * 1.3) * 0.1;
        }
      }
    },
  };

  return handle;
}
