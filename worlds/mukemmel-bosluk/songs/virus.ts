import * as THREE from "three";
import { Reflector } from "three/addons/objects/Reflector.js";
import type { SongScene } from "../../../engine/game/songStage";
import type { ClipGrade, Shot } from "../../../engine/game/director";
import { announce, gazeTarget, glowSprite, ground, secretItem, type SceneKit } from "./kit";
import { createFigure } from "../../../engine/fx/figure";
import { createPerformer, type PerfKey, type PerfLook } from "../../../engine/fx/performer";
import { createArchive } from "./virus/archive";
import { createCrimson } from "./virus/crimson";
import { COL_X, CURTAIN, HALL, KEY_CASE, SHEETS, type Filament, type Membrane, type Residue, type WallFilm } from "./virus/types";

/**
 * Aşk, Virüs — tek bir film, tek bir yapı: kraterin ortasına gömülü anıtsal bir ARŞİV (galeri → koridor → koleksiyon →
 * levhalar → depo; çıkış yine kratere, gün ışığına). Bir adam ve bir kadın içeri girer; kadın bir vitrinin camına
 * dokunur ve gider. Dokunduğu yerde para kadar saydam kızıl bir kalıntı kalır. Kalıntı kıpırdar, mimariye girer, yayılır:
 * aşk burada yapışkan bir malzemedir — temas eder, yayılır, direnince güçlenir. Adam onu kazır, koparır, kaçar, başkalarının
 * giysileri arasına gömülür; her deneme ağı büyütür. Sonunda anlar: malzeme kadını değil onu izliyor; onu besleyen kendi
 * dönüp dönüp bakışıdır. Kadın bir kez daha gelir; adam peşinden gitmez; ağ gerilimini kaybeder, çatlaklara çekilir; bir
 * vitrinde tek bir küçük kalıntı kalır, rengini kaybeder, dibe düşer. Adam dışarı, gün ışığına çıkar. Kalıntı bir kez daha
 * kıpırdar. Siyah. Ekranda yazı yoktur. Bütün hareket şarkının saniyesinin işlevidir: ileri ve geri sarma aynı kareyi verir.
 */
const L = {
  nobody: 9.96, look: 15.26, overflow: 18.2, capsize: 26.57, line5: 32.86, collection: 34.93, ah: 43.66, of: 50.36,
  syllables: 58.31, curse: 62.69, died: 66.73, bury: 70.82, virus: 78.87, plastic: 87.02, thin: 93.4, stuck: 95.43, gum: 103.84, of2: 112.53,
  chorus: 118.89, c2: 123.19, c3: 127.29, c4: 131.46, chorusB: 135.56, cb2: 139.83, cb3: 144.04, cb4: 148.14, fever: 154.73,
  chorus2: 168.92, d2: 173.27, d3: 177.38, d4: 181.5, chorus2b: 185.64, e2: 189.9, e3: 194.07, e4: 198.26, end: 202.77,
} as const;
/** Şarkının sesi (YouTube) 3:49,26 sürer; son kare sesle birlikte kararır. */
const AUDIO_END = 229.26;
/** Ağın büyüdüğü, geri çekildiği ve çöktüğü anlar. */
const SPREAD = 53.4;
const RELEASE = 157.6;
const COLLAPSE = L.e3;
const WITHDRAW = L.e4;
/** Figürlerin tonu: evrenin ışığı yükseltilir (moments.ts), figürler aynı oranda kısılır; beyazlar patlamaz. */
const FIGURE_TONE = 0.7;
/** Baş eğme yönü (kişinin sağ ekseni çevresinde). */
const TILT = -1;
const MIRROR_LAYER = 5;

// --- Paletler: steril → iz → bulaşma → doygunluk → bırakma -----------------------------------------------------------
const CLEAN: ClipGrade = { exposure: 1.03, contrast: 1.0, saturation: 0.9, tint: "#f3f2f0", lift: "#0f1012", vignette: 0.18 };
const TRACE: ClipGrade = { exposure: 1.02, contrast: 1.0, saturation: 0.92, tint: "#f4f0ee", lift: "#121012", vignette: 0.2 };
const CONTAM: ClipGrade = { exposure: 1.0, contrast: 1.03, saturation: 0.9, tint: "#f3ebea", lift: "#160a0d", vignette: 0.24 };
const SATUR: ClipGrade = { exposure: 0.98, contrast: 1.06, saturation: 0.96, tint: "#f0e6e6", lift: "#1a070a", vignette: 0.28 };
const MEMORY: ClipGrade = { exposure: 1.04, contrast: 0.98, saturation: 1.0, tint: "#ffe9d8", lift: "#1a1210", vignette: 0.22, soft: 0.15 };
const RELEASED: ClipGrade = { exposure: 1.02, contrast: 0.98, saturation: 0.72, tint: "#f1f1f0", lift: "#101112", vignette: 0.22 };
const FINAL: ClipGrade = { exposure: 1.0, contrast: 0.98, saturation: 0.6, tint: "#eeeeef", lift: "#0d0d0e", vignette: 0.26 };

const { clamp, lerp } = THREE.MathUtils;
const smooth = (x: number) => {
  const k = clamp(x, 0, 1);
  return k * k * (3 - 2 * k);
};
const bump = (t: number, a: number, b: number, c: number, d: number) => THREE.MathUtils.smoothstep(t, a, b) * (1 - THREE.MathUtils.smoothstep(t, c, d));
const pulse = (t: number, at: number, width = 0.32) => {
  const k = (t - at) / width;
  return k < 0 || k > 1 ? 0 : Math.sin(k * Math.PI) ** 2;
};
/** Figüre göre nokta: dx soluna, dz baktığı yöne, dy yukarı (figürün ebeveyn uzayında). */
function relative(g: THREE.Object3D, dx: number, dy: number, dz: number, out = new THREE.Vector3()): THREE.Vector3 {
  const yaw = g.rotation.y;
  return out.set(g.position.x + Math.cos(yaw) * dx + Math.sin(yaw) * dz, g.position.y + dy, g.position.z - Math.sin(yaw) * dx + Math.cos(yaw) * dz);
}
const rightOf = (g: THREE.Object3D, out = new THREE.Vector3()) => out.set(-Math.cos(g.rotation.y), 0, Math.sin(g.rotation.y));
const UP = new THREE.Vector3(0, 1, 0);
const Z_PLUS = new THREE.Vector3(0, 0, 1);

/** Yol boyunca kesirli nokta (yay uzunluğuna göre). */
function pointAlong(path: THREE.Vector3[], k: number, out: THREE.Vector3): THREE.Vector3 {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) total += path[i].distanceTo(path[i - 1]);
  let s = clamp(k, 0, 1) * total;
  for (let i = 1; i < path.length; i += 1) {
    const d = path[i].distanceTo(path[i - 1]);
    if (s <= d || i === path.length - 1) return out.lerpVectors(path[i - 1], path[i], d > 1e-6 ? clamp(s / d, 0, 1) : 0);
    s -= d;
  }
  return out.copy(path[path.length - 1]);
}

