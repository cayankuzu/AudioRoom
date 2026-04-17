import * as THREE from "three";
import type { SphereCollider } from "../types";
import { PLAYER, WORLD } from "../config/config";
import { mulberry32 } from "../utils/helpers";

export interface RocksHandle {
  group: THREE.Group;
  colliders: SphereCollider[];
}

type ScatterZone = "outer" | "craterRim" | "craterFloor";

/** Katman ayarı — hep aynı yapı, sadece parametreler değişir. */
interface ScatterLayer {
  name: string;
  geometry: THREE.BufferGeometry;
  material: THREE.MeshStandardMaterial;
  count: number;
  castShadow: boolean;
  /** Dağılım bölgesi — karter dışı, karter dudağı veya karter içi. */
  zone: ScatterZone;
  /** Ölçek aralığı (metre cinsinden yarıçap). */
  scaleMin: number;
  scaleMax: number;
  /** Yan eksen basıklığı: Y ve Z'yi bağımsız biraz kısaltmak için. */
  squashMin: number;
  squashMax: number;
  /** Toprağa gömme miktarı — 0 hafif, büyükçe daha gömülü. */
  embedMin: number;
  embedMax: number;
  /** Foreground (oyuncu başlangıç yönü) bias [0..1]. Yalnız `outer` için anlamlı. */
  foregroundBias: number;
  /** Küme (cluster) olasılığı [0..1]. */
  clusterChance: number;
  /** Küme yarıçapı. */
  clusterRadius: number;
  /** Kompozisyon merkezine yakın yasak bölgenin yarıçapı — figür/yazıyı korumak için. */
  centerExclude: number;
  /** Büyük kayalar oyuncu ile çarpışır. */
  colliderFactor: number | null;
}

/**
 * Çok katmanlı kaya / taş / çakıl / toz instancing'i.
 *
 * Katmanlar (büyükten küçüğe):
 * - hero       : anıtsal kaya (az, büyük)
 * - boulder    : büyük kaya (ortaya yakın alanlar dahil)
 * - medium     : orta boy kaya (karter dışı her yere saçılmış)
 * - cobble     : sivri/yuvarlak orta-küçük taş
 * - small      : köşeli taş, her yere saçılmış
 * - gravel     : çakıl, foreground yoğunluklu
 * - pebble     : daha küçük çakıl, kümelenme sever
 * - micro      : toz/kırıntı parça — yüzey dokusunu besler
 *
 * Tüm katmanlar InstancedMesh ile çizilir; büyükler için SphereCollider
 * çıkarılır, böylece oyuncu büyük kayaların içinden geçemez.
 */
