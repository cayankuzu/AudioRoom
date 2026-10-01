import * as THREE from "three";
import { createText3D } from "../../engine/core/text3d";
import { yawTowards } from "../../engine/core/player";
import { approach } from "../../engine/fx/fade";
import { createEmitter, SPARKLE } from "../../engine/fx/emitter";
import { glowSprite } from "../../engine/fx/glow";
import { createParticles } from "../../engine/fx/particles";
import { GRADES, type Shot } from "../../engine/game/director";
import type { GameRecord } from "../../engine/game/records";
import { createTimeline, type Beat, type Timeline } from "../../engine/game/timeline";
import type { WorldDefinition, WorldLogic } from "../../engine/world";
import { ALBUM } from "./album";
import { createKeepsakes } from "./keepsakes";
import { MEMORIES } from "./memories";
import { createSongProps, FETUS_AT, PROP_AT, silhouetteModels } from "./props";
import { loadModels } from "../../engine/core/models";
import { createQuiz, QUIZ_MODELS } from "./quiz";
import { actorShot, createSongActor, hasCue } from "./actors";
import { loadCharacterLibrary } from "../../engine/fx/character";
import { STORY, storyProgress } from "./story";
import { createBubbleMaterial, createWomb, SHADOW_AZIMUTH, WALK_RADIUS, WOMB_CY, WOMB_RX, WOMB_RY, wombGround } from "./womb";

interface Mood {
  light: string;
  boost: number;
  particles: { color: string; size: number; opacity: number; velocity: [number, number, number] };
  flicker?: number;
  fog: number;
}

const BASE: Mood = {
  light: "#ff9a5a",
  boost: 1,
  particles: { color: "#ffb27a", size: 0.5, opacity: 0.35, velocity: [0, 0.06, 0] },
  fog: 0.016,
};

/** Her anının ışık rengi ve havası (sözlerden değil, şarkının duygusundan). */
const MOODS: Record<string, Mood> = {
  "ben-insan-degil-miyim": { ...BASE, light: "#ffc27a", boost: 1.15, particles: { color: "#ffd9a0", size: 0.45, opacity: 0.5, velocity: [0.05, 0.1, 0] } },
  "aldirma-gonul": { ...BASE, light: "#9fc4ff", boost: 1.1, particles: { color: "#cfe0ff", size: 0.3, opacity: 0.3, velocity: [0.4, 0, 0] } },
  "o-cesme": { ...BASE, light: "#bfe3ff", boost: 1, particles: { color: "#e2f4ff", size: 0.28, opacity: 0.8, velocity: [0, -2.2, 0] } },
  "itirazim-var": { ...BASE, light: "#ff4a2e", boost: 1.3, flicker: 0.4, particles: { color: "#ff5a3a", size: 0.4, opacity: 0.5, velocity: [0, 0.3, 0] } },
  "agla-sevdam": { ...BASE, light: "#ff8fa0", boost: 0.85, particles: { color: "#ffb0bd", size: 0.34, opacity: 0.7, velocity: [0.1, -1.4, 0] } },
  "issizligin-ortasinda": { ...BASE, light: "#e6ddd4", boost: 0.6, fog: 0.03, particles: { color: "#e6e0dc", size: 0.25, opacity: 0.18, velocity: [0.08, 0, 0.05] } },
  "neydi-gunahim": { ...BASE, light: "#ffe8c0", boost: 0.55, particles: { color: "#fff0d6", size: 0.3, opacity: 0.3, velocity: [0, -0.1, 0] } },
  "yuh-yuh": { ...BASE, light: "#ff6a1e", boost: 1.45, flicker: 1, particles: { color: "#ff7a28", size: 0.36, opacity: 0.8, velocity: [0, 2.4, 0] } },
  "nem-kaldi": { ...BASE, light: "#e8b45a", boost: 1.2, particles: { color: "#f2c46a", size: 0.4, opacity: 0.6, velocity: [0, 0.8, 0] } },
};

/** Anıya dokununca üstte beliren kısa, özgün satır (söz alıntısı değil). */
const TOUCH_LINES: Record<string, string> = {
  "ben-insan-degil-miyim": "Yağmurda yalnız biri… ve yanına oturan bir başkası.",
  "aldirma-gonul": "Parmaklıklar açıldı; martı denize süzülüyor.",
  "o-cesme": "Çeşme akıyor; beklenen hatıra geri geldi.",
  "itirazim-var": "Yumruklar havada: kadere bir itiraz.",
  "agla-sevdam": "Yağmurun altında sarıldılar.",
  "issizligin-ortasinda": "Issızlığın ortasında ağaç çiçek açtı.",
  "neydi-gunahim": "Spot genişledi; artık yalnız değil.",
  "yuh-yuh": "Saz çaldı, meydan ayağa kalktı.",
  "nem-kaldi": "Çitler devrildi; toprak yeniden herkesin.",
};

const START = { x: 0, z: 17 };
const FETUS_Y = 7.5;
/** Kapaktaki duruş: bebek profilden, başı sağ üstte, yüzü sağa bakar (giriş yönünden). */
const COVER_TILT = -0.95;
/** Gölge oyununun perdesi: girişe göre solda, zarın duvarında. */
const WALL = new THREE.Vector3(Math.sin(SHADOW_AZIMUTH) * WOMB_RX * 0.93, WOMB_CY + WOMB_RY * 0.12, -Math.cos(SHADOW_AZIMUTH) * WOMB_RX * 0.93);

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const floorAt = (x: number, z: number, lift: number) => v(x, wombGround(x, z) + lift, z);
/**
 * Göbek bağı: bebeğin gövdesinin içinden başlar, arkadan yukarı, zarın üst arka duvarındaki plasentaya
 * kıvrılır. Hiçbir bakış açısında bebeğin altında sarkmaz (kapakta göbek bağı görünmez).
 */
