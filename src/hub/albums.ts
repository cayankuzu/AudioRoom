import type { AlbumData } from "../../engine/album";
import { deviceClass } from "../../engine/core/device";
import { clearProgress, loadProgress } from "../../engine/core/storage";
import { ALBUM as HAYKO } from "../../worlds/beni-buyuten-sarkilar/album";
import { ALBUM as KLOSTRO } from "../../worlds/klostrofobik-kaplumbaga/album";
import { ALBUM as KUANTUM } from "../../worlds/kuantum-dolaniklik/album";
import { ALBUM as REDD } from "../../worlds/mukemmel-bosluk/album";

export interface HubTrack {
  order: number;
  title: string;
  videoId?: string;
  credit?: string;
  id?: string;
}

export interface HubAlbum {
  id: string;
  artist: string;
  album: string;
  year: string;
  cover: string;
  accent: string;
  accentInk: string;
  displayFont: string;
  releaseType: "album" | "single" | "ep";
  available: boolean;
  device?: AlbumData["device"];
  path?: string;
  summary: string;
  pitch?: string;
  facts: ReadonlyArray<readonly [string, string]>;
  world?: AlbumData["hub"]["world"] & { mechanic: { name: string; text: string } };
  demoTrackCount?: number;
  tracks: readonly HubTrack[];
  /** Evrendeki gizli keşifler (bulunana kadar yalnızca sayısı gösterilir). */
  secrets?: AlbumData["secrets"];
  listenUrl?: string;
  artistUrl?: string;
}

function fromWorld(data: AlbumData): HubAlbum {
  const { meta, hub } = data;
  return {
    id: meta.id,
    artist: meta.artist,
    album: meta.album,
    year: meta.year,
    cover: meta.cover,
    accent: meta.accent,
    accentInk: meta.accentInk,
    displayFont: meta.displayFont,
    releaseType: hub.releaseType,
    available: true,
    device: data.device,
    path: hub.path,
    summary: hub.summary,
    pitch: meta.description,
    facts: hub.facts,
    world: { ...hub.world, mechanic: meta.mechanic },
    demoTrackCount: data.demoTracks?.length,
    tracks: data.tracks,
    secrets: data.secrets,
    listenUrl: hub.listenUrl,
    artistUrl: hub.artistUrl,
  };
}

/** Evreni henüz açılmamış albümler: kütüphanede "Yakında" olarak durur. */
const UPCOMING: HubAlbum[] = [
  {
    id: "redd-21",
    artist: "Redd",
    album: "21",
    year: "2009",
    cover: "covers/redd-21.jpg",
    accent: "#ff5f76",
    accentInk: "#1a0306",
    displayFont: "'Cinzel', serif",
    releaseType: "album",
    available: false,
    summary: "Redd'in erken dönem repertuvarını geniş bir set hâlinde toplayan, 21 parçalık uzun form stüdyo albümü.",
    facts: [
      ["Yayın", "2009"],
      ["Parça", "21 · 1 saat 13 dakika"],
      ["Format", "Stüdyo albümü"],
    ],
    tracks: [
      "Çığlık", "Masal", "Oyun", "Astrotanrı", "Don Kişot", "Bir Şövalye Var İçinde", "Özgürlük Sırtından Vurulmuş",
      "Öyle Boş Ki Hayat", "Tamam Böyle Kalsın", "Vicdani Redd", "Seni Buldum", "Aşk Bu Kadar Zor Mu", "Her Neyse",
      "Aşktı Bu", "Sevsen de Sevmesen de", "Yaşandım Daha Çok", "Küçük Bir Çocukken", "Modern Adımlarla",
      "Plastik Çiçekler ve Böcek", "Dekadans", "Sükut",
    ].map((title, i) => ({ order: i + 1, title })),
    artistUrl: "https://www.instagram.com/reddseyirdefter",
  },
  {
    id: "pink-floyd-dark-side-of-the-moon",
    artist: "Pink Floyd",
    album: "The Dark Side of the Moon",
    year: "1973",
    cover: "covers/dark-side-of-the-moon.jpg",
    accent: "#8ec7ff",
    accentInk: "#07121f",
    displayFont: "'Manrope', sans-serif",
    releaseType: "album",
    available: false,
    summary: "Pink Floyd'un zaman, baskı ve gündelik döngüler etrafında kurduğu, en bilinen konsept albümlerinden biri.",
    facts: [
      ["Yayın", "1 Mart 1973"],
      ["Parça", "10 · 42 dakika"],
      ["Format", "Konsept stüdyo albümü"],
    ],
    tracks: [
      "Speak to Me", "Breathe (In the Air)", "On the Run", "Time", "The Great Gig in the Sky", "Money",
      "Us and Them", "Any Colour You Like", "Brain Damage", "Eclipse",
    ].map((title, i) => ({ order: i + 1, title })),
    artistUrl: "https://www.instagram.com/pinkfloyd",
  },
];

/** Raf sırası: öne çıkan evren ilk sırada. */
export const ALBUMS: readonly HubAlbum[] = [fromWorld(REDD), fromWorld(HAYKO), fromWorld(KUANTUM), fromWorld(KLOSTRO), ...UPCOMING];

export const findAlbum = (id: string) => ALBUMS.find((album) => album.id === id);

/**
 * Bu cihazda açılacak Sürüm 2: bilgisayarda tam evren, tablette (Redd) sade demo; telefonda hiçbiri
 * (telefonda yalnızca Mükemmel Boşluk'un Sürüm 1'i açılır, sürüm seçiciden).
 */
export function playableHere(album: HubAlbum): "full" | "demo" | "desktop-only" | "soon" {
  if (!album.available) return "soon";
  const device = deviceClass();
  if (device === "desktop") return "full";
  if (device === "phone") return "desktop-only";
  return album.device === "mobile-demo" ? "demo" : "desktop-only";
}

export interface AlbumProgress {
  found: number;
  total: number;
  completed: boolean;
  /** Bulunan gizli keşiflerin kimlikleri (evrenin listesindekiler). */
  secrets: string[];
  secretTotal: number;
}

const ACTIVE_KEY = "audioroom.hub.active";

/** Raftaki son albüm sekme boyunca hatırlanır: evrenden geri tuşuyla dönünce aynı kapak önde olur. */
export function rememberActive(id: string): void {
  try {
    sessionStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // Depolama kapalıysa raf baştan başlar; sorun değil.
  }
}

export function rememberedActive(): string {
  try {
    return findAlbum(sessionStorage.getItem(ACTIVE_KEY) ?? "")?.id ?? ALBUMS[0].id;
  } catch {
    return ALBUMS[0].id;
  }
}

export function readProgress(album: HubAlbum): AlbumProgress | null {
  const mode = playableHere(album);
  if (mode === "soon" || mode === "desktop-only") return null;
  const key = mode === "demo" ? `${album.id}-demo` : album.id;
  const progress = loadProgress(key);
  const total = mode === "demo" ? album.demoTrackCount ?? album.tracks.length : album.tracks.length;
  const known = new Set((album.secrets ?? []).map((secret) => secret.id));
  return {
    found: Math.min(progress.found.length, total),
    total,
    completed: progress.completed,
    secrets: progress.secrets.filter((id) => known.has(id)),
    secretTotal: known.size,
  };
}

export function resetProgress(album: HubAlbum): void {
  clearProgress(album.id);
  clearProgress(`${album.id}-demo`);
}

export function normalize(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const searchText = (album: HubAlbum) =>
  normalize([album.artist, album.album, album.year, album.world?.name ?? "", ...album.tracks.map((t) => t.title)].join(" "));
