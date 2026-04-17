import { CANONICAL_TRACKS } from "../data/trackLibrary";

/**
 * Plak envanteri.
 *
 * Semantik (yeni):
 *  - `carriedOrder`  — oyuncunun ELİNDE TUTTUĞU plak (0 = yok). En fazla 1 plak
 *                      elde taşınır. Başkasını almaya yeltenince, ilk önce
 *                      mevcut eldeki bırakılır.
 *  - `collected`     — oyuncu tarafından GRAMOFONA YERLEŞTİRİLMİŞ plaklar. Plak
 *                      elden gramofona gidene kadar bu sete EKLENMEZ. Panel/
 *                      YouTube listesi yalnızca bu seti okur; oyuncu bir plağı
 *                      elinde taşırken henüz listede gözükmez.
 *  - `activeOrder`   — gramofonda ŞU AN yüklü plak (0 = yok). Bir plak gramofona
 *                      takıldığı an hem `activeOrder` olur hem de `collected`
 *                      setine eklenir (ilk kez takılıyorsa).
 *
 * Event-emitter pattern'iyle UI/panel dış dünyayla senkronize edilir.
 */
export interface InventoryState {
  /** Gramofona TAKILMIŞ (keşfedilmiş) plakların 1-temelli order seti. */
  readonly collected: ReadonlySet<number>;
  /** Gramofonda şu an yüklü plağın order'ı; 0 = takılı plak yok. */
  readonly activeOrder: number;
  /** Oyuncunun elinde tuttuğu plağın order'ı; 0 = el boş. */
  readonly carriedOrder: number;

  /** Gramofona takılmış mı? (Panel listesinde görünme kriteri) */
  has(order: number): boolean;
  /** Elde mi? */
  isCarrying(order: number): boolean;

  /**
   * Dünyadan bir plağı ELE al.
   * Dönen değer: elde önceden tutulan plak (0 = el boştu). Caller bu değeri
   * görünce eldeki eski plağı dünyaya düşürmeli (vinylSystem.dropAt).
   */
  pickUp(order: number): number;

  /**
   * Eldeki plağı bırak. Dönen değer: bırakılan order (0 = el zaten boştu).
   */
  dropCarry(): number;

  /**
   * Eldeki plağı GRAMOFONA yerleştir.
   *  - `collected` setine yeni gelen plağın order'ı eklenir ve KALICI olarak
   *    kalır (plak gramofondan düşse bile listede görünmeye devam eder).
   *  - `activeOrder` yeni gelene set edilir; eski aktif (varsa) koleksiyonda
   *    KALIR — oyuncu panelden tekrar seçip çalabilir.
   *  - El (`carriedOrder`) boşalır; eski plak ele geri DÖNMEZ.
   *
   * Elde plak yoksa bu fonksiyon hiç bir şey yapmaz ve `null` döner.
   * Dönen `previousActive`: gramofonda daha önce aktif olan plağın order'ı
   * (yoksa 0) — yalnızca bilgilendirme amaçlı, caller'ın hareket alması gerekmez.
   */
  placeCarriedOnGramophone(): { placed: number; previousActive: number } | null;

  /**
   * Gramofondaki plağı elden AL — plak gramofonu terk eder, ele geçer.
   * Zaten elde plak varsa, önce onu `dropCarry` ile bırakmak caller'ın işi.
   */
  takeActiveToHand(): number;

  /** Gramofon'daki aktif order'ı değiştir (müzik paneli için — collected kontrolü dışı). */
  setActive(order: number): void;

  /** Albüm tamamlandı mı? (12/12) */
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
      /**
       * Plak gramofona BİRİKİR — eski plak koleksiyondan (`collected`)
       * çıkmaz; sadece aktif plak yenisiyle değişir. Böylece oyuncu
       * istediği kadar plak ekleyebilir; hepsi panel listesinde kalır.
       * Eski plak ELE dönmez; el boşalır. Oyuncu başka bir plağı yerden
       * alıp tekrar gelip ekleyebilir.
       */
      collected.add(placed);
      activeOrder = placed;
      carriedOrder = 0;
      emit();
      return { placed, previousActive };
    },
    takeActiveToHand() {
      if (activeOrder === 0) return 0;
      if (carriedOrder !== 0) return 0; /* El dolu — caller önce dropCarry çağırmalı. */
      const taken = activeOrder;
      carriedOrder = taken;
      activeOrder = 0;
      emit();
      return taken;
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