export function createRocks(getHeightAt: (x: number, z: number) => number): RocksHandle {
  const group = new THREE.Group();
  const colliders: SphereCollider[] = [];

  const matSharp = new THREE.MeshStandardMaterial({
    color: "#0b0b0d",
    roughness: 1,
    metalness: 0,
  });
  const matSoft = new THREE.MeshStandardMaterial({
    color: "#101012",
    roughness: 0.98,
    metalness: 0,
  });
  const matMid = new THREE.MeshStandardMaterial({
    color: "#121215",
    roughness: 0.96,
    metalness: 0.01,
  });
  const matHero = new THREE.MeshStandardMaterial({
    color: "#15151a",
    roughness: 0.94,
    metalness: 0.02,
  });

  /** Geometri varyasyonu — dodeca / icosa / farklı alt bölüm. */
  const icoLow = new THREE.IcosahedronGeometry(1, 0);
  const icoMid = new THREE.IcosahedronGeometry(1, 1);
  const dodeca = new THREE.DodecahedronGeometry(1, 0);
  const dodecaMid = new THREE.DodecahedronGeometry(1, 1);

  const craterExclBase = WORLD.craterRimRadius + 4;
  /** Kompozisyon merkezi yakını — figür + yazı için boş bırakılır. */
  const compositionClear = 11;

  const layers: ScatterLayer[] = [
    {
      name: "hero",
      geometry: dodecaMid,
      material: matHero,
      count: 24,
      castShadow: true,
      zone: "outer",
      scaleMin: 2.6,
      scaleMax: 5.2,
      squashMin: 0.78,
      squashMax: 1.1,
      embedMin: 0.35,
      embedMax: 0.8,
      foregroundBias: 0.1,
      clusterChance: 0.18,
      clusterRadius: 5.5,
      centerExclude: craterExclBase + 8,
      colliderFactor: 0.95,
    },
    {
      name: "boulder",
      geometry: dodeca,
      material: matHero,
      count: 160,
      castShadow: true,
      zone: "outer",
      scaleMin: 1.2,
      scaleMax: 2.4,
      squashMin: 0.72,
      squashMax: 1.05,
      embedMin: 0.25,
      embedMax: 0.55,
      foregroundBias: 0.35,
      clusterChance: 0.32,
      clusterRadius: 3.8,
      centerExclude: craterExclBase + 2,
      colliderFactor: 0.9,
    },
    {
      name: "medium",
      geometry: icoMid,
      material: matMid,
      count: 520,
      castShadow: true,
      zone: "outer",
      scaleMin: 0.55,
      scaleMax: 1.15,
      squashMin: 0.7,
      squashMax: 1.05,
      embedMin: 0.18,
      embedMax: 0.38,
      foregroundBias: 0.45,
      clusterChance: 0.38,
      clusterRadius: 2.8,
      centerExclude: craterExclBase,
      colliderFactor: 0.8,
    },
    {
      name: "cobble",
      geometry: icoMid,
      material: matSoft,
      count: 1120,
      castShadow: true,
      zone: "outer",
      scaleMin: 0.26,
      scaleMax: 0.58,
      squashMin: 0.6,
      squashMax: 1.0,
      embedMin: 0.1,
      embedMax: 0.22,
      foregroundBias: 0.55,
      clusterChance: 0.42,
      clusterRadius: 2.2,
      centerExclude: craterExclBase - 1,
      colliderFactor: null,
    },
    {
      name: "small",
      geometry: icoLow,
      material: matSharp,
      count: 1900,
      castShadow: true,
      zone: "outer",
      scaleMin: 0.14,
      scaleMax: 0.3,
      squashMin: 0.55,
      squashMax: 1.0,
      embedMin: 0.05,
      embedMax: 0.14,
      foregroundBias: 0.65,
      clusterChance: 0.48,
      clusterRadius: 1.8,
      centerExclude: craterExclBase - 3,
      colliderFactor: null,
    },
    {
      name: "gravel",
      geometry: icoLow,
      material: matSoft,
      count: 3400,
      castShadow: false,
      zone: "outer",
      scaleMin: 0.07,
      scaleMax: 0.16,
      squashMin: 0.5,
      squashMax: 1.0,
      embedMin: 0.02,
      embedMax: 0.08,
      foregroundBias: 0.75,
      clusterChance: 0.55,
      clusterRadius: 1.4,
      centerExclude: craterExclBase - 6,
      colliderFactor: null,
    },
    {
      name: "pebble",
      geometry: icoLow,
      material: matSharp,
      count: 4000,
      castShadow: false,
      zone: "outer",
      scaleMin: 0.035,
      scaleMax: 0.085,
      squashMin: 0.45,
      squashMax: 0.95,
      embedMin: 0.01,
      embedMax: 0.05,
      foregroundBias: 0.7,
      clusterChance: 0.6,
      clusterRadius: 1.0,
      centerExclude: craterExclBase - 8,
      colliderFactor: null,
    },
    {
      name: "micro",
      geometry: icoLow,
      material: matSharp,
      count: 4600,
      castShadow: false,
      zone: "outer",
      scaleMin: 0.016,
      scaleMax: 0.045,
      squashMin: 0.45,
      squashMax: 0.9,
      embedMin: 0.005,
      embedMax: 0.025,
      foregroundBias: 0.7,
      clusterChance: 0.58,
      clusterRadius: 0.8,
      centerExclude: craterExclBase - 10,
      colliderFactor: null,
    },
    /** -------- Krater bölgesi katmanları -------- */
    {
      name: "craterRimBoulder",
      geometry: dodeca,
      material: matHero,
      count: 42,
      castShadow: true,
      zone: "craterRim",
      scaleMin: 1.0,
      scaleMax: 2.1,
      squashMin: 0.7,
      squashMax: 1.05,
      embedMin: 0.25,
      embedMax: 0.55,
      foregroundBias: 0,
      clusterChance: 0.55,
      clusterRadius: 3.2,
      centerExclude: compositionClear + 4,
      colliderFactor: 0.9,
    },
    {
      name: "craterRimMedium",
      geometry: icoMid,
      material: matMid,
      count: 130,
      castShadow: true,
      zone: "craterRim",
      scaleMin: 0.5,
      scaleMax: 1.05,
      squashMin: 0.65,
      squashMax: 1.0,
      embedMin: 0.18,
      embedMax: 0.38,
      foregroundBias: 0,
      clusterChance: 0.48,
      clusterRadius: 2.4,
      centerExclude: compositionClear + 2,
      colliderFactor: 0.8,
    },
    {
      name: "craterFloorMedium",
      geometry: icoMid,
      material: matMid,
      count: 95,
      castShadow: true,
      zone: "craterFloor",
      scaleMin: 0.45,
      scaleMax: 0.95,
      squashMin: 0.65,
      squashMax: 1.0,
      embedMin: 0.2,
      embedMax: 0.4,
      foregroundBias: 0,
      clusterChance: 0.52,
      clusterRadius: 2.0,
      centerExclude: compositionClear,
      colliderFactor: 0.78,
    },
    {
      name: "craterCobble",
      geometry: icoMid,
      material: matSoft,
      count: 320,
      castShadow: true,
      zone: "craterFloor",
      scaleMin: 0.22,
      scaleMax: 0.52,
      squashMin: 0.6,
      squashMax: 1.0,
      embedMin: 0.1,
      embedMax: 0.25,
      foregroundBias: 0,
      clusterChance: 0.55,
      clusterRadius: 1.8,
      centerExclude: compositionClear - 2,
      colliderFactor: null,
    },
    {
      name: "craterGravel",
      geometry: icoLow,
      material: matSoft,
      count: 820,
      castShadow: false,
      zone: "craterFloor",
      scaleMin: 0.08,
      scaleMax: 0.2,
      squashMin: 0.5,
      squashMax: 1.0,
      embedMin: 0.03,
      embedMax: 0.1,
      foregroundBias: 0,
      clusterChance: 0.55,
      clusterRadius: 1.4,
      centerExclude: compositionClear - 4,
      colliderFactor: null,
    },
    {
      name: "craterPebble",
      geometry: icoLow,
      material: matSharp,
      count: 1200,
      castShadow: false,
      zone: "craterFloor",
      scaleMin: 0.04,
      scaleMax: 0.1,
      squashMin: 0.45,
      squashMax: 0.95,
      embedMin: 0.01,
      embedMax: 0.05,
      foregroundBias: 0,
      clusterChance: 0.58,
      clusterRadius: 1.0,
      centerExclude: compositionClear - 5,
      colliderFactor: null,
    },
  ];

  const rand = mulberry32(20260417);
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const eul = new THREE.Euler();

  const playerStart = new THREE.Vector2(PLAYER.startPosition.x, PLAYER.startPosition.z);
  const foregroundDir = playerStart.clone().normalize();
  const foregroundNormal = new THREE.Vector2(-foregroundDir.y, foregroundDir.x);

  /** Oyuncu başlangıç ekseni boyunca bir kama — “ön plan”. */
  function sampleForeground(): { x: number; z: number } {
    const distAlong = 4 + Math.pow(rand(), 0.45) * 44;
    const lateral = (rand() - 0.5) * 36;
    const x = foregroundDir.x * distAlong + foregroundNormal.x * lateral;
    const z = foregroundDir.y * distAlong + foregroundNormal.y * lateral;
    return { x, z };
  }

  /** Rastgele dünyada dağılım (merkeze ağırlıklı olmayan). */
  function sampleWorld(maxR: number): { x: number; z: number } {
    const radius = Math.pow(rand(), 0.5) * maxR;
    const angle = rand() * Math.PI * 2;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  }

  /** Pre-seeded cluster merkezleri — belli bölgelerde sık kümelenme için. */
  interface ClusterSeed {
    cx: number;
    cz: number;
  }
  const clusterSeeds: ClusterSeed[] = [];
  const seedCount = 58;
  for (let i = 0; i < seedCount; i += 1) {
    let cx = 0;
    let cz = 0;
    for (let a = 0; a < 20; a += 1) {
      const useForeground = rand() < 0.45;
      if (useForeground) {
        const f = sampleForeground();
        cx = f.x;
        cz = f.z;
      } else {
        const s = sampleWorld(WORLD.boundary - 10);
        cx = s.x;
        cz = s.z;
      }
      if (Math.hypot(cx, cz) >= craterExclBase) break;
    }
    clusterSeeds.push({ cx, cz });
  }

  /** Krater dudağı civarı küme tohumları — doğal yığılma için. */
  const rimSeedCount = 22;
  const rimSeeds: ClusterSeed[] = [];
  for (let i = 0; i < rimSeedCount; i += 1) {
    const a = (i / rimSeedCount) * Math.PI * 2 + rand() * 0.25;
    const r = WORLD.craterRimRadius + (rand() - 0.5) * 6;
    rimSeeds.push({ cx: Math.cos(a) * r, cz: Math.sin(a) * r });
  }
  /** Krater içi küme tohumları — eğimlerde ve belirli bölgelerde. */
  const floorSeedCount = 16;
  const floorSeeds: ClusterSeed[] = [];
  for (let i = 0; i < floorSeedCount; i += 1) {
    const a = rand() * Math.PI * 2;
    const r = WORLD.craterRadius * (0.35 + rand() * 0.55);
    floorSeeds.push({ cx: Math.cos(a) * r, cz: Math.sin(a) * r });
  }

  function sampleOuter(layer: ScatterLayer): { x: number; z: number } {
    const roll = rand();
    if (roll < layer.clusterChance && clusterSeeds.length > 0) {
      const seed = clusterSeeds[Math.floor(rand() * clusterSeeds.length)];
      return {
        x: seed.cx + (rand() - 0.5) * layer.clusterRadius * 2,
        z: seed.cz + (rand() - 0.5) * layer.clusterRadius * 2,
      };
    }
    if (roll < layer.clusterChance + layer.foregroundBias * (1 - layer.clusterChance)) {
      return sampleForeground();
    }
    return sampleWorld(WORLD.boundary - 6);
  }

  function sampleCraterRim(layer: ScatterLayer): { x: number; z: number } {
    if (rand() < layer.clusterChance) {
      const seed = rimSeeds[Math.floor(rand() * rimSeeds.length)];
      return {
        x: seed.cx + (rand() - 0.5) * layer.clusterRadius * 2,
        z: seed.cz + (rand() - 0.5) * layer.clusterRadius * 2,
      };
    }
    const a = rand() * Math.PI * 2;
    /** Rim halkası: craterRadius * 0.85 .. craterRimRadius + 3. */
    const r =
      WORLD.craterRadius * 0.82 +
      rand() * (WORLD.craterRimRadius + 3 - WORLD.craterRadius * 0.82);
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  }

  function sampleCraterFloor(layer: ScatterLayer): { x: number; z: number } {
    if (rand() < layer.clusterChance) {
      const seed = floorSeeds[Math.floor(rand() * floorSeeds.length)];
      return {
        x: seed.cx + (rand() - 0.5) * layer.clusterRadius * 2,
        z: seed.cz + (rand() - 0.5) * layer.clusterRadius * 2,
      };
    }
    const a = rand() * Math.PI * 2;
    /** √(rand) → üniform disk dağılımı; 0..craterRadius * 0.92. */
    const r = Math.sqrt(rand()) * WORLD.craterRadius * 0.92;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r };
  }

  function sampleInLayer(layer: ScatterLayer): { x: number; z: number } {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      let candidate: { x: number; z: number };
      if (layer.zone === "craterRim") candidate = sampleCraterRim(layer);
      else if (layer.zone === "craterFloor") candidate = sampleCraterFloor(layer);
      else candidate = sampleOuter(layer);

      const d = Math.hypot(candidate.x, candidate.z);
      if (d < layer.centerExclude) continue;
      if (d >= WORLD.boundary - 2) continue;
      /** outer katmanlar krater dışında kalır. */
      if (layer.zone === "outer" && d < craterExclBase) continue;
      /** craterFloor bölgesi craterRadius dışına taşmasın. */
      if (layer.zone === "craterFloor" && d > WORLD.craterRadius * 0.95) continue;
      return candidate;
    }

    /** Fallback — katmanın doğal halkasına yakın. */
    const angle = rand() * Math.PI * 2;
    const base =
      layer.zone === "craterFloor"
        ? WORLD.craterRadius * 0.5
        : layer.zone === "craterRim"
          ? WORLD.craterRimRadius
          : craterExclBase + 4;
    return { x: Math.cos(angle) * base, z: Math.sin(angle) * base };
  }

  for (const layer of layers) {
    const mesh = new THREE.InstancedMesh(layer.geometry, layer.material, layer.count);
    mesh.castShadow = layer.castShadow;
    mesh.receiveShadow = true;
    mesh.name = `rocks:${layer.name}`;

    for (let i = 0; i < layer.count; i += 1) {
      const { x, z } = sampleInLayer(layer);
      const y = getHeightAt(x, z);
      const embed = layer.embedMin + rand() * (layer.embedMax - layer.embedMin);
      pos.set(x, y - embed, z);

      eul.set((rand() - 0.5) * 0.6, rand() * Math.PI * 2, (rand() - 0.5) * 0.6);
      quat.setFromEuler(eul);

      const base = layer.scaleMin + rand() * (layer.scaleMax - layer.scaleMin);
      const sx = base;
      const sy = base * (layer.squashMin + rand() * (layer.squashMax - layer.squashMin));
      const sz = base * (layer.squashMin + rand() * (layer.squashMax - layer.squashMin));
      scl.set(sx, sy, sz);

      mat.compose(pos, quat, scl);
      mesh.setMatrixAt(i, mat);

      if (layer.colliderFactor !== null && base > 0.45) {
        colliders.push({
          center: new THREE.Vector3(x, y, z),
          radius: base * layer.colliderFactor,
        });
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }

  return { group, colliders };
}
