import * as THREE from "three";
import type { Colliders } from "./colliders";
import type { Input } from "./input";

export interface PlayerOptions {
  eyeHeight: number;
  radius: number;
  walkSpeed: number;
  sprintSpeed: number;
  jumpSpeed: number;
  gravity: number;
  accel: number;
  airAccel: number;
}

export const DEFAULT_PLAYER: PlayerOptions = {
  eyeHeight: 1.7,
  radius: 0.4,
  walkSpeed: 4.6,
  sprintSpeed: 7.8,
  jumpSpeed: 5.4,
  gravity: 16,
  accel: 11,
  airAccel: 2.5,
};

export interface Player {
  readonly position: THREE.Vector3;
  readonly velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  onGround: boolean;
  /** Sinematik anlarda girdiyi yok sayar. */
  frozen: boolean;
  options: PlayerOptions;
  /** Ek hız çarpanı (dünya mekanikleri için, ör. kabuk/ağır yürüyüş). */
  speedScale: number;
  speed(): number;
  update(dt: number, input: Input, ground: (x: number, z: number) => number, colliders: Colliders): void;
  /** thirdPerson: kamera karakterin arkasında, omuz üstünden (ground: kamera zemine gömülmesin). */
  applyCamera(camera: THREE.PerspectiveCamera, dt: number, headBob: boolean, baseFov: number, thirdPerson?: boolean, ground?: (x: number, z: number) => number): void;
  teleport(x: number, z: number, yaw: number, ground: (x: number, z: number) => number): void;
  onStep(fn: (sprinting: boolean) => void): void;
  onLand(fn: (impact: number) => void): void;
}

const PITCH_LIMIT = 1.45;
const STEP_LENGTH = 1.9;

