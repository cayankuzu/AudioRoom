import * as THREE from "three";

export type GraphicsMode = "auto" | "performance" | "balanced" | "quality";
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

const STORAGE_KEY = "klostrofobik-graphics-mode-v2";

const PROFILES: Record<GraphicsTier, GraphicsProfile> = {
  performance: {
    tier: "performance",
    label: "Akıcı",
    minPixelRatio: 0.5,
    maxPixelRatio: 0.78,
    initialPixelRatio: 0.78,
    shadows: false,
    shadowMapSize: 512,
    tunnelDetail: 0.56,
    particleBudget: 28,
    activeProjectileBudget: 24,
  },
  balanced: {
    tier: "balanced",
    label: "Dengeli",
    minPixelRatio: 0.62,
    maxPixelRatio: 1,
    initialPixelRatio: 1,
    shadows: true,
    shadowMapSize: 1024,
    tunnelDetail: 0.76,
    particleBudget: 46,
    activeProjectileBudget: 36,
  },
  quality: {
    tier: "quality",
    label: "Sinematik",
    minPixelRatio: 0.74,
    maxPixelRatio: 1.25,
    initialPixelRatio: 1.2,
    shadows: true,
    shadowMapSize: 1536,
    tunnelDetail: 1,
    particleBudget: 64,
    activeProjectileBudget: 48,
  },
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
    if (saved === "performance" || saved === "balanced" || saved === "quality") return saved;
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

  if (score >= 4) return "quality";
  if (score >= 1) return "balanced";
  return "performance";
}

export function getInitialGraphicsProfile(mode = getStoredGraphicsMode()): GraphicsProfile {
  return PROFILES[mode === "auto" ? detectAutomaticTier() : mode];
}

function adjacentTier(tier: GraphicsTier, direction: -1 | 1): GraphicsTier {
  const order: GraphicsTier[] = ["performance", "balanced", "quality"];
  const index = THREE.MathUtils.clamp(order.indexOf(tier) + direction, 0, order.length - 1);
  return order[index];
}

export function createPerformanceManager(
  renderer: THREE.WebGLRenderer,
  initialMode = getStoredGraphicsMode(),
): PerformanceManager {
  let mode = initialMode;
  let profile = getInitialGraphicsProfile(mode);
  let pixelRatio = THREE.MathUtils.clamp(
    Math.min(window.devicePixelRatio, profile.initialPixelRatio),
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
  const listeners = new Set<(profile: GraphicsProfile, snapshot: PerformanceSnapshot) => void>();

  const applySize = () => {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
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
      pixelRatio = Math.min(window.devicePixelRatio, profile.initialPixelRatio);
    }
    pixelRatio = THREE.MathUtils.clamp(pixelRatio, profile.minPixelRatio, profile.maxPixelRatio);
    applySize();
    notify();
  };

  applySize();

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
      listeners.clear();
    },
  };
}
