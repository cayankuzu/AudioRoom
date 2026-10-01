/** Arayüzün koyu zemini (tokens.css --ar-bg). */
const BACKGROUND = "#070708";

function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG kontrast oranı (1–21). */
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(channels(a)), luminance(channels(b))].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

const toHex = (rgb: number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;

/** Hedef oran 4.5:1'in biraz üstünde: yarı saydam paneller zemini hafifçe açar. */
const TEXT_RATIO = 5;

/** Koyu zeminde küçük metin olarak kullanılan vurgu: yeterince okunana dek beyaza karıştırılır. */
export function readableAccent(accent: string, background = BACKGROUND): string {
  const base = channels(accent);
  for (let t = 0; t <= 1; t += 0.05) {
    const mixed = toHex(base.map((c) => c + (255 - c) * t));
    if (contrast(mixed, background) >= TEXT_RATIO) return mixed;
  }
  return "#ffffff";
}

/**
 * Vurgu zeminli buton: önce albümün mürekkebi, sonra beyaz/siyah denenir.
 * Orta tonlu vurgularda hiçbiri yetmezse zemin, açık yazı okunana dek koyulaştırılır.
 */
export function readableFill(accent: string, ink: string): { fill: string; ink: string } {
  for (const candidate of [ink, "#ffffff", "#0b0b0c"]) {
    if (contrast(accent, candidate) >= TEXT_RATIO) return { fill: accent, ink: candidate };
  }
  const light = luminance(channels(ink)) > 0.5 ? ink : "#ffffff";
  const base = channels(accent);
  for (let t = 0.05; t <= 1; t += 0.05) {
    const fill = toHex(base.map((c) => c * (1 - t)));
    if (contrast(fill, light) >= TEXT_RATIO) return { fill, ink: light };
  }
  return { fill: "#000000", ink: "#ffffff" };
}

/** Vurgu değişkenlerini (--<önek>accent, -fill, -ink, -text) yazar; hub ve evrenler aynı kuralı kullanır. */
export function setAccentVars(target: HTMLElement, prefix: string, accent: string, ink: string): void {
  const button = readableFill(accent, ink);
  target.style.setProperty(`--${prefix}accent`, accent);
  target.style.setProperty(`--${prefix}accent-fill`, button.fill);
  target.style.setProperty(`--${prefix}accent-ink`, button.ink);
  target.style.setProperty(`--${prefix}accent-text`, readableAccent(accent));
}
