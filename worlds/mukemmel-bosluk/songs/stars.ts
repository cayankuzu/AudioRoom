import * as THREE from "three";
import type { SongScene } from "../../../engine/game/songStage";
import type { ClipGrade, Shot } from "../../../engine/game/director";
import { gazeTarget, ground, secretItem, type SceneKit } from "./kit";
import { createFigure } from "../../../engine/fx/figure";
import { createEmitter } from "../../../engine/fx/emitter";
import { fitModel } from "../../../engine/core/models";
import { createArmIk } from "../../../engine/fx/armIk";
import { createPerformer, type PerfEase, type PerfKey } from "../../../engine/fx/performer";
import { createSkinPainter } from "../../../engine/fx/skinPaint";

/**
 * Kanıyorduk — tek bir film, tek bir dünya (kapağın krateri). Masada açık bir kitap: solda bir kadının eğri, yıpranmış
 * fotoğrafı; sağda bir devle dövüşen küçük bir adam (sayfanın üstünde yaşayan minyatür sahne). Kamera fotoğrafın
 * kâğıdından kitabın içine girer; sayfadaki adam yenilir, sonraki sayfaya ulaşamaz. Kâğıt büyür: aynı adam, aynı dev,
 * aynı dünya; kadın devin ötesinde. Gece iner, birkaç yıldız yakından bakınca göz olur, Ay hilaldir; kare bir fotoğraf
 * gibi yırtılır. İkisi bu yerden yükselir (nakarat: uzaydan bakınca düşüş, kamera dönünce yükseliş; uzaktan huzur,
 * yakından kan). Yerde: eller, kalp kâğıda döner ve yırtılır; dev aralarına girer; adam dövüşür, yorulur; kadının
 * kollarında ölür. Ölümden sonrası bir dileğin görüntüsüdür: aynı yerden yeniden yükselirler; kan dünyaya döner; iki
 * damla birleşir, fotoğrafta bir leke olur; kitap kapanır. Ekranda yazı yoktur; sayfalarda gerçek söz yoktur.
 *
 * Bütün hareket şarkının saniyesinin işlevidir (oyuncu tabloları): ileri ve geri sarma aynı kareyi verir.
 */
const L = {
  photo: 19.94, face: 30.15, giant: 39.85, shot: 50.32, stars: 60.07, moon: 70.29, fall: 80.96, rise: 85.39, happy: 90.97, bleed: 95.55,
  love1: 104.68, love2: 109.55, love3: 114.43, interlude: 120.03, miss: 140.03, tear: 150.49, fight: 159.77, arms: 170.54,
  fall2: 180.96, rise2: 185.46, happy2: 191.04, bleed2: 195.51, fall3: 201.07, happy3: 211.08, love4: 224.49, love5: 229.41, love6: 234.65, end: 238.23,
} as const;
/** Şarkının sesi (YouTube) 4:27,6 sürer; son kare sesle birlikte kararır. */
const AUDIO_END = 267.6;
/** Gerçek dünyanın başladığı an (kâğıttan çıkış) ve ikinci yükselişte topukların kalktığı an. */
const LAND = 56.2;
const ASCENT1 = 77.0;
/** Kalp: yırtığın başladığı an (dizede "yırtılıyor") ve gevşek yarının kadına süzülmeye başladığı an. */
const TEAR_START = 151.6;
const HALF_FREE = 156.0;
const ASCENT2 = 181.3;

// --- Yerler: hepsi kapağın kraterinde -------------------------------------------------------------------------------
const flat = (x: number, z: number) => new THREE.Vector3(x, ground(x, z), z);
/** Masa ve kitap: kraterin batı tabanı. */
const TABLE = flat(-22, 40);
/** Dev: 13 m boyunda bir insan. */
const GIANT_H = 13;
/** Sayfa dünyası: sayfanın üstünde 1/55 ölçekte yaşayan sahne. */
const PAGE_SCALE = 1 / 55;
/** Figürlerin gece tonu: evrenin ışığı yükseltilir, figürler aynı oranda kısılır (zemin okunur, beyaz patlamaz). */
const NIGHT_TONE = 0.66;
/** Baş/omurga eğme yönü (kişinin sağ ekseni çevresinde; eksi öne eğer). */
const BOW = -1;

// --- Paletler: okunur; gölgeler ezilmez ---------------------------------------------------------------------------
const BOOK_GRADE: ClipGrade = { exposure: 1.02, contrast: 1.0, saturation: 0.94, tint: "#fff3e2", lift: "#100c09", vignette: 0.2, soft: 0.2 };
const PAGE_GRADE: ClipGrade = { exposure: 1.0, contrast: 1.02, saturation: 0.96, tint: "#fff1de", lift: "#120d09", vignette: 0.24 };
const END_GRADE: ClipGrade = { exposure: 0.8, contrast: 1.0, saturation: 0.84, tint: "#f1ede8", lift: "#0d0c0b", vignette: 0.28, soft: 0.2 };
const DUSK: ClipGrade = { exposure: 1.0, contrast: 1.0, saturation: 0.9, tint: "#ffe6d4", lift: "#121016", vignette: 0.2 };
const NIGHT_GRADE: ClipGrade = { exposure: 1.02, contrast: 0.98, saturation: 0.82, tint: "#d4def4", lift: "#141c2c", vignette: 0.2 };
const SPACE_GRADE: ClipGrade = { exposure: 0.8, contrast: 1.02, saturation: 0.9, tint: "#dbe6ff", lift: "#070a12", vignette: 0.22 };

// --- Dokular ----------------------------------------------------------------------------------------------------

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext("2d")!];
}

function texture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  return map;
}

/** Eski kâğıt: krem taban, lifler, kenarlarda sararma. */
function paperBase(g: CanvasRenderingContext2D, w: number, h: number, random: () => number): void {
  g.fillStyle = "#e7dfc9";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(120,100,70,0.09)";
  g.lineWidth = 1;
  for (let i = 0; i < w * h * 0.004; i += 1) {
    const x = random() * w;
    const y = random() * h;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (random() - 0.5) * 14, y + (random() - 0.5) * 4);
    g.stroke();
  }
  const edge = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  edge.addColorStop(0, "rgba(110,80,40,0)");
  edge.addColorStop(1, "rgba(110,80,40,0.42)");
  g.fillStyle = edge;
  g.fillRect(0, 0, w, h);
}

/** Basılı ama okunmayan satırlar: uydurma kelime blokları (gerçek metin yok). */
function fakeText(g: CanvasRenderingContext2D, x0: number, y0: number, width: number, lines: number, random: () => number): void {
  g.fillStyle = "rgba(40,34,28,0.62)";
  for (let l = 0; l < lines; l += 1) {
    const y = y0 + l * 19;
    let x = x0 + (l % 9 === 0 ? 26 : 0);
    const end = x0 + width - (random() < 0.15 ? random() * width * 0.5 : 0);
    while (x < end) {
      const word = 10 + random() * 34;
      if (x + word > end) break;
      g.fillRect(x, y, word, 3.2);
      for (let k = x + 2; k < x + word - 2; k += 4 + random() * 5) if (random() < 0.3) g.fillRect(k, y - 3, 1.6, 3);
      x += word + 5 + random() * 4;
    }
  }
}

function textPageTexture(random: () => number, lines = 29): THREE.CanvasTexture {
  const [canvas, g] = makeCanvas(512, 704);
  paperBase(g, 512, 704, random);
  fakeText(g, 56, 70, 400, lines, random);
  g.fillStyle = "rgba(40,34,28,0.5)";
  g.fillRect(238, 662, 36, 3);
  return texture(canvas);
}

/** Fotoğrafın yıpranması: köşelerde solma, ince çizikler, kâğıt lifleri, bir kat izi (saydam katman). */
function photoWearTexture(random: () => number): THREE.CanvasTexture {
  const [canvas, g] = makeCanvas(1024, 1280);
  g.clearRect(0, 0, 1024, 1280);
  g.scale(1024 / 384, 1280 / 480);
  const vig = g.createRadialGradient(192, 240, 120, 192, 240, 320);
  vig.addColorStop(0, "rgba(230,215,180,0)");
  vig.addColorStop(1, "rgba(230,215,180,0.5)");
  g.fillStyle = vig;
  g.fillRect(0, 0, 384, 480);
  // Düzensiz solma: bir köşe daha çok, bir kenar boyunca şerit.
  for (const [cx, cy, r, a] of [[0, 0, 130, 0.85], [384, 0, 90, 0.55], [0, 480, 110, 0.7], [384, 480, 150, 0.9]] as const) {
    const c = g.createRadialGradient(cx, cy, 0, cx, cy, r + random() * 40);
    c.addColorStop(0, `rgba(236,226,200,${a})`);
    c.addColorStop(1, "rgba(236,226,200,0)");
    g.fillStyle = c;
    g.fillRect(0, 0, 384, 480);
  }
  // Yatay bir kat izi: açık bir çizgi ve altında hafif gölge.
  g.strokeStyle = "rgba(255,250,236,0.35)";
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(0, 318);
  for (let x = 0; x <= 384; x += 24) g.lineTo(x, 318 + Math.sin(x * 0.05) * 2);
  g.stroke();
  g.strokeStyle = "rgba(70,55,35,0.18)";
  g.beginPath();
  g.moveTo(0, 321);
  for (let x = 0; x <= 384; x += 24) g.lineTo(x, 321 + Math.sin(x * 0.05) * 2);
  g.stroke();
  g.strokeStyle = "rgba(255,250,235,0.07)";
  g.lineWidth = 0.6;
  for (let i = 0; i < 4; i += 1) {
    g.beginPath();
    const x = random() * 384;
    g.moveTo(x, random() * 480);
    g.lineTo(x + (random() - 0.5) * 60, random() * 480);
    g.stroke();
  }
  g.lineWidth = 0.25;
  for (let i = 0; i < 5000; i += 1) {
    g.strokeStyle = i % 3 === 0 ? "rgba(90,70,40,0.12)" : "rgba(255,250,235,0.16)";
    const x = random() * 384;
    const y = random() * 480;
    const a = random() * Math.PI;
    const l = 1.5 + random() * 4;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * 0.5);
    g.stroke();
  }
  return texture(canvas);
}

/** Fotoğrafın yırtık, düzensiz kenarı (alfa haritası: beyaz görünür). */
function photoEdgeTexture(random: () => number): THREE.CanvasTexture {
  const [canvas, g] = makeCanvas(256, 320);
  g.fillStyle = "#000";
  g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#fff";
  g.beginPath();
  const pts: [number, number][] = [];
  const jag = () => 2 + random() * 5;
  for (let x = 0; x <= 256; x += 8) pts.push([x, jag()]);
  for (let y = 0; y <= 320; y += 8) pts.push([256 - jag(), y]);
  for (let x = 256; x >= 0; x -= 8) pts.push([x, 320 - jag()]);
  for (let y = 320; y >= 0; y -= 8) pts.push([jag(), y]);
  g.moveTo(pts[0][0], pts[0][1]);
  for (const [x, y] of pts) g.lineTo(x, y);
  g.closePath();
  g.fill();
  // Kopmuş bir köşe parçası.
  g.fillStyle = "#000";
  g.beginPath();
  g.moveTo(256, 300);
  g.lineTo(234, 320);
  g.lineTo(256, 320);
  g.closePath();
  g.fill();
  const map = new THREE.CanvasTexture(canvas);
  return map;
}

/** Yakından kâğıt lifi (kâğıdın içine giriş/çıkış geçişleri için). */
function fiberTexture(random: () => number): THREE.CanvasTexture {
  const [canvas, g] = makeCanvas(512, 512);
  g.fillStyle = "#e9e0c8";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const a = random() * Math.PI;
    const l = 6 + random() * 30;
    g.strokeStyle = random() < 0.5 ? `rgba(150,128,92,${0.06 + random() * 0.12})` : `rgba(255,252,240,${0.1 + random() * 0.2})`;
    g.lineWidth = 0.6 + random() * 1.6;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a + 0.4) * l * 0.5, y + Math.sin(a + 0.4) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  const map = texture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

/** Beyaz elbise kumaşı, yakından: ince dokuma ipliği (elbiseden göğe geçiş). */
function clothTexture(random: () => number): THREE.CanvasTexture {
  const [canvas, g] = makeCanvas(512, 512);
  g.fillStyle = "#e9e9ec";
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 4) {
    g.fillStyle = `rgba(150,152,165,${0.1 + random() * 0.08})`;
    g.fillRect(0, y, 512, 1.2);
  }
  for (let x = 0; x < 512; x += 4) {
    g.fillStyle = `rgba(255,255,255,${0.12 + random() * 0.1})`;
    g.fillRect(x, 0, 1.2, 512);
  }
  for (let i = 0; i < 900; i += 1) {
    g.strokeStyle = `rgba(120,122,135,${0.05 + random() * 0.08})`;
    g.lineWidth = 0.6;
    const x = random() * 512;
    const y = random() * 512;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (random() - 0.5) * 24, y + (random() - 0.5) * 3);
    g.stroke();
  }
  const map = texture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return map;
}

/** Fotoğraf kâğıdında kurumuş kan lekesi: düzensiz kenar, koyu halka, açık merkez (alfa). */
function stainTexture(random: () => number): THREE.CanvasTexture {
  const [canvas, g] = makeCanvas(128, 128);
  g.clearRect(0, 0, 128, 128);
  const points: [number, number][] = [];
  for (let i = 0; i < 28; i += 1) {
    const a = (i / 28) * Math.PI * 2;
    const r = 40 + (random() - 0.5) * 12 + Math.sin(a * 3 + random()) * 4;
    points.push([64 + Math.cos(a) * r, 64 + Math.sin(a) * r * 0.92]);
  }
  g.beginPath();
  g.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points) g.lineTo(x, y);
  g.closePath();
  const fill = g.createRadialGradient(60, 62, 4, 64, 64, 46);
  fill.addColorStop(0, "rgba(88,22,20,0.72)");
  fill.addColorStop(0.75, "rgba(64,10,12,0.86)");
  fill.addColorStop(1, "rgba(40,6,8,0.95)");
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = "rgba(34,4,6,0.9)";
  g.lineWidth = 3;
  g.stroke();
  for (let i = 0; i < 5; i += 1) {
    g.fillStyle = "rgba(52,8,10,0.8)";
    g.beginPath();
    g.arc(64 + (random() - 0.5) * 100, 64 + (random() - 0.5) * 100, 1.5 + random() * 3, 0, Math.PI * 2);
    g.fill();
  }
  return texture(canvas);
}

/** Canlı kalp yüzeyi: koyu kırmızı kas, ince damarlar, yağ lekeleri (ölçülü, kansız). */
function organTexture(random: () => number): THREE.CanvasTexture {
  const [canvas, g] = makeCanvas(512, 512);
  g.fillStyle = "#7d1a22";
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i += 1) {
    g.fillStyle = `rgba(${random() < 0.5 ? "60,8,16" : "150,40,44"},${0.08 + random() * 0.12})`;
    g.beginPath();
    g.arc(random() * 512, random() * 512, 2 + random() * 10, 0, Math.PI * 2);
    g.fill();
  }
  for (let i = 0; i < 6; i += 1) {
    g.fillStyle = `rgba(214,176,120,${0.18 + random() * 0.15})`;
    g.beginPath();
    g.ellipse(random() * 512, random() * 512, 20 + random() * 40, 8 + random() * 16, random() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  const vessel = (x: number, y: number, a: number, w: number, depth: number) => {
    if (depth <= 0 || w < 0.5) return;
    const len = 30 + random() * 50;
    const x2 = x + Math.cos(a) * len;
    const y2 = y + Math.sin(a) * len;
    g.strokeStyle = `rgba(70,20,60,${0.35 + 0.1 * depth})`;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo((x + x2) / 2 + (random() - 0.5) * 20, (y + y2) / 2 + (random() - 0.5) * 20, x2, y2);
    g.stroke();
    vessel(x2, y2, a + (random() - 0.5) * 0.9, w * 0.72, depth - 1);
    if (random() < 0.6) vessel(x2, y2, a + (random() < 0.5 ? 0.7 : -0.7), w * 0.6, depth - 1);
  };
  for (let i = 0; i < 4; i += 1) vessel(100 + random() * 300, 20 + random() * 60, Math.PI / 2 + (random() - 0.5) * 0.8, 6, 5);
  return texture(canvas);
}

/** Kalp kâğıdı: kat kat, yıpranmış, kıvrımlı eski kâğıt (ortadaki kat izi ayrıca çizilir). */
function heartPaperTexture(random: () => number): THREE.CanvasTexture {
  const [canvas, g] = makeCanvas(512, 512);
  paperBase(g, 512, 512, random);
  // Katmanlar: üst üste binmiş kâğıt parçalarının kenarları.
  for (let i = 0; i < 9; i += 1) {
    g.strokeStyle = `rgba(110,88,60,${0.18 + random() * 0.2})`;
    g.lineWidth = 1 + random() * 1.5;
    g.beginPath();
    const y = random() * 512;
    g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) g.lineTo(x, y + (random() - 0.5) * 18);
    g.stroke();
  }
  // Buruşukluk: kırık açık-koyu çizgiler.
  for (let i = 0; i < 60; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const a = random() * Math.PI;
    const l = 20 + random() * 60;
    g.strokeStyle = `rgba(255,250,235,${0.15 + random() * 0.2})`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
    g.strokeStyle = `rgba(90,70,45,${0.1 + random() * 0.12})`;
    g.beginPath();
    g.moveTo(x + 1.5, y + 1.5);
    g.lineTo(x + Math.cos(a) * l + 1.5, y + Math.sin(a) * l + 1.5);
    g.stroke();
  }
  return texture(canvas);
}

/**
 * Yıldız-göz: uzaktan yalnız bir yıldız (parlak çekirdek, yumuşak hale). Yakından bakınca yıldızın içinden bir göz
 * belirir: yıldız lifli iris (dışı mavi, içi altın), içinde küçük yıldızlar, koyu bir gözbebeği ve bir parıltı. Çizgi
 * film değil: göz kapağı ve badem çizgisi yok. uLook irisin baktığı yön, uReveal gözün belirginliği.
 */
