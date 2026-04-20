import * as THREE from "three";
import { CAMERA } from "../config/config";
import { LAYER } from "./layers";

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    CAMERA.fov,
    window.innerWidth / window.innerHeight,
    CAMERA.near,
    CAMERA.far,
  );
  camera.rotation.order = "YXZ";
  /** Yazı katmanını da render etsin — text mesh'leri TEXT layer'ında da aktif. */
  camera.layers.enable(LAYER.TEXT);
  return camera;
}
