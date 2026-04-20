/**
 * Hayko Cepkin — Beni Büyüten Şarkılar Vol.1
 * Sahne, oyuncu ve kompozisyon parametreleri.
 *
 * Albüm felsefesi:
 *  - Tema: rahim / kor halka / ilk nefes — bebek süzülürken sıcak bokeh
 *    ışıkları derinde nabız atar. Oyuncu rahim içinde kan damarlarının
 *    arasında gezinir, plakları toplar ve gramofona takarak albümü dinler.
 *  - Renk dili: koyu kan kırmızısı arka plan + kor turuncu vurgu + amber
 *    sıcak ışıklar. "İçeride doğmadan önce" hissi.
 */

import type { AlbumMeta } from "../types";

export const WORLD_HALF_DESKTOP = 140;
export const WORLD_HALF_TOUCH = 80;

export const WORLD = {
  half: WORLD_HALF_DESKTOP,
  /** Yatay sınır — vinyl yerleştirme ve hareket için. */
  boundary: 110,
  /** "Kubbe" tavanı — sahne üstte yumuşak bir koyu yarımküre ile kapanır. */
  domeRadius: 240,
  /** Yatay görünür alan — fog ile sınırlandırılır, "sınırsız rahim". */
  fogColor: "#1a0604",
  fogDensity: 0.0095,
  /** Kompozisyon merkezi — bebek, ışık ve kan damarı nüvesi burada. */
  centerPiece: { x: 0, z: 0 },
};

export function applyWorldScaleForInput(isTouch: boolean): void {
  WORLD.half = isTouch ? WORLD_HALF_TOUCH : WORLD_HALF_DESKTOP;
  WORLD.boundary = isTouch ? 70 : 110;
}

/**
 * Zemin — koyu kan kırmızısı süzülen düz yüzey, hafif sinüs dalgası.
 * Bebek "yer çekiminden bağımsız" duruyor; oyuncu altından geçebilir.
 */
export const FLOOR = {
  segments: 96,
  baseY: 0,
  waves: [
    { angle: 0.42, k: 0.16, amp: 0.35, speed: 0.32 },
    { angle: 1.65, k: 0.28, amp: 0.22, speed: 0.45 },
    { angle: 2.34, k: 0.62, amp: 0.08, speed: 0.7 },
  ] as const,
  step: {
    distance: 1.1,
    amplitude: 0.16,
    speed: 6.0,
    decay: 1.4,
    maxAlive: 10,
  },
} as const;

export const PLAYER = {
  /** Başlangıç — bebeğin biraz gerisinden, ona doğru bakar. */
  startPosition: { x: 0, y: 0, z: 22 },
  eyeHeight: 1.65,
  bodyRadius: 0.45,
  walkSpeed: 5.0,
  sprintSpeed: 9.0,
  jumpImpulse: 5.6,
  gravity: 17,
  accelGround: 14,
  accelAir: 3,
} as const;

export const CAMERA = {
  fov: 68,
  near: 0.08,
  far: 600,
} as const;

/** rad/s — merkez kompozisyon (bebek + 2 yazı) aynı eksende dönüyor. */
export const ROTATION = {
  composition: 0.020,
} as const;

/**
 * Merkez kompozisyon yerleşimi — kapaktaki sıralama:
 *   üstte: HAYKO CEPKIN
 *   ortada: bebek (ikon)
 *   altta: BENİ BÜYÜTEN ŞARKILAR VOL.1
 */
