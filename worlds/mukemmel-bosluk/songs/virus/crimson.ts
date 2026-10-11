import * as THREE from "three";
import { createTube } from "../../../../engine/fx/tube";
import type { Crimson, Filament, Membrane, Residue, WallFilm } from "./types";

/**
 * Aşk, Virüs — kızıl malzeme. Aşk burada SAYDAM, YAPIŞKAN bir kızıl reçine / incecik lateks / ıslak polimer filmdir: ışığı
 * yakalar, gerildikçe incelir ve saydamlaşır, kırışır, sarkar, geri çekilir, kenarı ilerleyerek yırtılır. Kan değil, neon
 * değil, lav değil. Dört ürün (filament, zar, duvar filmi, kalıntı) TEK gölgelendirici ailesini paylaşır: sabit sanal bir
 * ışık yönünden lambert + fresnel kenar + sert parlama; sahne ışığına ihtiyaç duymaz (dünya iki nokta ışığını paylaşır,
 * ışık eklemek her gölgelendiriciyi yeniden derletir). Renk, solma (uFade) ve genel görünürlük (uLevel) uniform'ları ortak
 * nesnededir; `setFade`/`setLevel` bir yazımda her şeyi günceller. Bütün malzemeler kuruluşta vardır (warmup derler);
 * çalışma anında yalnız geometri, görünürlük ve uniform değerleri değişir. Her `set` saf fonksiyondur: aynı girdi → aynı
 * geometri; döngülerde ayırma yapılmaz (ortak Vector3 havuzu).
 */

const { clamp, lerp, smoothstep } = THREE.MathUtils;

/** Saydam kızıl katman: cam 5'in üstünde, figürlerin (3) üstünde. */
const RENDER_ORDER = 6;
/** Filament: sarkma en çok 0,35 m; kıpırtı 4 mm (gevşedikçe iki katına çıkar). */
const SAG_MAX = 0.35;
const WOBBLE = 0.004;
/** Zar: sarkma 0,3 m; boyun daralması %35; kırışık frekansı 7, genliği 4 mm; düşüş 1,5 m aşağı, 0,3 m dışa. */
const MEMBRANE_SAG = 0.3;
const NECK = 0.35;
const WRINKLE_FREQ = 7;
const WRINKLE_AMP = 0.004;
const DROP_FALL = 1.5;
const DROP_SWING = 0.3;
/** Büyüme haritası 256², kalıntı maskesi 64². */
const MAP = 256;
const MASK = 64;
/** Yırtık cephesi b ucundan a ucuna u boyunca 1,45·tear yürür (tear 1'de a ucu da kopmuştur); rampası 0,45 u. */
const TEAR_RUN = 1.45;
const TEAR_RAMP = 0.45;

const UP = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
/** Geçici vektör havuzu (kare başına ayırma yok). */
const T = Array.from({ length: 8 }, () => new THREE.Vector3());

/** Girdi özeti (zar yalnız değişince GPU'ya yazar): float bitleri FNV-1a ile karıştırılır. */
const hashF32 = new Float32Array(1);
const hashU32 = new Uint32Array(hashF32.buffer);
let hashAcc = 0;
const hashBegin = () => {
  hashAcc = 0x811c9dc5;
};
const hashAdd = (x: number) => {
  hashF32[0] = x;
  hashAcc = Math.imul(hashAcc ^ hashU32[0], 0x01000193) >>> 0;
};

// ------------------------------------------------------------------ Gölgelendirici ailesi

/**
 * Köşe: dünya konumu ve normali (sabit sanal ışık dünya uzayında); zar için incelik ve yırtık öznitelikleri varying olur.
 * FILAMENT'te uv yok (tüp geometrisinde uv özniteliği bulunmaz), NEED_UV ile kapatılır.
 */
