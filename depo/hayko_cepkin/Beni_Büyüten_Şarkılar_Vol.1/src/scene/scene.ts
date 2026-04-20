import * as THREE from "three";
import { WORLD } from "../config/config";

/**
 * Sahne — derin kan kırmızısı rahim. Exp² sis ile bokeh ışıkları
 * uzakta yumuşakça eriyip kapaktaki sıcak DOF hissi oluşur.
 */
export function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(WORLD.fogColor);
  scene.fog = new THREE.FogExp2(WORLD.fogColor, WORLD.fogDensity);
  return scene;
}
