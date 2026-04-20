import * as THREE from "three";
import { GRAMOPHONE, PALETTE, WORLD } from "../config/config";

/**
 * Aydınlatma — sarı kutu + kuantum/kapak hissi için katmanlı atmosfer:
 *
 *   1. Hemisphere — üst yarım küre sıcak altın, alt koyu (zemin derinliği).
 *   2. Ambient — sıcak kahve fill, gölge boşluklarını doldurur.
 *   3. Merkez spot — ikon + yazılar; tavandan hafif ofsetli (asimetrik dram).
 *   4. Gramofon spotu — varsayılan spawn’a kilitli (ilk frame’de sahne dolu).
 *   5. Köşe sıcak nokta — oda ölçeğine göre ölçeklenir (333 m uyumlu).
 *   6. `sun` — yan gelen sıcak yön ışığı; dalga facet gölgeleri.
 *   7. `moonFill` — soğuk mavi-gri zıt fill (“ayın karanlık yüzü” / sıcak-soğuk
 *      çelişkisi), çok düşük şiddet.
 *   8. `warmRim` — karşı köşede altın rim, duvarların “kart” olmasını kırar.
 *
 * `update(time)` — çok yavaş nefes (hemi + ay fill); göz yorulmaz.
 */
export interface WorldLights {
  hemi: THREE.HemisphereLight;
  ambient: THREE.AmbientLight;
  centerSpot: THREE.SpotLight;
  gramophoneSpot: THREE.SpotLight;
  cornerPoint: THREE.PointLight;
  sun: THREE.DirectionalLight;
  moonFill: THREE.DirectionalLight;
  warmRim: THREE.PointLight;
  /** Her frame çağrılabilir — yavaş ışık nefesi (saniye cinsinden time). */
  update(time: number): void;
}

export function createLights(scene: THREE.Scene): WorldLights {
  const half = WORLD.half;
  const ceil = WORLD.ceilingHeight;
  /** Köşe ışıkları oda yarıçapına orantılı — geniş kutuda da ulaşılabilir mesafe. */
  const cornerDist = half * 0.36;
  const cornerRange = half * 0.58;

  const hemi = new THREE.HemisphereLight(
    new THREE.Color("#f2d078").multiplyScalar(0.88),
    new THREE.Color("#070504"),
    1.12,
  );
  scene.add(hemi);

  const ambient = new THREE.AmbientLight("#5a4320", 0.52);
  scene.add(ambient);

  const centerSpot = new THREE.SpotLight(
    new THREE.Color(PALETTE.amberWarm),
    54,
    ceil + 14,
    Math.PI / 4.25,
    0.52,
    1.15,
  );
  centerSpot.position.set(0, ceil - 3.5, 2.5);
  centerSpot.target.position.set(0, 8, 0);
  scene.add(centerSpot);
  scene.add(centerSpot.target);

  const gramophoneSpot = new THREE.SpotLight(
    new THREE.Color("#fff2c0"),
    16,
    52,
    Math.PI / 5.5,
    0.58,
    1.55,
  );
  gramophoneSpot.position.set(
    GRAMOPHONE.position.x,
    9,
    GRAMOPHONE.position.z,
  );
  gramophoneSpot.target.position.set(
    GRAMOPHONE.position.x,
    1.25,
    GRAMOPHONE.position.z,
  );
  scene.add(gramophoneSpot);
  scene.add(gramophoneSpot.target);

  const cornerPoint = new THREE.PointLight("#ffce66", 38, cornerRange, 1.65);
  cornerPoint.position.set(cornerDist, 17, -cornerDist);
  scene.add(cornerPoint);

  const sun = new THREE.DirectionalLight(
    new THREE.Color("#ffe9c8"),
    0.94,
  );
  sun.position.set(half * 0.34, 46, half * 0.22);
  sun.target.position.set(0, 0, 0);
  scene.add(sun);
  scene.add(sun.target);

  /** Soğuk zıt-fill — sarı yüzeylere ince mavi-gri rim, derinlik. */
  const moonFill = new THREE.DirectionalLight(
    new THREE.Color("#8a9ab8"),
    0.19,
  );
  moonFill.position.set(-half * 0.28, 34, -half * 0.24);
  moonFill.target.position.set(2, 5, -4);
  scene.add(moonFill);
  scene.add(moonFill.target);

  const warmRim = new THREE.PointLight("#f5b83a", 44, cornerRange * 1.05, 1.72);
  warmRim.position.set(-cornerDist * 0.92, 15, cornerDist * 0.88);
  scene.add(warmRim);

  const baseHemi = hemi.intensity;
  const baseMoon = moonFill.intensity;

  function update(time: number): void {
    const breath = Math.sin(time * 0.13) * 0.045;
    hemi.intensity = baseHemi + breath;
    moonFill.intensity = baseMoon + Math.sin(time * 0.09) * 0.032;
    /** Rim hafif nabız — gramofon “ısı” alanına uzaktan destek. */
    warmRim.intensity = 44 + Math.sin(time * 0.17) * 5;
  }

  return {
    hemi,
    ambient,
    centerSpot,
    gramophoneSpot,
    cornerPoint,
    sun,
    moonFill,
    warmRim,
    update,
  };
}
