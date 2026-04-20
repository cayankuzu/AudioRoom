import * as THREE from "three";
import { COMPOSITION, PALETTE, WORLD } from "../config/config";

/**
 * Aydınlatma — kapaktaki rahim atmosferi:
 *   1. Hemisphere — üstten sıcak amber, alttan koyu kan kırmızısı.
 *   2. Ambient — derin maroon fill, gölge boşluklarını doldurur.
 *   3. Merkez kor halkası — bebeğe yukarıdan ve önden sıcak kor düşer.
 *   4. Rim — arkadan turuncu rim ışığı ("sıcak kor halkası").
 *   5. CounterFill — uzak bokeh tarafından gelen dağınık sıcak ışık.
 *
 * `update(time)` — çok yavaş nefes (kor ışığı dalgalanır).
 */
export interface WorldLights {
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  centerSpot: THREE.SpotLight;
  rim: THREE.PointLight;
  counterFill: THREE.PointLight;
  update(time: number): void;
}

export function createLights(scene: THREE.Scene): WorldLights {
  const half = WORLD.half;

  const hemi = new THREE.HemisphereLight(
    new THREE.Color(PALETTE.amber).multiplyScalar(0.92),
    new THREE.Color(PALETTE.bloodDeep),
    0.95,
  );
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(
    new THREE.Color(PALETTE.maroon),
    0.55,
  );
  scene.add(ambient);

  /** Bebeğin üzerine inen sıcak kor halkası. */
  const centerSpot = new THREE.SpotLight(
    new THREE.Color(PALETTE.emberSoft),
    62,
    52,
    Math.PI / 4.6,
    0.55,
    1.25,
  );
  centerSpot.position.set(0, 28, 4);
  centerSpot.target.position.set(0, COMPOSITION.iconY, 0);
  scene.add(centerSpot);
  scene.add(centerSpot.target);

  /** Arkadan kor turuncu rim — bebeğin etrafında halka oluşturur. */
  const rim = new THREE.PointLight(
    new THREE.Color(PALETTE.ember),
    48,
    44,
    1.6,
  );
  rim.position.set(0, COMPOSITION.iconY + 1.5, -6);
  scene.add(rim);

  /** Uzak bokeh tarafından gelen dağınık sıcak ışık (kapakta DOF). */
  const counterFill = new THREE.PointLight(
    new THREE.Color(PALETTE.amber),
    32,
    half * 0.7,
    1.7,
  );
  counterFill.position.set(half * 0.18, 18, half * 0.22);
  scene.add(counterFill);

  /** Yan dolgu — uzaktan tek yönlü sıcak ışık, derinlik. */
  const sun = new THREE.DirectionalLight(
    new THREE.Color("#ffc090"),
    0.45,
  );
  sun.position.set(-half * 0.3, 28, -half * 0.4);
  sun.target.position.set(0, COMPOSITION.iconY, 0);
  scene.add(sun);
  scene.add(sun.target);

  const baseHemi = hemi.intensity;
  const baseRim = rim.intensity;
  const baseCenter = centerSpot.intensity;

  function update(time: number): void {
    const slow = Math.sin(time * 0.16) * 0.05;
    /**
     * Kalp atışı (1.6Hz) — shader'larda kullanılan nabızla senkron.
     * Sistol+diyastol katmanı: hızlı düşen tepe + yavaş alt zeminin
     * birleşimiyle gerçek kalp atışı dokusu.
     */
    const heart =
      0.65 * Math.sin(time * 1.6) +
      0.35 * Math.sin(time * 3.2 + 0.7);
    hemi.intensity = baseHemi + slow + heart * 0.04;
    rim.intensity = baseRim + heart * 8;
    centerSpot.intensity = baseCenter + Math.sin(time * 0.24) * 6 + heart * 4;
  }

  return { hemi, ambient, centerSpot, rim, counterFill, update };
}
