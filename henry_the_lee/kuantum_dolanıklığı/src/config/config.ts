/**
 * Kuantum Dolanıklığı — sahne, oyuncu ve kompozisyon parametreleri.
 *
 * Albüm felsefesi:
 *  - Tema: kuantum dolanıklığı + Heisenberg belirsizlik prensibi.
 *  - Renk dili: kapaktaki **mat sarı kutu** (4 duvar + tavan tek ton),
 *    içeride kuantum dalgalanan zemin + siyah ikon + krem yazılar.
 *  - Sahne monokrom + sarı vurgu; renk kayması istenmez.
 */

/**
 * Kutu evren — KARE TABAN, 42 m tavan.
 * Oyuncu kutu içinde gezinir; duvar/tavan/zemin = sınır.
 *
 * GEOMETRİ KURALI: X ve Z eksenleri her zaman `half * 2` ile eşit
 * boyutlandırılır (taban kare). Yalnızca Y (yükseklik) bağımsızdır.
 * Tüm dünya geometrisi (room.ts, waveFloor.ts, particles.ts, spawn.ts)
 * sadece `WORLD.half` üstünden ölçeklenir → asimetri imkânsız.
 *
 * `half` masaüstünde 166.5 m (333 m kutu); dokunmatikte `applyWorldScaleForInput`
 * ile 90 m (180 m kutu) yapılır — yalnızca telefon/tablet deneyimi.
 */
export const WORLD_HALF_DESKTOP = 166.5;
/** Dokunmatik: 180 m × 180 m taban → yarım kenar 90 m. */
export const WORLD_HALF_TOUCH = 90;

export const WORLD = {
  /** Kutunun yarım kenarı (metre); başlangıç masaüstü, sahne kurulumunda güncellenir. */
  half: WORLD_HALF_DESKTOP,
  /** Tavan yüksekliği (metre) — kompozisyon yukarıda asıldığı için yüksek. */
  ceilingHeight: 42,
  /**
   * Sis — derin amber-kahve; ufuk sarı duvarlardan yumuşakça ayrılır,
   * orta mesafe biraz daha “dolu” (atmosfer güçlendirildi).
   */
  fogColor: "#140e05",
  fogDensity: 0.0056,
};

/**
 * Oyun başlamadan, oda/parçacık/spawn kurulmadan hemen önce çağrılmalı.
 */
export function applyWorldScaleForInput(isTouch: boolean): void {
  WORLD.half = isTouch ? WORLD_HALF_TOUCH : WORLD_HALF_DESKTOP;
}

/**
 * Kuantum zemin — sürekli dalgalanan sıvı yüzey + ayak izi tepkisi.
 *  - Plane segmentleri düşük tutulur (48² köşe). Bump köşe başına ön
 *    hesaplanır; normal güncellemesi ızgara türevi + her 2. kare.
 *  - Ripple sistemi: oyuncu adım attıkça yere damla bırakır; halka şeklinde
 *    yayılarak söner.
 */
