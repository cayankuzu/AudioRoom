import * as THREE from "three";
import { CAMERA } from "../config/config";
import { lerp } from "../utils/helpers";
import type { PlayerPose } from "../types";

export interface CameraMotion {
  apply(camera: THREE.PerspectiveCamera, pose: PlayerPose, time: number, delta: number): void;
}

export function createCameraMotion(): CameraMotion {
  let bobTime = 0;
  let bobStrength = 0;

  return {
    apply(camera, pose, time, delta) {
      const moving = pose.speed > 0.3 && pose.grounded ? 1 : 0;
      bobStrength = lerp(bobStrength, moving, 1 - Math.exp(-6 * delta));
      bobTime += delta * (2.0 + pose.speed * 0.55);
      const vertical = Math.sin(bobTime * 7.5) * CAMERA.bobStrength * bobStrength;
      const lateral = Math.cos(bobTime * 3.75) * CAMERA.bobStrength * 0.4 * bobStrength;
      const breath = Math.sin(time * 1.15) * CAMERA.breathStrength;
      camera.position.y += vertical + breath;
      camera.position.x += Math.sin(pose.yaw + Math.PI / 2) * lateral;
      camera.position.z += Math.cos(pose.yaw + Math.PI / 2) * lateral;
    },
  };
}
