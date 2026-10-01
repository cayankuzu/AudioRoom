import { isTouchOnly } from "./device";

export type QualityTier = "low" | "medium" | "high";
export type QualityMode = QualityTier | "auto";

export interface QualityProfile {
  tier: QualityTier;
  label: string;
  /** Çözünürlük çarpanı üst sınırı (cihaz DPR'ı ile ayrıca sınırlanır). */
  maxPixelRatio: number;
  minPixelRatio: number;
  msaa: number;
  shadows: boolean;
  shadowMapSize: number;
  bloom: boolean;
  /** Gölge haritası kaç karede bir güncellenir (sahneler çoğunlukla durağan). */
  shadowInterval: number;
  /** Parçacık/dekor yoğunluğu çarpanı (0..1). */
  detail: number;
}

export const QUALITY_PROFILES: Record<QualityTier, QualityProfile> = {
  low: {
    tier: "low",
    label: "Düşük",
    maxPixelRatio: 1,
    minPixelRatio: 0.6,
    msaa: 0,
    shadows: false,
    shadowMapSize: 512,
    bloom: false,
    shadowInterval: 0,
    detail: 0.45,
  },
  medium: {
    tier: "medium",
    label: "Orta",
    maxPixelRatio: 1.25,
    minPixelRatio: 0.7,
    msaa: 2,
    shadows: true,
    shadowMapSize: 1024,
    bloom: false,
    shadowInterval: 3,
    detail: 0.7,
  },
  high: {
    tier: "high",
    label: "Yüksek",
    maxPixelRatio: 2,
    minPixelRatio: 0.8,
    msaa: 4,
    shadows: true,
    shadowMapSize: 2048,
    bloom: true,
    shadowInterval: 1,
    detail: 1,
  },
};

/** Donanım ipuçlarından kaba bir kademe tahmini; oyun sırasında FPS'e göre ince ayar yapılır. */
export function detectTier(): QualityTier {
  if (isTouchOnly()) return "low";
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const gpu = readGpuName();
  if (/swiftshader|llvmpipe|software|basic render/.test(gpu)) return "low";
  if (/intel(?!.*arc)|mali|adreno|powervr/.test(gpu) || cores <= 4 || memory <= 4) return "medium";
  return "high";
}

function readGpuName(): string {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "software";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name.toLowerCase();
  } catch {
    return "";
  }
}

export function lowerTier(tier: QualityTier): QualityTier {
  return tier === "high" ? "medium" : "low";
}

/**
 * Telefonda düşük kademe 1.5x çözünürlükle başlar: yüksek DPR ekranda 1x bulanık
 * kalıyor. Orta segment bir telefonda (Redmi Note 9 Pro) demo sahneleri 1.5x'te
 * 60 fps, 2x'te 55 fps ölçüldü; yavaş cihazda dinamik çözünürlük kendiliğinden düşürür.
 */
export const TOUCH_MAX_PIXEL_RATIO = 1.5;

export function resolveProfile(mode: QualityMode): QualityProfile {
  const profile = QUALITY_PROFILES[mode === "auto" ? detectTier() : mode];
  return isTouchOnly() && profile.tier === "low" ? { ...profile, maxPixelRatio: TOUCH_MAX_PIXEL_RATIO } : profile;
}
