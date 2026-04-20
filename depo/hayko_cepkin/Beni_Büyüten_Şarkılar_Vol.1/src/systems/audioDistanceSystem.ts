import * as THREE from "three";
import { AUDIO_DISTANCE } from "../config/config";

export interface AudioDistanceSystem {
  readonly gain: number;
  readonly muffle: number;
  update(
    delta: number,
    cameraPosition: THREE.Vector3,
    centerPosition: THREE.Vector3,
  ): number;
}

/**
 * Oyuncunun GRAMOFON'a XZ uzaklığına göre müzik sesi kademeli azalır.
 * `nearRadius`'a kadar tam, `farRadius` sonrası `minGain`. Yumuşak lerp.
 */
export function createAudioDistanceSystem(): AudioDistanceSystem {
  let smoothed = 1;
  let muffle = 0;

  return {
    get gain() {
      return smoothed;
    },
    get muffle() {
      return muffle;
    },
    update(delta, cameraPosition, centerPosition) {
      const dx = cameraPosition.x - centerPosition.x;
      const dz = cameraPosition.z - centerPosition.z;
      const dist = Math.hypot(dx, dz);

      const { nearRadius, farRadius, minGain } = AUDIO_DISTANCE;

      let targetGain: number;
      let targetMuffle: number;
      if (dist <= nearRadius) {
        targetGain = 1;
        targetMuffle = 0;
      } else if (dist >= farRadius) {
        targetGain = minGain;
        targetMuffle = 1;
      } else {
        const t = (dist - nearRadius) / (farRadius - nearRadius);
        const eased = t * t * (3 - 2 * t);
        targetGain = 1 - eased * (1 - minGain);
        targetMuffle = Math.pow(t, 0.75);
      }

      const k = 1 - Math.exp(-AUDIO_DISTANCE.smoothingPerSec * delta);
      smoothed += (targetGain - smoothed) * k;
      muffle += (targetMuffle - muffle) * k;
      return smoothed;
    },
  };
}