const CORD = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.2, FETUS_Y - 0.1, -0.4),
  new THREE.Vector3(0.4, FETUS_Y + 0.3, -3.6),
  new THREE.Vector3(-0.9, FETUS_Y + 2.2, -9),
  new THREE.Vector3(0.9, FETUS_Y + 5, -15),
  new THREE.Vector3(-0.3, FETUS_Y + 8, -22),
  new THREE.Vector3(0.4, FETUS_Y + 10.5, -WOMB_RX + 1.6),
]);
/** Çekimler için: göbek bağı üzerinde (u) bir nokta, ofsetli. */
const cordAt = (u: number, dx: number, dy: number, dz: number) => CORD.getPointAt(u).add(new THREE.Vector3(dx, dy, dz));
/** Gramofon: başlangıcın sağ önünde. */
const GRAM = new THREE.Vector3(4.5, wombGround(4.5, 12.5), 12.5);

/**
 * Her şarkının klip dili: ana renk paleti ve perdeye özel ayarlar. Perdede "look" varsa o perde
 * elle yazılmış bir çekimdir (şarkının sahne parçasına keser); yoksa kalıp çekime renk, lens ve
 * geçiş eklenir.
 */
interface Style {
  base: NonNullable<Shot["grade"]>;
  acts?: Record<string, Partial<Shot>>;
}
const RED = "#ff2a1a";
const STYLES: Record<string, Style> = {
  "ben-insan-degil-miyim": {
    base: "night",
    acts: {
      soru: { grade: "cold" },
      atilmis: { from: v(0, WOMB_CY + WOMB_RY * 0.8, 7), to: v(0, WOMB_CY + WOMB_RY * 0.48, 11), look: FETUS_AT, fov: 58, grade: "cold" },
      mutlu: { grade: "candle" },
      gulmek: { grade: "candle" },
      alindi: { grade: "cold", in: "fade" },
      kukla: { from: v(3, 2, 7), to: v(2.4, 2.6, 6), look: v(0, 12, 0), lookTo: PROP_AT.bar, fov: 62, grade: "noir", in: "fade" },
      yeniden: { grade: "noir" },
      vur: { grade: "blood", in: "flash", flashColor: RED },
      isyan: { orbit: { center: FETUS_AT, radius: 12.5, height: 4, from: 0.5, to: 1.6 }, look: v(0, 11, 0), fov: 58, grade: "blood", in: "flash", flashColor: RED, handheld: 0.08 },
      son: { grade: "dawn" },
    },
  },
  "aldirma-gonul": {
    base: "cold",
    acts: {
      bas: { from: v(4.1, 15.2, -2.6), to: v(4.4, 15.1, -3.6), look: PROP_AT.window, fov: 40, lens: "film", grade: "noir", in: "fade" },
      dalga: { orbit: { center: PROP_AT.window, radius: 9, height: -1, from: 1.2, to: 2.2 }, look: PROP_AT.window, fov: 48, grade: "deep" },
      kalk: { grade: "cold", handheld: 0.05 },
      yuksel: { grade: "fire" },
      gunler: { from: v(3.4, 15.6, -1.8), to: v(3.9, 15.8, -2.8), look: v(5, 15.8, -6.8), fov: 44, grade: "dawn", in: "white" },
      son: { grade: "dawn" },
    },
  },
  "o-cesme": {
    base: "memory",
    acts: {
      damla: { from: floorAt(-4.6, 10, 1.9), to: floorAt(-5.1, 9.2, 1.6), look: floorAt(-6.4, 7.3, 0.9), fov: 36, grade: { ...GRADES.memory, soft: 0.7 } },
      kuru2: { grade: "bleach", in: "fade" },
      yillar: { lens: "film", grade: "memory" },
      damla2: { from: floorAt(-7.8, 8.6, 1.4), to: floorAt(-7.2, 8.1, 1.2), look: floorAt(-6.4, 7.3, 0.9), fov: 36, grade: { ...GRADES.memory, soft: 0.7 } },
      kuru3: { grade: "bleach" },
      son: { grade: "cold" },
    },
  },
  "itirazim-var": {
    base: "fire",
    acts: {
      itiraz: { from: floorAt(0, 13.5, 1), to: floorAt(0, 12, 1.4), look: FETUS_AT, fov: 62, grade: "fire" },
      yarim: { from: floorAt(8, 6, 1.2), to: floorAt(5, 4, 1), look: floorAt(0, 0, 1.5), fov: 56, grade: "fire", handheld: 0.04 },
      kaybeden: { grade: "noir" },
      yaka: { grade: "noir", handheld: 0.06 },
      cehennem: { grade: "blood", in: "flash", flashColor: RED, handheld: 0.08 },
      buyuk: { orbit: { center: v(0, 0, 0), radius: 16, height: 6, from: 0.4, to: 1.6 }, look: FETUS_AT, fov: 58, grade: "fire", in: "white" },
      yuzler: { grade: "noir" },
      cehennem2: { grade: "blood", in: "flash", flashColor: RED, handheld: 0.08 },
      son: { grade: "dawn" },
    },
  },
  "agla-sevdam": {
    base: "night",
    acts: {
      sar: { from: v(4, 11.5, 6), to: v(3.2, 11.2, 5), look: PROP_AT.umbrella, fov: 44, grade: "night" },
      kuslar: { orbit: { center: PROP_AT.umbrella, radius: 7, height: 1.5, from: 0.4, to: 1.6 }, look: v(0, PROP_AT.umbrella.y + 1, 0), fov: 54, curve: "linear", grade: "cold" },
      yangin: { grade: "fire", in: "flash", flashColor: "#ff7a2a" },
      yola: { grade: "fire" },
      dar: { grade: "noir" },
      bos: { grade: "cold", in: "fade" },
      son: { grade: "bleach" },
    },
  },
  "issizligin-ortasinda": {
    base: "dawn",
    acts: {
      uyku: { grade: "deep" },
      ates: { grade: "fire", handheld: 0.08, in: "flash", flashColor: "#ff5a1a" },
      sazlar: { from: cordAt(0.95, 0, 1.2, 0), path: [cordAt(0.6, 1, 1, 0)], to: cordAt(0.15, 0.6, 0.8, 0), look: FETUS_AT, fov: 56, curve: "linear", grade: "noir" },
      ayakta: { grade: "noir" },
      issiz: { from: floorAt(0, 13.5, 1.2), to: floorAt(0, 12.5, 1.6), look: v(0, 3, 0), lookTo: v(0, 10, 0), fov: 60, grade: { ...GRADES.cold, soft: 0.4 }, in: "fade" },
      ates2: { grade: "fire", handheld: 0.08 },
      issiz2: { grade: "cold" },
      son: { from: v(0, 5, 12), to: v(0, 7, 10), look: v(0, 14, 0), lookTo: v(0, 22, 0), fov: 62, grade: "candle", in: "fade" },
    },
  },
  "neydi-gunahim": {
    base: "candle",
    acts: {
      gidis: { from: v(10, 9, 6), to: v(8.5, 8.6, 5.2), look: FETUS_AT, lookTo: v(0, 16, 0), fov: 50, grade: "candle" },
      ekilen: { grade: "noir" },
      kalles: { grade: "noir", handheld: 0.06 },
      kerem: { from: v(3, 24, 3), to: v(1.5, 22, 2), look: PROP_AT.spot, lookTo: FETUS_AT, fov: 60, grade: "fire", in: "flash", flashColor: "#ff7a2a" },
      haydi: { grade: "fire" },
      hirsiz: { grade: "noir", in: "glitch" },
      felek: { from: v(1, 7, 9), to: v(2, 8.5, 7), look: v(2.4, 10.5, 2.2), fov: 44, grade: "night" },
      son: { grade: "noir", out: "fade" },
    },
  },
  "yuh-yuh": {
    base: "pastel",
    acts: {
      yuh: { from: v(6.2, 10, 7), to: v(5.6, 9.8, 6.2), look: PROP_AT.saz, fov: 40, grade: "pastel" },
      muska: { grade: "memory" },
      bey: { from: v(-2.5, 11.5, 7), to: v(-3.2, 12, 6), look: PROP_AT.hat, fov: 42, grade: "fever" },
      asalet: { grade: "fever" },
      koro: { from: v(0, 27, 1), to: v(0, 20, 4), look: FETUS_AT, fov: 62, grade: "dawn", in: "white" },
      son: { grade: "dawn" },
    },
  },
  "nem-kaldi": {
    base: "dawn",
    acts: {
      parsel: { from: floorAt(0.5, -0.8, 1.1), to: floorAt(1.4, -0.4, 1.3), look: floorAt(12, 5.2, 1.5), fov: 50, grade: "cold" },
      tas: { grade: "cold" },
      kapilar: { orbit: { center: v(0, 0, 0), radius: 14, height: 2.5, from: 3, to: 4.2 }, look: floorAt(0, 0, 1), fov: 54, grade: "noir", in: "fade" },
      namert: { grade: "cold" },
      dusman: { grade: "noir" },
      arsiz: { grade: "bleach" },
      ac: { from: floorAt(-1, 7.5, 2.2), to: floorAt(-1.6, 6.6, 1.8), look: floorAt(-2.4, 5, 0.1), fov: 40, grade: "noir" },
      sermaye: { grade: "noir" },
      son: { grade: "dawn" },
    },
  },
};

