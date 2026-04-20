import { PLAYER, SPAWN, WORLD } from "../config/config";

/**
 * Sahnedeki dinamik objeler (kedi, gramofon, plak) için rastgele konum üreteci.
 *
 * Kurallar `config.SPAWN` içinden gelir:
 *  - Duvar marjı (oda kenarına yapışmasın).
 *  - Merkez kompozisyon (0,0) etrafı yasak (icon + yazıların altına gelmesin).
 *  - Oyuncu başlangıcı etrafı yasak (oyuncu spawn'ında üstüne basmasın).
 *  - Önceden seçilmiş diğer spawn'lara min mesafe (objeler birbirine değmesin).
 *
 * `attempts` deneme sonrası uygun nokta bulunamazsa, son denenen yine de
 * döner — pratikte 80 denemede bulunur, fallback nadir.
 */
export interface SpawnPoint {
  x: number;
  z: number;
}

export function pickSpawn(taken: SpawnPoint[]): SpawnPoint {
  const limit = WORLD.half - SPAWN.wallMargin;
  let last: SpawnPoint = { x: limit * 0.6, z: limit * 0.6 };

  for (let i = 0; i < SPAWN.attempts; i++) {
    const x = (Math.random() * 2 - 1) * limit;
    const z = (Math.random() * 2 - 1) * limit;
    last = { x, z };

    if (Math.hypot(x, z) < SPAWN.centerExclusion) continue;

    const dxp = x - PLAYER.startPosition.x;
    const dzp = z - PLAYER.startPosition.z;
    if (Math.hypot(dxp, dzp) < SPAWN.playerExclusion) continue;

    let okPair = true;
    for (const t of taken) {
      if (Math.hypot(x - t.x, z - t.z) < SPAWN.pairwiseMin) {
        okPair = false;
        break;
      }
    }
    if (!okPair) continue;

    return { x, z };
  }
  return last;
}

/** Rastgele yaw (0..2π). */
export function randomYaw(): number {
  return Math.random() * Math.PI * 2;
}
