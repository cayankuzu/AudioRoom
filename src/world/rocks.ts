import * as THREE from "three";
import type { SphereCollider } from "../types";
import { PLAYER, WORLD } from "../config/config";
import { mulberry32 } from "../utils/helpers";
import { createRockMaps, shatterGeometry } from "./rockTextures";

export interface RocksHandle {
  group: THREE.Group;
  colliders: SphereCollider[];
}

type ScatterZone = "outer" | "craterRim" | "craterFloor";

/** Katman ayarı — hep aynı yapı, sadece parametreler değişir. */
interface ScatterLayer {
  name: string;
  /**
   * Geometri varyantları — aynı kaynak mesh'in farklı "kırık" halleri.
   * İnstance başına rastgele seçilir, böylece tek bir IcosahedronGeometry
   * tekrar ettiği belli olmaz.
   */
  variants: THREE.BufferGeometry[];
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
  /** Katman bazlı renk jitter: instance-başına ton varyasyonu (±). */
  colorJitter: number;
  /**
   * Yarı-gömülü oranı [0..1] — bu değere göre bir kısım kaya "embed"
   * değerine EK bir çökme uygulanır; zeminle hard-cut izlenimi kırılır.
   */
  halfBuriedChance: number;
}

/**
 * Volkanik kaya palet tabanı — 4 ton. Her instance, bu tabandan lerp +
 * hafif HSL jitter alır. Düz siyah yığın yerine, gerçek lav parçası
 * çeşitliliği hissi oluşur. Referans foto: koyu ama KATI değil; ışık
 * altında gri highlight veren yüzeyler, gölgede hâlâ kül-siyahı.
 */
const ROCK_COLOR_BASE = [
  new THREE.Color("#14151a"), // kömür
  new THREE.Color("#1d1f25"), // koyu antrasit
  new THREE.Color("#262830"), // füme
  new THREE.Color("#30333a"), // rim-highlight (gri ton)
].map((c) => c.clone());

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
 *
 * GÖRSEL GELİŞMELER:
 *  - Her katmanın birden fazla "shatter" geometri varyantı vardır; instance
 *    başına rastgele biri seçilir → aynı mesh tekrarı fark edilmez.
 *  - `MeshStandardMaterial` üstüne normal + roughness map paylaşımı eklenir.
 *  - `setColorAt` ile per-instance renk jitter — ton çeşitliliği.
 *  - Büyük/orta katmanlar için instance başına lokal scale farkı,
 *    embed ve rotation zaten rastgele — buna "half-buried" payı eklenir.
 */
