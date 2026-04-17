import * as THREE from "three";
import { AUDIO_DISTANCE } from "../config/config";

export interface AudioDistanceSystem {
  /** 0..1 — mevcut smooth edilmiş mesafe kazancı. */
  readonly gain: number;
  /**
   * 0..1 — "boğukluk" (muffle) algısı. Uzaklaştıkça artar.
   * YouTube iframe gerçek low-pass filtre kabul etmediği için bu değer
   * ambient/camera gibi ikincil kanalları modüle etmek ve ses panelinin
   * algılanan kalitesini ayarlamak için kullanılır.
   */
  readonly muffle: number;
  update(
    delta: number,
    cameraPosition: THREE.Vector3,
    centerPosition: THREE.Vector3,
  ): number;
}

/**
 * Oyuncunun GRAMOFON'a olan XZ uzaklığına göre müzik sesi kademeli olarak
 * azalır. `nearRadius`'a kadar tam seviye, `farRadius` sonrası minimum.
 * Değer her frame yumuşak bir lerp ile güncellenir.
 *
 * Curve:
 *  - near..far arası smoothstep → sert geçiş yerine doğal düşüş
 *  - far sonrası `minGain` → tamamen sessiz değil, hafif bir "arka ses"
 *  - `muffle` ayrı bir eğri — uzaklık arttıkça kaba bir low-pass hissi
 *    simüle etmek için HUD/ambient kanallarında kullanılır.
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
        /** smoothstep → daha doğal, sert geçiş değil. */
        const eased = t * t * (3 - 2 * t);
        targetGain = 1 - eased * (1 - minGain);
        /** Muffle biraz daha erken devreye girsin — uzak ses daha boğuk hissedilir. */
        targetMuffle = Math.pow(t, 0.75);
      }

      const k = 1 - Math.exp(-AUDIO_DISTANCE.smoothingPerSec * delta);
      smoothed += (targetGain - smoothed) * k;
      muffle += (targetMuffle - muffle) * k;
      return smoothed;
    },
  };
}
