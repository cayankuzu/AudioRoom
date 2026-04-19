import * as THREE from "three";
import { WORLD } from "../config/config";

/**
 * Sahne — saf boşluk. Arkaplan = fog rengi → ufukta zemin sise erir.
 * Exp² sis kullanıyoruz çünkü "sınırsız boşluk" hissini lineer sis veremez.
 */
export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(WORLD.fogColor);
  scene.fog = new THREE.FogExp2(WORLD.fogColor, WORLD.fogDensity);
  return scene;
}
