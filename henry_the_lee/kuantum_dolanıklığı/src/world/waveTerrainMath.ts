import { FLOOR } from "../config/config";

/** Dalga zemini ripple kaydı — `waveFloor` ile aynı şekil. */
export interface TerrainRipple {
  x: number;
  z: number;
  birth: number;
  amplitude: number;
}

export function bumpHeightAt(x: number, z: number): number {
  let h = 0;
  for (const b of FLOOR.bumps) {
    const dx = x - b.cx;
    const dz = z - b.cz;
    const d2 = dx * dx + dz * dz;
    const sigma2 = b.sigma * b.sigma;
    h += b.amp * Math.exp(-d2 / (2 * sigma2));
  }
  return h;
}

export function sinWavesHeightAt(x: number, z: number, time: number): number {
  let h = 0;
  for (const w of FLOOR.waves) {
    const cosA = Math.cos(w.angle);
    const sinA = Math.sin(w.angle);
    const proj = x * cosA + z * sinA;
    h += Math.sin(proj * w.k + time * w.speed) * w.amp;
  }
  return h;
}

export function rippleHeightAt(
  x: number,
  z: number,
  time: number,
  ripples: readonly TerrainRipple[],
): number {
  let h = 0;
  const speed = FLOOR.step.speed;
  const decay = FLOOR.step.decay;
  for (const r of ripples) {
    const age = time - r.birth;
    if (age < 0) continue;
    const env = Math.exp(-age / decay);
    if (env < 0.02) continue;
    const dx = x - r.x;
    const dz = z - r.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const front = age * speed;
    const delta = dist - front;
    const sigma = 1.6;
    const radial = Math.exp(-(delta * delta) / (2 * sigma * sigma));
    const phase = Math.cos(delta * 1.6);
    h += r.amplitude * env * radial * phase;
  }
  return h;
}
