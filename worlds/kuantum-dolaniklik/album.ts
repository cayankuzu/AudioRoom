import type { AlbumData } from "../../engine/album";

export const ALBUM: AlbumData = {
  meta: {
    id: "kuantum-dolaniklik",
    artist: "Henry the Lee",
    album: "Kuantum Dolanıklık",
    year: "2023",
    cover: "covers/kuantum-dolaniklik.jpg",
    accent: "#f3c012",
    accentInk: "#141008",
    displayFont: "'Cormorant Garamond', serif",
    font3d: "cormorant-500",
    description:
      "Kapaktaki sarı kutunun içindesin. Duvarda göz kırpan bir yüz; gülümsemesi iki ucu ilmekli bir halat. Tek bir plak var ve o, senin aynan.",
    mechanic: {
      name: "Dolanıklık",
      text: "Plak, odanın öbür ucunda seni ayna gibi taklit eden dolanık ikizinin elinde: sen nereye yürürsen o tam karşı noktaya yürür. Gramofonun karşısındaki halkaya yürü, ikizin plağı gramofonun üstüne getirsin; E ile ölç: dalga çöker, şarkı başlar. Şarkı başlayınca her dize kutuda bir şeyi değiştirir: çiçekler açar, ay iner, bilekler bağlanır, bir kadeh uzanır, boynuna tasma geçer.",
    },
    controls: [
      { keys: "W A S D", label: "Yürü (plak seni yansıtır)" },
      { keys: "Fare", label: "Bak" },
      { keys: "Shift", label: "Koş" },
      { keys: "Boşluk", label: "Zıpla" },
      { keys: "E", label: "Ölç · plağı çöktür · ikizleri ölç" },
      { keys: "R", label: "Çal / durdur" },
      { keys: "G", label: "Gramofonu kucağına al / yere koy" },
      { keys: "V", label: "Şarkının klibini izle / serbest dolaş" },
      { keys: "K", label: "Klibi kapat / aç (müzik sürer)" },
      { keys: "T", label: "Bakış açısı: birinci / üçüncü kişi" },
      { keys: "ESC", label: "Menü ve ayarlar" },
    ],
    credits: [
      "Henry the Lee — Kuantum Dolanıklık · 1 Şubat 2023",
      "Söz ve müzik: Henry the Lee",
      "Şarkı resmi YouTube kaynağından çalınır.",
    ],
  },
  tracks: [
    {
      id: "kuantum-dolaniklik",
      order: 1,
      title: "Kuantum Dolanıklık",
      videoId: "qcOZtrA6eEk",
      mood: "Her şey birbirine bağlı: sen kıpırdarsan o da kıpırdar.",
    },
  ],
  device: "desktop",
  secrets: [
    { id: "kadeh", title: "Kadeh", text: "Kadehi masaya geri koydun. Sadece sana sorulsaydı içmezdin." },
    { id: "gamze", title: "Kıyamet Gamzesi", text: "Gülüşü tamamladın ve kıyamet koptu. Her şey bir gamzeye bağlıymış." },
    { id: "soz-sinavi", title: "Ezberden", text: "Sınavı geçtin. Kutunun içinde her şey belirsizdi; sen yine de doğru şıkları bildin." },
  ],
  hub: {
    releaseType: "single",
    artistUrl: "https://www.instagram.com/henry_the_lee",
    path: "worlds/kuantum-dolaniklik/",
    summary:
      "Henry the Lee'nin 2023 teklisi. Birbirine bağlı iki insanı kuantum fiziğinin en tuhaf kavramıyla anlatan, kararlı bir post-punk şarkısı. Kapakta gülümsemesi iki ucu ilmekli bir halattan oluşan, göz kırpan bir yüz var.",
    facts: [
      ["Yayın", "1 Şubat 2023"],
      ["Format", "Single · 3:57"],
      ["Söz ve müzik", "Henry the Lee"],
      ["Tür", "Türkçe rock · post-punk"],
    ],
    world: {
      name: "Sarı Kutu",
      duration: "Tek şarkı · ~5 dk · yalnızca masaüstü",
      highlights: [
        "Kapaktaki sarı kutunun içindesin; duvarda göz kırpan yüz ve halat gülümseme.",
        "Plak, seni ayna gibi taklit eden mürekkep ikizinin elinde: sen yürüdükçe o odanın karşı noktasına yürür.",
        "Her dize odayı değiştirir: açan çiçekler, tavandan inen ay, bağlanan bilekler, uzanan kadeh, boynuna geçen tasma.",
        "Klip bir kısa film: bir adam, bir kadın; iki çiçek sırayla açıp solar, Ay'a çıkan yolda kadın gömlek cebinde, tasma ve aynada ters roller, saydam bir koza, yeşil kadeh, yanaktaki gamzede bir evren ve tek silüete dönen iki kalp.",
        "Schrödinger'in kedisi yalnızca ona bakmadığında yürür.",
      ],
    },
    listenUrl: "https://www.youtube.com/watch?v=qcOZtrA6eEk",
  },
};
