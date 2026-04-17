import coverFallback from "../assets/covers/mukemmel-bosluk.png";
import { ALBUM } from "./config";

export interface ExperienceCatalogItem {
  id: string;
  title: string;
  artist: string;
  tagline: string;
  description: string;
  /** Anında gösterilen yedek (dosya); playlist kapağı yüklenince güncellenir. */
  coverImage: string;
  /** Varsa: oEmbed ile bu listedeki albüm kapağı URL’si alınır (paneldeki playlist ile aynı). */
  playlistUrl?: string;
}

export const EXPERIENCE_CATALOG: ExperienceCatalogItem[] = [
  {
    id: "mukemmel-bosluk",
    title: "Mükemmel Boşluk",
    artist: "Redd",
    tagline: "Krater · plak · gramofon",
    description:
      "Plakları bul, gramofona tak, albümü adımla tamamla. Sessiz krater ve rüzgâr eşliğinde immersive bir tur.",
    coverImage: coverFallback,
    playlistUrl: ALBUM.playlistUrl,
  },
];
