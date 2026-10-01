import * as THREE from "three";

/**
 * Klip yönetmeni: şarkının saniyesine bağlı çekim listesi. Her çekim bir kesmeyle başlar
 * (sinema kurgusu gibi) ve bir sonrakine kadar sürer: kamera bir noktadan ötekine kayar
 * (dolly/vinç), yörüngede döner ya da hareket eden bir şeyi izler. Her çekimin kendi rengi
 * (palet), girişi (kararma, beyaz, flaş, parazit) ve lensi (böcek gözü, eski film, mikroskop,
 * eski TV) olabilir. Evrenler çekimleri şarkının dizelerine göre yazar; motor sinema modunda
 * kamerayı ve görüntünün son rengini bu çekimlerle sürer.
 */
export type Point = THREE.Vector3 | (() => THREE.Vector3);

/** Çekimin renk ayarı (dünyanın rengine eklenir; 1 / siyah = etkisiz). */
export interface ClipGrade {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  /** Çarpılan renk (ör. soğuk gece için "#b8d0ff"). */
  tint?: string;
  /** Gölgelere eklenen renk (ör. turuncu-camgöbeği ayrımı için "#062028"). */
  lift?: string;
  vignette?: number;
  /** Renk kayması (lens kusuru), 0..0.02. */
  aberration?: number;
  /** Sürekli parazit, 0..1. */
  glitch?: number;
  /** Lens yumuşaklığı: kenarlar bulanık, göz merkeze (0..1). */
  soft?: number;
}

/** Hazır paletler: çekimler adıyla çağırır. */
export const GRADES = {
  neutral: {},
  night: { exposure: 1.2, contrast: 1.05, saturation: 0.8, tint: "#c4d6ff", lift: "#132642", vignette: 0.25 },
  fire: { exposure: 1.15, contrast: 1.12, saturation: 1.15, tint: "#ffe2c4", lift: "#06202a", vignette: 0.2 },
  memory: { exposure: 1.12, contrast: 0.92, saturation: 0.85, tint: "#ffd9a0", lift: "#1a0e02", vignette: 0.3, soft: 0.8 },
  bleach: { exposure: 1.04, contrast: 1.18, saturation: 0.35, tint: "#e8eef2", vignette: 0.3 },
  noir: { exposure: 1.02, contrast: 1.35, saturation: 0, vignette: 0.4 },
  neon: { exposure: 1.06, contrast: 1.1, saturation: 1.35, tint: "#ffd0f0", lift: "#12021c", vignette: 0.2 },
  fever: { exposure: 1.03, contrast: 1.15, saturation: 1.3, tint: "#ffc0bc", lift: "#1c0204", aberration: 0.006, vignette: 0.3 },
  candle: { exposure: 1.08, contrast: 1.2, saturation: 1.05, tint: "#ffcf96", lift: "#0a0302", vignette: 0.45, soft: 0.5 },
  dawn: { exposure: 1.1, contrast: 1.02, saturation: 1.1, tint: "#ffe0b8", lift: "#0c0616", vignette: 0.15 },
  cold: { exposure: 1.1, contrast: 1.08, saturation: 0.62, tint: "#d2e2ff", lift: "#081424", vignette: 0.3 },
  deep: { exposure: 0.92, contrast: 1.05, saturation: 0.8, tint: "#9fd0ff", lift: "#001424", vignette: 0.35 },
  pastel: { exposure: 1.1, contrast: 0.9, saturation: 1.15, tint: "#fff0e6", lift: "#140a14", vignette: 0.15 },
  blood: { exposure: 1.0, contrast: 1.25, saturation: 1.2, tint: "#ffb4b0", lift: "#140000", vignette: 0.4 },
} as const satisfies Record<string, ClipGrade>;

export type GradeName = keyof typeof GRADES;
export type Lens = "eye" | "film" | "scope" | "crt" | "tear";
export type Transition = "fade" | "white" | "flash" | "glitch";