export async function createVirusScene(kit: SceneKit): Promise<SongScene> {
  const root = new THREE.Group();
  const random = kit.random;
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const tmp3 = new THREE.Vector3();
  const tmp4 = new THREE.Vector3();
  let songNow = 0;

  // --- Arşiv: kraterin ortasında, kapladığı yerin en yüksek zeminine oturur (hiçbir şey toprağa gömülmez) --------------
  const archive = createArchive(kit, random);
  const P = new THREE.Vector3(0, -Infinity, 8);
  for (let x = HALL.x0 - 1; x <= HALL.x1 + 8; x += 2) {
    for (let z = HALL.z0 - 1; z <= HALL.z1 + 1; z += 2) P.y = Math.max(P.y, ground(P.x + x, P.z + z));
  }
  P.y += 0.08;
  archive.group.position.copy(P);
  root.add(archive.group);
  const crimson = createCrimson(random);
  archive.group.add(crimson.group);
  root.updateMatrixWorld(true);
  /** Yerel → dünya (arşiv dönmez, ölçeklenmez). */
  const wv = (x: number, y: number, z: number, out = new THREE.Vector3()) => out.set(x + P.x, y + P.y, z + P.z);
  const toWorld = (v: THREE.Vector3) => v.add(P);
  const toLocal = (v: THREE.Vector3) => v.sub(P);
  const A = (x: number, y: number, z: number) => () => wv(x, y, z);

  // --- Kişiler: adam (grafit) ve kadın (bordo); arşivin çocuğu, zemin düz (y = 0) ------------------------------------------
  const flat = () => 0;
  const him = createPerformer(createFigure({ kind: "man", outfit: "man_graphite", height: 1.82 }), flat, 1.82);
  const her = createPerformer(createFigure({ kind: "woman", outfit: "woman_burgundy", height: 1.68 }), flat, 1.68);
  const himG = him.g;
  const herG = her.g;
  himG.rotation.order = herG.rotation.order = "YXZ";
  himG.visible = herG.visible = false;
  archive.group.add(himG, herG);
  for (const g of [himG, herG]) {
    g.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      mesh.renderOrder = 3;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (/Hair/i.test(material.name ?? "")) material.color.set(g === herG ? "#3a2214" : "#1e1712");
      if (/Superhero|Eyes/i.test(material.name ?? "")) material.color.multiplyScalar(FIGURE_TONE);
    });
  }
  const himAt = (dx: number, dy: number, dz: number) => () => toWorld(relative(himG, dx, dy, dz));
  const bodyOf = (g: THREE.Object3D, h: number) => () => wv(g.position.x, g.position.y + h, g.position.z);
  const boneLocal = (g: THREE.Object3D, name: string, out: THREE.Vector3) => {
    const bone = g.getObjectByName(name);
    if (!bone) return out.copy(g.position).setY(g.position.y + 1.2);
    return toLocal(bone.getWorldPosition(out));
  };
  const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
  const K = (t: number, x: number, z: number): PerfKey => [t, x, z];
  const flawed = archive.flawedCase;
  const FRONT = flawed.front.clone();
  const FRAME_PT = new THREE.Vector3(-9.85, 1.3, -1.85);
  const HERO_SHEET = new THREE.Vector3(SHEETS.x0 + SHEETS.hero.col * SHEETS.dx, SHEETS.bottom + SHEETS.h / 2, SHEETS.z0 + SHEETS.hero.row * SHEETS.dz);
  const SHEETS_GLASS = new THREE.Vector3(-12.8, 1.4, 5.98);

  him.keys.push(
    K(0, 18.0, 1.45), K(20.5, 18.0, 1.45), K(24.0, 14.6, 0.25), K(29.0, 14.6, 0.25), K(34.9, 4.5, 0.0),
    K(43.66, -8.2, -11.6), K(44.5, -8.2, -12.52), K(53.0, -8.2, -12.52), K(58.3, -10.5, -0.9), K(59.6, -12.1, 0.2), K(66.73, -12.1, 0.2),
    K(68.3, -13.3, 3.0), K(69.6, -15.2, 1.8), K(70.82, -16.8, 0.3), K(73.5, -21.0, 1.5), K(79.6, -21.0, 1.5), K(87.0, -10.8, 0.0),
    K(101.0, -10.8, 0.0), K(101.8, -10.5, -1.3), K(102.3, -10.5, -1.3), K(103.84, -12.6, -0.7), K(104.4, -12.6, -0.7), K(105.6, -10.6, -1.1),
    K(111.5, -10.6, -1.1), K(113.0, -11.2, 1.6), K(114.5, -11.2, 1.6), K(117.6, -12.8, 4.3), K(123.2, -12.8, 4.3), K(126.5, -10.4, 0.2),
    K(135.0, -8.2, -11.6), K(135.56, -8.2, -12.4), K(148.6, -8.2, -12.4), K(152.5, -5.5, -7.5), K(167.0, -5.5, -7.5), K(167.5, -6.0, -8.0),
    K(174.0, -6.0, -8.0), K(181.0, -3.6, 0.0), K(201.5, -3.6, 0.0), K(216.0, 17.0, 0.0), K(220.9, 24.3, 0.0), K(223.0, 28.5, 0.0),
  );
  him.poses.push([0, "still"], [20.5, "move"], [136.2, "kneel"], [148.3, "still"], [148.6, "move"]);
  him.rates.push([136.2, 1], [137.4, 0.2], [147.6, 1.0], [148.3, 1]);
  /** Ağın çevresinde ağır bir bakış turu (klimaks). */
  const sweep = (cx: number, cz: number, t0: number) => () => tmp4.set(cx + 4 * Math.cos((songNow - t0) * 0.35), 0, cz + 4 * Math.sin((songNow - t0) * 0.35));
  const himLooks: [number, PerfLook][] = [
    [0, V(19, 0.3)], [7.5, her], [11.6, V(26, 0)], [20.5, "path"], [24.0, V(26, 0)], [29.0, "path"], [43.66, V(FRONT.x, FRONT.z)], [53.0, "path"],
    [59.6, V(HERO_SHEET.x, HERO_SHEET.z)], [66.73, "path"], [69.3, V(-15.3, 6)], [69.6, "path"], [73.5, V(-21, -3)], [79.6, "path"], [87.0, V(-9.2, 0)],
    [96.6, V(-4, 0)], [101.0, V(FRAME_PT.x, FRAME_PT.z)], [102.3, "path"], [103.84, V(FRAME_PT.x, FRAME_PT.z)], [104.4, "path"], [105.6, V(FRAME_PT.x, FRAME_PT.z)],
    [111.5, "path"], [113.0, V(-4, 0)], [114.5, "path"], [117.6, V(-12.8, 6)], [123.2, "path"], [135.56, V(FRONT.x, FRONT.z)], [148.3, V(-3, 0)],
    [152.5, V(-3, -4)], [165.5, V(-3.2, -5.6)], [167.0, V(26, 0)], [167.7, V(-8, -9)], [168.3, V(26, 0)], [168.92, sweep(-6, -8, 168.92)], [174.0, "path"],
    [181.0, sweep(-3.6, 0, 181)], [185.64, V(18, 0)], [194.07, V(26, 0)], [198.5, V(FRONT.x, FRONT.z)], [201.5, "path"],
  ];
  him.looks.push(...himLooks);

  her.keys.push(K(0, 19.25, 0.72), K(7.5, 19.25, 0.72), K(13.6, 24.3, 0.2), [15.26, 25.0, 0.0, undefined, "o"], K(16.6, 25.0, 0.0), K(18.6, 28.5, 0.0),
    K(60, 28.5, 0.0), K(60.5, -9.2, 0.0), K(150, -9.2, 0.0), K(150.5, 3.6, 0.4), K(184, 3.6, 0.4), K(184.5, 18.0, 0.0), K(191.5, 18.0, 0.0), K(197.4, 25.3, 0.0), K(199.5, 28.5, 0.0));
  her.poses.push([0, "still"], [7.5, "move"], [15.26, "still"], [16.6, "move"], [18.8, "still"], [191.5, "move"], [197.4, "still"]);
  her.looks.push([0, V(19, 0.3)], [7.5, "path"], [15.26, him], [16.6, "path"], [60, V(-14, 6)], [87, him], [191.5, "path"]);
  /** Kadın yalnız bu pencerelerde vardır (ilk sahne; yansıma; perde; hafıza; dönüş). */
  const herShown = (t: number) => t < 19.5 || (t >= 67.3 && t < 69.3) || (t >= L.plastic && t < 95.65) || (t >= L.cb3 && t < L.cb4) || (t >= L.chorus2b && t < 197.9);
  const herMirrored = (t: number) => t >= 67.3 && t < 69.3;
  const setLayer = (g: THREE.Object3D, layer: number) => g.traverse((child) => child.layers.set(layer));

  // --- Anahtar: tek nesne; yuvadan yere, ele, yere, kusurlu vitrine ------------------------------------------------------
  const key = archive.key;
  archive.group.attach(key);
  const KEY_HOME = new THREE.Vector3(KEY_CASE.x, KEY_CASE.plinth + 0.003, KEY_CASE.z);
  const KEY_FLOOR1 = new THREE.Vector3(-8.2, 0.003, -12.55);
  const KEY_FLOOR2 = new THREE.Vector3(-5.2, 0.003, -7.0);
  const KEY_FINAL = new THREE.Vector3(flawed.group.position.x, flawed.group.position.y - flawed.size.h / 2 + 0.02 + 0.003, flawed.group.position.z);
  const keyQuat = new THREE.Quaternion();
  const keyFix = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
  const KEY_TAKEN = 139.83;
  const KEY_DROP = 157.8;
  const KEY_BACK = 198.8;

  // --- Kızıl malzeme: kalıntılar, filamentler, zarlar, duvar filmleri -----------------------------------------------------
  /** Kalıntı yüzeye yaslanır (+z dışa bakar). */
  const placeResidue = (r: Residue, p: THREE.Vector3, n: THREE.Vector3) => {
    r.mesh.position.copy(p).addScaledVector(n, 0.0015);
    r.mesh.quaternion.setFromUnitVectors(Z_PLUS, n);
  };
  const resKeyGlass = crimson.residue(0.03);
  placeResidue(resKeyGlass, new THREE.Vector3(KEY_CASE.x + 0.13, KEY_CASE.plinth + KEY_CASE.glass / 2 + 0.02, KEY_CASE.z + 0.31), Z_PLUS);
  const resFlawed = crimson.residue(0.035);
  placeResidue(resFlawed, FRONT.clone().add(new THREE.Vector3(-0.07, -0.33, 0)), flawed.normal);
  const resLine = crimson.residue(0.045);
  const lineCase = archive.cases[1][9];
  placeResidue(resLine, lineCase.front.clone().add(new THREE.Vector3(0.1, 0.1, 0)), lineCase.normal);
  const resFinger = crimson.residue(0.014);
  const resSleeve = crimson.residue(0.03);
  const resExterior = crimson.residue(0.06);
  placeResidue(resExterior, new THREE.Vector3(22, 0.3, HALL.z1 + 0.42), Z_PLUS);
  const residues = [resKeyGlass, resFlawed, resLine, resFinger, resSleeve, resExterior];

  type Group = "S" | "A" | "B" | "T" | "C";
  interface Strand {
    fil: Filament;
    group: Group;
    o: number;
    slackBias: number;
  }
  const strands: Strand[] = [];
  const addStrand = (group: Group, path: THREE.Vector3[], radius = 0.006, segments = 48) => {
    const s: Strand = { fil: crimson.filament(path, radius, segments), group, o: random(), slackBias: random() * 0.3 };
    strands.push(s);
    return s;
  };
  const Vx = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  /** Zemin dikişi: hafif kıvrımlı yol. */
  const seam = (x0: number, z0: number, x1: number, z1: number, y = 0.012) => {
    const pts: THREE.Vector3[] = [];
    const n = 5;
    for (let i = 0; i <= n; i += 1) {
      const u = i / n;
      const w = i === 0 || i === n ? 0 : 0.18;
      pts.push(Vx(lerp(x0, x1, u) + (random() - 0.5) * w, y, lerp(z0, z1, u) + (random() - 0.5) * w));
    }
    return pts;
  };
  /** Vitrin çerçevesine tırmanış: zeminden kenar boyunca yukarı, üst kenar boyunca yana. */
  const climb = (c: { front: THREE.Vector3; size: { w: number; h: number } }, side: -1 | 1) => {
    const f = c.front;
    const x = f.x + (side * c.size.w) / 2;
    return [Vx(x + side * 0.08, 0.012, f.z + 0.1), Vx(x, f.y - c.size.h / 2, f.z + 0.01), Vx(x, f.y + c.size.h / 2, f.z + 0.01), Vx(f.x - side * 0.1, f.y + c.size.h / 2, f.z + 0.01)];
  };
  // S: ilk yayılma — kusurlu vitrinin çerçevesinden zemine, dikiş boyunca levhalar geçidine (kahraman kamera izler).
  const heroPath = [FRONT.clone().add(Vx(-0.05, -0.03, 0.005)), Vx(FRONT.x - flawed.size.w / 2, FRONT.y - flawed.size.h / 2, FRONT.z + 0.01), Vx(FRONT.x - flawed.size.w / 2 - 0.1, 0.012, FRONT.z + 0.2), Vx(-9.6, 0.012, -12.2), Vx(-9.9, 0.012, -7.0), Vx(-10.1, 0.012, -2.4), Vx(-10.3, 0.012, -0.9), Vx(-10.5, 0.012, 0.3)];
  const heroStrand = addStrand("S", heroPath, 0.0075, 64);
  addStrand("S", climb(flawed, 1), 0.004, 24);
  // A: ilk ağ — koleksiyon zemini, vitrin çerçeveleri, tavan ekleri, koridor, depo rayları.
  for (let i = 0; i < 12; i += 1) addStrand("A", seam(COL_X(i), -12.8, COL_X(i) + (random() - 0.5) * 3, -2 - random() * 9), 0.005);
  for (let i = 0; i < 12; i += 2) addStrand("A", climb(archive.cases[1][i], i % 4 === 0 ? -1 : 1), 0.0045, 24);
  for (let i = 1; i < 12; i += 3) addStrand("A", climb(archive.cases[2][i], 1), 0.004, 24);
  for (const z of [-9, -4, 2, 7, 12]) addStrand("A", [Vx(-10, 10.97, z), Vx(-3 + (random() - 0.5) * 2, 10.97, z + (random() - 0.5) * 1.5), Vx(4, 10.97, z)], 0.005, 32);
  for (const x of [-8, -5, -2, 1]) addStrand("A", [Vx(x, 10.97, -13.6), Vx(x, 10.97, -4), Vx(x, 10.97, 6)], 0.005, 32);
  for (let i = 0; i < 4; i += 1) addStrand("A", [Vx(4.1 + i * 2.6, 0.012, -2.85), Vx(5.1 + i * 2.6, 0.012, -1), Vx(6 + i * 2.6, 0.012, 1.6), Vx(6.4 + i * 2.6, 0.012, 2.85)], 0.004, 24);
  for (const p of archive.pedestals) addStrand("A", [Vx(p.front.x - 0.4, 0.012, p.front.z), Vx(p.front.x - 0.3, 0.3, p.front.z), Vx(p.front.x - 0.3, 1.0, p.front.z), Vx(p.front.x, 1.9, p.front.z)], 0.0045, 24);
  // B: onun yolu — galeri → koridor → koleksiyon → levhalar → depo; dokunduğu yerlerde tırmanır.
  const route: [number, number][] = [[18, 1.4], [14.6, 0.25], [4.5, 0], [-8.2, -11.6], [-10.5, -0.9], [-12.1, 0.2], [-15.2, 1.8], [-21, 1.5]];
  for (let i = 1; i < route.length; i += 1) {
    const [x0, z0] = route[i - 1];
    const [x1, z1] = route[i];
    for (let k = 0; k < 2; k += 1) addStrand("B", seam(x0 + (random() - 0.5) * 0.6, z0 + (random() - 0.5) * 0.6, x1 + (random() - 0.5) * 0.6, z1 + (random() - 0.5) * 0.6), 0.005);
  }
  addStrand("B", [Vx(FRAME_PT.x, 0.012, FRAME_PT.z), Vx(FRAME_PT.x, 1.3, FRAME_PT.z), Vx(FRAME_PT.x, 3.3, FRAME_PT.z - 0.1)], 0.005, 24);
  addStrand("B", [Vx(HERO_SHEET.x - 0.5, 0.012, HERO_SHEET.z + 0.2), Vx(HERO_SHEET.x - 0.4, 2.3, HERO_SHEET.z), Vx(HERO_SHEET.x + 1.2, 2.3, HERO_SHEET.z)], 0.004, 24);
  addStrand("B", [Vx(SHEETS_GLASS.x - 1.5, 0.012, SHEETS_GLASS.z), Vx(SHEETS_GLASS.x - 0.3, 1.4, SHEETS_GLASS.z), Vx(SHEETS_GLASS.x + 0.8, 3.5, SHEETS_GLASS.z)], 0.004, 24);
  for (let i = 0; i < 3; i += 1) addStrand("B", seam(15 + i * 2.5, -1.6, 16.5 + i * 2.5, 1.6, -0.3), 0.004);
  // C: klimaks — cam dikmeler, galeri, depo tavanı, geçit lentoları.
  for (let i = 0; i < 5; i += 1) addStrand("C", [Vx(-10 + i * 3, 0.012, 13.85), Vx(-10 + i * 3, 5.5, 13.85), Vx(-10 + i * 3, 10.9, 13.85)], 0.005, 24);
  for (let i = 0; i < 5; i += 1) addStrand("C", [Vx(14 + i * 3, 0.012, 13.85), Vx(14 + i * 3, 5.5, 13.85), Vx(14 + i * 3, 10.9, 13.85)], 0.005, 24);
  for (const z of [-8, -3, 3, 8]) addStrand("C", [Vx(-25.5, 6.97, z), Vx(-21, 6.97, z + (random() - 0.5)), Vx(-16.5, 6.97, z)], 0.005, 24);
  for (const x of [14, 4, -10, -16]) addStrand("C", [Vx(x + 0.16, 0.012, -1.7), Vx(x + 0.16, 3.4, -1.7), Vx(x + 0.16, 3.4, 1.7), Vx(x + 0.16, 0.012, 1.7)], 0.005, 32);
  for (let i = 0; i < 8; i += 1) addStrand("C", seam(-24 + random() * 48, -13 + random() * 26, -24 + random() * 48, -13 + random() * 26), 0.004);
  // T: depodaki giysiler arasında iplikler (omuzdan omuza); yol noktaları her kare güncellenir.
  const nearGarments: number[] = [];
  for (let i = 0; i < archive.storage.count; i += 1) {
    archive.storage.garmentPoint(i, tmp);
    if (Math.hypot(tmp.x + 21, tmp.z - 1.5) < 2.6 && tmp.y < 3) nearGarments.push(i);
  }
  const threads: { s: Strand; a: number; b: number }[] = [];
  for (let k = 0; k + 1 < nearGarments.length && threads.length < 7; k += 2) {
    const s = addStrand("T", [Vx(0, 0, 0), Vx(0, 0, 0), Vx(0, 0, 0)], 0.0035, 20);
    threads.push({ s, a: nearGarments[k], b: nearGarments[k + 1] });
  }
  const handThread = addStrand("T", [Vx(0, 0, 0), Vx(0, 0, 0), Vx(0, 0, 0)], 0.0035, 24);
  // Tek tek filamentler: cam zeminin altında yürüyen (kısa parça), duvara tırmanan, geri dönen, bileğe sarılan, ele bağlı, vitrindeki son.
  const underFloor = addStrand("S", [Vx(0, 0, 0), Vx(0, 0, 0), Vx(0, 0, 0), Vx(0, 0, 0)], 0.005, 24);
  const wallClimb = addStrand("S", [Vx(13.84, 0.012, 1.75), Vx(13.84, 0.9, 1.8), Vx(13.84, 2.2, 1.95)], 0.0045, 20);
  const returning = addStrand("S", [Vx(-3.2, 0.012, -5.6), Vx(-4.1, 0.012, -6.4), Vx(-5.0, 0.012, -7.15)], 0.008, 24);
  const wristStrand = addStrand("S", [FRAME_PT.clone(), Vx(0, 0, 0), Vx(0, 0, 0)], 0.004, 20);
  const handStrand = addStrand("S", [Vx(-3.6, 0.012, 0.3), Vx(0, 0, 0), Vx(0, 0, 0)], 0.004, 20);
  const finalStrand = addStrand("S", [Vx(KEY_FINAL.x - 0.36, KEY_FINAL.y + 0.42, KEY_FINAL.z - 0.26), Vx(KEY_FINAL.x - 0.2, KEY_FINAL.y + 0.2, KEY_FINAL.z - 0.1), Vx(KEY_FINAL.x - 0.03, KEY_FINAL.y + 0.006, KEY_FINAL.z + 0.004)], 0.0035, 24);
  const special = new Set<Strand>([heroStrand, underFloor, wallClimb, returning, wristStrand, handStrand, finalStrand, handThread]);

  // Zarlar.
  const mFinger: Membrane = crimson.membrane(14, 8);
  const mLink: Membrane = crimson.membrane(16, 10);
  const mKey: Membrane = crimson.membrane(14, 8);
  const mWall: Membrane = crimson.membrane(16, 8);
  const mClimax: Membrane[] = [crimson.membrane(16, 10), crimson.membrane(16, 10), crimson.membrane(16, 10), crimson.membrane(16, 10)];
  const CLIMAX_LINKS: [THREE.Vector3, THREE.Vector3, number][] = [
    [Vx(-7, 1.95, 5.5), Vx(-4, 1.95, -5.5), 0.26],
    [Vx(-4, 6, 13.8), Vx(-1, 1.95, 5.5), 0.22],
    [Vx(9, 2.6, 2.85), Vx(9, 2.4, -2.85), 0.2],
    [Vx(19, 1.65, 0), Vx(19, 3.5, 13.8), 0.18],
  ];
  const LINK_A = archive.cases[1][3].front.clone().add(Vx(0.3, 0.05, 0.02));
  const LINK_B = archive.cases[1][5].front.clone().add(Vx(-0.3, -0.05, 0.02));

  // Duvar/zemin/tavan filmleri: [film, grup payı A, B].
  const films: { f: WallFilm; a: number; b: number }[] = [];
  const addFilm = (w: number, h: number, pos: THREE.Vector3, normal: THREE.Vector3, a: number, b: number, su = 0.5, sv = 0.5) => {
    const f = crimson.film(w, h, su, sv);
    f.mesh.position.copy(pos);
    f.mesh.quaternion.setFromUnitVectors(Z_PLUS, normal);
    films.push({ f, a, b });
  };
  addFilm(14, 7.4, Vx(-3, 7.2, -13.7), Z_PLUS, 0.3, 0.55, 0.14, 0.1);
  addFilm(14, 28, Vx(-3, 0.014, 0), UP, 0.35, 0.6, 0.12, 0.08);
  addFilm(14, 28, Vx(-3, 10.96, 0), new THREE.Vector3(0, -1, 0), 0.15, 0.4, 0.3, 0.3);
  addFilm(10, 4.8, Vx(9, 2.5, 2.86), new THREE.Vector3(0, 0, -1), 0.2, 0.45, 0.05, 0.3);
  addFilm(10, 4.8, Vx(9, 2.5, -2.86), Z_PLUS, 0.2, 0.45, 0.95, 0.3);
  addFilm(10, 28, Vx(-21, 6.96, 0), new THREE.Vector3(0, -1, 0), 0.25, 0.5, 0.5, 0.55);
  addFilm(6, 5.8, Vx(-13, 3, -5.84), Z_PLUS, 0.2, 0.45, 0.5, 0.2);
  addFilm(12, 7, Vx(20, 7.5, -13.7), Z_PLUS, 0.0, 0.25, 0.4, 0.1);

  // --- Plastik perde: geçitte asılı saydam plastik; avuçlara doğru şişer, incelir, yırtılır, düşer -------------------------
  const CU = 24;
  const CV = 16;
  const curtainCount = (CU + 1) * (CV + 1);
  const cPos = new Float32Array(curtainCount * 3);
  const cNor = new Float32Array(curtainCount * 3);
  const cThin = new Float32Array(curtainCount);
  const cTear = new Float32Array(curtainCount);
  const cIndex: number[] = [];
  const cIdx = (iu: number, iv: number) => iu * (CV + 1) + iv;
  for (let iu = 0; iu < CU; iu += 1) {
    for (let iv = 0; iv < CV; iv += 1) {
      const a = cIdx(iu, iv);
      const b = a + CV + 1;
      cIndex.push(a, b, b + 1, a, b + 1, a + 1);
    }
  }
  const curtainGeometry = new THREE.BufferGeometry();
  const cPosAttr = new THREE.BufferAttribute(cPos, 3);
  const cNorAttr = new THREE.BufferAttribute(cNor, 3);
  const cThinAttr = new THREE.BufferAttribute(cThin, 1);
  const cTearAttr = new THREE.BufferAttribute(cTear, 1);
  curtainGeometry.setAttribute("position", cPosAttr);
  curtainGeometry.setAttribute("normal", cNorAttr);
  curtainGeometry.setAttribute("aThin", cThinAttr);
  curtainGeometry.setAttribute("aTear", cTearAttr);
  curtainGeometry.setIndex(cIndex);
  const curtainMaterial = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aThin; attribute float aTear; varying float vThin; varying float vTear; varying vec3 vN; varying vec3 vW;
      void main() { vThin = aThin; vTear = aTear; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */ `
      uniform float uOpacity; varying float vThin; varying float vTear; varying vec3 vN; varying vec3 vW;
      void main() {
        if (vTear > 0.5) discard;
        vec3 n = normalize(vN);
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(cameraPosition - vW);
        float f = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 2.5);
        // Buzlu plastik: beyazımsı, kenarlarda parlak; avuçların bastığı yerde incelir ve saydamlaşır.
        vec3 col = mix(vec3(0.86, 0.87, 0.9), vec3(1.0), f);
        float a = (0.62 - 0.46 * vThin) * uOpacity + f * 0.3 * uOpacity;
        gl_FragColor = vec4(col, a);
      }
    `,
  });
  const curtain = new THREE.Mesh(curtainGeometry, curtainMaterial);
  curtain.frustumCulled = false;
  curtain.renderOrder = 6;
  curtain.visible = false;
  archive.group.add(curtain);
  const palms: { p: THREE.Vector3; k: number; sign: number }[] = [
    { p: new THREE.Vector3(), k: 0, sign: 1 },
    { p: new THREE.Vector3(), k: 0, sign: 1 },
    { p: new THREE.Vector3(), k: 0, sign: -1 },
    { p: new THREE.Vector3(), k: 0, sign: -1 },
  ];
  let curtainHash = -1;
  const setCurtain = (opacity: number, tear: number, drop: number, time: number) => {
    curtain.visible = opacity > 0.002;
    (curtainMaterial.uniforms.uOpacity as THREE.IUniform<number>).value = opacity;
    if (!curtain.visible) return;
    let h = Math.round(time * 40) * 7 + Math.round(tear * 997) * 13 + Math.round(drop * 991) * 17;
    for (const palm of palms) h += Math.round(palm.k * 100) * 31 + Math.round(palm.p.y * 100) + Math.round(palm.p.z * 100) * 3;
    if (h === curtainHash) return;
    curtainHash = h;
    const top = archive.curtainTop;
    const w = CURTAIN.w;
    const hgt = CURTAIN.h;
    const zc = 0;
    for (let iu = 0; iu <= CU; iu += 1) {
      const u = iu / CU;
      const z = top.z - w / 2 + u * w;
      for (let iv = 0; iv <= CV; iv += 1) {
        const v = iv / CV;
        const y = top.y - v * hgt;
        let x = top.x + 0.012 * Math.sin(u * 9 + time * 0.7) * Math.sin(v * 3.1 + time * 0.4) * (0.2 + v);
        let thin = 0;
        for (const palm of palms) {
          if (palm.k <= 0.001) continue;
          const dy = y - palm.p.y;
          const dz = z - palm.p.z;
          const g = Math.exp(-(dy * dy + dz * dz) / 0.07);
          x += palm.sign * 0.22 * palm.k * g;
          thin += palm.k * Math.exp(-(dy * dy + dz * dz) / 0.05);
        }
        // Yırtık: avuçların arasından, tepeden aşağı genişleyerek iner; sonra iki yarı düşer ve kameraya (batıya) devrilir.
        const front = tear * 1.25 * hgt;
        const rip = tear > 0.001 && hgt - (y - (top.y - hgt)) < front ? 0.12 + 0.5 * tear * (1 - v) : 0;
        const torn = rip > 0 && Math.abs(z - zc) < rip ? 1 : 0;
        const fall = drop * drop * 3.4;
        const i = cIdx(iu, iv);
        cPos[i * 3] = x - drop * 1.6 * (1 - v * 0.5);
        cPos[i * 3 + 1] = y - fall;
        cPos[i * 3 + 2] = z + (z < zc ? -1 : 1) * drop * 0.4;
        cThin[i] = clamp(thin, 0, 1);
        cTear[i] = torn;
      }
    }
    for (let iu = 0; iu <= CU; iu += 1) {
      for (let iv = 0; iv <= CV; iv += 1) {
        const i = cIdx(iu, iv);
        tmp.fromArray(cPos, cIdx(Math.min(iu + 1, CU), iv) * 3).sub(tmp2.fromArray(cPos, cIdx(Math.max(iu - 1, 0), iv) * 3));
        tmp3.fromArray(cPos, cIdx(iu, Math.min(iv + 1, CV)) * 3).sub(tmp2.fromArray(cPos, cIdx(iu, Math.max(iv - 1, 0)) * 3));
        tmp2.crossVectors(tmp3, tmp);
        if (tmp2.lengthSq() < 1e-12) tmp2.set(1, 0, 0);
        else tmp2.normalize();
        cNor[i * 3] = tmp2.x;
        cNor[i * 3 + 1] = tmp2.y;
        cNor[i * 3 + 2] = tmp2.z;
      }
    }
    cPosAttr.needsUpdate = true;
    cNorAttr.needsUpdate = true;
    cThinAttr.needsUpdate = true;
    cTearAttr.needsUpdate = true;
  };

  // --- Bilek halkası (filament geri tepip bileğe sarılır) ve yansımadaki nabız -------------------------------------------------
  const ringMaterial = new THREE.MeshPhysicalMaterial({ color: "#8c1324", roughness: 0.2, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.75, emissive: "#2a0408", emissiveIntensity: 0.5, depthWrite: false });
  const wristRing = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.004, 8, 24), ringMaterial);
  wristRing.renderOrder = 6;
  wristRing.visible = false;
  archive.group.add(wristRing);
  const pulseSprite = glowSprite("#d01c30", 0.16);
  pulseSprite.layers.set(MIRROR_LAYER);
  pulseSprite.visible = false;
  archive.group.add(pulseSprite);
  // Yansımada görünen "daha büyük bina": sahnenin 1,9 katı bir kutunun kenar çizgileri, yalnız yansıma katmanında.
  const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry((HALL.x1 - HALL.x0) * 1.9, HALL.h * 1.9, (HALL.z1 - HALL.z0) * 1.9)), new THREE.LineBasicMaterial({ color: "#7f858f", transparent: true, opacity: 0.5, depthTest: false }));
  ghost.position.set(0, (HALL.h * 1.9) / 2 - 3, 0);
  ghost.renderOrder = 7;
  ghost.layers.set(MIRROR_LAYER);
  ghost.visible = false;
  archive.group.add(ghost);

  // --- Aynalar: galeri kuzey camı (dünya içimde) ve levhalar odası kuzey camı (yanındaki kadın; göğüsteki nabız) ---------------
  const makeMirror = (wall: { center: THREE.Vector3; normal: THREE.Vector3; width: number; height: number }) => {
    const mirror = new Reflector(new THREE.PlaneGeometry(wall.width - 0.2, wall.height - 0.2), {
      textureWidth: 1024,
      textureHeight: 1024,
      clipBias: 0.003,
      shader: {
        name: "ArchiveMirror",
        uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uFade: { value: 0 } },
        vertexShader: /* glsl */ `
          uniform mat4 textureMatrix; varying vec4 vUv;
          void main() { vUv = textureMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D tDiffuse; uniform float uFade; varying vec4 vUv;
          void main() { vec4 base = texture2DProj(tDiffuse, vUv); gl_FragColor = vec4(base.rgb * 0.78 + vec3(0.02, 0.022, 0.026), uFade * 0.92); }
        `,
      },
    });
    (mirror.material as THREE.ShaderMaterial).transparent = true;
    (mirror.material as THREE.ShaderMaterial).depthWrite = false;
    mirror.position.copy(wall.center).addScaledVector(wall.normal, 0.03);
    mirror.quaternion.setFromUnitVectors(Z_PLUS, wall.normal);
    mirror.renderOrder = 5;
    mirror.visible = false;
    archive.group.add(mirror);
    const cameras = (mirror as unknown as { _reflectionCameras: WeakMap<THREE.Camera, THREE.Camera> })._reflectionCameras;
    return { mirror, cameras, fade: (mirror.material as THREE.ShaderMaterial).uniforms.uFade as THREE.IUniform<number> };
  };
  const galleryMirror = makeMirror(archive.glassWalls.gallery);
  const sheetsMirror = makeMirror(archive.glassWalls.sheets);

  // --- Kameraya bağlı siyah: son kare sesle birlikte kararır -----------------------------------------------------------------
  const blackout = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 1, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
  blackout.position.z = -0.1;
  blackout.renderOrder = 1000;
  blackout.frustumCulled = false;
  blackout.visible = false;
  kit.camera.add(blackout);

  // Kapağın yazıları (gökteki başlık, yamaçtaki REDD) film boyunca gizlenir.
  let worldTitle: THREE.Object3D[] = [];
  const coverTexts = () => (worldTitle.length ? worldTitle : (worldTitle = kit.scene.children.filter((o) => o.userData.coverText === true)));

  // --- Zaman işlevleri --------------------------------------------------------------------------------------------------------
  /** Kapı: kadın çıkarken, dönüp giderken ve adam çıkarken açılır. */
  const doorK = (t: number) => bump(t, 13.6, 15.2, 17.6, 18.4) + bump(t, 196.0, 197.2, 197.6, 198.5) + bump(t, 219.3, 220.6, 223.2, 224.2);
  /** Alabora: ufuk 5,7° yatar, döner. */
  const tiltK = (t: number) => bump(t, 26.6, 28.4, 28.6, 30.6);
  /** Koridor daralması (kalp yorgunluğu). */
  const narrowK = (t: number) => bump(t, 30.5, 34.0, 36.0, 38.0);
  /** Ağ seviyesi: grup, pay (0…1 sıralama) ve zaman → görünen pay. */
  const netReveal = (group: Group, o: number, t: number) => {
    let grow = 0;
    if (group === "S") grow = smooth((t - SPREAD - o * 0.8) / 3.6);
    else if (group === "A") grow = smooth((t - L.virus - o * 4.5) / 2.8);
    else if (group === "B") grow = smooth((t - L.c2 - o * 6.5) / 2.5);
    else if (group === "T") grow = smooth((t - 76.5 - o * 1.8) / 1.2);
    const first = grow * (1 - smooth((t - RELEASE - o * 1.5) / 2.6));
    const climax = smooth((t - L.chorus2 - o * 3.2) / 2.2) * (1 - smooth((t - WITHDRAW - o * 2.0) / 2.5));
    return Math.max(first, climax);
  };
  /** Gevşeme: çöküşte gerilim kaybolur. */
  const slackK = (t: number) => smooth((t - COLLAPSE) / 3.0) * (1 - smooth((t - WITHDRAW - 3.5) / 1.5));
  const filmReveal = (f: { a: number; b: number }, t: number) => {
    const first = (smooth((t - L.virus - 1) / 5) * f.a + smooth((t - L.c2) / 6) * (f.b - f.a)) * (1 - smooth((t - RELEASE) / 4));
    const climax = smooth((t - L.chorus2) / 4.2) * (1 - smooth((t - WITHDRAW - 0.5) / 3.5));
    return Math.max(first, climax);
  };
  /** Ağın toplam yoğunluğu (ışık ve palet için). */
  const netLevel = (t: number) => Math.max(netReveal("A", 0.5, t), netReveal("S", 0.5, t) * 0.3, smooth((t - L.chorus2) / 3) * (1 - smooth((t - WITHDRAW) / 3)));
  /** Son solma: koyu kızıl → soluk → renksiz. */
  const fadeK = (t: number) => smooth((t - 206) / 8);
  /** Anahtar nerede? */
  const keyState = (t: number): "home" | "floor1" | "hand" | "falling" | "floor2" | "final" => {
    if (t < 131) return "home";
    if (t < KEY_TAKEN) return "floor1";
    if (t < KEY_DROP) return "hand";
    if (t < KEY_DROP + 0.45) return "falling";
    if (t < KEY_BACK) return "floor2";
    return "final";
  };

  // --- Kamera yardımcıları ---------------------------------------------------------------------------------------------------
  const span = (a: number, b: number) => clamp((songNow - a) / (b - a), 0, 1);
  const clearCam = (p: THREE.Vector3): THREE.Vector3 => {
    const q = toLocal(p);
    for (const [g, r, h] of [[himG, 0.42, 1.95], [herG, 0.4, 1.85]] as const) {
      if (!g.visible) continue;
      const b = g.position;
      if (q.y < b.y - 0.2 || q.y > b.y + h) continue;
      const dx = q.x - b.x;
      const dz = q.z - b.z;
      const d = Math.hypot(dx, dz);
      if (d >= r) continue;
      const ux = d > 1e-3 ? dx / d : Math.sin(g.rotation.y);
      const uz = d > 1e-3 ? dz / d : Math.cos(g.rotation.y);
      q.x = b.x + ux * (r + 0.02);
      q.z = b.z + uz * (r + 0.02);
    }
    if (q.x > HALL.x0 && q.x < HALL.x1 + 6 && q.z > HALL.z0 && q.z < HALL.z1 && q.y < 0.12) q.y = 0.12;
    return toWorld(q);
  };
  const clearPoint = (point: THREE.Vector3 | (() => THREE.Vector3)) => () => clearCam((typeof point === "function" ? point() : point).clone());
  const real = (list: Shot[]): Shot[] => list.map((shot) => ({ ...shot, from: shot.from ? clearPoint(shot.from) : shot.from, to: shot.to ? clearPoint(shot.to) : shot.to, path: shot.path?.map((p) => clearPoint(p)) }));
  /** Kahraman kamera bakışı: önce yayılan filamentin ucu, sonra adamın sırtı. */
  const heroLook = () => {
    const k = span(SPREAD, L.syllables);
    pointAlong(heroStrand.fil.path, netReveal("S", heroStrand.o, songNow), tmp);
    const back = relative(himG, 0, 1.3, 0.4, tmp2);
    return toWorld(tmp.lerp(back, smooth((k - 0.7) / 0.3)).clone());
  };
  /** Çıkışı izleyen kamera: adamın arkasında, galeride durur (x ≤ 21,8). */
  const exitCam = () => {
    const q = relative(himG, 0, 1.7, -3.2);
    q.x = Math.min(q.x, 21.8);
    return toWorld(q);
  };
  const keyWorld = () => toWorld(key.position.clone()).add(tmp.set(0, 0.01, 0));
  const flawedFront = (dx: number, dy: number, dz: number) => A(FRONT.x + dx, FRONT.y + dy, FRONT.z + dz);
  const KX = KEY_CASE.x;
  const KY = KEY_CASE.plinth + KEY_CASE.glass / 2;
  const KZ = KEY_CASE.z + 0.31;

  const shots: Shot[] = [
    ...real([
      // AÇILIŞ: makro cam; kadının parmak ucu girer, para kadar kızıl kalıntı. Bekle.
      { at: 0, from: A(KX + 0.56, KY + 0.09, KZ + 0.26), to: A(KX + 0.53, KY + 0.08, KZ + 0.25), look: A(KX + 0.1, KY + 0.02, KZ + 0.06), fov: 24, fovTo: 22, curve: "linear", grade: CLEAN, in: "fade" },
      // Geniş galeri: ikisi mimarinin yanında küçük; vitrine bakarlar.
      { at: 3.4, from: A(14.8, 3.6, 11.5), to: A(15.4, 3.3, 10.3), look: A(19, 1.1, 0.4), lookTo: A(19.2, 1.1, 0.6), fov: 42, curve: "linear", grade: CLEAN },
      // Kadın döner, yürür; kamera onunla kalır (adam).
      { at: 7.5, from: A(16.3, 1.55, 3.3), to: A(16.6, 1.55, 3.0), look: bodyOf(himG, 1.55), fov: 36, curve: "linear", grade: CLEAN },
      // Eline bakar: hiçbir şey. Sonra cam zeminin altında bir filament.
      { at: 12.0, from: himAt(-1.4, 1.5, 1.2), to: himAt(-1.35, 1.46, 1.15), look: himAt(-0.1, 1.32, 0.3), lookTo: A(17.4, -0.05, 0.6), fov: 40, curve: "ease", grade: CLEAN },
      { at: 13.4, from: A(16.6, 0.36, 1.5), to: A(16.7, 0.33, 1.4), look: A(17.3, -0.06, 0.6), lookTo: A(17.1, -0.06, 0.45), fov: 20, curve: "linear", grade: TRACE },
      // Uzaktaki kapı: durur, geri bakar; son bakış; gider; kapı kapanır.
      { at: L.look, from: A(17.0, 1.5, 0.6), to: A(17.2, 1.5, 0.5), look: A(25, 1.4, 0), fov: 24, curve: "linear", grade: CLEAN },
      // DÜNYA İÇİMDE: kamera kuzey cama iter; yansımada galeri ve çok daha büyük bir bina.
      { at: L.overflow, from: A(17.0, 1.7, 6.5), to: A(17.2, 1.7, 12.4), look: A(17.4, 2.2, 14), fov: 46, fovTo: 40, curve: "ease", grade: TRACE },
      // Yalnız; arkasındaki duvarda küçük filament tırmanır; o görmez.
      { at: 24.0, from: A(9.5, 1.5, -1.2), to: A(9.8, 1.5, -1.0), look: A(14.3, 1.3, 0.2), fov: 34, curve: "linear", grade: TRACE },
      // ALABORA: ufuk yatar; gevşek nesneler kayar; düzelir.
      { at: L.capsize, from: A(24.0, 2.6, -10.5), to: A(23.6, 2.5, -10.0), look: A(14.5, 1.2, 0.2), fov: 40, curve: "linear", grade: TRACE },
      // Koridor: önden izleme; daralma; nefes.
      { at: 30.0, from: himAt(0, 1.5, 2.8), to: himAt(0, 1.45, 2.1), look: himAt(0, 1.4, 0), fov: 38, fovTo: 32, curve: "linear", grade: TRACE },
      // "Kimse…": tertemiz nesneler; birinde ince kızıl bir çizgi belirir.
      { at: L.line5, from: A(COL_X(6) - 1.0, 1.9, -10.2), to: A(COL_X(7) - 0.6, 1.88, -10.4), look: A(COL_X(8.4), 1.6, -13.1), lookTo: A(COL_X(9.2), 1.6, -13.1), fov: 36, curve: "linear", grade: TRACE },
      // KOLEKSİYON: büyük salon; o girer.
      { at: L.collection, from: A(3.0, 4.2, 9.5), to: A(2.2, 4.0, 8.5), look: A(-3, 1.5, -6), fov: 48, curve: "linear", grade: TRACE },
      // Yan izleme: nesneler ön planda; o yürür; tanır; kamera durur.
      { at: 38.5, from: A(3, 1.5, -7.5), to: A(-6.6, 1.5, -7.8), look: A(COL_X(11), 1.6, -13.1), lookTo: A(COL_X(2), 1.6, -13.1), fov: 40, curve: "linear", grade: TRACE },
      // KUSURLU PARÇA: yaklaşır; camdan bakar.
      { at: L.ah, from: A(-10.2, 1.55, -11.0), to: A(-10.0, 1.52, -11.2), look: flawedFront(0.3, 0, 0.3), fov: 34, curve: "linear", grade: TRACE },
      { at: 47.5, from: flawedFront(0.22, -0.2, 0.6), to: flawedFront(0.16, -0.24, 0.5), look: flawedFront(0.0, -0.4, -0.3), fov: 20, curve: "linear", grade: TRACE },
      // İLK TEMAS (imza): parmak cama; kalkınca ince kızıl zar parmakla cam arasında gerilir, bağlı kalır, çekilir.
      { at: L.of, from: flawedFront(0.62, 0.03, 0.25), to: flawedFront(0.58, 0.02, 0.22), look: flawedFront(0.0, 0.0, 0.02), fov: 16, curve: "linear", grade: CONTAM },
    ]),
    // KAHRAMAN KAMERA: vitrinin arkasından filamenti bulur, zeminde izler, geçitten geçer, adamı yeniden bulur, arkasında biter.
    { at: SPREAD, from: A(-7.4, 0.75, -11.4), path: [A(-8.9, 0.55, -10.2), A(-9.1, 0.6, -5.5), A(-9.3, 0.9, -1.9)], to: A(-8.7, 1.5, -1.3), look: heroLook, fov: 40, curve: "ease", grade: CONTAM },
    ...real([
      // HECELER: levhalar odası; girer; dokunur; levha şeritlere ayrılır.
      { at: L.syllables, from: A(-14.6, 1.6, 2.4), to: A(-14.2, 1.55, 2.0), look: A(-12.4, 1.4, 0), fov: 36, curve: "linear", grade: CONTAM },
      // LANET: öfke; şeritleri çeker, ezer; her deneme daha çok parça.
      { at: L.curse, from: A(-11.2, 1.5, -1.3), to: A(-11.4, 1.5, -1.1), look: A(-12.6, 1.55, -0.6), fov: 30, curve: "linear", grade: CONTAM },
      // ÖLEN HEP BEN: yansıma koridoru; her yansımada yalnız; birinde yanında kadın; durur, bakar: yok.
      { at: L.died, from: () => wv(himG.position.x - 0.2, 1.55, 2.3), to: () => wv(himG.position.x - 0.2, 1.55, 2.3), look: () => wv(himG.position.x - 0.5, 1.45, 6), fov: 38, curve: "linear", grade: CONTAM },
      // Arşiv bozuluyor: deponun kapısından, olmaması gereken bir vitrin duvarı.
      { at: 69.6, from: himAt(0, 1.6, -2.2), to: himAt(0, 1.6, -2.0), look: A(-17.5, 1.4, 0), fov: 40, curve: "linear", grade: CONTAM },
      // GÖMDÜM: depo; giysi rayları; girer.
      { at: L.bury, from: A(-17.0, 1.7, 9.0), to: A(-17.4, 1.65, 8.4), look: A(-21, 1.3, 1.5), fov: 46, curve: "linear", grade: CONTAM },
      { at: 74.5, from: A(-21, 1.4, -2.7), to: A(-21, 1.35, -1.7), look: A(-21, 1.4, 1.5), fov: 34, curve: "linear", grade: CONTAM },
      // Uzaktan: neredeyse kaybolur; kumaşlar arasında iplikler.
      { at: 77.5, from: A(-17.5, 2.0, 7.5), to: A(-17.8, 2.0, 7.2), look: A(-21, 1.2, 1.5), fov: 30, curve: "linear", grade: CONTAM },
      // VİRÜS: çıkış; giysiler itilir, düşer; lekeli.
      { at: L.virus, from: A(-19.2, 1.5, 3.1), to: A(-19.5, 1.5, 2.9), look: A(-21, 1.3, 1.5), fov: 36, curve: "linear", grade: CONTAM },
    ]),
    // İLK BÜYÜK VİRAL GÖRÜNTÜ: koleksiyon yukarıdan; yüzlerce ince bağlantı, hâlâ güzel.
    { at: 80.6, from: A(3.2, 7.5, 12.2), to: A(2.4, 7.0, 11.6), look: A(-4, 2.5, -4), fov: 56, curve: "linear", grade: CONTAM },
    // İki ilgisiz nesne tek bir filmle bağlanır.
    { at: 83.2, from: A(COL_X(4), 1.7, -10.2), to: A(COL_X(4.2), 1.66, -10.6), look: A(COL_X(4.5), 1.6, -13.1), fov: 30, curve: "linear", grade: CONTAM },
    // Eksen boyunca geniş: o uzakta perdeye yürür.
    { at: 85.4, from: A(12.5, 2.2, 0.0), to: A(11.5, 2.0, 0.1), look: A(-10, 1.5, 0), fov: 40, curve: "linear", grade: CONTAM },
    ...real([
      // PLASTİK YAKINLIK: perde; o batıda, kadının silüeti doğuda; eller zara; hiç değmezler.
      { at: L.plastic, from: A(-10.7, 1.5, 3.9), to: A(-10.6, 1.5, 3.6), look: A(-10, 1.35, 0), fov: 36, curve: "linear", grade: CONTAM },
      { at: 90.5, from: A(-11.3, 1.45, 0.9), to: A(-11.1, 1.45, 0.8), look: A(-9.6, 1.4, 0.0), fov: 28, curve: "linear", grade: CONTAM },
      { at: L.thin, from: A(-8.9, 1.5, 0.95), to: A(-9.1, 1.5, 0.85), look: A(-10.4, 1.45, -0.05), fov: 28, curve: "linear", grade: CONTAM },
      // YAPIŞIP YANAN: yırtılır; kadın düşen zarın ardında kaybolur; zar kameraya düşer.
      { at: L.stuck, from: A(-11.6, 1.5, 0.35), to: A(-11.3, 1.45, 0.3), look: A(-10, 1.5, 0), fov: 34, curve: "linear", grade: CONTAM },
      // İKİNCİ BLOK: yalnız; kolunda ince film; dokunur, parmağına yapışır.
      { at: 96.6, from: A(-12.4, 1.55, 1.9), to: A(-12.2, 1.55, 1.7), look: bodyOf(himG, 1.35), fov: 34, curve: "linear", grade: CONTAM },
      { at: 98.6, from: himAt(0.75, 1.32, 0.95), to: himAt(0.7, 1.3, 0.9), look: himAt(-0.1, 1.2, 0.4), fov: 24, curve: "linear", grade: CONTAM },
      // Yapışma: duvara koyar, yürür; iplik uzar, izler.
      { at: 101.0, from: A(-12.2, 1.6, -3.2), to: A(-12.6, 1.6, -3.0), look: A(FRAME_PT.x, 1.3, FRAME_PT.z), fov: 38, curve: "linear", grade: CONTAM },
      // SAKIZ: döner; iplik ona geri çekilir.
      { at: L.gum, from: himAt(-0.9, 1.4, 1.6), to: himAt(-0.8, 1.4, 1.5), look: himAt(0, 1.2, 0.3), fov: 34, curve: "linear", grade: CONTAM },
      // İlk direniş: filamenti kavrar, çeker; geri teper, bileğe sarılır.
      { at: 105.6, from: A(-11.4, 1.5, -3.0), to: A(-11.5, 1.48, -2.8), look: A(-10.3, 1.3, -1.5), fov: 32, curve: "linear", grade: CONTAM },
      // Tepki: eline bakar; bir kez atar; saydamlaşır; siler.
      { at: 108.0, from: himAt(0.6, 1.28, 0.95), to: himAt(0.55, 1.26, 0.9), look: himAt(-0.16, 1.15, 0.38), fov: 24, curve: "linear", grade: CONTAM },
      // ANLAR: kaçmayı bırakır; kamera yakın; öfke → tanıma.
      { at: L.of2, from: himAt(0.35, 1.6, 1.35), to: himAt(0.3, 1.58, 1.3), look: himAt(0, 1.55, 0), fov: 30, curve: "linear", grade: CONTAM },
      // NAKARAT: yansımadaki nabız göğsünün tam üstünde; cama dokunur; nabız karşılık verir.
      { at: L.chorus, from: himAt(0.5, 1.55, -1.9), to: himAt(0.45, 1.55, -1.8), look: A(-12.8, 1.4, 6.0), fov: 30, curve: "linear", grade: CONTAM },
    ]),
    // Dokunduğu yerlerden büyür: aynı koridor, aynı koleksiyon, aynı cam zemin, aynı depo; yalnız malzeme değişmiştir.
    { at: L.c2, from: A(11.5, 1.55, 0.2), to: A(11.0, 1.55, 0.2), look: A(4.5, 1.4, 0), fov: 38, curve: "linear", grade: CONTAM },
    { at: 125.3, from: A(3, 1.5, -7.5), to: A(-1, 1.5, -7.6), look: A(COL_X(11), 1.6, -13.1), lookTo: A(COL_X(7), 1.6, -13.1), fov: 40, curve: "linear", grade: CONTAM },
    { at: L.c3, from: A(16.3, 0.42, 1.8), to: A(16.5, 0.4, 1.65), look: A(17.3, -0.06, 0.55), lookTo: A(17.6, -0.06, 0.3), fov: 24, curve: "linear", grade: CONTAM },
    { at: 129.4, from: A(-17.5, 2.0, 7.5), to: A(-17.8, 2.0, 7.2), look: A(-21, 1.2, 1.5), fov: 30, curve: "linear", grade: CONTAM },
    { at: L.c4, from: A(-1.5, 3.2, 9.5), to: A(-2.5, 3.0, 8.8), look: A(-8.2, 1.2, -11), fov: 44, curve: "linear", grade: CONTAM },
    ...real([
      // İKİNCİ KOLEKSİYON: vitrin boş; anahtar yerde; diz çöker.
      { at: L.chorusB, from: A(-10.1, 0.75, -11.9), to: A(-9.9, 0.72, -12.0), look: A(-8.2, 0.45, -12.6), fov: 30, curve: "linear", grade: CONTAM },
      // Alır: zar elle anahtar arasında; bırakmak ister; yapışık kalır.
      { at: L.cb2, from: himAt(0.95, 1.1, 0.5), to: himAt(0.9, 1.08, 0.45), look: () => keyWorld(), fov: 26, curve: "linear", grade: CONTAM },
      // NESNENİN HAFIZASI: oda ısınır; kadın uzakta, gerçek, kıpırdamaz; sonra yok.
      { at: L.cb3, from: A(-9.6, 1.5, -10.2), to: A(-9.3, 1.5, -10.0), look: A(3.6, 1.3, 0.4), fov: 38, curve: "linear", grade: MEMORY },
      // Kalkar; anahtara bakar; merkeze yürür.
      { at: L.cb4, from: himAt(-1.2, 1.5, 1.8), to: himAt(-1.1, 1.5, 1.7), look: himAt(0, 1.3, 0.2), fov: 34, curve: "linear", grade: CONTAM },
      // ATEŞ (köprü): iki eliyle zarı yırtar; anahtar düşer.
      { at: L.fever, from: himAt(0.0, 1.35, 1.1), to: himAt(0.05, 1.32, 1.0), look: himAt(0, 1.2, 0.3), fov: 26, curve: "linear", grade: SATUR },
    ]),
    // YIKIM: ağ arşivden geri çekilir; bina nefes verir.
    { at: 158.0, from: A(3.2, 7.5, 12.2), to: A(2.6, 7.2, 11.8), look: A(-4, 2.5, -4), fov: 56, curve: "linear", grade: SATUR },
    ...real([
      // SAHTE ZAFER: tertemiz; nefes alır.
      { at: 162.2, from: A(-3.4, 1.55, -5.2), to: A(-3.6, 1.52, -5.4), look: bodyOf(himG, 1.4), fov: 34, curve: "linear", grade: RELEASED },
      // GERİ DÖNÜŞ: zeminde küçük filament; ona doğru; geri çekilir; durur. Kapıya bakınca kıpırdar.
      { at: 165.5, from: A(-6.4, 0.5, -4.4), to: A(-6.5, 0.48, -4.6), look: A(-4.6, 0.45, -6.6), fov: 32, curve: "linear", grade: RELEASED },
    ]),
    // SON NAKARAT: bütün arşiv; o küçücük merkezde; kızıl ağ her yerde.
    { at: L.chorus2, from: A(3.6, 9.6, 13.2), to: A(3.0, 9.2, 12.6), look: A(-5, 2.0, -5), fov: 60, fovTo: 56, curve: "linear", grade: SATUR },
    // İKİNCİ KAHRAMAN KAMERA: galeriden koridora, koleksiyona, perdeye, levhalara, depoya; her motif bir kez daha.
    { at: L.d2, from: A(20, 1.6, 2.0), path: [A(13.5, 1.7, 0.3), A(3.5, 1.9, -0.4), A(-4, 2.6, -8.5), A(-9.8, 1.7, -0.2), A(-13, 1.6, 0.4), A(-16.2, 1.8, 0)], to: A(-19.5, 1.8, 0.3), look: A(10, 1.5, 0), lookPath: [A(3, 1.6, -6), A(-12, 1.5, 0)], lookTo: A(-21, 1.4, 1.5), fov: 48, curve: "ease", grade: SATUR },
    ...real([
      // MERKEZDE: ağ çevresinde; dövüşmez; bakar.
      { at: L.d4, from: A(0.5, 2.0, 4.5), to: A(0.2, 1.9, 4.2), look: bodyOf(himG, 1.3), fov: 40, curve: "linear", grade: SATUR },
      // KADIN DÖNER: uzak uçta, gerçek, sessiz.
      { at: L.chorus2b, from: himAt(-0.6, 1.6, -1.5), to: himAt(-0.55, 1.6, -1.45), look: A(18, 1.3, 0), fov: 30, curve: "linear", grade: SATUR },
      { at: 187.8, from: A(15.0, 1.55, 1.4), to: A(15.2, 1.55, 1.3), look: bodyOf(herG, 1.45), fov: 34, curve: "linear", grade: SATUR },
      // SEÇİM: yüzü; eline bakar; o döner, gider.
      { at: L.e2, from: himAt(0.6, 1.6, 1.3), to: himAt(0.55, 1.55, 1.25), look: himAt(0, 1.6, 0), lookTo: himAt(-0.15, 1.0, 0.35), fov: 28, curve: "ease", grade: SATUR },
      { at: 191.5, from: A(-1.5, 1.7, 3.4), to: A(-1.2, 1.7, 3.2), look: A(18, 1.3, 0), fov: 32, curve: "linear", grade: SATUR },
    ]),
    // VİRÜSÜN CEVABI: gerilim kaybolur; sarkar.
    { at: COLLAPSE, from: A(3.2, 7.5, 12.2), to: A(2.8, 7.3, 12.0), look: A(-4, 2.5, -4), fov: 56, curve: "linear", grade: RELEASED },
    ...real([
      // ÇEKİLME: çatlaklara; arşiv tertemiz; anahtar olmaması gereken vitrinde; dokunmaz.
      { at: WITHDRAW, from: himAt(0.4, 1.6, -1.6), to: himAt(0.45, 1.6, -1.5), look: flawedFront(0, 0, 0), fov: 36, curve: "linear", grade: RELEASED },
    ]),
    // SON NESNE: anahtar yalnız; tek ince filament. Rengini kaybeder; düşer; bir kez seker; durur.
    { at: L.end, from: flawedFront(0.02, -0.18, 0.7), to: flawedFront(0.0, -0.3, 0.34), look: flawedFront(-0.02, -0.43, -0.3), fov: 22, fovTo: 18, curve: "linear", grade: FINAL },
    // ÇIKIŞ: kamera arkasında; kapı açılır; gün ışığı; dışarı yürür; kapı kapanır.
    { at: 216.0, from: exitCam, to: exitCam, look: A(26, 2.6, 0), fov: 40, curve: "linear", grade: FINAL },
    // SON KARE: vitrin; filament bir kez kıpırdar; sesle birlikte siyah.
    { at: 224.2, from: flawedFront(0.0, -0.08, 1.1), to: flawedFront(0.0, -0.24, 0.42), look: flawedFront(-0.02, -0.44, -0.3), fov: 24, fovTo: 18, curve: "linear", grade: FINAL },
  ];

  // --- Serbest dolaşım: kapıyı dene (üç kez) ve dıştaki camdaki kalıntı -------------------------------------------------------
  let tries = 0;
  let archiveOn = false;
  const interactables = [
    gazeTarget({
      position: (target) => wv(28.8, 1.2, 0, target),
      radius: 0.9,
      reach: 5,
      label: () => (archiveOn && !kit.secrets.has("ask-hecele") ? "Kapıyı dene" : null),
      use: () => {
        tries += 1;
        kit.sfx.cue("deny");
        if (tries < 3) announce(kit.hud, tries === 1 ? "Kilitli." : "Kilitli; içeride bir şey kıpırdıyor.", 3);
        else if (kit.secrets.reveal("ask-hecele")) kit.sfx.cue("chime");
      },
    }),
    secretItem(kit, "ask-sakiz", (target) => wv(22, 0.3, HALL.z1 + 0.5, target), { label: "Camdaki kalıntıya dokun", radius: 0.9, reach: 4, available: () => archiveOn, onFound: () => kit.sfx.cue("pulse") }),
  ];

  // --- Tek seferlik işaretler (ses; sarma korumalı) ---------------------------------------------------------------------------
  const cues: [number, () => void][] = [
    [51.0, () => kit.sfx.cue("switch")],
    [52.5, () => kit.sfx.cue("pulse")],
    [L.stuck, () => kit.sfx.cue("whoosh")],
    [107.55, () => kit.sfx.cue("hit")],
    [KEY_DROP, () => kit.sfx.cue("drop")],
    [214.3, () => kit.sfx.cue("drop")],
    [227.3, () => kit.sfx.cue("pulse")],
  ];
  let cueT = -1;
  const runCues = (t: number) => {
    if (t < cueT - 0.3 || t - cueT > 1.5) {
      cueT = t;
      return;
    }
    for (const [at, run] of cues) if (cueT < at && at <= t) run();
    cueT = t;
  };

  const restoreWorld = () => {
    const e = kit.effects;
    e.roll = 0;
    e.dust = 1;
    e.dim = 0;
    e.saturation = 1;
    blackout.visible = false;
    galleryMirror.mirror.visible = false;
    sheetsMirror.mirror.visible = false;
    ghost.visible = false;
    pulseSprite.visible = false;
    wristRing.visible = false;
    setLayer(herG, 0);
  };
  let solidified = false;

  const scene: SongScene = {
    root,
    hint: "Aşk, Virüs bir kısa film: kraterin ortasında bir arşiv. Serbest dolaşırken kapısını dene, dıştaki camdaki kalıntıya dokun.",
    interactables,
    colliders: [],
    beats: [
      { at: 1.6, id: "touch", line: "Makro: cam, kadının parmak ucu, para kadar kızıl kalıntı." },
      { at: 3.4, id: "gallery", line: "Geniş galeri; ikisi küçük; vitrin." },
      { at: 7.5, id: "leaves", line: "Kadın döner, yürür; kamera onunla kalır." },
      { at: 12.0, id: "hand", line: "Eline bakar: hiç; cam zeminin altında filament." },
      { at: L.look, id: "look", line: "Kapıda durur, geri bakar; gider; kapı kapanır." },
      { at: L.overflow, id: "reflection", line: "Camda yansıma: çok daha büyük bir bina." },
      { at: L.capsize, id: "capsize", line: "Ufuk yatar, döner." },
      { at: 30.0, id: "corridor", line: "Koridor; daralma; nefes." },
      { at: L.line5, id: "line", line: "Bir nesnede ince kızıl çizgi." },
      { at: L.collection, id: "collection", line: "Koleksiyon salonu." },
      { at: L.ah, id: "flawed", line: "Kusurlu parça." },
      { at: L.of, id: "contact", line: "İlk temas: parmak, cam, zar." },
      { at: SPREAD, id: "spread", line: "Yayılma: çerçeve, zemin, geçit." },
      { at: L.syllables, id: "syllables", line: "Levhalar; şeritlere ayrılır." },
      { at: L.curse, id: "curse", line: "Öfke; parçalar çoğalır." },
      { at: L.died, id: "died", line: "Yansımada yanında kadın; yok." },
      { at: L.bury, id: "bury", line: "Depo; giysiler kapanır." },
      { at: L.virus, id: "virus", line: "Çıkış; ilk büyük ağ." },
      { at: L.plastic, id: "plastic", line: "Plastik perde; avuçlar." },
      { at: L.stuck, id: "stuck", line: "Yırtılır; kadın kaybolur; film kolunda." },
      { at: L.gum, id: "gum", line: "İplik ona geri döner; direniş; bilek." },
      { at: L.of2, id: "realise", line: "Kaçmayı bırakır." },
      { at: L.chorus, id: "pulse", line: "Yansımadaki nabız; cama dokunur." },
      { at: L.c2, id: "path", line: "Dokunduğu yerlerden büyür." },
      { at: L.chorusB, id: "floorkey", line: "Vitrin boş; anahtar yerde; diz çöker." },
      { at: L.cb2, id: "pickup", line: "Alır; zar elinde." },
      { at: L.cb3, id: "memory", line: "Oda ısınır; kadın uzakta; yok." },
      { at: L.fever, id: "tear", line: "Zarı yırtar; anahtar düşer." },
      { at: 158.0, id: "release", line: "Ağ geri çekilir." },
      { at: 162.2, id: "calm", line: "Sahte zafer." },
      { at: 165.5, id: "returns", line: "Filament geri gelir; bakışına uyar." },
      { at: L.chorus2, id: "network", line: "Bütün arşiv ağ." },
      { at: L.d2, id: "travel", line: "Ağın içinden geçiş." },
      { at: L.d4, id: "center", line: "Merkezde; bakar." },
      { at: L.chorus2b, id: "woman", line: "Kadın döner." },
      { at: L.e2, id: "choice", line: "Eline bakar; peşinden gitmez." },
      { at: COLLAPSE, id: "collapse", line: "Ağ gerilimini kaybeder." },
      { at: WITHDRAW, id: "withdraw", line: "Çatlaklara çekilir; anahtar yanlış vitrinde." },
      { at: L.end, id: "object", line: "Anahtar yalnız; tek filament." },
      { at: 206, id: "fade", line: "Rengini kaybeder." },
      { at: 214.3, id: "drop", line: "Düşer; bir kez seker." },
      { at: 216.0, id: "exit", line: "Çıkışa yürür; kapı; gün ışığı." },
      { at: 224.2, id: "still", line: "Vitrin; sessizlik." },
      { at: 227.3, id: "move", line: "Bir kez kıpırdar; siyah." },
    ],
    shots,
    reset() {
      restoreWorld();
      himG.visible = herG.visible = false;
      for (const o of coverTexts()) o.visible = true;
      cueT = -1;
      tries = 0;
      archive.door.open(0);
      archive.corridor.setNarrow(0);
      archive.sheets.setTear(0, 0);
      archive.storage.setClose(0);
      archive.storage.setStain(0);
      archive.repeat.setOpacity(0);
      archive.cup.visible = true;
      crimson.setFade(0);
      crimson.setLevel(0);
      for (const r of residues) r.set(0, 0);
      for (const s of strands) s.fil.tube.mesh.visible = false;
      for (const m of [mFinger, mLink, mKey, mWall, ...mClimax]) m.mesh.visible = false;
      for (const f of films) f.f.set(0, 0);
      setCurtain(0, 0, 0, 0);
      himG.scale.setScalar(him.baseScale);
    },
    update(dt, time, level, songTime) {
      const t = Math.min(Math.max(songTime, 0), AUDIO_END);
      songNow = t;
      if (!solidified) {
        archive.solidify();
        solidified = true;
      }
      archiveOn = level > 0.05;
      if (t >= AUDIO_END + 0.05 || level < 0.02) {
        restoreWorld();
        for (const o of coverTexts()) o.visible = true;
        crimson.setLevel(0);
        return;
      }
      const cinema = kit.cinema();
      for (const o of coverTexts()) o.visible = !cinema;
      runCues(t);
      const e = kit.effects;
      e.dust = 0.15;
      e.roll = 0.1 * tiltK(t) * level;
      e.dim = 0;
      crimson.setLevel(level);
      crimson.setFade(fadeK(t));
      archive.door.open(doorK(t));
      archive.corridor.setNarrow(narrowK(t));
      archive.setLit(1 - 0.35 * smooth((t - 216) / 6));

      // Son kare: sesle birlikte siyah.
      const black = t >= AUDIO_END - 0.08;
      blackout.visible = cinema && black;
      if (black) {
        const h = 2 * 0.1 * Math.tan(THREE.MathUtils.degToRad(kit.camera.fov) / 2) * 1.1;
        blackout.scale.set(h * kit.camera.aspect * 1.1, h, 1);
      }

      // --- Kişiler -------------------------------------------------------------------------------------------------------
      himG.visible = level > 0.05 && t < 224.4;
      herG.visible = level > 0.05 && herShown(t);
      him.place(t, dt, time);
      if (herG.visible) her.place(t, dt, time);
      if (herMirrored(t)) {
        // Yansımada onun yanında: fiziksel olarak yanında durur, yalnız yansıma kamerası görür.
        relative(himG, 0.95, 0, 0.05, herG.position);
        herG.rotation.y = himG.rotation.y;
        her.settle();
      }
      setLayer(herG, herMirrored(t) ? MIRROR_LAYER : 0);
      const rightHim = rightOf(himG, tmp4).clone();
      // Nefes: yorgunluk ve sahte zaferde belirgin; sonda yavaş.
      const breath = 0.01 * Math.sin(time * 1.3) * (bump(t, 30, 33, 37, 39) + bump(t, 162, 163, 165.5, 166.5)) + 0.005 * Math.sin(time * 0.7) * smooth((t - 198) / 6);
      himG.scale.setScalar(him.baseScale * (1 + breath));

      // Kadının parmağı cama (açılış).
      const herTouch = bump(t, 1.0, 1.55, 2.4, 3.0);
      if (herG.visible && herTouch > 0) {
        her.ik.reach("r", wv(KEY_CASE.x + 0.12, KEY_CASE.plinth + KEY_CASE.glass / 2 + 0.02, KEY_CASE.z + 0.4, tmp), herTouch, tmp2.set(-1, -0.6, 0));
        her.ik.tilt("Head", rightOf(herG, tmp3), 0.2 * herTouch * TILT);
      }
      // Eline bakar.
      const handLook = bump(t, 12.0, 12.5, 13.2, 13.7);
      if (handLook > 0) {
        him.ik.reach("r", toWorld(relative(himG, -0.22, 1.2, 0.38, tmp)), handLook, tmp2.set(1, -0.5, 0));
        him.ik.tilt("Head", rightHim, 0.5 * handLook * TILT);
      }
      // İlk temas: parmak cama; kaldırır (zar gerilir); yine bastırır (cam büzülür).
      const touch1 = bump(t, 50.4, 51.0, 51.75, 52.45);
      const touch2 = bump(t, 52.9, 53.1, 53.3, 53.5);
      const touch = Math.max(touch1, touch2 * 0.9);
      if (touch > 0) {
        him.ik.reach("r", wv(FRONT.x, FRONT.y, FRONT.z + 0.012 + 0.06 * (1 - touch), tmp), Math.max(touch, 0.6 * bump(t, 50.4, 50.9, 53.4, 53.9)), tmp2.set(1, -0.6, 0.2));
        him.ik.tilt("Head", rightHim, 0.25 * touch * TILT);
      }
      // Levha: dokunur; öfke: iki el şeritleri çeker.
      const sheetTouch = bump(t, 59.9, 60.3, 61.0, 61.6);
      if (sheetTouch > 0) him.ik.reach("r", wv(HERO_SHEET.x, HERO_SHEET.y, HERO_SHEET.z + 0.04, tmp), sheetTouch, tmp2.set(1, -0.6, 0));
      const anger = bump(t, 62.8, 63.2, 65.6, 66.2);
      if (anger > 0) {
        const sway = 0.25 + 0.2 * Math.sin(time * 3.1);
        him.ik.reach("r", wv(HERO_SHEET.x + sway, HERO_SHEET.y - 0.05 + 0.1 * Math.sin(time * 2.3), HERO_SHEET.z + 0.1, tmp), anger, tmp2.set(1, -0.6, 0));
        him.ik.reach("l", wv(HERO_SHEET.x - sway, HERO_SHEET.y + 0.05 - 0.1 * Math.sin(time * 2.3), HERO_SHEET.z + 0.1, tmp), anger, tmp2.set(-1, -0.6, 0));
        him.ik.tilt("Head", rightHim, 0.3 * anger * TILT);
      }
      // Depo: dışarı iter.
      const push = bump(t, 78.8, 79.0, 79.5, 79.9);
      if (push > 0) {
        him.ik.reach("r", toWorld(relative(himG, -0.55, 1.25, 0.3, tmp)), push, tmp2.set(1, -0.6, 0));
        him.ik.reach("l", toWorld(relative(himG, 0.55, 1.25, 0.3, tmp)), push, tmp2.set(-1, -0.6, 0));
      }
      // Perde: avuçlar zara (o batıdan, kadın doğudan); zar incelir; yırtılır.
      const palmK = smooth((t - 88.4) / 0.9) * (1 - smooth((t - 95.4) / 0.5));
      const closer = smooth((t - 92.0) / 2.5);
      palms[0].p.set(0, 1.42 - 0.04 * closer, 0.2 - 0.06 * closer);
      palms[1].p.set(0, 1.36 - 0.02 * closer, -0.2 + 0.06 * closer);
      palms[2].p.set(0, 1.4 - 0.03 * closer, 0.2 - 0.06 * closer);
      palms[3].p.set(0, 1.34 - 0.02 * closer, -0.2 + 0.06 * closer);
      for (const palm of palms) palm.k = palmK * (0.6 + 0.4 * closer);
      if (palmK > 0) {
        const px = CURTAIN.x - 0.06 + 0.1 * closer;
        him.ik.reach("r", wv(px, palms[0].p.y, palms[0].p.z, tmp), palmK, tmp2.set(0, -0.7, 0.3));
        him.ik.reach("l", wv(px, palms[1].p.y, palms[1].p.z, tmp), palmK, tmp2.set(0, -0.7, -0.3));
        if (herG.visible) {
          const qx = CURTAIN.x + 0.06 - 0.1 * closer;
          her.ik.reach("l", wv(qx, palms[2].p.y, palms[2].p.z, tmp), palmK, tmp2.set(0, -0.7, 0.3));
          her.ik.reach("r", wv(qx, palms[3].p.y, palms[3].p.z, tmp), palmK, tmp2.set(0, -0.7, -0.3));
        }
      }
      const curtainOn = bump(t, 86.0, 86.6, 96.5, 97.0);
      setCurtain(curtainOn * level, smooth((t - L.stuck) / 0.55), smooth((t - 95.95) / 0.75), time);
      // Kolundaki film: dokunur; avucunda ısınır; duvara koyar; iplik geri gelir; kavrar, çeker, bilek.
      const sleeve = bump(t, 97.0, 97.5, 98.4, 98.9);
      if (sleeve > 0) him.ik.reach("l", toWorld(boneLocal(himG, "lowerarm_r", tmp).add(tmp2.set(0, 0.04, 0.03))), sleeve, tmp3.set(-1, -0.6, 0.2));
      const heat = bump(t, 98.8, 99.3, 100.8, 101.1);
      if (heat > 0) {
        him.ik.reach("r", toWorld(relative(himG, -0.12, 1.25, 0.4, tmp)), heat, tmp2.set(1, -0.5, 0));
        him.ik.tilt("Head", rightHim, 0.45 * heat * TILT);
      }
      const stick = bump(t, 101.0, 101.5, 101.8, 102.3);
      if (stick > 0) him.ik.reach("r", wv(FRAME_PT.x - 0.02, FRAME_PT.y, FRAME_PT.z, tmp), stick, tmp2.set(1, -0.6, 0));
      const grab = bump(t, 105.8, 106.3, 107.5, 107.65);
      const pullK = smooth((t - 106.5) / 1.0);
      if (grab > 0) him.ik.reach("r", wv(FRAME_PT.x + 0.45 * pullK, FRAME_PT.y + 0.05, FRAME_PT.z + 0.35 * pullK, tmp), grab, tmp2.set(1, -0.6, 0));
      const stare = bump(t, 107.8, 108.4, 110.4, 111.2);
      if (stare > 0) {
        him.ik.reach("r", toWorld(relative(himG, -0.16, 1.18, 0.4, tmp)), stare, tmp2.set(1, -0.5, 0));
        him.ik.tilt("Head", rightHim, 0.45 * stare * TILT);
      }
      const wipe = bump(t, 110.5, 110.9, 111.3, 111.7);
      if (wipe > 0) him.ik.reach("l", toWorld(boneLocal(himG, "hand_r", tmp).add(tmp2.set(0, 0.03, 0))), wipe, tmp3.set(-1, -0.6, 0.2));
      // Anlar: başı iner, sonra kalkar ve çevresine bakar.
      const realise = bump(t, 112.6, 113.4, 114.3, 115.5);
      if (realise > 0) him.ik.tilt("Head", rightHim, 0.35 * realise * TILT);
      // Cama dokunur (yansımadaki nabız karşılık verir).
      const glassTouch = bump(t, 121.3, 121.9, 122.6, 123.2);
      if (glassTouch > 0) him.ik.reach("r", wv(SHEETS_GLASS.x, SHEETS_GLASS.y, SHEETS_GLASS.z - 0.02, tmp), glassTouch, tmp2.set(1, -0.6, 0));
      // Anahtarı alır; elinde tutar; bırakmak ister; iki eliyle yırtar.
      const reachKey = bump(t, 139.4, 139.8, 140.1, 140.6);
      if (reachKey > 0) him.ik.reach("r", wv(KEY_FLOOR1.x, 0.06, KEY_FLOOR1.z + 0.1, tmp), reachKey, tmp2.set(1, -0.3, 0.6));
      const hold = smooth((t - 140.3) / 0.5) * (1 - smooth((t - KEY_DROP) / 0.2));
      const dropTry = bump(t, 142.0, 142.5, 143.0, 143.6);
      if (hold > 0) {
        const standing = smooth((t - 148.3) / 0.5);
        const hy = lerp(0.95, 1.2, standing) - 0.3 * dropTry;
        const sep = smooth((t - 154.9) / 2.6);
        him.ik.reach("r", toWorld(relative(himG, -0.1 - 0.22 * sep - 0.1 * dropTry, hy + 0.05 * sep, 0.38 + 0.04 * sep, tmp)), hold, tmp2.set(1, -0.5, 0));
        const left = smooth((t - L.fever) / 0.6) * (1 - smooth((t - 157.9) / 0.3));
        if (left > 0) him.ik.reach("l", toWorld(relative(himG, 0.05 + 0.3 * sep, 1.18 - 0.04 * sep, 0.42, tmp)), left, tmp2.set(-1, -0.5, 0));
        him.ik.tilt("Head", rightHim, (0.3 + 0.15 * sep) * hold * TILT);
      }
      // Seçim: eline bakar.
      const choice = bump(t, L.e2, 190.5, 191.4, 192.0);
      if (choice > 0) {
        him.ik.reach("r", toWorld(relative(himG, -0.15, 1.0, 0.35, tmp)), choice * 0.8, tmp2.set(1, -0.5, 0));
        him.ik.tilt("Head", rightHim, 0.5 * choice * TILT);
      }

      // --- Anahtar ve fincan ------------------------------------------------------------------------------------------------
      archive.cup.visible = t < 131;
      const ks = keyState(t);
      if (ks === "home") {
        key.position.copy(KEY_HOME);
        key.position.x += 0.02 * tiltK(t);
        key.quaternion.identity();
      } else if (ks === "floor1") {
        key.position.copy(KEY_FLOOR1);
        key.quaternion.setFromEuler(new THREE.Euler(0, 0.6, 0));
      } else if (ks === "hand") {
        const bone = himG.getObjectByName("hand_r");
        if (bone) {
          bone.getWorldPosition(tmp);
          bone.getWorldQuaternion(keyQuat);
          toLocal(tmp);
          tmp.add(tmp2.set(0.0, 0.09, 0.02).applyQuaternion(keyQuat));
          tmp.y -= 0.12 * dropTry;
          key.position.copy(tmp);
          key.quaternion.copy(keyQuat).multiply(keyFix);
        }
      } else if (ks === "falling") {
        const k = clamp((t - KEY_DROP) / 0.45, 0, 1);
        relative(himG, -0.12, 1.02, 0.36, tmp);
        key.position.lerpVectors(tmp, KEY_FLOOR2, k);
        key.position.y = lerp(tmp.y, KEY_FLOOR2.y, k * k);
        key.quaternion.setFromEuler(new THREE.Euler(k * 4.2, 0.8, k * 2.6));
      } else if (ks === "floor2") {
        key.position.copy(KEY_FLOOR2);
        key.quaternion.setFromEuler(new THREE.Euler(0, 0.8, 0));
      } else {
        key.position.copy(KEY_FINAL);
        key.quaternion.identity();
      }

      // --- Kalıntılar ---------------------------------------------------------------------------------------------------------
      resKeyGlass.set(smooth((t - 1.75) / 0.5) * (1 - smooth((t - 11.5) / 0.8)) + smooth((t - 123.5) / 1) * (1 - smooth((t - RELEASE) / 2)) + smooth((t - L.chorus2) / 2) * (1 - smooth((t - WITHDRAW) / 2)), time);
      resFlawed.set(smooth((t - 36) / 2) * (1 - smooth((t - RELEASE) / 2)) + smooth((t - L.chorus2) / 2) * (1 - smooth((t - WITHDRAW) / 2)), time);
      resLine.set(smooth((t - 33.3) / 0.8) * (1 - smooth((t - RELEASE) / 2)) + smooth((t - L.chorus2) / 2) * (1 - smooth((t - WITHDRAW) / 2)), time);
      resExterior.set(level, time);
      // Parmak ucundaki kalıntı (temas sonrası; silinir).
      const fingerK = smooth((t - 51.7) / 0.3) * (1 - smooth((t - 60) / 3));
      resFinger.set(fingerK, time);
      if (fingerK > 0) {
        him.ik.hand("r", tmp);
        toLocal(tmp);
        relative(himG, 0, 0, 1, tmp2).sub(himG.position).normalize();
        resFinger.mesh.position.copy(tmp).addScaledVector(tmp2, 0.09).add(tmp3.set(0, -0.01, 0));
        resFinger.mesh.quaternion.setFromUnitVectors(Z_PLUS, tmp2);
      }
      // Kolundaki film → avuçta ısınır → duvara.
      const sleeveK = smooth((t - 96.7) / 0.5) * (1 - smooth((t - 98.9) / 0.3));
      const palmFilm = smooth((t - 99.0) / 0.4) * (1 - smooth((t - 101.6) / 0.3));
      resSleeve.set(Math.max(sleeveK, palmFilm), time);
      if (sleeveK > 0) {
        boneLocal(himG, "lowerarm_r", tmp);
        resSleeve.mesh.position.copy(tmp).add(tmp2.set(0, 0.04, 0.035));
        resSleeve.mesh.quaternion.setFromUnitVectors(Z_PLUS, tmp3.set(0, 0.6, 0.8).normalize());
      } else if (palmFilm > 0) {
        him.ik.hand("r", tmp);
        toLocal(tmp);
        resSleeve.mesh.position.copy(tmp).add(tmp2.set(0, 0.035, 0.02));
        resSleeve.mesh.quaternion.setFromUnitVectors(Z_PLUS, UP);
        resSleeve.mesh.scale.multiplyScalar(1 + 0.4 * heat);
      }

      // --- Filamentler -------------------------------------------------------------------------------------------------------
      const slack = slackK(t);
      for (const s of strands) {
        if (special.has(s)) continue;
        s.fil.set(netReveal(s.group, s.o, t), slack * (0.7 + s.slackBias), time);
      }
      // Depo iplikleri: omuzdan omuza (giysiler kapanırken birlikte hareket eder).
      for (const th of threads) {
        archive.storage.garmentPoint(th.a, th.s.fil.path[0]);
        archive.storage.garmentPoint(th.b, th.s.fil.path[2]);
        th.s.fil.path[1].lerpVectors(th.s.fil.path[0], th.s.fil.path[2], 0.5).y -= 0.35;
        th.s.fil.set(netReveal("T", th.s.o, t), slack, time);
      }
      // Tek iplik ona ulaşır (depo); kol sarkıtılmıştır.
      const handThreadK = smooth((t - 77.3) / 1.2) * (1 - smooth((t - 79.4) / 0.4));
      if (handThreadK > 0 && threads.length) {
        archive.storage.garmentPoint(threads[0].a, handThread.fil.path[0]);
        him.ik.hand("r", handThread.fil.path[2]);
        toLocal(handThread.fil.path[2]);
        handThread.fil.path[1].lerpVectors(handThread.fil.path[0], handThread.fil.path[2], 0.5).y -= 0.25;
        handThread.fil.set(handThreadK, 0.2, time);
      } else handThread.fil.tube.mesh.visible = false;
      // Kahraman filament: temastan sonra çerçeveden zemine, geçide.
      heroStrand.fil.set(netReveal("S", heroStrand.o, t), slack, time);
      // Cam zeminin altında kısa bir parça yürür (hiç kimse tepki vermez).
      const under = bump(t, 12.2, 12.6, 15.0, 15.4) + bump(t, L.c3, L.c3 + 0.4, 129.2, 129.6);
      if (under > 0) {
        const k = t < 100 ? clamp((t - 12.4) / 2.8, 0, 1) : clamp((t - L.c3) / 2.0, 0, 1);
        const hx = 18.6 - 2.4 * k;
        const hz = 0.9 - 0.7 * k;
        underFloor.fil.path[0].set(hx + 0.55, -0.05, hz + 0.1);
        underFloor.fil.path[1].set(hx + 0.35, -0.05, hz + 0.02);
        underFloor.fil.path[2].set(hx + 0.15, -0.05, hz - 0.03);
        underFloor.fil.path[3].set(hx, -0.05, hz - 0.08);
        underFloor.fil.set(under, 0, time);
      } else underFloor.fil.tube.mesh.visible = false;
      // Arkasındaki duvara tırmanan filament.
      wallClimb.fil.set(smooth((t - 24.2) / 2.0) * (1 - smooth((t - 29.0) / 0.5)) + smooth((t - L.chorus2) / 2.2) * (1 - smooth((t - WITHDRAW) / 2.5)), slack, time);
      // Geri dönüş: filament ona doğru yürür; yalnız kapıya baktığında ilerler.
      const look1 = clamp((t - 165.5) / 1.5, 0, 1) * 0.45;
      const look2 = clamp((t - 167.0) / 0.7, 0, 1) * 0.3;
      const look3 = clamp((t - 168.3) / 0.6, 0, 1) * 0.25;
      const returnK = t >= 165.5 && t < L.chorus2 + 1.5 ? Math.min(1, look1 + look2 + look3) : 0;
      returning.fil.set(returnK * (1 - smooth((t - L.chorus2 - 0.5) / 1.0)), 0, time);
      // Bilek: duvar filamenti ele kadar uzar, geri teper, bileğe sarılır; bir kez atar; saydamlaşır.
      const wristK = bump(t, 105.6, 105.8, 107.5, 107.65);
      if (wristK > 0) {
        him.ik.hand("r", wristStrand.fil.path[2]);
        toLocal(wristStrand.fil.path[2]);
        wristStrand.fil.path[1].lerpVectors(wristStrand.fil.path[0], wristStrand.fil.path[2], 0.5).y -= 0.08 * (1 - pullK);
        wristStrand.fil.set(1, 0.5 * (1 - pullK), time);
      } else wristStrand.fil.tube.mesh.visible = false;
      const ringK = smooth((t - 107.55) / 0.12) * (1 - smooth((t - 109.6) / 0.8));
      wristRing.visible = ringK > 0.01;
      if (wristRing.visible) {
        const bone = himG.getObjectByName("hand_r");
        if (bone) {
          bone.getWorldPosition(tmp);
          bone.getWorldQuaternion(keyQuat);
          toLocal(tmp);
          wristRing.position.copy(tmp).add(tmp2.set(0, -0.03, 0).applyQuaternion(keyQuat));
          wristRing.quaternion.copy(keyQuat).multiply(keyFix);
          const beat = pulse(t, 108.8, 0.5);
          wristRing.scale.setScalar((1 + 0.18 * beat) * (0.9 + 0.1 * ringK));
          ringMaterial.opacity = 0.75 * ringK;
          ringMaterial.emissiveIntensity = 0.5 + 1.2 * beat;
        }
      }
      // Eline bağlı filament (klimaks): zeminden sağ eline.
      const handK = smooth((t - 181.0) / 1.5) * (1 - smooth((t - WITHDRAW - 2.0) / 1.2));
      if (handK > 0) {
        him.ik.hand("r", handStrand.fil.path[2]);
        toLocal(handStrand.fil.path[2]);
        handStrand.fil.path[1].lerpVectors(handStrand.fil.path[0], handStrand.fil.path[2], 0.45).y -= 0.12 + 0.3 * slack;
        handStrand.fil.set(handK, slack, time);
      } else handStrand.fil.tube.mesh.visible = false;
      // Son filament: vitrinin içinde; renksizleşir; kopar, düşer, seker; bir kez kıpırdar.
      const finalK = smooth((t - KEY_BACK) / 1.6);
      if (finalK > 0) {
        const fall = clamp((t - 214.3) / 0.7, 0, 1);
        const bounce = t > 215.0 ? Math.max(0, Math.sin(clamp((t - 215.0) / 0.4, 0, 1) * Math.PI)) * 0.025 : 0;
        const p0 = finalStrand.fil.path[0];
        p0.set(KEY_FINAL.x - 0.36 + 0.06 * fall, lerp(KEY_FINAL.y + 0.42, KEY_FINAL.y + 0.004, fall * fall) + bounce, KEY_FINAL.z - 0.26 + 0.08 * fall);
        finalStrand.fil.path[1].lerpVectors(p0, finalStrand.fil.path[2], 0.5).y += (1 - fall) * 0.04;
        const twitch = pulse(t, 227.3, 0.6);
        finalStrand.fil.set(finalK, 0.3 * fall + 0.5 * twitch, time);
      } else finalStrand.fil.tube.mesh.visible = false;

      // --- Zarlar --------------------------------------------------------------------------------------------------------------
      // Parmak ↔ cam: kalkınca gerilir, bağlı kalır, çekilir.
      const lift = smooth((t - 51.75) / 0.6) * (1 - smooth((t - 52.4) / 0.6));
      if (t > 51.6 && t < 53.1) {
        him.ik.hand("r", tmp);
        toLocal(tmp);
        relative(himG, 0, 0, 1, tmp2).sub(himG.position).normalize();
        tmp.addScaledVector(tmp2, 0.085);
        mFinger.set(FRONT.clone().add(tmp3.set(-0.01, -0.01, 0.004)), tmp, 0.022, 0.009, 0.15 * lift, 0, 0, time);
        mFinger.mesh.visible = lift > 0.01;
      } else mFinger.mesh.visible = false;
      // Nesneden nesneye film.
      const linkW = netReveal("A", 0.35, t);
      mLink.set(LINK_A, LINK_B, 0.16 * linkW, 0.16 * linkW, 0.5 + 0.5 * slack, 0, 0, time);
      // Anahtar ↔ el.
      if (ks === "hand") {
        him.ik.hand("r", tmp);
        toLocal(tmp);
        tmp.y -= 0.03;
        const k = smooth((t - 140.3) / 0.6);
        const tearK = smooth((t - 155.4) / 2.0);
        mKey.set(key.position.clone().add(tmp2.set(0, 0.01, 0)), tmp, 0.045 * k, 0.06 * k, 0.1 + 0.5 * dropTry, tearK, smooth((t - 156.6) / 1.1), time);
      } else mKey.mesh.visible = false;
      // Duvar ipliği: duvara koyar, yürür (uzar), döner (ona geri çekilir).
      const wallK = smooth((t - 101.6) / 0.3) * (1 - smooth((t - 105.2) / 0.3));
      if (wallK > 0) {
        him.ik.hand("r", tmp);
        toLocal(tmp);
        const back = smooth((t - L.gum) / 1.1);
        tmp2.copy(FRAME_PT).lerp(tmp, back);
        mWall.set(tmp2, tmp, 0.04 * (1 - back * 0.7), 0.02, 0.2 + 0.4 * (1 - back), 0, 0, time);
        mWall.mesh.visible = wallK > 0.01 && back < 0.98;
      } else mWall.mesh.visible = false;
      // Klimaks zarları.
      mClimax.forEach((m, i) => {
        const [a, b, w] = CLIMAX_LINKS[i];
        const k = smooth((t - L.chorus2 - i * 0.6) / 2.2) * (1 - smooth((t - WITHDRAW - i * 0.5) / 2.0));
        m.set(a, b, w * k, w * k, 0.4 + 0.6 * slack, 0, 0, time);
      });

      // --- Filmler, levhalar, depo, yineleme ------------------------------------------------------------------------------------
      for (const f of films) f.f.set(filmReveal(f, t), time);
      archive.sheets.setTear(smooth((t - 60.6) / 2.0), smooth((t - 62.7) / 3.6));
      const closeK = smooth((t - 74.0) / 4.5) * (1 - smooth((t - L.virus) / 0.25)) - smooth((t - L.virus) / 0.7) * (1 - smooth((t - 110) / 20));
      archive.storage.setClose(clamp(closeK, -1, 1));
      archive.storage.setStain(smooth((t - 79.2) / 3) * (1 - smooth((t - RELEASE) / 3)) + smooth((t - L.chorus2) / 3) * (1 - smooth((t - WITHDRAW) / 3)));
      archive.repeat.setOpacity(bump(t, 69.5, 69.9, 70.3, 70.9));

      // --- Aynalar ve yansımaya özel nesneler -----------------------------------------------------------------------------------
      const galleryK = bump(t, L.overflow, L.overflow + 0.6, 23.6, 24.3);
      galleryMirror.mirror.visible = galleryK > 0.01;
      galleryMirror.fade.value = galleryK * level;
      ghost.visible = galleryK > 0.01;
      (ghost.material as THREE.LineBasicMaterial).opacity = 0.5 * smooth((t - 19.5) / 2.5) * galleryK;
      const sheetsK = bump(t, 66.9, 67.3, 69.4, 69.7) + bump(t, L.chorus - 0.4, L.chorus + 0.3, 122.9, 123.4);
      sheetsMirror.mirror.visible = sheetsK > 0.01;
      sheetsMirror.fade.value = Math.min(1, sheetsK) * level;
      if (galleryMirror.mirror.visible) galleryMirror.cameras.get(kit.camera)?.layers.enable(MIRROR_LAYER);
      if (sheetsMirror.mirror.visible) sheetsMirror.cameras.get(kit.camera)?.layers.enable(MIRROR_LAYER);
      const pulseK = smooth((t - L.chorus) / 0.8) * (1 - smooth((t - 123.0) / 0.5));
      pulseSprite.visible = pulseK > 0.01;
      if (pulseSprite.visible) {
        boneLocal(himG, "spine_03", tmp);
        relative(himG, 0, 0, 1, tmp2).sub(himG.position).normalize();
        pulseSprite.position.copy(tmp).addScaledVector(tmp2, 0.14).add(tmp3.set(0, 0.06, 0));
        const beat = pulse(t % 1.1, 0.1, 0.45) + 0.35 * pulse(t % 1.1, 0.45, 0.3);
        const answer = glassTouch;
        (pulseSprite.material as THREE.SpriteMaterial).opacity = (0.25 + 0.55 * beat) * (1 + answer) * pulseK;
        pulseSprite.scale.setScalar(0.14 + 0.05 * beat + 0.06 * answer);
      }

      // --- Işık: anahtar ışığı adamın kamera tarafında; kızıl sıçrama ağ yoğunlaştıkça ------------------------------------------
      const keyLight = kit.lights[0];
      const rim = kit.lights[1];
      if (keyLight && rim && level > 0.3) {
        const c = wv(himG.position.x, himG.position.y + 1.3, himG.position.z, tmp3);
        const toCam = tmp2.copy(kit.camera.position).sub(c).setY(0);
        if (toCam.lengthSq() < 1e-4) toCam.set(0, 0, 1);
        toCam.normalize();
        const warm = bump(t, L.cb3, L.cb3 + 1.2, 146.4, 147.6);
        keyLight.color.set(warm > 0.5 ? "#ffd9b8" : "#f6f2ea");
        keyLight.distance = 18;
        keyLight.position.copy(c).addScaledVector(toCam, 2.0).add(tmp.set(0, 3.2, 0));
        // Cam zemin makrolarında nokta ışığın yansıması kadrajı patlatmasın.
        const macro = bump(t, 13.3, 13.5, 15.1, 15.4) + bump(t, L.c3 - 0.1, L.c3 + 0.1, 129.2, 129.5) + bump(t, 53.3, 53.5, 54.3, 54.9);
        keyLight.intensity = ((7 + 6 * warm) / FIGURE_TONE) * level * (1 - 0.8 * Math.min(1, macro));
        const net = netLevel(t) * (1 - fadeK(t));
        if (net > 0.05) {
          rim.color.set("#ff5a48");
          rim.distance = 24;
          rim.position.copy(c).addScaledVector(toCam, -1.5).add(tmp.set(1.5, 3.5, -2.0));
          rim.intensity = ((4 + 12 * net) / FIGURE_TONE) * level;
        } else {
          rim.color.set("#dde4f0");
          rim.distance = 20;
          rim.position.copy(c).addScaledVector(toCam, -3.0).add(tmp.set(0, 3.0, 0));
          rim.intensity = (4 / FIGURE_TONE) * level;
        }
      }
    },
  };
  return scene;
}
