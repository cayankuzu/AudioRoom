/**
 * Tüm albüm evrenlerinin merkezi kaydı.
 *
 * Her albüm, kendi alt klasöründe yaşamaya devam eder ve burada sadece
 * meta bilgisiyle (kapak, başlık, sanatçı, yol) hub'a tanıtılır.
 * Karta tıklandığında kullanıcı `path`'e yönlendirilir; ilgili klasörün
 * `index.html` dosyası kendi 3B deneyimini başlatır.
 */

export interface AlbumEntry {
  id: string;
  artist: string;
  title: string;
  tagline: string;
  /** Hub kapak görseli (kök public/covers/ altında) */
  cover: string;
  /** Tarayıcı path'i (vite multi-page entry) */
  path: string;
  /** Yıl, türler vs. — opsiyonel */
  year?: string;
  /** false ise grimsi placeholder gösterilir */
  available: boolean;
}

export interface ArtistGroup {
  id: string;
  name: string;
  albums: AlbumEntry[];
}

export const ARTISTS: ArtistGroup[] = [
  {
    id: "redd",
    name: "Redd",
    albums: [
      {
        id: "mukemmel-bosluk",
        artist: "Redd",
        title: "Mükemmel Boşluk",
        tagline: "Krater · plak · gramofon",
        cover: "./covers/haftanin-albumu-redd-00.jpg",
        path: "./redd/mukemmel_bosluk/",
        year: "2014",
        available: true,
      },
    ],
  },
  {
    id: "henry_the_lee",
    name: "Henry the Lee",
    albums: [
      {
        id: "kuantum-dolaniklik",
        artist: "Henry the Lee",
        title: "Kuantum Dolanıklığı",
        tagline: "Heisenberg · şeffaf küp · tek plak",
        cover: "./covers/kuantum_dolaniklik.png",
        path: "./henry_the_lee/kuantum_dolan%C4%B1kl%C4%B1%C4%9F%C4%B1/",
        available: true,
      },
    ],
  },
];
