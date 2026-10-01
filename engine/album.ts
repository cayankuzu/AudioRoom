import type { Secret } from "./game/secrets";
import type { Track, WorldMeta } from "./world";

/**
 * Bir albüm evreninin saf verisi (three.js içermez). Evren ve hub aynı kaynağı
 * okur: parça listesi, künye ve evren bilgisi tek yerde tutulur.
 */
export interface AlbumData {
  meta: WorldMeta;
  tracks: readonly Track[];
  /** "mobile-demo": telefonda sade demo açılır; "desktop": telefonda kapı ekranı. */
  device: "desktop" | "mobile-demo";
  /** Telefondaki demoda yer alacak parça kimlikleri. */
  demoTracks?: readonly string[];
  /** Gizli keşifler (easter egg); hub yalnızca sayısını ve bulunanları gösterir. */
  secrets: readonly Secret[];
  hub: HubInfo;
}

export interface HubInfo {
  releaseType: "album" | "single" | "ep";
  artistUrl: string;
  /** Evren sayfasının kökten yolu, ör. "worlds/mukemmel-bosluk/". */
  path: string;
  summary: string;
  facts: ReadonlyArray<readonly [string, string]>;
  world: { name: string; duration: string; highlights: readonly string[] };
  /** Albümün tamamını YouTube'da dinleme bağlantısı. */
  listenUrl: string;
}