export function createRocks(getHeightAt: (x: number, z: number) => number): RocksHandle {
  const group = new THREE.Group();
  const colliders: SphereCollider[] = [];

  /** Tek seferlik ortak detay haritaları (kanvas üretimli, ~512px). */
  const { normalMap, roughnessMap } = createRockMaps(512);

  /**
   * Kategori bazlı materyaller — aynı normal/roughness'u paylaşır ama
   * `map` yok (renk doğrudan vertex / instance color üzerinden gelir).
   *
   * `color` beyaz tutulur, böylece `setColorAt` ile verilen per-instance
   * renk bire-bir görünür (MeshStandardMaterial shader'ı color * instColor
   * şeklinde çarpar).
   *
   * `normalScale` normal map gücü. Büyük kayalar için daha yüksek tutulur —
   * anıtsal parçalar detaylı görünsün. Küçük çakıl için düşük — aşırı
   * gürültü olmasın.
   */
  function rockMat(params: {
    normalStrength: number;
    roughness: number;
    metalness: number;
  }): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: params.roughness,
      metalness: params.metalness,
      normalMap,
      normalScale: new THREE.Vector2(params.normalStrength, params.normalStrength),
      roughnessMap,
    });
  }

  const matHero = rockMat({ normalStrength: 1.35, roughness: 0.94, metalness: 0.03 });
  const matMid = rockMat({ normalStrength: 1.1, roughness: 0.96, metalness: 0.02 });
  const matSoft = rockMat({ normalStrength: 0.85, roughness: 0.98, metalness: 0 });
  const matSharp = rockMat({ normalStrength: 0.75, roughness: 1.0, metalness: 0 });

  /**
   * ---- Shatter geometry varyantları ----
   * Her kaynak mesh için birkaç farklı "kırık" üretilir. Instance dağılım
   * sırasında rastgele biri seçildiği için, aynı parçanın tekrarlandığı
   * anlaşılmaz.
   */
  const icoLowSrc = new THREE.IcosahedronGeometry(1, 0);
  const icoMidSrc = new THREE.IcosahedronGeometry(1, 1);
  const dodecaSrc = new THREE.DodecahedronGeometry(1, 0);
  const dodecaMidSrc = new THREE.DodecahedronGeometry(1, 1);

  /** Küçük yardımcı: kaynak mesh'ten N varyant üret. */
  function variants(
    src: THREE.BufferGeometry,
    n: number,
    seedBase: number,
    strength: number,
    cuts: number,
  ): THREE.BufferGeometry[] {
    const out: THREE.BufferGeometry[] = [];
    for (let i = 0; i < n; i += 1) {
      out.push(shatterGeometry(src, seedBase + i * 1741, strength, cuts));
    }
    return out;
  }

  /** Kaynak geometrileri serbest bırakmak için takip et (dispose). */
  const sources = [icoLowSrc, icoMidSrc, dodecaSrc, dodecaMidSrc];

  const heroVariants = variants(dodecaMidSrc, 5, 1001, 0.9, 3);
  const boulderVariants = variants(dodecaSrc, 5, 2001, 0.75, 2);
  const mediumVariants = variants(icoMidSrc, 5, 3001, 0.6, 2);
  const cobbleVariants = variants(icoMidSrc, 4, 4001, 0.5, 2);
  const smallVariants = variants(icoLowSrc, 4, 5001, 0.55, 2);
  const gravelVariants = variants(icoLowSrc, 3, 6001, 0.45, 1);
  const pebbleVariants = variants(icoLowSrc, 3, 7001, 0.4, 1);
  const microVariants = variants(icoLowSrc, 2, 8001, 0.35, 1);

  const craterExclBase = WORLD.craterRimRadius + 4;
  /** Kompozisyon merkezi yakını — figür + yazı için boş bırakılır. */
  const compositionClear = 11;

  const layers: ScatterLayer[] = [
    {
      name: "hero",
      variants: heroVariants,
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
      colorJitter: 0.18,
      halfBuriedChance: 0.25,
    },
    {
      name: "boulder",
      variants: boulderVariants,
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
      colorJitter: 0.2,
      halfBuriedChance: 0.3,
    },
    {
      name: "medium",
      variants: mediumVariants,
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
      colorJitter: 0.22,
      halfBuriedChance: 0.35,
    },
    {
      name: "cobble",
      variants: cobbleVariants,
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
      colorJitter: 0.24,
      halfBuriedChance: 0.45,
    },
    {
      name: "small",
      variants: smallVariants,
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
      colorJitter: 0.28,
      halfBuriedChance: 0.5,
    },
    {
      name: "gravel",
      variants: gravelVariants,
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
      colorJitter: 0.3,
      halfBuriedChance: 0.55,
    },
    {
      name: "pebble",
      variants: pebbleVariants,
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
      colorJitter: 0.34,
      halfBuriedChance: 0.6,
    },
    {
      name: "micro",
      variants: microVariants,
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
      colorJitter: 0.32,
      halfBuriedChance: 0.65,
    },
    /** -------- Krater bölgesi katmanları -------- */
    {
      name: "craterRimBoulder",
      variants: boulderVariants,
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
      colorJitter: 0.2,
      halfBuriedChance: 0.35,
    },
    {
      name: "craterRimMedium",
      variants: mediumVariants,
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
      colorJitter: 0.22,
      halfBuriedChance: 0.4,
    },
    {
      name: "craterFloorMedium",
      variants: mediumVariants,
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
      colorJitter: 0.22,
      halfBuriedChance: 0.4,
    },
    {
      name: "craterCobble",
      variants: cobbleVariants,
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
      colorJitter: 0.26,
      halfBuriedChance: 0.45,
    },
    {
      name: "craterGravel",
      variants: gravelVariants,
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
      colorJitter: 0.3,
      halfBuriedChance: 0.55,
    },
    {
      name: "craterPebble",
      variants: pebbleVariants,
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
      colorJitter: 0.32,
      halfBuriedChance: 0.6,
    },
  ];

  const rand = mulberry32(20260417);
  const mat = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const eul = new THREE.Euler();
  const tmpColor = new THREE.Color();

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

  /**
   * Katman başına her geometri varyantı için AYRI InstancedMesh açılır.
   * Böylece hem InstancedMesh'in count'u optimize kalır, hem de her
   * parçanın farklı "shatter" silüeti sahneye dağılır.
   *
   * Toplam instance sayısı = layer.count (değişmedi).
   */
  for (const layer of layers) {
    /** Instance'ları önce varyantlara böl — katmanın toplam sayısı sabit. */
    const perVariant: { geo: THREE.BufferGeometry; count: number }[] = [];
    const vCount = layer.variants.length;
    const basePer = Math.floor(layer.count / vCount);
    let assigned = 0;
    for (let v = 0; v < vCount; v += 1) {
      const c = v === vCount - 1 ? layer.count - assigned : basePer;
      assigned += c;
      perVariant.push({ geo: layer.variants[v], count: c });
    }

    for (let vi = 0; vi < perVariant.length; vi += 1) {
      const pv = perVariant[vi];
      if (pv.count <= 0) continue;

      const mesh = new THREE.InstancedMesh(pv.geo, layer.material, pv.count);
      mesh.castShadow = layer.castShadow;
      mesh.receiveShadow = true;
      mesh.name = `rocks:${layer.name}`;

      for (let i = 0; i < pv.count; i += 1) {
        const { x, z } = sampleInLayer(layer);
        const y = getHeightAt(x, z);
        let embed = layer.embedMin + rand() * (layer.embedMax - layer.embedMin);
        /**
         * Yarı-gömülü: zeminle hard-cut görünmesin — yüzeyin içine ek
         * bir çökme payı uygulanır (en büyük kayalar için dahi %25+).
         */
        if (rand() < layer.halfBuriedChance) {
          const scaleHint = layer.scaleMin + (layer.scaleMax - layer.scaleMin) * 0.5;
          embed += scaleHint * (0.25 + rand() * 0.45);
        }
        pos.set(x, y - embed, z);

        /** Random yaw + küçük pitch/roll — aynı mesh dönüşü tekrar etmesin. */
        eul.set(
          (rand() - 0.5) * 0.85,
          rand() * Math.PI * 2,
          (rand() - 0.5) * 0.85,
        );
        quat.setFromEuler(eul);

        const base = layer.scaleMin + rand() * (layer.scaleMax - layer.scaleMin);
        const sx = base * (0.92 + rand() * 0.18);
        const sy = base * (layer.squashMin + rand() * (layer.squashMax - layer.squashMin));
        const sz = base * (layer.squashMin + rand() * (layer.squashMax - layer.squashMin));
        scl.set(sx, sy, sz);

        mat.compose(pos, quat, scl);
        mesh.setMatrixAt(i, mat);

        /**
         * Per-instance renk: base palettten iki ton arasında lerp + HSL
         * jitter. Sonuç: yığınık kayalar tek tek biraz farklı renktedir,
         * ışık altında "aynı malzeme" izlenimi kaybolur.
         */
        const aIdx = Math.floor(rand() * ROCK_COLOR_BASE.length);
        let bIdx = Math.floor(rand() * ROCK_COLOR_BASE.length);
        if (bIdx === aIdx) bIdx = (aIdx + 1) % ROCK_COLOR_BASE.length;
        tmpColor.copy(ROCK_COLOR_BASE[aIdx]).lerp(ROCK_COLOR_BASE[bIdx], rand());
        /** HSL çok hafif shift — saturation düşük, value içinde oyna. */
        const jit = layer.colorJitter;
        const hsl = { h: 0, s: 0, l: 0 };
        tmpColor.getHSL(hsl);
        hsl.h = (hsl.h + (rand() - 0.5) * 0.04 + 1) % 1;
        hsl.s = THREE.MathUtils.clamp(hsl.s + (rand() - 0.5) * 0.08, 0, 0.2);
        /**
         * Lightness aralığı biraz yukarı kaydırıldı (0.05..0.32) → hâlâ
         * koyu volkanik, ama kayaların bir kısmında net bir gri highlight
         * olabilir. Böylece yığın "katı siyah duvar" yerine çeşitli tonlu
         * gerçek kayalar gibi okunur.
         */
        hsl.l = THREE.MathUtils.clamp(hsl.l + (rand() - 0.5) * jit, 0.05, 0.32);
        tmpColor.setHSL(hsl.h, hsl.s, hsl.l);
        mesh.setColorAt(i, tmpColor);

        if (layer.colliderFactor !== null && base > 0.45) {
          colliders.push({
            center: new THREE.Vector3(x, y, z),
            radius: base * layer.colliderFactor,
          });
        }
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
    }
  }

  /** Kaynak geometrileri (varyantlara kopyalandı, dispose güvenli). */
  for (const s of sources) s.dispose();

  return { group, colliders };
}
