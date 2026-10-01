import { prefersReducedMotion } from "./device";

/** localStorage erişimi gizli modda veya kapalı depolamada hata fırlatabilir. */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Depolama yoksa ayar yalnızca bu oturumda geçerli kalır.
  }
}

export interface Settings {
  quality: "auto" | "low" | "medium" | "high";
  sensitivity: number;
  invertY: boolean;
  fov: number;
  headBob: boolean;
  musicVolume: number;
  sfxVolume: number;
  brightness: number;
  /** Şarkı klipleri: şarkı çalarken evrenin şarkıyı anlatan sahneleri. Kapalıyken evren kapaktaki hâlinde kalır. */
  clips: boolean;
  /** Şarkı başlayınca klibi sinema kamerasıyla izlet (yürüyünce serbest kalınır). */
  cinema: boolean;
  /** Üçüncü kişi görünüm: karakterin kameranın önünde yürür (T ile de değişir). */
  thirdPerson: boolean;
}

export const SETTINGS_KEY = "audioroom.settings.v1";

export const DEFAULT_SETTINGS: Settings = {
  quality: "auto",
  sensitivity: 1,
  invertY: false,
  fov: 70,
  headBob: true,
  musicVolume: 0.85,
  sfxVolume: 0.7,
  brightness: 1,
  clips: true,
  cinema: true,
  thirdPerson: true,
};

/** Varsayılan ayarlar (her çağrı yeni nesne): azaltılmış hareket tercih edenlerde kamera salınımı kapalı gelir. */
export function defaultSettings(): Settings {
  return { ...DEFAULT_SETTINGS, headBob: !prefersReducedMotion() };
}

/** Her çağrı yeni nesne döner: menü ayarları yerinde değiştirir, varsayılanlar kirlenmemeli. */
export function loadSettings(): Settings {
  return readJson(SETTINGS_KEY, defaultSettings());
}

export function saveSettings(settings: Settings): void {
  writeJson(SETTINGS_KEY, settings);
}

/** Evren ilerlemesi: dinlenen plaklar ve tamamlanma. Hub da bu anahtarı okur. */
export interface Progress {
  found: string[];
  completed: boolean;
  /** Bulunan gizli keşiflerin kimlikleri. */
  secrets: string[];
}

export const progressKey = (worldId: string) => `audioroom.progress.${worldId}.v1`;

export function loadProgress(worldId: string): Progress {
  const progress = readJson<Progress>(progressKey(worldId), { found: [], completed: false, secrets: [] });
  return { ...progress, secrets: Array.isArray(progress.secrets) ? progress.secrets : [] };
}

/** İlerlemeyi tamamen siler (plaklar, final, gizli keşifler). */
export function clearProgress(worldId: string): void {
  try {
    window.localStorage.removeItem(progressKey(worldId));
  } catch {
    // Depolama yoksa silinecek bir şey de yoktur.
  }
}

export function saveProgress(worldId: string, progress: Progress): void {
  writeJson(progressKey(worldId), progress);
}
