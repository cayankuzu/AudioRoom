import * as THREE from "three";

/**
 * Siyah volkanik çöl — NÖTR gri-beyaz bir ufuk. Referans: albüm kapak
 * fotoğrafı. Ton ailesi: kömür siyahı → antrasit → açık gri → kırık beyaz.
 * Renk kayması YOK; sahne monokromdur (sadece "REDD" yazısı kırmızıdır).
 *
 * Sis felsefesi:
 *  - `FogExp2` ile mesafe üssel şekilde yutulur → yumuşak atmosferik
 *    perspektif, sert "kesme" yok.
 *  - Yoğunluk 0.0052: foreground net, midground yumuşak, uzak silinir.
 *  - Arkaplan rengi gökyüzü horizon haze'i ile birebir uyumlu (açık gri
 *    → ufuk kaybolurken sky ile tutarlı).
 */
export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#bdc0c3");
  /**
   * Density 0.0042 → referans fotoğrafta midground hâlâ okunur, sadece
   * en uzak hat haze ile yumuşuyor. Daha önce 0.0057 idi: o değerde
   * sahne "duvar gibi" griye kesiliyordu.
   */
  scene.fog = new THREE.FogExp2("#b2b5b8", 0.0042);
  return scene;
}
