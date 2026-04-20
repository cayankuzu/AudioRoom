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
  /** Plağın zemin üstünde asıldığı temel Y ofseti. */
  yBase: number;
}

export interface VinylSystemHandle {
  root: THREE.Group;
  spawns: VinylSpawn[];
  pickUp(order: number): boolean;
  dropAt(order: number, position?: THREE.Vector3): void;
  getSpawn(order: number): VinylSpawn | null;
  update(time: number): void;
}

export interface VinylSystemOptions {
  seed: number;
  avoid?: Array<{ x: number; z: number; radius: number }>;
}

/**
 * Plaklar 3 bant halinde rahim içinde dağıtılır (9 plak toplam):
 *  - Yakın bant (merkezden 12..26m) — 3 plak
 *  - Orta bant (30..52m) — 3 plak
 *  - Uzak bant (58..96m) — 3 plak
 *
 * Plak yBase'i artırıldı (0.42m) ve eğim küçültüldü (±0.10rad) ki dalgalı
 * et zeminin tepesine bile saplanmasın; her frame `update`'te zeminin
 * gerçek yüksekliğine göre kaldırma uygulanır.
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

  const farMax = Math.min(96, WORLD.boundary - 8);

  const nearPoints = scatterSpawnPoints(rand, {
    count: 3,
    minDistanceFromCenter: 12,
    maxDistanceFromCenter: 26,
    minSpacing: 6.0,
    avoid,
    getHeightAt,
    maxSlope: 0.85,
  });
  const midPoints = scatterSpawnPoints(rand, {
    count: 3,
    minDistanceFromCenter: 30,
    maxDistanceFromCenter: 52,
    minSpacing: 9,
    avoid,
    getHeightAt,
    maxSlope: 1.05,
  });
  const farPoints = scatterSpawnPoints(rand, {
    count: 3,
    minDistanceFromCenter: 58,
    maxDistanceFromCenter: farMax,
    minSpacing: 14,
    avoid,
    getHeightAt,
    maxSlope: 1.25,
  });

  const pools: SpawnPoint[][] = [nearPoints, midPoints, farPoints];
  const spawns: VinylSpawn[] = [];

  /** order 1..9 — her bant 3 plak. */
  const assignments: Array<{ order: number; pool: number }> = [];
  for (let i = 0; i < 3; i += 1) assignments.push({ order: i + 1, pool: 0 });
  for (let i = 0; i < 3; i += 1) assignments.push({ order: i + 4, pool: 1 });
  for (let i = 0; i < 3; i += 1) assignments.push({ order: i + 7, pool: 2 });

  for (const a of assignments) {
    const track = CANONICAL_TRACKS.find((t) => t.order === a.order);
    if (!track) continue;
    const pool = pools[a.pool];
    if (!pool.length) continue;
    const idx = Math.floor(rand() * pool.length);
    const [pt] = pool.splice(idx, 1);
    if (!pt) continue;

    /** Daha yüksek taban + daha düşük eğim → zemine saplanmasın. */
    const yOffset = 0.42 + rand() * 0.06;
    const tilt = (rand() - 0.5) * 0.10;

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

  console.log("[VinylSystem]", `Seed: ${options.seed} · Yerleşen plak: ${spawns.length}/9`);

  const handle: VinylSystemHandle = {
    root,
    spawns,
    pickUp(order) {
      const spawn = spawns.find((s) => s.order === order);
      if (!spawn) return false;
      if (!spawn.group.visible) return false;
      spawn.group.visible = false;
      spawn.group.userData = {};
      return true;
    },
    dropAt(order, position) {
      const spawn = spawns.find((s) => s.order === order);
      if (!spawn) return;
      if (position) {
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
      for (const s of spawns) {
        if (!s.group.visible) continue;
        const phase = s.order * 0.83 + time * 0.9;
        /**
         * Plağın 4 köşesinden (~radius=0.45) zemini örnekle ve en yüksek
         * noktayı seç → eğimli plak bile dalgalı zeminin tepesine
         * basmadan yüzer kalır.
         */
        const px = s.group.position.x;
        const pz = s.group.position.z;
        const probe = 0.55;
        const g0 = getHeightAt(px, pz);
        const g1 = getHeightAt(px + probe, pz);
        const g2 = getHeightAt(px - probe, pz);
        const g3 = getHeightAt(px, pz + probe);
        const g4 = getHeightAt(px, pz - probe);
        const ground = Math.max(g0, g1, g2, g3, g4);
        s.group.position.y = ground + s.yBase + Math.sin(phase) * 0.025;
        const halo = s.group.getObjectByName("vinyl-halo");
        if (halo) {
          const mat = (halo as THREE.Mesh).material as THREE.MeshBasicMaterial;
          mat.opacity = 0.28 + Math.sin(phase * 1.3) * 0.12;
        }
      }
    },
  };

  return handle;
}
