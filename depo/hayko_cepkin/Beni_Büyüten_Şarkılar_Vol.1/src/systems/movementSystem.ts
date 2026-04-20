import * as THREE from "three";
import { FLOOR, PLAYER, WORLD } from "../config/config";
import type { InputHandle } from "./inputSystem";

export interface PlayerPose {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  grounded: boolean;
  speed: number;
}

export interface CylinderCollider {
  x: number;
  z: number;
  radius: number;
}

export interface MovementSystem {
  pose: PlayerPose;
  update(
    delta: number,
    getHeightAt: (x: number, z: number) => number,
    onStep?: (x: number, z: number) => void,
    getColliders?: () => readonly CylinderCollider[],
  ): PlayerPose;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function createMovementSystem(
  camera: THREE.PerspectiveCamera,
  input: InputHandle,
): MovementSystem {
  const pose: PlayerPose = {
    position: new THREE.Vector3(
      PLAYER.startPosition.x,
      PLAYER.startPosition.y + PLAYER.eyeHeight,
      PLAYER.startPosition.z,
    ),
    /** Bebeğe doğru bakar — Z+ tarafından geliyoruz, yaw = π. */
    velocity: new THREE.Vector3(),
    yaw: Math.PI,
    pitch: -0.05,
    grounded: true,
    speed: 0,
  };

  const wishDir = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const nextPos = new THREE.Vector3();

  let stepAccum = 0;
  let lastFootX = pose.position.x;
  let lastFootZ = pose.position.z;

  return {
    pose,
    update(delta, getHeightAt, onStep, getColliders) {
      const look = input.consumeLook();
      pose.yaw += look.x;
      pose.pitch = clamp(pose.pitch + look.y, -1.25, 1.1);

      let forwardAxis =
        Number(input.pressed.has("KeyW") || input.pressed.has("ArrowUp")) -
        Number(input.pressed.has("KeyS") || input.pressed.has("ArrowDown"));
      const strafeAxis =
        Number(input.pressed.has("KeyD") || input.pressed.has("ArrowRight")) -
        Number(input.pressed.has("KeyA") || input.pressed.has("ArrowLeft"));

      const sprinting =
        input.pressed.has("ShiftLeft") || input.pressed.has("ShiftRight");
      if (sprinting && forwardAxis === 0 && strafeAxis === 0) {
        forwardAxis = 1;
      }

      forward.set(-Math.sin(pose.yaw), 0, -Math.cos(pose.yaw));
      right.set(Math.cos(pose.yaw), 0, -Math.sin(pose.yaw));

      wishDir.set(0, 0, 0);
      wishDir.addScaledVector(forward, forwardAxis);
      wishDir.addScaledVector(right, strafeAxis);
      if (wishDir.lengthSq() > 0) wishDir.normalize();
      const targetSpeed = sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;

      const accel = pose.grounded ? PLAYER.accelGround : PLAYER.accelAir;
      const desiredVX = wishDir.x * targetSpeed;
      const desiredVZ = wishDir.z * targetSpeed;

      pose.velocity.x = lerp(
        pose.velocity.x,
        desiredVX,
        1 - Math.exp(-accel * delta),
      );
      pose.velocity.z = lerp(
        pose.velocity.z,
        desiredVZ,
        1 - Math.exp(-accel * delta),
      );

      if (input.pressed.has("Space") && pose.grounded) {
        pose.velocity.y = PLAYER.jumpImpulse;
        pose.grounded = false;
      }

      pose.velocity.y -= PLAYER.gravity * delta;

      nextPos.copy(pose.position).addScaledVector(pose.velocity, delta);

      /** Dairesel sınır — rahim yumuşak. */
      const limit = WORLD.half - PLAYER.bodyRadius;
      const horiz = Math.hypot(nextPos.x, nextPos.z);
      if (horiz > limit) {
        const k = limit / horiz;
        nextPos.x *= k;
        nextPos.z *= k;
        /** Radyal hızı sıfırla, teğet kalsın. */
        const nx = nextPos.x / limit;
        const nz = nextPos.z / limit;
        const radial = pose.velocity.x * nx + pose.velocity.z * nz;
        if (radial > 0) {
          pose.velocity.x -= radial * nx;
          pose.velocity.z -= radial * nz;
        }
      }

      /** Silindirik çarpışmalar — gramofon, plaklar, merkez bebek vs. */
      if (getColliders) {
        const colliders = getColliders();
        for (let i = 0; i < colliders.length; i += 1) {
          const c = colliders[i]!;
          const dx = nextPos.x - c.x;
          const dz = nextPos.z - c.z;
          const d2 = dx * dx + dz * dz;
          const minD = c.radius + PLAYER.bodyRadius;
          if (d2 >= minD * minD) continue;
          const d = Math.sqrt(Math.max(d2, 1e-6));
          const nx = d > 1e-4 ? dx / d : 1;
          const nz = d > 1e-4 ? dz / d : 0;
          /** Pozisyonu sınır boyunca dışarı it. */
          nextPos.x = c.x + nx * minD;
          nextPos.z = c.z + nz * minD;
          /** İçeri doğru olan hız bileşenini sıfırla. */
          const into = pose.velocity.x * nx + pose.velocity.z * nz;
          if (into < 0) {
            pose.velocity.x -= into * nx;
            pose.velocity.z -= into * nz;
          }
        }
      }

      const floorY = getHeightAt(nextPos.x, nextPos.z);
      const eyeY = floorY + PLAYER.eyeHeight;
      if (nextPos.y <= eyeY) {
        nextPos.y = eyeY;
        pose.velocity.y = 0;
        pose.grounded = true;
      } else {
        pose.grounded = false;
      }

      pose.position.copy(nextPos);
      pose.speed = Math.hypot(pose.velocity.x, pose.velocity.z);

      camera.position.copy(pose.position);
      camera.rotation.set(pose.pitch, pose.yaw, 0, "YXZ");

      if (pose.grounded && onStep) {
        const dx = pose.position.x - lastFootX;
        const dz = pose.position.z - lastFootZ;
        const moved = Math.hypot(dx, dz);
        stepAccum += moved;
        lastFootX = pose.position.x;
        lastFootZ = pose.position.z;
        if (stepAccum >= FLOOR.step.distance) {
          stepAccum = 0;
          onStep(pose.position.x, pose.position.z);
        }
      } else {
        lastFootX = pose.position.x;
        lastFootZ = pose.position.z;
      }

      return pose;
    },
  };
}