export const FLOOR = {
  /** Yüzey segment sayısı — düşük = çok daha az CPU (49² köşe @ 48). */
  segments: 48,
  /** Taban yüksekliği — dalganın "0" referansı. */
  baseY: 0,
  /**
   * Sürekli sinüs katmanları — **görünür ama yavaş** dalga.
   *
   * Tasarım dengesi:
   *  - Önceki "jöle" versiyonu: 5 katman, max amp 0.85 m, hız 2.85 → kötü
   *  - Önceki "donuk" versiyonu: 2 katman, max amp 0.18 m, hız 0.24 → kötü
   *  - Şimdi: 3 katman, mid amp (0.32–0.45 m), yavaş hız (0.45–0.85)
   *
   * Genlik ~0.4 m → flatShading ile dalga sırtları net gölgelenir,
   *                  oyuncu yürürken yumuşak ama belirgin tepecik hisseder.
   * Dalga boyları 12–35 m arası → tek bir ekranda 2-3 dalga görünür,
   *                                "okyanus üstünde yürüyorum" hissi.
   * Hız 0.5 civarı → dalga akışı görünür ama nazik, deniz nefesi.
   */
  waves: [
    /** Hafifçe yükseltildi (kullanıcı: "dalgalar ve vadiler daha güzel olsun").
     *  Genlik ~0.7 m → tepelerle vadiler arası ≈ 1.4 m, görünür ama yumuşak. */
    { angle: 0.32, k: 0.18, amp: 0.70, speed: 0.50 },
    { angle: 1.55, k: 0.30, amp: 0.50, speed: 0.62 },
    { angle: 2.85, k: 0.46, amp: 0.34, speed: 0.80 },
  ] as const,
  /**
   * Statik gauss tepe/çukurlar — rastgele büyüklükte, bazıları tepe (+),
   * bazıları çukur (-). Sahnede sabit kalırlar; sinüs dalgaları üstüne
   * binince "lumpy quantum landscape" hissi oluşur.
   *  - cx, cz: dünya konumu
   *  - sigma: tepenin yarıçap karakteristiği (metre)
   *  - amp: yükseklik (signed). Pozitif = tepe, negatif = çukur.
   */
  bumps: [
    /** Tepe + vadi genlikleri ~%30 yükseltildi — kullanıcı feedback'i:
     *  "dalgalar ve vadiler daha yüksek, daha güzel olsun". Pozitif amp =
     *  tepe, negatif = vadi. Sigma 4–14 m arası dağılım manzarayı çeşitli
     *  tutar (büyük dalga + küçük öbek). */
    { cx:  22, cz:   8, sigma: 7.5, amp:  3.6 },
    { cx: -28, cz:  18, sigma: 10.0, amp: -3.2 },
    { cx:  35, cz: -25, sigma: 12.0, amp:  4.8 },
    { cx: -45, cz: -10, sigma:  8.5, amp: -2.7 },
    { cx:  10, cz: -38, sigma:  6.0, amp:  2.9 },
    { cx: -15, cz:  42, sigma: 11.5, amp:  4.2 },
    { cx:  55, cz:  30, sigma:  9.0, amp: -3.4 },
    { cx: -55, cz: -45, sigma: 13.5, amp:  5.2 },
    { cx:  60, cz: -55, sigma:  7.0, amp: -2.3 },
    { cx: -10, cz:  -8, sigma:  4.5, amp:  1.9 },
    { cx:  42, cz:  60, sigma: 10.5, amp: -3.7 },
    { cx: -65, cz:  20, sigma:  6.5, amp:  2.6 },
    { cx:  -2, cz:  68, sigma:  8.0, amp: -2.8 },
    { cx:  72, cz:   5, sigma:  9.5, amp:  3.4 },
    { cx: -38, cz:  65, sigma:  7.5, amp: -2.4 },
    { cx:  18, cz:  28, sigma:  5.5, amp:  1.8 },
  ] as const,
  /**
   * Adım ripple parametreleri — gözle okunur ama orta yoğunluk.
   * Yürürken her adım altında bir halka çıkar, ~1.2 sn'de yok olur.
   */
  step: {
    distance: 1.0,
    amplitude: 0.32,
    speed: 7.5,
    decay: 1.2,
    maxAlive: 12,
  },
} as const;

export const PLAYER = {
  /** Başlangıç — merkezden geride, kompozisyona bakar. */
  startPosition: { x: 0, y: 0, z: 26 },
  eyeHeight: 1.65,
  bodyRadius: 0.45,
  walkSpeed: 5.2,
  sprintSpeed: 9.4,
  jumpImpulse: 5.6,
  gravity: 17,
  accelGround: 14,
  accelAir: 3,
} as const;

export const CAMERA = {
  fov: 70,
  near: 0.08,
  far: 600,
} as const;

/** rad/s — tüm merkez kompozisyon (ikon + 2 yazı) aynı eksende dönüyor. */
export const ROTATION = {
  /** Mukemmel Boşluk ile aynı tempo (0.018 rad/s). */
  composition: 0.018,
} as const;

/**
 * Merkez kompozisyon yerleşimi — alttan üste: artist → album → ikon.
 * Hepsi yerden YÜKSEK durur; oyuncu ortada yürürken altından geçebilir.
 */
export const COMPOSITION = {
  /** "HENRY THE LEE" satırının Y'si. */
  artistY: 11.0,
  /** "KUANTUM DOLANIKLIĞI" satırının Y'si. */
  titleY: 14.5,
  /** Siyah GLB ikonun merkez Y'si — odanın üst yarısında asılı. */
  iconY: 22.5,
  /** GLB ikonun maksimum boyutu (metre) — kapaktaki kedi-ip büyüsün.
   *  Daha büyük: net görünür, "tapınak" hissi. */
  iconSize: 13.5,
  /**
   * GLB ikonun Y eksenindeki ekstra dönüş ofseti (rad).
   * Model varsayılan import'ta arkadan görünüyordu; π eklersek doğru
   * yüze döner. Spinning grup zaten Y'de döndüğü için bu, modelin
   * lokal frame'i içinde sabit bir başlangıç ofsetidir.
   */
  iconYawOffset: Math.PI,
  /** Hafif idle nefes — y eksenine sinüs ofseti. */
  breatheAmplitude: 0.08,
} as const;

