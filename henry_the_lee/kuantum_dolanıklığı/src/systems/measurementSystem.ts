import * as THREE from "three";
import { MEASUREMENT } from "../config/config";

/**
 * Heisenberg belirsizlik ölçer — bir parçacığın **konumu** ve **hızı**
 * aynı anda gözlemlenemez.
 *
 * Davranış:
 *  - `measurePosition()` → o anki plak konumunu snapshot olarak yakalar.
 *    UI bu snapshot'ı `MEASUREMENT.showDuration` sn boyunca tam parlaklıkta,
 *    sonra `fadeDuration` sn boyunca söndürerek gösterir. Hız okunamaz.
 *  - `measureVelocity()` → o anki hız vektörünün büyüklüğünü snapshot
 *    olarak yakalar. Aynı şekilde gösterilip söner. Konum okunamaz.
 *  - İki ölçüm birbirini iptal eder; eşzamanlı görünmez.
 *  - `cooldown` sn geçmeden yeni ölçüm yapılamaz (sürekli ölçüm engelli).
 *
 * NOT: Kuantum perturbasyonu (ölçüm sonrası rastgele hız/yön değişimi)
 * şu an YOK — kullanıcı isteği: "konum seçildiğinde anlık konum
 * gösterildikten sonra plak hareketine devam etmeli". Plak hareketi
 * zaten her 6 sn'de doğal olarak değişiyor.
 */

export type MeasurementMode = "idle" | "position" | "velocity";

export interface MeasurementSnapshot {
  mode: MeasurementMode;
  /** Konum modunda anlamlı. */
  position: THREE.Vector3 | null;
  /** Hız modunda anlamlı (m/s). */
  speed: number;
  /** 0..1 — UI alpha çarpanı (showDuration boyunca 1.0, fadeDuration
   *  içinde 1.0 → 0.0). 0 olunca mode otomatik 'idle' döner. */
  alpha: number;
}

export interface MeasurementSystem {
  snapshot: MeasurementSnapshot;
  /** Cooldown geçmiş mi? UI butonları için. */
  isReady(): boolean;
  /** 0..1 — cooldown progress (0 = yeni ölçüldü, 1 = hazır). */
  readiness(): number;
  measurePosition(vinylPos: THREE.Vector3, time: number): boolean;
  measureVelocity(vinylVel: THREE.Vector3, time: number): boolean;
  update(time: number): void;
}

export function createMeasurementSystem(): MeasurementSystem {
  const snapshot: MeasurementSnapshot = {
    mode: "idle",
    position: null,
    speed: 0,
    alpha: 0,
  };

  let lastMeasureTime = -Infinity;
  let displayStart = 0;

  const isReady = () => performance.now() / 1000 - lastMeasureTime >= MEASUREMENT.cooldown;

  const readiness = () => {
    const elapsed = performance.now() / 1000 - lastMeasureTime;
    return Math.min(1, elapsed / MEASUREMENT.cooldown);
  };

  const beginMeasurement = (mode: MeasurementMode, time: number): boolean => {
    if (!isReady()) return false;
    snapshot.mode = mode;
    snapshot.alpha = 1;
    displayStart = time;
    lastMeasureTime = performance.now() / 1000;
    return true;
  };

  return {
    snapshot,
    isReady,
    readiness,
    measurePosition(vinylPos, time) {
      if (!beginMeasurement("position", time)) return false;
      snapshot.position = vinylPos.clone();
      snapshot.speed = 0;
      return true;
    },
    measureVelocity(vinylVel, time) {
      if (!beginMeasurement("velocity", time)) return false;
      snapshot.position = null;
      snapshot.speed = Math.hypot(vinylVel.x, vinylVel.z);
      return true;
    },
    update(time) {
      if (snapshot.mode === "idle") return;
      const t = time - displayStart;
      if (t <= MEASUREMENT.showDuration) {
        snapshot.alpha = 1;
      } else {
        const fadeT = (t - MEASUREMENT.showDuration) / MEASUREMENT.fadeDuration;
        snapshot.alpha = Math.max(0, 1 - fadeT);
        if (snapshot.alpha <= 0) {
          snapshot.mode = "idle";
          snapshot.position = null;
          snapshot.speed = 0;
        }
      }
    },
  };
}