function stellarEyeMaterial(seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
    uniforms: { uReveal: { value: 0 }, uLook: { value: new THREE.Vector2() }, uTime: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: seed }, uDilate: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uReveal, uTime, uOpacity, uSeed, uDilate; uniform vec2 uLook; varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed * 17.0) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        // Uzaktan: yalnız bir yıldız (çekirdek ve soluk hale).
        float star = exp(-r * r * 520.0) + exp(-r * r * 60.0) * 0.16;
        vec2 q = p - uLook * 0.16;
        float ri = length(q);
        float ang = atan(q.y, q.x);
        // İris: düzensiz ama belirli bir kenar, kenarda koyu bir halka; göz akı ve kapak yok (yıldızın içinden belirir).
        float irisR = 0.46 + (noise(vec2(ang * 2.5, uSeed * 3.0)) - 0.5) * 0.05;
        float irisEdge = smoothstep(irisR, irisR - 0.07, ri);
        float limbal = smoothstep(irisR - 0.16, irisR - 0.03, ri) * irisEdge;
        float pupilR = 0.045 * (1.0 + uDilate * 0.35);
        float pupil = smoothstep(pupilR + 0.016, pupilR - 0.006, ri);
        // Dokusu: merkezden dışa lifler ve çukurlar; içinde yıldız tozu; ağır bir kıpırtı.
        float fibers = noise(vec2(ang * 30.0, ri * 2.0 + uTime * 0.02));
        float crypts = noise(vec2(ang * 9.0 + 5.0, ri * 6.0 - uTime * 0.015));
        float pattern = 0.5 + 0.5 * fibers * (0.55 + 0.45 * crypts);
        vec3 inner = vec3(0.92, 0.62, 0.28);
        vec3 outer = vec3(0.2, 0.38, 0.7);
        vec3 irisCol = mix(inner, outer, smoothstep(pupilR * 1.6, irisR * 0.72, ri)) * pattern;
        irisCol *= 1.0 - limbal * 0.7;
        float collar = exp(-pow((ri - pupilR * 2.3) * 16.0, 2.0)) * 0.3;
        float dust = step(0.978, hash(floor(q * 110.0))) * irisEdge * (1.0 - limbal);
        vec3 eye = (irisCol * 0.8 + inner * collar + vec3(0.8, 0.86, 1.0) * dust * 0.45) * 0.62;
        vec2 gq = q - vec2(-0.03, 0.04);
        float glint = exp(-dot(gq, gq) * 3200.0);
        vec3 starCol = vec3(0.9, 0.93, 1.0) * star;
        float show = uReveal * irisEdge;
        vec3 col = mix(starCol, eye + vec3(1.0) * glint * 0.8, show) + starCol * 0.25 * uReveal * (1.0 - irisEdge);
        col = mix(col, vec3(0.01, 0.012, 0.025), pupil * uReveal * (1.0 - glint));
        float alpha = clamp(star + uReveal * (irisEdge + pupil), 0.0, 1.0);
        gl_FragColor = vec4(col, alpha * uOpacity);
      }
    `,
  });
}

/** Kalbin bir yarısı: yırtık çizgisi ortadan geçer, iki yarı birbirine tam oturur. */
function heartHalfShape(side: -1 | 1): THREE.Shape {
  const s = new THREE.Shape();
  const edge = (y: number) => 0.016 * Math.sin(y * 58) + 0.009 * Math.sin(y * 131 + 1.3);
  s.moveTo(edge(-0.5), -0.5);
  if (side < 0) {
    s.bezierCurveTo(-0.55, -0.15, -0.7, 0.35, -0.3, 0.5);
    s.bezierCurveTo(-0.1, 0.6, 0, 0.45, edge(0.35), 0.35);
  } else {
    s.bezierCurveTo(0.55, -0.15, 0.7, 0.35, 0.3, 0.5);
    s.bezierCurveTo(0.1, 0.6, 0, 0.45, edge(0.35), 0.35);
  }
  for (let y = 0.33; y > -0.5; y -= 0.015) s.lineTo(edge(y), y);
  s.closePath();
  return s;
}

/** Figürün kıyafet dokuları yüklendi mi (portre basımı için). */
function texturesReady(group: THREE.Group): boolean {
  let any = false;
  let ready = true;
  group.traverse((child) => {
    const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (!material || Array.isArray(material) || !material.map) return;
    any = true;
    const image = material.map.image as { width?: number; complete?: boolean } | undefined;
    if (!image || image.complete === false || !(image.width ?? 0)) ready = false;
  });
  return any && ready;
}

/** Figüre göre nokta: dx figürün soluna, dz baktığı yöne, dy yukarı. */
function relative(g: THREE.Object3D, dx: number, dy: number, dz: number, out = new THREE.Vector3()): THREE.Vector3 {
  const yaw = g.rotation.y;
  return out.set(g.position.x + Math.cos(yaw) * dx + Math.sin(yaw) * dz, g.position.y + dy, g.position.z - Math.sin(yaw) * dx + Math.cos(yaw) * dz);
}
/** Figürün gerçek sağı (baktığı yöne göre). */
const rightOf = (g: THREE.Object3D, out = new THREE.Vector3()) => out.set(-Math.cos(g.rotation.y), 0, Math.sin(g.rotation.y));
const forwardOf = (g: THREE.Object3D, out = new THREE.Vector3()) => out.set(Math.sin(g.rotation.y), 0, Math.cos(g.rotation.y));
const smooth = (x: number) => {
  const k = THREE.MathUtils.clamp(x, 0, 1);
  return k * k * (3 - 2 * k);
};
const smoother = (x: number) => {
  const k = THREE.MathUtils.clamp(x, 0, 1);
  return k * k * k * (k * (k * 6 - 15) + 10);
};
const bump = (t: number, a: number, b: number, c: number, d: number) => THREE.MathUtils.smoothstep(t, a, b) * (1 - THREE.MathUtils.smoothstep(t, c, d));

/** İrtifa anahtarı: [saniye, irtifa (m), dikey hız (m/s)]; aralar Hermite eğrisiyle (hız sürekli, sıçrama yok). */
type AltKey = readonly [number, number, number];
/**
 * Nakaratlarda irtifa, dizelere göre: yerden kalkış (topuk, santim, bekleme, bir metre), hızla tırmanış; "düşüyorduk"ta
 * tepe noktasından gerçekten düşerler (hızlanarak, sonda tutulur gibi yavaşlayarak); "yükseliyorduk"ta yeniden ve daha
 * yükseğe fırlarlar; sonra uzayda ağır bir süzülme. Düşüş ve yükseliş hissi irtifanın kendisinden gelir (kamera
 * onları geriden izler, havadaki zerreler hızla akar); havada asılı durmazlar.
 */
const ALT1: AltKey[] = [[78.9, 4, 8], [80.2, 58, 42], [80.96, 80, 0], [83.9, 40, -24], [85.39, 22, 0], [87.6, 115, 40], [90.97, 205, 3], [93.0, 209, 0.8], [130, 238.6, 0.8]];
const ALT2: AltKey[] = [[183.2, 4, 6], [186.5, 70, 30], [190.2, 160, 2], [201.07, 172, 0], [203.9, 130, -24], [205.5, 112, 0], [207.7, 190, 40], [211.08, 262, 3], [213.1, 266, 0.8], [240, 287.5, 0.8]];
function hermite(keys: readonly AltKey[], t: number): number {
  let i = 0;
  while (i < keys.length - 2 && keys[i + 1][0] <= t) i += 1;
  const [t0, h0, v0] = keys[i];
  const [t1, h1, v1] = keys[i + 1];
  if (t >= t1) return h1 + v1 * (t - t1);
  const d = t1 - t0;
  const u = THREE.MathUtils.clamp((t - t0) / d, 0, 1);
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * h0 + (u3 - 2 * u2 + u) * d * v0 + (-2 * u3 + 3 * u2) * h1 + (u3 - u2) * d * v1;
}
/** Yükseliş: topuklar kalkar; birkaç santim, bekleme; bir metre; birkaç metre; sonra anahtarların eğrisi. */
function ascent(t: number, t0: number, keys: readonly AltKey[]): number {
  const k = t - t0;
  if (k <= 0) return 0;
  if (k < 0.4) return 0.04 * smooth(k / 0.4);
  if (k < 0.9) return 0.04;
  if (k < 1.5) return 0.04 + 0.96 * smooth((k - 0.9) / 0.6);
  if (k < 1.9) return 1 + 3 * smooth((k - 1.5) / 0.4);
  return hermite(keys, t);
}

// --- Sahne ------------------------------------------------------------------------------------------------------

export function createStarsScene(kit: SceneKit): SongScene {
  const root = new THREE.Group();
  const random = kit.random;
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const tmp3 = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  let songNow = 0;
  const baseNear = kit.camera.near;

  // --- Gece geometrisi: Aya bakan kameraya göre adam solda, kadın sağda. Q(a, b): a adamdan kadına, b Aya doğru. -------
  const moonH = new THREE.Vector3(kit.moonDirection.x, 0, kit.moonDirection.z).normalize();
  const moonYaw = Math.atan2(moonH.x, moonH.z);
  const MR = new THREE.Vector3(-moonH.z, 0, moonH.x);
  const N_CENTER = flat(-48.5, 33);
  const NH = flat(N_CENTER.x - MR.x * 0.5, N_CENTER.z - MR.z * 0.5);
  const qx = (a: number, b: number) => NH.x + MR.x * a + moonH.x * b;
  const qz = (a: number, b: number) => NH.z + MR.z * a + moonH.z * b;
  const Q = (a: number, b: number) => flat(qx(a, b), qz(a, b));
  /** Tablo anahtarı: Q çerçevesinde (a, b), zeminden y, geçiş. */
  const K = (t: number, a: number, b: number, y?: number, e?: PerfEase): PerfKey => [t, qx(a, b), qz(a, b), y, e];
  const W = (t: number, p: THREE.Vector3, y?: number, e?: PerfEase): PerfKey => [t, p.x, p.z, y, e];
  const NW = Q(1, 0);
  // Dövüş Aya doğru (b ekseni) olur: dev Ay tarafından gelir ve G_STOP'ta durur; adam sonunda devin ötesine düşer
  // (dev ikisinin arasındadır); dev batıya gider. Kameralar doğudaki harflere bakmaz.
  const G_FAR = Q(-30, 80);
  const G_STOP = Q(0.5, 9.0);
  /** Ölüm yeri: adam kadına doğru sendeler, giden deve son bir kez bakar; kadın arkasından tutar. */
  const DEATH = Q(2.8, 13.2);
  const DEATH_F = new THREE.Vector3().addScaledVector(MR, -0.98).addScaledVector(moonH, 0.195).setY(0).normalize();
  const DEATH_YAW = Math.atan2(DEATH_F.x, DEATH_F.z);
  /** Dev ölüm yönünde uzaklaşır ve kraterin kenarında durur: yıldızlara karşı uzak bir siluet, hâlâ orada. */
  const G_EXIT = flat(DEATH.x + DEATH_F.x * 26, DEATH.z + DEATH_F.z * 26);
  /** Sonra kenarı aşıp gözden kaybolur (dilek sahnesinde dev ufkun ötesindedir). */
  const G_GONE = flat(DEATH.x + DEATH_F.x * 90, DEATH.z + DEATH_F.z * 90);
  /**
   * Kadın onun yanında, göğsü hizasında diz çöker (kameranın karşı tarafında, yüzü kameraya): üstüne eğilir, kollarıyla
   * tutar. Başının hizasında diz çöktüğünde öne eğilen göğsü adamın kalkık başının yerine düşüyordu (iç içe).
   */
  const KNEEL = flat(DEATH.x - DEATH_F.x * 0.6 + DEATH_F.z * 0.7, DEATH.z - DEATH_F.z * 0.6 - DEATH_F.x * 0.7);
  const KNEEL_YAW = Math.atan2(-DEATH_F.z, DEATH_F.x);
  /** İkinci yükseliş: ölümün olduğu yerde canlı çift, yüz yüze (eksen ölüm yönüne dik). */
  const C2 = new THREE.Vector3(-DEATH_F.z, 0, DEATH_F.x);
  const D2 = flat(DEATH.x - DEATH_F.x * 0.45, DEATH.z - DEATH_F.z * 0.45);

  // --- Kadının portresi: sahnedeki kadın modelinden basılır (fotoğraftaki yüz = sonra gerçek yüz). -------------
  const portraitScene = new THREE.Scene();
  const portraitFigure = createFigure({ kind: "woman", outfit: "woman_white", height: 1.7 });
  portraitFigure.pose = "still";
  portraitFigure.energy = 0.2;
  portraitScene.add(portraitFigure.group);
  const portraitIk = createArmIk(portraitFigure.group);
  const portraitKey = new THREE.DirectionalLight("#fff0d8", 2.4);
  portraitKey.position.set(1.2, 2.4, 1.6);
  portraitScene.add(portraitKey, portraitKey.target, new THREE.HemisphereLight("#ffffff", "#7a6a50", 1.2));
  portraitScene.background = new THREE.Color("#b9ad93");
  const portraitCamera = new THREE.PerspectiveCamera(26, 1024 / 1280, 0.1, 10);
  const portraitTarget = new THREE.WebGLRenderTarget(1024, 1280);
  let portraitReady = false;
  let portraitState = "";
  let portraitClock = 0;
  /** Portreyi basar: shift gözlerin kayması (baş kesri), live saç ve nefes, (ox, oy) pencere etkisi (derinlik). */
  const renderPortrait = (dt: number, shift: number, live: number, ox: number, oy: number) => {
    portraitFigure.group.rotation.y = 0.5;
    if (!portraitReady) {
      for (let k = 0; k < 4; k += 1) portraitFigure.update(0.05, k * 0.05);
      portraitClock = 0;
    } else {
      // Önceki basımın baş eğimi geri alınır, sonra klip ilerler: eğim birikmez.
      portraitIk.restore();
      portraitClock += dt * live;
      portraitFigure.update(dt * live, portraitClock);
    }
    portraitIk.tilt("Head", UP, -0.07 * shift + Math.sin(portraitClock * 0.9) * 0.02 * live);
    portraitCamera.position.set(0.02 + ox * 0.09, 1.5 + oy * 0.05, 1.08);
    portraitCamera.lookAt(0, 1.47, 0);
    const previous = kit.renderer.getRenderTarget();
    kit.renderer.setRenderTarget(portraitTarget);
    kit.renderer.render(portraitScene, portraitCamera);
    kit.renderer.setRenderTarget(previous);
    portraitReady = true;
  };

  // --- Masa, sandalye, kitap: kraterin tabanında, gün ışığında -----------------------------------------------------
  const set = new THREE.Group();
  set.position.copy(TABLE);
  // Takım, kapladığı yerin en yüksek zeminine oturur: masa, sandalye ve okuyanın ayakları toprağa gömülmez.
  for (let x = -0.95; x <= 0.96; x += 0.19) {
    for (let z = -0.55; z <= 1.25; z += 0.18) set.position.y = Math.max(set.position.y, ground(TABLE.x + x, TABLE.z + z));
  }
  root.add(set);
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#6a5a44", roughness: 0.8 });
  const tableModel = kit.models.get("painted_wooden_table");
  const table = tableModel ? fitModel(tableModel, 1.7, { by: "length" }) : new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.76, 0.9), frameMaterial);
  const tableTop = tableModel ? new THREE.Box3().setFromObject(table).max.y : 0.76;
  if (!tableModel) table.position.y = 0.38;
  table.traverse((child) => {
    child.castShadow = true;
  });
  set.add(table);
  const chairModel = kit.models.get("dining_chair_02");
  if (chairModel) {
    const chair = fitModel(chairModel, 0.92, { by: "height" });
    chair.position.set(0.05, 0, 0.78);
    chair.rotation.y = Math.PI;
    set.add(chair);
  }
  // Kitap: baştan açık; sol sayfada yapışık, eğri, yıpranmış fotoğraf; sağ sayfada minyatür sahne.
  const book = new THREE.Group();
  book.position.set(0.05, tableTop + 0.005, -0.08);
  book.rotation.y = 0.12;
  const coverMaterial = new THREE.MeshStandardMaterial({ color: "#3a2218", roughness: 0.65 });
  const pagesMaterial = new THREE.MeshStandardMaterial({ color: "#d9cfb6", roughness: 0.95 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.44), coverMaterial);
  back.position.set(0.01, 0.006, 0);
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.05, 0.42), pagesMaterial);
  block.position.set(0.02, 0.037, 0);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.44), coverMaterial);
  spine.position.set(-0.16, 0.04, 0);
  // Sağ sayfa ince bölünmüş: devin ayağı bastığında kâğıt hafifçe çöker.
  const rightPageGeometry = new THREE.PlaneGeometry(0.3, 0.41, 72, 96);
  const rightPageBase = Float32Array.from(rightPageGeometry.attributes.position.array as Float32Array);
  const rightPage = new THREE.Mesh(rightPageGeometry, new THREE.MeshStandardMaterial({ map: textPageTexture(random, 12), roughness: 0.95 }));
  rightPage.rotation.x = -Math.PI / 2;
  rightPage.position.set(0.02, 0.0631, 0);
  rightPage.receiveShadow = true;
  const lid = new THREE.Group();
  lid.position.set(-0.16, 0.068, 0);
  lid.rotation.z = Math.PI;
  const lidBoard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.44), coverMaterial);
  lidBoard.position.set(0.17, 0.006, 0);
  const leftPage = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.41), new THREE.MeshStandardMaterial({ map: textPageTexture(random), roughness: 0.95 }));
  leftPage.rotation.set(Math.PI / 2, 0, Math.PI);
  leftPage.position.set(0.17, -0.001, 0);
  lid.add(lidBoard, leftPage);
  // Fotoğraf: satırların üstüne yıllar önce konmuş gibi; eğri, kenarı yırtık, köşesi kıvrık, iki köşesinden bantlı.
  const photo = new THREE.Group();
  const edgeMap = photoEdgeTexture(random);
  const photoMaterial = new THREE.MeshBasicMaterial({ map: portraitTarget.texture, color: "#d6c09a", alphaMap: edgeMap, alphaTest: 0.5 });
  const photoQuad = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.19), photoMaterial);
  const wear = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.19), new THREE.MeshBasicMaterial({ map: photoWearTexture(random), transparent: true, depthWrite: false, alphaMap: edgeMap }));
  wear.position.z = 0.0006;
  const foldShape = new THREE.Shape();
  foldShape.moveTo(0.075, 0.095);
  foldShape.lineTo(0.052, 0.095);
  foldShape.lineTo(0.075, 0.07);
  foldShape.closePath();
  const fold = new THREE.Mesh(new THREE.ShapeGeometry(foldShape), new THREE.MeshStandardMaterial({ color: "#e4dbc4", roughness: 1, side: THREE.DoubleSide }));
  fold.position.z = 0.0012;
  const tapeMaterial = new THREE.MeshStandardMaterial({ color: "#e6d6a4", roughness: 0.6, transparent: true, opacity: 0.5, depthWrite: false });
  for (const [x, y, a] of [[-0.066, 0.086, 0.7], [0.066, -0.088, 0.62]] as const) {
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.042, 0.015), tapeMaterial);
    tape.position.set(x, y, 0.0016);
    tape.rotation.z = a;
    photo.add(tape);
  }
  const dropSpot = new THREE.Mesh(new THREE.PlaneGeometry(0.0075, 0.0075), new THREE.MeshBasicMaterial({ map: stainTexture(random), transparent: true, opacity: 0, depthWrite: false }));
  dropSpot.position.set(-0.012, -0.03, 0.0009);
  dropSpot.rotation.z = 0.7;
  photo.add(photoQuad, wear, fold, dropSpot);
  photo.rotation.set(Math.PI / 2, 0, Math.PI + 0.09);
  photo.position.set(0.18, -0.0025, 0.03);
  lid.add(photo);
  book.add(back, block, spine, rightPage, lid);
  set.add(book);
  book.updateMatrixWorld(true);
  const bookAt = (dx: number, dy: number, dz: number) => () => book.localToWorld(new THREE.Vector3(dx, dy, dz));
  const photoAt = (dx: number, dy: number, dz: number) => () => photo.localToWorld(new THREE.Vector3(dx, -dz, dy));
  const spotAt = (above: number) => () => photo.localToWorld(dropSpot.position.clone().add(new THREE.Vector3(0, 0, above)));
  // Okuyan adam: masada oturur; sonda eli kitabın yanında durur, kitabı kendisi kapatır.
  const reader = createFigure({ kind: "man", outfit: "man_white", height: 1.82 });
  reader.group.position.set(0.05, 0, 0.62);
  reader.group.rotation.y = Math.PI;
  reader.pose = "sit";
  reader.energy = 0.2;
  set.add(reader.group);
  const readerIk = createArmIk(reader.group);
  const readerAt = (dx: number, dy: number, dz: number) => () => set.localToWorld(relative(reader.group, dx, dy, dz));

  // --- Sayfa dünyası: sağ sayfanın üstünde yaşayan minyatür sahne (adam ve dev, sayfa ölçeğinde) ------------------
  const pageWorld = new THREE.Group();
  pageWorld.position.set(0.02, 0.0636, 0);
  pageWorld.scale.setScalar(PAGE_SCALE);
  book.add(pageWorld);
  const pageFloor = () => 0;
  const pm = createPerformer(createFigure({ kind: "man", outfit: "man_white", height: 1.82 }), pageFloor, 1.82);
  const pg = createPerformer(createFigure({ kind: "man", outfit: "man_plain", height: GIANT_H }), pageFloor, GIANT_H);
  pageWorld.add(pm.g, pg.g);
  /** Sayfa ekseni: u devden adama (adam sonunda cilde, fotoğrafın yanına savrulur), v yana. */
  const PG0 = new THREE.Vector3(4.2, 0, -2.0);
  const G2M = new THREE.Vector3(-0.822, 0, 0.569).normalize();
  const GPERP = new THREE.Vector3(G2M.z, 0, -G2M.x);
  const px = (u: number, v: number) => PG0.x + G2M.x * u + GPERP.x * v;
  const pz = (u: number, v: number) => PG0.z + G2M.z * u + GPERP.z * v;
  const U = (t: number, u: number, v: number, y?: number, e?: PerfEase): PerfKey => [t, px(u, v), pz(u, v), y, e];
  const pageAt = (x: number, y: number, z: number) => () => pageWorld.localToWorld(new THREE.Vector3(x, y, z));
  const pmHandAt = (dx: number, dy: number, dz: number) => () => pm.ik.hand("r", new THREE.Vector3()).add(new THREE.Vector3(dx, dy, dz).multiplyScalar(PAGE_SCALE));
  /** Cilt (sayfanın fotoğrafa bakan kenarı). */
  const GUTTER_X = -8.2;
  const pageDust = createEmitter({ count: 90, colors: ["#b3a78c", "#8a7e68"], size: 0.35 * PAGE_SCALE, life: 1.4, spread: new THREE.Vector3(0.9, 0.05, 0.9), velocity: new THREE.Vector3(0, 0.9, 0), jitter: 1.3, gravity: -1.8, additive: false, loop: false });
  pageWorld.add(pageDust.points);

  // --- Gerçek dünya: adam, kadın, dev ------------------------------------------------------------------------------
  const him = createPerformer(createFigure({ kind: "man", outfit: "man_white", height: 1.82 }), ground, 1.82);
  const her = createPerformer(createFigure({ kind: "woman", outfit: "woman_white", height: 1.7 }), ground, 1.7);
  const giant = createPerformer(createFigure({ kind: "man", outfit: "man_plain", height: GIANT_H }), ground, GIANT_H);
  const himG = him.g;
  const herG = her.g;
  const giantG = giant.g;
  himG.rotation.order = "YXZ";
  herG.rotation.order = "YXZ";
  giantG.traverse((child) => {
    child.castShadow = true;
  });
  himG.visible = herG.visible = giantG.visible = false;
  root.add(himG, herG, giantG);
  const giantDust = createEmitter({ count: 220, colors: ["#4a4a52", "#232328"], size: 0.55, life: 2.6, spread: new THREE.Vector3(2.2, 0.25, 2.2), velocity: new THREE.Vector3(0, 1.6, 0), jitter: 2.6, gravity: -2.2, additive: false, loop: false });
  const hitDust = createEmitter({ count: 150, colors: ["#55555c", "#26262b"], size: 0.34, life: 2.0, spread: new THREE.Vector3(0.8, 0.12, 0.8), velocity: new THREE.Vector3(0, 1.1, 0), jitter: 1.6, gravity: -2.0, additive: false, loop: false });
  root.add(giantDust.points, hitDust.points);

  const himAt = (dx: number, dy: number, dz: number) => () => relative(himG, dx, dy, dz);
  const herAt = (dx: number, dy: number, dz: number) => () => relative(herG, dx, dy, dz);
  const giantAt = (dx: number, dy: number, dz: number) => () => relative(giantG, dx, dy, dz);
  const boneAt = (g: THREE.Object3D, bone: string, dx = 0, dy = 0, dz = 0) => () => (g.getObjectByName(bone) ?? g).getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(dx, dy, dz));
  const Qat = (a: number, b: number, h: number) => () => Q(a, b).add(new THREE.Vector3(0, h, 0));
  /** İkisinin ortası; dx adamdan kadına bakan kameranın soluna, dz adamdan kadına dik yönde; irtifayı taşır. */
  const midAt = (dx: number, dy: number, dz: number) => () => {
    const mx = (himG.position.x + herG.position.x) / 2;
    const mz = (himG.position.z + herG.position.z) / 2;
    const my = (himG.position.y + herG.position.y) / 2;
    const yaw = Math.atan2(herG.position.x - himG.position.x, herG.position.z - himG.position.z);
    return new THREE.Vector3(mx + Math.cos(yaw) * dx + Math.sin(yaw) * dz, my + dy, mz - Math.sin(yaw) * dx + Math.cos(yaw) * dz);
  };
  const bodyMaterials = (g: THREE.Group): THREE.MeshStandardMaterial[] => {
    const out: THREE.MeshStandardMaterial[] = [];
    g.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh && !Array.isArray(mesh.material)) out.push(mesh.material as THREE.MeshStandardMaterial);
    });
    return out;
  };
  /** Gece tonu için gerçek dünya figürlerinin malzemeleri ve özgün renkleri (yüklenince bir kez toplanır). */
  let toned: { material: THREE.MeshStandardMaterial; base: THREE.Color }[] = [];
  const collectTones = () => {
    if (toned.length) return;
    const list = [...bodyMaterials(himG), ...bodyMaterials(herG), ...bodyMaterials(giantG)];
    if (list.length < 3) return;
    toned = list.map((material) => ({ material, base: material.color.clone() }));
  };
  const setTorsoClear = (clear: number) => {
    for (const material of bodyMaterials(himG)) {
      const want = clear > 0.01;
      if (material.transparent !== want) {
        material.transparent = want;
        material.needsUpdate = true;
      }
      material.opacity = 1 - clear * 0.6;
      material.depthWrite = !want;
    }
  };

  // --- Yıldız-gözler: uzaktan yalnız yıldız; yaklaşınca yıldızın içinden bir göz belirir. Yalnız üç tane. ------------
  interface StellarEye {
    mesh: THREE.Mesh;
    material: THREE.ShaderMaterial;
    size: number;
  }
  const eyes: StellarEye[] = [];
  const moonAz = Math.atan2(kit.moonDirection.x, kit.moonDirection.z);
  // Yerden bakınca da göz okunsun diye büyükler (150 m'de ~8°): dize gelince yerden bakan kameraya açılırlar.
  for (const [da, el, dist, size] of [[0.62, 0.72, 150, 22], [0.2, 0.9, 165, 20], [1.0, 0.55, 150, 19]] as const) {
    const a = moonAz + da;
    const pos = new THREE.Vector3(Math.sin(a) * Math.cos(el) * dist, Math.sin(el) * dist, Math.cos(a) * Math.cos(el) * dist).add(N_CENTER);
    const material = stellarEyeMaterial(random() * 10);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    mesh.position.copy(pos);
    mesh.visible = false;
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    root.add(mesh);
    eyes.push({ mesh, material, size });
  }
  /** Gözün önünde (çifte doğru) toward metre uzakta bir nokta. */
  const eyeAt = (index: number, toward = 0) => () => {
    const p = eyes[index].mesh.position.clone();
    if (toward) p.add(tmp3.copy(N_CENTER).setY(N_CENTER.y + 2).sub(p).normalize().multiplyScalar(toward));
    return p;
  };
  // Kapağın yazıları (gökteki başlık, yamaçtaki REDD) film boyunca gizlenir: ekranda yazı yok; klip bitince geri gelir.
  let worldTitle: THREE.Object3D[] = [];
  const coverTexts = () => (worldTitle.length ? worldTitle : (worldTitle = kit.scene.children.filter((o) => o.userData.coverText === true)));

  // --- Kalp: canlı → lifli → kat kat kâğıt; kat izi; yırtık tepeden aşağı iner; lifler tek tek kopar; iki yarı ----------
  const heart = new THREE.Group();
  const heartPaperMap = heartPaperTexture(random);
  const heartFiberMap = fiberTexture(random);
  const organicColor = new THREE.Color("#ffffff");
  const fibrousColor = new THREE.Color("#c9937e");
  const paperColor = new THREE.Color("#e2d8c0");
  const heartExtrude = { depth: 0.24, bevelEnabled: true, bevelThickness: 0.13, bevelSize: 0.09, bevelSegments: 8, curveSegments: 24 };
  const organMap = organTexture(random);
  const heartMaterial = () => new THREE.MeshStandardMaterial({ color: "#ffffff", map: organMap, roughness: 0.42, emissive: "#300810", emissiveIntensity: 0.25 });
  const halfL = new THREE.Mesh(new THREE.ExtrudeGeometry(heartHalfShape(-1), heartExtrude), heartMaterial());
  const halfR = new THREE.Mesh(new THREE.ExtrudeGeometry(heartHalfShape(1), heartExtrude), heartMaterial());
  // Yarılar alt uçtan menteşeli: yırtık önce tepede açılır, aşağı doğru ilerler.
  const hingeL = new THREE.Group();
  const hingeR = new THREE.Group();
  hingeL.position.y = -0.5;
  hingeR.position.y = -0.5;
  for (const [half, hinge] of [[halfL, hingeL], [halfR, hingeR]] as const) {
    half.geometry.translate(0, 0.5, -heartExtrude.depth / 2);
    hinge.add(half);
    heart.add(hinge);
  }
  // Kat izi: ortadan geçen ince, koyulaşan bir çizgi; yırtık onun üstünden yürür.
  const creaseMaterial = new THREE.MeshBasicMaterial({ color: "#4a3824", transparent: true, opacity: 0, depthWrite: false });
  const crease = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.84), creaseMaterial);
  crease.position.set(0, -0.08, heartExtrude.depth / 2 + heartExtrude.bevelThickness + 0.004);
  heart.add(crease);
  heart.scale.setScalar(0.11);
  heart.visible = false;
  himG.add(heart);
  const fiberMaterial = new THREE.LineBasicMaterial({ color: "#e6dcc4", transparent: true, opacity: 0.95 });
  const fibers = Array.from({ length: 9 }, (_, i) => {
    const geometry = new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(9), 3));
    const line = new THREE.Line(geometry, fiberMaterial);
    line.visible = false;
    line.userData.y = 0.36 - i * 0.1;
    heart.add(line);
    return line;
  });
  const heldHalf = new THREE.Mesh(new THREE.ExtrudeGeometry(heartHalfShape(1), { ...heartExtrude, depth: 0.05, bevelThickness: 0.04, bevelSize: 0.04 }), new THREE.MeshStandardMaterial({ map: heartPaperMap, roughness: 1, color: paperColor }));
  heldHalf.geometry.translate(0, 0, -0.025);
  heldHalf.visible = false;
  root.add(heldHalf);

  // --- Kan: göğüste küçük yaralar (dokuya işlenir); gerçek damlalar yaradan ayrılır, boşlukta asılı kalır ya da ilk
  // hızlarıyla dünyaya doğru süzülür. ------------------------------------------------------------------------------
  const himPaint = createSkinPainter(himG);
  const herPaint = createSkinPainter(herG);
  const bloodMaterial = new THREE.MeshStandardMaterial({ color: "#5e0a12", roughness: 0.14, metalness: 0.05, emissive: "#1a0306", emissiveIntensity: 0.5 });
  const dropGeometry = new THREE.SphereGeometry(1, 16, 12);
  interface Droplet {
    birth: number;
    who: 0 | 1;
    v: THREE.Vector3;
    r: number;
    seed: number;
    until: number;
    mesh: THREE.Mesh;
  }
  const droplets: Droplet[] = [];
  const addDroplets = (from: number, to: number) => {
    for (const who of [0, 1] as const) {
      let t = from + random() * 0.8 + who * 0.45;
      while (t < to - 1) {
        const worldward = random() < 0.45;
        const speed = worldward ? 0.05 + random() * 0.08 : 0.006 + random() * 0.012;
        const v = new THREE.Vector3((random() - 0.5) * 0.6, worldward ? -1 : (random() - 0.5) * 0.6, (random() - 0.5) * 0.6).normalize().multiplyScalar(speed);
        const mesh = new THREE.Mesh(dropGeometry, bloodMaterial);
        mesh.visible = false;
        root.add(mesh);
        droplets.push({ birth: t, who, v, r: 0.0035 + random() * 0.004, seed: random() * 6, until: to, mesh });
        t += 0.7 + random() * 1.2;
      }
    }
  };
  addDroplets(95.9, L.interlude);
  addDroplets(196.2, 229.2);

  // --- Hava zerreleri: çiftin çevresinde dünyaya sabit, ince zerreler. Çift düşerken ya da yükselirken zerreler ters
  // yönde akar ve hız kadar uzayan izler bırakır: hareket kadrajda okunur (yavaşken soluk birer nokta). -------------
  const STREAKS = 520;
  const STREAK_BOX = 16;
  const streakAnchors = new Float32Array(STREAKS * 3);
  for (let i = 0; i < STREAKS * 3; i += 1) streakAnchors[i] = (random() * 2 - 1) * STREAK_BOX;
  const streakPos = new Float32Array(STREAKS * 6);
  const streakCol = new Float32Array(STREAKS * 8);
  const streakGeometry = new THREE.BufferGeometry();
  streakGeometry.setAttribute("position", new THREE.BufferAttribute(streakPos, 3).setUsage(THREE.DynamicDrawUsage));
  streakGeometry.setAttribute("color", new THREE.BufferAttribute(streakCol, 4).setUsage(THREE.DynamicDrawUsage));
  const streakCenter = new THREE.Vector3();
  const streaks = new THREE.LineSegments(streakGeometry, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, fog: false }));
  streaks.frustumCulled = false;
  streaks.visible = false;
  root.add(streaks);
  const updateStreaks = (c: THREE.Vector3, vy: number, show: number) => {
    streaks.visible = show > 0.01;
    if (!streaks.visible) return;
    const wrap = STREAK_BOX * 2;
    const speed = Math.abs(vy);
    const len = THREE.MathUtils.clamp(speed * 0.07, 0.03, 4.5) * Math.sign(vy || 1);
    const bright = (0.16 + 0.55 * smooth((speed - 2) / 14)) * show;
    const cam = kit.camera.position;
    for (let i = 0; i < STREAKS; i += 1) {
      let x = streakAnchors[i * 3];
      let y = streakAnchors[i * 3 + 1];
      let z = streakAnchors[i * 3 + 2];
      x += Math.round((c.x - x) / wrap) * wrap;
      y += Math.round((c.y - y) / wrap) * wrap;
      z += Math.round((c.z - z) / wrap) * wrap;
      const near = 1 - smooth((Math.hypot(x - cam.x, y - cam.y, z - cam.z) - 5) / 20);
      const o = i * 6;
      streakPos[o] = x;
      streakPos[o + 1] = y;
      streakPos[o + 2] = z;
      streakPos[o + 3] = x;
      streakPos[o + 4] = y + len;
      streakPos[o + 5] = z;
      const a = bright * (0.2 + 0.8 * near);
      const q = i * 8;
      streakCol[q] = streakCol[q + 4] = 0.84;
      streakCol[q + 1] = streakCol[q + 5] = 0.88;
      streakCol[q + 2] = streakCol[q + 6] = 0.97;
      streakCol[q + 3] = a;
      streakCol[q + 7] = 0;
    }
    streakGeometry.attributes.position.needsUpdate = true;
    streakGeometry.attributes.color.needsUpdate = true;
  };
  // Son damlalar: biri adamın, biri kadının kalbinden; birbirine doğru gider, birleşir; birleşik damla izlenir.
  const finalA = new THREE.Mesh(dropGeometry, bloodMaterial);
  const finalB = new THREE.Mesh(dropGeometry, bloodMaterial);
  const merged = new THREE.Mesh(dropGeometry, bloodMaterial);
  finalA.visible = finalB.visible = merged.visible = false;
  root.add(finalA, finalB, merged);
  const FINAL_A = 229.6;
  const FINAL_B = 229.9;
  const MERGE_AT = 232.6;
  const mergedAt = () => merged.position.clone();

  // --- Kâğıt / kumaş geçişleri: kameraya yapışık bir doku katmanı (fotoğrafın içine giriş, sayfadan dünyaya çıkış,
  // elbiseden göğe, damladan fotoğrafa). Beyaz flaş değil: dokunun kendisi büyür. -----------------------------------
  const paperMap = fiberTexture(random);
  const clothMap = clothTexture(random);
  const overlayMaterial = new THREE.MeshBasicMaterial({ map: paperMap, transparent: true, opacity: 0, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  const overlay = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), overlayMaterial);
  overlay.position.z = -0.1;
  overlay.renderOrder = 1000;
  overlay.frustumCulled = false;
  overlay.visible = false;
  kit.camera.add(overlay);
  /** Geçişler: [içe başlangıç, tam örtü, dışa bitiş, doku, renk]. Lifler yaklaşır (ölçek büyür). */
  const CROSSINGS: [number, number, number, THREE.Texture, string][] = [
    [29.95, 30.7, 31.7, paperMap, "#e8dfc6"],
    [55.5, 56.12, 57.0, paperMap, "#e6ddc4"],
    [178.95, 179.55, 180.35, clothMap, "#dcdde2"],
    [237.7, 238.23, 238.95, paperMap, "#d9cfb6"],
  ];

  // --- Sayfadaki dövüş (tablolar): kamera gelmeden önce de sürüyor. ------------------------------------------------
  // 0–39,4: kısa, tekrarlayan saldırılar (koşar, vurur; dev savurur; geri kaçar, soluklanır). 39,85: asıl dövüş —
  // hücum; dev bir adım atar (kâğıt çöker); ilk savuruşun altından eğilir; bacağa vurur; dev eğilip onu gövdesinden
  // kavrar, kaldırır; çırpınır, tekmeyle kurtulur, düşer, yuvarlanır; yine saldırır; dev savurur, yarım kaçar; bir
  // kez daha; kesin darbe (50,32): geriye, cilde doğru savrulur. Kalkmaya çalışır, olmaz; başını fotoğrafa çevirir,
  // eli sayfanın kenarına uzanır, erişemez.
  const STANDOFF = [0.4, 6.9, 13.4, 19.9, 26.4, 32.9];
  for (const c of STANDOFF) {
    pm.keys.push(U(c, 6.0, 0), U(c + 0.9, 2.7, 0.2), U(c + 1.95, 2.7, 0.2), U(c + 2.55, 5.0, 0, undefined, "o"), U(c + 3.5, 6.0, 0));
    pm.poses.push([c, "move"], [c + 0.9, "punch"], [c + 1.95, "block"], [c + 2.6, "back"], [c + 3.5, "tired"]);
    pg.poses.push([c, "still"], [c + 1.35, "chop"], [c + 2.55, "still"]);
    pg.rates.push([c + 1.35, 0.8], [c + 2.55, 1]);
  }
  pm.keys.push(
    U(39.85, 6.0, 0),
    U(40.75, 3.4, 0.1),
    U(41.7, 3.4, 0.1),
    U(42.3, 3.0, 0.1),
    U(43.0, 3.0, 0.1, 0),
    U(43.5, 2.8, 0.1, 2.6, "s"),
    U(44.3, 2.7, 0.1, 3.4, "s"),
    U(44.35, 2.7, 0.1, 3.4, "i"),
    U(44.85, 3.9, 0.3, 0),
    U(44.9, 3.9, 0.3, 0, "o"),
    U(46.1, 5.3, 0.6),
    U(46.65, 3.1, 0.2),
    U(47.25, 3.1, 0.2, 0, "o"),
    U(47.75, 4.3, -0.2),
    U(48.3, 4.3, -0.2),
    U(48.8, 2.9, 0),
    U(50.32, 2.9, 0, 0, "a1.1"),
    U(51.2, 11.4, 0.1, 0, "o"),
    U(51.7, 12.6, 0.1),
  );
  pm.poses.push(
    [39.85, "move"],
    [40.75, "still"],
    [41.0, "tired"],
    [41.7, "hook"],
    [42.4, "hit"],
    [42.9, "fight"],
    [44.3, "hook"],
    [44.9, "roll"],
    [46.1, "move"],
    [46.65, "punch"],
    [47.25, "block"],
    [48.3, "move"],
    [48.8, "hook"],
    [49.45, "punch"],
    [50.32, "knockback"],
    [51.8, "rise"],
  );
  pm.rates.push([41.7, 0.75], [42.4, 1], [50.32, 0.55], [51.8, 0], [52.5, 0.45], [53.4, 0], [53.7, -0.75], [54.25, 0]);
  pm.looks.push([0, pg]);
  pg.keys.push(U(0, 0, 0), U(40.0, 0, 0), U(40.9, 1.3, 0));
  pg.poses.push([39.85, "still"], [40.0, "walk"], [40.9, "chop"], [42.15, "still"], [42.35, "tired"], [43.35, "still"], [46.8, "chop"], [47.9, "still"], [49.45, "chop"], [50.55, "still"]);
  pg.rates.push([40.0, 0.55], [40.9, 0.8], [42.15, 1], [46.8, 0.9], [47.9, 1], [49.45, 0.7], [50.55, 1]);
  pg.looks.push([0, pm]);
  /** Devin ayağının bastığı an ve yer (sayfa birimi): kâğıt çöker, biraz geri kabarır. */
  const STEP_AT = 40.85;
  const STEP_UV: [number, number] = [2.0, 0.55];

  // --- Gerçek dünya tabloları ----------------------------------------------------------------------------------
  const MATCH_Q = Q(4.2, 1.35);
  const BYPASS = Q(-7.9, -4.4);
  const WHOME = Q(-16, -0.4);
  const GHOME = Q(-8, 0.3);
  const G_OUT = Q(-62, 30);
  /** Kadının dövüş sırasında durduğu yer. */
  const W_FIGHT = Q(4.5, 1.8);
  him.keys.push(
    W(55.9, MATCH_Q),
    W(60.7, MATCH_Q),
    W(64.9, NH),
    W(76.9, NH),
    // Nakarat 1 (77–120) konumları ayrıca hesaplanır.
    K(120.03, -0.45, 0.3),
    K(133.2, -0.45, 0.3),
    K(134.6, 0.05, 0.05),
    K(157.3, 0.05, 0.05),
    K(158.4, 0.6, 1.4),
    K(158.55, 0.6, 1.4),
    // Hücum: devin bacağına (dev Ay tarafında, G_STOP'ta).
    K(159.65, 0.4, 7.0),
    K(161.2, 0.4, 7.0, 0),
    // Dev çömelip gövdesinden kavrar, doğrulurken kaldırır, omzunun üstünden ileri fırlatır.
    K(161.8, 0.45, 7.35, 3.6, "s"),
    K(162.05, 0.5, 7.6, 5.0, "s"),
    K(162.4, 0.6, 9.6, 7.8, "a1.2"),
    K(163.3, 1.5, 2.8, 0, "o"),
    K(164.6, 2.2, 1.6),
    K(165.7, 2.2, 1.6),
    // Yine koşar, vurur; dev bloklar. Devin arkasına dolanır, dizinin arkasına vurur; dev döner, vurur.
    K(166.9, 1.5, 7.0),
    K(167.45, 1.5, 7.0),
    K(167.85, 3.8, 9.2),
    K(168.2, 2.3, 11.2),
    K(169.1, 2.3, 11.2, 0, "a0.7"),
    K(169.7, 3.0, 14.8),
    K(170.9, 3.0, 14.8),
    // Tükenmiş: kadına doğru sendeler.
    W(172.6, DEATH),
  );
  him.poses.push(
    [55.9, "rise"],
    [58.9, "still"],
    [60.7, "move"],
    [64.9, "still"],
    [120.03, "still"],
    [133.2, "move"],
    [134.6, "still"],
    [140.3, "reach"],
    [144.0, "still"],
    [157.3, "move"],
    [158.55, "move"],
    [159.65, "hook"],
    [160.35, "hit"],
    [160.9, "fight"],
    [162.4, "knockback"],
    [163.35, "roll"],
    [164.6, "rise"],
    [165.7, "move"],
    [166.9, "punch"],
    [167.45, "move"],
    [168.2, "hook"],
    [169.1, "knockback"],
    [169.7, "rise"],
    [170.7, "tired"],
    [170.95, "walk"],
    [172.6, "still"],
    [172.8, "lie"],
    [179.8, "still"],
  );
  // Sayfadan çıkış: yerde yatıyor (kalkış klibinin ilk karesi), 57,4'te kalkar.
  him.rates.push([55.9, 0], [57.4, 1], [140.3, 1], [141.2, 0.18], [144.0, 1], [159.65, 0.8], [160.35, 1], [162.4, 0.7], [163.35, 1.15], [164.6, 1.36], [165.7, 1], [168.2, 0.9], [169.1, 0.7], [169.7, 1.5], [170.7, 0.8], [170.95, 1], [172.6, 1], [172.8, 0.45], [179.8, 1]);
  him.looks.push(
    [55.9, giant],
    [60.7, "path"],
    [64.9, moonYaw],
    [73.4, moonYaw + Math.PI],
    [120.03, her],
    [157.2, giant],
    [167.45, "path"],
    [168.2, giant],
    [170.7, her],
    [172.1, DEATH_YAW],
  );
  her.keys.push(
    W(55.9, WHOME),
    W(59.4, WHOME),
    W(64.3, BYPASS),
    W(70.0, NW),
    W(76.9, NW),
    K(120.03, 1.6, -0.25),
    K(139.0, 1.6, -0.25),
    K(139.9, 1.05, 0),
    K(157.5, 1.05, 0),
    W(158.7, W_FIGHT),
    [171.0, W_FIGHT.x, W_FIGHT.z, undefined, "o"],
    W(172.9, KNEEL),
  );
  her.poses.push([55.9, "still"], [59.4, "move"], [70.0, "still"], [120.03, "still"], [139.0, "move"], [139.9, "still"], [141.0, "offer"], [143.6, "still"], [156.1, "offer"], [157.5, "move"], [158.7, "still"], [171.0, "move"], [172.9, "still"], [173.3, "kneel"], [179.8, "still"]);
  her.rates.push([141.0, 1], [141.6, 0.25], [143.6, 1], [156.1, 1], [156.7, 0.25], [157.5, 1], [173.3, 1], [174.6, 0.25], [179.8, 1]);
  her.looks.push([55.9, him], [59.4, "path"], [70.0, moonYaw], [73.4, moonYaw + Math.PI], [120.03, him], [157.6, giant], [158.7, him], [171.0, "path"], [172.9, KNEEL_YAW]);
  giant.keys.push(W(55.9, GHOME), W(66.0, GHOME), W(80.0, G_OUT), W(120.03, G_FAR), W(150.5, G_FAR), W(158.6, G_STOP), W(171.3, G_STOP), W(178.8, G_EXIT), W(180.4, G_EXIT), W(187.5, G_GONE));
  giant.poses.push([55.9, "still"], [66.0, "move"], [80.0, "still"], [150.5, "move"], [158.6, "still"], [160.2, "tired"], [161.2, "still"], [161.95, "throw"], [163.3, "still"], [166.8, "block"], [168.0, "still"], [168.7, "chop"], [169.7, "still"], [171.3, "move"], [178.8, "still"], [180.4, "move"]);
  giant.rates.push([160.2, 1.3], [161.2, 0.8], [161.95, 1], [168.7, 1], [169.7, 1]);
  giant.looks.push([55.9, him], [66.0, "path"], [80.0, him], [150.5, "path"], [158.6, him], [171.3, "path"]);

  // --- Nakaratlar: çift yerden yükselir; konumlar şarkının saniyesinin işlevi. ---------------------------------------
  /** Kumaştan göğe geçişin örtüsü: canlı çift bu anda ölüm yerinde, ayakta. */
  const REVEAL = 179.8;
  interface PairState {
    base: THREE.Vector3;
    axis: THREE.Vector3;
    alt: number;
    sep: number;
    man: THREE.Vector3;
    woman: THREE.Vector3;
    yawM: number;
    yawW: number;
    center: THREE.Vector3;
  }
  const pairState = (t: number, out?: PairState): PairState | null => {
    const first = t >= ASCENT1 && t < L.interlude;
    const second = t >= REVEAL && t < L.end;
    if (!first && !second) return null;
    const base = first ? N_CENTER : D2;
    const axis = first ? MR : C2;
    const alt = first ? ascent(t, ASCENT1, ALT1) : ascent(t, ASCENT2, ALT2);
    const sep = first ? 1.0 - 0.28 * smooth((t - 84) / 6) : 0.8 - 0.1 * smooth((t - 186) / 5);
    const s = out ?? { base: new THREE.Vector3(), axis: new THREE.Vector3(), alt: 0, sep: 0, man: new THREE.Vector3(), woman: new THREE.Vector3(), yawM: 0, yawW: 0, center: new THREE.Vector3() };
    s.base.copy(base);
    s.axis.copy(axis);
    s.alt = alt;
    s.sep = sep;
    const mx = base.x - axis.x * sep * 0.5;
    const mz = base.z - axis.z * sep * 0.5;
    const wx = base.x + axis.x * sep * 0.5;
    const wz = base.z + axis.z * sep * 0.5;
    s.man.set(mx, ground(mx, mz) + alt, mz);
    s.woman.set(wx, ground(wx, wz) + alt, wz);
    s.center.copy(s.man).add(s.woman).multiplyScalar(0.5);
    const faceM = Math.atan2(axis.x, axis.z);
    // İlk yükselişte kameraya dönük başlarlar (fotoğraf kompozisyonu), yükselirken birbirlerine dönerler.
    const turn = first ? smooth((t - ASCENT1 - 1.6) / 4.5) : 1;
    const front = moonYaw + Math.PI;
    const lerpYaw = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
    s.yawM = lerpYaw(front, faceM, turn);
    s.yawW = lerpYaw(front, faceM + Math.PI, turn);
    return s;
  };
  const pairTmp = pairState(ASCENT1)!;
  const pairTmp2 = pairState(ASCENT1)!;
  /** Çiftin göğüs ortası (uzay çekimleri bakar). */
  const pairCenter = (t: number, out = new THREE.Vector3()) => {
    const s = pairState(t, pairTmp);
    return s ? out.copy(s.center).add(tmp.set(0, 1.28, 0)) : out.copy(midAt(0, 1.28, 0)());
  };
  const pairTmp3 = pairState(ASCENT1)!;
  /** Çiftin dikey hızı (m/s): düşüşte eksi, yükselişte artı. */
  const climbRate = (t: number) => {
    const a = pairState(t - 0.05, pairTmp3)?.alt ?? 0;
    const b = pairState(t + 0.05, pairTmp3)?.alt ?? 0;
    return (b - a) / 0.1;
  };
  /** Kalbin dünya konumu (t anında): who 0 adam, 1 kadın. */
  const chestOf = (who: 0 | 1, t: number, out: THREE.Vector3) => {
    const s = pairState(t, pairTmp2);
    if (!s) return out.copy((who ? herG : himG).position).add(tmp.set(0, who ? 1.24 : 1.33, 0));
    const p = who ? s.woman : s.man;
    const yaw = who ? s.yawW : s.yawM;
    return out.set(p.x + Math.sin(yaw) * 0.12 + Math.cos(yaw) * (who ? -0.04 : 0.05), p.y + (who ? 1.24 : 1.33), p.z + Math.cos(yaw) * 0.12 - Math.sin(yaw) * (who ? -0.04 : 0.05));
  };
  /** Ağırlıksızlık: yerde 0, yükseklik arttıkça 1 (kollar süzülür, beden hafifçe salınır). */
  const weightless = (alt: number) => smooth((alt - 20) / 220);
  /** Kanama seviyesi: yaralar yaklaşınca açılır; nakarat biterken silinir. */
  const bleedLevel = (t: number) => {
    if (t >= 95.2 && t < L.interlude) return smooth((t - 95.2) / 5);
    if (t >= 195.2 && t < L.end) return smooth((t - 195.2) / 5);
    return 0;
  };

  // --- Kamera yardımcıları -------------------------------------------------------------------------------------------
  const span = (a: number, b: number) => THREE.MathUtils.clamp((songNow - a) / (b - a), 0, 1);
  const DEATH_S = new THREE.Vector3(-DEATH_F.z, 0, DEATH_F.x);
  /** Ölüm yerine göre nokta: f deve bakış yönünde, s yanda (güney), h yerden. */
  const deathAt = (f: number, s: number, h: number) => () => {
    const x = DEATH.x + DEATH_F.x * f + DEATH_S.x * s;
    const z = DEATH.z + DEATH_F.z * f + DEATH_S.z * s;
    return new THREE.Vector3(x, ground(x, z) + h, z);
  };
  /** Kalbin dünya konumu (kalp çekimleri bakar). */
  const heartAt = () => heart.getWorldPosition(new THREE.Vector3());
  /**
   * Uzayda çiftin çevresinde küresel kamera: yükseliş açısı (derece), yan açı (derece; 0 = çiftin "önü"), uzaklık.
   * Ön, doğudaki harflere ve gökteki başlığa sırtını dönen taraftır: ilk nakaratta Ay tarafı, sonra ölüm yerinin doğusu.
   */
  const sph = (t: number, elev: number, az: number, d: number, out: THREE.Vector3) => {
    const s = pairState(t, pairTmp);
    const axis = s ? s.axis : MR;
    const front = t < L.interlude ? tmp2.copy(moonH) : tmp2.copy(DEATH_F).negate();
    const a = THREE.MathUtils.degToRad(az);
    const e = THREE.MathUtils.degToRad(elev);
    const dx = front.x * Math.cos(a) + axis.x * Math.sin(a);
    const dz = front.z * Math.cos(a) + axis.z * Math.sin(a);
    pairCenter(t, out);
    return out.add(tmp3.set(dx * Math.cos(e) * d, Math.sin(e) * d, dz * Math.cos(e) * d));
  };
  type Curve = (t: number) => [number, number, number];
  /** Uzay çekimi: parametreler [elev, az, d] çekim boyunca curve ile değişir; kamera çifte kilitli. */
  const orbitCam = (curve: Curve) => () => {
    const [e, a, d] = curve(songNow);
    return sph(songNow, e, a, d, new THREE.Vector3());
  };
  const centerLook = (dy = 0) => () => pairCenter(songNow).add(tmp.set(0, dy, 0));
  const lerp = THREE.MathUtils.lerp;
  const orbitShot = (at: number, curve: Curve, extra: Partial<Shot> = {}): Shot => ({ at, from: orbitCam(curve), to: orbitCam(curve), look: centerLook(), fov: 44, curve: "linear", grade: SPACE_GRADE, ...extra });
  /**
   * Geriden izleyen kamera: dayanak, çiftin t0'daki yeri ile şimdiki yeri arasında `follow` oranında (1 = kilitli),
   * üstüne [elev, az, d] açısı. follow < 1 iken çift kadrajda gerçekten yer değiştirir: düşerken aşağıya, dünyaya
   * doğru küçülür; yükselirken kameranın önünden yukarı fırlar. follow eğrisi zamanla 1'e çıkabilir (kesmesiz bağlanır).
   */
  const lagCam = (t0: number, follow: (t: number) => number, curve: Curve) => () => {
    const [e, a, d] = curve(songNow);
    const now = pairCenter(songNow, new THREE.Vector3());
    const off = sph(songNow, e, a, d, new THREE.Vector3()).sub(now);
    return pairCenter(t0, new THREE.Vector3()).lerp(now, follow(songNow)).add(off);
  };
  /**
   * Nakarat (1 ve 3): "düşüyorduk" — tepe noktasında kamera hemen üstlerinde; düşerken onları yarı hızla izler: ikisi
   * aşağıya, büyüyen dünyaya doğru küçülür. "Yükseliyorduk" — dipte tutulurlar ve yeniden fırlarlar: önce yandan ve
   * alttan (kameranın önünden yukarı, yıldızlara), sonra yukarıdan onlarla birlikte (zerreler hızla akar, dünya altta
   * küçülür). Sonra uzakta huzur, çok yavaş yaklaşma (siluet → beden → giysi → yüz → kalp).
   */
  const fallRiseShots = (tFall: number, tRise: number, tRise2: number, tHappy: number, tApproach: number, tClose: number): Shot[] => {
    const look = () => pairCenter(songNow);
    const fallCam = lagCam(tFall, () => 0.45, () => [52, 25, 6.5]);
    const riseCam = lagCam(tRise, () => 0.7, () => [-10, 65, 9]);
    const ride = (t: number) => lerp(0.96, 1, smooth((t - (tHappy - 1.2)) / 1.2));
    const pull = (t: number) => smooth((t - (tRise2 + 1.0)) / (tHappy - tRise2 - 1.0));
    const rideCam = lagCam(tRise2, ride, (t) => [lerp(60, 34, pull(t)), 40, lerp(11, 30, pull(t))]);
    return [
      { at: tFall, from: fallCam, to: fallCam, look, fov: 46, curve: "linear", grade: SPACE_GRADE },
      { at: tRise, from: riseCam, to: riseCam, look, fov: 50, curve: "linear", grade: SPACE_GRADE },
      { at: tRise2, from: rideCam, to: rideCam, look, fov: 46, curve: "linear", grade: SPACE_GRADE },
      orbitShot(tHappy, () => [lerp(34, 30, span(tHappy, tHappy + 2.4)), 40 + 2 * span(tHappy, tApproach), lerp(30, 60, smooth(span(tHappy, tHappy + 2.4))) + 3 * span(tHappy, tApproach)], { fov: 46, fovTo: 42 }),
      orbitShot(tApproach, () => {
        const k = smoother(span(tApproach, tClose));
        return [lerp(30, 10, k), lerp(42, 8, k), lerp(63, 2.7, Math.pow(k, 0.6))];
      }, { fov: 42, fovTo: 34, look: centerLook(-0.05) }),
    ];
  };
  /** Yakın plan: iki göğüs, iki yüz; kamera ağır ağır kayar. */
  const closeShot = (t0: number, t1: number): Shot =>
    orbitShot(t0, () => {
      const k = span(t0, t1);
      return [lerp(10, 6, k), lerp(8, 3, k), lerp(2.7, 2.3, k)];
    }, { fov: 34, fovTo: 32, look: centerLook(-0.05) });
  /**
   * Damlalar ve dünya birlikte: yandan ve yukarıdan; çift kadrajın üstünde, dünya altta. Bakış çiftin `drop · d`
   * altına iner (uzaklıkla orantılı): sabit metre yakında bakışı 30°'den fazla indirip çifti kadrajdan atıyordu.
   */
  const worldBelowShot = (t0: number, t1: number, elev0: number, elev1: number, d0: number, d1: number, drop: number): Shot =>
    orbitShot(t0, () => {
      const k = span(t0, t1);
      return [lerp(elev0, elev1, k), lerp(20, 34, k), lerp(d0, d1, k)];
    }, { fov: 44, look: () => pairCenter(songNow).add(tmp.set(0, -drop * lerp(d0, d1, span(t0, t1)), 0)) });
  /** Yerden kalkış (kutsal sıra): geniş plan, ayaklar yerde, ufuk görünür; topuklar, santimler, bir metre, metreler. */
  const liftoffShots = (t0: number, tFollow: number, tEnd: number, camAt: () => THREE.Vector3, lookAt: () => THREE.Vector3, back: () => THREE.Vector3, d0: number): Shot[] => {
    // Kamera onları biraz geriden izler (yükselişin hızı kadrajda okunur), sonuna doğru yakalar.
    const follow = () => {
      const k = smooth(span(tFollow, tEnd));
      const d = lerp(d0, 36, k);
      const base = pairCenter(tFollow, new THREE.Vector3()).lerp(pairCenter(songNow, new THREE.Vector3()), lerp(0.8, 1, smooth(span(tEnd - 1.0, tEnd))));
      return base.add(tmp.copy(back()).multiplyScalar(d)).add(tmp2.set(0, d * 0.12, 0));
    };
    const followLook = () => {
      const k = smooth(span(tFollow, tEnd));
      return pairCenter(songNow).add(tmp.set(0, -lerp(d0, 36, k) * 0.33, 0));
    };
    const tilt = () => lookAt().lerp(pairCenter(songNow), smooth((songNow - tFollow + 1.2) / 1.2));
    return [
      { at: t0, from: camAt, to: camAt, look: tilt, fov: 50, curve: "linear", grade: NIGHT_GRADE },
      { at: tFollow, from: follow, to: follow, look: followLook, fov: 50, fovTo: 54, curve: "linear", grade: NIGHT_GRADE },
    ];
  };
  const backCh1 = () => new THREE.Vector3().copy(moonH);
  const backCh2 = () => new THREE.Vector3().copy(DEATH_F).negate();

  // Kamera kimsenin içine girmez: gerçek dünyadaki çekim konumları figürlerin kapsüllerinin dışına itilir.
  const clearCam = (p: THREE.Vector3): THREE.Vector3 => {
    const bodies: [THREE.Group, number, number][] = [
      [himG, 0.42, 1.95],
      [herG, 0.4, 1.85],
      [giantG, 3.0, 13.6],
    ];
    for (const [g, r, h] of bodies) {
      if (!g.visible) continue;
      const base = g.position;
      if (p.y < base.y - 0.2 || p.y > base.y + h) continue;
      const dx = p.x - base.x;
      const dz = p.z - base.z;
      const d = Math.hypot(dx, dz);
      if (d >= r) continue;
      const ux = d > 1e-3 ? dx / d : Math.sin(g.rotation.y);
      const uz = d > 1e-3 ? dz / d : Math.cos(g.rotation.y);
      p.x = base.x + ux * (r + 0.02);
      p.z = base.z + uz * (r + 0.02);
    }
    const floor = ground(p.x, p.z) + 0.12;
    if (p.y < floor && p.y > floor - 30) p.y = floor;
    return p;
  };
  const clearPoint = (point: THREE.Vector3 | (() => THREE.Vector3)) => () => clearCam((typeof point === "function" ? point() : point).clone());
  const real = (list: Shot[]): Shot[] =>
    list.map((shot) => ({
      ...shot,
      from: shot.from ? clearPoint(shot.from) : shot.from,
      to: shot.to ? clearPoint(shot.to) : shot.to,
      path: shot.path?.map((p) => clearPoint(p)),
    }));
  const moonPoint = (from: () => THREE.Vector3) => () => from().addScaledVector(kit.moonDirection, 800);
  const moonCam = Qat(0.5, -6.5, 1.45);
  const photoLook = Qat(0.5, 0, 2.55);

  const shots: Shot[] = [
    // KİTAP: geniş üç çeyrek (okuyan adam, masa, açık kitap, krater); yavaş yaklaşma; iki sayfa ve dev birlikte okunur.
    { at: 0, from: bookAt(-1.5, 1.6, 2.2), to: bookAt(-1.0, 1.25, 1.5), look: bookAt(0.05, 0.3, 0.1), lookTo: bookAt(0.04, 0.2, 0.02), fov: 44, curve: "linear", grade: BOOK_GRADE, in: "fade" },
    { at: 8, from: bookAt(-0.62, 0.95, 0.95), to: bookAt(-0.45, 0.8, 0.72), look: bookAt(0.03, 0.14, -0.02), fov: 40, curve: "linear", grade: BOOK_GRADE },
    { at: 14, from: bookAt(-0.36, 0.62, 0.5), to: bookAt(-0.3, 0.55, 0.42), look: bookAt(0, 0.14, -0.02), fov: 44, curve: "linear", grade: BOOK_GRADE },
    // FOTOĞRAF: sol sayfaya; donuk; gözler bir kesir kayar; kâğıt dokusu belirir; saç kıpırdar; derinlik kazanır.
    { at: L.photo, from: bookAt(-0.3, 0.55, 0.42), to: photoAt(0.02, 0.22, 0.12), look: bookAt(-0.08, 0.1, 0.0), lookTo: photoAt(0, 0, 0), fov: 44, fovTo: 30, curve: "ease", grade: BOOK_GRADE },
    { at: 24.0, from: photoAt(0.02, 0.22, 0.12), to: photoAt(0.008, 0.15, 0.065), look: photoAt(0, 0, 0), fov: 30, fovTo: 28, curve: "linear", grade: BOOK_GRADE },
    { at: 27.0, from: photoAt(0.008, 0.15, 0.065), to: photoAt(0.016, 0.08, 0.022), look: photoAt(0, 0.005, 0), fov: 28, fovTo: 26, curve: "linear", grade: BOOK_GRADE },
    // Kamera fotoğrafın yüzeyini geçer: lifler büyür; kâğıt, sağ sayfadaki dünyanın zeminine döner.
    { at: 29.4, from: photoAt(0.016, 0.08, 0.022), to: photoAt(0.004, 0.012, 0.006), look: photoAt(0, 0.005, 0), fov: 26, fovTo: 22, curve: "linear", grade: BOOK_GRADE },
    // SAYFADAKİ DÖVÜŞ (kinetik; dev hep bütünüyle görünür; arkada soldaki sayfa ve fotoğraf): kâğıttan çıkış,
    // sayfanın kenarlarıyla geniş, hücum, yan yüksek (ölçek), kavrama (alçak), düşüş, yine saldırı, kesin darbe.
    { at: 30.7, from: pageAt(14, 1.2, 3.0), to: pageAt(19, 4.2, 5.6), look: pageAt(0.5, 5.0, 0.8), lookTo: pageAt(0.5, 5.6, 0.8), fov: 56, curve: "ease", grade: PAGE_GRADE },
    { at: 35.4, from: pageAt(16, 20, 14), to: pageAt(15, 19, 13), look: pageAt(0.5, 3.5, 0.5), fov: 50, curve: "linear", grade: PAGE_GRADE },
    { at: L.giant, from: pageAt(13, 6, 9), to: pageAt(11, 5.5, 8), look: pageAt(2, 5.5, 0), fov: 58, curve: "linear", grade: PAGE_GRADE },
    { at: 40.9, from: pageAt(3, 20, 20), to: pageAt(3.2, 19, 19), look: pageAt(2.5, 6.5, -0.5), fov: 54, curve: "linear", grade: PAGE_GRADE },
    { at: 42.3, from: pageAt(-3, 15, 12), to: pageAt(-2.6, 14.4, 11.4), look: pageAt(2.2, 3.5, -0.5), fov: 54, curve: "linear", grade: PAGE_GRADE },
    { at: 44.2, from: pageAt(15, 9, 9), to: pageAt(14, 8.5, 8.5), look: pageAt(1.5, 2.5, 0.5), fov: 52, curve: "linear", grade: PAGE_GRADE },
    { at: 46.0, from: pageAt(10, 2.6, 0.5), to: pageAt(9.6, 2.5, 0.8), look: pageAt(-2, 3.2, 1.0), fov: 56, curve: "linear", grade: PAGE_GRADE },
    { at: 47.9, from: pageAt(2, 18, 17), to: pageAt(2.2, 17, 16), look: pageAt(1.5, 4, 0), fov: 52, curve: "linear", grade: PAGE_GRADE },
    { at: 49.4, from: pageAt(8, 12, 15), to: pageAt(7.5, 11.5, 14), look: pageAt(-1.5, 3, 2), fov: 56, curve: "linear", grade: PAGE_GRADE },
    // SONRAKİ SAYFADAN ÖNCE: yerde, ikisi birden görünür; kalkmayı dener, olmaz; başı fotoğrafa döner; eli sayfanın
    // kenarına uzanır, erişemez.
    { at: 51.9, from: pageAt(-14, 16, 8), to: pageAt(-13.6, 15.5, 7.7), look: pageAt(-2, 2.5, 2.5), fov: 64, curve: "linear", grade: PAGE_GRADE },
    { at: 53.2, from: pageAt(-3.0, 3.6, 9.8), to: pageAt(-3.3, 3.4, 9.4), look: pageAt(-6.3, 0.4, 5.2), fov: 42, curve: "linear", grade: PAGE_GRADE },
    { at: 54.3, from: pageAt(-2.8, 2.4, 8.2), to: pageAt(-3.5, 2.1, 7.6), look: pageAt(-9.8, 0.3, 4.6), fov: 44, curve: "linear", grade: PAGE_GRADE },
    // Kamera düşmüş ele yaklaşır; parmak uçları sayfaya değer; kâğıt kadrajı doldurur.
    { at: 55.1, from: pageAt(-5.0, 1.6, 7.2), to: pmHandAt(1.1, 0.8, 0.9), look: pmHandAt(0, 0, 0), fov: 36, fovTo: 30, curve: "ease", grade: PAGE_GRADE },
    // GERÇEK DÜNYA: kâğıt büyür, aynı kadraj gerçek ölçekte; kamera elinden geri ve yukarı çekilir:
    // KAMERA → ADAM → DEV → KADIN.
    ...real([
      { at: 56.12, from: Qat(6.6, 1.7, 0.32), to: Qat(7.4, 2.0, 0.95), look: Qat(5.4, 1.45, 0.06), lookTo: Qat(3.6, 1.35, 0.45), fov: 30, fovTo: 38, curve: "ease", grade: DUSK },
      { at: 57.3, from: Qat(7.4, 2.0, 0.95), to: Qat(15.5, 2.6, 3.0), look: Qat(3.6, 1.35, 0.6), lookTo: Qat(-6, 0.3, 6.2), fov: 38, fovTo: 52, curve: "ease", grade: DUSK },
      // Tanıma: adam deve bakar, dev ona.
      { at: 58.95, from: himAt(-0.6, 1.2, -1.1), to: himAt(-0.55, 1.15, -1.0), look: giantAt(0, 11.4, 0.4), fov: 56, curve: "linear", grade: DUSK },
      // GECE: kamera ağır ağır göğe döner; sıradan yıldızlar. Sonra yaklaşır: birkaç yıldız göz olur.
      // Dizeden hemen önce göğe döner (dize gelince gökte zaten yıldızlar vardır).
      { at: 59.45, from: Qat(7.4, 2.4, 1.3), to: Qat(7.25, 2.3, 1.45), look: Qat(-6, 0.3, 6), lookTo: eyeAt(0), fov: 50, fovTo: 34, curve: "ease", grade: NIGHT_GRADE },
      // Dizede yıldızlar göz olur: üçü birden açılır, aşağı (adama) bakar; kamera ağır ağır birine yaklaşır.
      { at: 60.2, from: Qat(7.25, 2.3, 1.45), to: Qat(7.15, 2.25, 1.6), look: eyeAt(0), fov: 34, fovTo: 20, curve: "linear", grade: NIGHT_GRADE },
    ]),
    { at: 62.6, from: Qat(7.15, 2.25, 1.6), path: [() => Qat(7.15, 2.25, 1.6)().lerp(eyeAt(0)(), 0.35).add(new THREE.Vector3(0, -6, 0))], to: eyeAt(0, 100), look: eyeAt(0), fov: 20, fovTo: 40, curve: "ease", grade: NIGHT_GRADE },
    // Göz: yıldız irisi, gök derinliği, küçük bir gözbebeği; önce adama, sonra kadına, sonra başka yere bakar.
    { at: 66.6, from: eyeAt(0, 45), to: eyeAt(0, 38), look: eyeAt(0), fov: 40, fovTo: 38, curve: "linear", grade: NIGHT_GRADE },
    // Geri çekilir; gerçek Ay (hilal) görünür.
    { at: 69.1, from: eyeAt(0, 38), to: eyeAt(0, 115), look: eyeAt(0), lookTo: moonPoint(eyeAt(0, 115)), fov: 38, fovTo: 30, curve: "ease", grade: NIGHT_GRADE },
    // AY: tutulur; sonra ağır ağır aşağı: ikisi yan yana, arkaları dönük; Ay üstlerinde. Kameraya dönerler.
    { at: L.moon, from: moonCam, to: moonCam, look: moonPoint(moonCam), fov: 30, curve: "linear", grade: NIGHT_GRADE },
    { at: 72.4, from: moonCam, to: moonCam, look: moonPoint(moonCam), lookTo: photoLook, fov: 30, fovTo: 50, curve: "ease", grade: NIGHT_GRADE },
    // EKSİK FOTOĞRAF: simetrik kadraj (açılıştaki fotoğraf gibi); görüntünün kendisi ortadan, tepeden aşağı yırtılır;
    // sol yarı adam, sağ yarı kadın; yarılar biraz ayrılır, yavaşça yeniden birleşir.
    { at: 74.4, from: moonCam, to: moonCam, look: photoLook, fov: 50, curve: "linear", grade: NIGHT_GRADE, lens: "tear", lensAmount: 0, lensAmountTo: 1 },
    // YERDEN YÜKSELİŞ (1): aynı geniş kadraj; topuklar kalkar, birkaç santim, bekleme, bir metre, birkaç metre.
    ...liftoffShots(ASCENT1, 79.1, 80.96, moonCam, photoLook, backCh1, 6.6),
    // NAKARAT 1: uzaydan bakınca düşüş; dönüş; yükseliş; uzakta huzur; yaklaşma; kan.
    ...fallRiseShots(L.fall, L.rise, 87.6, L.happy, 93.3, 99.5),
    closeShot(99.5, L.love1),
    worldBelowShot(L.love1, L.love2, 28, 24, 3.6, 3.2, 0.14),
    worldBelowShot(L.love2, L.love3, 32, 28, 3.6, 3.4, 0.13),
    { ...worldBelowShot(L.love3, L.interlude, 20, 14, 4.4, 5.4, 0.13), out: "fade" },
    ...real([
      // ARA: yer; aynı gece; yakın ama uzak.
      { at: L.interlude, from: Qat(0.6, -6.4, 0.5), to: Qat(0.6, -5.6, 0.6), look: Qat(0.6, 0, 1.05), fov: 44, curve: "linear", grade: NIGHT_GRADE, in: "fade" },
      { at: 126.0, from: Qat(0.55, 5.2, 1.5), to: Qat(0.6, 4.6, 1.45), look: Qat(0.55, 0, 1.35), fov: 38, curve: "linear", grade: NIGHT_GRADE },
      { at: 131.5, from: herAt(0.75, 1.75, -1.6), to: herAt(0.7, 1.72, -1.45), look: himAt(0, 1.45, 0), fov: 34, curve: "linear", grade: NIGHT_GRADE },
      { at: 135.8, from: Qat(3.6, -4.2, 1.3), to: Qat(2.6, -4.6, 1.3), look: Qat(0.4, 0, 1.25), fov: 36, curve: "linear", grade: NIGHT_GRADE },
      { at: 138.6, from: Qat(0.55, -3.4, 1.3), to: Qat(0.55, -3.0, 1.25), look: Qat(0.55, 0, 1.2), fov: 34, curve: "linear", grade: NIGHT_GRADE },
      // ÖZLEMEK: eller; sonra kamera göğsüne yaklaşır.
      { at: L.miss, from: Qat(0.55, -1.95, 1.1), to: Qat(0.55, -1.75, 1.1), look: Qat(0.55, 0, 1.05), fov: 32, curve: "linear", grade: NIGHT_GRADE },
      { at: 143.2, from: Qat(0.3, -1.6, 1.3), to: himAt(0.42, 1.3, 0.62), look: Qat(0.5, 0, 1.2), lookTo: himAt(0, 1.28, 0.14), fov: 32, fovTo: 30, curve: "ease", grade: NIGHT_GRADE },
      // KALP: atar, atar, atar; lifli; kat kat kâğıt; bir kez atar; kat izi; yırtık; lifler tek tek kopar; iki yarı.
      { at: 145.0, from: himAt(0.36, 1.3, 0.62), to: himAt(0.32, 1.29, 0.56), look: heartAt, fov: 28, curve: "linear", grade: NIGHT_GRADE },
      { at: 149.6, from: himAt(0.32, 1.29, 0.56), to: himAt(0.3, 1.31, 0.5), look: heartAt, fov: 28, fovTo: 26, curve: "linear", grade: NIGHT_GRADE },
      // Yırtık: tepeden aşağı ağır ağır; lifler tek tek kopar; yarılar ayrılırken kamera biraz geri çekilir.
      { at: 152.8, from: himAt(0.3, 1.31, 0.5), to: himAt(0.46, 1.32, 0.74), look: heartAt, fov: 26, fovTo: 32, curve: "linear", grade: NIGHT_GRADE },
      // Yarı kadına süzülür; uzanır, dokunur, gülümsemez; kâğıt eline doğru hafifçe bükülür.
      { at: HALF_FREE, from: Qat(0.55, -2.4, 1.3), to: Qat(0.55, -2.15, 1.28), look: Qat(0.55, 0, 1.25), lookTo: Qat(0.85, 0, 1.25), fov: 32, fovTo: 30, curve: "linear", grade: NIGHT_GRADE },
      // DEV (A: geniş coğrafya — adam, kadın; dev Ay tarafından geliyor).
      { at: 157.6, from: Qat(9, -4, 3.5), to: Qat(8.6, -3.7, 3.4), look: Qat(0.5, 6, 4.5), fov: 52, curve: "linear", grade: NIGHT_GRADE },
      // B: adam yaklaşırken orta takip.
      { at: 158.4, from: himAt(1.1, 1.6, -2.4), to: himAt(1.1, 1.6, -2.4), look: giantAt(0, 2.2, 0), fov: 56, curve: "linear", grade: NIGHT_GRADE },
      // C: yan profil, ölçek farkı (bacağa saldırı; dev çömelip kavrar, kaldırır).
      { at: 159.65, from: Qat(14, 7.6, 3.6), to: Qat(13.4, 8.2, 3.8), look: Qat(0.6, 8.0, 5.2), fov: 54, curve: "linear", grade: NIGHT_GRADE },
      // D: darbe sırasında geniş, bütün bedenler (fırlatma, yere çarpma, toz).
      { at: 161.9, from: Qat(15, 6, 5), to: Qat(14.4, 5.6, 5), look: Qat(1.0, 5.8, 4), fov: 56, curve: "linear", grade: NIGHT_GRADE },
      // E: adamın nefesi, yakın (yerde, yuvarlanır, kalkar).
      { at: 163.9, from: Qat(4.2, 2.0, 1.2), to: Qat(4.0, 1.9, 1.5), look: himAt(0, 1.0, 0), lookTo: himAt(0, 1.5, 0), fov: 36, curve: "ease", grade: NIGHT_GRADE },
      // G: yeniden saldırırken takip; yumruk; dev bloklar.
      { at: 165.7, from: himAt(1.3, 1.7, -2.4), to: himAt(1.3, 1.7, -2.4), look: giantAt(0, 2.2, 0), fov: 56, curve: "linear", grade: NIGHT_GRADE },
      // Başka açıdan: devin arkasına dolanır, dizinin arkasına vurur.
      { at: 167.45, from: Qat(12, 12.5, 2.2), to: Qat(11.6, 12.0, 2.2), look: Qat(1.5, 10.0, 3.4), fov: 52, curve: "linear", grade: NIGHT_GRADE },
      // H: son darbeden sonra geniş (dev döner, vurur; düşer, yine kalkar).
      { at: 168.9, from: Qat(14, 14, 4.2), to: Qat(13.4, 13.6, 4.0), look: Qat(1.8, 12.5, 3.0), fov: 54, curve: "linear", grade: NIGHT_GRADE },
      // F: yumruklarını indirir; kadına bakar; dev aralarında (kamera → adam → dev → kadın).
      { at: 170.3, from: Qat(3.6, 21, 2.2), to: Qat(3.4, 20.4, 2.1), look: Qat(1.6, 4, 3.8), fov: 50, curve: "linear", grade: NIGHT_GRADE },
      // KOLLARINDA: kadın koşar; adam ona sendeler; giden deve son kez bakar; dizleri çözülür; kadın tutar.
      { at: 171.6, from: Qat(10, 16, 1.7), to: Qat(9.6, 15.4, 1.6), look: Qat(3.0, 13.2, 1.1), fov: 46, curve: "linear", grade: NIGHT_GRADE },
      { at: 173.4, from: deathAt(-0.3, 3.0, 1.35), to: deathAt(-0.35, 2.7, 1.2), look: deathAt(-0.45, 0, 0.6), fov: 42, curve: "linear", grade: NIGHT_GRADE },
      // Başı onda; ona bakar; bir nefes, daha küçük bir nefes, sonra hiç.
      { at: 175.8, from: deathAt(-0.3, 1.15, 1.0), to: deathAt(-0.35, 1.05, 0.95), look: deathAt(-0.85, 0, 0.6), fov: 34, curve: "linear", grade: NIGHT_GRADE },
      // ÖLÜMÜ TUT: kadın onu tutar; dev çok uzakta, hâlâ orada.
      { at: 177.4, from: deathAt(-5, 4, 2.6), to: deathAt(-4.7, 3.8, 2.5), look: deathAt(10, -1, 0.5), fov: 56, curve: "linear", grade: NIGHT_GRADE },
      // Kamera yükselir; beyaz elbisesi kadrajı doldurur; kumaş gök olur.
      { at: 178.9, from: deathAt(-0.6, 1.9, 1.75), to: deathAt(-0.62, -0.18, 1.02), look: deathAt(-0.62, -0.7, 0.86), fov: 40, fovTo: 24, curve: "ease", grade: NIGHT_GRADE },
    ]),
    // Gök → aynı dünyanın göğü → aşağı: ikisi canlı, aynı yerde, ayakta. YERDEN YÜKSELİŞ (2).
    { at: 179.8, from: deathAt(-11.5, 0, 1.35), to: deathAt(-11.5, 0, 1.35), look: deathAt(0, 0, 46), lookTo: deathAt(-0.45, 0, 2.05), fov: 50, curve: "ease", grade: NIGHT_GRADE },
    ...liftoffShots(181.1, 183.5, 189.4, deathAt(-11.5, 0, 1.35), deathAt(-0.45, 0, 2.05), backCh2, 11.5),
    // Uzakta huzur; yaklaşma; kan.
    orbitShot(189.4, () => [lerp(7, 28, smooth(span(189.4, L.happy2))), 0, lerp(36, 60, smooth(span(189.4, L.happy2)))], { fov: 46, fovTo: 42 }),
    orbitShot(L.happy2, () => [28, 2 * span(L.happy2, 193.2), 60 + 3 * span(L.happy2, 193.2)], { fov: 42 }),
    orbitShot(193.2, () => {
      const k = smoother(span(193.2, 199.2));
      return [lerp(28, 10, k), lerp(2, 8, k), lerp(63, 2.7, Math.pow(k, 0.6))];
    }, { fov: 42, fovTo: 34, look: centerLook(-0.05) }),
    closeShot(199.2, L.fall3),
    // NAKARAT 3: aynı düşüş/dönüş/yükseliş cümlesi; sonra damlalar ve dünya; son damlalar birleşir.
    ...fallRiseShots(L.fall3, 205.5, 207.7, L.happy3, 213.3, 219.5),
    closeShot(219.5, L.love4),
    worldBelowShot(L.love4, L.love5, 28, 24, 3.6, 3.2, 0.14),
    // Son yakın plan: iki kalp bölgesi, sakin yüzler, birbirlerine bakarlar; iki damla birbirine gider, birleşir.
    orbitShot(L.love5, () => [4, 3, lerp(1.9, 1.6, span(L.love5, L.love6))], {
      fov: 36,
      fovTo: 32,
      look: () => chestOf(0, songNow, new THREE.Vector3()).lerp(chestOf(1, songNow, new THREE.Vector3()), 0.5).add(tmp.set(0, 0.12, 0)),
    }),
    // Birleşik damlayı izler; kameraya yaklaşır; fotoğraf kâğıdında koyu kırmızı bir leke olur.
    { at: L.love6, from: () => mergedAt().add(sph(songNow, 4, 3, 0.9, new THREE.Vector3()).sub(pairCenter(songNow))), to: () => mergedAt().add(sph(songNow, 2, 3, 0.16, new THREE.Vector3()).sub(pairCenter(songNow))), look: mergedAt, fov: 30, fovTo: 16, curve: "ease", grade: SPACE_GRADE },
    // KİTABA DÖNÜŞ: leke; geri çekilme; aynı kitap, aynı sayfalar; eli kitabın yanında; bakar; kamera uzaklaşır;
    // kitap kapanır; son karede siyah.
    { at: L.end, from: spotAt(0.022), to: photoAt(0.03, 0.12, 0.08), look: spotAt(0), lookTo: photoAt(0, 0, 0), fov: 12, fovTo: 26, curve: "ease", grade: END_GRADE },
    { at: 243, from: bookAt(-0.3, 0.55, 0.45), to: bookAt(-0.36, 0.62, 0.55), look: bookAt(0, 0.12, -0.02), fov: 42, curve: "linear", grade: END_GRADE },
    { at: 248.5, from: bookAt(0.3, 0.62, -0.85), to: bookAt(0.26, 0.58, -0.75), look: readerAt(0.05, 1.02, 0.25), fov: 40, curve: "linear", grade: END_GRADE },
    { at: 253.5, from: bookAt(0.5, 0.85, -1.3), to: bookAt(0.8, 1.2, -2.3), look: bookAt(0, 0.35, 0.3), fov: 42, curve: "linear", grade: END_GRADE },
    { at: 259.0, from: bookAt(0.9, 0.8, -1.1), to: bookAt(1.1, 0.9, -1.4), look: bookAt(0, 0.2, 0.1), fov: 40, curve: "linear", grade: END_GRADE },
  ];

  const interactables = [
    secretItem(kit, "kaniyorduk-kitap", (target) => target.copy(bookAt(0, 0.1, 0)()), {
      onFound: () => kit.sfx.cue("chime"),
      label: "Sayfanın kenarındaki notu oku",
      radius: 1.2,
      reach: 2.5,
      available: () => set.visible,
    }),
    gazeTarget({
      position: (target) => target.copy(kit.camera.position).addScaledVector(kit.moonDirection, 300),
      radius: 18,
      reach: 320,
      label: () => (songNow >= L.stars && songNow < ASCENT1 ? "Ayı tamamla" : null),
      use: () => {
        kit.effects.moonFull = 1;
        kit.sfx.cue("chime");
        kit.secrets.reveal("kaniyorduk-yarim-ay");
      },
    }),
  ];

  // --- Olaylar: toz, sarsıntı, ses — şarkı ileri akarken bir kez; geri sarınca yeniden kurulur. ----------------------
  const cues: [number, (time: number) => void][] = [
    [STEP_AT, (time) => {
      pageDust.origin.set(px(STEP_UV[0], STEP_UV[1]), 0.1, pz(STEP_UV[0], STEP_UV[1]));
      pageDust.burst(time);
      kit.sfx.cue("drop");
    }],
    [44.87, (time) => {
      pageDust.origin.set(px(3.9, 0.3), 0.1, pz(3.9, 0.3));
      pageDust.burst(time);
    }],
    [L.shot, () => kit.sfx.cue("hit")],
    [51.2, (time) => {
      pageDust.origin.set(px(11.6, 0.1), 0.1, pz(11.6, 0.1));
      pageDust.burst(time);
      kit.sfx.cue("drop");
    }],
    [159.9, () => kit.sfx.cue("hit")],
    [163.2, (time) => {
      giantDust.origin.copy(himG.position).add(tmp.set(0, 0.2, 0));
      giantDust.burst(time);
      kit.effects.shake = Math.max(kit.effects.shake, 0.32);
      kit.sfx.cue("hit");
    }],
    [167.0, () => kit.sfx.cue("hit")],
    [168.45, () => kit.sfx.cue("hit")],
    [169.1, (time) => {
      hitDust.origin.copy(himG.position).add(tmp.set(0, 0.15, 0));
      hitDust.burst(time);
      kit.effects.shake = Math.max(kit.effects.shake, 0.2);
    }],
    [259.9, () => kit.sfx.cue("place")],
  ];
  let cueT = -1;
  const runCues = (t: number, time: number) => {
    if (t < cueT - 0.3 || t - cueT > 1.5) {
      cueT = t;
      return;
    }
    for (const [at, run] of cues) if (cueT < at && at <= t) run(time);
    cueT = t;
  };

  // --- Durum yardımcıları ------------------------------------------------------------------------------------------
  let dentDrawn = -1;
  /** Devin adımı: kâğıt ayağın altında çöker, biraz geri kabarır (iz kalır). */
  const applyDent = (t: number) => {
    const amount = t < STEP_AT - 0.1 ? 0 : 0.22 * smooth((t - STEP_AT + 0.1) / 0.12) - 0.13 * smooth((t - STEP_AT - 0.25) / 1.3);
    if (Math.abs(amount - dentDrawn) < 1e-4) return;
    dentDrawn = amount;
    const pos = rightPageGeometry.attributes.position as THREE.BufferAttribute;
    const fx = px(STEP_UV[0], STEP_UV[1]);
    const fz = pz(STEP_UV[0], STEP_UV[1]);
    for (let i = 0; i < pos.count; i += 1) {
      const x = rightPageBase[i * 3] / PAGE_SCALE;
      const z = -rightPageBase[i * 3 + 1] / PAGE_SCALE;
      const d = Math.hypot(x - fx, z - fz);
      const k = d < 2.2 ? Math.pow(Math.cos((d / 2.2) * Math.PI * 0.5), 2) : 0;
      pos.setZ(i, rightPageBase[i * 3 + 2] - amount * k * PAGE_SCALE);
    }
    pos.needsUpdate = true;
    rightPageGeometry.computeVertexNormals();
  };
  const lidAngle = (t: number) => (t < 259.8 ? Math.PI : Math.PI * (1 - smoother((t - 259.8) / 2.6)));
  interface Wound {
    fx: number;
    fy: number;
    size: number;
  }
  const WOUNDS: Wound[][] = [
    [{ fx: 0.03, fy: 0.742, size: 1 }, { fx: 0.055, fy: 0.728, size: 0.65 }, { fx: 0.014, fy: 0.757, size: 0.5 }],
    [{ fx: 0.032, fy: 0.745, size: 1 }, { fx: 0.052, fy: 0.73, size: 0.6 }],
  ];
  const painted = [-1, -1];
  const paintWounds = (index: 0 | 1, level: number) => {
    const painter = index ? herPaint : himPaint;
    if (!painter.prepare()) return;
    const bucket = Math.round(level * 24);
    if (bucket === painted[index]) return;
    painted[index] = bucket;
    if (bucket === 0) {
      painter.paint(null);
      return;
    }
    const k = bucket / 24;
    painter.paint((g) => {
      for (const w of WOUNDS[index]) {
        const s = painter.sample(w.fx, w.fy);
        const below = painter.sample(w.fx, w.fy - 0.03);
        if (!s) continue;
        const r = painter.metre * (0.006 + 0.012 * k) * w.size;
        const grad = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
        grad.addColorStop(0, "rgba(58,4,9,0.95)");
        grad.addColorStop(0.45, "rgba(104,10,18,0.75)");
        grad.addColorStop(1, "rgba(130,20,26,0)");
        g.fillStyle = grad;
        g.beginPath();
        g.arc(s.x, s.y, r, 0, Math.PI * 2);
        g.fill();
        if (below && k > 0.3) {
          // Kumaşa sızan ince bir iz, aşağı doğru.
          const len = (k - 0.3) * 1.2;
          g.strokeStyle = "rgba(96,8,16,0.55)";
          g.lineWidth = Math.max(1, r * 0.28);
          g.lineCap = "round";
          g.beginPath();
          g.moveTo(s.x, s.y);
          g.lineTo(s.x + (below.x - s.x) * len, s.y + (below.y - s.y) * len);
          g.stroke();
        }
      }
    });
  };
  const dA = new THREE.Vector3();
  const dB = new THREE.Vector3();
  const dC = new THREE.Vector3();
  const pairLive = pairState(ASCENT1)!;
  const hideDrops = () => {
    for (const d of droplets) d.mesh.visible = false;
    finalA.visible = finalB.visible = merged.visible = false;
  };
  /** Damlanın konumu: doğduğu andaki yara + çiftin o zamandan beri aldığı yol (eylemsizlik) + kendi hızı. */
  const dropPosition = (d: Droplet, t: number, out: THREE.Vector3) => {
    chestOf(d.who, d.birth, out);
    pairCenter(t, dA);
    pairCenter(d.birth, dB);
    return out.add(dA.sub(dB)).addScaledVector(d.v, t - d.birth);
  };
  /** Çiftin çerçevesinde göreli nokta (son damlalar). */
  const relChest = (who: 0 | 1, t: number, out: THREE.Vector3) => chestOf(who, t, out).sub(pairCenter(t, dC));
  const clearHeart = () => {
    heart.visible = false;
    halfR.visible = true;
    heldHalf.visible = false;
    setTorsoClear(0);
    for (const f of fibers) f.visible = false;
  };
  const restoreWorld = () => {
    streaks.visible = false;
    const e = kit.effects;
    e.daylight = 0;
    e.dim = 0;
    e.fog = 1;
    e.space = 0;
    e.groundLight = 0;
    e.crescent = 0;
    e.dust = 1;
    overlay.visible = false;
    if (kit.camera.near !== baseNear) {
      kit.camera.near = baseNear;
      kit.camera.updateProjectionMatrix();
    }
  };
  const pulse = (t: number, at: number, width = 0.32) => {
    const k = (t - at) / width;
    return k < 0 || k > 1 ? 0 : Math.sin(k * Math.PI) ** 2;
  };
  // Göz 0'ın bakışı: kameraya; adama; kadına; başka yere.
  const EYE_LOOK: [number, number, number][] = [
    [0, 0, -0.12],
    // Açılınca aşağı, adama bakar; sonra kadına.
    [60.3, -0.25, -0.55],
    [62.2, 0.3, -0.5],
    [64.2, 0, -0.12],
    [66.9, -0.42, -0.5],
    [67.8, 0.42, -0.5],
    [68.6, 0.78, 0.32],
  ];
  const eyeLookAt = (t: number, out: THREE.Vector2) => {
    let i = 0;
    while (i < EYE_LOOK.length - 1 && EYE_LOOK[i + 1][0] <= t) i += 1;
    const [t0, x0, y0] = EYE_LOOK[i];
    const prev = EYE_LOOK[Math.max(0, i - 1)];
    const k = smooth((t - t0) / 0.45);
    return out.set(lerp(prev[1], x0, i ? k : 1), lerp(prev[2], y0, i ? k : 1));
  };
  const eyeLook = new THREE.Vector2();

  const scene: SongScene = {
    root,
    hint: "Kanıyorduk bir kısa film: masadaki açık kitapla başlar. Serbest dolaşırken göğe bak, eksik ayı tamamla.",
    interactables,
    colliders: [],
    beats: [
      { at: 0, id: "book", line: "Kitap baştan açık: solda eğri, yıpranmış fotoğraf; sağda sürmekte olan minyatür dövüş." },
      { at: L.photo, id: "photo", line: "Sol sayfaya yaklaşma; fotoğraf donuk; gözler bir kesir kayar; saç kıpırdar; derinlik." },
      { at: L.face, id: "face", line: "Kamera fotoğrafın kâğıdını geçer; lifler sağ sayfadaki dünyanın zeminine döner." },
      { at: L.giant, id: "giant", line: "Sayfadaki asıl dövüş: hücum, çöken kâğıt, eğilme, vuruş, kavrama, kurtulma, yarım kaçış." },
      { at: L.shot, id: "shot", line: "Kesin darbe; cilde doğru savrulur; kalkamaz; eli sayfanın kenarına erişemez." },
      { at: LAND, id: "land", line: "Kâğıt büyür: gerçek dünya; kamera → adam → dev → kadın; tanıma." },
      { at: L.stars, id: "stars", line: "Gece; birkaç yıldız yakından göz olur; göz adama, kadına, sonra başka yere bakar." },
      { at: L.moon, id: "moon", line: "Hilal; ikisi yan yana; simetrik kadraj; görüntü ortadan yırtılır, birleşir; yerden yükseliş." },
      { at: L.fall, id: "fall", line: "Uzaydan bakınca düşüş: yalnız kamera uzaklaşır." },
      { at: L.rise, id: "rise", line: "Ağır dönüş: dünya kadrajın içinden alta geçer; aynı hareket yükseliştir." },
      { at: L.happy, id: "happy", line: "Çok uzakta, huzurlu iki siluet." },
      { at: L.bleed, id: "bleed", line: "Çok yavaş yaklaşma: küçük yaralar, gerçek damlalar." },
      { at: L.love1, id: "love1" },
      { at: L.love2, id: "love2" },
      { at: L.love3, id: "love3", line: "Dünyaya doğru giden bir damla." },
      { at: L.interlude, id: "interlude", line: "Yer; aynı gece; yakın ama uzak." },
      { at: L.miss, id: "miss", line: "Eller; kalp atar, liflenir, kâğıt olur." },
      { at: L.tear, id: "tear", line: "Kâğıt kalp yırtılır; lifler tek tek kopar; bir yarı kadına gider." },
      { at: L.fight, id: "fight", line: "Gerçek dünyada dövüş: bacak, kavrama, fırlatma, toz, yuvarlanma, yumruk, blok, darbe." },
      { at: L.arms, id: "arms", line: "Yumruklarını indirir; dev aralarında; kadının kollarında ölür." },
      { at: L.fall2, id: "fall2", line: "Kumaş göğe döner; canlı çift aynı yerde; yerden yükseliş." },
      { at: L.rise2, id: "rise2" },
      { at: L.happy2, id: "happy2" },
      { at: L.bleed2, id: "bleed2" },
      { at: L.fall3, id: "fall3", line: "Aynı düşüş/dönüş/yükseliş cümlesi." },
      { at: L.happy3, id: "happy3" },
      { at: L.love4, id: "love4" },
      { at: L.love5, id: "love5", line: "İki damla birbirine gider, birleşir." },
      { at: L.love6, id: "love6" },
      { at: L.end, id: "end", line: "Damla fotoğrafta bir leke; aynı kitap; eli yanında; kitap kapanır; son karede siyah." },
    ],
    shots,
    reset() {
      restoreWorld();
      set.visible = false;
      himG.visible = herG.visible = giantG.visible = false;
      clearHeart();
      hideDrops();
      for (const eye of eyes) eye.mesh.visible = false;
      for (const o of coverTexts()) o.visible = true;
      lid.rotation.z = Math.PI;
      pageWorld.scale.setScalar(PAGE_SCALE);
      (dropSpot.material as THREE.MeshBasicMaterial).opacity = 0;
      dentDrawn = -1;
      applyDent(0);
      painted[0] = painted[1] = -1;
      himPaint.paint(null);
      herPaint.paint(null);
      cueT = -1;
      for (const { material, base } of toned) material.color.copy(base);
      himG.scale.setScalar(him.baseScale);
      himG.rotation.x = himG.rotation.z = herG.rotation.x = herG.rotation.z = 0;
    },
    update(dt, time, level, songTime) {
      const t = songTime;
      songNow = t;
      if (t >= AUDIO_END + 0.05 || level < 0.02) {
        restoreWorld();
        for (const o of coverTexts()) o.visible = true;
        return;
      }
      for (const o of coverTexts()) o.visible = !kit.cinema();
      const cinema = kit.cinema();
      runCues(t, time);
      const e = kit.effects;
      const bookTime = t < 56.9 || t >= L.end;
      const s = pairState(t, pairLive);
      const alt = s ? s.alt : 0;

      // --- Portre: donuk; gözler bir kesir kayar; saç kıpırdar; pencere etkisiyle derinlik. Sonra yine donuk. ------
      if (portraitFigure.skinned && texturesReady(portraitFigure.group)) {
        const inside = t >= 24.2 && t < 31.8;
        const shift = inside ? smooth((t - 24.2) / 0.9) : 0;
        const live = inside ? smooth((t - 26) / 1.5) : 0;
        const depth = inside ? smooth((t - 27.5) / 1.5) : 0;
        const state = inside ? "live" : "still";
        const moving = inside && (live > 0 || depth > 0 || shift < 1);
        if (!portraitReady || moving || state !== portraitState) {
          if (state !== portraitState && state === "still") portraitReady = false;
          let ox = 0;
          let oy = 0;
          if (depth > 0 && cinema) {
            const local = photo.worldToLocal(tmp.copy(kit.camera.position));
            const h = Math.max(0.01, local.z);
            ox = THREE.MathUtils.clamp((local.x / h) * 0.8, -1, 1) * depth;
            oy = THREE.MathUtils.clamp((local.y / h) * 0.8, -1, 1) * depth;
          }
          renderPortrait(dt, shift, live, ox, oy);
          portraitState = state;
        }
      }

      // --- Dünya: gündüz (kitap), akşam (sayfadan çıkış), gece; yükseldikçe hava incelir, kubbe uzaya döner. -------
      e.daylight = (t < LAND ? 1 : t >= L.end ? 0.72 : 0.62 * (1 - smooth((t - LAND) / 4.8))) * level;
      e.dim = t >= AUDIO_END - 0.08 ? level : 0;
      e.crescent = t >= LAND && t < L.end ? level : 0;
      e.dust = 0.25;
      e.space = smooth((alt - 30) / 110) * level;
      e.groundLight = smooth((alt - 8) / 100) * 1.3 * level;
      e.fog = bookTime ? 1 : lerp(0.55, 0.06, smooth(alt / 60));
      const wantNear = cinema && bookTime ? 0.012 : baseNear;
      if (kit.camera.near !== wantNear) {
        kit.camera.near = wantNear;
        kit.camera.updateProjectionMatrix();
      }

      // --- Geçiş katmanı: kâğıt lifi / kumaş dokusu kadrajı doldurur, lifler yaklaşır. ---------------------------
      let cover = 0;
      let crossing: (typeof CROSSINGS)[number] | null = null;
      for (const c of CROSSINGS) {
        if (t < c[0] || t >= c[2]) continue;
        crossing = c;
        cover = t < c[1] ? smooth((t - c[0]) / (c[1] - c[0])) : 1 - smooth((t - c[1]) / (c[2] - c[1]));
      }
      // Son kare: sesle birlikte kesme (siyah).
      const black = t >= AUDIO_END - 0.08;
      overlay.visible = cinema && (cover > 0.002 || black);
      if (black) {
        if (overlayMaterial.map !== null) {
          overlayMaterial.map = null;
          overlayMaterial.needsUpdate = true;
        }
        overlayMaterial.color.set("#000000");
        overlayMaterial.opacity = 1;
        const h = 2 * 0.1 * Math.tan(THREE.MathUtils.degToRad(kit.camera.fov) / 2) * 1.1;
        overlay.scale.set(h * kit.camera.aspect * 1.1, h, 1);
      } else if (overlay.visible && crossing) {
        const map = crossing[3];
        if (overlayMaterial.map !== map) {
          overlayMaterial.map = map;
          overlayMaterial.needsUpdate = true;
        }
        overlayMaterial.color.set(crossing[4]);
        overlayMaterial.opacity = cover;
        const h = 2 * 0.1 * Math.tan(THREE.MathUtils.degToRad(kit.camera.fov) / 2) * 1.1;
        overlay.scale.set(h * kit.camera.aspect, h, 1);
        const zoom = 1 + 2.6 * smooth((t - crossing[0]) / (crossing[2] - crossing[0]));
        const k = 1.4 / zoom;
        map.repeat.set(k * kit.camera.aspect, k);
        map.offset.set(0.5 - (k * kit.camera.aspect) / 2, 0.5 - k / 2);
      }

      // --- Işık ---------------------------------------------------------------------------------------------------
      collectTones();
      const night = t >= 57.5 && !bookTime;
      const tone = (night ? NIGHT_TONE : 1) / (1 + 1.25 * e.groundLight);
      for (const { material, base } of toned) material.color.copy(base).multiplyScalar(tone);
      const key = kit.lights[0];
      const rim = kit.lights[1];
      if (key && rim) {
        if (bookTime) {
          key.color.set(t >= L.end ? "#f4efe8" : "#fff0d2");
          key.distance = 12;
          key.position.copy(book.localToWorld(tmp.set(-0.6, 1.6, 0.9)));
          key.intensity = (t >= L.end ? 1.5 : 3.0) * level;
          rim.color.set("#e6dccb");
          rim.distance = 9;
          rim.position.copy(book.localToWorld(tmp.set(0.9, 1.4, -0.8)));
          rim.intensity = (t >= L.end ? 0.45 : 0.9) * level;
        } else if (s && alt > 25) {
          // Uzay: güneş ve alttaki dünyanın yansıması; yüzler ve kan okunur.
          const c = pairCenter(t, tmp3);
          key.color.set("#fff1dc");
          key.distance = 400;
          key.position.copy(c).add(tmp.set(20, 90, 70));
          key.intensity = (3000 / Math.max(0.4, tone * 1.6)) * level;
          rim.color.set("#9fb2d8");
          rim.distance = 300;
          rim.position.copy(c).add(tmp.set(0, -60, 0));
          // Alttan dolgu: alçakta (düşüşün dibinde) zeminde mavi bir ışık havuzu bırakmasın.
          rim.intensity = 1300 * (0.3 + 0.7 * smooth((alt - 60) / 80)) * level;
        } else {
          // Gece: ay ışığı yandan; kameranın yanından yumuşak bir dolgu (yüzler kaybolmaz).
          const c = tmp3;
          if (s) pairCenter(t, c);
          else if (t < 120) c.copy(himG.position).add(tmp.set(0, 1.2, 0));
          else if (t < 157) c.copy(himG.position).add(herG.position).multiplyScalar(0.5).add(tmp.set(0, 1.2, 0));
          else if (t < 172) c.copy(himG.position).lerp(giantG.position, 0.3).add(tmp.set(0, 2.0, 0));
          else c.copy(DEATH).add(tmp.set(0, 0.8, 0));
          const toCam = tmp2.copy(kit.camera.position).sub(c).setY(0);
          if (toCam.lengthSq() < 1e-4) toCam.set(0, 0, 1);
          toCam.normalize();
          key.color.set(t < 60 ? "#ffe6cc" : "#d4ddf4");
          key.distance = 20;
          key.position.copy(c).addScaledVector(toCam, 5.0).add(tmp.set(0, 4.5, 0));
          key.intensity = (7 / tone) * level;
          rim.color.set("#a2b6e2");
          rim.distance = 24;
          rim.position.copy(c).addScaledVector(moonH, 5.0).add(tmp.set(0, 4.5, 0));
          rim.intensity = (6 / tone) * level;
        }
      }

      // --- Kitap: okuyan adam; sayfa dünyası; kapanış ---------------------------------------------------------------
      set.visible = bookTime;
      if (set.visible) {
        const angle = lidAngle(t);
        lid.rotation.z = angle;
        // Kapak inerken minyatür sahne bir açılır kitap gibi sayfaya katlanır.
        pageWorld.scale.set(PAGE_SCALE, PAGE_SCALE * THREE.MathUtils.clamp((angle - 0.3) / 1.1, 0.03, 1), PAGE_SCALE);
        (dropSpot.material as THREE.MeshBasicMaterial).opacity = t >= L.end ? 0.92 : 0;
        readerIk.restore();
        reader.update(dt, time);
        const beside = t >= L.end ? smooth((t - 245.5) / 1.5) * (1 - smooth((t - 258.6) / 0.8)) : 0;
        if (beside > 0) {
          readerIk.tilt("spine_03", rightOf(reader.group, tmp2), BOW * 0.3 * beside);
          readerIk.reach("r", bookAt(0.22, 0.016, 0.3)(), beside);
        }
        const closing = bump(t, 258.8, 259.8, 262.5, 263.6);
        if (closing > 0) {
          readerIk.tilt("spine_03", rightOf(reader.group, tmp2), BOW * 0.3 * closing);
          readerIk.reach("l", lid.localToWorld(tmp3.set(0.33, 0.014, 0.08)), closing);
        }
        applyDent(t);
        pm.place(t, dt, time);
        pg.place(t, dt, time);
        pageWorld.updateMatrixWorld(true);
        // Dev eğilip onu gövdesinden kavrar, kaldırır; tekmeyle kurtulana dek tutar.
        const grab = bump(t, 42.45, 42.85, 44.25, 44.4);
        if (grab > 0) {
          const pgRight = rightOf(pg.g, tmp2).transformDirection(pageWorld.matrixWorld);
          pg.ik.tilt("spine_03", pgRight, BOW * 0.42 * bump(t, 42.3, 42.8, 43.0, 43.6));
          const chest = boneAt(pm.g, "spine_03")();
          const pmRight = rightOf(pm.g, tmp3).transformDirection(pageWorld.matrixWorld).multiplyScalar(0.2 * PAGE_SCALE);
          pg.ik.reach("l", chest.clone().add(pmRight), grab);
          pg.ik.reach("r", chest.clone().sub(pmRight), grab);
        }
        // Yerde: başını fotoğrafa çevirir; eli sayfanın kenarına uzanır, erişemez; parmak uçları kâğıda değer.
        const turn = smooth((t - 54.0) / 1.0);
        if (turn > 0) {
          const along = forwardOf(pm.g, tmp2).transformDirection(pageWorld.matrixWorld);
          pm.ik.tilt("Head", along, 0.75 * turn);
          const reach = smooth((t - 54.4) / 0.9);
          const edge = pageWorld.localToWorld(tmp3.set(GUTTER_X + 0.3, lerp(0.35, 0.03, smooth((t - 55.0) / 0.5)), pm.g.position.z + 0.5));
          pm.ik.reach("r", edge, reach);
        }
      }

      // --- Gerçek dünya ---------------------------------------------------------------------------------------------
      const realOn = t >= 55.9 && t < L.end;
      himG.visible = herG.visible = realOn;
      // Nakaratlarda (çift havadayken) dev görünmez: tepeden bakan kadrajlarda yerde bir gölge gibi duruyordu.
      giantG.visible = realOn && !(s && alt > 3);
      if (realOn) {
        him.place(t, dt, time);
        her.place(t, dt, time);
        giant.place(t, dt, time);
        if (s) {
          // Nakarat: aynı yerden yükselirler; yükseldikçe beden ağırlıksızlaşır, kollar süzülür.
          himG.position.copy(s.man);
          herG.position.copy(s.woman);
          himG.rotation.y = s.yawM;
          herG.rotation.y = s.yawW;
          const w = weightless(s.alt);
          himG.rotation.x = Math.sin(time * 0.37) * 0.035 * w;
          himG.rotation.z = Math.sin(time * 0.29 + 1) * 0.05 * w;
          herG.rotation.x = Math.sin(time * 0.33 + 2) * 0.035 * w;
          herG.rotation.z = Math.sin(time * 0.31 + 4) * 0.05 * w;
          // Yerdeyken (topuklar kalkmadan) ayaklar toprağa gömülmez.
          if (s.alt < 0.3) {
            him.settle();
            her.settle();
          }
          // Düşerken kollar başın üstüne savrulur, beden geriye yatar; hızla yükselirken kollar aşağı ve geriye akar.
          const vy = climbRate(t);
          const fallK = smooth((-vy - 4) / 14);
          const riseK = smooth((vy - 8) / 26);
          himG.rotation.x += -0.24 * fallK + 0.08 * riseK;
          herG.rotation.x += -0.24 * fallK + 0.08 * riseK;
          if (fallK > 0.02 || riseK > 0.02) {
            const falling = fallK >= riseK;
            for (const [p, hs] of [[him, 1], [her, 1.7 / 1.82]] as const) {
              for (const side of [-1, 1]) {
                const sway = 0.04 * Math.sin(time * 5.3 + side * 1.7);
                const target = falling
                  ? relative(p.g, side * (0.34 + sway) * hs, (2.02 + sway) * hs, 0.1 * hs, tmp)
                  : relative(p.g, side * 0.26 * hs, (0.58 + sway) * hs, -0.22 * hs, tmp);
                p.ik.reach(side < 0 ? "r" : "l", target, falling ? 0.85 * fallK : 0.6 * riseK);
              }
            }
          } else if (w > 0.01) {
            for (const [p, hs] of [[him, 1], [her, 1.7 / 1.82]] as const) {
              for (const side of [-1, 1]) {
                const target = relative(p.g, side * (0.46 + 0.1 * w) * hs, (0.72 + 0.1 * w + 0.03 * Math.sin(time * 0.6 + side)) * hs, 0.04 * hs, tmp);
                p.ik.reach(side < 0 ? "r" : "l", target, 0.35 * w);
              }
            }
          }
        } else {
          himG.rotation.x = himG.rotation.z = herG.rotation.x = herG.rotation.z = 0;
        }
        const rightHim = rightOf(himG, new THREE.Vector3());
        // Sayfadan çıkış: eli hâlâ "sayfanın kenarına" uzanıyor (yerde); kalkarken bırakır.
        const edgeReach = t < 57.5 ? 1 - smooth((t - 57.1) / 0.4) : 0;
        if (edgeReach > 0) him.ik.reach("r", relative(himG, 0.3, 0.05, -1.95, tmp), edgeReach);
        // Tanıma: adam deve bakar; dev ona.
        const recog = bump(t, 58.9, 59.4, 60.2, 60.7);
        if (recog > 0) him.ik.tilt("Head", rightHim, 0.42 * recog);
        const giantLook = bump(t, 58.4, 59.2, 60.6, 61.6);
        if (giantLook > 0) {
          const gr = rightOf(giantG, tmp2);
          giant.ik.tilt("neck_01", gr, BOW * 0.25 * giantLook);
          giant.ik.tilt("Head", gr, BOW * 0.3 * giantLook);
        }
        // Eller: onun eli kadına, kadının eli ona; buluşur.
        const handHim = bump(t, 140.4, 141.4, 143.3, 144.0);
        const handHer = bump(t, 140.9, 141.7, 143.3, 144.0);
        if (handHim > 0 || handHer > 0) {
          const meet = tmp3.copy(himG.position).add(herG.position).multiplyScalar(0.5).add(tmp.set(0, 1.08, 0)).addScaledVector(moonH, -0.1);
          if (handHim > 0) him.ik.reach("r", tmp2.copy(meet).addScaledVector(MR, -0.035), handHim);
          if (handHer > 0) her.ik.reach("l", tmp2.copy(meet).addScaledVector(MR, 0.035), handHer);
        }

        // --- Kalp ----------------------------------------------------------------------------------------------
        const heartOn = t >= 144.2 && t < 158.6;
        heart.visible = heartOn;
        const clear = smooth((t - 144.2) / 1.2) * (1 - smooth((t - 147.0) / 1.0)) + 0.8 * bump(t, 157.3, 157.7, 158.2, 158.6);
        setTorsoClear(heartOn ? clear : 0);
        if (heartOn) {
          const out = smooth((t - 146.4) / 1.0) * (1 - smooth((t - 157.7) / 0.6));
          heart.position.set(0, 1.28 / him.baseScale, lerp(0.06, 0.24, out) / him.baseScale);
          const beats = pulse(t, 145.0) + pulse(t, 145.9) + pulse(t, 146.8);
          heart.scale.setScalar(0.11 * (1 + 0.14 * beats + 0.1 * pulse(t, 149.8, 0.4)) / him.baseScale);
          const fib = smooth((t - 147.2) / 1.2);
          const pap = smooth((t - 148.4) / 1.1);
          for (const half of [halfL, halfR]) {
            const m = half.material as THREE.MeshStandardMaterial;
            m.color.copy(organicColor).lerp(fibrousColor, fib).lerp(paperColor, pap);
            m.roughness = lerp(0.55, 1, fib);
            m.emissiveIntensity = 0.35 * (1 - fib);
            const map = t >= 148.9 ? heartPaperMap : t >= 147.6 ? heartFiberMap : organMap;
            if (m.map !== map) {
              m.map = map;
              m.needsUpdate = true;
            }
            half.scale.z = lerp(1, 0.42, pap);
          }
          // Dize kâğıdı söylerken kat izi belirir; yırtık "yırtılıyor"da tepeden başlar ve ağır ağır (3,4 sn) aşağı iner;
          // lifler tek tek kopar; yarılar en sonda ayrılır.
          creaseMaterial.opacity = smooth((t - 150.6) / 0.6) * 0.85 * (1 - smooth((t - 153.2) / 0.8));
          crease.scale.x = 1 + 1.2 * smooth((t - 150.8) / 0.6);
          const rip = 0.2 * smoother((t - TEAR_START) / 3.4);
          const sep = 0.42 * smooth((t - 154.7) / 1.2);
          hingeL.rotation.z = rip;
          hingeR.rotation.z = -rip;
          hingeL.position.x = -sep;
          hingeR.position.x = sep;
          hingeL.rotation.y = -0.15 * sep;
          hingeR.rotation.y = 0.15 * sep;
          hingeL.updateMatrix();
          hingeR.updateMatrix();
          halfR.visible = t < HALF_FREE;
          fibers.forEach((line, i) => {
            const y = line.userData.y as number;
            const gap = rip * (y + 0.5) * 2 + sep * 2;
            line.visible = t >= TEAR_START + 0.4 && t < TEAR_START + 0.8 + i * 0.33 && gap > 0.012;
            if (!line.visible) return;
            const p = line.geometry.attributes.position as THREE.BufferAttribute;
            const a = tmp.set(0.004, y + 0.5, 0.12).applyMatrix4(hingeL.matrix);
            p.setXYZ(0, a.x, a.y, a.z);
            const b = tmp2.set(-0.004, y + 0.5, 0.12).applyMatrix4(hingeR.matrix);
            p.setXYZ(2, b.x, b.y, b.z);
            p.setXYZ(1, (a.x + b.x) / 2, (a.y + b.y) / 2 - 0.015, (a.z + b.z) / 2 + 0.01);
            p.needsUpdate = true;
          });
        } else {
          for (const f of fibers) f.visible = false;
        }
        // Gevşek yarı kadına süzülür; tutar; kâğıt eline doğru hafifçe bükülür. Sonuna dek elinde kalır.
        const halfOn = t >= HALF_FREE && t < 179.8;
        heldHalf.visible = halfOn;
        if (halfOn && t >= 172.8) {
          // Onu tutarken kâğıt yarı elinden kayar: yanlarında yerde yatar.
          const x = DEATH.x + DEATH_S.x * 0.55 - DEATH_F.x * 0.5;
          const z = DEATH.z + DEATH_S.z * 0.55 - DEATH_F.z * 0.5;
          heldHalf.position.set(x, ground(x, z) + 0.012, z);
          heldHalf.rotation.set(-Math.PI / 2, 0, 0.8);
          heldHalf.scale.set(0.108 * 0.94, 0.108 * 0.97, 0.108 * 0.42);
        } else if (halfOn) {
          const travel = smooth((t - HALF_FREE) / 1.4);
          const hand = her.ik.hand("l", tmp3).addScaledVector(forwardOf(herG, tmp2), 0.05).add(tmp.set(0, 0.03, 0));
          if (travel < 1) {
            const from = halfR.getWorldPosition(new THREE.Vector3());
            heldHalf.position.copy(from).lerp(hand, travel);
            heldHalf.position.y += Math.sin(travel * Math.PI) * 0.06;
          } else heldHalf.position.copy(hand);
          heldHalf.rotation.set(-0.2 * travel, herG.rotation.y + Math.PI + 0.3 * travel, 0.2 * travel);
          const bend = smooth((t - 157.4) / 0.8);
          heldHalf.scale.set(0.108 * (1 - 0.06 * bend), 0.108 * (1 - 0.03 * bend), 0.108 * 0.42);
        }
        const take = bump(t, 156.1, 157.0, 158.0, 158.6);
        if (take > 0 && halfOn) her.ik.reach("l", tmp.copy(herG.position).addScaledVector(forwardOf(herG, tmp2), 0.34).add(tmp3.set(0, 1.12, 0)).addScaledVector(rightOf(herG, tmp2), -0.06), take);

        // --- Dövüş: dev çömelir, onu gövdesinden kavrar, kaldırır, fırlatır; bloklar; vurur. -------------------------
        const grab = bump(t, 160.45, 160.85, 162.38, 162.5);
        if (grab > 0) {
          const gr = rightOf(giantG, tmp2);
          giant.ik.tilt("spine_03", gr, BOW * 0.45 * bump(t, 160.2, 160.75, 161.1, 161.8));
          const chest = boneAt(himG, "spine_03")();
          // Devin avucu kalın (7 kat): eller gövdenin yanlarını dışarıdan kavrar, içine girmez.
          giant.ik.reach("l", chest.clone().addScaledVector(rightHim, 0.38), grab);
          giant.ik.reach("r", chest.clone().addScaledVector(rightHim, -0.38), grab);
        }
        const block = bump(t, 166.95, 167.2, 167.5, 167.8);
        if (block > 0) giant.ik.reach("l", him.ik.hand("r", tmp), 0.85 * block);
        const blow = bump(t, 168.9, 169.05, 169.1, 169.35);
        if (blow > 0) giant.ik.reach("r", boneAt(himG, "spine_03")(), blow);

        // --- Ölüm: kadın arkasından tutar, birlikte çökerler; başı kucağında; ona bakar; iki nefes; sonra hiç. -------
        const holdW = bump(t, 172.75, 173.1, 179.7, 179.8);
        let breath = 0;
        if (holdW > 0) {
          const rest = smooth((t - 174.8) / 1.2);
          him.ik.tilt("spine_03", rightHim, BOW * 0.16 * rest);
          him.ik.tilt("neck_01", rightHim, BOW * 0.12 * rest);
          him.ik.tilt("Head", rightHim, 0.22 * smooth((t - 175.6) / 0.8));
          // Elleri göğsünün üstünde (yatan bedende göğüs kemiğin 13 cm üstündedir; eller içine girmez).
          const chest = boneAt(himG, "spine_03")();
          // Sol eli yakın omzunun üstünde, sağ eli göğsünün üstünde: kolları onun bedeninin üstünden gelir, içinden geçmez.
          her.ik.reach("l", boneAt(himG, "clavicle_l")().add(tmp.set(0, 0.13, 0)), holdW);
          her.ik.reach("r", chest.clone().addScaledVector(rightHim, 0.08).add(tmp.set(0, 0.2, 0)), holdW);
          her.ik.tilt("Head", rightOf(herG, tmp2), BOW * (0.16 * smooth((t - 174.2) / 1) + 0.14 * smooth((t - 177.6) / 0.8)));
          breath = 0.006 * Math.sin(time * 2.4) * (1 - smooth((t - 175.6) / 0.4)) + 0.014 * pulse(t, 176.0, 0.9) + 0.007 * pulse(t, 176.9, 0.7);
        }
        himG.scale.setScalar(him.baseScale * (1 + breath));

        // --- Kan: yaralar kumaşta; damlalar gerçek, boşlukta. --------------------------------------------------------
        const bleeding = bleedLevel(t);
        paintWounds(0, bleeding);
        paintWounds(1, bleeding);
        for (const d of droplets) {
          if (!s || t < d.birth || t >= d.until) {
            d.mesh.visible = false;
            continue;
          }
          dropPosition(d, t, d.mesh.position);
          d.mesh.visible = d.mesh.position.distanceTo(kit.camera.position) < 14;
          if (d.mesh.visible) {
            const form = smooth((t - d.birth) / 0.4);
            const wob = Math.sin(time * 3 + d.seed) * 0.06;
            d.mesh.scale.set(d.r * form * (1 - wob * 0.5), d.r * form * (1 + wob), d.r * form * (1 - wob * 0.5));
          }
        }
        // Son iki damla birbirine gider ve birleşir; birleşik damla kameraya doğru süzülür.
        if (s && t >= FINAL_A) {
          const c = pairCenter(t, new THREE.Vector3());
          const meet = relChest(0, MERGE_AT, new THREE.Vector3()).add(relChest(1, MERGE_AT, new THREE.Vector3())).multiplyScalar(0.5).add(tmp.set(0, 0.06, 0));
          const front = tmp2.copy(DEATH_F).negate();
          for (const [mesh, who, born, r] of [[finalA, 0, FINAL_A, 0.0055], [finalB, 1, FINAL_B, 0.005]] as const) {
            mesh.visible = t >= born && t < MERGE_AT;
            if (!mesh.visible) continue;
            const start = relChest(who, born, new THREE.Vector3()).addScaledVector(front, 0.02);
            const k = smooth((t - born) / (MERGE_AT - born));
            mesh.position.copy(start).lerp(meet, k).add(c);
            const form = smooth((t - born) / 0.4);
            mesh.scale.setScalar(r * form);
          }
          merged.visible = t >= MERGE_AT;
          if (merged.visible) {
            const age = t - MERGE_AT;
            merged.position.copy(meet).add(c).addScaledVector(front, 0.012 * age);
            const settle = Math.exp(-age * 2.5) * Math.sin(age * 16) * 0.12;
            merged.scale.set(0.0068 * (1 - settle * 0.5), 0.0068 * (1 + settle), 0.0068 * (1 - settle * 0.5));
          }
        } else {
          finalA.visible = finalB.visible = merged.visible = false;
        }
      } else {
        hideDrops();
        clearHeart();
        paintWounds(0, 0);
        paintWounds(1, 0);
      }

      // --- Yıldız-gözler ----------------------------------------------------------------------------------------------
      const eyesOn = t >= 59.5 && t < 80 && !set.visible;
      eyes.forEach((eye, i) => {
        eye.mesh.visible = eyesOn;
        if (!eyesOn) return;
        eye.mesh.quaternion.copy(kit.camera.quaternion);
        const dist = eye.mesh.position.distanceTo(kit.camera.position);
        const u = eye.material.uniforms;
        // Dizede açılırlar (önce yıldız, sonra iris); yakına gelince zaten açıktırlar.
        u.uReveal.value = Math.max(THREE.MathUtils.smoothstep(eye.size / Math.max(0.1, dist), 0.05, 0.3), smooth((t - 59.85 - i * 0.18) / 0.7));
        u.uOpacity.value = smooth((t - 59.3) / 0.8) * level;
        u.uTime.value = time;
        if (i === 0) eyeLookAt(t, eyeLook);
        else eyeLook.set(Math.sin(time * 0.3 + i) * 0.3, Math.cos(time * 0.23 + i * 2) * 0.2 - 0.2);
        (u.uLook.value as THREE.Vector2).copy(eyeLook);
        u.uDilate.value = 0.3 + 0.2 * Math.sin(time * 0.5 + i);
      });

      // Hava zerreleri: nakaratlarda, çift havadayken; hızları çiftin dikey hızıdır.
      if (s && level > 0.02) updateStreaks(pairCenter(t, streakCenter), climbRate(t), smooth((alt - 1.5) / 8) * level);
      else streaks.visible = false;

      pageDust.update(time);
      giantDust.update(time);
      hitDust.update(time);
    },
  };
  return scene;
}
