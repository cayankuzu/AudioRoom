import * as THREE from "three";
import { WORLD } from "../config/config";
import { mulberry32 } from "../utils/helpers";

/**
 * Oturum bazlı seed — her yeni sayfa yüklemesinde farklı plak yerleşimi.
 * URL'e `?seed=12345` eklenirse stabil tekrarlanabilir olur.
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
    /* noop */
  }
  return (Math.floor(Date.now() / 1000) ^ Math.floor(Math.random() * 0xffff)) >>> 0 || 1;
}

export interface SpawnPoint {
  x: number;
  z: number;
}

export interface SpawnPlacementOptions {
  count: number;
  minDistanceFromCenter: number;
  maxDistanceFromCenter: number;
  minSpacing: number;
  avoid?: Array<{ x: number; z: number; radius: number }>;
  getHeightAt: (x: number, z: number) => number;
  /** İzin verilen maksimum eğim (sin θ, 0..1). */
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
  return Math.max(Math.abs(h0 - hX), Math.abs(h0 - hZ)) / eps;
}

/**
 * Rasgele ama anlamlı dağılım — rejection-sampling. Eğim/avoid/spacing
 * kontrolü yapar. Geri döndürür: en fazla `count` sayıda geçerli XZ noktası.
 */
export function scatterSpawnPoints(
  rand: () => number,
  opts: SpawnPlacementOptions,
): SpawnPoint[] {
  const picked: SpawnPoint[] = [];
  const avoid = opts.avoid ?? [];
  const maxAttempts = opts.count * 80;

  for (let i = 0; i < maxAttempts && picked.length < opts.count; i += 1) {
    const r =
      opts.minDistanceFromCenter +
      Math.sqrt(rand()) *
        (opts.maxDistanceFromCenter - opts.minDistanceFromCenter);
    const a = rand() * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (Math.hypot(x, z) >= WORLD.boundary - 4) continue;

    let blocked = false;
    for (const av of avoid) {
      if (Math.hypot(x - av.x, z - av.z) < av.radius) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    if (sampleSlopeFactor(x, z, opts.getHeightAt) > opts.maxSlope) continue;

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

export interface GramophoneSpawnOptions {
  rand: () => number;
  playerStart: { x: number; z: number };
  getHeightAt: (x: number, z: number) => number;
  minFromPlayer: number;
  maxFromPlayer: number;
  minFromCenter: number;
  maxSlope: number;
}

/**
 * Gramofon için tek anlamlı bir spawn noktası seç. Oyuncu başlangıcına
 * göre ön planda, dik yamaçta değil, merkez kompozisyonu ezmeyen.
 */
export function pickGramophoneSpawn(opts: GramophoneSpawnOptions): THREE.Vector3 {
  const playerVec = new THREE.Vector2(opts.playerStart.x, opts.playerStart.z);
  /** Oyuncudan merkeze doğru yön. */
  const toCenter = playerVec.clone();
  if (toCenter.lengthSq() < 1e-3) toCenter.set(0, -1);
  toCenter.negate().normalize();

  const maxAttempts = 220;
  const fallback = new THREE.Vector3(opts.playerStart.x * 0.6, 0, opts.playerStart.z * 0.6);
  fallback.y = opts.getHeightAt(fallback.x, fallback.z) + 0.05;

  for (let i = 0; i < maxAttempts; i += 1) {
    const coneAngle = (opts.rand() - 0.5) * (Math.PI * 0.6);
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

export function createRng(seed: number): () => number {
  return mulberry32(seed || 1);
}
