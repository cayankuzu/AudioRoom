import * as THREE from "three";

export type GraphicsMode = "auto" | "low" | "medium" | "high" | "ultra";
export type GraphicsTier = Exclude<GraphicsMode, "auto">;

export interface AdaptiveGraphicsProfile {
  tier: GraphicsTier;
  label: string;
  minPixelRatio: number;
  maxPixelRatio: number;
  initialPixelRatio: number;
  detailScale: number;
  secondaryUpdateStride: number;
}

export interface AdaptivePerformanceSnapshot {
  mode: GraphicsMode;
  tier: GraphicsTier;
  fps: number;
  frameTime: number;
  pixelRatio: number;
  drawCalls: number;
  triangles: number;
}

export interface AdaptivePerformanceManager {
  readonly profile: AdaptiveGraphicsProfile;
  readonly mode: GraphicsMode;
  sample(deltaSeconds: number): void;
  resize(width: number, height: number): void;
  setMode(mode: GraphicsMode): void;
  onChange(
    callback: (
      profile: AdaptiveGraphicsProfile,
      snapshot: AdaptivePerformanceSnapshot,
    ) => void,
  ): () => void;
  snapshot(): AdaptivePerformanceSnapshot;
  dispose(): void;
}

interface AdaptivePerformanceOptions {
  storageKey: string;
  onResolutionChange?: (
    width: number,
    height: number,
    pixelRatio: number,
  ) => void;
}

const PROFILES: Record<GraphicsTier, AdaptiveGraphicsProfile> = {
  low: {
    tier: "low",
    label: "Düşük",
    minPixelRatio: 0.5,
    maxPixelRatio: 0.72,
    initialPixelRatio: 0.68,
    detailScale: 0.52,
    secondaryUpdateStride: 3,
  },
  medium: {
    tier: "medium",
    label: "Orta",
    minPixelRatio: 0.62,
    maxPixelRatio: 0.95,
    initialPixelRatio: 0.88,
    detailScale: 0.7,
    secondaryUpdateStride: 2,
  },
  high: {
    tier: "high",
    label: "Yüksek",
    minPixelRatio: 0.76,
    maxPixelRatio: 1.25,
    initialPixelRatio: 1.08,
    detailScale: 0.86,
    secondaryUpdateStride: 1,
  },
  ultra: {
    tier: "ultra",
    label: "Ultra",
    minPixelRatio: 0.9,
    maxPixelRatio: 1.75,
    initialPixelRatio: 1.45,
    detailScale: 1,
    secondaryUpdateStride: 1,
  },
};

const TIER_ORDER: readonly GraphicsTier[] = ["low", "medium", "high", "ultra"];

const MAX_RENDER_PIXELS: Record<GraphicsTier, number> = {
  low: 1_800_000,
  medium: 3_200_000,
  high: 5_200_000,
  ultra: 8_000_000,
};

function readHardwareNumber(
  name: "deviceMemory" | "hardwareConcurrency",
  fallback: number,
): number {
  const value = (navigator as Navigator & { deviceMemory?: number })[name];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readGpuScoreAdjustment(): number {
  const canvas = document.createElement("canvas");
  const context =
    canvas.getContext("webgl2", { powerPreference: "high-performance" }) ||
    canvas.getContext("webgl", { powerPreference: "high-performance" });
  if (!context) return -5;

  const debugInfo = context.getExtension("WEBGL_debug_renderer_info") as {
    UNMASKED_RENDERER_WEBGL: number;
  } | null;
  const rendererName = String(
    context.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER),
  ).toLowerCase();
  const maxTextureSize = Number(context.getParameter(context.MAX_TEXTURE_SIZE));
  context.getExtension("WEBGL_lose_context")?.loseContext();

  if (/swiftshader|llvmpipe|software|microsoft basic/.test(rendererName)) return -5;
  if (/intel.*(hd graphics [2345]|gma)|mali-[34]|adreno \(tm\) [345]|powervr sgx/.test(rendererName)) {
    return -3;
  }
  if (/intel.*uhd/.test(rendererName)) return -1;
  if (maxTextureSize < 8192) return -2;
  if (/rtx|radeon rx 6|radeon rx 7|apple m[234]|arc a[57]/.test(rendererName)) return 3;
  if (/gtx|radeon rx|apple m1|apple m2|iris xe|vega/.test(rendererName)) return 1;
  return 0;
}

