import * as THREE from "three";
import { createGramophone as createMukemmelBoslukGramophone } from "../../../../redd/mukemmel_bosluk/src/world/gramophone";
import { GRAMOPHONE, WORLD } from "../config";

type AvoidPosition = Pick<THREE.Vector3, "x" | "z">;

export interface GramophoneHandle {
  readonly root: THREE.Group;
  readonly position: THREE.Vector3;
  readonly isStolen: boolean;
  readonly isPlayerCarried: boolean;
  readonly isPlaced: boolean;
  readonly hasRecord: boolean;
  canInteract(playerPosition: THREE.Vector3): boolean;
  steal(): boolean;
  recoverNear(position: THREE.Vector3): void;
  playerPickUp(): boolean;
  playerDrop(): boolean;
  insertRecord(): boolean;
  removeRecord(): boolean;
  reset(avoidPositions?: readonly AvoidPosition[]): void;
  update(time: number, delta: number, bunnyPosition: THREE.Vector3, bunnyYaw: number): void;
  dispose(): void;
}

export function createGramophone(
  scene: THREE.Scene,
  camera: THREE.Camera,
  getHeightAt: (x: number, z: number) => number,
  initialAvoidPositions: readonly AvoidPosition[] = [],
): GramophoneHandle {
  const initial = new THREE.Vector3();
  const chooseRandomPosition = (
    target: THREE.Vector3,
    avoidPositions: readonly AvoidPosition[],
  ) => {
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 18 + Math.random() * Math.min(42, WORLD.radius - 28);
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      if (
        avoidPositions.every(
          (position) => Math.hypot(x - position.x, z - position.z) >= 14,
        )
      ) {
        return target.set(x, getHeightAt(x, z) + 0.025, z);
      }
    }
    return target.set(
      GRAMOPHONE.position.x,
      getHeightAt(GRAMOPHONE.position.x, GRAMOPHONE.position.z) + 0.025,
      GRAMOPHONE.position.z,
    );
  };
  chooseRandomPosition(initial, initialAvoidPositions);
  const base = createMukemmelBoslukGramophone(scene, camera, initial);
  base.root.name = "klostrofobik-gramophone";
  base.root.scale.setScalar(1.72);
  const inheritedBrandPlaque = base.root.children.find(
    (child) =>
      child instanceof THREE.Mesh &&
      child.geometry instanceof THREE.PlaneGeometry &&
      Math.abs(child.position.y - 0.12) < 0.01 &&
      Math.abs(child.position.z - 0.301) < 0.01,
  );
  if (inheritedBrandPlaque) inheritedBrandPlaque.visible = false;

  let carrier: "ground" | "rabbit" | "player" = "ground";
  let hasRecord = false;
  const worldPosition = new THREE.Vector3();
  const carryOffset = new THREE.Vector3();

  const placeAt = (x: number, z: number) => {
    base.root.position.set(x, getHeightAt(x, z) + 0.025, z);
    base.root.rotation.set(0, Math.random() * Math.PI * 2, 0);
    base.root.updateMatrixWorld(true);
  };

  return {
    root: base.root,
    get position() {
      return base.root.getWorldPosition(worldPosition);
    },
    get isStolen() {
      return carrier === "rabbit";
    },
    get isPlayerCarried() {
      return carrier === "player";
    },
    get isPlaced() {
      return carrier === "ground";
    },
    get hasRecord() {
      return hasRecord;
    },
    canInteract(playerPosition) {
      if (carrier !== "ground") return false;
      base.root.getWorldPosition(worldPosition);
      worldPosition.y = playerPosition.y;
      return worldPosition.distanceToSquared(playerPosition) <= GRAMOPHONE.interactRadius ** 2;
    },
    steal() {
      if (carrier !== "ground") return false;
      carrier = "rabbit";
      return true;
    },
    recoverNear(position) {
      if (carrier !== "rabbit") return;
      carrier = "ground";
      const angle = Math.atan2(position.x, position.z) + Math.PI / 2;
      placeAt(position.x + Math.sin(angle) * 1.35, position.z + Math.cos(angle) * 1.35);
    },
    playerPickUp() {
      if (carrier !== "ground") return false;
      base.toggleCarry(camera, getHeightAt);
      carrier = "player";
      return true;
    },
    playerDrop() {
      if (carrier !== "player") return false;
      base.toggleCarry(camera, getHeightAt);
      carrier = "ground";
      return true;
    },
    insertRecord() {
      if (carrier !== "ground" || hasRecord) return false;
      hasRecord = true;
      base.setActive(1);
      return true;
    },
    removeRecord() {
      if (!hasRecord) return false;
      hasRecord = false;
      base.setActive(0);
      return true;
    },
    reset(avoidPositions = []) {
      if (carrier === "player") base.toggleCarry(camera, getHeightAt);
      carrier = "ground";
      hasRecord = false;
      base.setActive(0);
      chooseRandomPosition(initial, avoidPositions);
      placeAt(initial.x, initial.z);
    },
    update(time, delta, bunnyPosition, bunnyYaw) {
      base.update(time, delta, {
        speed: carrier === "rabbit" || carrier === "player" ? 8 : 0,
        position: bunnyPosition,
      });
      if (carrier !== "rabbit") return;

      carryOffset.set(-0.72, 0.72, -0.18).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        bunnyYaw,
      );
      base.root.position.copy(bunnyPosition).add(carryOffset);
      base.root.rotation.set(0.16, bunnyYaw + Math.PI * 0.55, -0.12);
      base.root.position.y += Math.sin(time * 8.5) * 0.045;
      base.root.updateMatrixWorld(true);
    },
    dispose() {
      base.root.removeFromParent();
      base.root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
    },
  };
}
