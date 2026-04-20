/**
 * Three.js Layer indeksleri — ışık/obje filtrelemesi için.
 * Default katman 0'dır; ek katmanlar `layers.enable(n)` ile açılır.
 *
 * - DEFAULT (0): tüm sahne
 * - TEXT (1): yalnız "MÜKEMMEL BOŞLUK" ve "REDD" yazıları
 *   → text-fill ışık yalnız bu katmanı etkiler, figür siluet kalır.
 */
export const LAYER = {
  DEFAULT: 0,
  TEXT: 1,
} as const;

export type LayerIndex = (typeof LAYER)[keyof typeof LAYER];
