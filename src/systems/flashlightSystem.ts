import * as THREE from "three";
import { FLASHLIGHT } from "../config/config";

export interface FlashlightState {
  on: boolean;
}

export interface FlashlightSystem {
  state: FlashlightState;
  toggle(): void;
  setOn(on: boolean): void;
  isOn(): boolean;
  dispose(): void;
}

/**
 * Kamera tabanlı first-person fener.
 *
 * - SpotLight + target; ikisi de kameranın alt düğümü olur.
 * - Kamera nereye bakıyorsa ışık oraya düşer (view-based).
 * - F tuşu ile aç/kapat; ilk durum KAPALI (atmosferi bozmamak için).
 * - Gölge kapalı — shadow map maliyetini ve banding'i önler.
 */
export function createFlashlightSystem(camera: THREE.PerspectiveCamera): FlashlightSystem {
  const state: FlashlightState = { on: false };

  const light = new THREE.SpotLight(
    FLASHLIGHT.color,
    0,
    FLASHLIGHT.distance,
    FLASHLIGHT.angle,
    FLASHLIGHT.penumbra,
    FLASHLIGHT.decay,
  );
  light.position.set(FLASHLIGHT.offset.x, FLASHLIGHT.offset.y, FLASHLIGHT.offset.z);
  light.castShadow = false;

  const target = new THREE.Object3D();
  target.position.set(
    FLASHLIGHT.offset.x,
    FLASHLIGHT.offset.y,
    FLASHLIGHT.offset.z - FLASHLIGHT.targetForward,
  );
  light.target = target;

  camera.add(light);
  camera.add(target);

  function apply(): void {
    light.intensity = state.on ? FLASHLIGHT.intensity : 0;
  }

  return {
    state,
    toggle() {
      state.on = !state.on;
      apply();
      console.log("[Fener]", state.on ? "AÇIK" : "KAPALI");
    },
    setOn(on) {
      state.on = on;
      apply();
    },
    isOn() {
      return state.on;
    },
    dispose() {
      camera.remove(light);
      camera.remove(target);
      light.dispose();
    },
  };
}
