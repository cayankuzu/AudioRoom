import { assetUrl } from "../core/assets";

/**
 * Senkron şarkı sözleri (isteğe bağlı). Proje hiçbir söz metni içermez: sözlerin
 * görüntülenme hakkı (yayıncı ya da lisanslı bir söz sağlayıcısı) sende olmalıdır.
 * `public/lyrics/<parça-kimliği>.lrc` dosyası varsa satırlar şarkının saniyesine göre
 * sol altta gösterilir; yoksa yalnızca hikâye satırları görünür.
 */
export interface LyricLine {
  at: number;
  text: string;
}

const cache = new Map<string, Promise<LyricLine[] | null>>();

/** LRC ayrıştırma: "[dd:ss.xx] satır" (bir satırda birden çok zaman etiketi olabilir). */
export function parseLrc(source: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const stamp of stamps) lines.push({ at: Number(stamp[1]) * 60 + Number(stamp[2]), text });
  }
  return lines.sort((a, b) => a.at - b.at);
}

export function loadLyrics(trackId: string): Promise<LyricLine[] | null> {
  let pending = cache.get(trackId);
  if (!pending) {
    pending = fetch(assetUrl(`lyrics/${trackId}.lrc`))
      .then((response) => (response.ok ? response.text() : null))
      .then((text) => {
        const lines = text ? parseLrc(text) : [];
        return lines.length ? lines : null;
      })
      .catch(() => null);
    cache.set(trackId, pending);
  }
  return pending;
}

/** Verilen saniyede ekranda olması gereken satır (henüz yoksa ya da boş satırsa ""). */
export function lyricAt(lines: readonly LyricLine[], time: number): string {
  let text = "";
  for (const line of lines) {
    if (line.at > time) break;
    text = line.text;
  }
  return text;
}