export interface Shot {
  /** Şarkının saniyesi (kesme anı). */
  at: number;
  /** Kamera konumu: başlangıç → bitiş. */
  from?: Point;
  to?: Point;
  /** Bakılan nokta: başlangıç → bitiş. */
  look: Point;
  lookTo?: Point;
  /** Yörünge çekimi: merkez etrafında açıdan açıya (radyan) döner; from/to yerine. */
  orbit?: { center: Point; radius: number; height: number; from: number; to: number };
  /**
   * Uçuş yolu: kamera from → path noktaları → to boyunca yumuşak bir eğri (Catmull-Rom) izler.
   * Evrenin bir ucundan öbürüne süzülen uzun vinç ve helikopter çekimleri için.
   */
  path?: Point[];
  /** Bilinçli yer altı çekimi (tünel, oyuk): kamera zeminin üstüne itilmez. */
  underground?: boolean;
  /** Bakış yolu: look → lookPath → lookTo boyunca kayan bakış noktası (uçuş yoluyla birlikte). */
  lookPath?: Point[];
  fov?: number;
  fovTo?: number;
  /** Kamera eğikliği (radyan; ör. sarhoş, alabora). rollTo ile çekim boyunca döner. */
  roll?: number;
  rollTo?: number;
  /** "ease": yumuşak başlayıp biten; "linear": sabit hızla kayma (uzun, sakin çekimler). */
  curve?: "ease" | "linear";
  /** Omuz kamerası titremesi (metre). */
  handheld?: number;
  /**
   * Özneyi kadraja sığdır: verilen küre (merkez + yarıçap) görüş açısına sığmıyorsa açı her karede
   * gerektiği kadar büyütülür (asla daraltılmaz). Oyuncu figürleri için: sahneden taşma olmaz.
   */
  fit?: () => { center: THREE.Vector3; radius: number; margin?: number };
  /** Çekimin rengi: hazır palet adı ya da ayar. */
  grade?: GradeName | ClipGrade;
  /** Lens: böcek gözü, eski film, mikroskop, eski TV. */
  lens?: Lens;
  lensAmount?: number;
  /** Lens miktarı çekim boyunca lensAmount → lensAmountTo (ör. yırtık: 0 → 1 ilerleme). */
  lensAmountTo?: number;
  /** Çekimin girişi: siyahtan açılma, beyazdan açılma, kısa flaş, parazit. */
  in?: Transition;
  /** Çekimin çıkışı (sonraki kesmeden önce): karar ya da beyaza aç. */
  out?: "fade" | "white";
  /** Flaş ve beyaz girişin rengi (varsayılan beyaz; ör. nabız için kırmızı). */
  flashColor?: string;
}

export interface ResolvedGrade {
  exposure: number;
  contrast: number;
  saturation: number;
  tint: THREE.Color;
  lift: THREE.Color;
  vignette: number;
  aberration: number;
  glitch: number;
  soft: number;
}

export interface CinemaFrame {
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  roll: number;
  grade: ResolvedGrade;
  /** 0 yok, 1 böcek gözü, 2 eski film, 3 mikroskop, 4 eski TV. */
  lens: number;
  lensAmount: number;
  /** Çekim yer altında mı (true ise kamera zeminin üstünde tutulmaz). */
  underground: boolean;
  /** Geçiş katmanı: renk ve miktar (0..1). */
  flash: number;
  flashColor: THREE.Color;
}

export function createFrame(): CinemaFrame {
  return {
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 50,
    roll: 0,
    grade: { exposure: 1, contrast: 1, saturation: 1, tint: new THREE.Color(1, 1, 1), lift: new THREE.Color(0, 0, 0), vignette: 0, aberration: 0, glitch: 0, soft: 0 },
    lens: 0,
    lensAmount: 0,
    underground: false,
    flash: 0,
    flashColor: new THREE.Color(0, 0, 0),
  };
}