const VERT = /* glsl */ `
varying vec3 vN;
varying vec3 vW;
#ifdef NEED_UV
varying vec2 vUv;
#endif
#ifdef MEMBRANE
attribute float aThin;
attribute float aTear;
varying float vThin;
varying float vTear;
#endif
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  #ifdef NEED_UV
  vUv = uv;
  #endif
  #ifdef MEMBRANE
  vThin = aThin;
  vTear = aTear;
  #endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

/**
 * Parça: reçine kalınlığı bakış açısına göre (sıyırarak bakınca yol uzar → koyu şarap), incelik saydamlaştırır ve kenarı
 * ısıtır; fresnel kenar (#ff6a5a) ve dar parlama "ıslak" okutur. uFade renkleri önce soluk pembeye, sonra #f1e6e6'ya
 * çeker, kenarı söndürür, parlamayı matlaştırır, alfayı 0,45'e indirir. Ayrılmış sözcük yok (half, sample, filter...).
 * GLSL ES 1.0 uyumlu: texture2D, sabit vektör önceden normalize edilmiş sayı.
 */
const FRAG = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uRim;
uniform vec3 uPale;
uniform float uFade;
uniform float uLevel;
uniform float uTime;
varying vec3 vN;
varying vec3 vW;
#ifdef NEED_UV
varying vec2 vUv;
#endif
#ifdef MEMBRANE
varying float vThin;
varying float vTear;
#endif
#ifdef FILM
uniform sampler2D tMap;
uniform float uReveal;
#endif
#ifdef RESIDUE
uniform sampler2D tMask;
uniform float uK;
#endif
float hash1(float x) { return fract(sin(x * 127.1 + 311.7) * 43758.5453); }
float vnoise(float x) { float i = floor(x); float f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash1(i), hash1(i + 1.0), f); }
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(cameraPosition - vW);
  float ndv = clamp(dot(n, v), 0.0, 1.0);
  float thin = 0.0;
  float edge = 0.0;
  float mask = 1.0;
  float grain = 1.0;
  #ifdef MEMBRANE
  thin = vThin;
  // Yırtık: v = 0,5 ortasından açılan, u boyunca pürtüklü kenarlı yarık; kenar kıvrılıp kalınlaşır (lateks büzülür).
  float dv = abs(vUv.y - 0.5);
  float rag = 0.7 + 0.6 * vnoise(vUv.x * 21.0);
  float gap = 0.17 * vTear * rag;
  if (vTear > 0.001 && dv < gap) discard;
  edge = (1.0 - smoothstep(gap, gap + 0.07, dv)) * step(0.001, vTear);
  #endif
  #ifdef FILM
  // Büyüme haritası: R varış mesafesi, G kalınlık maskesi, B gürültü. Islak cephe (R ≈ uReveal) daha kalın ve parlak.
  vec4 m = texture2D(tMap, vUv);
  // smoothstep kenarları artan sırada olmalı (ters sıra tanımsızdır): görünürlük = 1 - ileri smoothstep.
  float vis = (1.0 - smoothstep(uReveal - 0.016, uReveal + 0.004, m.r)) * smoothstep(0.08, 0.2, m.g);
  if (vis < 0.01) discard;
  float front = 1.0 - smoothstep(0.0, 0.06, uReveal - m.r);
  front *= 0.85 + 0.15 * sin(uTime * 2.3 + m.b * 12.0);
  edge = front;
  thin = 1.0 - m.g;
  grain = 0.9 + 0.2 * m.b;
  mask = vis * m.g * (1.0 + 0.45 * front);
  #endif
  #ifdef RESIDUE
  float blob = texture2D(tMask, vUv).r;
  if (blob < 0.01) discard;
  mask = blob * uK;
  thin = 1.0 - blob;
  #endif
  vec3 L = vec3(0.3197, 0.8393, 0.4396);
  float thick = clamp((1.0 - ndv) * (1.0 - 0.6 * thin) + 0.5 * edge, 0.0, 1.0);
  float diff = 0.62 + 0.38 * max(dot(n, L), 0.0);
  vec3 col = mix(uColorA, uColorB, thick * 0.75) * diff * grain;
  float fres = pow(1.0 - ndv, 3.0);
  vec3 hv = normalize(L + v);
  float ndh = max(dot(n, hv), 0.0);
  float spec = pow(ndh, 72.0) * 0.6 + pow(ndh, 9.0) * 0.07;
  float fadeK = clamp(uFade, 0.0, 1.0);
  float rimScale = 1.0;
  float alphaScale = 1.0;
  #ifdef FILAMENT
  // Ince tup hep siyirarak gorulur: kenar isigi kisilir, saydamlik artar (tel degil recine ipligi).
  rimScale = 0.25;
  alphaScale = 0.72;
  #endif
  vec3 rim = uRim * fres * (0.5 + 0.6 * thin + 0.5 * edge) * (1.0 - fadeK) * rimScale;
  vec3 pale = mix(mix(uColorA, uPale, 0.62), uPale, smoothstep(0.45, 1.0, fadeK));
  col = mix(col, pale * diff, smoothstep(0.0, 0.9, fadeK));
  col += rim + vec3(spec) * (1.0 - 0.85 * fadeK) * (0.5 + 0.5 * rimScale);
  float alpha = mix(0.55, 0.8, thick) * (1.0 - 0.35 * thin);
  alpha = min(0.92, alpha + 0.25 * edge + 0.35 * spec + 0.15 * fres * (1.0 - fadeK));
  alpha = mix(alpha, 0.45, fadeK) * alphaScale;
  gl_FragColor = vec4(col, alpha * mask * uLevel);
}
`;

