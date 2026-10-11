import type * as THREE from "three";
import type { Tube } from "../../../../engine/fx/tube";

/**
 * Aşk, Virüs — ortak sözleşme. Arşiv (`archive.ts`), kızıl malzeme (`crimson.ts`) ve film (`../virus.ts`) bu
 * tipleri ve ölçüleri paylaşır. Bütün konumlar ARŞİVİN YEREL uzayındadır: köken salonun zemin merkezidir (y = 0
 * zemin), +x doğu (giriş kapısı), +z kuzey (cam duvarlar; dışarıda krater), y yukarı. Film arşiv grubunu kraterde
 * yerleştirir; yerel noktalar `archive.group.localToWorld` ile dünyaya çevrilir.
 */

/** Salon: 52 m uzun (x), 28 m geniş (z), 11 m yüksek; dış duvarlar zeminin altına SKIRT kadar iner (boşluk görünmez). */
export const HALL = { x0: -26, x1: 26, z0: -14, z1: 14, h: 11, skirt: 11, wall: 0.4 } as const;
/** Bölgeler (x aralıkları); aralarındaki geçitler z = 0 merkezinde, OPENING genişliğinde. */
export const ZONES = {
  /** Galeri A: giriş salonu; kuzey duvarı (z = 14) füme cam; zeminin bir bölümü cam (altında boşluk). */
  gallery: { x0: 14, x1: 26, h: 11 },
  /** Koridor: iki yanda vitrinler; duvarlar z = ±halfWidth; tavan h; `setNarrow` duvarları içeri, tavanı aşağı alır. */
  corridor: { x0: 4, x1: 14, halfWidth: 3, h: 5 },
  /** Koleksiyon salonu (merkez galeri): tam genişlik, 11 m; kuzey duvarı (z = 14) baştan başa cam; iki uzun duvarda vitrin ızgarası. */
  collection: { x0: -10, x1: 4, h: 11 },
  /** Levhalar odası: asılı saydam levhalar; kuzey duvarı (z = +halfWidth) cam (yansıma koridoru). */
  sheets: { x0: -16, x1: -10, halfWidth: 6, h: 6 },
  /** Depo: ray ray asılı boş giysi kalıpları, iki kat. */
  storage: { x0: -26, x1: -16, h: 7 },
} as const;
export const OPENING = { w: 3.2, h: 3.4 } as const;
/** Giriş kapısı: doğu duvarında (x = 26, z = 0), iki kayar panel; dışarıda zemin seviyesine inen platform + rampa. */
export const DOOR = { x: 26, z: 0, w: 3.2, h: 5, platform: 6 } as const;
/** Galeri A'daki anahtar vitrini: kaide üstünde cam küp; nesne kaidenin üstünde (y ≈ KEY_CASE.top). */
export const KEY_CASE = { x: 19, z: 0, plinth: 1.0, glass: 0.62, top: 1.0 } as const;
/** Koleksiyon vitrin ızgarası: iki uzun duvar (güney z = -13.6, kuzeyde cam duvar olduğu için güney + batı değil: yalnız GÜNEY duvar ve
 * doğu bölme duvarı değil — ızgara güney duvarda 12 sütun × 3 sıra; kuzey tarafı camdır). Sütun x'leri `COL_X(i)`, sıra merkez y'leri `ROW_Y`. */
export const CASE_GRID = { cols: 12, rows: 3, x0: -9.35, dx: 1.15, rowY: [0.55, 1.6, 2.65] as const, w: 0.95, h: 0.95, d: 0.6, wallZ: -13.6 } as const;
export const COL_X = (i: number) => CASE_GRID.x0 + i * CASE_GRID.dx;
/** Kusurlu parçanın vitrini: güney duvar, 2. sütun (i = 1, batı uca yakın), orta sıra. */
export const FLAWED = { col: 1, row: 1 } as const;
/** Koleksiyon salonunun ortasında serbest duran üç kaide vitrini (kamera arkasından geçer). */
export const PEDESTALS = [
  { x: -7, z: 5.5 },
  { x: -4, z: -5.5 },
  { x: -1, z: 5.5 },
] as const;
/** Depo rayları: x boyunca, z = -12 + k·3 (9 ray), iki kat (y = 2.3 ve 4.6); giysi aralığı 0.42 m, raya 19 giysi. Merkez (adamın durduğu yer) iki rayın ARASINDADIR (z = 1.5). */
export const STORAGE = { rails: 9, railZ0: -12, railDz: 3, tiers: [2.3, 4.6] as const, perRail: 19, spacing: 0.42, x0: -25, center: { x: -21, z: 1.5 } } as const;
/** Levhalar: 7 sıra (z = -5.25 + j·1.5; z = 0 hattı boş kalır, adam oradan yürür) × 8 levha (x = -15.5 + i·0.7), levha düzlemi x-y
 * (normali ±z), 0.6 × 0.9 m, alt kenar y = 1.15. Kahraman levha: sıra 3 (z = -0.75), sütun 4 (x = -12.7). */
