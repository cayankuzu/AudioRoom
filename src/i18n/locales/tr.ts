import type { LibraryLocaleBundle } from "../schema";

export const trLibraryLocale: LibraryLocaleBundle = {
  ui: {
    brandTitle: "AudioRoom",
    brandSubtitle: "Albüm Evrenleri",
    brandAriaLabel: "AudioRoom ana sahne",
    orbitAriaLabel: "3D albüm rafı",
    profileTitle: "Profil",
    profileStatus: "yakında",
    profilePopover: "Profil alanı çok yakında açılacak.",
    searchPlaceholder: "Şarkı, albüm veya sanatçı ara",
    mobileHints: {
      orientationTitle: "Daha iyi bir deneyim için telefonu yan çevirin.",
      orientationDescription:
        "Mümkünse klavye ve mouse bağlanabilen cihazlarda veya geniş ekranlarda kullanın.",
    },
    mobileWorldGate: {
      eyebrow: "Masaüstü deneyimi",
      title: "Bu evren mobilde açılamıyor",
      description:
        "Mobilde yalnızca Mükemmel Boşluk evrenine girilebilir. Bu evreni klavye, fare ve geniş ekranlı bir bilgisayarda açın.",
      dismiss: "Kütüphanede kal",
    },
    engagement: {
      title: "Topluluk",
      likes: "Beğeni",
      comments: "Yorum",
      shares: "Paylaşım",
      rating: "Yıldız",
    },
    filterButton: "Filtrele",
    filterPanelEyebrow: "Seçim alanı",
    filterPanelTitle: "Sanatçı, albüm, format ve durum",
    filterClear: "Filtreleri temizle",
    emptyResultsTitle: "Sonuç bulunamadı",
    emptyResultsWithFilters: "Aramayı veya aktif filtreleri değiştirin.",
    emptyResultsWithoutFilters:
      "Başka bir şarkı, albüm veya sanatçı adı deneyin.",
    selectedCount(count) {
      return `${count} seçili`;
    },
    artistSummaryDefault: "Alfabetik liste",
    albumSummaryDefault: "Albüm adına göre",
    formatSummaryDefault: "Albüm · Single · EP",
    availabilitySummaryDefault: "Yayında · Yakında",
    filterSections: {
      artists: "Sanatçılar",
      albums: "Albümler",
      formats: "Format",
      availability: "Durum",
    },
    detailBack: "Kütüphaneye dön",
    detailSections: {
      experience: "Deneyim",
      album: "Albüm",
      tracks: "Parçalar",
    },
    actions: {
      enterWorld: "Evrene gir",
      comingSoon: "Yakında",
      addToCart: "Sepete ekle",
      randomize: "Rastgele çevir",
      randomizing: "Çevriliyor...",
    },
    instagramLabel(artist) {
      return `${artist} Instagramı`;
    },
    trackCountLabel(count) {
      return `${count} parça`;
    },
    footerCopyright(year) {
      return `COPYRIGHT © ${year} AUDIOROOM`;
    },
    footerPoweredBy: "Powered by MeMoDe",
  },
  releaseTypeLabels: {
    album: "Albüm",
    single: "Single",
    ep: "EP",
  },
  availabilityLabels: {
    available: "Yayında",
    soon: "Yakında",
  },
  deviceSupportLabels: {
    desktop: "Masaüstü",
    "mobile-desktop": "Mobil + Masaüstü",
  },
  entries: {
    "beni-buyuten-sarkilar-vol-1": {
      worldLabel: "Biyolojik Kubbe",
      detailHeadline:
        "Kubbenin içine dağılan plakları toplayın ve merkezdeki gramofonda akışı yeniden kurun.",
      albumSummary:
        "Hayko Cepkin'in çocukluğunda iz bırakan şarkıları kendi vokal dili ve sert sahne yaklaşımıyla yeniden yorumladığı cover albüm.",
      experienceSummary:
        "Organik yüzeyler, sıcak parçacıklar ve canlı sahne ışığı arasında ilerleyin; her yerleştirilen plak deneyimi biraz daha açar.",
      detailNarrative: "",
      albumFacts: [
        "Yayımlanma tarihi: 29 Ocak 2016",
        "Parça sayısı: 9",
        "Albüm tipi: Cover albüm",
        "Yayımlayan: DMC",
      ],
      searchTerms: ["biyolojik kubbe", "organik sahne", "kor halkası"],
    },
    "kuantum-dolaniklik": {
      worldLabel: "Belirsizlik Rafı",
      detailHeadline:
        "Sizden kaçan plağın ya konumunu ya hızını ölçün, doğru anda yakalayıp gramofona takın.",
      albumSummary:
        "Henry the Lee'nin tek parçada kurduğu, kısa formda ilerleyen bağımsız single kaydı.",
      experienceSummary:
        "G ile konumu, H ile hızı ölçün; yaptığınız her seçim sahnenin düzenini değiştirir.",
      detailNarrative: "",
      albumFacts: [
        "Yayımlanma tarihi: 1 Şubat 2023",
        "Parça sayısı: 1",
        "Süre: 3:57",
        "Yayın biçimi: Bağımsız dijital single",
      ],
      searchTerms: ["kuantum", "heisenberg", "ölçüm", "konum", "hız"],
    },
    "klostrofobik-kaplumbaga": {
      worldLabel: "Havuç Takibi",
      detailHeadline:
        "Plağı kaçıran tavşanı havuçlarla önce yavaşlatın, sonra durdurun ve plağı elinden geri alın.",
      albumSummary:
        "Henry the Lee'nin 2020 tarihli tek parça single kaydı; kaplumbağa, kaçış ve sıkışmışlık imgelerini kendine özgü bir çizgi dünyasında buluşturuyor.",
      experienceSummary:
        "Sisli topografik arazide koşan tavşanı takip edin. İlk havuç onu yürüyüşe geçirir, ikinci havuç durdurur; yaklaşınca plak yeniden sizin olur.",
      detailNarrative:
        "Merkezde kaplumbağa ve albüm yazıları tek bir anıt gibi dönerken tavşan çevredeki düzensiz rotada plağı taşır. Hedefi okuyun, mesafeyi kapatın ve iki temiz isabet alın.",
      albumFacts: [
        "Yayımlanma tarihi: 13 Ağustos 2020",
        "Parça sayısı: 1",
        "Süre: 3:24",
        "Albüm tipi: Single",
        "Oyun döngüsü: Koş · yavaşlat · durdur · plağı al",
      ],
      searchTerms: ["kaplumbağa", "tavşan", "havuç", "plak", "takip", "single"],
    },
    "mukemmel-bosluk": {
      worldLabel: "Krater Oda",
      detailHeadline:
        "Dünyaya dağılmış plakları bulun, gramofona yerleştirin ve albümü sahnenin içinde dinleyin.",
      albumSummary:
        "Redd'in sertliği geri çekip atmosferi öne aldığı, içe dönük yapısıyla öne çıkan stüdyo albümü.",
      experienceSummary:
        "Taş yüzeyler ve rüzgâr yön hissini bozar; her teslim edilen plak sahneyi biraz daha açar.",
      detailNarrative: "",
      albumFacts: [
        "Yayımlanma tarihi: 4 Mart 2016",
        "Parça sayısı: 12",
        "Toplam süre: 49 dakika",
        "Yayımlayan: Pasaj Müzik",
        "Çizgi: Alternatif / atmosferik rock",
      ],
      searchTerms: ["krater", "plak", "gramofon", "gece yürüyüşü"],
    },
    "redd-21": {
      worldLabel: "Yakında",
      detailHeadline:
        "Bu albüm şu an kütüphane arşivinde duruyor; evren sahnesi daha sonra açılacak.",
      albumSummary:
        "Redd'in erken dönem repertuvarını geniş bir set halinde toplayan uzun form stüdyo albümü.",
      experienceSummary: "",
      detailNarrative: "",
      albumFacts: [
        "Yayımlanma tarihi: 2009",
        "Parça sayısı: 21",
        "Toplam süre: 1 saat 13 dakika",
        "Albüm tipi: Stüdyo albümü",
        "Yapı: Uzun format set",
      ],
      searchTerms: ["yakında", "albüm"],
    },
    "pink-floyd-dark-side-of-the-moon": {
      worldLabel: "Yakında",
      detailHeadline:
        "Bu albüm şu an arşivde yer alıyor; deneyim evreni daha sonra kütüphaneye eklenecek.",
      albumSummary:
        "Pink Floyd'un zaman, baskı ve gündelik döngüler etrafında kurduğu en bilinen konsept albümlerinden biri.",
      experienceSummary: "",
      detailNarrative: "",
      albumFacts: [
        "Yayımlanma tarihi: 1 Mart 1973",
        "Parça sayısı: 10",
        "Toplam süre: 42 dakika",
        "Albüm tipi: Konsept stüdyo albümü",
        "Odak: Zaman ve zihinsel döngüler",
      ],
      searchTerms: ["yakında", "pink floyd"],
    },
  },
};
