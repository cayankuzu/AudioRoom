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

export interface MovementSystem {
  pose: PlayerPose;
  /**
   * @param getHeightAt zemin yüksekliği fonksiyonu (dalgalı yüzey).
   * @param onStep ayak izi callback'i (oyuncu eşik mesafe yürüdüğünde).
   */
  update(
    delta: number,
    getHeightAt: (x: number, z: number) => number,
    onStep?: (x: number, z: number) => void,
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

  /** Adım takibi — yatay düzlemde toplam yürünen mesafe; eşiği geçince
   *  callback tetiklenir, ripple bırakılır. */
  let stepAccum = 0;
  let lastFootX = pose.position.x;
  let lastFootZ = pose.position.z;

  return {
    pose,
    update(delta, getHeightAt, onStep) {
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

      const sprinting =
        input.pressed.has("ShiftLeft") || input.pressed.has("ShiftRight");
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

      /** Kutu sınırı — duvar yüzeyinden bodyRadius kadar içerde clamp. */
      const limit = WORLD.half - PLAYER.bodyRadius;
      if (nextPos.x > limit) {
        nextPos.x = limit;
        pose.velocity.x = 0;
      } else if (nextPos.x < -limit) {
        nextPos.x = -limit;
        pose.velocity.x = 0;
      }
      if (nextPos.z > limit) {
        nextPos.z = limit;
        pose.velocity.z = 0;
      } else if (nextPos.z < -limit) {
        nextPos.z = -limit;
        pose.velocity.z = 0;
      }

      /** Tavan tampon. */
      const ceilLimit = WORLD.ceilingHeight - 0.4;
      if (nextPos.y > ceilLimit) {
        nextPos.y = ceilLimit;
        if (pose.velocity.y > 0) pose.velocity.y = 0;
      }

      /** ── Zemin: dalgalı yüzeyi takip et ─────────────────────────
       *  Oyuncu göz hizası = floorY + eyeHeight. Düşerken bu seviyeye
       *  oturursa grounded; aksi halde havadadır. */
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

      /** ── Adım eventi ──────────────────────────────────────────── */
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
        /** Havadayken konumu yine güncelle ki iniş anında jump yapma
         *  yanılgısı oluşmasın. */
        lastFootX = pose.position.x;
        lastFootZ = pose.position.z;
      }

      return pose;
    },
  };
}
