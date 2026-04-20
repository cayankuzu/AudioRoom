/**
 * Hayko Cepkin — "Beni Büyüten Şarkılar Vol.1" canonical parça listesi.
 *
 * Bu albüm Hayko Cepkin'in büyürken dinlediği Türk rock klasiklerinin
 * cover'larından oluşur. UI'da gösterilen başlıklar runtime'da YouTube
 * playlist'inden (oEmbed) hidrate edilir; aşağıdaki canonical başlıklar
 * yalnızca fuzzy match için referans olarak kullanılır. Eşleşme bulunmazsa
 * `fillUnmatched` ile kalan canonical slot'lara YouTube playlist'inin
 * sıradaki indeksleri sıralı şekilde atanır — böylece her plak (1..9)
 * her zaman bir ses kaynağına bağlanır.
 */

export interface CanonicalTrack {
  id: string;
  /** 1-temelli albüm sırası (UI'da `order` formatında). */
  order: number;
  /** Albüm üzerindeki referans parça adı; YouTube'dan hidrate olunca güncellenir. */
  title: string;
  /** Fuzzy-match için ek anahtar kelimeler. */
  matchHints?: readonly string[];
}

/**
 * Canonical liste — 9 slot (Beni Büyüten Şarkılar Vol.1, 2016).
 * Hayko Cepkin'in çocukluğunda dinleyip büyürken etkilendiği Türk
 * klasiklerinin yeniden yorumları.
 *
 * Kaynak: Hayko Cepkin · Beni Büyüten Şarkılar Vol.1 (Ada Müzik · 2016)
 */
export const CANONICAL_TRACKS: readonly CanonicalTrack[] = [
  {
    id: "t01",
    order: 1,
    title: "Ben İnsan Değil Miyim",
    matchHints: ["ben insan degil miyim", "ibrahim tatlises"],
  },
  {
    id: "t02",
    order: 2,
    title: "Aldırma Gönül",
    matchHints: ["aldirma gonul", "edip akbayram"],
  },
  {
    id: "t03",
    order: 3,
    title: "O Çeşme",
    matchHints: ["o cesme", "zeki muren"],
  },
  {
    id: "t04",
    order: 4,
    title: "İtirazım Var",
    matchHints: ["itirazim var", "bulent ersoy"],
  },
  {
    id: "t05",
    order: 5,
    title: "Ağla Sevdam",
    matchHints: ["agla sevdam", "agir roman"],
  },
  {
    id: "t06",
    order: 6,
    title: "Neydi Günahım",
    matchHints: ["neydi gunahim", "sebahat akkiraz"],
  },
  {
    id: "t07",
    order: 7,
    title: "Yuh Yuh",
    matchHints: ["yuh yuh", "selda bagcan"],
  },
  {
    id: "t08",
    order: 8,
    title: "Nem Kaldı",
    matchHints: ["nem kaldi", "cem karaca"],
  },
  {
    id: "t09",
    order: 9,
    title: "Issızlığın Ortasında",
    matchHints: ["issizligin ortasinda", "mogollar"],
  },
] as const;

/** Türkçe normalizasyon — fuzzy match için stabil anahtar üretir. */
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
    .replace(
      /\b(official|resmi|klip|video|audio|lyric|lyric video|music video|ses|cover|akustik)\b/g,
      " ",
    )
    .replace(/\bhayko\s*cepkin\b/g, " ")
    .replace(/\bbeni\s*buyuten\s*sarkilar\b/g, " ")
    .replace(/\bvol\.?\s*\d+\b/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
 * Eşleşmeyen canonical slot'lara YouTube playlist'inin kalan
 * indekslerini sıralı şekilde atar. Hayko BBS Vol.1 için canonical
 * başlıklar sadece referans olduğundan, fuzzy match çoğu zaman zayıf
 * kalır; bu fallback sayesinde her plak çalınabilir bir ses kaynağına
 * bağlanır ve UI'da YouTube'un verdiği gerçek başlık gösterilir.
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
