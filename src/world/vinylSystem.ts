import * as THREE from "three";
import { CANONICAL_TRACKS } from "../data/trackLibrary";
import { WORLD } from "../config/config";
import type { InventoryState } from "../state/inventory";
import { createVinyl } from "./vinyl";
import { mulberry32 } from "../utils/helpers";

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
  /** Bir plağı topla — `order` canonical sıra. Başarılıysa true. */
  collect(order: number): boolean;
  /** Oyuncu plağı düşürdüğünde / testte yeniden koymak için. */
  respawn(order: number, position: THREE.Vector3): void;
  /** Her frame çağır — hover/halo animasyonu. */
  update(time: number): void;
}

/**
 * Anlamlı yerleştirme stratejisi — plaklar sahada anlamlı noktalarda:
 *  - 4 tanesi oyuncu başlangıç yönünde foreground (yakın keşif)
 *  - 4 tanesi krater dudağı / yamacında (orta mesafe)
 *  - 4 tanesi uzak tepelerin arasında (uzak keşif)
 *
 * Her plak canonical order'a doğrudan bağlıdır (1..12). Yerleşim
 * seed'li — aynı oyun deneyiminde aynı noktada olurlar.
 */
const SEED = 20260417;

interface VinylSpawnRecipe {
  order: number;
  /** Merkeze mesafe (yaklaşık metre). */
  distance: number;
  /** Açı (radyan) — oyuncu başlangıç yönüne göre ofset. */
  angle: number;
  /** Dikey ofset (metre). */
  yOffset: number;
  /** Rotasyon varyasyonu (radyan). */
  tilt: number;
}

function buildRecipes(): VinylSpawnRecipe[] {
  const rand = mulberry32(SEED);
  const recipes: VinylSpawnRecipe[] = [];

  /**
   * Grup 1: yakın foreground — 4 plak, oyuncu başlangıç yönünde.
   * yOffset artık ≥ 0.10 — tamamen gömülmesin, disk yüzeyi zemin üstünde görünür.
   */
  for (let i = 0; i < 4; i += 1) {
    recipes.push({
      order: i + 1,
      distance: 18 + i * 6 + rand() * 3,
      angle: (rand() - 0.5) * 1.1,
      yOffset: 0.16 + rand() * 0.03,
      tilt: (rand() - 0.5) * 0.18,
    });
  }
  /** Grup 2: krater dudağı — 4 plak, tüm yönlerde. */
  for (let i = 0; i < 4; i += 1) {
    recipes.push({
      order: i + 5,
      distance: WORLD.craterRimRadius + (rand() - 0.5) * 6,
      angle: (i / 4) * Math.PI * 2 + rand() * 0.6,
      yOffset: 0.18 + rand() * 0.03,
      tilt: (rand() - 0.5) * 0.26,
    });
  }
  /** Grup 3: uzak tepeler — 4 plak, varyasyonlu. */
  for (let i = 0; i < 4; i += 1) {
    recipes.push({
      order: i + 9,
      distance: 70 + rand() * 25,
      angle: rand() * Math.PI * 2,
      yOffset: 0.18 + rand() * 0.04,
      tilt: (rand() - 0.5) * 0.34,
    });
  }
  return recipes;
}

export function createVinylSystem(
  getHeightAt: (x: number, z: number) => number,
  inventory: InventoryState,
  viewerDir: THREE.Vector2,
): VinylSystemHandle {
  const root = new THREE.Group();
  root.name = "vinylSystem";

  const viewer = viewerDir.clone().normalize();
  /** "Oyuncu başlangıç yönü" referans açısı: atan2(x, z). */
  const baseAngle = Math.atan2(viewer.x, viewer.y);

  const recipes = buildRecipes();
  const spawns: VinylSpawn[] = [];

  for (const recipe of recipes) {
    const track = CANONICAL_TRACKS.find((t) => t.order === recipe.order);
    if (!track) continue;

    /** Grup 1 için baseAngle + ofset; diğer gruplar kendi açısını kullanır. */
    const angle =
      recipe.order <= 4 ? baseAngle + recipe.angle : recipe.angle;
    const x = Math.sin(angle) * recipe.distance;
    const z = Math.cos(angle) * recipe.distance;
    const y = getHeightAt(x, z) + recipe.yOffset;

    const vinyl = createVinyl({ order: recipe.order, title: track.title });
    vinyl.position.set(x, y, z);
    vinyl.rotation.z = recipe.tilt;
    vinyl.rotation.y = Math.random() * Math.PI * 2;

    root.add(vinyl);
    spawns.push({
      order: recipe.order,
      title: track.title,
      position: vinyl.position.clone(),
      group: vinyl,
      yBase: recipe.yOffset,
    });
  }

  const handle: VinylSystemHandle = {
    root,
    spawns,
    collect(order) {
      const spawn = spawns.find((s) => s.order === order);
      if (!spawn) return false;
      const added = inventory.add(order);
      if (!added) return false;
      /** Plağı sahneden gizle (tamamen remove etmiyoruz — drop gerekirse döner). */
      spawn.group.visible = false;
      spawn.group.userData = {}; // raycast listesinden düşsün
      return true;
    },
    respawn(order, position) {
      const spawn = spawns.find((s) => s.order === order);
      if (!spawn) return;
      spawn.group.position.copy(position);
      spawn.group.visible = true;
      spawn.group.userData = {
        interactable: {
          kind: "vinyl",
          vinylOrder: order,
          promptKey: "E",
          promptText: `E bas — "${spawn.title}" plağını al`,
        },
      };
      inventory.remove(order);
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