export function createPlayer(options: Partial<PlayerOptions> = {}): Player {
  const position = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const stepListeners: Array<(sprinting: boolean) => void> = [];
  const landListeners: Array<(impact: number) => void> = [];
  const wish = new THREE.Vector3();
  let stepDistance = 0;
  let bobPhase = 0;
  let bobAmount = 0;
  let landDip = 0;
  let sprinting = false;
  let fovKick = 0;
  const thirdPos = new THREE.Vector3();
  const thirdGoal = new THREE.Vector3();
  const thirdTarget = new THREE.Vector3();
  let thirdInit = true;

  const player: Player = {
    position,
    velocity,
    yaw: 0,
    pitch: 0,
    onGround: true,
    frozen: false,
    options: { ...DEFAULT_PLAYER, ...options },
    speedScale: 1,
    speed: () => Math.hypot(velocity.x, velocity.z),
    update(dt, input, ground, colliders) {
      const o = player.options;
      const look = input.consumeLook();
      if (!player.frozen) {
        player.yaw += look.yaw;
        player.pitch = THREE.MathUtils.clamp(player.pitch + look.pitch, -PITCH_LIMIT, PITCH_LIMIT);
      }

      const axis = player.frozen ? { x: 0, y: 0 } : input.moveAxis();
      sprinting = !player.frozen && input.isDown("ShiftLeft") && axis.y > 0;
      const topSpeed = (sprinting ? o.sprintSpeed : o.walkSpeed) * player.speedScale;
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      // İleri = -Z (kamera yönü), sağ = +X
      wish.set(axis.x * cos - axis.y * sin, 0, -axis.x * sin - axis.y * cos).multiplyScalar(topSpeed);

      const accel = player.onGround ? o.accel : o.airAccel;
      const blend = 1 - Math.exp(-accel * dt);
      velocity.x += (wish.x - velocity.x) * blend;
      velocity.z += (wish.z - velocity.z) * blend;

      if (player.onGround && !player.frozen && input.isDown("Space")) {
        velocity.y = o.jumpSpeed;
        player.onGround = false;
      }
      velocity.y -= o.gravity * dt;

      const prevX = position.x;
      const prevZ = position.z;
      position.addScaledVector(velocity, dt);
      colliders.resolve(position, o.radius);

      const floor = ground(position.x, position.z);
      if (position.y <= floor) {
        if (!player.onGround && velocity.y < -3) {
          const impact = Math.min(1, -velocity.y / 14);
          landDip = Math.max(landDip, impact * 0.18);
          landListeners.forEach((fn) => fn(impact));
        }
        position.y = floor;
        velocity.y = 0;
        player.onGround = true;
      } else if (player.onGround && position.y - floor < 0.35 && velocity.y <= 0) {
        position.y = floor; // yokuş aşağı yapışma
      } else {
        player.onGround = false;
      }

      const moved = Math.hypot(position.x - prevX, position.z - prevZ);
      if (player.onGround && moved > 0.0005) {
        stepDistance += moved;
        bobPhase += (moved / STEP_LENGTH) * Math.PI;
        if (stepDistance >= STEP_LENGTH * 0.5) {
          stepDistance = 0;
          stepListeners.forEach((fn) => fn(sprinting));
        }
      }
      const moving = player.speed() / Math.max(0.01, o.walkSpeed);
      bobAmount += (Math.min(1.3, player.onGround ? moving : 0) - bobAmount) * Math.min(1, dt * 8);
      landDip += (0 - landDip) * Math.min(1, dt * 6);
      fovKick += ((sprinting ? 6 : 0) - fovKick) * Math.min(1, dt * 5);
    },
    applyCamera(camera, dt, headBob, baseFov, thirdPerson = false, ground) {
      const bob = headBob ? bobAmount : 0;
      const bobY = Math.abs(Math.sin(bobPhase)) * 0.045 * bob;
      const bobX = Math.cos(bobPhase) * 0.025 * bob;
      if (thirdPerson) {
        // Omuz üstü: göz noktasının arkasında ve biraz sağında; bakış aşağı/yukarı eğilince kamera yörüngede kayar.
        const eyeY = position.y + player.options.eyeHeight - 0.1;
        const back = 3.0;
        const fx = -Math.sin(player.yaw);
        const fz = -Math.cos(player.yaw);
        const rx = Math.cos(player.yaw);
        const rz = -Math.sin(player.yaw);
        const cp = Math.cos(player.pitch);
        const sp = Math.sin(player.pitch);
        thirdTarget.set(position.x + fx * 1.2 + rx * 0.35, eyeY + 0.05, position.z + fz * 1.2 + rz * 0.35);
        thirdGoal.set(
          position.x - fx * back * cp + rx * 0.55,
          eyeY + 0.35 - sp * back,
          position.z - fz * back * cp + rz * 0.55,
        );
        if (ground) thirdGoal.y = Math.max(thirdGoal.y, ground(thirdGoal.x, thirdGoal.z) + 0.45);
        // Yumuşak takip: kamera karakterin arkasında bir adım geriden gelir, sarsmaz.
        const k = thirdInit ? 1 : Math.min(1, dt * 9);
        thirdInit = false;
        thirdPos.lerp(thirdGoal, k);
        camera.position.copy(thirdPos);
        camera.lookAt(thirdTarget);
        camera.rotation.z += headBob ? Math.cos(bobPhase) * 0.002 * bob : 0;
      } else {
        thirdInit = true;
        camera.position.set(
          position.x + Math.cos(player.yaw) * bobX,
          position.y + player.options.eyeHeight + bobY - landDip,
          position.z - Math.sin(player.yaw) * bobX,
        );
        camera.rotation.set(player.pitch, player.yaw, headBob ? Math.cos(bobPhase) * 0.004 * bob : 0);
      }
      const fov = baseFov + fovKick;
      if (Math.abs(camera.fov - fov) > 0.01) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    },
    teleport(x, z, yaw, ground) {
      position.set(x, ground(x, z), z);
      velocity.set(0, 0, 0);
      player.yaw = yaw;
      player.pitch = 0;
    },
    onStep(fn) {
      stepListeners.push(fn);
    },
    onLand(fn) {
      landListeners.push(fn);
    },
  };
  return player;
}

/** (x, z) noktasından hedefe bakan yaw açısı (kamera -Z'ye bakar). */
export function yawTowards(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(-(toX - fromX), -(toZ - fromZ));
}
