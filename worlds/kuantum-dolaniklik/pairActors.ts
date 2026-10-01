import * as THREE from "three";
import { createFigure, type Figure, type FigurePose } from "../../engine/fx/figure";
import { approach } from "../../engine/fx/fade";
import { createEmitter } from "../../engine/fx/emitter";
import { glowSprite } from "../../engine/fx/glow";
import type { Shot } from "../../engine/game/director";

/**
 * Dolanık çift: bizim adam (siyah gömlek) ve kadın (açık, soluk elbise). İki kişi tek bir fiziksel sistem:
 * birine olan her anlamlı şeyin öbüründe bağlı bir sonucu var. Bilim anlatılmaz; kural tekrar eden neden-sonuçla
 * görülür. Yalnızca şarkı çalarken görünürler.
 * Perdeler (şarkının dize zamanlarına oturur): iki çiçek (birininki açarken öbürününki solar) → Ay'a çıkan yol
 * (adam koşar, kadın gömlek cebinde) → aynı aşk / ayrı hâller (adam başını sallayınca cepteki kadın da, Ay da)
 * → tasma (kadının elinde, adamın boynunda; yürürler) → ayna (yansımada roller ters, kesme yok) → yalnızlık bir
 * nesne (saydam koza daralır, kadın zarın öbür yanında) → koza zarı kadehin camı olur (yeşil sıvı) → yeşil sıvı
 * yükselip tasma olur → gamze kıyameti (yanaktaki gamzede bir yıldız, evren; içeride iki kalp aynı anda atar,
 * iki beden tek siluet; son notada ikiye ayrılır).
 */

/** Çiçek perdesinde iki ayrı boşluk. */
const SPOT_A = new THREE.Vector3(-9, 0, 2);
const SPOT_B = new THREE.Vector3(9, 0, -2);
/** Aya çıkan yolun başı: A buradan koşmaya başlar; yol ayın altına doğru tırmanır. */
const ROAD_START = new THREE.Vector3(-9, 0, -9);
/** Uzun boş yol: aynanın önünde, +z yönünde. */
const PATH_X = 13.6;
const PATH_Z0 = -7;
const PATH_SPEED = 1.0;
/** Ayna: doğu yarıda, x = 16 düzleminde, −x'e bakan uzun bir cam. */
const MIRROR_X = 16;
/** Masa: odanın ortası; adam doğuda, kadın batıda, ayakta. */
const TABLE_A = new THREE.Vector3(1.2, 0, 0);
const TABLE_B = new THREE.Vector3(-1.2, 0, 0);
/** Gamzenin içi: tavanın üstünde kara bir küre; iki kalp ve iki siluet. */
export const VOID = new THREE.Vector3(0, 56, 0);
const VOID_FLOOR = VOID.y - 5;
const COLLAR_Y = 1.52;

/** Dize zamanları (world.ts'deki STORY ile aynı). */
const T = { ikiz: 22, cicek: 66, ay: 72.4, tafra: 92, bag: 118.6, yalnizlik: 125.1, ara: 136, zehir: 171.4, tasma: 177.9, gulus: 197.6, son: 217 };

export interface PairActors {
  readonly a: Figure;
  readonly b: Figure;
  /** Aynanın arkasındaki yansımalar (test ve sonda için). */
  readonly copies: THREE.Group;
  /** Ayın parlaklığı 0..1 (adamın başını sallamasına bağlı). */
  readonly moonMood: number;
  /** Kadehteki yeşilin yükselip tasma olması 0..1 (kadeh sıvısı buna göre azalır). */
  readonly greenRise: number;
  /** Kadının yanağındaki gamzenin dünya konumu. */
  dimpleAt(out: THREE.Vector3): THREE.Vector3;
  update(dt: number, time: number, act: string, playing: boolean, songTime: number): void;
  shots(moon: THREE.Vector3): Shot[];
}

/** Yol dokusu: mürekkep asfalt, kesik orta çizgi. */
function roadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 1024;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#8a7a48";
  g.fillRect(0, 0, 128, 1024);
  g.fillStyle = "#fff0a0";
  for (let y = 0; y < 1024; y += 96) g.fillRect(58, y, 12, 48);
  g.fillStyle = "#3a2e10";
  g.fillRect(0, 0, 6, 1024);
  g.fillRect(122, 0, 6, 1024);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 3);
  return texture;
}

/** Gamze: yanakta küçük, yumuşak bir çukur (koyu kavis). */
function dimpleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, "rgba(60,30,25,0.85)");
  grad.addColorStop(0.5, "rgba(90,50,40,0.35)");
  grad.addColorStop(1, "rgba(120,70,60,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Kalp: iki yay ve bir uç; kalınlığı var. */
function heartGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.5);
  shape.bezierCurveTo(-0.55, -0.15, -0.7, 0.35, -0.3, 0.5);
  shape.bezierCurveTo(-0.1, 0.6, 0, 0.45, 0, 0.35);
  shape.bezierCurveTo(0, 0.45, 0.1, 0.6, 0.3, 0.5);
  shape.bezierCurveTo(0.7, 0.35, 0.55, -0.15, 0, -0.5);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, curveSegments: 18 });
  geometry.center();
  return geometry;
}

interface Flower {
  group: THREE.Group;
  bloom: THREE.Group;
  petals: THREE.Mesh[];
  material: THREE.MeshStandardMaterial;
  stem: THREE.Mesh;
  color: THREE.Color;
  level: number;
}