/**
 * Plak (vinyl) — yerden hafif yüksekte, düz hızlı süzülür.
 *
 * Fizik:
 *  - 2D hareket (XZ); zemin dalgasını Y'de takip eder ama kendi yüksekliği
 *    yok (yer hizası + clearance).
 *  - Hız vektörü her `velocityChangeInterval` sn'de bir rastgele değişir
 *    (yön + büyüklük). Büyüklük `[minSpeed, maxSpeed]` aralığında.
 *  - Duvarlara çarpınca seker (mükemmel elastik).
 *  - Minimum hızda oyuncu rahatça yakalayabilir; max hızda zorlu.
 */
export const VINYL = {
  /** Disk yarıçapı + kalınlık (metre). Gramofon platter felt yarıçapı
   *  ~0.22 m olduğundan plak da o civarda olmalı; aksi halde tablanın
   *  üstüne sığmıyor görünüyor. 0.30 m → görsel olarak doğru oran. */
  radius: 0.30,
  thickness: 0.024,
  /** Yerden yükseklik (clearance) — dalgayı Y'de takip eder, üstüne bu eklenir. */
  hoverY: 0.30,
  /**
   * Hız sınırları (m/s).
   *  - Oyuncu yürüme: 5.2, koşma: 9.4 m/s.
   *  - minSpeed < koşma (yakalanabilir).
   *  - maxSpeed > koşma (yakalanamaz; oyuncuyu kaçırır).
   * Her 3 sn'de [min, max] aralığından rastgele büyüklük seçilir.
   */
  minSpeed: 2.6,
  maxSpeed: 13.0,
  /** Yön + büyüklüğün rastgele değişme periyodu (sn). */
  velocityChangeInterval: 3,
  /** Diskin kendi ekseninde dönme hızı (rad/s). */
  spin: 5.0,
  /** Diskin tilt açısı (rad) — sahnede daha sinematik. */
  tilt: 0.18,
  /** Duvardan bu mesafe kala seker (sınır marjı). */
  margin: 1.4,
  /** Yakalama mesafesi (m) ve yakalama için maksimum hız eşiği (m/s).
   *  Bu eşik üstündeyken yakalama başarısız olur. */
  catchRadius: 1.5,
  catchMaxSpeed: 1.5,
} as const;

/** Gramofon — varsayılan fallback konum + yaw. Çalışma anında `gameLoop`
 *  rastgele bir spawn üretir; bu sabitler sadece yedek olarak kalır. */
export const GRAMOPHONE = {
  position: { x: -18, z: -10 },
  yaw: Math.PI * 0.2,
} as const;

/**
 * Spawn kuralları — her açılışta kedi, gramofon, plak rastgele yerlerde
 * doğsun. Çakışma engelleme:
 *  - Duvar marjı: 8 m
 *  - Merkez kompozisyon (0,0) etrafı: 18 m yasak
 *  - Oyuncu başlangıç noktası etrafı: 14 m yasak
 *  - Birbirleri arası min mesafe: 16 m
 */
/**
 * Schrödinger'in kedisi — tek hız parametresi (random walk).
 * Eski 1.4 m/s "yavaş" hissediyordu; oyuncu (5.2 m/s yürüme) yanından
 * geçerken bile kedi neredeyse durağan görünüyordu. Şimdi ~3.0 m/s ile
 * canlı bir "tıpış-tıpış" temposu — yine yakalanabilir kalır.
 *
 * Kaçma davranışı: oyuncu `fleeTrigger` mesafesine girince kedi
 * `fleeSpeed` ile karşı yönde hedef alır; oyuncu uzaklaşınca normal
 * random-walk'a döner.
 */
export const CAT = {
  /** Yürüme hızı (m/s). */
  walkSpeed: 3.0,
  /** Kaçış tetik mesafesi (m) — bu yarıçap içinde oyuncu varsa kaçar. */
  fleeTrigger: 9.0,
  /** Kaçışta hız (m/s) — koşan oyuncuya yakalanabilir ama zorlu. */
  fleeSpeed: 6.5,
  /** Kaçışta hedef nokta uzaklığı (m). */
  fleeDistance: 18.0,
} as const;

/**
 * Carry / interaction sistemi — E (al/yerleştir) ve Q (bırak) için
 * mesafe ve ofsetler.
 */
