import * as THREE from "three";

export interface InteractableDescriptor {
  kind: "vinyl" | "gramophone";
  vinylOrder?: number;
  promptKey: "E" | "Y";
  promptText: string;
}

export interface InteractionTarget {
  object: THREE.Object3D;
  descriptor: InteractableDescriptor;
  /** Oyuncuya mesafe (metre). */
  distance: number;
}

export interface InteractionCallbacks {
  onCollectVinyl(order: number): void;
  onGramophoneE(): void;
  onGramophoneY(): void;
  /**
   * G tuşu — elde tutulan plağı bırakma. Hedefe bakmak gerekmez; oyuncu
   * taşıdığı plağı dünyaya (önünde-ayağında) düşürmek ister.
   */
  onDropCarried(): void;
}

export interface InteractionSystem {
  /** Aday objeleri her frame taramak için ekle. */
  setTargets(objects: THREE.Object3D[]): void;
  /** Her frame çağır — mevcut hedefi bulur. */
  update(camera: THREE.PerspectiveCamera): InteractionTarget | null;
  dispose(): void;
}

/**
 * Oyuncunun baktığı yöne göre yakın interaktif objeyi bulur:
 *  1) Önce kamera önünde koni (forward vektör) içindeki objeleri filtreler
 *     (dot > 0.55 ≈ ±56°'lik koni).
 *  2) Sonra koni içindeki en yakın objeyi döner (maxRange içinde).
 *  3) E ve Y tuşları için key-binding dinler; basıldığında hedef
 *     descriptor'una göre callback çağırır.
 */
export function createInteractionSystem(
  callbacks: InteractionCallbacks,
  opts: { maxRange?: number; coneDot?: number } = {},
): InteractionSystem {
  const maxRange = opts.maxRange ?? 3.2;
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
    } else if (e.code === "KeyY") {
      /**
       * Y her durumda gramofon toggle — hedefe bakmasa bile taşıyorsa
       * bırakabilmeli. Aksi halde "taşıyorsam hiçbir şeye bakmıyorum"
       * durumunda kilitleniriz.
       */
      callbacks.onGramophoneY();
    } else if (e.code === "KeyG") {
      /**
       * G — elde tutulan plağı bırak. Hedefe bakma zorunluluğu yok;
       * her yerde çalışır. Elde plak yoksa callback sessizce no-op yapar.
       */
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
        /** userData.interactable kontrolü — görünmez veya kaldırılmışları atla. */
        const ud = obj.userData as { interactable?: InteractableDescriptor };
        const desc = ud.interactable;
        if (!desc) continue;
        /** Gizlenmiş plakları dışarıda tut. */
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
