import type { AlbumData } from "../../engine/album";

export const ALBUM: AlbumData = {
  meta: {
    id: "klostrofobik-kaplumbaga",
    artist: "Henry the Lee",
    album: "Klostrofobik Kaplumbağa",
    year: "2020",
    cover: "covers/klostrofobik-kaplumbaga.jpg",
    accent: "#d24a26",
    accentInk: "#fff5e6",
    displayFont: "'Courier Prime', monospace",
    font3d: "courier-prime-400",
    description:
      "Kapaktaki ebru kâğıdının içindesin. Kabuğunun üstünde gitar çalan kaplumbağanın çevresinde kırmızı ceketli Beyaz Tavşan koşuyor — ve şarkının plağı onun elinde.",
    mechanic: {
      name: "Yavaş Olanın Masalı",
      text: "Tavşan senden hızlı. Havuçla üç kez vurursan sersemler; ya da C ile kabuğuna çekil ve sabret: tavşan merak edip yanına gelir, kabuktan çıktığın an irkilir. Sersemken plağı kap, gramofona tak. Tavşan deliklerine gir: huniden aşağı kayar, fenerinin ışığında dar toprak tünelde sürünür, karşı deliğe tırmanarak çıkarsın. Şarkı başlayınca kısa film başlar: duvar yok, evrenin kendisi daralır. Kâğıdın ötesindeki karanlık dizeden dizeye yaklaşır, kabuğun içindeki ev küçülür; adam duvarı iter, çatalla çorba içmeye çalışır, tavşan kazıp kaçar; geri çekilince bütün kâğıdın dev bir kabuğun içinde olduğu görülür.",
    },
    controls: [
      { keys: "W A S D", label: "Yürü" },
      { keys: "Fare", label: "Bak ve nişan al" },
      { keys: "Sol tık / F", label: "Havuç at" },
      { keys: "C", label: "Kabuğa çekil · tünele gir (basılı)" },
      { keys: "Shift", label: "Koş" },
      { keys: "E", label: "Plağı kap · tak · boya damlat" },
      { keys: "R", label: "Çal / durdur" },
      { keys: "G", label: "Gramofonu kucağına al / yere koy" },
      { keys: "V", label: "Şarkının klibini izle / serbest dolaş" },
      { keys: "K", label: "Klibi kapat / aç (müzik sürer)" },
      { keys: "T", label: "Bakış açısı: birinci / üçüncü kişi" },
      { keys: "ESC", label: "Menü ve ayarlar" },
    ],
    credits: [
      "Henry the Lee — Klostrofobik Kaplumbağa · 13 Ağustos 2020",
      "Söz, müzik ve prodüksiyon: Henry the Lee",
      "Şarkı resmi YouTube kaynağından çalınır.",
    ],
  },
  tracks: [
    {
      id: "klostrofobik-kaplumbaga",
      order: 1,
      title: "Klostrofobik Kaplumbağa",
      videoId: "NT6uepCbmEo",
      mood: "Herkes koşarken sen yavaşsın; belki de hayat buna göre.",
    },
  ],
  device: "desktop",
  secrets: [{ id: "soz-sinavi", title: "Ezberden", text: "Sınavı geçtin. Tavşan hızlıydı ama soruları sen bildin." }],
  hub: {
    releaseType: "single",
    artistUrl: "https://www.instagram.com/henry_the_lee",
    path: "worlds/klostrofobik-kaplumbaga/",
    summary:
      "Henry the Lee'nin 2020 teklisi. Kalabalığa ve hıza uymayan, kendi kabuğuna sığmayan birinin şarkısı. Kapakta ebru kâğıdı üzerinde kabuğunun üstünde gitar çalan bir kaplumbağa ve kırmızı ceketli Beyaz Tavşan var.",
    facts: [
      ["Yayın", "13 Ağustos 2020"],
      ["Format", "Single · 3:24"],
      ["Söz, müzik, prodüksiyon", "Henry the Lee"],
      ["Tür", "Türkçe rock · indie · post-punk"],
    ],
    world: {
      name: "Ebru",
      duration: "Tek şarkı · ~8 dk · yalnızca masaüstü",
      highlights: [
        "Kapaktaki ebru kâğıdının içindesin; zemin ve gökyüzü akan bir marmorlama.",
        "Yere bakıp E ile boya damlat: battal ebru gibi halka halka açılır; yürüdükçe ayak izlerin de boyanır.",
        "Plağı kaçıran Beyaz Tavşan'ı havuçla sersemlet ya da kabuğuna çekilip sabırla bekle.",
        "Tavşan deliklerine gerçekten girersin: huniden kayar, köklerin arasında sürünür, karşı delikten çıkarsın.",
        "Klip bir kısa film: duvar yok, evrenin kendisi daralır. Kabuğun içindeki ev küçülür, çatal çorbadan kalkar, tavşan kazıp kaçar; sonda bütün kâğıt dev bir kabuğun içinde çıkar.",
      ],
    },
    listenUrl: "https://www.youtube.com/watch?v=NT6uepCbmEo",
  },
};