export const CARRY = {
  /** Plağı/gramofonu yerden kaldırma yarıçapı (m). */
  pickupRange: 3.6,
  /** Gramofonun yanına gidip plağı tabanına yerleştirme yarıçapı (m). */
  placeRange: 3.2,
  /** Plak elde tutulurken kameranın önünde duracağı offset.
   *  Z negatif = ileri (kamera lokal -Z forward). */
  vinylHold: { x: 0.32, y: -0.55, z: -0.95 },
  /** Gramofon taşırken oyuncunun önünde duracağı XZ offset (dünya).
   *  Y daima zemine yapışır. */
  gramHoldDistance: 3.4,
} as const;

export const SPAWN = {
  wallMargin: 8,
  centerExclusion: 18,
  playerExclusion: 14,
  pairwiseMin: 16,
  attempts: 80,
} as const;

/**
 * Heisenberg ölçer — anlık ölçümler.
 *  - Tek seferde ya KONUM ya HIZ gözlemlenir; eşzamanlı değil.
 *  - Görünüm süresi sınırlı; sönerek kaybolur.
 *  - Yeniden ölçüm için cooldown.
 */
export const MEASUREMENT = {
  /** Sonucun tam görünür kaldığı süre (sn). */
  showDuration: 2.0,
  /** Sönme süresi (sn). */
  fadeDuration: 0.8,
  /**
   * Ölçümler arası cooldown (sn) — sürekli ölçümü engelle.
   * K ve H **ortak cooldown** kullanır (kuantum gözlem prensibi:
   * arka arkaya iki gözlem yapılamaz). Birine basınca diğer 5 sn pasif.
   */
  cooldown: 5.0,
} as const;

/** Renk paleti — sahne genelinde tek kaynaklı sabitler. */
export const PALETTE = {
  /** Albüm kapağındaki mustard sarısı — duvar + tavan ana tonu. */
  coverYellow: "#f3c012",
  /** Aynı sarının çok hafif daha sönüğü (tavan için). */
  coverYellowSoft: "#e0b00f",
  /** Duvar lattice / gölge çizgileri için derin sarı-kahve. */
  wallShadow: "#7a5c08",
  /** Genel boşluk siyahı. */
  void: "#0b0905",
  void2: "#15110a",
  /** Genel sarı vurgular (parıltılar). */
  amber: "#f5c518",
  amberDeep: "#a07e08",
  amberWarm: "#ffd84d",
  /** Yazı için krem-beyaz — sarı kutu üstünde net okunur. */
  textCream: "#fbf6df",
  /** İkon ve siyah objeler için derin mat siyah. */
  inkBlack: "#0a0805",
} as const;

/**
 * Albüm meta — tek parça: "Kuantum Dolanıklık" (kullanıcı talebiyle başlık
 * şarkı adı olarak kullanılıyor; radyo mix sonrası ek parçalar otomatik gelir).
 * YouTube radyo mix listesi (`RDqcOZtrA6eEk`) ile ana parça öncelikli olarak
 * çalınır; mix sürer.
 */
export const ALBUM = {
  artist: "Henry the Lee",
  title: "Kuantum Dolanıklık",
  trackTitle: "Kuantum Dolanıklık",
  videoId: "qcOZtrA6eEk",
  /** YouTube otomatik radyo mix id (RD + videoId). */
  playlistId: "RDqcOZtrA6eEk",
  playlistUrl:
    "https://www.youtube.com/watch?v=qcOZtrA6eEk&list=RDqcOZtrA6eEk&start_radio=1",
} as const;

/**
 * Mesafe-bazlı ses kazancı — gramofona uzaklaştıkça ses kısılır.
 *  - nearRadius'a kadar tam seviye
 *  - farRadius sonrası minGain
 *  - smoothing → her frame yumuşak lerp
 */
export const AUDIO_DISTANCE = {
  nearRadius: 6,
  farRadius: 80,
  minGain: 0.05,
  smoothingPerSec: 4.0,
} as const;

/**
 * Asset yolları — index.html `public/` köküne göre relative yazıyoruz çünkü
 * vite kök config'inde `base: "./"` var. Sayfa
 * `/henry_the_lee/kuantum_dolanıklığı/` altında çalıştığından `../../` ile
 * server köküne çıkıp public içine ulaşıyoruz.
 */
export const ASSETS = {
  fontRegular: "../../assets/fonts/gentilis_regular.typeface.json",
  fontBold: "../../assets/fonts/gentilis_bold.typeface.json",
  /** Merkez ikon — Meshy AI ile üretilmiş GLB. */
  iconModel: "../../henry_the_lee/kuantum_dolaniklik/models/album_altar.glb",
  /** Schrödinger'in kedisi — STL (vertex normaller hesaplanır). */
  catModel: "../../henry_the_lee/kuantum_dolaniklik/models/cat-sphynx.stl",
} as const;
