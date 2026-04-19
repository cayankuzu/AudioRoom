/**
 * Redd — "Mükemmel Boşluk" albümü için CANONICAL parça sırası.
 *
 * Buradaki `order` değeri albümün gerçek sırasıdır; UI de playback de
 * yalnızca bu sırayı kullanır. YouTube playlist'i farklı bir sırada
 * dönerse, `resolvePlaylistMapping` fonksiyonu başlık eşlemesi ile
 * canonical sırayı YouTube playlist index'ine çevirir.
 */

export interface CanonicalTrack {
  /** Stabil id — UI referansı için. */
  id: string;
  /** 1-temelli albüm sırası (UI'da `order` formatında). */
  order: number;
  /** Albüm üzerindeki gerçek parça adı. */
  title: string;
  /** Fuzzy-match için ek anahtar kelimeler (opsiyonel). */
  matchHints?: readonly string[];
}

export const CANONICAL_TRACKS: readonly CanonicalTrack[] = [
  { id: "kalpsiz-romantik", order: 1, title: "Kalpsiz Romantik" },
  { id: "kaniyorduk", order: 2, title: "Kanıyorduk", matchHints: ["kaniyorduk"] },
  { id: "ask-virus", order: 3, title: "Aşk, Virüs", matchHints: ["ask virus"] },
  {
    id: "onlar-bile-uzulurler",
    order: 4,
    title: "Onlar Bile Üzülürler",
    matchHints: ["onlar bile uzulurler"],
  },
  {
    id: "bugun-herkes-olsun-istedim",
    order: 5,
    title: "Bugün Herkes Ölsün İstedim",
    matchHints: ["bugun herkes olsun istedim"],
  },
  {
    id: "senden-vazgeceli-cok-oldu",
    order: 6,
    title: "Senden Vazgeçeli Çok Oldu",
    matchHints: ["senden vazgeceli cok oldu"],
  },
  { id: "kafakafka", order: 7, title: "Kafakafka", matchHints: ["kafa kafka"] },
  { id: "tam-bi-delilik", order: 8, title: "Tam Bi Delilik", matchHints: ["tam bir delilik"] },
  { id: "sextronot", order: 9, title: "Sextronot" },
  { id: "itiraf", order: 10, title: "İtiraf", matchHints: ["itiraf"] },
  { id: "boslukta-dans", order: 11, title: "Boşlukta Dans", matchHints: ["boslukta dans"] },
  {
    id: "hala-seni-cok-ozluyorum",
    order: 12,
    title: "Hala Seni Çok Özlüyorum",
    matchHints: ["hala seni cok ozluyorum", "hâlâ seni çok özlüyorum"],
  },
] as const;

/**
 * Türkçe karakterleri latin'e indirger, boşluk ve noktalama dışında her şeyi
 * temizler, küçük harfe çevirir. Fuzzy match için stabil bir anahtar üretir.
 */
export function normalizeTitle(raw: string): string {
  return raw
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .replace(/î/g, "i")
    .replace(/û/g, "u")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    /** Yaygın YouTube ekleri — eşleşmeyi bozmasın. */
    .replace(
      /\b(official|resmi|klip|video|audio|lyric|lyric video|music video|ses|ses ve klip)\b/g,
      " ",
    )
    .replace(/\bredd\b/g, " ")
    .replace(/\bm[uü]kemmel bo[sş]luk\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * YouTube playlist'inin döndürdüğü başlıkları canonical albüm sırasına map'ler.
 * Girdi: YouTube playlist index'ine karşılık gelen ham başlıklar (boş olabilir).
 * Çıktı: `ytIndexForCanonicalOrder[canonicalOrder - 1] = ytPlaylistIndex | -1`.
 *
 * Eşleşmeyen varsa `-1` yazılır; arama önce tam anahtar, sonra karşılıklı
 * substring eşleşmesine bakar. Aynı YouTube index'i birden fazla canonical
 * track'e atanmaz.
 */
export function resolvePlaylistMapping(rawTitles: readonly string[]): number[] {
  const n = CANONICAL_TRACKS.length;
  const ytKeys = rawTitles.map((t) => (t ? normalizeTitle(t) : ""));
  const used = new Array<boolean>(rawTitles.length).fill(false);
  const mapping = new Array<number>(n).fill(-1);

  const canonicalKeys = CANONICAL_TRACKS.map((ct) => {
    const keys = [normalizeTitle(ct.title)];
    if (ct.matchHints) {
      for (const h of ct.matchHints) keys.push(normalizeTitle(h));
    }
    return keys.filter((k) => k.length > 0);
  });

  /** Önce birebir tam eşleşme. */
  for (let i = 0; i < n; i += 1) {
    const keys = canonicalKeys[i];
    for (let j = 0; j < ytKeys.length; j += 1) {
      if (used[j]) continue;
      if (ytKeys[j].length === 0) continue;
      if (keys.includes(ytKeys[j])) {
        mapping[i] = j;
        used[j] = true;
        break;
      }
    }
  }

  /** Sonra karşılıklı substring eşleşmesi — YT başlığı sanatçı/ekler içerebilir. */
  for (let i = 0; i < n; i += 1) {
    if (mapping[i] !== -1) continue;
    const keys = canonicalKeys[i];
    let best = -1;
    let bestScore = 0;
    for (let j = 0; j < ytKeys.length; j += 1) {
      if (used[j]) continue;
      const yt = ytKeys[j];
      if (yt.length === 0) continue;
      for (const k of keys) {
        if (k.length === 0) continue;
        const contains = yt.includes(k) || k.includes(yt);
        if (!contains) continue;
        const score = Math.min(k.length, yt.length);
        if (score > bestScore) {
          bestScore = score;
          best = j;
        }
      }
    }
    if (best !== -1) {
      mapping[i] = best;
      used[best] = true;
    }
  }

  return mapping;
}

/**
 * Doldurulmamış canonical → yt map için fallback:
 * YouTube'un verdiği kalan index'leri sırayla atar.
 * Bu olmazsa mapping[-1] kalır ve o parça "hazır değil" gösterilir.
 */
export function fillUnmatched(mapping: number[], ytLength: number): number[] {
  const used = new Set<number>();
  for (const idx of mapping) if (idx >= 0) used.add(idx);
  const out = mapping.slice();
  let cursor = 0;
  for (let i = 0; i < out.length; i += 1) {
    if (out[i] !== -1) continue;
    while (cursor < ytLength && used.has(cursor)) cursor += 1;
    if (cursor >= ytLength) break;
    out[i] = cursor;
    used.add(cursor);
    cursor += 1;
  }
  return out;
}
