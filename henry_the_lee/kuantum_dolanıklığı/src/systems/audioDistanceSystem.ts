import * as THREE from "three";
import { AUDIO_DISTANCE } from "../config/config";

/**
 * Oyuncunun GRAMOFON'a olan XZ uzaklığına göre müzik sesi kademeli olarak
 * azalır. Redd · Mükemmel Boşluk biribir port.
 *
 *  - nearRadius'a kadar tam seviye
 *  - farRadius sonrası minGain
 *  - arada smoothstep eased lerp
 *  - her frame `smoothingPerSec` ile interpolasyon
 */
export interface AudioDistanceSystem {
  readonly gain: number;
  update(
    delta: number,
    cameraPosition: THREE.Vector3,
    centerPosition: THREE.Vector3,
  ): number;
}

export function createAudioDistanceSystem(): AudioDistanceSystem {
  let smoothed = 1;
  return {
    get gain() { return smoothed; },
    update(delta, cameraPosition, centerPosition) {
      const dx = cameraPosition.x - centerPosition.x;
      const dz = cameraPosition.z - centerPosition.z;
      const dist = Math.hypot(dx, dz);
      const { nearRadius, farRadius, minGain } = AUDIO_DISTANCE;
      let target: number;
      if (dist <= nearRadius) target = 1;
      else if (dist >= farRadius) target = minGain;
      else {
        const t = (dist - nearRadius) / (farRadius - nearRadius);
        const eased = t * t * (3 - 2 * t);
        target = 1 - eased * (1 - minGain);
      }
      const k = 1 - Math.exp(-AUDIO_DISTANCE.smoothingPerSec * delta);
      smoothed += (target - smoothed) * k;
      return smoothed;
    },
  };
}
