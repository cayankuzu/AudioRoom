import * as THREE from "three";

export interface InteractableDescriptor {
  kind: "vinyl" | "gramophone";
  vinylOrder?: number;
  promptKey: "E" | "Q";
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
  /**
   * R tuşu — yalnızca gramofon hedefteyken tetiklenir. Plak takılıysa
   * çalıyorsa durdurur, duraklatılmışsa devam ettirir.
   */
  onGramophoneR(): void;
  /**
   * Q tuşu — elde tutulan plağı / taşınan gramofonu bırakma.
   * Hedefe bakmaya gerek yok; her yerde çalışır. Elde bir şey yoksa
   * callback sessizce no-op yapar.
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
 *  3) E tuşu hedefe göre pickup/gramofon; Q tuşu hedef aranmadan
 *     elde/taşınanı bırakma callback'ini çağırır.
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
    } else if (e.code === "KeyR") {
      /**
       * R — yalnızca gramofon hedefteyken play/pause toggle. Hedef yoksa
       * sessizce görmezden gel (oynatma kontrolü global değil; oyuncu
       * gramofonun yanına gelmeli).
       */
      if (!current) return;
      if (current.descriptor.kind === "gramophone") {
        callbacks.onGramophoneR();
      }
    } else if (e.code === "KeyQ") {
      /**
       * Q — elde tutulan plağı ya da taşınan gramofonu bırak. Hedefe
       * bakmak gerekmez; her yerde çalışır. Elde hiçbir şey yoksa callback
       * sessizce no-op yapar.
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
