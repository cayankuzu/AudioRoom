import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { SongScene } from "../../../engine/game/songStage";
import { createActor, createFigure } from "../../../engine/fx/figure";
import { fitModel } from "../../../engine/core/models";
import { createCrowd } from "./crowd";
import { GRADES } from "../../../engine/game/director";
import { createPetals, createRain, lightCone, setConeLevel } from "../../../engine/fx/sceneProps";
import { announce, arc, attach, block, cam, CENTER, ease, follow, gazeTarget, glowSprite, GRAMOPHONE, ground, me, pt, ridge, rim, secretItem, type SceneKit } from "./kit";

/**
 * Tam Bi Delilik — onsuz şehir bir cenaze. Kraterin kenarını bir şehir silueti sarar;
 * aşağıda fenerli bir alay yürür. Köşede bir çiçekçi. Uçurumun kenarına giden ayak izleri
 * bankın önünde döner ve geri gelir (kimse görmeden caymış biri). Ona ait eşyalar peşine
 * düşer; kamera koşar. Nakaratta şehrin pencereleri çıldırır. Sabah bir yatak: bir tarafta
 * uyuyan biri, öbür tarafta beyaz bir örtünün altında kıpırtısız bir beden. Kapüşonlu cellat
 * doğrulur; kırık kalp bir vitrine konur, altında bir müze etiketi (Zagreb'deki Kırık
 * İlişkiler Müzesi'ne selam). Sonda mahalleler birer birer söner, bankta tek bir çiçek kalır.
 */
const BUILDINGS = 150;
const DISTRICTS = 8;
const MOURNERS = 16;
const MEMENTOS = 6;
const CLIFF = { x: -6, z: -84 };
/** Dizelerin saniyeleri. */
const L = {
  city: 13.44, flowers: 20.01, high: 33.37, cliff: 40.02, yours: 53.42, remind: 66.74, madness: 79.35,
  mad1: 86.01, mad2: 92.45, mad3: 99.38, mad4: 105.93, mad5: 112.66, city2: 120.05, corpse: 126.49,
  hangman: 140.12, vitrine: 146.56, yours2: 160.07, remind2: 173.35, madness2: 186.06, madB1: 192.6,
  madB2: 199.17, madB3: 206.03, madB4: 212.6, madB5: 219.37, out1: 245.95, out2: 259.32, out3: 266.0,
  out4: 272.75, out5: 279.31, end: 282.55,
} as const;
const STEPS = 20;
const HIGH = { ...GRADES.fever, aberration: 0.014 };

