import * as THREE from "three";

export interface FlashlightHandle {
  toggle(): void;
  dispose(): void;
}

export function createFlashlight(camera: THREE.PerspectiveCamera): FlashlightHandle {
  const light = new THREE.SpotLight("#fff0c9", 0, 42, Math.PI / 7, 0.55, 1.35);
  light.position.set(0.08, -0.08, -0.12);
  const target = new THREE.Object3D();
  target.position.set(0, -0.04, -7);
  light.target = target;
  camera.add(light, target);
  let enabled = false;

  return {
    toggle() {
      enabled = !enabled;
      light.intensity = enabled ? 34 : 0;
    },
    dispose() {
      camera.remove(light, target);
      light.dispose();
    },
  };
}