export const COMPOSITION = {
  /** "BENİ BÜYÜTEN ŞARKILAR VOL.1" satırının Y'si — bebeğin altında. */
  subtitleY: 4.5,
  /** Bebek ikonun merkez Y'si — orta yükseklik, oyuncu altından geçebilir. */
  iconY: 9.0,
  /** "HAYKO CEPKIN" satırının Y'si — bebeğin üstünde. */
  artistY: 14.5,
  /** GLB ikonun maksimum boyutu (metre). */
  iconSize: 7.5,
  /**
   * Modelin Y ekseni etrafında ek rotasyonu (radyan).
   * Quaternion bestesinde EN SON uygulanır → dünya +Y etrafında
   * orient sonrası "yatay yön çevirme". 0 = modelin doğal yönü.
   * iconGroup zaten yavaşça Y'de döndüğü için bu sadece başlangıç
   * fazı belirler.
   */
  iconYawOffset: -Math.PI / 2,
  /**
   * Bebek rotasyonu — albüm kapağındaki gibi (baş yukarıda, fetal kıvrım
   * korunarak hafif geriye yatık).
   *
   * Meshy modeli zaten kıvrılmış fetus pozunda export edilmiş; bu yüzden
   * fazladan dünya-eksen flip uygulamaya gerek yok. Yalnızca:
   *   iconPitch (X): hafif geriye yaslan (kapakta da hafif tilt var).
   *   iconRoll  (Z): omurga dik kalsın diye 0.
   *
   * iconYawOffset (Y) modelin yüzünü kameraya doğru çevirmek için
   * kullanılır.
   */
  iconPitch: -Math.PI / 8 + Math.PI / 6,
  iconRoll: 0,
  /** Hafif idle nefes — y eksenine sinüs ofseti. */
  breatheAmplitude: 0.10,
} as const;

/** Renk paleti — albüm kapağındaki kor & rahim tonları. */
export const PALETTE = {
  /** Derin kan kırmızısı — arka plan / fog. */
  bloodDeep: "#1a0604",
  /** Koyu maroon — uzak alan. */
  maroon: "#3a0e08",
  /** Et tonu — orta menzil rahim. */
  flesh: "#7a2418",
  /** Sıcak kor turuncu — ana aksan (UI ve vurgular). */
  ember: "#d65a36",
  /** Soft kor — bokeh için. */
  emberSoft: "#ff8a4a",
  /** Sıcak amber — vurgular ve ışık halkaları. */
  amber: "#f0a060",
  /** Sıcak krem — yazılar için, kan kırmızı zeminde okunur. */
  cream: "#fbe4c8",
  /** Bebek için ten tonu — modelden yüklenirse override edilir. */
  babySkin: "#c47358",
  /** Derin gölge. */
  ink: "#0a0302",
  /** Kan damarı tonu — vasküler ağ için. */
  vessel: "#5a0a0a",
} as const;

/**
 * Atmosferik bokeh — kapaktaki "uzak ışık noktaları"; geniş, yumuşak,
 * yavaş süzülen turuncu/sıcak amber daireler.
 */
export const BOKEH = {
  count: 240,
  radius: 110,
  ceil: 60,
  /** Bokeh boyutu — büyük, yumuşak halkalar. */
  size: 2.4,
} as const;

/**
 * Oyuncunun GRAMOFON'a (ses kaynağı) uzaklığına göre müzik seviyesi.
 * Paneldeki slider kullanıcı tarafında kalır; gerçek YouTube ses seviyesi
 * = slider × distanceGain. Redd ile birebir kalibrasyon.
 */
export const AUDIO_DISTANCE = {
  nearRadius: 6,
  farRadius: 65,
  minGain: 0.06,
  smoothingPerSec: 4.0,
} as const;

/**
 * Albüm metası — UI ve ses paneli için. Hayko Cepkin'in resmi
 * "Beni Büyüten Şarkılar Vol.1" YouTube playlist'i.
 */
export const ALBUM: AlbumMeta = {
  artist: "Hayko Cepkin",
  title: "Beni Büyüten Şarkılar Vol.1",
  playlistId: "OLAK5uy_lWVHOqxgY9f3ABc2Y-i7gYRyBZu-AbOhQ",
  playlistUrl:
    "https://www.youtube.com/playlist?list=OLAK5uy_lWVHOqxgY9f3ABc2Y-i7gYRyBZu-AbOhQ",
} as const;

/**
 * Asset yolları — `index.html` `depo/hayko_cepkin/Beni_Büyüten_Şarkılar_Vol.1/`
 * altında çalışır, kök public/ köküne `../../../` ile çıkar.
 */
export const ASSETS = {
  fontRegular: "../../../assets/fonts/gentilis_regular.typeface.json",
  fontBold: "../../../assets/fonts/gentilis_bold.typeface.json",
  /** Merkez ikon — Meshy AI floating infant. */
  iconModel: "../../../hayko_bbs_vol1/infant.glb",
} as const;
