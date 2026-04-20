import * as THREE from "three";

export interface InteractableDescriptor {
  kind: "vinyl" | "gramophone";
  vinylOrder?: number;
  promptKey: "E" | "Q" | "R";
  promptText: string;
}

export interface InteractionTarget {
  object: THREE.Object3D;
  descriptor: InteractableDescriptor;
  distance: number;
}

export interface InteractionCallbacks {
  onCollectVinyl(order: number): void;
  onGramophoneE(): void;
  onGramophoneR(): void;
  onDropCarried(): void;
}

export interface InteractionSystem {
  setTargets(objects: THREE.Object3D[]): void;
  update(camera: THREE.PerspectiveCamera): InteractionTarget | null;
  dispose(): void;
}

/**
 * Oyuncunun baktığı yöne göre yakın interaktif objeyi bulur:
 *  - E → vinyl pickup veya gramofon E aksiyonu
 *  - R → gramofon play/pause toggle (yalnızca gramofon hedefteyken)
 *  - Q → eldeki/taşınanı bırakma (her yerde)
 */
export function createInteractionSystem(
  callbacks: InteractionCallbacks,
  opts: { maxRange?: number; coneDot?: number } = {},
): InteractionSystem {
  const maxRange = opts.maxRange ?? 3.4;
  const coneDot = opts.coneDot ?? 0.55;

  let targets: THREE.Object3D[] = [];
  let current: InteractionTarget | null = null;

  const camPos = new THREE.Vector3();
  const camForward = new THREE.Vector3();
  const toObj = new THREE.Vector3();
  const objWorld = new THREE.Vector3();

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.code === "KeyE") {
      if (!current) return;
      const d = current.descriptor;
      if (d.kind === "vinyl" && d.vinylOrder !== undefined) {
        callbacks.onCollectVinyl(d.vinylOrder);
      } else if (d.kind === "gramophone") {
        callbacks.onGramophoneE();
      }
    } else if (e.code === "KeyR") {
      if (!current) return;
      if (current.descriptor.kind === "gramophone") {
        callbacks.onGramophoneR();
      }
    } else if (e.code === "KeyQ") {
      callbacks.onDropCarried();
    }
  };
  document.addEventListener("keydown", onKeyDown);

  return {
    setTargets(objs) {
      targets = objs;
    },
    update(camera) {
      camera.getWorldPosition(camPos);
      camera.getWorldDirection(camForward);

      let best: InteractionTarget | null = null;
      let bestDist = maxRange;

      for (const obj of targets) {
        const ud = obj.userData as { interactable?: InteractableDescriptor };
        const desc = ud.interactable;
        if (!desc) continue;
        if (obj.visible === false) continue;

        obj.getWorldPosition(objWorld);
        toObj.copy(objWorld).sub(camPos);
        const dist = toObj.length();
        if (dist > maxRange) continue;
        toObj.normalize();
        if (toObj.dot(camForward) < coneDot) continue;

        if (dist < bestDist) {
          bestDist = dist;
          best = { object: obj, descriptor: desc, distance: dist };
        }
      }

      current = best;
      return best;
    },
    dispose() {
      document.removeEventListener("keydown", onKeyDown);
    },
  };
}
