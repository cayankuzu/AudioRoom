import * as THREE from "three";
import type { PlayerPose } from "../types";
import { PLAYER } from "../config/config";
import { clamp, lerp } from "../utils/helpers";
import type { InputHandle } from "./inputSystem";
import type { CollisionSystem } from "./collisionSystem";

export interface MovementSystem {
  pose: PlayerPose;
  update(delta: number, getHeightAt: (x: number, z: number) => number): PlayerPose;
  setPosition(x: number, y: number, z: number): void;
}

export function createMovementSystem(
  camera: THREE.PerspectiveCamera,
  input: InputHandle,
  collisions: CollisionSystem,
): MovementSystem {
  const pose: PlayerPose = {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    grounded: false,
    crouching: false,
    sprinting: false,
    speed: 0,
  };

  const nextPos = new THREE.Vector3();
  const wishDir = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();

  return {
    pose,
    setPosition(x: number, y: number, z: number) {
      pose.position.set(x, y, z);
      pose.velocity.set(0, 0, 0);
    },
    update(delta, getHeightAt) {
      const look = input.consumeLook();
      pose.yaw += look.x;
      pose.pitch = clamp(pose.pitch + look.y, -1.25, 1.1);

      const forwardAxis =
        Number(input.pressed.has("KeyW") || input.pressed.has("ArrowUp")) -
        Number(input.pressed.has("KeyS") || input.pressed.has("ArrowDown"));
      const strafeAxis =
        Number(input.pressed.has("KeyD") || input.pressed.has("ArrowRight")) -
        Number(input.pressed.has("KeyA") || input.pressed.has("ArrowLeft"));

      forward.set(-Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
      right.set(Math.cos(pose.yaw), 0, -Math.sin(pose.yaw));

      wishDir.set(0, 0, 0);
      wishDir.addScaledVector(forward, forwardAxis);
      wishDir.addScaledVector(right, strafeAxis);
      if (wishDir.lengthSq() > 0) wishDir.normalize();

      pose.sprinting = input.pressed.has("ShiftLeft") || input.pressed.has("ShiftRight");
      pose.crouching = input.pressed.has("KeyC") || input.pressed.has("ControlLeft");

      let targetSpeed: number = PLAYER.walkSpeed;
      if (pose.sprinting && !pose.crouching) targetSpeed = PLAYER.sprintSpeed;
      if (pose.crouching) targetSpeed = PLAYER.crouchSpeed;

      const accel = pose.grounded ? PLAYER.accelGround : PLAYER.accelAir;
      const desiredVX = wishDir.x * targetSpeed;
      const desiredVZ = wishDir.z * targetSpeed;

      pose.velocity.x = lerp(pose.velocity.x, desiredVX, 1 - Math.exp(-accel * delta));
      pose.velocity.z = lerp(pose.velocity.z, desiredVZ, 1 - Math.exp(-accel * delta));

      if (input.pressed.has("Space") && pose.grounded) {
        pose.velocity.y = PLAYER.jumpImpulse;
        pose.grounded = false;
      }

      pose.velocity.y -= PLAYER.gravity * delta;

      nextPos.copy(pose.position).addScaledVector(pose.velocity, delta);

      collisions.resolveXZ(nextPos, PLAYER.bodyRadius);

      const eye = pose.crouching ? PLAYER.crouchEyeHeight : PLAYER.eyeHeight;
      const groundY = getHeightAt(nextPos.x, nextPos.z) + eye;
      if (nextPos.y <= groundY) {
        nextPos.y = groundY;
        pose.velocity.y = 0;
        pose.grounded = true;
      } else {
        pose.grounded = false;
      }

      pose.position.copy(nextPos);
      pose.speed = Math.hypot(pose.velocity.x, pose.velocity.z);

      camera.position.copy(pose.position);
      camera.rotation.set(pose.pitch, pose.yaw, 0, "YXZ");

      return pose;
    },
  };
}
