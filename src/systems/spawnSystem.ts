import * as THREE from "three";
import { WORLD } from "../config/config";
import { mulberry32 } from "../utils/helpers";

/**
 * Oturum bazlı seed — her yeni sayfa yüklemesinde farklı bir yerleşim
 * üretir. URL'e `?seed=12345` eklenirse stabil tekrarlanabilir olur.
 */
export function resolveSessionSeed(): number {
  try {
    const url = new URL(window.location.href);
    const raw = url.searchParams.get("seed");
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) return (n >>> 0) || 1;
    }
  } catch {
    /* URL alamıyoruz (SSR vs) → yine rasgele */
  }
  /** Zaman + math.random karışımı — her oturumda değişir. */
  return (Math.floor(Date.now() / 1000) ^ Math.floor(Math.random() * 0xffff)) >>> 0 || 1;
}

export interface SpawnPoint {
  x: number;
  z: number;
}

export interface SpawnPlacementOptions {
  /** Kaç aday noktayı dağıtacağız. */
  count: number;
  /** Merkezden minimum uzaklık. */
  minDistanceFromCenter: number;
  /** Merkezden maksimum uzaklık. */
  maxDistanceFromCenter: number;
  /** Kendi aralarında minimum ayrılık. */
  minSpacing: number;
  /** Belli rezerve noktalardan minimum uzaklık (oyuncu başlangıcı, gramofon vb.). */
  avoid?: Array<{ x: number; z: number; radius: number }>;
  /** Eğim kontrolü için terrain yükseklik fonksiyonu. */
  getHeightAt: (x: number, z: number) => number;
  /** İzin verilen maksimum eğim (sin θ, 0..1). 0.45 ≈ ~27°. */
  maxSlope: number;
}

function sampleSlopeFactor(
  x: number,
  z: number,
  getHeightAt: (x: number, z: number) => number,
): number {
  const eps = 0.75;
  const h0 = getHeightAt(x, z);
  const hX = getHeightAt(x + eps, z);
  const hZ = getHeightAt(x, z + eps);
  /** Basit eğim yaklaşımı: max((|h - hX|, |h - hZ|) / eps). */
  return Math.max(Math.abs(h0 - hX), Math.abs(h0 - hZ)) / eps;
}

/**
 * Rasgele ama anlamlı dağılım — her aday için:
 *  - Merkezden uygun yarıçap bandı
 *  - Dik yamaçlara konmaz
 *  - Zaten koyulmuş plaklara çok yakın olmaz
 *  - Yasak bölgelere girmez (oyuncu başlangıç, gramofon, kompozisyon merkezi vb.)
 *
 * Geri döndürür: en fazla `count` sayıda geçerli XZ noktası. Rejection-sampling
 * başarısız olursa kısmi liste döner — asla sahte bir nokta üretmez.
 */
export function scatterSpawnPoints(
  rand: () => number,
  opts: SpawnPlacementOptions,
): SpawnPoint[] {
  const picked: SpawnPoint[] = [];
  const avoid = opts.avoid ?? [];
  const maxAttempts = opts.count * 60;

  for (let i = 0; i < maxAttempts && picked.length < opts.count; i += 1) {
    /** √(rand) → üniform disk. */
    const r =
      opts.minDistanceFromCenter +
      Math.sqrt(rand()) *
        (opts.maxDistanceFromCenter - opts.minDistanceFromCenter);
    const a = rand() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    /** Dünya sınırı güvenliği. */
    if (Math.hypot(x, z) >= WORLD.boundary - 4) continue;

    /** Avoid bölgeleri. */
    let blocked = false;
    for (const av of avoid) {
      if (Math.hypot(x - av.x, z - av.z) < av.radius) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    /** Eğim kontrolü. */
    if (sampleSlopeFactor(x, z, opts.getHeightAt) > opts.maxSlope) continue;

    /** Diğer plaklarla minimum ayrılık. */
    let tooClose = false;
    for (const p of picked) {
      if (Math.hypot(x - p.x, z - p.z) < opts.minSpacing) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    picked.push({ x, z });
  }

  return picked;
}

/**
 * Gramofon için tek, anlamlı bir spawn noktası seç.
 *  - Oyuncu başlangıcına çok yakın değil, çok uzak değil
 *  - Figürü gören, açık bir yerde
 *  - Dik yamaçta değil
 *  - Başlangıç yönüne göre oyuncu sahneye uyanır uyanmaz onu görecek kadar ön planda
 */
export interface GramophoneSpawnOptions {
  rand: () => number;
  playerStart: { x: number; z: number };
  getHeightAt: (x: number, z: number) => number;
  /** Oyuncudan minimum/maksimum mesafe. */
  minFromPlayer: number;
  maxFromPlayer: number;
  /** Merkezden minimum uzaklık (kompozisyonu ezmesin). */
  minFromCenter: number;
  /** İzin verilen eğim. */
  maxSlope: number;
}

export function pickGramophoneSpawn(opts: GramophoneSpawnOptions): THREE.Vector3 {
  const playerVec = new THREE.Vector2(opts.playerStart.x, opts.playerStart.z);
  const toCenter = playerVec.clone().negate().normalize();

  const maxAttempts = 220;
  let fallback = new THREE.Vector3(opts.playerStart.x * 0.72, 0, opts.playerStart.z * 0.72);
  fallback.y = opts.getHeightAt(fallback.x, fallback.z) + 0.05;

  for (let i = 0; i < maxAttempts; i += 1) {
    /** Oyuncu → merkez yönüne ±45° koni içinde bir ön plan noktası. */
    const coneAngle = (opts.rand() - 0.5) * (Math.PI * 0.5);
    const baseAngle = Math.atan2(toCenter.y, toCenter.x) + coneAngle;
    const dist = opts.minFromPlayer + opts.rand() * (opts.maxFromPlayer - opts.minFromPlayer);

    const x = opts.playerStart.x + Math.cos(baseAngle) * dist;
    const z = opts.playerStart.z + Math.sin(baseAngle) * dist;

    if (Math.hypot(x, z) < opts.minFromCenter) continue;
    if (Math.hypot(x, z) >= WORLD.boundary - 8) continue;
    if (sampleSlopeFactor(x, z, opts.getHeightAt) > opts.maxSlope) continue;

    return new THREE.Vector3(x, opts.getHeightAt(x, z) + 0.05, z);
  }
  return fallback;
}

/** Seeded RNG helper — modül dışına aç. */
export function createRng(seed: number): () => number {
  return mulberry32(seed || 1);
}
