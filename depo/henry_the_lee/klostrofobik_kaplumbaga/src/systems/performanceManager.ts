import * as THREE from "three";

export type GraphicsMode = "auto" | "low" | "medium" | "high" | "ultra";
export type GraphicsTier = Exclude<GraphicsMode, "auto">;

export interface GraphicsProfile {
  tier: GraphicsTier;
  label: string;
  minPixelRatio: number;
  maxPixelRatio: number;
  initialPixelRatio: number;
  shadows: boolean;
  shadowMapSize: number;
  tunnelDetail: number;
  particleBudget: number;
  activeProjectileBudget: number;
}

export interface PerformanceSnapshot {
  mode: GraphicsMode;
  tier: GraphicsTier;
  fps: number;
  frameTime: number;
  pixelRatio: number;
  drawCalls: number;
  triangles: number;
}

export interface PerformanceManager {
  readonly profile: GraphicsProfile;
  readonly mode: GraphicsMode;
  sample(deltaSeconds: number): void;
  resize(width: number, height: number): void;
  setMode(mode: GraphicsMode): void;
  onChange(callback: (profile: GraphicsProfile, snapshot: PerformanceSnapshot) => void): () => void;
  snapshot(): PerformanceSnapshot;
  dispose(): void;
}

const STORAGE_KEY = "klostrofobik-graphics-mode-v3";

const PROFILES: Record<GraphicsTier, GraphicsProfile> = {
  low: {
    tier: "low",
    label: "Düşük",
    minPixelRatio: 0.5,
    maxPixelRatio: 0.72,
    initialPixelRatio: 0.68,
    shadows: false,
    shadowMapSize: 512,
    tunnelDetail: 0.5,
    particleBudget: 24,
    activeProjectileBudget: 20,
  },
  medium: {
    tier: "medium",
    label: "Orta",
    minPixelRatio: 0.62,
    maxPixelRatio: 0.95,
    initialPixelRatio: 0.88,
    shadows: true,
    shadowMapSize: 768,
    tunnelDetail: 0.68,
    particleBudget: 36,
    activeProjectileBudget: 30,
  },
  high: {
    tier: "high",
    label: "Yüksek",
    minPixelRatio: 0.74,
    maxPixelRatio: 1.2,
    initialPixelRatio: 1.08,
    shadows: true,
    shadowMapSize: 1024,
    tunnelDetail: 0.84,
    particleBudget: 50,
    activeProjectileBudget: 40,
  },
  ultra: {
    tier: "ultra",
    label: "Ultra",
    minPixelRatio: 0.9,
    maxPixelRatio: 1.5,
    initialPixelRatio: 1.45,
    shadows: true,
    shadowMapSize: 1536,
    tunnelDetail: 1,
    particleBudget: 64,
    activeProjectileBudget: 48,
  },
};

const MAX_RENDER_PIXELS: Record<GraphicsTier, number> = {
  low: 1_800_000,
  medium: 3_200_000,
  high: 5_200_000,
  ultra: 8_000_000,
};

function readHardwareNumber(name: "deviceMemory" | "hardwareConcurrency", fallback: number): number {
  const value = (navigator as Navigator & { deviceMemory?: number })[name];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readGpuScoreAdjustment(): number {
  const canvas = document.createElement("canvas");
  const context =
    canvas.getContext("webgl2", { powerPreference: "high-performance" }) ||
    canvas.getContext("webgl", { powerPreference: "high-performance" });
  if (!context) return -4;
  const debugInfo = context.getExtension("WEBGL_debug_renderer_info") as {
    UNMASKED_RENDERER_WEBGL: number;
  } | null;
  const rendererName = String(
    context.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER),
  ).toLowerCase();
  const maxTextureSize = Number(context.getParameter(context.MAX_TEXTURE_SIZE));
  context.getExtension("WEBGL_lose_context")?.loseContext();

  if (/swiftshader|llvmpipe|software|microsoft basic/.test(rendererName)) return -4;
  if (/intel.*(hd graphics [2345]|gma)|mali-[34]|adreno \(tm\) [345]|powervr sgx/.test(rendererName)) {
    return -3;
  }
  if (/intel.*uhd/.test(rendererName)) return -1;
  if (maxTextureSize < 8192) return -2;
  if (/rtx|radeon rx 6|radeon rx 7|apple m[234]|arc a[57]/.test(rendererName)) return 2;
  if (/gtx|radeon rx|apple m1|apple m2|iris xe|vega/.test(rendererName)) return 1;
  return 0;
}

