import * as THREE from "three";

export interface PromptLine {
  key: string;
  label: string;
}

export interface Interactable {
  position(target: THREE.Vector3): THREE.Vector3;
  /** Erişim mesafesine eklenen yarıçap (büyük nesneler için). */
  radius: number;
  /** Uzaktan bakarak etkileşim (ör. gemiyi ateşe vermek): verilirse erişim bu mesafedir. */
  reach?: number;
  /** true: bakış yönü aranmaz; erişim içindeyken her zaman seçilebilir (ör. üstünde durulan işaret). */
  always?: boolean;
  /** null: şu an etkileşime kapalı. */
  prompt(): PromptLine[] | null;
  use(): void;
}

export interface Interaction {
  add(item: Interactable): void;
  remove(item: Interactable): void;
  readonly focused: Interactable | null;
  /** Bakılan nesneyi seçer ve istemini döndürür. */
  /** eye: uzaklık ölçülen nokta (üçüncü kişide karakterin gözü); yoksa kamera. */
  update(camera: THREE.Camera, eye?: THREE.Vector3): PromptLine[] | null;
  use(): boolean;
}

const REACH = 2.6;

export function createInteraction(): Interaction {
  const items = new Set<Interactable>();
  const forward = new THREE.Vector3();
  const toItem = new THREE.Vector3();
  const point = new THREE.Vector3();
  let focused: Interactable | null = null;

  return {
    add: (item) => void items.add(item),
    remove: (item) => void items.delete(item),
    get focused() {
      return focused;
    },
    update(camera, eye) {
      camera.getWorldDirection(forward);
      const origin = eye ?? camera.position;
      let best: Interactable | null = null;
      let bestScore = Infinity;
      let bestPrompt: PromptLine[] | null = null;
      for (const item of items) {
        const prompt = item.prompt();
        if (!prompt) continue;
        item.position(point);
        toItem.copy(point).sub(origin);
        const distance = toItem.length();
        // Nişan kameradan: karakterin arkasındaki kameranın gördüğü yön.
        if (eye) toItem.copy(point).sub(camera.position);
        if (distance > (item.reach ?? REACH) + item.radius) continue;
        const alignment = toItem.normalize().dot(forward);
        // Uzak hedefte nişan, nesnenin görünen boyutuna göre; yakındaki büyük nesnelerde geniş açı.
        const minAlignment = item.reach
          ? Math.cos(Math.max(0.035, Math.atan2(item.radius, distance)))
          : distance < 1.2 ? 0.55 : 0.82 - Math.min(0.2, item.radius * 0.2);
        if (!item.always && alignment < minAlignment) continue;
        // "always" öğeleri, bakılan bir nesne varsa ona öncelik verir.
        const score = item.always ? 50 + distance : distance * (1.6 - alignment);
        if (score < bestScore) {
          bestScore = score;
          best = item;
          bestPrompt = prompt;
        }
      }
      focused = best;
      return bestPrompt;
    },
    use() {
      if (!focused) return false;
      focused.use();
      return true;
    },
  };
}
