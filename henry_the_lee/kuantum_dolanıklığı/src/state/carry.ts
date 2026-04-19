/**
 * Taşıma durumu — oyuncunun elinde ne tutuyor olduğunu izler.
 *
 * Sade state machine; UI ve fizik tarafı buraya bakıp davranır:
 *  - "none"       → eli boş; E ile yakındaki vinyl/gramofon/kediyi alabilir.
 *  - "vinyl"      → plak elinde; Q ile bırakır, gramofona yakınken E ile
 *                   plağı tablaya yerleştirir (`vinylOnPlatter`).
 *  - "gramophone" → gramofon elinde (oyuncu önünde sürüklenir); Q ile bırakır.
 *  - "cat"        → kedi kucakta (Şrödinger süperpozisyonu kucaklandı).
 *                   Q ile yere indirilir; kedi aktif iken kaçma fiziği durur.
 *
 * `vinylOnPlatter`: plak gramofonun döner tablasına oturmuşsa true. Bu
 *  durumda plak fizik (kaçma) durur; tabla ile birlikte döner.
 */

export type CarryHolding = "none" | "vinyl" | "gramophone" | "cat";

export interface CarryState {
  holding: CarryHolding;
  vinylOnPlatter: boolean;
}

export function createCarryState(): CarryState {
  return { holding: "none", vinylOnPlatter: false };
}
