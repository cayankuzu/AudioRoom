import * as THREE from "three";

/**
 * Siyah volkanik çöl — soğuk, gri-antrasit bir ufuk sisi.
 * Sis yoğunluğu runtime'da gün-gece eğrisi ile nüans kazanır.
 */
export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#bfbfc1");
  scene.fog = new THREE.Fog("#b0b4b8", 36, 205);
  return scene;
}
