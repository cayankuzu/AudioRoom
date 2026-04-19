import * as THREE from "three";
import { CANONICAL_TRACKS } from "../data/trackLibrary";
import { createVinyl } from "./vinyl";

/**
 * CARRY SYSTEM — oyuncunun elinde tuttuğu plağın görseli.
 *
 * Kameraya bağlı bir "handSlot" group; plak ele alındığında içine o plağın
 * 3D modeli yerleştirilir, bırakıldığında temizlenir.
 *
 * Davranış:
 *  - Plak elde tutulurken kameranın sağ-alt köşesinde hafif eğik durur.
 *  - Hareket sırasında çok subtle bir bob + sway uygulanır (jittersiz).
 *  - Glow / halo yoktur — elde olduğu için "bulunabilir" işareti artık lüzumsuz.
 */
export interface CarrySystem {
  /** Kameraya bağlı kök group — dışarıdan eklenmesine gerek yok. */
  root: THREE.Group;
  /** Elde olan plağın order'ı; 0 = boş. */
  currentOrder: number;
  /** Plağı ele al — yeni mesh oluşturup handSlot'a koy. */
  setCarried(order: number): void;
  /** Eli boşalt. */
  clear(): void;
  /** Her frame: hafif bob + sway. */
  update(time: number, pose: { speed: number }): void;
  dispose(): void;
}

export interface CarrySystemOptions {
  /** Kamera — handSlot kameraya `add` edilir. */
  camera: THREE.Camera;
}

export function createCarrySystem(opts: CarrySystemOptions): CarrySystem {
  const root = new THREE.Group();
  root.name = "carrySystem";

  /** Kameranın sağ-alt köşesinde, oyuncuya yakın bir "el" pozisyonu. */
  const basePosition = new THREE.Vector3(0.32, -0.38, -0.62);
  const baseEuler = new THREE.Euler(-0.52, -0.22, 0.14);

  root.position.copy(basePosition);
  root.rotation.copy(baseEuler);
  /** Elde biraz daha küçük dursun — FOV'a uyumlu. */
  root.scale.setScalar(0.78);

  opts.camera.add(root);

  /** İçinde yalnızca aktif plağın mesh'i bulunur (en fazla 1 child). */
  const slot = new THREE.Group();
  slot.name = "handSlot";
  root.add(slot);

  /** Mevcut vinyl mesh'ini ağaçtan temizle + dispose. */
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
      /** Plağı ele DÜZ gelecek şekilde çevir — disk Y eksenine diziliydi; oyuncuya düz göstermek için X'e yatırıyoruz. */
      vinyl.rotation.x = Math.PI / 2;
      vinyl.rotation.z = 0.08;
      /** Halo'yu elde taşıma modunda gizle — glowing vinyl'le yürümek rahatsız edici. */
      const halo = vinyl.getObjectByName("vinyl-halo");
      if (halo) halo.visible = false;
      /** userData interactable'ı temizle — elde hit-test'e girmemeli. */
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
      /**
       * Çok hafif el sallantısı — aynı gramofon taşıma hissiyle tutarlı, ama
       * daha küçük genlikte çünkü bu sadece bir plak.
       */
      const speed = Math.min(pose.speed, 10);
      const bobAmp = 0.006 + speed * 0.0018;
      const sway = Math.sin(time * 5.6) * bobAmp;
      const lift = Math.abs(Math.sin(time * 11.2)) * bobAmp * 0.55;
      root.position.x = basePosition.x + sway * 0.4;
      root.position.y = basePosition.y + lift;
      root.position.z = basePosition.z + sway * 0.12;
      /** Plak kendi ekseninde çok yavaş dönsün — "elde oynatıyor" hissi. */
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
