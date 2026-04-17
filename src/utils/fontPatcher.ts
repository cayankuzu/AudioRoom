import type { Font } from "three/examples/jsm/loaders/FontLoader.js";

/**
 * three/examples/fonts/gentilis_regular.typeface.json Türkçe karakterlerin
 * neredeyse tamamını içeriyor — `Ş` ve `ş` haricinde. Bu yardımcı bu iki
 * harfi çalışma zamanında S/s glyph'i üzerine bir cedilla konturu ekleyerek
 * sentezler. TextGeometry hiç çökmez, "Ş" yerine "?" render etmez.
 *
 * NOT: Cedilla burada ince bir kanca formunda çizilir; ekran kapağında okunur
 * fakat tipografi-sanatı değildir. Monümental başlık okunurluğunu garanti eder.
 */

interface TypefaceGlyph {
  x_min: number;
  x_max: number;
  ha: number;
  o: string;
  _cachedOutline?: string[];
}

/**
 * Tek başına kapalı cedilla konturu. Taban harf koordinat sisteminde,
 * y=0 altına asılır (yaklaşık x: 285..400, y: -30..-245).
 * 10 noktalı kapalı poligon — Ç/ç glyph'leriyle uyumlu görsel ağırlık.
 */
const CEDILLA_STAMP = [
  "m",
  "340",
  "-40",
  "l",
  "370",
  "-75",
  "l",
  "365",
  "-135",
  "l",
  "385",
  "-175",
  "l",
  "355",
  "-235",
  "l",
  "300",
  "-215",
  "l",
  "300",
  "-165",
  "l",
  "335",
  "-135",
  "l",
  "315",
  "-75",
  "l",
  "340",
  "-40",
].join(" ");

const CEDILLA_SMALL = [
  "m",
  "305",
  "-40",
  "l",
  "330",
  "-70",
  "l",
  "325",
  "-125",
  "l",
  "345",
  "-165",
  "l",
  "320",
  "-220",
  "l",
  "275",
  "-200",
  "l",
  "275",
  "-155",
  "l",
  "300",
  "-130",
  "l",
  "285",
  "-75",
  "l",
  "305",
  "-40",
].join(" ");

/**
 * Mevcut glyph'e cedilla damgasını ekleyip yeni bir glyph döndürür.
 * X eksenini hedef harf merkezine göre kaydırır, Y'ye dokunmaz.
 */
function composeWithCedilla(
  base: TypefaceGlyph,
  stamp: string,
  centerShiftX: number,
): TypefaceGlyph {
  let shifted = stamp;
  if (centerShiftX !== 0) {
    shifted = shiftPathX(stamp, centerShiftX);
  }
  return {
    x_min: base.x_min,
    x_max: base.x_max,
    ha: base.ha,
    o: `${base.o} ${shifted}`,
  };
}

/**
 * Path string'indeki tüm X koordinatlarını dx kadar öteler. Parser şu
 * komutları tanır: `m` (1 nokta), `l` (1 nokta), `q` (2 nokta = kontrol + hedef).
 * `b` (cubic Bezier, 3 nokta) güvenlik için desteklenir ancak cedilla
 * damgasında kullanılmaz.
 */
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

/**
 * Fontun `glyphs` koleksiyonuna `Ş` ve `ş` yoksa ekler. Mevcut harfleri
 * bozmaz; sadece cedilla parçasını üst üste bindirir.
 */
export function patchTurkishGlyphs(font: Font): void {
  const g = font.data.glyphs as Record<string, TypefaceGlyph>;

  if (!g["Ş"] && g["S"] && g["S"].o) {
    const S = g["S"];
    /** S merkezi = (x_min+x_max)/2. Cedilla damgasının merkezi ~340. */
    const sCenter = (S.x_min + S.x_max) * 0.5;
    g["Ş"] = composeWithCedilla(S, CEDILLA_STAMP, sCenter - 340);
  }
  if (!g["ş"] && g["s"] && g["s"].o) {
    const s = g["s"];
    const sCenter = (s.x_min + s.x_max) * 0.5;
    g["ş"] = composeWithCedilla(s, CEDILLA_SMALL, sCenter - 310);
  }
}