const a = new THREE.Vector3();
const b = new THREE.Vector3();
const resolve = (point: Point, out: THREE.Vector3) => out.copy(typeof point === "function" ? point() : point);
/** Uçuş yolu eğrileri (çekim başına bir kez kurulur; noktalar hareketliyse her karede yenilenir). */
const curves = new WeakMap<Shot, { camera: THREE.CatmullRomCurve3; look: THREE.CatmullRomCurve3 | null; live: boolean }>();
function splineOf(shot: Shot) {
  let entry = curves.get(shot);
  const points = [shot.from!, ...(shot.path ?? []), ...(shot.to ? [shot.to] : [])];
  const lookPoints = shot.lookPath ? [shot.look, ...shot.lookPath, ...(shot.lookTo ? [shot.lookTo] : [])] : null;
  const live = [...points, ...(lookPoints ?? [])].some((point) => typeof point === "function");
  if (!entry || live) {
    const camera = new THREE.CatmullRomCurve3(points.map((point) => resolve(point, new THREE.Vector3())), false, "centripetal");
    const look = lookPoints ? new THREE.CatmullRomCurve3(lookPoints.map((point) => resolve(point, new THREE.Vector3())), false, "centripetal") : null;
    entry = { camera, look, live };
    curves.set(shot, entry);
  }
  return entry;
}
const smooth = (k: number) => k * k * (3 - 2 * k);
const LENSES: Record<Lens, number> = { eye: 1, film: 2, scope: 3, crt: 4, tear: 5 };
const BLACK = new THREE.Color(0, 0, 0);
const WHITE = new THREE.Color(1, 1, 1);

/** Azaltılmış hareket tercih edenlerde omuz kamerası titremesi ve flaşlar yumuşar. */
const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Bir çekimin en uzun süresi: listenin sonundaki çekim bundan sonra olduğu yerde durur. */
const LAST_SHOT = 24;

function applyGrade(grade: Shot["grade"], out: ResolvedGrade): void {
  const g: ClipGrade = typeof grade === "string" ? GRADES[grade] : grade ?? {};
  out.exposure = g.exposure ?? 1;
  out.contrast = g.contrast ?? 1;
  out.saturation = g.saturation ?? 1;
  out.tint.set(g.tint ?? "#ffffff");
  out.lift.set(g.lift ?? "#000000");
  out.vignette = g.vignette ?? 0;
  out.aberration = g.aberration ?? 0;
  out.glitch = g.glitch ?? 0;
  out.soft = g.soft ?? 0;
}

/** Şarkının o saniyesindeki çekimin sırası (çekim yoksa -1). */
export function shotIndex(shots: readonly Shot[], songTime: number): number {
  if (!shots.length || songTime < shots[0].at) return -1;
  let index = 0;
  while (index < shots.length - 1 && shots[index + 1].at <= songTime) index += 1;
  return index;
}