/**
 * Klip: her şarkının perdeleri kesme anlarıdır. Kamera; bebeğin silueti önde, zardaki gölge
 * oyunu arkada geniş plan, gölge oyununa yakın plan, bebeğin etrafında yörünge, tabandan
 * alçak açı ve zar boyunca yay çizen çekimler arasında dolaşır. Klip kapakla açılır, kapakla biter.
 */
function clipShots(beats: readonly Beat[], id: string): Shot[] {
  const fetus = new THREE.Vector3(0, FETUS_Y, 0);
  const across = new THREE.Vector3(-WALL.x, 0, -WALL.z).normalize();
  const wallAngle = Math.atan2(WALL.z, WALL.x);
  const at = (d: number, y: number, side = 0) =>
    new THREE.Vector3(across.x * d - across.z * side, y, across.z * d + across.x * side);
  const toward = (k: number, y: number) => new THREE.Vector3(WALL.x * k, y, WALL.z * k);
  const cover = { position: new THREE.Vector3(-2.2, FETUS_Y + 1, 9.6), target: new THREE.Vector3(-2.2, FETUS_Y + 0.5, 0) };
  const templates: Array<(t: number, i: number) => Shot> = [
    // Bebeğin silueti önde, gölge oyunu arkada.
    (t) => ({ at: t, from: at(13, FETUS_Y + 1.4, 1.5), to: at(10.5, FETUS_Y + 1, 0.5), look: WALL, fov: 50 }),
    // Göbek bağı boyunca iniş: plasentadan bebeğe süzülen uzun uçuş.
    (t, i) => ({ at: t, from: cordAt(0.98, i % 2 ? 1.4 : -1.4, 1.2, 0), path: [cordAt(0.72, i % 2 ? 1.6 : -1.6, 0.9, 0), cordAt(0.42, i % 2 ? 1.2 : -1.2, 1.1, 0)], to: cordAt(0.14, i % 2 ? 0.9 : -0.9, 0.8, 0.4), look: fetus, fov: 56, curve: "linear" }),
    // Gölge oyununa yakın plan.
    (t) => ({ at: t, from: toward(0.42, 12.5), to: toward(0.52, 13.4), look: WALL, fov: 44, curve: "linear" }),
    // Zarın tepesinden iniş: bütün rahim ayak altında.
    (t, i) => ({ at: t, from: v(i % 2 ? 3 : -3, WOMB_CY + WOMB_RY * 0.8, 7), to: v(i % 2 ? 4 : -4, WOMB_CY + WOMB_RY * 0.42, 11), look: fetus, fov: 58 }),
    // Bebeğin etrafında yavaş yörünge.
    (t, i) => ({ at: t, orbit: { center: fetus, radius: 11, height: 1.2, from: i, to: i + 0.9 }, look: fetus, fov: 44, curve: "linear" }),
    // Bebeğin arkasından girişe doğru: gramofon ve kabarcıklar uzakta.
    (t, i) => ({ at: t, from: v(i % 2 ? 2 : -2, FETUS_Y + 1.6, -9), to: v(i % 2 ? 0.8 : -0.8, FETUS_Y + 1.1, -6), look: v(0, FETUS_Y + 0.4, 0), lookTo: GRAM, fov: 54, curve: "linear" }),
    // Zar boyunca yay: gölgeler kayar.
    (t, i) => ({ at: t, orbit: { center: toward(0.45, 11), radius: 9, height: 0, from: wallAngle + Math.PI + (i % 2 ? 0.8 : -0.8), to: wallAngle + Math.PI + (i % 2 ? -0.6 : 0.6) }, look: WALL, fov: 52, curve: "linear" }),
    // Uzak duvar boyunca geniş yay: zarın öbür yarısı.
    (t, i) => ({ at: t, orbit: { center: fetus, radius: 20, height: 5, from: i * 0.7, to: i * 0.7 + 1.1 }, look: fetus, fov: 50, curve: "linear" }),
    // Bebeğin yüzüne yakın portre: kapaktaki profil, arkadan gelen ışıkta (yavaş yaklaşma).
    (t, i) => ({ at: t, from: cover.position.clone().add(new THREE.Vector3(i % 2 ? 1.6 : -0.6, 0.6, 1.4)), to: cover.position.clone().add(new THREE.Vector3(i % 2 ? 0.9 : -0.2, 0.3, -1.2)), look: new THREE.Vector3(-1.4, FETUS_Y + 0.8, 0), fov: 40, curve: "linear" }),
    // Zarın dibinden yukarı: tabandan bebeğe kaldırılan bakış (bebek tepede, ışık arkada).
    (t, i) => ({ at: t, from: floorAt(i % 2 ? 9 : -9, 9, 0.6), to: floorAt(i % 2 ? 5 : -5, 6, 1.4), look: v(0, FETUS_Y - 1, 0), lookTo: fetus, fov: 54, curve: "linear" }),
    // Gölge oyununa yakın plan (öbür açı).
    (t) => ({ at: t, from: toward(0.35, 9), to: toward(0.45, 10.5), look: WALL, lookTo: toward(1, 18), fov: 46 }),
    // Doğu duvarı boyunca alçak kayma: damarlı zar yakın planda, bebek uzakta.
    (t, i) => ({ at: t, from: v(WOMB_RX * 0.62, 3.2, i % 2 ? 9 : -9), to: v(WOMB_RX * 0.55, 4.6, i % 2 ? -4 : 4), look: v(WOMB_RX * 0.9, 5, 0), lookTo: fetus, fov: 50, curve: "linear" }),
    // Gramofonun başından bebeğe: plak dönerken.
    (t) => ({ at: t, from: v(GRAM.x + 2.4, GRAM.y + 1.6, GRAM.z + 2.2), to: v(GRAM.x + 1.2, GRAM.y + 1.3, GRAM.z + 0.8), look: v(GRAM.x, GRAM.y + 0.8, GRAM.z), lookTo: fetus, fov: 44 }),
  ];
  const shots: Shot[] = [{ at: 0, from: cover.position.clone().add(new THREE.Vector3(2, 6, 10)), to: cover.position, look: cover.target, fov: 50 }];
  const style = STYLES[id];
  beats.forEach((beat, i) => {
    if (beat.at < 4) return;
    const custom = style?.acts?.[beat.id];
    const act = custom?.look ? ({ ...custom, at: beat.at } as Shot) : { ...templates[i % templates.length](beat.at, i), ...custom };
    act.grade ??= style?.base;
    // Yumruklar: omuz kamerası; isyan ve kızıl perdeler: daha geniş, sarsıntılı.
    if (/vur|cehennem|ates|isyan|kalles/.test(beat.id)) act.handheld ??= 0.08;
    shots.push(act);
    const end = beats[i + 1]?.at ?? beat.at + 10;
    // Oyuncu: perdenin kahramanına yakın plan (perde yeterince uzunsa, perde çekiminden 4 sn sonra).
    if (hasCue(id, beat.id) && end - beat.at > 7) {
      const close = { at: beat.at + 4, ...actorShot(i, WALL) } as Shot;
      close.grade = act.grade;
      if (act.lens) close.lens = act.lens;
      if (act.handheld) close.handheld = act.handheld;
      shots.push(close);
    }
    // Uzun perdeler tek çekimde durmasın: ~8 saniyede bir aynı renkte başka bir açıya kes.
    for (let k = 1, t = beat.at + 8; t < end - 4; k += 1, t += 8) {
      const extra = templates[(i + k * 2) % templates.length](t, i + k);
      extra.grade = act.grade;
      if (act.lens) extra.lens = act.lens;
      if (act.handheld) extra.handheld = act.handheld;
      shots.push(extra);
    }
  });
  const last = beats[beats.length - 1];
  if (last) shots.push({ at: last.at + 10, from: at(12, FETUS_Y + 3), to: cover.position, look: fetus, lookTo: cover.target, fov: 50 });
  return shots.sort((a, b) => a.at - b.at);
}