type Kind = "FILAMENT" | "MEMBRANE" | "FILM" | "RESIDUE";

// ------------------------------------------------------------------ Dokular (kuruluşta, bir kez)

/** Yatay + dikey kutu bulanıklığı (yarıçap r); `tmp` ara tampon. Yeşil kanalı yumuşatmak için. */
function boxBlur(src: Float32Array, tmp: Float32Array, n: number, r: number): void {
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      let sum = 0;
      for (let k = -r; k <= r; k += 1) sum += src[y * n + clamp(x + k, 0, n - 1)];
      tmp[y * n + x] = sum * norm;
    }
  }
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      let sum = 0;
      for (let k = -r; k <= r; k += 1) sum += tmp[clamp(y + k, 0, n - 1) * n + x];
      src[y * n + x] = sum * norm;
    }
  }
}

/** Veri dokusu: renk uzayı yok, mip yok (R kanalı mesafe eşiğidir, bulanmamalı). */
function dataTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Büyüme haritası: tohumdan deterministik rastgele yürüyüşle dallanan yapı (~14 ana dal, 3 derinliğe kadar yan dallar).
 * R = dal boyunca tohumdan varış mesafesi (0 tohum … 1 en uzak uç; kaplanmamış piksel 1), G = kalınlık maskesi (yumuşak,
 * bulanık), B = ince gürültü. Tohum UV'de verilir; tuval satırı 0 üsttedir (flipY) → y = (1 − seedV)·N.
 */
