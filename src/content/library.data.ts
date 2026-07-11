import { CANONICAL_TRACKS as REDD_TRACKS } from "../../depo/redd/mukemmel_bosluk/src/data/trackLibrary";
import { ALBUM as HENRY_ALBUM } from "../../depo/henry_the_lee/kuantum_dolanıklığı/src/config/config";
import { CANONICAL_TRACKS as HAYKO_TRACKS } from "../../depo/hayko_cepkin/Beni_Büyüten_Şarkılar_Vol.1/src/data/trackLibrary";
import type { LibraryEntryMetadata } from "./library.types";

const REDD_21_TRACK_TITLES = [
  "Çığlık",
  "Masal",
  "Oyun",
  "Astrotanrı",
  "Don Kişot",
  "Bir Şövalye Var İçinde",
  "Özgürlük Sırtından Vurulmuş",
  "Öyle Boş Ki Hayat",
  "Tamam Böyle Kalsın",
  "Vicdani Redd",
  "Seni Buldum",
  "Aşk Bu Kadar Zor Mu",
  "Her Neyse",
  "Aşktı Bu",
  "Sevsen de Sevmesen de",
  "Yaşandım Daha Çok",
  "Küçük Bir Çocukken",
  "Modern Adımlarla",
  "Plastik Çiçekler ve Böcek",
  "Dekadans",
  "Sükut",
] as const;

const KLOSTROFOBIK_TRACK_TITLES = ["Klostrofobik Kaplumbağa"] as const;

const DARK_SIDE_TRACK_TITLES = [
  "Speak to Me",
  "Breathe (In the Air)",
  "On the Run",
  "Time",
  "The Great Gig in the Sky",
  "Money",
  "Us and Them",
  "Any Colour You Like",
  "Brain Damage",
  "Eclipse",
] as const;

export const LIBRARY_ENTRY_METADATA: readonly LibraryEntryMetadata[] = [
  {
    id: "beni-buyuten-sarkilar-vol-1",
    artist: "Hayko Cepkin",
    artistUrl:
      "https://www.instagram.com/haykocepkin?igsh=MTZpdXhlN3lncDczOQ==",
    album: "Beni Büyüten Şarkılar Vol.1",
    year: "2016",
    cover: "./covers/beni_buyuyen_sarkilar_vol1.png",
    path: "./depo/hayko_cepkin/Beni_Büyüten_Şarkılar_Vol.1/",
    releaseType: "album",
    availability: "available",
    theme: {
      accent: "#ff8f57",
      aura: "rgba(255, 143, 87, 0.42)",
      glowTopRight: "rgba(131, 44, 28, 0.28)",
      glowBottomLeft: "rgba(109, 65, 34, 0.24)",
      foil: "rgba(255, 205, 118, 0.34)",
    },
    trackTitles: HAYKO_TRACKS.map((track) => track.title),
  },
  {
    id: "kuantum-dolaniklik",
    artist: "Henry the Lee",
    artistUrl:
      "https://www.instagram.com/henry_the_lee?igsh=b2RmemM0bDBhY3dm",
    album: "Kuantum Dolanıklık",
    year: "2023",
    cover: "./covers/kuantum_dolaniklik.png",
    path: "./depo/henry_the_lee/kuantum_dolanıklığı/",
    releaseType: "single",
    availability: "available",
    theme: {
      accent: "#e7d45a",
      aura: "rgba(231, 212, 90, 0.34)",
      glowTopRight: "rgba(103, 82, 26, 0.26)",
      glowBottomLeft: "rgba(73, 60, 22, 0.22)",
      foil: "rgba(255, 238, 152, 0.24)",
    },
    trackTitles: [HENRY_ALBUM.trackTitle],
    directTrackUrls: {
      [HENRY_ALBUM.trackTitle]: HENRY_ALBUM.playlistUrl,
    },
  },
  {
    id: "klostrofobik-kaplumbaga",
    artist: "Henry the Lee",
    artistUrl:
      "https://www.instagram.com/henry_the_lee?igsh=b2RmemM0bDBhY3dm",
    album: "Klostrofobik Kaplumbağa",
    year: "2020",
    cover: "./covers/klostrofobik-kaplumbaga.jpg",
    releaseType: "single",
    availability: "soon",
    theme: {
      accent: "#d6b36d",
      aura: "rgba(214, 179, 109, 0.34)",
      glowTopRight: "rgba(93, 76, 41, 0.24)",
      glowBottomLeft: "rgba(89, 118, 82, 0.18)",
      foil: "rgba(181, 120, 72, 0.22)",
    },
    trackTitles: KLOSTROFOBIK_TRACK_TITLES,
  },
  {
    id: "mukemmel-bosluk",
    artist: "Redd",
    artistUrl:
      "https://www.instagram.com/reddseyirdefter?igsh=cnNoNWVvdDdqcG5o",
    album: "Mükemmel Boşluk",
    year: "2016",
    cover: "./covers/mukemmel-bosluk-cover.jpg",
    path: "./depo/redd/mukemmel_bosluk/",
    releaseType: "album",
    availability: "available",
    theme: {
      accent: "#efe8dc",
      aura: "rgba(239, 232, 220, 0.34)",
      glowTopRight: "rgba(161, 154, 148, 0.18)",
      glowBottomLeft: "rgba(64, 64, 68, 0.24)",
      foil: "rgba(196, 34, 46, 0.28)",
    },
    trackTitles: REDD_TRACKS.map((track) => track.title),
  },
  {
    id: "redd-21",
    artist: "Redd",
    artistUrl:
      "https://www.instagram.com/reddseyirdefter?igsh=cnNoNWVvdDdqcG5o",
    album: "21",
    year: "2009",
    cover: "./covers/redd-21.jpg",
    releaseType: "album",
    availability: "soon",
    theme: {
      accent: "#ff5f76",
      aura: "rgba(255, 95, 118, 0.36)",
      glowTopRight: "rgba(144, 14, 30, 0.26)",
      glowBottomLeft: "rgba(79, 13, 12, 0.22)",
      foil: "rgba(255, 151, 83, 0.28)",
    },
    trackTitles: REDD_21_TRACK_TITLES,
  },
  {
    id: "pink-floyd-dark-side-of-the-moon",
    artist: "Pink Floyd",
    artistUrl: "https://www.instagram.com/pinkfloyd?igsh=dndjNTllMDVpdHh6",
    album: "The Dark Side of the Moon",
    year: "1973",
    cover: "./covers/dark-side-of-the-moon.jpg",
    releaseType: "album",
    availability: "soon",
    theme: {
      accent: "#8ec7ff",
      aura: "rgba(116, 186, 255, 0.32)",
      glowTopRight: "rgba(255, 74, 160, 0.24)",
      glowBottomLeft: "rgba(102, 84, 245, 0.2)",
      foil: "rgba(255, 211, 79, 0.22)",
    },
    trackTitles: DARK_SIDE_TRACK_TITLES,
  },
] as const;