/** Şarkının o saniyesine düşen çekimi kareye çevirir; çekim yoksa false. */
export function frameAt(shots: readonly Shot[], songTime: number, time: number, out: CinemaFrame): boolean {
  const index = shotIndex(shots, songTime);
  if (index < 0) return false;
  const shot = shots[index];
  const end = index < shots.length - 1 ? shots[index + 1].at : shot.at + LAST_SHOT;
  const duration = Math.max(0.001, end - shot.at);
  const since = songTime - shot.at;
  const raw = THREE.MathUtils.clamp(since / duration, 0, 1);
  const k = shot.curve === "linear" ? raw : smooth(raw);
  out.underground = shot.underground ?? false;

  if (shot.orbit) {
    const o = shot.orbit;
    resolve(o.center, a);
    const angle = THREE.MathUtils.lerp(o.from, o.to, k);
    out.position.set(a.x + Math.cos(angle) * o.radius, a.y + o.height, a.z + Math.sin(angle) * o.radius);
  } else if (shot.from && shot.path?.length) {
    const spline = splineOf(shot);
    spline.camera.getPointAt(k, out.position);
    if (spline.look) {
      spline.look.getPointAt(k, out.target);
      out.fov = THREE.MathUtils.lerp(shot.fov ?? 50, shot.fovTo ?? shot.fov ?? 50, k);
      out.roll = THREE.MathUtils.lerp(shot.roll ?? 0, shot.rollTo ?? shot.roll ?? 0, k);
      applyGrade(shot.grade, out.grade);
      out.lens = shot.lens ? LENSES[shot.lens] : 0;
      out.lensAmount = shot.lens ? THREE.MathUtils.lerp(shot.lensAmount ?? 1, shot.lensAmountTo ?? shot.lensAmount ?? 1, k) : 0;
      applyTransitions(shot, since, end - songTime, index < shots.length - 1, out);
      return true;
    }
  } else if (shot.from) {
    resolve(shot.from, a);
    if (shot.to) a.lerp(resolve(shot.to, b), k);
    out.position.copy(a);
  } else {
    return false;
  }
  resolve(shot.look, a);
  if (shot.lookTo) a.lerp(resolve(shot.lookTo, b), k);
  out.target.copy(a);
  out.fov = THREE.MathUtils.lerp(shot.fov ?? 50, shot.fovTo ?? shot.fov ?? 50, k);
  if (shot.fit) {
    const f = shot.fit();
    const d = Math.max(0.5, out.position.distanceTo(f.center));
    // Kürenin ekranda kapladığı dikey açı (kenar payıyla); yatay dar ekranlarda da sığsın diye 1.15 pay.
    const need = THREE.MathUtils.radToDeg(2 * Math.atan((f.radius * (f.margin ?? 1.25)) / d)) * 1.15;
    if (need > out.fov) out.fov = Math.min(95, need);
  }
  out.roll = THREE.MathUtils.lerp(shot.roll ?? 0, shot.rollTo ?? shot.roll ?? 0, k);
  if (shot.handheld && !still) {
    const h = shot.handheld;
    out.position.x += Math.sin(time * 1.7) * h + Math.sin(time * 4.3) * h * 0.3;
    out.position.y += Math.sin(time * 2.1 + 1) * h * 0.6;
    out.target.x += Math.sin(time * 1.3 + 2) * h * 0.5;
  }

  applyGrade(shot.grade, out.grade);
  out.lens = shot.lens ? LENSES[shot.lens] : 0;
  out.lensAmount = shot.lens ? THREE.MathUtils.lerp(shot.lensAmount ?? 1, shot.lensAmountTo ?? shot.lensAmount ?? 1, k) : 0;

  applyTransitions(shot, since, end - songTime, index < shots.length - 1, out);
  return true;
}

/** Geçişler: çekimin başında giriş, sonunda çıkış. */
function applyTransitions(shot: Shot, since: number, left: number, hasNext: boolean, out: CinemaFrame): void {
  out.flash = 0;
  out.flashColor.copy(BLACK);
  const intro = shot.in;
  if (intro === "fade" && since < 0.8) {
    out.flash = 1 - smooth(since / 0.8);
  } else if (intro === "white" && since < 1) {
    out.flash = 1 - smooth(since / 1);
    out.flashColor.set(shot.flashColor ?? "#ffffff");
  } else if (intro === "flash" && since < 0.3) {
    out.flash = (1 - since / 0.3) * (still ? 0.4 : 0.72);
    out.flashColor.set(shot.flashColor ?? "#ffffff");
  } else if (intro === "glitch" && since < 0.5) {
    out.grade.glitch = Math.max(out.grade.glitch, (1 - since / 0.5) * (still ? 0.3 : 1));
  }
  if (shot.out && left < 0.7 && hasNext) {
    out.flash = Math.max(out.flash, smooth(1 - left / 0.7));
    out.flashColor.copy(shot.out === "white" ? WHITE : BLACK);
  }
}

/** Çekim listesinin şarkıdaki kesme anları (ör. testler ve önizleme için). */
export function cutTimes(shots: readonly Shot[]): number[] {
  return shots.map((shot) => shot.at);
}
