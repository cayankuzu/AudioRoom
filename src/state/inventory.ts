import { CANONICAL_TRACKS } from "../data/trackLibrary";

/**
 * Plak envanteri — hangi canonical parçaların plağı toplandı?
 * `order` 1-temelli canonical index'tir (CANONICAL_TRACKS ile birebir).
 *
 * `activeOrder` — gramofona TAKILI olan plak (0 = takılı hiçbir plak yok).
 *
 * State event-emitter pattern'iyle UI/panel ile senkronize edilir.
 */
export interface InventoryState {
  /** 1-temelli order seti. */
  readonly collected: ReadonlySet<number>;
  /** Gramofonda şu an çalan plağın order'ı; 0 = takılı plak yok. */
  readonly activeOrder: number;
  has(order: number): boolean;
  add(order: number): boolean;
  remove(order: number): boolean;
  setActive(order: number): void;
  /** Albüm tamamlandı mı? (12/12) */
  isComplete(): boolean;
  onChange(listener: (snap: InventorySnapshot) => void): () => void;
}

export interface InventorySnapshot {
  collected: number[];
  activeOrder: number;
  total: number;
}

export function createInventory(): InventoryState {
  const collected = new Set<number>();
  let activeOrder = 0;
  const listeners = new Set<(snap: InventorySnapshot) => void>();

  function emit(): void {
    const snap: InventorySnapshot = {
      collected: Array.from(collected).sort((a, b) => a - b),
      activeOrder,
      total: CANONICAL_TRACKS.length,
    };
    listeners.forEach((fn) => fn(snap));
  }

  return {
    get collected() {
      return collected;
    },
    get activeOrder() {
      return activeOrder;
    },
    has(order) {
      return collected.has(order);
    },
    add(order) {
      if (collected.has(order)) return false;
      collected.add(order);
      emit();
      return true;
    },
    remove(order) {
      if (!collected.has(order)) return false;
      collected.delete(order);
      if (activeOrder === order) activeOrder = 0;
      emit();
      return true;
    },
    setActive(order) {
      if (order !== 0 && !collected.has(order)) return;
      if (activeOrder === order) return;
      activeOrder = order;
      emit();
    },
    isComplete() {
      return collected.size >= CANONICAL_TRACKS.length;
    },
    onChange(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
