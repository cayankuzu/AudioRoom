import type { AlbumMeta } from "../types";

export const WORLD = {
  size: 320,
  segments: 280,
  boundary: 130,
  craterCenter: { x: 0, z: 0 },
  /** Daha yayvan / sakin çanak — geniş ama derin değil. */
  craterDepth: 3.6,
  craterRadius: 46,
  craterRimRadius: 58,
  /** Çanak yumuşatma katsayısı — 0.5..1.5 arası; düşük = yayvan. */
  craterShape: 0.55,
} as const;

export const PLAYER = {
  startPosition: { x: 34, y: 3, z: 44 },
  eyeHeight: 1.7,
  crouchEyeHeight: 1.05,
  bodyRadius: 0.45,
  walkSpeed: 4.8,
  sprintSpeed: 8.5,
  crouchSpeed: 2.2,
  jumpImpulse: 5.4,
  gravity: 16,
  accelGround: 12,
  accelAir: 3,
} as const;

export const FOOTPRINT = {
  /** Yürürken iki iz arasındaki hedef mesafe. Koşuda kendiliğinden düşer. */
  stepDistance: 1.05,
  /** İz ömrü (saniye) — siyah kumda belirgin kalması için artırıldı. */
  lifetime: 14,
  maxCount: 180,
  /** Ayak izi boyutu — metre. Biraz büyütüldü ki kumda net görünsün. */
  size: { w: 0.48, l: 0.86 },
  /** Yanal kayma (sol-sağ). */
  sideOffset: 0.21,
  /** Başlangıç opaklık — daha belirgin ama abartısız. */
  opacity: 0.92,
} as const;

export const CAMERA = {
  fov: 68,
  near: 0.08,
  far: 900,
  bobStrength: 0.035,
  breathStrength: 0.012,
} as const;

/**
 * rad/s — figür + "MÜKEMMEL BOŞLUK" + "REDD" aynı `compositionGroup` içindedir
 * ve hepsi TEK bir rotasyon kaynağından — `composition` — beslenir.
 */
export const ROTATION = {
  composition: 0.018,
} as const;

/** Krater tabanına göre tüm kompozisyon parametreleri. */
export const COMPOSITION = {
  baseLift: 4.25,
  /** Figür pivotu: yazı tabanından ekstra yükseltme (havada durur). */
  figureWorldLift: 7.15,
  /** Figür yumuşak levitasyon genliği (sinüs), metre. */
  figureLevitationAmplitude: 0.55,
  /**
   * Figür kompozisyonun merkezinden ne kadar öne kaysın?
   * 0 = tam merkezli (yazılarla eş eksen).
   * Kullanıcı isteği: "Figür tam ortada olsun". → 0
   */
  figureForwardOffset: 0,
  /** textSpin yerel Y: "MÜKEMMEL BOŞLUK". */
  titleExtraY: 5.2,
  /** textSpin yerel Y: "REDD". */
  artistExtraY: 0.35,
  /**
   * Güneş konumu — figürün tam kafa arkasında hizalanır. `viewerDirSign`
   * oyuncunun başlangıç bakış yönünün tersindedir (backlight). Yükseklik
   * figür kafa seviyesinin biraz üstünde tutulur → güçlü silüet.
   */
  sunHeight: 16,
  sunDistance: 110,
  sunDiskOpacity: 0.22,
  sunDiskRadius: 5.4,
  /** Figür kafasının yaklaşık local Y'si (fallback; GLB yüklendiğinde güncellenir). */
  figureHeadLocalY: 2.15,
} as const;

/** F tuşu ile aç-kapat fener (kamera tabanlı spotlight). Güçlü ama kontrollü. */
export const FLASHLIGHT = {
  color: "#fbf3d7",
  /** Ana ışın gücü — karanlıkta fark yaratır. */
  intensity: 38,
  /** Menzil — uzaktaki kaya/yazıları aydınlatabilsin. */
  distance: 90,
  /** Koni açısı (radyan). */
  angle: Math.PI / 5.6,
  /** Yumuşak kenar. */
  penumbra: 0.58,
  /** Mesafe ile zayıflama — realistik azalma. */
  decay: 1.25,
  /** Kafa hissi — gözlerin biraz önünden ışıldıyor. */
  offset: { x: 0.22, y: -0.08, z: -0.4 },
  /** Hedef — kameranın önünde. */
  targetForward: 14,
} as const;

/** Sağ üst UI — sahne genel parlaklığı (exposure). */
export const BRIGHTNESS = {
  min: 0.45,
  max: 2.1,
  default: 1.18,
  step: 0.02,
} as const;

/**
 * Oyuncunun GRAMOFON'a (ses kaynağı) uzaklığına göre müzik seviyesi.
 * Paneldeki slider kullanıcı tarafında kalır; gerçek YouTube ses seviyesi
 * = slider × distanceGain.
 *
 * Yeni kalibrasyon — daha "fiziksel" his:
 *  - Çok yakın (≤6m): tam seviye (elinizde çalıyormuş gibi)
 *  - Orta mesafe (6..28m): smoothstep düşüş
 *  - Uzak (≥70m): neredeyse duyulmaz (%6)
 */
export const AUDIO_DISTANCE = {
  /** Bu mesafeye kadar ses tam seviyede. */
  nearRadius: 6,
  /** Bu mesafeden sonra minimum seviyeye düşer. */
  farRadius: 70,
  /** Uzak minimum kazancı (0 = tamamen sessiz, 1 = hiç değişmez). */
  minGain: 0.06,
  /** Yumuşak geçiş süresi (saniyede lerp katsayısı). */
  smoothingPerSec: 4.0,
} as const;

export const ALBUM: AlbumMeta = {
  artist: "Redd",
  title: "Mükemmel Boşluk",
  playlistId: "PLN7Mz22vezPbWRsVI4PnhcVp34U08e6X8",
  playlistUrl:
    "https://www.youtube.com/playlist?list=PLN7Mz22vezPbWRsVI4PnhcVp34U08e6X8",
} as const;