function growthMap(random: () => number, seedU: number, seedV: number): THREE.CanvasTexture {
  const n = MAP;
  const dist = new Float32Array(n * n).fill(-1);
  const thick = new Float32Array(n * n);
  /** Yumuşak disk damgası: çekirdek 1, kenar sıfıra iner; en yakın varış mesafesi kalır. */
  const stamp = (x: number, y: number, d: number, w: number) => {
    const r = Math.max(1.2, w);
    const x0 = Math.max(0, Math.floor(x - r));
    const x1 = Math.min(n - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r));
    const y1 = Math.min(n - 1, Math.ceil(y + r));
    for (let py = y0; py <= y1; py += 1) {
      for (let px = x0; px <= x1; px += 1) {
        const dx = px + 0.5 - x;
        const dy = py + 0.5 - y;
        const q = Math.sqrt(dx * dx + dy * dy) / r;
        if (q >= 1) continue;
        const i = py * n + px;
        const t = smoothstep(1 - q, 0, 0.55);
        if (t > thick[i]) thick[i] = t;
        if (dist[i] < 0 || d < dist[i]) dist[i] = d;
      }
    }
  };
  const STEP = 2;
  /** Bir dal: kıvrılarak yürür (başlangıç yönüne hafif çekilir), uca doğru incelir, ara sıra yan dal verir. */
  const grow = (x: number, y: number, heading: number, d0: number, w0: number, length: number, depth: number) => {
    const steps = Math.max(2, Math.round(length / STEP));
    let ang = heading;
    for (let k = 0; k <= steps; k += 1) {
      if (x < 1 || y < 1 || x > n - 2 || y > n - 2) return;
      const w = w0 * (1 - 0.7 * (k / steps));
      stamp(x, y, d0 + k * STEP, w);
      ang += (random() - 0.5) * 0.4 + (heading - ang) * 0.05;
      x += Math.cos(ang) * STEP;
      y += Math.sin(ang) * STEP;
      if (depth < 3 && k > 5 && k % 8 === 0 && random() < 0.45) {
        const turn = (0.45 + 0.7 * random()) * (random() < 0.5 ? -1 : 1);
        grow(x, y, ang + turn, d0 + k * STEP, w * 0.62, (steps - k) * STEP * (0.35 + 0.45 * random()), depth + 1);
      }
    }
  };
  const sx = seedU * n;
  const sy = (1 - seedV) * n;
  stamp(sx, sy, 0, 3.5);
  const MAIN = 14;
  for (let i = 0; i < MAIN; i += 1) {
    const ang = ((i + 0.3 + 0.4 * random()) / MAIN) * Math.PI * 2;
    grow(sx, sy, ang, 0, 1.6 + 1.2 * random(), n * (0.35 + 0.35 * random()), 0);
  }
  let maxD = 1e-6;
  for (let i = 0; i < dist.length; i += 1) if (dist[i] > maxD) maxD = dist[i];
  boxBlur(thick, new Float32Array(n * n), n, 1);
  const canvas = document.createElement("canvas");
  canvas.width = n;
  canvas.height = n;
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(n, n);
  for (let i = 0; i < n * n; i += 1) {
    img.data[i * 4] = dist[i] < 0 ? 255 : Math.round(255 * (dist[i] / maxD));
    img.data[i * 4 + 1] = Math.round(255 * clamp(thick[i], 0, 1));
    img.data[i * 4 + 2] = Math.round(255 * random());
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return dataTexture(canvas);
}

/** Kalıntı maskesi: iki loblu, hafif merkez dışı, kenarı düzensiz yumuşak leke (R kanalı). */
function blobMask(random: () => number): THREE.CanvasTexture {
  const n = MASK;
  const cx = 0.5 + (random() - 0.5) * 0.1;
  const cy = 0.5 + (random() - 0.5) * 0.1;
  const a2 = random() * Math.PI * 2;
  const c2x = cx + Math.cos(a2) * 0.16;
  const c2y = cy + Math.sin(a2) * 0.16;
  const r2 = 0.19 + 0.05 * random();
  const p1 = random() * Math.PI * 2;
  const p2 = random() * Math.PI * 2;
  const lobe = (px: number, py: number, lx: number, ly: number, r: number, ph: number) => {
    const dx = px - lx;
    const dy = py - ly;
    const th = Math.atan2(dy, dx);
    const rr = r * (1 + 0.12 * Math.sin(3 * th + ph) + 0.07 * Math.sin(5 * th + ph * 1.7));
    return smoothstep(1 - Math.sqrt(dx * dx + dy * dy) / rr, 0, 0.4);
  };
  const canvas = document.createElement("canvas");
  canvas.width = n;
  canvas.height = n;
  const g = canvas.getContext("2d")!;
  const img = g.createImageData(n, n);
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const px = (x + 0.5) / n;
      const py = (y + 0.5) / n;
      const m = Math.round(255 * Math.max(lobe(px, py, cx, cy, 0.3, p1), lobe(px, py, c2x, c2y, r2, p2)));
      const o = (y * n + x) * 4;
      img.data[o] = m;
      img.data[o + 1] = m;
      img.data[o + 2] = m;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return dataTexture(canvas);
}

// ------------------------------------------------------------------ Kuruluş