const CLIPS: Record<string, Shot[]> = Object.fromEntries(Object.entries(STORY).map(([id, beats]) => [id, clipShots(beats, id)]));

export const world: WorldDefinition = {
  ...ALBUM,
  plinth: "wood",
  dais: false,
  player: { start: START, lookAt: { x: 0, z: 0 }, walkSpeed: 4, sprintSpeed: 6.5, jumpSpeed: 4.6 },

  async build(ctx): Promise<WorldLogic> {
    const { scene, runtime, records, gramophone, colliders, random, interaction, sfx, hud } = ctx;
    runtime.renderer.toneMapping = THREE.AgXToneMapping;
    // Kapaktaki gibi koyu, doygun kan kırmızısı; bebek arkadan gelen ışıkla parlar.
    runtime.renderer.toneMappingExposure = 1.0;
    runtime.grade.uVignette.value = 0.55;
    runtime.grade.uGrain.value = 0.035;
    runtime.grade.uSaturation.value = 1.2;
    runtime.grade.uContrast.value = 1.1;
    runtime.setBloom(0);
    sfx.setAmbience("womb", 1);
    records.beacons = false;

    const womb = createWomb(random);
    scene.add(womb.group);
    const fog = new THREE.FogExp2("#1a0302", BASE.fog);
    scene.fog = fog;
    colliders.setBounds({ type: "circle", cx: 0, cz: 0, r: WALK_RADIUS });

    const hemi = new THREE.HemisphereLight("#ff8a5a", "#1a0302", 0.35);
    const back = new THREE.DirectionalLight("#ffb07a", 4.5);
    back.position.set(0, 14, -30);
    back.target.position.set(0, FETUS_Y, 0);
    const fill = new THREE.PointLight("#ff5a3a", 5, 40, 1.6);
    fill.position.set(0, 3, 12);
    scene.add(hemi, back, back.target, fill);

    const bokeh: THREE.Sprite[] = [];
    // Bebek: arkadan gelen ışıkla içi parlayan yarı saydam ten (sahte yüzey altı saçılma).
    const fetus = new THREE.Group();
    const gltf = await ctx.assets.gltf("models/hayko-infant.glb");
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const length = box.getSize(new THREE.Vector3()).length();
    model.position.sub(center);
    const holder = new THREE.Group();
    holder.add(model);
    holder.scale.setScalar(13.5 / length);
    const rim = { uRim: { value: new THREE.Color("#ff7a3c") }, uRimPower: { value: 1.8 } };
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const source = mesh.material as THREE.MeshStandardMaterial;
      const skin = new THREE.MeshStandardMaterial({
        map: source.map,
        normalMap: source.normalMap,
        color: "#f2b49a",
        roughness: 0.55,
        metalness: 0,
      });
      skin.onBeforeCompile = (shader) => {
        shader.uniforms.uRim = rim.uRim;
        shader.uniforms.uRimPower = rim.uRimPower;
        shader.fragmentShader = shader.fragmentShader
          .replace("#include <common>", "#include <common>\nuniform vec3 uRim;\nuniform float uRimPower;")
          .replace(
            "#include <emissivemap_fragment>",
            `#include <emissivemap_fragment>
            float edge = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
            totalEmissiveRadiance += uRim * (pow(edge, uRimPower) * 2.4 + 0.06);`,
          );
      };
      mesh.material = skin;
      mesh.castShadow = true;
    });
    fetus.add(holder);
    fetus.rotation.y = Math.PI / 2;
    // Beşik: kapaktaki eğik duruş (nabız ve tekme hareketleri bebeğin kendi grubunda).
    const cradle = new THREE.Group();
    cradle.position.set(0, FETUS_Y, 0);
    cradle.rotation.z = COVER_TILT;
    cradle.add(fetus);
    scene.add(cradle);

    // Kapaktaki bokeh: zarın üst arkasında yumuşak, sıcak ışık lekeleri.
    for (let i = 0; i < 26; i += 1) {
      const warm = random() < 0.6;
      const spot = glowSprite(warm ? "#ffd9c4" : "#ff7a6a", 1.2 + random() * 3.4);
      spot.material.opacity = 0.35 + random() * 0.5;
      spot.position.set(-17 + random() * 22, 13 + random() * 11, -26 + random() * 8);
      spot.userData.phase = random() * Math.PI * 2;
      bokeh.push(spot);
      scene.add(spot);
    }

    // Göbek bağı: bebeğin gövdesinin içinden başlar, arkadan yukarı, zarın üst arka duvarındaki plasentaya
    // kıvrılır. Hiçbir bakış açısında bebeğin altında sarkmaz (kapakta göbek bağı görünmez).
    const cordCurve = CORD;
    const cord = new THREE.Mesh(
      new THREE.TubeGeometry(cordCurve, 180, 0.24, 14),
      new THREE.MeshPhysicalMaterial({ color: "#b98b80", roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.25, emissive: "#4a1008", emissiveIntensity: 0.3 }),
    );
    scene.add(cord);

    // Kapak tipografisi: bebeğin arkasında, kapaktaki yerlerinde (üstte sanatçı, altta albüm adı). Sabit.
    const [artist, album, volume] = await Promise.all([
      createText3D("HAYKO\nCEPKİN", { font: "sedgwick-400", size: 1.15, depth: 0.2, color: "#ffffff", emissive: 1.8, letterSpacing: 0.04, lineHeight: 0.95, fog: false }),
      createText3D("BENİ BÜYÜTEN ŞARKILAR", { font: "sedgwick-400", size: 0.74, depth: 0.16, color: "#ffffff", emissive: 1.8, fog: false }),
      createText3D("VOL.1", { font: "sedgwick-400", size: 0.4, depth: 0.1, color: "#ffffff", emissive: 1.8, align: "left", fog: false }),
    ]);
    artist.position.set(-3.7, FETUS_Y + 5.4, -6);
    album.position.set(-2.4, FETUS_Y - 6.3, -6);
    const albumBox = album.geometry.boundingBox!;
    volume.position.set(album.position.x + albumBox.max.x + 0.25, album.position.y - 0.18, -6);
    // Kapaktaki gibi beyaz harf, koyu gölge: her yazının arkasında hafif kaymış siyah bir kopya.
    const shadowInk = new THREE.MeshBasicMaterial({ color: "#120302" });
    for (const text of [artist, album, volume]) {
      const shade = new THREE.Mesh(text.geometry, shadowInk);
      shade.position.copy(text.position).add(new THREE.Vector3(0.07, -0.07, -0.12));
      scene.add(shade);
    }
    scene.add(artist, album, volume);

    // Kan hücreleri / sıcak ışık benekleri (kapaktaki bokeh).
    const motes = createParticles({
      count: Math.round(260 + 520 * runtime.profile.detail),
      box: new THREE.Vector3(46, 26, 46),
      size: 0.5,
      color: BASE.particles.color,
      opacity: BASE.particles.opacity,
      additive: true,
    });
    scene.add(motes.points);
    const kickBurst = createEmitter({ ...SPARKLE("#ffd2a8", 2.2), count: 120 });
    scene.add(kickBurst.points);

    // Gramofon: başlangıcın sağ önünde, ahşap sehpa üstünde.
    const gx = GRAM.x;
    const gz = GRAM.z;
    gramophone.place(gx, wombGround(gx, gz), gz, yawTowards(gx, gz, START.x, START.z) + Math.PI, 1.3);
    gramophone.setBeaconStyle("#ffd9a8", true);
    colliders.addCircle(gx, gz, 1.3);

    // Anı kabarcıkları: her plak bir kabarcığın içinde, bebeğin etrafında süzülür.
    interface Bubble {
      record: GameRecord;
      mesh: THREE.Mesh;
      material: THREE.ShaderMaterial;
      radius: number;
      height: number;
      speed: number;
      phase: number;
      alive: boolean;
      pop: number;
      /** Ürkme: koşarak yaklaşılınca kabarcık yörüngesinden kaçar (0..1, yavaşça geri döner). */
      shy: number;
      /** Kaçış yönü (açı ofseti). */
      flee: number;
    }
    const bubbles: Bubble[] = [];
    let shyHintAt = -100;
    const tints = ["#ffd39a", "#9fc4ff", "#c5f0ff", "#ff7a5a", "#ffb0c0", "#e6e0dc", "#fff0d6", "#ff8a3a", "#f2c46a"];
    const bubbleGeometry = new THREE.SphereGeometry(1.2, 40, 24);
    records.list.forEach((record, index) => {
      record.hover = 0;
      if (ctx.startShelved.has(record.track.id)) {
        records.collect(record);
        return;
      }
      const material = createBubbleMaterial(tints[index % tints.length]);
      const mesh = new THREE.Mesh(bubbleGeometry, material);
      mesh.renderOrder = 4;
      scene.add(mesh);
      const bubble: Bubble = {
        record,
        mesh,
        material,
        radius: 7 + random() * 12,
        height: 1.8 + random() * 1.6,
        speed: (0.035 + random() * 0.04) * (random() < 0.5 ? -1 : 1),
        phase: random() * Math.PI * 2,
        alive: true,
        pop: 0,
        shy: 0,
        flee: 0,
      };
      record.pickable = false;
      records.drop(record, 0, 0, 0);
      bubbles.push(bubble);
      // Kabarcık zarı esnek ama geçilmez: içinden yürünmez, E ile patlatılır.
      colliders.solid(mesh, { shape: "round", pad: -0.1, when: () => bubble.alive });
      interaction.add({
        radius: 1.2,
        position: (target) => target.copy(mesh.position),
        prompt: () => (bubble.alive ? [{ key: "E", label: `Anı kabarcığını patlat · ${record.track.title}` }] : null),
        use: () => {
          bubble.alive = false;
          record.pickable = true;
          sfx.cue("hit");
          ctx.pickUp(record);
        },
      });
    });

    // Gölge oyunu: dışarıdaki dünyanın siluetleri arka duvara düşer.
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 768;
    shadowCanvas.height = 384;
    const shadowContext = shadowCanvas.getContext("2d")!;
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    womb.uniforms.uShadow.value = shadowTexture;
    let memoryId: string | null = null;
    let trackId: string | null = null;
    let timeline: Timeline | null = null;
    let beats: readonly Beat[] = [];
    let story = 0;
    let lastPunch = -1;
    let touchedAt = -1;
    let drawTimer = 0;
    let wallHint = 0;

    let mood: Mood = BASE;
    let growth = 0;
    let light = 0.7;
    let boost = 1;
    let flicker = 0;
    let heartPhase = 0;
    let bpm = 62;
    let kick = 0;
    let birth = -1;
    let clock = 0;
    const lightColor = new THREE.Color(BASE.light);
    const scratch = new THREE.Color();
    // Hatıra eşyaları (gizli keşifler): şarkıların belirli anlarında zarda belirir.
    const kickFetus = () => {
      kick = 1;
      kickBurst.origin.set(0, FETUS_Y, 1.5);
      kickBurst.burst(clock);
    };
    const keepsakes = createKeepsakes(ctx, kickFetus);
    await loadCharacterLibrary(ctx.assets);
    const models = await loadModels(ctx.assets, [...silhouetteModels(), ...QUIZ_MODELS]);
    const props = createSongProps(scene, random, models);
    // Şarkı oyuncusu: perdelerin kahramanı, gölge oyununun önünde (yalnız şarkı çalarken).
    const songActor = createSongActor(scene, new THREE.MeshStandardMaterial({ color: "#050506", roughness: 1 }));
    // Sınav kürsüsü: rahmin kenarında bir okul sırası (yeri her girişte değişir).
    const quiz = createQuiz(ctx, models);

    interaction.add({
      radius: 12,
      reach: 90,
      position: (target) => target.copy(WALL),
      prompt: () => (memoryId && touchedAt < 0 ? [{ key: "E", label: "Anıya dokun" }] : null),
      use: () => {
        if (!memoryId || touchedAt >= 0) return;
        touchedAt = clock;
        kick = 1;
        sfx.cue("chime");
        sfx.cue("pulse");
        kickBurst.origin.set(0, FETUS_Y, 1.5);
        kickBurst.burst(clock);
        hud.hint(TOUCH_LINES[memoryId] ?? "", 5);
      },
    });

    const logic: WorldLogic = {
      ground: wombGround,
      debug: { quiz, songActor },
      surface: "soft",
      startHint: "Süzülen kabarcıklara yaklaş, E ile patlat — her biri bir anı. Gramofon sağ önünde.",
      coverPoint: {
        // Kapaktaki profil: bebek sağa bakar, baş sağda, dizler solda; kamera arkadan-soldan (azimut −2,6).
        stand: { x: -4.0, z: -6.6 },
        camera: {
          position: new THREE.Vector3(Math.sin(-2.6) * 9.6, FETUS_Y + 1.2, Math.cos(-2.6) * 9.6),
          target: new THREE.Vector3(0, FETUS_Y + 0.4, 0),
          fov: 47,
          // Kapaktaki gibi yatık: baş sağda, gövde çapraz.
          roll: 0.8,
        },
      },
      prompt: () => keepsakes.prompt(),
      shots: (id) => CLIPS[id] ?? null,
      use: () => keepsakes.use(),
      onTrack(track) {
        mood = (track && MOODS[track.id]) || BASE;
        trackId = track?.id ?? null;
        beats = (track && STORY[track.id]) || [];
        timeline = beats.length ? createTimeline(beats) : null;
        memoryId = track && MEMORIES[track.id] ? track.id : null;
        touchedAt = -1;
        // Şarkı adı göründükten sonra oyuncuya anıyı hatırlat.
        wallHint = memoryId ? 7 : 0;
      },
      onFound(count, total) {
        growth = count / total;
        bpm = 62 + growth * 48;
        sfx.setHeartRate(bpm);
      },
      onFinale() {
        birth = 0;
        return 10;
      },
      update(dt, time) {
        clock = time;
        quiz.update(dt, time);
        // Şarkının saniyesi: perdeler ilerler.
        const songTime = ctx.songTime();
        timeline?.update(songTime);
        story = storyProgress(beats, songTime);
        const act = timeline?.current?.id ?? "";
        songActor.update(dt, time, trackId ?? "", act, timeline !== null && songTime >= 0 && ctx.music.state === "playing");
        // "Vur" perdesinde her yumrukta bebek irkilir; "cehennem" perdelerinde ışık kızıla keser.
        if (act === "vur" && Math.floor(songTime * 1.25) !== lastPunch) {
          lastPunch = Math.floor(songTime * 1.25);
          kick = Math.max(kick, 0.6);
        }
        const hot = act.startsWith("cehennem");
        keepsakes.update(dt, time, trackId, songTime);
        props.update(dt, time, trackId, act, songTime);
        if (wallHint > 0) {
          wallHint -= dt;
          if (wallHint <= 0 && touchedAt < 0) hud.hint("Soluna dön: zara düşen gölgeler şarkıyı anlatıyor. Gölgelere bakıp E ile anıya dokun.", 7);
        }
        // Kalp atışı: görsel nabız ses ile aynı tempoda; anıya dokununca bebek tekmeler.
        heartPhase = (heartPhase + dt * ((bpm + kick * 30) / 60)) % 1;
        const pulse = Math.exp(-heartPhase * 9) + Math.exp(-Math.max(0, heartPhase - 0.28) * 11) * 0.6 * (heartPhase > 0.28 ? 1 : 0);
        kick = Math.max(0, kick - dt * 0.8);

        light = approach(light, 0.55 + growth * 0.85, 0.8, dt);
        boost = approach(boost, mood.boost, 0.7, dt);
        flicker = approach(flicker, hot ? 1.2 : (mood.flicker ?? 0), 1.2, dt);
        lightColor.lerp(scratch.set(hot ? "#ff2410" : mood.light), 1 - Math.exp(-0.7 * dt));
        fog.density = approach(fog.density, mood.fog, 0.6, dt);

        const u = womb.uniforms;
        u.uTime.value = time;
        u.uPulse.value = pulse;
        u.uLight.value = light * boost * (1 + kick * 0.6);
        u.uLightColor.value.copy(lightColor);
        u.uFlicker.value = flicker;
        u.uShadowLevel.value = approach(u.uShadowLevel.value, memoryId ? 1 : 0, 0.7, dt);
        back.color.copy(lightColor);
        back.intensity = (2.2 + growth * 2.5) * boost;
        fill.intensity = 4 + pulse * 4;
        rim.uRim.value.copy(lightColor).multiplyScalar(0.6 + growth * 0.8 + kick * 0.8);

        // Anı tablosunu ~20 fps çiz (dokunuş olayı 4 saniyede tamamlanır).
        drawTimer -= dt;
        if (memoryId && drawTimer <= 0 && u.uShadowLevel.value > 0.01) {
          drawTimer = 1 / 20;
          const draw = MEMORIES[memoryId];
          const g = shadowContext;
          g.setTransform(1, 0, 0, 1, 0, 0);
          g.clearRect(0, 0, 768, 384);
          g.setTransform(0.75, 0, 0, 0.75, 0, 0);
          g.fillStyle = "#000";
          g.strokeStyle = "#000";
          g.globalCompositeOperation = "source-over";
          draw(g, time, touchedAt < 0 ? 0 : Math.min(1, (time - touchedAt) / 4), story);
          shadowTexture.needsUpdate = true;
        }

        // Büyüme: bebek her ayda büyür; kalp atışıyla nefes alır, dokununca tekmeler.
        const scale = 0.66 + growth * 0.34;
        fetus.scale.setScalar(scale * (1 + pulse * 0.012));
        fetus.position.y = Math.sin(time * 0.4) * 0.25;
        for (const spot of bokeh) spot.material.opacity = 0.3 + 0.35 * (0.5 + 0.5 * Math.sin(time * 0.6 + spot.userData.phase));
        fetus.rotation.z = Math.sin(time * 0.23) * 0.05 + Math.sin(time * 18) * kick * 0.06;
        fetus.rotation.x = Math.sin(time * 14) * kick * 0.04;

        const p = mood.particles;
        motes.velocity.lerp(new THREE.Vector3(...p.velocity), 1 - Math.exp(-dt));
        motes.color.lerp(scratch.set(p.color), 1 - Math.exp(-dt));
        motes.size = approach(motes.size, p.size, 1, dt);
        motes.opacity = approach(motes.opacity, p.opacity, 1, dt);
        motes.update(dt, ctx.camera.position);
        kickBurst.update(time);

        for (const bubble of bubbles) {
          bubble.material.uniforms.uTime.value = time;
          if (bubble.alive) {
            // Anılar ürkektir: koşarak (ya da zıplayarak) yaklaşana kaçarlar; yavaş yürüyene gelirler.
            const toPlayer = Math.hypot(bubble.mesh.position.x - ctx.player.position.x, bubble.mesh.position.z - ctx.player.position.z);
            const rushing = ctx.player.speed() > 4.4 || !ctx.player.onGround;
            if (rushing && toPlayer < 5) {
              if (bubble.shy < 0.05) bubble.flee = (random() < 0.5 ? -1 : 1) * (0.9 + random() * 0.6);
              bubble.shy = Math.min(1, bubble.shy + dt * 2.5);
              if (time - shyHintAt > 20) {
                shyHintAt = time;
                hud.hint("Anılar ürkek: koşarsan kaçarlar. Yavaş yaklaş.", 4);
              }
            } else {
              bubble.shy = Math.max(0, bubble.shy - dt * 0.25);
            }
            const a = time * bubble.speed + bubble.phase + bubble.flee * bubble.shy;
            const radius = Math.min(WALK_RADIUS - 1.5, bubble.radius + bubble.shy * 3);
            const x = Math.cos(a) * radius;
            const z = Math.sin(a) * radius;
            bubble.mesh.position.set(x, wombGround(x, z) + bubble.height + bubble.shy * 2.2 + Math.sin(time * 0.8 + bubble.phase) * 0.3, z);
            if (bubble.record.state === "world") bubble.record.group.position.copy(bubble.mesh.position);
          } else if (bubble.pop < 1) {
            bubble.pop = Math.min(1, bubble.pop + dt * 3);
            bubble.mesh.scale.setScalar(1 + bubble.pop * 0.6);
            bubble.material.uniforms.uOpacity.value = 1 - bubble.pop;
            if (bubble.pop >= 1) bubble.mesh.visible = false;
          }
        }

        // Doğum: ışık zarı yırtar, ekran beyaza açılır.
        if (birth >= 0) {
          birth += dt;
          const k = Math.min(1, birth / 9);
          runtime.grade.uFadeColor.value.set("#fff4ea");
          runtime.grade.uFade.value = k * k;
          back.intensity += k * 40;
          if (birth > 9) sfx.setAmbience("room", 0.2);
        } else {
          runtime.grade.uFade.value = approach(runtime.grade.uFade.value, 0, 0.8, dt);
        }
      },
      onFinaleDone() {
        birth = -1;
        sfx.setAmbience("womb", 1);
      },
    };
    return logic;
  },
};
