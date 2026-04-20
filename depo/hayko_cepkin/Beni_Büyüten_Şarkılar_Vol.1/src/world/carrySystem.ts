import * as THREE from "three";
import { CANONICAL_TRACKS } from "../data/trackLibrary";
import { createVinyl } from "./vinyl";

/**
 * CARRY SYSTEM — oyuncunun elinde tuttuğu plağın görseli.
 * Kameraya bağlı handSlot. Plak ele alındığında içine o plağın 3D modeli
 * yerleştirilir, bırakıldığında temizlenir.
 */
export interface CarrySystem {
  root: THREE.Group;
  currentOrder: number;
  setCarried(order: number): void;
  clear(): void;
  update(time: number, pose: { speed: number }): void;
  dispose(): void;
}

export interface CarrySystemOptions {
  camera: THREE.Camera;
}

export function createCarrySystem(opts: CarrySystemOptions): CarrySystem {
  const root = new THREE.Group();
  root.name = "carrySystem";

  const basePosition = new THREE.Vector3(0.32, -0.38, -0.62);
  const baseEuler = new THREE.Euler(-0.52, -0.22, 0.14);

  root.position.copy(basePosition);
  root.rotation.copy(baseEuler);
  root.scale.setScalar(0.78);

  opts.camera.add(root);

  const slot = new THREE.Group();
  slot.name = "handSlot";
  root.add(slot);

  function clearSlot(): void {
    while (slot.children.length > 0) {
      const child = slot.children[0] as THREE.Object3D;
      slot.remove(child);
      disposeObject(child);
    }
  }

  const state = {
    currentOrder: 0,
  };

  return {
    root,
    get currentOrder() {
      return state.currentOrder;
    },
    setCarried(order) {
      if (state.currentOrder === order) return;
      clearSlot();
      state.currentOrder = order;
      if (order <= 0) return;
      const track = CANONICAL_TRACKS.find((t) => t.order === order);
      if (!track) return;
      const vinyl = createVinyl({ order, title: track.title });
      vinyl.rotation.x = Math.PI / 2;
      vinyl.rotation.z = 0.08;
      const halo = vinyl.getObjectByName("vinyl-halo");
      if (halo) halo.visible = false;
      vinyl.userData = {};
      slot.add(vinyl);
    },
    clear() {
      if (state.currentOrder === 0) return;
      clearSlot();
      state.currentOrder = 0;
    },
    update(time, pose) {
      if (state.currentOrder === 0) return;
      const speed = Math.min(pose.speed, 10);
      const bobAmp = 0.006 + speed * 0.0018;
      const sway = Math.sin(time * 5.6) * bobAmp;
      const lift = Math.abs(Math.sin(time * 11.2)) * bobAmp * 0.55;
      root.position.x = basePosition.x + sway * 0.4;
      root.position.y = basePosition.y + lift;
      root.position.z = basePosition.z + sway * 0.12;
      slot.rotation.y = time * 0.55;
    },
    dispose() {
      clearSlot();
      opts.camera.remove(root);
    },
  };
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.geometry?.dispose();
      const mat = mesh.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
}
