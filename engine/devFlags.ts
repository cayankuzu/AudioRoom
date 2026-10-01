/**
 * GEÇİCİ TEST KİPİ (sahip isteği, 29.09.2026): kısa film kliplerini denerken plak aramakla uğraşılmasın diye
 * bütün plaklar her evrende baştan gramofonun yanındaki kitaplıkta dizili gelir; Klostro'daki tavşan plak kapmaz.
 * İlerleme kaydı (dinlenen plaklar) değişmez. Eski hâline döndürmek için `ALL_RECORDS_SHELVED = false` yap.
 * Otomatik testler bu kipi `localStorage["audioroom.dev.shelveAll"] = "0"` ile kapatır.
 */
export const ALL_RECORDS_SHELVED = true;

export function allRecordsShelved(): boolean {
  if (!ALL_RECORDS_SHELVED) return false;
  try {
    return localStorage.getItem("audioroom.dev.shelveAll") !== "0";
  } catch {
    return true;
  }
}