export function detectAutomaticGraphicsTier(): GraphicsTier {
  const memory = readHardwareNumber("deviceMemory", 4);
  const cores = readHardwareNumber("hardwareConcurrency", 4);
  const screenPixels =
    window.innerWidth *
    window.innerHeight *
    Math.min(window.devicePixelRatio || 1, 2) ** 2;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const saveData = Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
  );

  let score = 0;
  if (memory >= 12) score += 3;
  else if (memory >= 8) score += 2;
  else if (memory >= 4) score += 1;
  else score -= 3;
  if (cores >= 12) score += 3;
  else if (cores >= 8) score += 2;
  else if (cores >= 4) score += 1;
  else score -= 3;
  if (screenPixels > 7_000_000) score -= 2;
  else if (screenPixels > 4_000_000) score -= 1;
  if (reducedMotion) score -= 1;
  if (saveData) score -= 2;
  score += readGpuScoreAdjustment();

  if (score >= 7) return "ultra";
  if (score >= 3) return "high";
  if (score >= 0) return "medium";
  return "low";
}

export function readGraphicsMode(storageKey: string): GraphicsMode {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (
      saved === "low" ||
      saved === "medium" ||
      saved === "high" ||
      saved === "ultra"
    ) {
      return saved;
    }
  } catch {
    // Depolama kapalıysa güvenli varsayılan otomatik profildir.
  }
  return "auto";
}

export function getAdaptiveGraphicsProfile(
  mode: GraphicsMode,
): AdaptiveGraphicsProfile {
  return PROFILES[mode === "auto" ? detectAutomaticGraphicsTier() : mode];
}

function adjacentTier(tier: GraphicsTier, direction: -1 | 1): GraphicsTier {
  const index = THREE.MathUtils.clamp(
    TIER_ORDER.indexOf(tier) + direction,
    0,
    TIER_ORDER.length - 1,
  );
  return TIER_ORDER[index];
}

function initialPixelRatioForMode(
  mode: GraphicsMode,
  profile: AdaptiveGraphicsProfile,
): number {
  // Otomatik mod cihazÄ±n doÄŸal DPR'Ä±nÄ± aÅŸmaz. Manuel YÃ¼ksek/Ultra ise
  // gerÃ§ekten daha net bir gÃ¶rÃ¼ntÃ¼ Ã¼retmek iÃ§in supersampling kullanabilir;
  // aÅŸaÄŸÄ±daki GPU piksel bÃ¼tÃ§esi yine gÃ¼venli Ã¼st sÄ±nÄ±rÄ± uygular.
  return mode === "auto"
    ? Math.min(window.devicePixelRatio || 1, profile.initialPixelRatio)
    : profile.initialPixelRatio;
}