export function isBlockedMobileDevice(): boolean {
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
  const userAgentDataMobile = Boolean(
    (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile,
  );
  const coarseTouch =
    navigator.maxTouchPoints > 0 &&
    window.matchMedia?.("(pointer: coarse)").matches &&
    Math.min(window.screen.width, window.screen.height) < 1100;
  return uaMobile || userAgentDataMobile || coarseTouch;
}

export function getStoredGraphicsMode(): GraphicsMode {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "low" || saved === "medium" || saved === "high" || saved === "ultra") {
      return saved;
    }
    if (saved === "performance") return "low";
    if (saved === "balanced") return "medium";
    if (saved === "quality") return "high";
  } catch {
    // Depolama kapalıysa otomatik profil güvenli varsayılandır.
  }
  return "auto";
}

export function detectAutomaticTier(): GraphicsTier {
  const memory = readHardwareNumber("deviceMemory", 4);
  const cores = readHardwareNumber("hardwareConcurrency", 4);
  const screenPixels = window.innerWidth * window.innerHeight * Math.min(window.devicePixelRatio, 2) ** 2;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  let score = 0;
  if (memory >= 8) score += 2;
  else if (memory >= 4) score += 1;
  else score -= 2;
  if (cores >= 8) score += 2;
  else if (cores >= 4) score += 1;
  else score -= 2;
  if (screenPixels > 5_000_000) score -= 2;
  else if (screenPixels > 3_000_000) score -= 1;
  if (reducedMotion) score -= 1;
  score += readGpuScoreAdjustment();

  if (score >= 7) return "ultra";
  if (score >= 3) return "high";
  if (score >= 0) return "medium";
  return "low";
}

export function getInitialGraphicsProfile(mode = getStoredGraphicsMode()): GraphicsProfile {
  return PROFILES[mode === "auto" ? detectAutomaticTier() : mode];
}

function adjacentTier(tier: GraphicsTier, direction: -1 | 1): GraphicsTier {
  const order: GraphicsTier[] = ["low", "medium", "high", "ultra"];
  const index = THREE.MathUtils.clamp(order.indexOf(tier) + direction, 0, order.length - 1);
  return order[index];
}

function initialPixelRatioForMode(
  mode: GraphicsMode,
  profile: GraphicsProfile,
): number {
  // Manuel profiller birbirinden gerÃ§ekten ayrÄ±lsÄ±n: YÃ¼ksek ve Ultra,
  // DPR=1 ekranda da supersampling yapar. GPU render-pixel bÃ¼tÃ§esi daha sonra
  // aÅŸÄ±rÄ± bÃ¼yÃ¼k framebuffer oluÅŸmasÄ±nÄ± engeller.
  return mode === "auto"
    ? Math.min(window.devicePixelRatio || 1, profile.initialPixelRatio)
    : profile.initialPixelRatio;
}

export function createPerformanceManager(
  renderer: THREE.WebGLRenderer,
  initialMode = getStoredGraphicsMode(),
): PerformanceManager {
  let mode = initialMode;
  let profile = getInitialGraphicsProfile(mode);
  let pixelRatio = THREE.MathUtils.clamp(
    initialPixelRatioForMode(mode, profile),
    profile.minPixelRatio,
    profile.maxPixelRatio,
  );
  let width = window.innerWidth;
  let height = window.innerHeight;
  let elapsed = 0;
  let frames = 0;
  let fps = 60;
  let smoothedFrameMs = 16.67;
  let slowSeconds = 0;
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
  const listeners = new Set<(profile: GraphicsProfile, snapshot: PerformanceSnapshot) => void>();

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

    if (pixelRatioChanged) renderer.setPixelRatio(pixelRatio);
    if (sizeChanged) renderer.setSize(width, height, false);

    appliedWidth = width;
    appliedHeight = height;
    appliedPixelRatio = pixelRatio;
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

  const snapshot = (): PerformanceSnapshot => ({
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

  const applyProfile = (nextTier: GraphicsTier, resetResolution: boolean) => {
    profile = PROFILES[nextTier];
    if (resetResolution) {
      pixelRatio = initialPixelRatioForMode(mode, profile);
    }
    pixelRatio = THREE.MathUtils.clamp(pixelRatio, profile.minPixelRatio, profile.maxPixelRatio);
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

      const struggling = fps < 54 || smoothedFrameMs > 18.5;
      slowSeconds = struggling ? slowSeconds + sampleWindow : Math.max(0, slowSeconds - sampleWindow * 0.7);

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
        notify();
      } else {
        notify();
      }
    },
    resize(nextWidth, nextHeight) {
      width = Math.max(1, Math.floor(nextWidth));
      height = Math.max(1, Math.floor(nextHeight));
      applySize();
    },
    setMode(nextMode) {
      mode = nextMode;
      try {
        if (mode === "auto") window.localStorage.removeItem(STORAGE_KEY);
        else window.localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // Oyun depolama izni olmadan da çalışır.
      }
      slowSeconds = 0;
      adjustmentCooldown = 2;
      applyProfile(mode === "auto" ? detectAutomaticTier() : mode, true);
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
