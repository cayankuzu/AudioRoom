import * as THREE from "three";

/**
 * Siyah volkanik çöl — soğuk, gri-antrasit bir ufuk sisi.
 *
 * Sis felsefesi (sinematik derinlik):
 *  - `FogExp2` ile mesafe üssel şekilde yutulur → sert bir duvar yerine
 *    yumuşak ve doğal bir atmosferik perspektif.
 *  - Yoğunluk düşük tutulur (0.0048) → foreground ve midground okunurluğu
 *    bozulmaz; uzak kayalar ve tepeler mat bir hale bürünür.
 *  - Arkaplan rengi sis tonuyla aynı aileden: ufuk kaybolurken gökyüzüyle
 *    ton tutarlı kalır.
 */
export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#c2c4c6");
  /**
   * FogExp2 = e^(-(density·distance)^2). 0.0048 ≈ 60m'de %20, 120m'de %56
   * yutma — derin, sinematik, ama ön plan net.
   */
  scene.fog = new THREE.FogExp2("#b3b7bb", 0.0048);
  return scene;
}