export const SHEETS = { rows: 7, cols: 8, z0: -5.25, dz: 1.5, x0: -15.5, dx: 0.7, w: 0.6, h: 0.9, bottom: 1.15, hero: { row: 3, col: 4 } } as const;
/** Plastik perde: levhalar odası ile koleksiyon arasındaki geçitte (x = -10) asılı saydam plastik; 4 × 3.2 m. */
export const CURTAIN = { x: -10, w: 4, h: 3.2 } as const;

/** Bir vitrin: cam kutu + çerçeve + nesne yuvası. */
export interface ArchiveCase {
  group: THREE.Group;
  /** Cam (saydam MeshPhysicalMaterial; kendi malzeme örneği, film tek tek değiştirebilir). */
  glass: THREE.Mesh;
  frame: THREE.Mesh;
  /** Nesne yuvası: vitrin tabanının merkezi (nesneler buna eklenir; yerel y = 0 taban). */
  slot: THREE.Group;
  /** Camın ÖN yüzünün merkezi (yerel uzay, arşiv grubuna göre): parmak dokunuşu, kalıntı, zar buraya yapışır. */
  front: THREE.Vector3;
  /** Camın ön yüzünün dışa bakan normali (yerel). */
  normal: THREE.Vector3;
  /** Yerel sınır kutusu (çerçeve). */
  size: { w: number; h: number; d: number };
}

export interface Archive {
  /** Film bunu kraterde yerleştirir (yerel y = 0 zemin). */
  group: THREE.Group;
  /** Giriş kapısı: `open(k)` 0 kapalı … 1 açık (paneller yana kayar). `inside`/`outside`: kapının iki yanında zeminde noktalar (yerel). */
  door: { group: THREE.Group; open(k: number): void; inside: THREE.Vector3; outside: THREE.Vector3 };
  keyCase: ArchiveCase;
  /** Kahraman nesne: TEK anahtar (çelik, 7,5 cm, kökeni tabanının merkezinde, uzun ekseni +x, çizikleri olan sade bir anahtar).
   * Başta keyCase.slot içindedir; film onu yerde/elde/kusurlu vitrinde dolaştırır (reparent + konum). */
  key: THREE.Group;
  /** Kusurlu parça: hafif çatlak, soluk bir seramik fincan (kusurlu vitrinin yuvasında); film kalıntıyı camına kendisi koyar. */
  cup: THREE.Group;
  /** Koleksiyon ızgarası: `cases[row][col]`; `flawedCase` = cases[FLAWED.row][FLAWED.col]. */
  cases: ArchiveCase[][];
  flawedCase: ArchiveCase;
  pedestals: ArchiveCase[];
  /** Koridor: `setNarrow(k)` 0 normal … 1 duvarlar 0.45 m içeri, tavan 0.4 m aşağı (yumuşak, her kare çağrılabilir). */
  corridor: { setNarrow(k: number): void };
  /**
   * Cam duvarlar (saydam füme cam): film aynı yere Reflector koyabilsin diye düzlem geometrisi, merkez ve odaya bakan normal
   * verilir. gallery: Galeri A kuzey (z = 14, x 14…26); collection: koleksiyon kuzey (z = 14, x -10…4); sheets: levhalar odası
   * kuzey (z = 6, x -16…-10).
   */
  glassWalls: Record<"gallery" | "collection" | "sheets", { mesh: THREE.Mesh; center: THREE.Vector3; normal: THREE.Vector3; width: number; height: number }>;
  /** Galeri A'daki cam zemin paneli (x 15…23, z -2…2); altındaki boşluk koyu; filament bunun altında yürür. Üst yüz yerel y = 0. */
  glassFloor: THREE.Mesh;
  /**
   * Levhalar: hepsi; kahraman levha ve ondan ayrılan şeritler/kopyalar. `setTear(k, scatter)`: k 0 bütün levha … 1 altı şerit
   * ayrılmış; scatter 0…1 şeritler ve kopyalar odaya dağılır (kopyalar scatter > 0.2 ile tek tek belirir). Saf fonksiyon.
   */
  sheets: { group: THREE.Group; all: THREE.Mesh[]; hero: THREE.Mesh; strips: THREE.Mesh[]; copies: THREE.Mesh[]; setTear(k: number, scatter: number): void };
  /**
   * Depo: giysiler tek InstancedMesh. `setClose(k)`: k 0 raylarında … 1 merkezdeki (STORAGE.center) 2.6 m yarıçap içindeki
   * giysiler merkeze doğru 1.2 m kadar kayıp sarkar (kapanma); k < 0 dışarı itilir (|k| kadar) ve en yakın 8'i yere düşer.
   * `setStain(k)`: merkeze yakın giysilerin rengi kızıla çalar (instance color), 0…1. `garmentPoint(i, out)`: i. giysinin
   * omuz noktası (yerel; filament bağlamak için). Saf fonksiyonlar, her kare çağrılabilir.
   */
  storage: { group: THREE.Group; garments: THREE.InstancedMesh; count: number; setClose(k: number): void; setStain(k: number): void; garmentPoint(i: number, out: THREE.Vector3): THREE.Vector3 };
  /** Plastik perde: film zarı kendisi kurar; arşiv yalnız askı çubuğunu ve konumu verir (üst kenar merkezi, yerel). */
  curtainTop: THREE.Vector3;
  /** Yinelenen vitrin sırası (arşivin "bozulması"): depo geçidinin içinde, koleksiyon güney duvarının kopyası; film görünürlüğü/opaklığı sürer. */
  repeat: { group: THREE.Group; setOpacity(k: number): void };
  /** Tavan ışık şeritleri ve cam çatı yarıkları: `setLit(k)` 0 söner … 1 tam (emissive). */
  setLit(k: number): void;
  /** Yerel referans noktaları: galleryCenter, corridorEast, corridorWest, collectionCenter, sheetsCenter, storageCenter, doorInside, doorOutside, keyCaseStand (anahtar vitrinine bakan kişinin yeri, kuzey tarafı), flawedStand (kusurlu vitrine bakan yer). */
  anchors: Record<string, THREE.Vector3>;
  /** Oyuncu için katılık: dış duvarlar (kit.colliders.solid ile; sahne görünmezken kendiliğinden kapalı). */
  solidify(): void;
}

