import { CANONICAL_TRACKS } from "../data/trackLibrary";

/**
 * Plak envanteri.
 *
 * Semantik:
 *  - `carriedOrder`  — oyuncunun ELİNDE TUTTUĞU plak (0 = yok). En fazla
 *                      1 plak elde taşınır.
 *  - `collected`     — oyuncu tarafından GRAMOFONA YERLEŞTİRİLMİŞ plaklar.
 *                      Plak elden gramofona gidene kadar bu sete EKLENMEZ.
 *                      Panel/YouTube listesi yalnızca bu seti okur.
 *  - `activeOrder`   — gramofonda ŞU AN yüklü plak (0 = yok). Bir plak
 *                      gramofona takıldığı an hem `activeOrder` olur hem de
 *                      `collected` setine eklenir.
 */
export interface InventoryState {
  readonly collected: ReadonlySet<number>;
  readonly activeOrder: number;
  readonly carriedOrder: number;

  has(order: number): boolean;
  isCarrying(order: number): boolean;

  pickUp(order: number): number;
  dropCarry(): number;
  placeCarriedOnGramophone(): { placed: number; previousActive: number } | null;
  takeActiveToHand(): number;
  eject(order: number): { ejected: number; wasActive: boolean } | null;
  setActive(order: number): void;
  isComplete(): boolean;
  onChange(listener: (snap: InventorySnapshot) => void): () => void;
}

export interface InventorySnapshot {
  collected: number[];
  activeOrder: number;
  carriedOrder: number;
  total: number;
}

export function createInventory(): InventoryState {
  const collected = new Set<number>();
  let activeOrder = 0;
  let carriedOrder = 0;
  const listeners = new Set<(snap: InventorySnapshot) => void>();

  function emit(): void {
    const snap: InventorySnapshot = {
      collected: Array.from(collected).sort((a, b) => a - b),
      activeOrder,
      carriedOrder,
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
    get carriedOrder() {
      return carriedOrder;
    },
    has(order) {
      return collected.has(order);
    },
    isCarrying(order) {
      return order > 0 && carriedOrder === order;
    },
    pickUp(order) {
      if (order <= 0) return 0;
      if (carriedOrder === order) return 0;
      const dropped = carriedOrder;
      carriedOrder = order;
      emit();
      return dropped;
    },
    dropCarry() {
      if (carriedOrder === 0) return 0;
      const dropped = carriedOrder;
      carriedOrder = 0;
      emit();
      return dropped;
    },
    placeCarriedOnGramophone() {
      if (carriedOrder === 0) return null;
      const placed = carriedOrder;
      const previousActive = activeOrder;
      collected.add(placed);
      activeOrder = placed;
      carriedOrder = 0;
      emit();
      return { placed, previousActive };
    },
    takeActiveToHand() {
      if (activeOrder === 0) return 0;
      if (carriedOrder !== 0) return 0;
      const taken = activeOrder;
      carriedOrder = taken;
      activeOrder = 0;
      emit();
      return taken;
    },
    eject(order) {
      if (order <= 0) return null;
      if (!collected.has(order)) return null;
      const wasActive = activeOrder === order;
      collected.delete(order);
      if (wasActive) activeOrder = 0;
      emit();
      return { ejected: order, wasActive };
    },
    setActive(order) {
      if (activeOrder === order) return;
      if (order !== 0 && !collected.has(order)) return;
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