function makeFlower(color: string): Flower {
  const group = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.011, 0.4, 6), new THREE.MeshStandardMaterial({ color: "#3f7a2c", roughness: 0.8 }));
  stem.position.y = 0.2;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), stem.material);
  leaf.scale.set(1, 0.3, 2.2);
  leaf.position.set(0.03, 0.16, 0);
  leaf.rotation.y = 0.6;
  const bloom = new THREE.Group();
  bloom.position.y = 0.4;
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const petals: THREE.Mesh[] = [];
  for (let k = 0; k < 8; k += 1) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 8), material);
    petal.scale.set(1, 0.22, 1.6);
    const a = (k / 8) * Math.PI * 2;
    petal.position.set(Math.sin(a) * 0.042, 0.008, Math.cos(a) * 0.042);
    petal.rotation.y = a;
    petal.rotation.x = -0.35;
    bloom.add(petal);
    petals.push(petal);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), new THREE.MeshStandardMaterial({ color: "#ffd75a", roughness: 0.5 }));
  bloom.add(center);
  group.add(stem, leaf, bloom);
  group.traverse((child) => {
    child.castShadow = true;
  });
  return { group, bloom, petals, material, stem, color: new THREE.Color(color), level: 0.15 };
}

const DEAD = new THREE.Color("#5e4330");

function setFlower(flower: Flower, level: number): void {
  const s = 0.2 + 0.8 * level;
  for (const petal of flower.petals) petal.scale.set(s, 0.22 * s, 1.6 * s);
  flower.material.color.copy(DEAD).lerp(flower.color, level);
  // Solunca baş öne düşer, sap bükülür.
  flower.bloom.rotation.x = (1 - level) * -1.15;
  flower.stem.rotation.x = (1 - level) * -0.3;
}