export function createCrimson(random: () => number): Crimson {
  const group = new THREE.Group();
  group.name = "crimson";

  /** Ortak uniform'lar: aynı IUniform örnekleri her malzemeye verilir; tek yazım hepsini değiştirir. */
  const shared = {
    uColorA: { value: new THREE.Color("#8a1a2c") } as THREE.IUniform<THREE.Color>,
    uColorB: { value: new THREE.Color("#4a0a16") } as THREE.IUniform<THREE.Color>,
    uRim: { value: new THREE.Color("#ff6a5a") } as THREE.IUniform<THREE.Color>,
    uPale: { value: new THREE.Color("#f1e6e6") } as THREE.IUniform<THREE.Color>,
    uFade: { value: 0 } as THREE.IUniform<number>,
    uLevel: { value: 1 } as THREE.IUniform<number>,
    uTime: { value: 0 } as THREE.IUniform<number>,
  };
  /** Tek gölgelendirici ailesi; tür `defines` ile seçilir. İnce yüzeyler çift taraflı; film duvara polygonOffset ile oturur. */
  const makeMaterial = (kind: Kind, extra: Record<string, THREE.IUniform> = {}, offset = false): THREE.ShaderMaterial => {
    const defines: Record<string, number> = { [kind]: 1 };
    if (kind !== "FILAMENT") defines.NEED_UV = 1;
    const material = new THREE.ShaderMaterial({
      defines,
      uniforms: { ...shared, ...extra },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: offset,
      polygonOffsetFactor: offset ? -2 : 0,
      polygonOffsetUnits: offset ? -2 : 0,
    });
    material.name = `crimson-${kind.toLowerCase()}`;
    return material;
  };
  /** Filament ve zar örnek başına uniform istemez → tek paylaşılan malzeme (kuruluşta; warmup derler). */
  const filamentMaterial = makeMaterial("FILAMENT");
  const membraneMaterial = makeMaterial("MEMBRANE");

  // --- Filament: yol boyunca yürüyen ince tüp -------------------------------------------------------------------------
  const filament = (path: THREE.Vector3[], radius = 0.006, segments = 48): Filament => {
    const tube = createTube(filamentMaterial, segments, 6);
    tube.mesh.renderOrder = RENDER_ORDER;
    group.add(tube.mesh);
    /** Yay uzunluğu toplamları (yol uzarsa büyür; döngü içinde ayırma yok). */
    let cum = new Float32Array(Math.max(2, path.length));
    let scale = radius;
    let revealNow = 1;
    /** Yarıçap: gevşedikçe %50'ye kadar incelir, görünen ucun son %45'inde 0,6'ya daralır (ıslak uç). */
    const radiusFn = (u: number) => scale * (1 - 0.4 * smoothstep(u / revealNow, 0.55, 1));
    const fil: Filament = {
      tube,
      path,
      radius,
      set(reveal, slack, time) {
        const pts = fil.path;
        const n = pts.length;
        shared.uTime.value = time;
        if (n < 2) {
          tube.mesh.visible = false;
          return;
        }
        if (cum.length < n) cum = new Float32Array(n);
        cum[0] = 0;
        for (let j = 1; j < n; j += 1) cum[j] = cum[j - 1] + pts[j].distanceTo(pts[j - 1]);
        const total = cum[n - 1];
        if (total < 1e-6) {
          tube.mesh.visible = false;
          return;
        }
        const amp = WOBBLE * (1 + slack);
        let j = 0;
        for (let i = 0; i <= segments; i += 1) {
          const s = (i / segments) * total;
          while (j < n - 2 && cum[j + 1] < s) j += 1;
          const segLen = cum[j + 1] - cum[j];
          const t = segLen > 1e-9 ? (s - cum[j]) / segLen : 0;
          const p = tube.points[i].lerpVectors(pts[j], pts[j + 1], t);
          // Düğümler arasında asılı sinüs sarkması: slack ile orantılı, kısa açıklıklarda az, en çok 0,35 m.
          p.y -= Math.min(SAG_MAX, 0.18 * segLen) * slack * Math.sin(Math.PI * t);
          p.x += amp * Math.sin(time * 1.7 + s * 3.1);
          p.y += amp * Math.sin(time * 2.1 + s * 4.3);
          p.z += amp * Math.cos(time * 1.3 + s * 2.7);
        }
        scale = fil.radius * (1 - 0.5 * slack);
        revealNow = Math.max(1e-3, reveal);
        tube.build(radiusFn, reveal);
        tube.mesh.visible = tube.mesh.visible && reveal > 0.002;
      },
    };
    return fil;
  };

  // --- Zar: iki uç arasında gerilmiş ince film --------------------------------------------------------------------------
  const membrane = (segmentsU = 16, segmentsV = 10): Membrane => {
    const nu = segmentsU;
    const nv = segmentsV;
    const count = (nu + 1) * (nv + 1);
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    const thin = new Float32Array(count);
    const tear = new Float32Array(count);
    const index: number[] = [];
    const idx = (iu: number, iv: number) => iu * (nv + 1) + iv;
    for (let iu = 0; iu <= nu; iu += 1) {
      for (let iv = 0; iv <= nv; iv += 1) {
        const i = idx(iu, iv);
        uvs[i * 2] = iu / nu;
        uvs[i * 2 + 1] = iv / nv;
        nor[i * 3 + 2] = 1;
      }
    }
    // Sarım cross(du, dv) normaliyle aynı yöne bakar; parça gl_FrontFacing ile arka yüzü çevirir.
    for (let iu = 0; iu < nu; iu += 1) {
      for (let iv = 0; iv < nv; iv += 1) {
        const a = idx(iu, iv);
        const b = a + (nv + 1);
        index.push(a, b, b + 1, a, b + 1, a + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(pos, 3);
    const norAttr = new THREE.BufferAttribute(nor, 3);
    const thinAttr = new THREE.BufferAttribute(thin, 1);
    const tearAttr = new THREE.BufferAttribute(tear, 1);
    geometry.setAttribute("position", posAttr);
    geometry.setAttribute("normal", norAttr);
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute("aThin", thinAttr);
    geometry.setAttribute("aTear", tearAttr);
    geometry.setIndex(index);
    const mesh = new THREE.Mesh(geometry, membraneMaterial);
    mesh.frustumCulled = false;
    mesh.renderOrder = RENDER_ORDER;
    mesh.visible = false;
    group.add(mesh);
    let lastHash = -1;
    return {
      mesh,
      set(a, b, wa, wb, sag, tear01, drop, time) {
        shared.uTime.value = time;
        // Girdi özeti: zaman 20 ms'ye yuvarlanır (aynı karede ikinci çağrı ya da duraklama GPU'ya yazmaz).
        hashBegin();
        hashAdd(a.x);
        hashAdd(a.y);
        hashAdd(a.z);
        hashAdd(b.x);
        hashAdd(b.y);
        hashAdd(b.z);
        hashAdd(wa);
        hashAdd(wb);
        hashAdd(sag);
        hashAdd(tear01);
        hashAdd(drop);
        hashAdd(Math.round(time * 50));
        const h = hashAcc;
        const dir = T[0].subVectors(b, a);
        const len = dir.length();
        // Genişliksiz ya da uçları çakışık zar çizilmez (film gizlemek için wa = wb = 0 verebilir).
        mesh.visible = wa + wb > 1e-4 && len > 1e-5;
        if (h === lastHash) return;
        lastHash = h;
        if (len > 1e-5) dir.divideScalar(len);
        else dir.set(0, 0, 1);
        // Genişlik ekseni: yatay (dir × yukarı); dikey asılı zarda z eksenine düşülür.
        const side = T[1].crossVectors(dir, UP);
        if (side.lengthSq() < 0.05) side.crossVectors(dir, Z_AXIS);
        side.normalize();
        const face = T[2].crossVectors(side, dir).normalize();
        const wmax = Math.max(wa, wb, 1e-4);
        const uFront = 1 - tear01 * TEAR_RUN;
        const wrAmp = WRINKLE_AMP * (1 + sag);
        const c = T[3];
        for (let iu = 0; iu <= nu; iu += 1) {
          const u = iu / nu;
          const su = Math.sin(Math.PI * u);
          c.lerpVectors(a, b, u);
          c.y -= MEMBRANE_SAG * sag * su;
          // Boyun: gerilmiş film ortada daralır; incelik = 1 − w/wmax (en ince yerde en saydam, kenarı en sıcak).
          const w = lerp(wa, wb, u) * (1 - NECK * su);
          const thinU = clamp(1 - w / wmax, 0, 1);
          const tearU = clamp((u - uFront) / TEAR_RAMP, 0, 1);
          const dropW = drop * tearU;
          for (let iv = 0; iv <= nv; iv += 1) {
            const v = iv / nv;
            const i = idx(iu, iv);
            // Düşüş: yırtığın iki yarısı (v < 0,5 / v > 0,5) aşağı iner ve dışa savrulur; kopmamış kısım yerinde kalır.
            const off = (v - 0.5) * w + (v < 0.5 ? -1 : 1) * DROP_SWING * dropW;
            // Kırışıklar: genişlik boyunca 7 sırt, zamanla yavaş kayar; tutulan uçlarda söner.
            const wr = wrAmp * Math.sin(v * Math.PI * 2 * WRINKLE_FREQ + time * 0.6 + u * 2.5) * (0.3 + 0.7 * su);
            pos[i * 3] = c.x + side.x * off + face.x * wr;
            pos[i * 3 + 1] = c.y + side.y * off + face.y * wr - DROP_FALL * dropW;
            pos[i * 3 + 2] = c.z + side.z * off + face.z * wr;
            thin[i] = thinU;
            tear[i] = tearU;
          }
        }
        // Normaller: komşu farklarının çaprazı (ucuz yaklaşıklık); dejenere hücrede film normali.
        for (let iu = 0; iu <= nu; iu += 1) {
          for (let iv = 0; iv <= nv; iv += 1) {
            const i = idx(iu, iv);
            const du = T[4].fromArray(pos, idx(Math.min(iu + 1, nu), iv) * 3);
            du.sub(T[5].fromArray(pos, idx(Math.max(iu - 1, 0), iv) * 3));
            const dv = T[5].fromArray(pos, idx(iu, Math.min(iv + 1, nv)) * 3);
            dv.sub(T[6].fromArray(pos, idx(iu, Math.max(iv - 1, 0)) * 3));
            const nrm = T[6].crossVectors(du, dv);
            if (nrm.lengthSq() < 1e-14) nrm.copy(face);
            else nrm.normalize();
            nor[i * 3] = nrm.x;
            nor[i * 3 + 1] = nrm.y;
            nor[i * 3 + 2] = nrm.z;
          }
        }
        posAttr.needsUpdate = true;
        norAttr.needsUpdate = true;
        thinAttr.needsUpdate = true;
        tearAttr.needsUpdate = true;
      },
    };
  };

  // --- Duvar filmi: panel üstünde tohumdan dallanarak büyüyen örtü ------------------------------------------------------
  const film = (width: number, height: number, seedU = 0.5, seedV = 0.5): WallFilm => {
    const uReveal: THREE.IUniform<number> = { value: 0 };
    const material = makeMaterial("FILM", { tMap: { value: growthMap(random, seedU, seedV) }, uReveal }, true);
    // Panel +z'ye bakar: film `quaternion.setFromUnitVectors((0,0,1), yüzeyNormali)` ile duvara yaslar.
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), material);
    mesh.renderOrder = RENDER_ORDER;
    mesh.visible = false;
    group.add(mesh);
    return {
      mesh,
      set(reveal, time) {
        uReveal.value = clamp(reveal, 0, 1);
        shared.uTime.value = time;
        mesh.visible = reveal > 0.002;
      },
    };
  };

  // --- Kalıntı: yüzeyde para kadar leke ---------------------------------------------------------------------------------
  const residue = (size = 0.03): Residue => {
    const uK: THREE.IUniform<number> = { value: 0 };
    const material = makeMaterial("RESIDUE", { tMask: { value: blobMask(random) }, uK });
    // +z dışa bakar; film konum + quaternion verir, normal yönünde 1–2 mm kaldırır.
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size, 1, 1), material);
    mesh.renderOrder = RENDER_ORDER;
    mesh.visible = false;
    group.add(mesh);
    return {
      mesh,
      set(k, time) {
        const kk = clamp(k, 0, 1);
        uK.value = kk;
        shared.uTime.value = time;
        // Büyüme 0,2 → 1 ölçek; hafif soluma (%3).
        mesh.scale.setScalar((0.2 + 0.8 * kk) * (1 + 0.03 * Math.sin(time * 2)));
        mesh.visible = kk > 0.002;
      },
    };
  };

  return {
    group,
    filament,
    membrane,
    film,
    residue,
    setFade(k) {
      shared.uFade.value = clamp(k, 0, 1);
    },
    setLevel(k) {
      shared.uLevel.value = clamp(k, 0, 1);
    },
  };
}
