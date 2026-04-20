import * as THREE from "three";

/**
 * Dünya rüzgarı — tek merkez kaynak.
 *
 * Felsefe:
 *  - Çok hafif, sürekli bir taban rüzgar vardır (hiç bitmez).
 *  - Üstüne düşük frekanslı, çok hafif gerçek dalgalanma biner (yön + şiddet).
 *  - Hiçbir zaman "kum fırtınası" seviyesine çıkmaz; premium ve kontrollü kalır.
 *
 * Kullanım:
 *  - `atmosphere` rüzgarın `direction` × `strength`'ini drift olarak ekler
 *  - `ambientAudio` rüzgar şiddetiyle gain modüle eder
 *  - `cameraMotion` idle durumunda çok küçük bir sway eklemek için kullanır
 */
export interface WindState {
  /** Dünya XZ düzleminde normalize rüzgar yönü. */
  direction: THREE.Vector2;
  /** 0..1 — taban + varyasyon karışımı. */
  strength: number;
  /** Anlık sinüsoidal varyasyon — partiküller/ses için küçük mikro-random. */
  turbulence: number;
}

export interface WindSystem {
  readonly state: WindState;
  update(time: number, delta: number): WindState;
}

interface WindConfig {
  /** Hiç bitmez taban şiddet (0..1). */
  baseStrength: number;
  /** Taban üstüne binen dalgalanma genliği. */
  variationAmp: number;
  /** Şiddet dalgalanmasının hızı (rad/sn). */
  variationFreq: number;
  /** Yön salınımı (radyan). Temel yön etrafında kadran salınır. */
  directionJitter: number;
  /** Yön salınımı hızı. */
  directionFreq: number;
  /** Rüzgarın temel yön açısı (radyan). */
  baseAngle: number;
}

const DEFAULT_CONFIG: WindConfig = {
  baseStrength: 0.34,
  variationAmp: 0.22,
  variationFreq: 0.11,
  directionJitter: 0.35,
  directionFreq: 0.06,
  baseAngle: -Math.PI * 0.22,
};

export function createWindSystem(overrides: Partial<WindConfig> = {}): WindSystem {
  const cfg: WindConfig = { ...DEFAULT_CONFIG, ...overrides };

  const state: WindState = {
    direction: new THREE.Vector2(Math.cos(cfg.baseAngle), Math.sin(cfg.baseAngle)),
    strength: cfg.baseStrength,
    turbulence: 0,
  };

  return {
    state,
    update(time) {
      /** Şiddet: taban + yavaş sinüs; 0..1 aralığında kilitli. */
      const slow = Math.sin(time * cfg.variationFreq);
      const fast = Math.sin(time * cfg.variationFreq * 2.7 + 1.3) * 0.35;
      const v = (slow + fast) * 0.5;
      state.strength = Math.max(
        0.02,
        Math.min(1, cfg.baseStrength + v * cfg.variationAmp),
      );

      /** Yön: temel açı etrafında yavaş salınım. */
      const ang = cfg.baseAngle + Math.sin(time * cfg.directionFreq) * cfg.directionJitter;
      state.direction.set(Math.cos(ang), Math.sin(ang));

      /** Türbülans: küçük yüksek-frekans komponent. */
      state.turbulence = Math.sin(time * 0.9) * 0.5 + Math.sin(time * 2.17 + 0.7) * 0.5;

      return state;
    },
  };
}