export function createPairActors(scene: THREE.Scene, moon: THREE.Vector3, goblet: THREE.Object3D): PairActors {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const figureA = createFigure({ kind: "man", outfit: "man_black", height: 1.8 });
  const figureB = createFigure({ kind: "woman", outfit: "woman_muted", height: 1.78 });
  group.add(figureA.group, figureB.group);
  let wasPlaying = false;

  // --- Çiçekler: ikisinin elinde birer çiçek; birininki açarken öbürününki solar ---------------
  const flowerA = makeFlower("#ff6b9d");
  const flowerB = makeFlower("#ffb347");
  figureA.hold(flowerA.group);
  figureB.hold(flowerB.group);
  // Sap avuçtan yukarı: elde tutulan bir çiçek gibi.
  flowerA.group.rotation.set(Math.PI, 0, 0);
  flowerB.group.rotation.set(Math.PI, 0, 0);
  flowerA.group.visible = flowerB.group.visible = false;

  // --- Aya çıkan yol ve gömlek cebindeki kadın -------------------------------------------------
  const road = new THREE.Group();
  const roadDir = moon.clone().sub(ROAD_START);
  const roadLength = roadDir.length();
  roadDir.normalize();
  const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, roadLength + 6), new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.9, transparent: true, opacity: 0 }));
  roadMesh.rotation.x = -Math.PI / 2;
  roadMesh.rotation.z = Math.PI;
  roadMesh.position.z = (roadLength + 6) / 2 - 2;
  road.add(roadMesh);
  road.position.copy(ROAD_START);
  road.lookAt(moon);
  road.visible = false;
  scene.add(road);
  const roadMaterial = roadMesh.material as THREE.MeshStandardMaterial;
  let roadLevel = 0;
  const pocket = new THREE.Group();
  const pocketCloth = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.17), new THREE.MeshStandardMaterial({ color: "#161616", roughness: 0.9, side: THREE.DoubleSide }));
  pocketCloth.position.set(0, -0.04, 0.005);
  const mini = createFigure({ kind: "woman", outfit: "woman_muted", height: 1.78 });
  mini.group.scale.setScalar(0.09);
  mini.group.position.set(0, -0.11, 0.03);
  mini.pose = "still";
  mini.energy = 0.3;
  pocket.add(mini.group, pocketCloth);
  // Göğüs cebi: sol göğüs, hafif öne.
  pocket.position.set(0.11, 1.32, 0.13);
  pocket.visible = false;
  figureA.group.add(pocket);
  let moonMood = 1;

  // --- Tasma, ayna ve yansımalar --------------------------------------------------------------
  const rope = new THREE.MeshStandardMaterial({ color: "#3a2a12", roughness: 0.95 });
  const collarA = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 24), rope);
  collarA.position.y = COLLAR_Y;
  collarA.rotation.x = Math.PI / 2;
  collarA.visible = false;
  figureA.group.add(collarA);
  const handB = new THREE.Object3D();
  figureB.hold(handB);
  const leashMaterial = new THREE.MeshStandardMaterial({ color: "#2a2014", roughness: 0.9 });
  let leash: THREE.Mesh | null = null;
  let leashMirror: THREE.Mesh | null = null;
  const mirror = new THREE.Group();
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color: "#f7e8b0", roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0, side: THREE.DoubleSide });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(22, 3.4), glassMaterial);
  glass.position.set(0, 1.7, 0);
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#141008", roughness: 0.7, transparent: true, opacity: 0 });
  const bars = [
    [22.4, 0.16, 0.12, 0, 3.48, 0],
    [22.4, 0.16, 0.12, 0, 0.02, 0],
    [0.16, 3.6, 0.12, -11.2, 1.7, 0],
    [0.16, 3.6, 0.12, 11.2, 1.7, 0],
  ].map(([w, h, d, x, y, z]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMaterial);
    bar.position.set(x, y, z);
    return bar;
  });
  const sill = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.14, 0.5), frameMaterial);
  sill.position.set(0, 0.07, 0);
  mirror.add(...bars, glass, sill);
  mirror.position.set(MIRROR_X, 0, 6);
  mirror.rotation.y = -Math.PI / 2;
  mirror.visible = false;
  scene.add(mirror);
  let mirrorLevel = 0;
  // Yansımalar: aynanın arkasında, roller değişmiş kopyalar (adam ipi tutar, kadının boynunda tasma).
  const copyA = createFigure({ kind: "man", outfit: "man_black", height: 1.8 });
  const copyB = createFigure({ kind: "woman", outfit: "woman_muted", height: 1.78 });
  const collarB = collarA.clone();
  collarB.visible = true;
  copyB.group.add(collarB);
  const handCopyA = new THREE.Object3D();
  copyA.hold(handCopyA);
  const copies = new THREE.Group();
  copies.add(copyA.group, copyB.group);
  copies.visible = false;
  scene.add(copies);
  const worldA = new THREE.Vector3();
  const worldB = new THREE.Vector3();
  const neckA = new THREE.Vector3();
  const neckCopyB = new THREE.Vector3();
  const drawLeash = (points: THREE.Vector3[], previous: THREE.Mesh | null, material: THREE.Material) => {
    if (previous) {
      previous.geometry.dispose();
      scene.remove(previous);
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.02, 5), material);
    scene.add(mesh);
    return mesh;
  };
  const clearLeash = () => {
    for (const mesh of [leash, leashMirror]) {
      if (!mesh) continue;
      mesh.geometry.dispose();
      scene.remove(mesh);
    }
    leash = leashMirror = null;
  };

  // --- Yalnızlık: saydam koza ------------------------------------------------------------------
  const cocoonMaterial = new THREE.MeshPhysicalMaterial({ color: "#e9f0ff", roughness: 0.12, metalness: 0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, clearcoat: 0.6 });
  const cocoon = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), cocoonMaterial);
  cocoon.visible = false;
  scene.add(cocoon);
  const cocoonRim = new THREE.Mesh(new THREE.SphereGeometry(1.012, 48, 32), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  cocoon.add(cocoonRim);
  let cocoonR = 2.6;

  // --- Yeşil sıvıdan tasma ---------------------------------------------------------------------
  const greenMaterial = new THREE.MeshStandardMaterial({ color: "#3cff6a", emissive: "#1aa040", emissiveIntensity: 0.9, roughness: 0.3 });
  let green: THREE.Mesh | null = null;
  let greenRise = 0;
  const GREEN = new THREE.Color("#3cff6a");
  const GREEN_E = new THREE.Color("#1aa040");
  const ROPE = new THREE.Color("#3a2a12");
  const BLACK = new THREE.Color("#000000");

  // --- Gamze: kadının yanağı, içindeki yıldız ve evren ------------------------------------------
  const headAnchor = new THREE.Object3D();
  figureB.attach(headAnchor, "Head");
  const dimpleAt = (out: THREE.Vector3) => {
    headAnchor.getWorldPosition(out);
    const yaw = figureB.group.rotation.y;
    // Sağ yanak: başın biraz üstü, sağa ve öne.
    out.x += Math.cos(yaw) * 0.062 + Math.sin(yaw) * 0.088;
    out.y += 0.075;
    out.z += -Math.sin(yaw) * 0.062 + Math.cos(yaw) * 0.088;
    return out;
  };
  const dimple = new THREE.Sprite(new THREE.SpriteMaterial({ map: dimpleTexture(), transparent: true, depthWrite: false, depthTest: true }));
  dimple.scale.setScalar(0.001);
  dimple.visible = false;
  scene.add(dimple);
  const star = glowSprite("#fff6c8", 0.001);
  star.visible = false;
  scene.add(star);
  const starBurst = createEmitter({ count: 90, colors: ["#fff6c8", "#9ec5ff"], size: 0.012, life: 1.6, spread: new THREE.Vector3(0.004, 0.004, 0.004), velocity: new THREE.Vector3(0, 0.03, 0.05), jitter: 0.12, gravity: -0.02, loop: false });
  scene.add(starBurst.points);
  let burstClock = 0;
  const STARS = 420;
  const starPositions = new Float32Array(STARS * 3);
  const starColors = new Float32Array(STARS * 3);
  for (let i = 0; i < STARS; i += 1) {
    const r = Math.cbrt(Math.random()) * 1;
    const a = Math.random() * Math.PI * 2;
    const c = Math.random() * 2 - 1;
    const s = Math.sqrt(1 - c * c);
    starPositions.set([r * s * Math.cos(a), r * c, r * s * Math.sin(a)], i * 3);
    const tint = Math.random();
    starColors.set(tint < 0.6 ? [1, 0.97, 0.85] : tint < 0.85 ? [0.75, 0.85, 1] : [1, 0.8, 0.55], i * 3);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const universe = new THREE.Points(starGeometry, new THREE.PointsMaterial({ size: 0.006, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true }));
  universe.visible = false;
  scene.add(universe);
  const universeDark = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: "#05040a", transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false }));
  universe.add(universeDark);

  // --- Gamzenin içi: kara küre, iki kalp, iki siluet ------------------------------------------
  const voidGroup = new THREE.Group();
  voidGroup.position.copy(VOID);
  const voidSphere = new THREE.Mesh(new THREE.SphereGeometry(14, 48, 32), new THREE.MeshStandardMaterial({ color: "#0b0b16", roughness: 1, side: THREE.BackSide }));
  voidGroup.add(voidSphere);
  const backLight = new THREE.PointLight("#ffe6c0", 60, 40, 1.6);
  backLight.position.set(0, -2.5, -7);
  voidGroup.add(backLight);
  const heartLight = new THREE.PointLight("#ff4a6a", 18, 16, 1.8);
  heartLight.position.set(0, -2.2, -2.2);
  voidGroup.add(heartLight);
  const heartMaterial = new THREE.MeshStandardMaterial({ color: "#c81e3a", emissive: "#7a0a1a", emissiveIntensity: 0.9, roughness: 0.35 });
  const hearts = [-1.15, 1.15].map((x) => {
    const heart = new THREE.Mesh(heartGeometry(), heartMaterial);
    heart.position.set(x, -2.0, -2.6);
    heart.scale.setScalar(0.42);
    voidGroup.add(heart);
    return heart;
  });
  const silhouette = new THREE.MeshBasicMaterial({ color: "#050507" });
  const silA = createFigure({ kind: "man", material: silhouette, height: 1.8 });
  const silB = createFigure({ kind: "woman", material: silhouette, height: 1.78 });
  silA.group.position.set(-1.7, VOID_FLOOR - VOID.y, 0);
  silB.group.position.set(1.7, VOID_FLOOR - VOID.y, 0);
  voidGroup.add(silA.group, silB.group);
  voidGroup.visible = false;
  scene.add(voidGroup);

  // --- Yardımcılar -----------------------------------------------------------------------------
  const place = (figure: Figure, x: number, z: number, yaw: number, pose: FigurePose) => {
    figure.group.position.set(x, 0, z);
    figure.group.rotation.y = yaw;
    figure.pose = pose;
  };
  const yawTo = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
  const YAW_A = yawTo(SPOT_A, SPOT_B);
  const YAW_B = yawTo(SPOT_B, SPOT_A);
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const gobletTop = new THREE.Vector3();

  const pair: PairActors = {
    a: figureA,
    b: figureB,
    copies,
    get moonMood() {
      return moonMood;
    },
    get greenRise() {
      return greenRise;
    },
    dimpleAt,
    update(dt, time, _act, playing, songTime) {
      if (!playing) {
        group.visible = false;
        road.visible = false;
        mirror.visible = false;
        copies.visible = false;
        cocoon.visible = false;
        voidGroup.visible = false;
        dimple.visible = star.visible = universe.visible = false;
        clearLeash();
        if (green) {
          green.geometry.dispose();
          scene.remove(green);
          green = null;
        }
        wasPlaying = false;
        return;
      }
      if (!wasPlaying) {
        wasPlaying = true;
        cocoonR = 2.6;
        greenRise = 0;
        moonMood = 1;
      }
      group.visible = true;
      figureB.group.visible = true;
      figureA.group.rotation.x = 0;
      figureA.energy = 1;
      figureB.energy = 1;
      const t = songTime;

      // 1) İki çiçek (0 → 72,4): iki ayrı boşlukta ayakta; her 12 saniyede biri kendi çiçeğine dokunur, o açar,
      // öbürününki solar. Dokunan hep sırayla değişir.
      const flowersAct = t < T.ay;
      if (flowersAct) {
        place(figureA, SPOT_A.x, SPOT_A.z, YAW_A, "still");
        place(figureB, SPOT_B.x, SPOT_B.z, YAW_B, "still");
        let wantA = 0.15;
        let wantB = 0.15;
        if (t >= 12) {
          const k = Math.floor((t - 12) / 12);
          const since = t - 12 - k * 12;
          // k çift: adamınki açar (ilk kez kendiliğinden, sonra dokununca); k tek: kadın dokunur, onunki açar.
          const aBlooms = k % 2 === 0;
          wantA = aBlooms ? 1 : 0;
          wantB = aBlooms ? 0 : 1;
          if (since < 1.7 && k > 0) (aBlooms ? figureA : figureB).pose = "reach";
        }
        flowerA.level = approach(flowerA.level, wantA, 1.1, dt);
        flowerB.level = approach(flowerB.level, wantB, 1.1, dt);
      } else {
        flowerA.level = approach(flowerA.level, 0.15, 2, dt);
        flowerB.level = approach(flowerB.level, 0.15, 2, dt);
      }
      flowerA.group.visible = flowerB.group.visible = flowersAct;
      setFlower(flowerA, flowerA.level);
      setFlower(flowerB, flowerB.level);

      // 2) Ay'a çıkan yol (72,4 → 118,6): adam yolun başına koşar, yolda tırmanır; kadın geride kalır.
      // 3) Aynı aşk / ayrı hâller (92 → 118,6): yolun ucunda yürürken başını sallar; cepteki kadın da, Ay da.
      const roadAct = t >= T.ay && t < T.bag;
      roadLevel = approach(roadLevel, roadAct ? 1 : 0, 2, dt);
      road.visible = roadLevel > 0.02;
      roadMaterial.opacity = roadLevel;
      if (roadAct) {
        const dash = THREE.MathUtils.clamp((t - T.ay) / 2.6, 0, 1);
        if (dash < 1) {
          // Çiçek yerinden yolun başına koşu.
          tmp.lerpVectors(SPOT_A, ROAD_START, dash);
          place(figureA, tmp.x, tmp.z, yawTo(SPOT_A, ROAD_START), "run");
        } else {
          const u = Math.min(roadLength - 14, (t - T.ay - 2.6) * 1.15);
          figureA.group.position.copy(ROAD_START).addScaledVector(roadDir, u);
          figureA.group.rotation.y = Math.atan2(roadDir.x, roadDir.z);
          // Bakış yol boyunca yukarı: gövde hafif öne.
          figureA.group.rotation.x = -Math.atan2(roadDir.y, Math.hypot(roadDir.x, roadDir.z)) * 0.35;
          figureA.pose = u < roadLength - 14.01 ? "run" : "walk";
          if (t >= T.tafra) {
            // Altı saniyelik döngü: üç saniye yürür, üç saniye başını sallar (bir evet, bir hayır).
            const cycle = (t - T.tafra) % 6;
            const k = Math.floor((t - T.tafra) / 6);
            const gesture: FigurePose = k % 2 === 0 ? "yes" : "no";
            if (cycle >= 3) {
              figureA.pose = gesture;
              figureA.group.rotation.x = 0;
              moonMood = approach(moonMood, gesture === "yes" ? 1 : 0.22, 2.5, dt);
            }
            mini.pose = cycle >= 3 ? gesture : "still";
          } else mini.pose = "still";
        }
        place(figureB, SPOT_B.x, SPOT_B.z, yawTo(SPOT_B, ROAD_START), "still");
      } else moonMood = approach(moonMood, 1, 1, dt);
      pocket.visible = roadAct && t > T.ay + 2.6;
      figureB.group.visible = !pocket.visible;
      if (pocket.visible) mini.update(dt, time);

      // 4) Tasma (118,6 → 136): uzun boş yolda yürürler; kadının elinde tasma, adamın boynunda.
      // 5) Ayna (125,1 → 136): yol boyunca dev bir ayna; yansımada roller ters.
      const pathAct = t >= T.bag && t < T.ara;
      if (pathAct) {
        const z = PATH_Z0 + (t - T.bag) * PATH_SPEED;
        place(figureA, PATH_X, z, 0, "walk");
        place(figureB, PATH_X - 1.1, z - 1.3, 0, "walk");
        figureA.energy = figureB.energy = 0.8;
      }
      const leashed = pathAct || (t >= T.tasma + 4 && t < T.son);
      collarA.visible = leashed;
      mirrorLevel = approach(mirrorLevel, t >= T.yalnizlik && t < T.ara ? 1 : 0, t >= T.yalnizlik && t < T.ara ? 0.7 : 3, dt);
      mirror.visible = mirrorLevel > 0.02;
      glassMaterial.opacity = 0.22 * mirrorLevel;
      frameMaterial.opacity = mirrorLevel;
      copies.visible = mirror.visible;
      if (pathAct) {
        figureA.group.getWorldPosition(worldA);
        neckA.set(worldA.x, COLLAR_Y, worldA.z);
        handB.getWorldPosition(worldB);
        tmp.lerpVectors(worldB, neckA, 0.5).setY(Math.min(worldB.y, neckA.y) - 0.35);
        leash = drawLeash([worldB, tmp, neckA], leash, leashMaterial);
      } else if (leash && !(t >= T.tasma)) {
        clearLeash();
      }
      if (copies.visible) {
        // Yansımalar: x = 16 düzleminde aynalanır; duruşlar aynı, roller ters (adam ipi tutar, kadın tasmalı).
        copyA.group.position.set(2 * MIRROR_X - figureA.group.position.x, 0, figureA.group.position.z);
        copyA.group.rotation.y = -figureA.group.rotation.y;
        copyA.pose = figureA.pose;
        copyA.energy = figureA.energy;
        copyA.update(dt, time);
        copyB.group.position.set(2 * MIRROR_X - figureB.group.position.x, 0, figureB.group.position.z);
        copyB.group.rotation.y = -figureB.group.rotation.y;
        copyB.pose = figureB.pose;
        copyB.energy = figureB.energy;
        copyB.update(dt, time);
        handCopyA.getWorldPosition(worldA);
        copyB.group.getWorldPosition(neckCopyB);
        neckCopyB.y = COLLAR_Y;
        tmp.lerpVectors(worldA, neckCopyB, 0.5).setY(Math.min(worldA.y, neckCopyB.y) - 0.35);
        leashMirror = drawLeash([worldA, tmp, neckCopyB], leashMirror, leashMaterial);
      } else if (leashMirror) {
        leashMirror.geometry.dispose();
        scene.remove(leashMirror);
        leashMirror = null;
      }

      // 6) Yalnızlık bir nesne (136 → 171,4): kadın kaybolur; saydam koza adamı sarar ve daralır; kadın zarın
      // öbür yanında belirir, ikisi de zara dayanır; dokunamazlar.
      const cocoonAct = t >= T.ara && t < T.zehir;
      if (cocoonAct) {
        const zEnd = PATH_Z0 + (T.ara - T.bag) * PATH_SPEED;
        place(figureA, PATH_X, zEnd, 0, t < T.ara + 14 ? "fold" : "push");
        const targetR = t < T.ara + 12 ? 1.9 : 1.05;
        cocoonR = approach(cocoonR, targetR, 0.25, dt);
        cocoon.visible = true;
        cocoon.position.set(PATH_X, 1.0, zEnd);
        const breathe = 1 + Math.sin(time * 1.4) * 0.012;
        cocoon.scale.setScalar(cocoonR * breathe);
        cocoonMaterial.opacity = approach(cocoonMaterial.opacity, 0.34, 0.6, dt);
        (cocoonRim.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.sin(time * 1.4) * 0.03;
        // Kadın 148'de zarın hemen dışında belirir; ikisi de zara dayanır.
        const outside = t >= T.ara + 12;
        figureB.group.visible = outside;
        if (outside) place(figureB, PATH_X, zEnd + cocoonR + 0.42, Math.PI, "push");
      } else {
        cocoonMaterial.opacity = approach(cocoonMaterial.opacity, 0, 2, dt);
        cocoon.visible = cocoonMaterial.opacity > 0.01;
        if (!cocoon.visible) cocoonR = 2.6;
      }

      // 7) Yeşil kadeh (171,4 → 177,9): masada ayakta karşılıklı; kadın kadehi uzatır; içmeden önce onun boğazı
      // tutulur, sonra adamınki.
      // 8) Tasma yeniden (177,9 → 197,6): kadehteki yeşil yükselir, tasma olur; adam tasmalı, ip kadının elinde.
      // 9) Gamze (197,6 → 217): kamera kadının yanağında; gamzede yıldız, evren.
      const tableAct = t >= T.zehir && t < T.son;
      if (tableAct) {
        let poseA: FigurePose = "still";
        let poseB: FigurePose = "offer";
        if (t >= T.zehir + 3.6) poseB = "phone";
        if (t >= T.zehir + 4.8) poseA = "phone";
        if (t >= T.tasma) {
          poseA = t < T.tasma + 6 ? "still" : "fold";
          poseB = t < T.tasma + 4 ? "still" : "fold";
        }
        if (t >= T.gulus) {
          poseA = "still";
          poseB = "still";
        }
        place(figureA, TABLE_A.x, TABLE_A.z, -Math.PI / 2, poseA);
        place(figureB, TABLE_B.x, TABLE_B.z, Math.PI / 2, poseB);
      }
      // Yeşil sıvı: 177,9'da kadehten yükselir (4 sn), 181,9'da kadının elinden adamın boynuna uzanan tasmaya
      // dönüşür (3 sn), 186'dan sonra rengi ipe döner.
      const greenAct = t >= T.tasma && t < T.son;
      if (greenAct) {
        goblet.getWorldPosition(gobletTop);
        gobletTop.y += 0.62;
        greenRise = THREE.MathUtils.clamp((t - T.tasma) / 4, 0, 1);
        const morph = THREE.MathUtils.smoothstep(t, T.tasma + 4, T.tasma + 7);
        const rise = 0.15 + greenRise * 1.1;
        figureA.group.getWorldPosition(worldA);
        neckA.set(worldA.x, COLLAR_Y, worldA.z);
        handB.getWorldPosition(worldB);
        const p0 = tmp.copy(gobletTop).lerp(worldB, morph);
        const p2 = tmp2.set(gobletTop.x, gobletTop.y + rise, gobletTop.z).lerp(neckA, morph);
        const mid = p0.clone().lerp(p2, 0.5);
        mid.y += (1 - morph) * 0.1 - morph * 0.3;
        // Yükselirken tepesi damla gibi şişkin: orta nokta biraz yana.
        mid.x += (1 - morph) * Math.sin(time * 3) * 0.03;
        green = drawLeash([p0.clone(), mid, p2.clone()], green, greenMaterial);
        const toRope = THREE.MathUtils.smoothstep(t, T.tasma + 8, T.tasma + 12);
        greenMaterial.color.copy(GREEN).lerp(ROPE, toRope);
        greenMaterial.emissive.copy(GREEN_E).lerp(BLACK, toRope);
        greenMaterial.emissiveIntensity = 0.9 * (1 - toRope);
      } else {
        greenRise = approach(greenRise, 0, 3, dt);
        if (green) {
          green.geometry.dispose();
          scene.remove(green);
          green = null;
        }
      }

      // Gamze: yanakta belirir; içinde yıldız; yıldız evrene açılır; 208,5'te kamera içeri girer.
      const dimpleAct = t >= T.gulus && t < T.son + 5;
      dimple.visible = star.visible = universe.visible = dimpleAct;
      if (dimpleAct) {
        dimpleAt(tmp);
        dimple.position.copy(tmp);
        star.position.copy(tmp);
        universe.position.copy(tmp);
        const show = THREE.MathUtils.smoothstep(t, T.gulus + 0.5, T.gulus + 2.5);
        dimple.scale.setScalar(Math.max(0.001, 0.034 * show));
        const starLevel = THREE.MathUtils.smoothstep(t, T.gulus + 4, T.gulus + 7);
        star.scale.setScalar(Math.max(0.001, 0.02 + 0.09 * starLevel + Math.sin(time * 9) * 0.006 * starLevel));
        star.material.opacity = 0.9 * starLevel;
        if (t >= T.gulus + 6 && t < T.gulus + 11) {
          burstClock -= dt;
          if (burstClock <= 0) {
            burstClock = 0.5 + Math.random() * 0.4;
            starBurst.origin.copy(tmp);
            starBurst.burst(time);
          }
        }
        const cosmos = THREE.MathUtils.smoothstep(t, T.gulus + 6.5, T.gulus + 11);
        universe.scale.setScalar(Math.max(0.001, 0.4 * cosmos));
        universe.rotation.y = time * 0.3;
        (universe.material as THREE.PointsMaterial).opacity = cosmos;
        (universeDark.material as THREE.MeshBasicMaterial).opacity = 0.9 * cosmos;
      }
      starBurst.update(time);

      // Gamzenin içi (208,5 → son): iki kalp aynı anda atar; iki siluet birbirine yürüyüp tek olur; son notada
      // ikiye ayrılır, birbirlerine bakarlar.
      const insideAct = t >= T.gulus + 10.5;
      voidGroup.visible = insideAct;
      if (insideAct) {
        const beat = Math.pow(Math.max(0, Math.sin((t - T.gulus) * Math.PI * 2 * 1.05)), 3);
        for (const heart of hearts) {
          heart.scale.setScalar(0.42 * (1 + beat * 0.14));
          heart.rotation.y = Math.sin(time * 0.5) * 0.15;
        }
        heartLight.intensity = 10 + beat * 16;
        const merge = THREE.MathUtils.smoothstep(t, T.gulus + 11, T.son - 0.5);
        const split = THREE.MathUtils.smoothstep(t, T.son, T.son + 1.6);
        const gap = THREE.MathUtils.lerp(1.7, 0, merge) + split * 0.9;
        silA.group.position.x = -gap;
        silB.group.position.x = gap;
        silA.group.rotation.y = Math.PI / 2;
        silB.group.rotation.y = -Math.PI / 2;
        silA.pose = merge < 1 && split === 0 ? "walk" : "still";
        silB.pose = silA.pose;
        silA.energy = silB.energy = 0.5;
        silA.update(dt, time);
        silB.update(dt, time);
      }

      figureA.update(dt, time);
      if (figureB.group.visible) figureB.update(dt, time);
    },
    shots(moonAt) {
      const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
      const A = (dx: number, dy: number, dz: number) => () => figureA.group.position.clone().add(v(dx, dy, dz));
      const B = (dx: number, dy: number, dz: number) => () => figureB.group.position.clone().add(v(dx, dy, dz));
      const fitA = () => ({ center: figureA.group.position.clone().add(v(0, 0.95, 0)), radius: 1.15 });
      const fitB = () => ({ center: figureB.group.position.clone().add(v(0, 0.95, 0)), radius: 1.15 });
      const flowerOf = (flower: Flower, dx: number, dy: number, dz: number) => () => flower.bloom.getWorldPosition(v(0, 0, 0)).add(v(dx, dy, dz));
      const D = (dx: number, dy: number, dz: number) => () => dimpleAt(v(0, 0, 0)).add(v(dx, dy, dz));
      /** Cep: göğüsteki cebin önünde, adamın baktığı yönde `dist` kadar ileride. */
      const P = (dist: number, dy: number, side: number) => () => {
        const at = pocket.getWorldPosition(v(0, 0, 0));
        const yaw = figureA.group.rotation.y;
        return at.add(v(Math.sin(yaw) * dist + Math.cos(yaw) * side, dy, Math.cos(yaw) * dist - Math.sin(yaw) * side));
      };
      const pocketAt = () => pocket.getWorldPosition(v(0, 0, 0));
      const V = (dx: number, dy: number, dz: number) => VOID.clone().add(v(dx, dy, dz));
      const heartsAt = V(0, -2.0, -2.6);
      /** Aynadaki yansımanın noktası. */
      const R = (dy: number) => () => v(2 * MIRROR_X - figureA.group.position.x, dy, figureA.group.position.z);
      return [
        // İki çiçek: adam, kadın; kamera aralarında geniş yaylarla dolaşır; çiçeklere makro.
        { at: 6, fit: fitA, from: A(2.4, 1.3, 2.2), to: A(1.9, 1.2, 1.7), look: A(0, 1.1, 0), fov: 44, grade: "neutral" },
        { at: 12, fit: fitB, from: B(-2.4, 1.3, 2.2), to: B(-1.9, 1.2, 1.7), look: B(0, 1.1, 0), fov: 44, grade: "neutral" },
        { at: 18, from: A(3.5, 1.7, 4), path: [v(0, 2.2, 7)], to: B(-3.5, 1.7, 4), look: A(0, 1.1, 0), lookTo: B(0, 1.1, 0), fov: 50, curve: "linear", grade: "neutral" },
        { at: 30, from: flowerOf(flowerB, 0.32, 0.18, 0.3), to: flowerOf(flowerB, 0.22, 0.12, 0.2), look: flowerOf(flowerB, 0, 0, 0), fov: 28, grade: "pastel" },
        { at: 36, from: flowerOf(flowerA, -0.32, 0.18, 0.3), to: flowerOf(flowerA, -0.22, 0.12, 0.2), look: flowerOf(flowerA, 0, 0, 0), fov: 28, grade: "pastel" },
        { at: 42, fit: fitB, from: B(-2.8, 1.5, -1.4), to: B(-2.2, 1.3, -1.0), look: B(0, 1.1, 0), fov: 42, grade: "neutral" },
        { at: 48, fit: fitA, from: A(2.8, 1.5, -1.4), to: A(2.2, 1.3, -1.0), look: A(0, 1.1, 0), fov: 42, grade: "neutral" },
        { at: 54, from: B(-3.2, 1.6, 3.2), path: [v(0, 1.8, 6)], to: A(3.2, 1.6, 3.2), look: B(0, 1.1, 0), lookTo: A(0, 1.1, 0), fov: 48, curve: "linear", grade: "pastel" },
        // Çiçek: makro taç yaprak → Ay yüzeyi (köprü).
        { at: 66, from: flowerOf(flowerA, -0.2, 0.1, 0.24), to: flowerOf(flowerA, -0.09, 0.05, 0.1), look: flowerOf(flowerA, 0, 0.01, 0), fov: 26, fovTo: 18, curve: "linear", grade: "pastel" },
        { at: 72.4, from: v(moonAt.x + 2.5, moonAt.y - 0.5, moonAt.z + 5.2), to: v(-1, 2.6, 0), look: moonAt, lookTo: A(0, 1, 0), fov: 22, fovTo: 50, curve: "linear", grade: "night", in: "fade" },
        // Cep: göğsündeki minicik kadın; sonra yandan tırmanış.
        { at: 78, from: P(0.46, 0.12, 0.04), to: P(0.36, 0.08, 0.02), look: pocketAt, fov: 24, grade: "night" },
        { at: 84, from: A(2.8, 1.0, 2.8), to: A(2.3, 1.5, 2.3), look: A(0, 1.2, 0), fov: 54, curve: "linear", grade: "night" },
        // Aynı aşk: adam başını sallar, cepteki kadın da; Ay bir aydınlanır bir söner.
        { at: 92, fit: fitA, from: A(2.4, 1.5, 2.4), to: A(2.0, 1.4, 2.0), look: A(0, 1.3, 0), fov: 42, grade: "night" },
        { at: 98, from: P(0.5, 0.05, -0.1), to: P(0.4, 0.03, -0.04), look: pocketAt, fov: 26, grade: "night" },
        { at: 104, from: A(2.4, 2.8, 2.4), to: A(1.9, 2.3, 1.9), look: A(0, 1.3, 0), fov: 62, curve: "linear", grade: "night" },
        { at: 110, fit: fitA, from: A(1.8, 1.6, 2.6), to: A(1.5, 1.5, 2.2), look: A(0, 1.3, 0), fov: 40, grade: "night" },
        // Tasma: kamera arkalarında, yol boyunca.
        { at: 118.6, from: A(-0.5, 1.8, -4.4), to: A(-0.3, 1.7, -3.8), look: A(0, 1.1, 0.5), fov: 50, curve: "linear", grade: "noir" },
        // Ayna: kesme yok; kamera aynaya paralel kayar, gerçek çift ve yansımaları aynı karede.
        { at: 125.1, from: A(-5.5, 1.7, -2.5), to: A(-4.6, 1.6, 1.8), look: A(1.2, 1.1, 0), lookTo: R(1.2), fov: 50, curve: "linear", grade: "noir" },
        // Yalnızlık: kadın yok; koza sarar; kadın zarın öbür yanında.
        { at: 136, fit: fitA, from: A(2.6, 1.5, 2.6), to: A(2.2, 1.4, 2.2), look: A(0, 1.1, 0), fov: 46, grade: "cold", in: "fade" },
        { at: 141, from: A(3.6, 1.7, 0), path: [v(0, 2.2, 0)], to: A(0, 1.8, 3.6), look: A(0, 1.1, 0), fov: 48, curve: "linear", grade: "cold" },
        { at: 148, from: A(2.0, 1.5, 3.8), to: A(1.5, 1.4, 3.4), look: A(0.2, 1.2, 1.2), fov: 42, grade: "cold" },
        { at: 156, from: A(-0.5, 1.5, -0.7), to: A(-0.3, 1.45, -0.4), look: A(0, 1.2, 2.0), fov: 58, grade: "cold" },
        { at: 163, from: A(0, 1.45, 0.2), to: A(0, 1.4, 0.92), look: A(0, 1.35, 3), fov: 60, fovTo: 22, curve: "linear", grade: "cold" },
        // Kadeh: kadın uzatır; boğazı tutulur; adamınki de.
        { at: 174.2, from: v(-2.4, 1.5, 1.7), to: v(-1.9, 1.45, 1.2), look: v(0.9, 1.15, 0), fov: 40, grade: "blood" },
        { at: 175.6, fit: fitB, from: B(1.6, 1.4, 1.2), to: B(1.3, 1.35, 1.0), look: B(0, 1.35, 0), fov: 36, grade: "blood" },
        { at: 176.8, fit: fitA, from: A(-1.6, 1.4, 1.2), to: A(-1.3, 1.35, 1.0), look: A(0, 1.35, 0), fov: 36, grade: "blood" },
        // Yeşil yükselir, tasma olur; ikisi de rahatsız.
        { at: 177.9, from: () => goblet.getWorldPosition(v(0, 0, 0)).add(v(0.8, 0.55, 0.95)), to: () => goblet.getWorldPosition(v(0, 0, 0)).add(v(0.7, 0.7, 0.8)), look: () => goblet.getWorldPosition(v(0, 0, 0)).add(v(0, 0.55, 0)), lookTo: A(0, 1.45, 0), fov: 34, curve: "linear", grade: "blood" },
        { at: 185, from: v(0, 1.55, 3.4), to: v(0, 1.5, 2.9), look: v(0, 1.25, 0), fov: 48, grade: "noir" },
        { at: 190, fit: fitA, from: A(-1.2, 1.5, 1.4), to: A(-1.0, 1.45, 1.1), look: A(0, 1.4, 0), fov: 36, grade: "noir" },
        { at: 194, fit: fitB, from: B(1.2, 1.4, 1.4), to: B(1.0, 1.3, 1.1), look: B(0, 1.2, 0), fov: 36, grade: "noir" },
        // Gamze: kameranın yanağa yaklaşması; yıldız; evren; içeri giriş.
        { at: 197.6, from: D(0.36, 0.06, 0.5), to: D(0.17, 0.02, 0.24), look: D(0, 0, 0), fov: 30, fovTo: 20, curve: "linear", grade: "dawn" },
        { at: 203, from: D(0.14, 0.02, 0.18), to: D(0.11, 0.015, 0.14), look: D(0, 0, 0), fov: 18, grade: "dawn", in: "flash", flashColor: "#fff6c8" },
        { at: 206, from: D(0.26, 0.1, 0.36), to: D(0.05, 0.015, 0.07), look: D(0, 0, 0), fov: 24, fovTo: 9, curve: "linear", grade: "night" },
        { at: 208.5, from: V(0, -3.4, 7.5), to: V(0, -3.7, 4.6), look: V(0, -3.6, -1), fov: 50, grade: "night", in: "white" },
        { at: 212, from: heartsAt.clone().add(v(0, 0.2, 4.2)), to: heartsAt.clone().add(v(0, 0.12, 3.4)), look: heartsAt, fov: 40, grade: "blood" },
        { at: 214.5, from: V(0, -3.5, 5.2), to: V(0, -3.6, 4.6), look: V(0, -3.9, 0), fov: 44, grade: "night", out: "fade" },
      ];
    },
  };
  return pair;
}
