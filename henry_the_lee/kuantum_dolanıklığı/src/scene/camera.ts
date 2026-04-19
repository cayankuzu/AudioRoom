import * as THREE from "three";
import { CAMERA } from "../config/config";

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    CAMERA.fov,
    window.innerWidth / window.innerHeight,
    CAMERA.near,
    CAMERA.far,
  );
  camera.rotation.order = "YXZ";
  return camera;
}
