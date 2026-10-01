/**
 * Anne kalbi ritim oyunu (Beni Büyüten Şarkılar): kalp 54 bpm ile atar; vuruşun tepesi fazın 0.25'inde.
 * Oyuncu E'ye vuruşla aynı anda basarsa isabet; sekiz ardışık isabet "Senkron" sırrını açar.
 */
export const HEART_BPM = 54;
export const RHYTHM_TARGET = 8;
/** ±window faz (54 bpm'de 0.12 ≈ 130 ms) içindeki basış isabettir. */
export function rhythmHit(phase: number, window = 0.12): boolean {
  const frac = phase - Math.floor(phase);
  const d = Math.abs(frac - 0.25);
  return Math.min(d, 1 - d) < window;
}
