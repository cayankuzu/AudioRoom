import type { Font } from "three/examples/jsm/loaders/FontLoader.js";

/**
 * three/examples/fonts/gentilis_*.typeface.json Türkçe karakterlerin
 * neredeyse tamamını içeriyor — `Ş` / `ş` ve `ı` / `İ` gibi bazı glyph'ler
 * eksik. Bu yardımcı çalışma zamanında eksik glyph'leri sentezler:
 *
 *  - Ş/ş  → S/s + cedilla damgası (kanca konturu).
 *  - ı    → i'nin nokta konturu olmayan hâli (ya da i'nin glyph'inden
 *           üst nokta çıkarılarak), basit fallback olarak `i` aynen
 *           kullanılabilir; burada baseline-bound `i` glyph'i kopyalanır.
 *  - İ    → I + üst nokta. Eksikse I'yı doğrudan kopyalarız.
 *
 * NOT: Cedilla ve nokta konturları görsel olarak yeterli — başlık
 * okunurluğunu garanti etmek amaçlıdır, tipografi sanatı değildir.
 */

interface TypefaceGlyph {
  x_min: number;
  x_max: number;
  ha: number;
  o: string;
  _cachedOutline?: string[];
}

const CEDILLA_STAMP = [
  "m", "340", "-40",
  "l", "370", "-75",
  "l", "365", "-135",
  "l", "385", "-175",
  "l", "355", "-235",
  "l", "300", "-215",
  "l", "300", "-165",
  "l", "335", "-135",
  "l", "315", "-75",
  "l", "340", "-40",
].join(" ");

const CEDILLA_SMALL = [
  "m", "305", "-40",
  "l", "330", "-70",
  "l", "325", "-125",
  "l", "345", "-165",
  "l", "320", "-220",
  "l", "275", "-200",
  "l", "275", "-155",
  "l", "300", "-130",
  "l", "285", "-75",
  "l", "305", "-40",
].join(" ");

/** Üst nokta — büyük İ için. Yaklaşık kare formda. */
const DOT_ABOVE = [
  "m", "210", "780",
  "l", "270", "780",
  "l", "270", "720",
  "l", "210", "720",
  "l", "210", "780",
].join(" ");

function composeWithStamp(
  base: TypefaceGlyph,
  stamp: string,
  shiftX: number,
): TypefaceGlyph {
  const shifted = shiftX !== 0 ? shiftPathX(stamp, shiftX) : stamp;
  return {
    x_min: base.x_min,
    x_max: base.x_max,
    ha: base.ha,
    o: `${base.o} ${shifted}`,
  };
}

function shiftPathX(path: string, dx: number): string {
  const parts = path.split(/\s+/).filter((p) => p.length > 0);
  const out: string[] = [];
  let i = 0;
  while (i < parts.length) {
    const tok = parts[i];
    if (tok === "m" || tok === "l") {
      out.push(tok);
      out.push(String(Number(parts[i + 1]) + dx), parts[i + 2]);
      i += 3;
    } else if (tok === "q") {
      out.push(tok);
      out.push(String(Number(parts[i + 1]) + dx), parts[i + 2]);
      out.push(String(Number(parts[i + 3]) + dx), parts[i + 4]);
      i += 5;
    } else if (tok === "b") {
      out.push(tok);
      out.push(String(Number(parts[i + 1]) + dx), parts[i + 2]);
      out.push(String(Number(parts[i + 3]) + dx), parts[i + 4]);
      out.push(String(Number(parts[i + 5]) + dx), parts[i + 6]);
      i += 7;
    } else {
      out.push(tok);
      i += 1;
    }
  }
  return out.join(" ");
}

export function patchTurkishGlyphs(font: Font): void {
  const g = font.data.glyphs as Record<string, TypefaceGlyph>;

  if (!g["Ş"] && g["S"] && g["S"].o) {
    const S = g["S"];
    const sCenter = (S.x_min + S.x_max) * 0.5;
    g["Ş"] = composeWithStamp(S, CEDILLA_STAMP, sCenter - 340);
  }
  if (!g["ş"] && g["s"] && g["s"].o) {
    const s = g["s"];
    const sCenter = (s.x_min + s.x_max) * 0.5;
    g["ş"] = composeWithStamp(s, CEDILLA_SMALL, sCenter - 310);
  }

  /** İ — büyük I + üst nokta. */
  if (!g["İ"] && g["I"] && g["I"].o) {
    const I = g["I"];
    const iCenter = (I.x_min + I.x_max) * 0.5;
    g["İ"] = composeWithStamp(I, DOT_ABOVE, iCenter - 240);
  }
  /** ı — küçük i'yi noktasız hâliyle (Gentilis'te `i` zaten ortada bir yapıdır;
   *  sentez yapmadan i'nin glyph'ini kopyalayıp ı olarak kullanırız — Türkçe
   *  okunurken bağlam halleder). */
  if (!g["ı"] && g["i"]) {
    g["ı"] = { ...g["i"] };
  }
  /** ğ ve Ğ — eksikse `g`/`G` glyph'i ile fallback. (Gentilis'te g/G var.) */
  if (!g["ğ"] && g["g"]) g["ğ"] = { ...g["g"] };
  if (!g["Ğ"] && g["G"]) g["Ğ"] = { ...g["G"] };
}