/** Bir filament: mimari boyunca yürüyen ince kızıl tüp; `set(reveal, slack, time)` reveal 0…1 başından itibaren görünen pay,
 * slack 0 gergin … 1 sarkık (gevşeme/çekilme), time canlı kıpırtı için. */
export interface Filament {
  tube: Tube;
  /** Yol noktaları (yerel); film doldurur/değiştirebilir. */
  path: THREE.Vector3[];
  radius: number;
  set(reveal: number, slack: number, time: number): void;
}

/** Gerilmiş zar: iki uç arasında (a: genişliği wa, b: genişliği wb) ince esnek film; sarkar, kırışır, gerilince incelir ve
 * saydamlaşır, `tear` 0…1 tepeden aşağı yırtılır, `drop` 0…1 yırtılmış yarılar düşer. */
export interface Membrane {
  mesh: THREE.Mesh;
  set(a: THREE.Vector3, b: THREE.Vector3, wa: number, wb: number, sag: number, tear: number, drop: number, time: number): void;
}

/** Duvar/zemin/tavan filmi: panel üstünde, tohum noktasından dallanarak büyüyen saydam kızıl örtü; `set(reveal)` 0 yok … 1 panel dolu. */
export interface WallFilm {
  mesh: THREE.Mesh;
  set(reveal: number, time: number): void;
}

/** Küçük kalıntı: cam ya da yüzey üstünde para kadar saydam kızıl film; `set(k)` 0 yok … 1 tam; normal yönünde 1–2 mm üstte durur. */
export interface Residue {
  mesh: THREE.Mesh;
  set(k: number, time: number): void;
}

export interface Crimson {
  /** Film bunu arşiv grubuna ekler (yerel uzay). Bütün malzemeler kuruluşta vardır (warmup için). */
  group: THREE.Group;
  filament(path: THREE.Vector3[], radius?: number, segments?: number): Filament;
  membrane(segmentsU?: number, segmentsV?: number): Membrane;
  /** Panel: genişlik, yükseklik (yerel metre); film konumlandırır/döndürür (mesh.position/quaternion). seed 0…1 UV tohumu. */
  film(width: number, height: number, seedU?: number, seedV?: number): WallFilm;
  residue(size?: number): Residue;
  /** Son solma: 0 koyu kızıl … 1 neredeyse renksiz, mat, yassı (bütün kızıl malzemeler). */
  setFade(k: number): void;
  /** Genel görünürlük (level ile çarpılır). */
  setLevel(k: number): void;
}