export function createAdaptivePerformanceManager(
  renderer: THREE.WebGLRenderer,
  options: AdaptivePerformanceOptions,
): AdaptivePerformanceManager {
  let mode = readGraphicsMode(options.storageKey);
  let profile = getAdaptiveGraphicsProfile(mode);
  let pixelRatio = THREE.MathUtils.clamp(
    initialPixelRatioForMode(mode, profile),
    profile.minPixelRatio,
    profile.maxPixelRatio,
  );
  let width = Math.max(1, window.innerWidth);
  let height = Math.max(1, window.innerHeight);
  let elapsed = 0;
  let frames = 0;
  let fps = 60;
  let smoothedFrameMs = 16.67;
  let slowSeconds = 0;
  let stableSeconds = 0;
  let adjustmentCooldown = 0;
  let disposed = false;
  let resizeFrame = 0;
  const rendererSize = new THREE.Vector2();
  renderer.getSize(rendererSize);
  let appliedWidth = Math.max(1, Math.floor(rendererSize.x));
  let appliedHeight = Math.max(1, Math.floor(rendererSize.y));
  let appliedPixelRatio = renderer.getPixelRatio();
  const gl = renderer.getContext();
  const maxRenderbufferSize = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)) || 4096;
  const listeners = new Set<(
    profile: AdaptiveGraphicsProfile,
    snapshot: AdaptivePerformanceSnapshot,
  ) => void>();

  const clampPixelRatioToGpu = (requestedPixelRatio: number) => {
    const renderPixelLimit = Math.sqrt(
      MAX_RENDER_PIXELS[profile.tier] / Math.max(1, width * height),
    );
    const renderbufferLimit = maxRenderbufferSize / Math.max(1, width, height);
    return Math.max(
      0.5,
      Math.min(requestedPixelRatio, renderPixelLimit, renderbufferLimit),
    );
  };

  const commitSize = () => {
    if (disposed) return;
    resizeFrame = 0;
    pixelRatio = clampPixelRatioToGpu(pixelRatio);
    const pixelRatioChanged = Math.abs(appliedPixelRatio - pixelRatio) > 0.001;
    const sizeChanged = appliedWidth !== width || appliedHeight !== height;
    if (!pixelRatioChanged && !sizeChanged) return;

    // Three.js setPixelRatio() kendi iÃ§inde mevcut boyutla setSize() Ã§aÄŸÄ±rÄ±r.
    // YalnÄ±zca gerÃ§ekten gereken ikinci boyutlandÄ±rmayÄ± yaparak GPU tamponlarÄ±nÄ±
    // aynÄ± tÄ±klamada iki kez oluÅŸturmaktan kaÃ§Ä±nÄ±yoruz.
    if (pixelRatioChanged) renderer.setPixelRatio(pixelRatio);
    if (sizeChanged) renderer.setSize(width, height, false);

    appliedWidth = width;
    appliedHeight = height;
    appliedPixelRatio = pixelRatio;
    options.onResolutionChange?.(width, height, pixelRatio);
  };

  const applySize = (immediate = false) => {
    if (disposed) return;
    if (immediate) {
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
      commitSize();
      return;
    }
    if (resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(commitSize);
  };

  const snapshot = (): AdaptivePerformanceSnapshot => ({
    mode,
    tier: profile.tier,
    fps: Math.round(fps),
    frameTime: Number(smoothedFrameMs.toFixed(2)),
    pixelRatio: Number(pixelRatio.toFixed(2)),
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
  });

  const notify = () => {
    const state = snapshot();
    listeners.forEach((listener) => listener(profile, state));
  };

  const applyProfile = (tier: GraphicsTier, resetResolution: boolean) => {
    profile = PROFILES[tier];
    if (resetResolution) {
      pixelRatio = initialPixelRatioForMode(mode, profile);
    }
    pixelRatio = THREE.MathUtils.clamp(
      pixelRatio,
      profile.minPixelRatio,
      profile.maxPixelRatio,
    );
    applySize();
    notify();
  };

  applySize(true);

  return {
    get profile() {
      return profile;
    },
    get mode() {
      return mode;
    },
    sample(deltaSeconds) {
      if (disposed || document.visibilityState === "hidden") return;
      const safeDelta = Math.min(Math.max(deltaSeconds, 0), 0.25);
      if (safeDelta <= 0) return;

      const frameMs = safeDelta * 1000;
      smoothedFrameMs += (frameMs - smoothedFrameMs) * 0.055;
      elapsed += safeDelta;
      frames += 1;
      adjustmentCooldown = Math.max(0, adjustmentCooldown - safeDelta);

      if (elapsed < 1) return;
      fps = frames / elapsed;
      const sampleWindow = elapsed;
      elapsed = 0;
      frames = 0;

      if (mode !== "auto") {
        notify();
        return;
      }

      const struggling = fps < 54 || smoothedFrameMs > 18.7;
      const stable = fps >= 58 && smoothedFrameMs <= 17.4;
      slowSeconds = struggling
        ? slowSeconds + sampleWindow
        : Math.max(0, slowSeconds - sampleWindow * 0.75);
      stableSeconds = stable
        ? stableSeconds + sampleWindow
        : Math.max(0, stableSeconds - sampleWindow);

      if (adjustmentCooldown <= 0 && slowSeconds >= 2) {
        if (pixelRatio > profile.minPixelRatio + 0.04) {
          pixelRatio = Math.max(profile.minPixelRatio, pixelRatio - 0.12);
          applySize();
        } else {
          const lower = adjacentTier(profile.tier, -1);
          if (lower !== profile.tier) applyProfile(lower, true);
        }
        adjustmentCooldown = 2.5;
        slowSeconds = 0;
        stableSeconds = 0;
      } else if (
        adjustmentCooldown <= 0 &&
        stableSeconds >= 9 &&
        pixelRatio < Math.min(window.devicePixelRatio || 1, profile.maxPixelRatio) - 0.04
      ) {
        pixelRatio = Math.min(
          window.devicePixelRatio || 1,
          profile.maxPixelRatio,
          pixelRatio + 0.08,
        );
        applySize();
        adjustmentCooldown = 4;
        stableSeconds = 0;
      }
      notify();
    },
    resize(nextWidth, nextHeight) {
      width = Math.max(1, Math.floor(nextWidth));
      height = Math.max(1, Math.floor(nextHeight));
      applySize();
    },
    setMode(nextMode) {
      mode = nextMode;
      try {
        if (mode === "auto") window.localStorage.removeItem(options.storageKey);
        else window.localStorage.setItem(options.storageKey, mode);
      } catch {
        // Ayar yine oturum boyunca uygulanır.
      }
      slowSeconds = 0;
      stableSeconds = 0;
      adjustmentCooldown = 2;
      applyProfile(
        mode === "auto" ? detectAutomaticGraphicsTier() : mode,
        true,
      );
    },
    onChange(callback) {
      listeners.add(callback);
      callback(profile, snapshot());
      return () => listeners.delete(callback);
    },
    snapshot,
    dispose() {
      disposed = true;
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
      resizeFrame = 0;
      listeners.clear();
    },
  };
}