/** Ayak izi: ince taban, ayrı topuk (burun dokunun üstünde). */
function footprintTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#fff";
  g.beginPath();
  g.ellipse(32, 40, 20, 34, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(32, 102, 15, 20, 0, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(canvas);
}

/** Çiçek başı: altı yaprak ve göbek. */
function flowerHead(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i += 1) {
    const petal = new THREE.SphereGeometry(0.05, 8, 6);
    petal.scale(1, 0.35, 0.55);
    petal.translate(0.045, 0, 0);
    petal.rotateY((i / 6) * Math.PI * 2);
    parts.push(petal);
  }
  const center = new THREE.SphereGeometry(0.025, 8, 6);
  center.translate(0, 0.012, 0);
  parts.push(center);
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

/** Yırtık fotoğraf: iki kişiden birinin yanı koparılmış. */
function photoTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 320;
  const g = canvas.getContext("2d")!;
  const sky = g.createLinearGradient(0, 0, 0, 320);
  sky.addColorStop(0, "#c9a878");
  sky.addColorStop(1, "#7a5a3a");
  g.fillStyle = sky;
  g.fillRect(0, 0, 256, 320);
  g.fillStyle = "#2a1a10";
  for (const x of [80, 176]) {
    g.beginPath();
    g.arc(x, 130, 30, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(x, 260, 58, 90, 0, Math.PI, 0);
    g.fill();
  }
  // Sağ yarı koparılmış: yırtık kenar, arkası beyaz.
  g.fillStyle = "#f2ede4";
  g.beginPath();
  g.moveTo(256, 0);
  let x = 132;
  g.lineTo(x, 0);
  for (let y = 0; y <= 320; y += 16) {
    x = 128 + Math.sin(y * 0.21) * 7 + ((y * 37) % 11) - 5;
    g.lineTo(x, y);
  }
  g.lineTo(256, 320);
  g.closePath();
  g.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Vitrinin müze etiketi. */
function labelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#efe8da";
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = "#3a332a";
  g.lineWidth = 4;
  g.strokeRect(14, 14, 484, 228);
  g.fillStyle = "#1c1814";
  g.textAlign = "center";
  g.font = "600 30px Georgia, serif";
  g.fillText("KIRIK İLİŞKİLER MÜZESİ", 256, 70);
  g.font = "italic 26px Georgia, serif";
  g.fillText("Env. No. 88 — Kalp, çatlak", 256, 128);
  g.font = "22px Georgia, serif";
  g.fillText("Bağışçı: isimsiz · Ödünç verilmez", 256, 170);
  g.fillStyle = "#8e1016";
  g.font = "600 20px Georgia, serif";
  g.fillText("LÜTFEN DOKUNMAYINIZ", 256, 214);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createCityScene(kit: SceneKit): SongScene {
  const root = new THREE.Group();
  const districtOn = Array.from({ length: DISTRICTS }, () => 1);
  const districtLevel = Array.from({ length: DISTRICTS }, () => 1);
  const uniforms = { uDistrict: { value: districtLevel.slice() }, uLevel: { value: 0 }, uTime: { value: 0 }, uMad: { value: 0 } };

  const material = new THREE.MeshStandardMaterial({ color: "#0e0e10", roughness: 0.85, emissive: "#ffd7a0", emissiveIntensity: 1 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float district;\nattribute vec3 size;\nvarying float vDistrict;\nvarying vec3 vLocal;\nvarying vec3 vSize;\nvarying float vSeed;")
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvDistrict = district;\nvLocal = position;\nvSize = size;\nvSeed = float(gl_InstanceID);",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uDistrict[${DISTRICTS}];
        uniform float uLevel, uTime, uMad;
        varying float vDistrict; varying vec3 vLocal; varying vec3 vSize; varying float vSeed;
        float cityHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        // Pencereler: yüz koordinatında kat/oda ızgarası; mahalle karardıkça her pencere kendi sırasıyla söner.
        vec3 world = (vLocal + 0.5) * vSize;
        float facing = 1.0 - step(0.499, abs(vLocal.y));
        float across = abs(vLocal.x) > 0.49 ? world.z : world.x;
        vec2 cell = vec2(floor(across / 1.6), floor(world.y / 2.2));
        vec2 inCell = fract(vec2(across / 1.6, world.y / 2.2));
        float window = step(0.25, inCell.x) * step(inCell.x, 0.75) * step(0.3, inCell.y) * step(inCell.y, 0.78);
        float h = cityHash(vec3(cell, vSeed));
        int d = int(vDistrict);
        float on = 0.0;
        for (int i = 0; i < ${DISTRICTS}; i++) { if (i == d) on = uDistrict[i]; }
        float lit = step(h, 0.42) * step(h / 0.42, on);
        // Delilik: pencereler rastgele yanıp söner, renk kırmızıya kayar.
        float flicker = step(0.5, fract(sin(dot(cell, vec2(3.1, 7.7)) + floor(uTime * 8.0) * 1.3) * 91.7));
        lit *= mix(1.0, flicker, uMad);
        float warm = mix(0.8, 1.2, cityHash(vec3(cell.yx, vSeed + 3.0)));
        totalEmissiveRadiance *= window * lit * facing * warm * uLevel;
        totalEmissiveRadiance *= mix(vec3(1.0), vec3(1.4, 0.45, 0.4), uMad);`,
      );
  };

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const districts = new Float32Array(BUILDINGS);
  const sizes = new Float32Array(BUILDINGS * 3);
  const mesh = new THREE.InstancedMesh(geometry, material, BUILDINGS);
  const matrix = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const roofs: THREE.Vector3[] = [];
  for (let i = 0; i < BUILDINGS; i += 1) {
    const angle = (i / BUILDINGS) * Math.PI * 2 + kit.random() * 0.02;
    const r = 98 + kit.random() * 20;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const h = 8 + kit.random() ** 2.2 * 34;
    const w = 4 + kit.random() * 5;
    const d = 4 + kit.random() * 5;
    q.setFromEuler(new THREE.Euler(0, -angle + (kit.random() - 0.5) * 0.3, 0));
    matrix.compose(new THREE.Vector3(x, ground(x, z) + h / 2 - 1, z), q, new THREE.Vector3(w, h, d));
    mesh.setMatrixAt(i, matrix);
    districts[i] = Math.floor((((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / ((Math.PI * 2) / DISTRICTS));
    sizes.set([w, h, d], i * 3);
    if (h > 24) roofs.push(new THREE.Vector3(x, ground(x, z) + h - 0.5, z));
  }
  geometry.setAttribute("district", new THREE.InstancedBufferAttribute(districts, 1));
  geometry.setAttribute("size", new THREE.InstancedBufferAttribute(sizes, 3));
  mesh.castShadow = false;
  root.add(mesh);

  const roofGeometry = new THREE.BufferGeometry().setFromPoints(roofs);
  const roofMaterial = new THREE.PointsMaterial({ color: "#ff2a2a", size: 1.6, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  root.add(new THREE.Points(roofGeometry, roofMaterial));

  // Cenaze alayı: siyah siluetler ve titrek fenerler.
  const mourners = createCrowd(MOURNERS, new THREE.MeshStandardMaterial({ color: "#050506", roughness: 1 }));
  const lanternGeometry = new THREE.BufferGeometry();
  const lanternPositions = new Float32Array(MOURNERS * 3);
  lanternGeometry.setAttribute("position", new THREE.BufferAttribute(lanternPositions, 3));
  const lanterns = new THREE.Points(lanternGeometry, new THREE.PointsMaterial({ color: "#ffc070", size: 0.9, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  root.add(mourners.mesh, lanterns);
  mourners.solidify(kit.colliders);

  // Köşedeki çiçekçi: tente, kovalarda çiçekler.
  const stand = new THREE.Group();
  const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 1), new THREE.MeshStandardMaterial({ color: "#2a1c14" }));
  counter.position.y = 0.5;
  const awning = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 1.6), new THREE.MeshStandardMaterial({ color: "#8e1a1c" }));
  awning.position.set(0, 2.3, 0.2);
  awning.rotation.x = 0.25;
  const poles = [-1.3, 1.3].map((x) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 8), new THREE.MeshStandardMaterial({ color: "#222" }));
    pole.position.set(x, 1.15, 0.9);
    return pole;
  });
  stand.add(counter, awning, ...poles);
  const blooms = new THREE.InstancedMesh(flowerHead(), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.55, emissive: "#ffffff", emissiveIntensity: 0.12 }), 36);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.006, 1, 5), new THREE.MeshStandardMaterial({ color: "#2f5a2a", roughness: 0.8 }), 36);
  const bucketMaterial = new THREE.MeshStandardMaterial({ color: "#8a9096", metalness: 0.7, roughness: 0.35 });
  const palettes = [
    (k: number) => new THREE.Color().setHSL(0.97 + (k % 3) * 0.015, 0.75, 0.45),
    (k: number) => new THREE.Color().setHSL(0.12, 0.15, 0.9 - (k % 2) * 0.05),
    (k: number) => new THREE.Color().setHSL(0.08 + (k % 3) * 0.03, 0.85, 0.55),
  ];
  for (let b = 0; b < 3; b += 1) {
    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.34, 18, 1, true), bucketMaterial);
    bucket.position.set(-0.8 + b * 0.8, 1.17, 0);
    stand.add(bucket);
    for (let k = 0; k < 12; k += 1) {
      const i = b * 12 + k;
      const a = (k / 12) * Math.PI * 2 + b;
      const r = 0.05 + (k % 3) * 0.04;
      const top = new THREE.Vector3(bucket.position.x + Math.cos(a) * r * 1.8, 1.45 + (k % 4) * 0.05, Math.sin(a) * r * 1.8);
      const foot = new THREE.Vector3(bucket.position.x + Math.cos(a) * r * 0.5, 1.05, Math.sin(a) * r * 0.5);
      const length = top.distanceTo(foot);
      const dir = top.clone().sub(foot).normalize();
      matrix.compose(foot.clone().lerp(top, 0.5), q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(1, length, 1));
      stems.setMatrixAt(i, matrix);
      matrix.compose(top, q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), new THREE.Vector3(1.3, 1.3, 1.3));
      blooms.setMatrixAt(i, matrix);
      blooms.setColorAt(i, palettes[b](k));
    }
  }
  stand.add(blooms, stems);
  const standX = GRAMOPHONE.x - 8;
  const standZ = GRAMOPHONE.z - 3;
  stand.position.set(standX, ground(standX, standZ), standZ);
  stand.rotation.y = Math.atan2(GRAMOPHONE.x - standX, GRAMOPHONE.z + 6 - standZ);
  root.add(stand);
  const heldFlower = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: "#ff4f7a", emissive: "#ff2a5a", emissiveIntensity: 0.5 }));
  heldFlower.position.set(-0.28, -0.22, -0.5);
  heldFlower.visible = false;
  kit.camera.add(heldFlower);

  // Uçurumun kenarı: tek bir bank ve kırmızı bir parıltı.
  const bench = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: "#2e2016" }));
  seat.position.y = 0.45;
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.06), new THREE.MeshStandardMaterial({ color: "#2e2016" }));
  back.position.set(0, 0.8, -0.22);
  // Gerçek boyalı ahşap bank (Poly Haven, CC0); yoksa elle yapılmış.
  const realBench = kit.models.get("painted_wooden_bench");
  if (realBench) bench.add(fitModel(realBench, 1.5));
  else bench.add(seat, back);
  bench.position.set(CLIFF.x, ground(CLIFF.x, CLIFF.z), CLIFF.z);
  // Banktaki adam: uçurumun kenarındaki bankta oturur; ayak izleri onun. Uçuruma yürür, döner, yine oturur.
  // Kapüşonlu dev doğrulunca ayağa kalkar; sonda bankın önünde diz çöker (çiçeğin yanında).
  const sitter = createActor(createFigure({ material: new THREE.MeshStandardMaterial({ color: "#111114", roughness: 0.9 }), height: 1.85 }), ground, { speed: 1.1 });
  sitter.figure.group.position.set(CLIFF.x + 0.3, ground(CLIFF.x, CLIFF.z), CLIFF.z + 0.25);
  sitter.figure.group.rotation.y = Math.PI;
  sitter.rest("sit");
  root.add(sitter.figure.group);
  const sitterAt = (dx: number, dy: number, dz: number) => () => sitter.figure.group.position.clone().add(new THREE.Vector3(dx, dy, dz));
  let sitterRest: "sit" | "still" | "kneel" = "sit";
  let sitterBack = -1;
  bench.rotation.y = Math.PI;
  // Uçuruma giden ve bankın önünde dönüp geri gelen ayak izleri.
  const prints = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.16, 0.32),
    new THREE.MeshBasicMaterial({ map: footprintTexture(), color: "#a39c90", transparent: true, depthWrite: false, opacity: 0 }),
    STEPS * 2,
  );
  prints.renderOrder = 1;
  for (let k = 0; k < STEPS * 2; k += 1) {
    const back = k >= STEPS;
    const j = back ? STEPS * 2 - 1 - k : k;
    const z = CLIFF.z + 13 - j * 0.68;
    const x = CLIFF.x + (back ? 1.9 : 1.1) + (k % 2 ? 0.13 : -0.13);
    matrix.compose(new THREE.Vector3(x, ground(x, z) + 0.03, z), q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, (back ? Math.PI : 0) + (k % 3) * 0.05)), new THREE.Vector3(1, 1, 1));
    prints.setMatrixAt(k, matrix);
  }
  root.add(prints);
  const benchFlower = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), new THREE.MeshStandardMaterial({ color: "#2d5a2a" }));
  stem.rotation.z = Math.PI / 2;
  const petal = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshStandardMaterial({ color: "#ff4f7a", emissive: "#ff2a5a", emissiveIntensity: 0.6 }));
  petal.position.x = 0.22;
  benchFlower.add(stem, petal);
  benchFlower.position.set(0.1, 0.52, 0.02);
  benchFlower.rotation.y = 0.4;
  bench.add(benchFlower);

  const cliffGlow = glowSprite("#ff3a3a", 12);
  cliffGlow.position.set(CLIFF.x, ground(CLIFF.x, CLIFF.z) + 1, CLIFF.z - 3);
  root.add(bench, cliffGlow);

  // Ona ait eşyalar: peşine düşer.
  const glowing = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: color, emissiveIntensity: 0.25, ...extra });
  const mementoBuilders: Array<() => THREE.Object3D> = [
    () => {
      // Yüzük: altın halka, tek taş.
      const ring = new THREE.Group();
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 12, 40), glowing("#d9b25a", { metalness: 0.9, roughness: 0.25 })));
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), glowing("#e8f4ff", { roughness: 0.05, emissiveIntensity: 0.6 }));
      gem.position.y = 0.36;
      ring.add(gem);
      return ring;
    },
    () => {
      // Fincan: ince duvarlı, kulplu.
      const cup = new THREE.Group();
      const profile = [[0, 0], [0.12, 0], [0.15, 0.04], [0.17, 0.26], [0.155, 0.26], [0.135, 0.05], [0, 0.05]].map(([x, y]) => new THREE.Vector2(x, y));
      const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 28), glowing("#efe6d6", { side: THREE.DoubleSide }));
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 8, 16, Math.PI * 1.3), glowing("#efe6d6"));
      handle.position.set(0.18, 0.14, 0);
      handle.rotation.z = -Math.PI * 0.65;
      cup.add(body, handle);
      cup.scale.setScalar(1.5);
      return cup;
    },
    () => {
      // Fotoğraf: çerçevede iki kişi; birinin yanı yırtılmış.
      const frame = new THREE.Group();
      frame.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.04), glowing("#3a2618")));
      for (const side of [1, -1]) {
        const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5), new THREE.MeshStandardMaterial({ map: photoTexture(), emissive: "#ffffff", emissiveIntensity: 0.25, emissiveMap: photoTexture() }));
        photo.position.z = side * 0.021;
        photo.rotation.y = side > 0 ? 0 : Math.PI;
        frame.add(photo);
      }
      return frame;
    },
    () => {
      // Mektup: zarf, kırmızı mühür.
      const letter = new THREE.Group();
      letter.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.02), glowing("#e9dfc8")));
      const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16), glowing("#9e1b22"));
      seal.rotation.x = Math.PI / 2;
      seal.position.z = 0.015;
      letter.add(seal);
      return letter;
    },
    () => {
      // Atkı: kırmızı, dalgalı yün.
      const curve = new THREE.CatmullRomCurve3(Array.from({ length: 7 }, (_, i) => new THREE.Vector3((i - 3) * 0.16, Math.sin(i * 1.3) * 0.12, Math.cos(i * 0.9) * 0.1)));
      const scarf = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.055, 8), glowing("#a3202a", { roughness: 0.95 }));
      scarf.scale.set(1, 1, 0.5);
      return scarf;
    },
    () => {
      // Kaset: kendi yaptığı bir derleme.
      const tape = new THREE.Group();
      tape.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.06), glowing("#1c1c1e")));
      const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.12), glowing("#efe6d6"));
      labelMesh.position.set(0, 0.07, 0.031);
      tape.add(labelMesh);
      for (const x of [-0.1, 0.1]) {
        const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.065, 12), glowing("#f2f2f2"));
        reel.rotation.x = Math.PI / 2;
        reel.position.set(x, -0.04, 0);
        tape.add(reel);
      }
      return tape;
    },
  ];
  const mementos = mementoBuilders.slice(0, MEMENTOS).map((build, i) => {
    const m = build();
    m.traverse((object) => (object.castShadow = true));
    root.add(m);
    return { mesh: m, position: new THREE.Vector3(), active: false, seed: i };
  });

  // Bitik kalplerin celladı ve vitrin.
  const hood = new THREE.Mesh(new THREE.ConeGeometry(1, 3.2, 16), new THREE.MeshStandardMaterial({ color: "#050505", roughness: 1 }));
  hood.geometry.translate(0, 1.6, 0);
  hood.scale.setScalar(9);
  root.add(hood);
  kit.colliders.solid(hood, { shape: "round", pad: -0.1 });
  // Cellat gece göğünde kaybolmasın: arkasında kızıl bir hale, kapüşonun silueti okunur.
  const hoodHalo = glowSprite("#ff4a3a", 70);
  (hoodHalo.material as THREE.SpriteMaterial).fog = false;
  root.add(hoodHalo);
  // Cenaze alayının ortası (çekimler alayı izler).
  const procession = new THREE.Vector3();
  const alay = (dx: number, dy: number, dz: number) => () => mourners.position(8, procession).add(new THREE.Vector3(dx, dy, dz));
  const vitrine = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2, 1.2), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.15, roughness: 0.05, clearcoat: 1, depthWrite: false }));
  glass.position.y = 1.8;
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 1.3), new THREE.MeshStandardMaterial({ color: "#161618" }));
  pedestal.position.y = 0.4;
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(-0.8, 0.05, -0.55, 0.65, 0, 0.3);
  shape.bezierCurveTo(0.55, 0.65, 0.8, 0.05, 0, -0.5);
  const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: "#8e1016", roughness: 0.4, emissive: "#3b0205" }));
  heart.position.set(0, 1.8, -0.12);
  const spot = glowSprite("#fff0d8", 1.1);
  spot.position.y = 3.05;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: labelTexture() }));
  label.position.set(0, 0.46, 0.66);
  vitrine.add(glass, pedestal, heart, spot, label);
  const vx = GRAMOPHONE.x + 6;
  const vz = GRAMOPHONE.z - 10;
  vitrine.position.set(vx, ground(vx, vz), vz);
  vitrine.rotation.y = Math.atan2(GRAMOPHONE.x - vx, GRAMOPHONE.z - vz);
  root.add(vitrine);
  // Sabah: bir yatak. Bir yanda uyuyan biri, öbür yanda beyaz örtünün altında kıpırtısız bir beden.
  const bed = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: "#2a1a10", roughness: 0.7 });
  const linen = new THREE.MeshStandardMaterial({ color: "#e9e5dc", roughness: 0.9 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 1.7), wood);
  frame.position.y = 0.2;
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 1.7), wood);
  headboard.position.set(-1.1, 0.6, 0);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.22, 1.6), linen);
  mattress.position.y = 0.46;
  const pillows = [-0.4, 0.4].map((z) => {
    const pillow = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.34, 4, 10), linen);
    pillow.rotation.x = Math.PI / 2;
    pillow.scale.set(1.3, 1, 0.55);
    pillow.position.set(-0.8, 0.62, z);
    return pillow;
  });
  const shroud = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.45, 6, 14), new THREE.MeshStandardMaterial({ color: "#f4f2ec", roughness: 1 }));
  shroud.rotation.z = Math.PI / 2;
  shroud.scale.set(1, 1, 0.7);
  shroud.position.set(0.25, 0.68, 0.4);
  shroud.scale.set(1, 0.85, 0.7);
  const shroudHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), shroud.material);
  shroudHead.scale.set(1, 0.8, 1);
  shroudHead.position.set(-0.72, 0.74, 0.4);
  const sleeperHead = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), new THREE.MeshStandardMaterial({ color: "#1a1412", roughness: 0.8 }));
  sleeperHead.position.set(-0.75, 0.75, -0.4);
  const blanket = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 1.2, 4, 12), new THREE.MeshStandardMaterial({ color: "#5c5f66", roughness: 1 }));
  blanket.rotation.z = Math.PI / 2;
  blanket.scale.set(1, 1, 0.6);
  blanket.position.set(0.2, 0.62, -0.4);
  bed.add(frame, headboard, mattress, ...pillows, shroud, shroudHead, sleeperHead, blanket);
  const bx = GRAMOPHONE.x - 3;
  const bz = GRAMOPHONE.z - 15;
  bed.position.set(bx, ground(bx, bz), bz);
  bed.rotation.y = 0.6;
  root.add(bed);
  let bedLevel = 0;
  let bedTarget = 0;
  kit.colliders.solid(frame, { when: () => bedLevel > 0.5 });
  let fading = -1;

  // Şehrin yağmuru: fenerlerin ve lambaların ışığında görünen ince çizgiler.
  const rain = createRain(1100, "#c8cfdc", new THREE.Vector3(56, 24, 56), 22);
  root.add(rain.lines);
  const rainCenter = new THREE.Vector3();
  // Cenazenin beyaz çiçekleri: alayın geçtiği yolda havada süzülür.
  const lilies = createPetals(140, "#f4f0e8", 0.13, new THREE.Vector3(60, 10, 60), 0.5);
  root.add(lilies.mesh);
  const lilyCenter = new THREE.Vector3(0, 0, 0);
  // Alayın yolu boyunca sokak lambaları: yere sıcak ışık konileri düşer, siluetler okunur.
  const streetLamps = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * 48.5;
    const z = Math.sin(a) * 48.5;
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 5, 8), new THREE.MeshStandardMaterial({ color: "#1c1c1e", metalness: 0.6, roughness: 0.4 }));
    pole.position.y = 2.5;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1), pole.material);
    arm.position.set(0, 4.95, -0.45);
    const bulb = glowSprite("#ffd9a0", 1.6);
    bulb.position.set(0, 4.85, -0.9);
    const cone = lightCone("#ffcf8a", 5, 2.2);
    cone.position.set(0, 4.85, -0.9);
    group.add(pole, arm, bulb, cone);
    group.position.set(x, ground(x, z), z);
    group.rotation.y = Math.atan2(-x, -z) + Math.PI;
    root.add(group);
    kit.colliders.solid(pole, { shape: "round" });
    return { group, bulb, cone };
  });

  const colliders = [block(kit, standX, standZ, 1.4), block(kit, vx, vz, 1.3), block(kit, CLIFF.x, CLIFF.z, 0.9)];

  let dark = 0;
  let funeral = 0;
  let funeralTarget = 0;
  let flowers = 0;
  let flowersTarget = 0;
  let high = 0;
  let highTarget = 0;
  let cliff = 0;
  let cliffTarget = 0;
  let chase = false;
  let mad = 0;
  let madTarget = 0;
  let executioner = 0;
  let executionerTarget = 0;
  let vitrineLevel = 0;
  let vitrineTarget = 0;
  let touchedFlash = 0;
  const toPlayer = new THREE.Vector3();

  const interactables = [
    ...districtOn.map((_, index) =>
      gazeTarget({
        position: (target) => {
          const angle = ((index + 0.5) / DISTRICTS) * Math.PI * 2;
          const x = Math.cos(angle) * 106;
          const z = Math.sin(angle) * 106;
          return target.set(x, ground(x, z) + 12, z);
        },
        radius: 22,
        reach: 190,
        label: () => (districtOn[index] ? "Mahallenin ışıklarını söndür" : null),
        use: () => {
          districtOn[index] = 0;
          dark += 1;
          kit.sfx.cue("switch");
          announce(kit.hud, dark === DISTRICTS ? "Şehir karardı. Yalnızca cenazenin fenerleri yanıyor." : `Kararan mahalleler ${dark} / ${DISTRICTS}`, dark === DISTRICTS ? 6 : 2.5);
        },
      }),
    ),
    secretItem(kit, "delilik-cicek", (target) => stand.getWorldPosition(target).setY(stand.position.y + 1.2), {
      label: "Kendine bir çiçek al",
      radius: 1.2,
      reach: 3,
      available: () => flowers > 0.5,
      onFound: () => (heldFlower.visible = true),
    }),
  ];

  return {
    root,
    hint: "Onsuz şehir bir cenaze. Mahallelere bakıp E ile ışıklarını söndür; peşine düşen eşyalardan kaç.",
    interactables,
    colliders,
    // Klip: gece şehir → pastel çiçekçi → sarhoş renk kayması → soğuk ayak izleri → koşan omuz kamerası
    // → neon/parazitli delilik → şafakta yatak → kan kırmızı cellat → mum ışığında müze vitrini → sönen şehir.
    shots: [
      // Banktaki adam: uçuruma yürür, kenarda durur, geri döner; devin önünde küçücük kalır.
      { at: L.cliff + 1.5, from: sitterAt(0, 1.6, 3.6), to: sitterAt(0, 1.4, 2.2), look: sitterAt(0, 1.3, 0), lookTo: sitterAt(0, 0.5, -12), fov: 50, handheld: 0.03, grade: "noir" },
      { at: L.cliff + 8, from: sitterAt(2.6, 0.9, -1.2), to: sitterAt(1.8, 1.0, -0.6), look: sitterAt(0, 1.4, 0), fov: 40, grade: "noir" },
      { at: L.hangman + 4, from: sitterAt(0, 1.2, 3.2), to: sitterAt(0, 3, 6), look: sitterAt(0, 1.4, 0), lookTo: sitterAt(0, 30, -60), fov: 62, curve: "linear", grade: "night" },
      { at: 0, from: ridge(1.8, 60), path: [pt(-60, 40, 90), pt(-30, 22, 70)], to: cam(0, 12, 80), look: pt(0, 20, -100), lookTo: pt(0, 6, -60), fov: 52, curve: "linear", grade: "night", in: "fade" },
      { at: 6.7, from: rim(3.2, 4, 90), to: rim(3.05, 4, 90), look: rim(2.6, 12, 104), fov: 44, curve: "linear", grade: "night" },
      { at: L.city, from: alay(-10, 9, 14), to: alay(-4, 6, 16), look: alay(0, 0.8, 0), fov: 44, curve: "linear", grade: "night" },
      { at: 17, from: alay(-3, 1.1, -5.5), to: alay(-2.4, 1.1, -4.6), look: alay(4, 3.5, 7), fov: 40, grade: "candle" },
      { at: L.flowers, orbit: { center: cam(-1, 0, 69), radius: 4, height: 1.8, from: 0.4, to: 1.5 }, look: cam(-1, 1.1, 69), fov: 44, curve: "linear", grade: "pastel" },
      { at: 25, from: attach(stand, 0.2, 1.9, 1.8), to: attach(stand, 0, 1.75, 1.3), look: attach(stand, -0.2, 1.4, 0), fov: 34, grade: { ...GRADES.pastel, soft: 0.6 } },
      { at: 28.5, from: me(kit, 4, 3, 7), to: me(kit, 3, 2.4, 5), look: follow(stand, 0, 1, 0), fov: 44, grade: "night" },
      { at: L.high, from: rim(1.2, 14, 60), path: arc(0, 0, 60, 14, 1.2, 2.2, 3), to: rim(2.2, 10, 60), look: pt(0, 4, 0), lookTo: pt(-40, 10, -90), fov: 55, roll: 0.12, curve: "linear", grade: HIGH, in: "glitch" },
      { at: 36.7, from: me(kit, 0, 1.7, 0), look: me(kit, 10, 3, -10), lookTo: me(kit, -10, 3, -10), fov: 60, roll: 0.3, rollTo: -0.3, grade: HIGH },
      { at: L.cliff, from: cam(CLIFF.x + 0.8, 0.5, CLIFF.z + 12), to: cam(CLIFF.x + 0.9, 0.45, CLIFF.z + 6), look: cam(CLIFF.x + 1.2, 0.4, CLIFF.z - 3), fov: 40, grade: "cold" },
      { at: 45.5, from: cam(CLIFF.x + 1.6, 3.8, CLIFF.z + 4), to: cam(CLIFF.x + 1.6, 3, CLIFF.z + 2.6), look: cam(CLIFF.x + 1.5, 0, CLIFF.z + 0.6), fov: 46, grade: "cold" },
      { at: 48.5, from: cam(CLIFF.x + 1.5, 1.6, CLIFF.z + 3), to: cam(CLIFF.x + 1, 1.5, CLIFF.z + 2), look: cam(CLIFF.x, 0.5, CLIFF.z - 8), fov: 46, grade: "blood" },
      { at: L.yours, from: me(kit, 0, 1.5, 0), look: follow(mementos[0].mesh), fov: 52, handheld: 0.1, grade: "fever" },
      { at: 57, from: me(kit, 0, 1.6, 0), to: me(kit, -14, 1.6, -14), look: me(kit, -40, 1.4, -40), fov: 62, handheld: 0.14, curve: "linear", grade: "fever" },
      { at: 60.5, from: follow(mementos[1].mesh, 1.4, 0.3, 1.4), to: follow(mementos[1].mesh, 1, 0.2, 1), look: follow(mementos[1].mesh), fov: 36, grade: "memory" },
      { at: 63.5, from: me(kit, 8, 10, 8), to: me(kit, 6, 12, 10), look: me(kit), fov: 52, grade: "fever" },
      { at: L.remind, orbit: { center: me(kit), radius: 6, height: 1.8, from: 0, to: 2 }, look: me(kit, 0, 1.4, 0), fov: 55, curve: "linear", handheld: 0.06, grade: "fever" },
      { at: 70.5, from: follow(mementos[2].mesh, 1, 0.15, 1), to: follow(mementos[2].mesh, 0.7, 0.1, 0.7), look: follow(mementos[2].mesh), fov: 34, grade: { ...GRADES.memory, soft: 0.7 } },
      { at: 74, from: me(kit, 0, 1.6, 0), to: me(kit, 16, 1.6, -10), look: me(kit, 40, 1.4, -24), fov: 62, handheld: 0.14, curve: "linear", grade: "fever" },
      { at: L.madness, from: rim(-1.2, 6, 92), to: rim(-1.35, 6, 92), look: rim(-1.6, 14, 106), fov: 34, curve: "linear", grade: "neon", in: "glitch" },
      { at: L.mad1, from: pt(0, 10, 60), to: pt(0, 16, 40), look: pt(0, 20, -100), fov: 42, roll: 0.2, rollTo: -0.1, curve: "linear", grade: "neon", in: "glitch" },
      { at: L.mad2, from: rim(0, 18, 80), path: arc(0, 0, 84, 16, 0, 0.9, 2), to: rim(0.9, 14, 80), look: CENTER, lookTo: rim(1.5, 12, 104), fov: 60, roll: -0.2, curve: "linear", grade: HIGH, in: "glitch" },
      { at: L.mad3, from: alay(-6, 1.2, 6), to: alay(-4, 1.2, 8), look: pt(0, 16, -100), fov: 40, grade: "neon", in: "glitch" },
      { at: L.mad4, from: me(kit, 0, 1.7, 0), look: me(kit, 0, 8, -30), fov: 64, roll: 0, rollTo: 1.3, grade: HIGH, in: "glitch" },
      { at: L.mad5, from: pt(20, 14, 70), to: pt(10, 12, 60), look: pt(-10, 18, -100), fov: 40, curve: "linear", grade: "neon", in: "glitch", out: "fade" },
      { at: L.city2, from: alay(12, 2.2, 8), to: alay(4, 1.8, 12), look: alay(0, 1.2, 0), fov: 46, curve: "linear", grade: "night", in: "fade" },
      { at: L.corpse, from: follow(bed, 0.2, 3.6, 0.3), to: follow(bed, 0.1, 2.7, 0.2), look: follow(bed), fov: 50, grade: { ...GRADES.dawn, soft: 0.5 }, in: "white" },
      { at: 131, from: follow(bed, 2.8, 1, 1.6), to: follow(bed, 2.2, 0.9, 1.2), look: follow(bed, 0, 0.6, 0), fov: 40, grade: "dawn" },
      { at: 135.5, from: cam(10, 2, -60), to: cam(14, 2, -70), look: cam(20, 10, -92), fov: 50, grade: "blood" },
      { at: L.hangman, from: cam(12, 0.8, -66), to: cam(14, 0.6, -72), look: cam(20, 24, -92), fov: 58, grade: "blood", in: "flash", flashColor: "#ff2a1a" },
      { at: 143.4, from: cam(-10, 3, -40), to: cam(-6, 3, -46), look: cam(20, 16, -92), fov: 40, grade: "blood" },
      { at: L.vitrine, from: cam(13, 2.6, 66.5), to: cam(13, 2.2, 64.5), look: cam(13, 1.8, 62), fov: 40, grade: "candle" },
      { at: 150.5, from: attach(vitrine, 0, 0.5, 1.5), to: attach(vitrine, 0, 0.47, 1.05), look: attach(vitrine, 0, 0.46, 0.66), fov: 30, grade: "candle" },
      { at: 154, from: attach(vitrine, 1.8, 2, 1.8), to: attach(vitrine, 1.2, 1.9, 1.3), look: attach(vitrine, 0, 1.8, 0), fov: 36, grade: { ...GRADES.candle, soft: 0.6 } },
      { at: L.yours2, from: me(kit, 0, 2.5, 8), to: me(kit, 0, 4, 12), look: me(kit, 0, 1.4, 0), fov: 58, handheld: 0.05, grade: "fever" },
      { at: 164, from: me(kit, 0, 1.6, 0), to: me(kit, 14, 1.6, -14), look: me(kit, 40, 1.4, -40), fov: 62, handheld: 0.14, curve: "linear", grade: "fever" },
      { at: 167.5, from: follow(mementos[4].mesh, 1.3, 0.3, 1.3), to: follow(mementos[4].mesh, 0.9, 0.2, 0.9), look: follow(mementos[4].mesh), fov: 36, grade: "memory" },
      { at: L.remind2, orbit: { center: me(kit), radius: 10, height: 3, from: 3, to: 4.4 }, look: me(kit, 0, 1.4, 0), fov: 52, curve: "linear", grade: "fever" },
      { at: 178, from: me(kit, 0, 1.6, 0), to: me(kit, -16, 1.6, -8), look: me(kit, -40, 1.4, -20), fov: 62, handheld: 0.14, curve: "linear", grade: "fever" },
      { at: 181.5, from: me(kit, 0, 1.5, 0), look: follow(mementos[5].mesh), fov: 50, handheld: 0.1, grade: "fever" },
      { at: L.madness2, from: pt(0, 10, 60), to: pt(0, 11, 56), look: pt(0, 18, -100), fov: 34, curve: "linear", grade: "neon", in: "glitch" },
      { at: L.madB1, from: ridge(1.5, 40), path: [pt(0, 34, 40)], to: pt(0, 26, -40), look: pt(0, 10, -100), lookTo: CENTER, fov: 50, curve: "linear", grade: "neon", in: "glitch" },
      { at: L.madB2, from: me(kit, 0, 1.7, 0), look: me(kit, 0, 8, -30), fov: 64, roll: 0, rollTo: -1.3, grade: HIGH, in: "glitch" },
      { at: L.madB3, from: alay(6, 1.2, 6), to: alay(4, 1.2, 8), look: pt(0, 16, -100), fov: 40, grade: "neon", in: "glitch" },
      { at: L.madB4, from: rim(3, 8, 58), path: arc(0, 0, 58, 8, 3, 4.4, 3), to: rim(4.4, 8, 58), look: pt(0, 2, 0), lookTo: rim(5, 10, 104), fov: 52, roll: 0.15, curve: "linear", grade: HIGH, in: "glitch" },
      { at: L.madB5, from: pt(-20, 14, 70), to: pt(-10, 12, 60), look: pt(10, 18, -100), fov: 40, curve: "linear", grade: "neon", in: "glitch", out: "fade" },
      { at: 226, from: cam(30, 3, -40), path: [cam(10, 4, -60)], to: cam(-5, 2, -80), look: pt(-6, 4, -150), fov: 50, curve: "linear", grade: "cold", in: "fade" },
      { at: 236, from: cam(CLIFF.x + 1.4, 0.4, CLIFF.z + 5), to: cam(CLIFF.x + 1.5, 0.35, CLIFF.z + 3), look: cam(CLIFF.x + 1.5, 0, CLIFF.z + 0.5), fov: 36, grade: "cold" },
      { at: L.out1, from: rim(0.3, 6, 84), path: arc(0, 0, 86, 7, 0.3, 1.2, 2), to: rim(1.2, 6, 84), look: CENTER, lookTo: rim(2, 8, 104), fov: 50, curve: "linear", grade: "night" },
      { at: L.out2, from: cam(18, 2.4, 70), to: cam(16, 2.2, 67), look: cam(13, 1.8, 62), fov: 36, grade: { ...GRADES.candle, soft: 0.5 } },
      { at: L.out3, from: cam(CLIFF.x - 2.2, 1.5, CLIFF.z + 0.3), to: cam(CLIFF.x - 1.6, 1.3, CLIFF.z + 0.1), look: cam(CLIFF.x + 0.1, 0.55, CLIFF.z - 0.1), fov: 38, grade: "cold" },
      { at: L.out4, from: cam(CLIFF.x + 1, 1.5, CLIFF.z + 3), to: cam(CLIFF.x + 2, 14, CLIFF.z + 16), look: cam(CLIFF.x, 0.5, CLIFF.z), fov: 48, curve: "linear", grade: "cold", out: "fade" },
    ],
    beats: [
      { at: L.city, id: "funeral", line: "Ufuktaki şehrin önünden fenerli bir alay geçiyor." },
      { at: L.flowers, id: "flowers", line: "Köşede bir çiçekçi tezgâhı; kovalarda taze çiçekler." },
      { at: L.high, id: "high", line: "Şehir sarhoş gibi sallanıyor; renkler birbirinden kayıyor." },
      { at: L.cliff, id: "cliff", line: "Banktaki adam kalkıp uçurumun kenarına yürüyor; kenarda duruyor, geri dönüyor. Ayak izleri onun." },
      { at: L.yours, id: "chase", line: "Sokaktaki eşyalar peşine düşüyor: bir fincan, bir atkı, bir fotoğraf." },
      { at: L.remind, id: "chase-more", line: "Eşyalar hızlanıyor; kaçtıkça çoğalıyorlar." },
      { at: L.mad1, id: "mad", line: "Pencereler çıldırmış gibi yanıp sönüyor." },
      { at: L.city2, id: "funeral2", line: "Alay yeniden geçiyor; fenerler daha kısık." },
      { at: L.corpse, id: "waking", line: "Sabah. Bir yatak: bir yanda uyuyan biri, öbür yanda beyaz örtünün altında kıpırtısız bir beden." },
      { at: L.hangman, id: "executioner", line: "Kapüşonlu dev bir figür yavaşça doğruluyor; gölgesi şehri örtüyor." },
      { at: L.vitrine, id: "vitrine", line: "Camın arkasında çatlak bir kalp; altında küçük bir müze etiketi." },
      { at: L.yours2, id: "chase2" },
      { at: L.madB1, id: "mad2", line: "Pencereler yine çıldırıyor." },
      { at: L.out1, id: "fade", line: "Mahalleler birer birer kararıyor." },
      { at: L.out3, id: "flower", line: "Bankın üstünde tek bir çiçek." },
      { at: L.end, id: "end" },
    ],
    onBeat(id) {
      if (id === "cliff") {
        sitter.goTo(CLIFF.x + 1.4, CLIFF.z - 9.5, false, Math.PI);
        sitterRest = "still";
        sitterBack = 9;
      }
      if (id === "executioner") {
        sitter.goTo(CLIFF.x + 2.2, CLIFF.z + 2.5, false, Math.PI);
        sitterRest = "still";
      }
      if (id === "flower") {
        sitter.goTo(CLIFF.x + 0.6, CLIFF.z + 1.3, false, Math.PI);
        sitterRest = "kneel";
      }
      if (id === "funeral" || id === "funeral2") funeralTarget = 1;
      if (id === "flowers") flowersTarget = 1;
      if (id === "high") highTarget = 1;
      if (id === "cliff") cliffTarget = 1;
      if (id === "chase" || id === "chase-more" || id === "chase2") {
        chase = true;
        const count = id === "chase" ? 3 : MEMENTOS;
        mementos.forEach((m, i) => {
          if (i >= count || m.active) return;
          m.active = true;
          const a = kit.random() * Math.PI * 2;
          m.position.set(kit.player.position.x + Math.cos(a) * 18, 0, kit.player.position.z + Math.sin(a) * 18);
        });
      }
      if (id === "mad" || id === "mad2") {
        madTarget = 1;
        highTarget = 0.5;
      }
      if (id === "funeral2") madTarget = 0;
      if (id === "waking") bedTarget = 1;
      if (id === "executioner") bedTarget = 0;
      if (id === "flower") benchFlower.visible = true;
      if (id === "executioner") executionerTarget = 1;
      if (id === "vitrine") {
        vitrineTarget = 1;
        executionerTarget = 0;
      }
      if (id === "fade") {
        fading = 0;
        chase = false;
        madTarget = 0;
        highTarget = 0;
        mementos.forEach((m) => (m.active = false));
      }
    },
    reset() {
      sitterRest = "sit";
      sitterBack = -1;
      sitter.figure.group.position.set(CLIFF.x + 0.3, ground(CLIFF.x, CLIFF.z), CLIFF.z + 0.25);
      sitter.figure.group.rotation.y = Math.PI;
      sitter.rest("sit");
      dark = 0;
      districtOn.fill(1);
      funeral = funeralTarget = flowers = flowersTarget = high = highTarget = cliff = cliffTarget = mad = madTarget = executioner = executionerTarget = vitrineLevel = vitrineTarget = touchedFlash = 0;
      chase = false;
      mementos.forEach((m) => (m.active = false));
      heldFlower.visible = false;
      benchFlower.visible = false;
      bedLevel = bedTarget = 0;
      fading = -1;
      for (let i = 0; i < MOURNERS; i += 1) mourners.presence[i] = 0;
    },
    update(dt, time, level) {
      if (sitterBack > 0) {
        sitterBack -= dt;
        if (sitterBack <= 0) {
          sitter.goTo(CLIFF.x + 0.3, CLIFF.z + 0.25, false, Math.PI);
          sitterRest = "sit";
        }
      }
      if (sitter.arrived) sitter.rest(sitterRest);
      sitter.update(dt, time);
      sitter.figure.group.visible = level > 0.05;
      uniforms.uLevel.value = level;
      uniforms.uTime.value = time;
      mad += (madTarget - mad) * Math.min(1, dt * 1.2);
      uniforms.uMad.value = mad;
      for (let i = 0; i < DISTRICTS; i += 1) {
        districtLevel[i] += (districtOn[i] - districtLevel[i]) * Math.min(1, dt * 0.8);
        uniforms.uDistrict.value[i] = districtLevel[i];
      }
      roofMaterial.opacity = level * (Math.sin(time * 3.2) > 0.6 ? 1 : 0.15) * (districtLevel.reduce((a, b) => a + b, 0) / DISTRICTS);

      funeral += (funeralTarget * level - funeral) * Math.min(1, dt * 0.6);
      for (let i = 0; i < MOURNERS; i += 1) {
        const a = time * 0.035 + (i / MOURNERS) * 0.9;
        const x = Math.cos(a) * 44;
        const z = Math.sin(a) * 44;
        mourners.place(i, x, z, -a, 1);
        mourners.presence[i] = Math.min(1, funeral * 1.4 - i * 0.02);
        lanternPositions.set([x + Math.sin(a) * 0.5, ground(x, z) + 1.3 + Math.sin(time * 5 + i) * 0.04, z - Math.cos(a) * 0.5], i * 3);
      }
      mourners.update(time);
      lanternGeometry.attributes.position.needsUpdate = true;
      (lanterns.material as THREE.PointsMaterial).opacity = funeral * (0.8 + 0.2 * Math.sin(time * 9));

      flowers += (flowersTarget * level - flowers) * Math.min(1, dt);
      stand.scale.setScalar(Math.max(0.001, ease(flowers)));

      // Kafa: kamera dalgalanır (delilikte daha sert).
      high += (highTarget - high) * Math.min(1, dt * 0.8);
      kit.effects.roll = (Math.sin(time * 0.9) * 0.08 + Math.sin(time * 2.3) * 0.03) * high * level;

      cliff += (cliffTarget * level - cliff) * Math.min(1, dt * 0.8);
      // Yakından bakınca parıltı kadrajı boğmasın.
      const glowNear = THREE.MathUtils.smoothstep(kit.camera.position.distanceTo(cliffGlow.position), 3, 9);
      (cliffGlow.material as THREE.SpriteMaterial).opacity = cliff * (0.35 + 0.15 * Math.sin(time * 2)) * glowNear;
      cliffGlow.visible = cliff > 0.01;
      bench.visible = level > 0.3;
      // Uçurumun kenarındaki banka gidip dönmek: gizli keşif.
      if (cliff > 0.5 && Math.hypot(kit.player.position.x - CLIFF.x, kit.player.position.z - CLIFF.z) < 2) kit.secrets.reveal("delilik-ucurum");

      // Eşyalar oyuncunun peşine düşer; dokunursa anı çarpar (renk çekilir).
      touchedFlash = Math.max(0, touchedFlash - dt / 1.5);
      mementos.forEach((m) => {
        m.mesh.visible = m.active && level > 0.3;
        if (!m.active) return;
        toPlayer.subVectors(kit.player.position, m.position).setY(0);
        const d = toPlayer.length();
        if (chase && d > 0.1) m.position.addScaledVector(toPlayer.normalize(), Math.min(d, dt * 2.6));
        if (d < 1.2 && touchedFlash <= 0) {
          touchedFlash = 1;
          kit.sfx.cue("pulse");
          kit.effects.shake = 0.12;
          const a = kit.random() * Math.PI * 2;
          m.position.set(kit.player.position.x + Math.cos(a) * 22, 0, kit.player.position.z + Math.sin(a) * 22);
        }
        m.mesh.position.set(m.position.x, ground(m.position.x, m.position.z) + 1.3 + Math.sin(time * 2 + m.seed) * 0.25, m.position.z);
        m.mesh.rotation.set(time * 0.6 + m.seed, time * 0.9, 0);
      });
      kit.effects.saturation = 1 - touchedFlash * 0.9;

      executioner += (executionerTarget * level - executioner) * Math.min(1, dt * 0.5);
      hood.position.set(20, ground(20, -92) - 30 * (1 - ease(executioner)), -92);
      hoodHalo.position.set(20, hood.position.y + 16, -112);
      hoodHalo.visible = executioner > 0.01;
      (hoodHalo.material as THREE.SpriteMaterial).opacity = ease(executioner) * 0.5 * level;
      hood.visible = executioner > 0.01;
      // Ayak izleri uçurum anından sonra kalır.
      (prints.material as THREE.MeshBasicMaterial).opacity = Math.min(1, cliff * 1.2) * 0.85 * level;
      prints.visible = cliff > 0.02;
      bedLevel += (bedTarget * level - bedLevel) * Math.min(1, dt * 1.2);
      bed.scale.setScalar(Math.max(0.001, ease(bedLevel)));
      bed.visible = bedLevel > 0.01;
      // Final: mahalleler birer birer söner (oyuncu sonra yeniden yakamaz; şarkı bitince geri gelir).
      if (fading >= 0) {
        fading += dt;
        const off = Math.min(DISTRICTS, Math.floor(fading / 2.2));
        for (let i = 0; i < off; i += 1) districtOn[i] = 0;
      }
      if (benchFlower.visible && level > 0.5) {
        const light = kit.lights[1];
        light.color.set("#ffd6de");
        light.distance = 7;
        bench.localToWorld(light.position.set(0, 1.8, -0.9));
        light.intensity = 16 * level;
      }
      // Yağmur ve çiçekler; sokak lambaları cenazeyle yanar, delilikte titrer.
      rain.level = Math.max(funeral * 0.9, mad * 0.6) * level;
      rainCenter.copy(kit.camera.position).setY(kit.camera.position.y - 8);
      rain.update(dt, rainCenter);
      lilies.level = funeral * level * 0.8;
      lilyCenter.set(0, ground(0, 44) - 1, 0);
      lilies.update(time, lilyCenter);
      streetLamps.forEach((lamp, i) => {
        const flicker = mad > 0.1 ? (Math.sin(time * 23 + i * 3) > -0.3 ? 1 : 0.1) : 1;
        // Kameraya çok yakın lamba kadrajı boğmasın.
        const near = THREE.MathUtils.smoothstep(kit.camera.position.distanceTo(lamp.group.position), 4, 10);
        const on = Math.max(funeral, 0.35) * level * flicker * near * (districtLevel.reduce((a, b) => a + b, 0) / DISTRICTS * 0.6 + 0.4);
        (lamp.bulb.material as THREE.SpriteMaterial).opacity = on;
        setConeLevel(lamp.cone, on * 0.9);
        lamp.group.visible = level > 0.05;
      });

      vitrineLevel += (vitrineTarget * level - vitrineLevel) * Math.min(1, dt * 0.8);
      vitrine.scale.setScalar(Math.max(0.001, ease(vitrineLevel)));
      heart.rotation.y = Math.sin(time * 0.5) * 0.25;
    },
  };
}
