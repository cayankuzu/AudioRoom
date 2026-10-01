import * as THREE from "three";
import { createEmitter, SPARKLE, type Emitter } from "../../../engine/fx/emitter";
import type { SongScene } from "../../../engine/game/songStage";
import { createActor, createFigure, heartBody } from "../../../engine/fx/figure";
import { GRADES } from "../../../engine/game/director";
import { announce, arc, block, cam, CENTER, ease, faceTowards, follow, gazeTarget, glowSprite, GRAMOPHONE, ground, onGround, pt, ridge, rim, secretItem, STAGE, type SceneKit } from "./kit";
import { addRimLight, bird, createRain, flap, flyTo, type Flyer } from "../../../engine/fx/sceneProps";

/**
 * Onlar Bile Üzülürler — kırık kalplerin müzesi. Rengârenk bir bataklıkta hayatın
 * batışı izlenir. Yedi taş kalbin plaketlerinde birer harf vardır; soldan sağa okununca
 * gizli bir kelime: KALPSİZ. "Kalpsiz" dendiği her an harfler tek tek kızıl yanar ve taş
 * kalpler sırtlarını döner (onu tanımayanların verdiği ad). Kalpler yarılır, ağlar; her
 * gün yeniden birleşip yeniden yarılır. Havada süzülen jilet parçaları dizesi gelince bir
 * dudak biçimine dizilir. Sonunda camdan bir kalp müzesi. Oyuncu kalpleri altınla onarır.
 */
const HEARTS = 7;
/** Plaketlerdeki harfler: soldan sağa gizli kelime. */
const WORD = ["K", "A", "L", "P", "S", "İ", "Z"];
/** Dizelerin saniyeleri. */
const L = {
  swamp: 31.38, sinking: 37.41, silence: 43.34, noise: 48.8, names: 61.27, forget: 67.26, lips: 73.07, sad: 77.97, lala: 90.53,
  loved: 101.8, killed: 104.63, heartless: 108.0, loved2: 113.82, heartless2: 120.04, razor: 125.74, bleed: 128.71, museum: 132.06,
  console: 139.38, smoke: 146.26, songs: 150.99, sad2: 156.27, lala2: 174.85, loved3: 179.88, heartless3: 186.02, heartless4: 198.07,
  razor2: 203.74, museum2: 210.05, end: 213.62,
} as const;

/** Plaket yüzü: pirinç zemin, oyma büyük harf. */
function letterTexture(letter: string, mask = false): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 72;
  const g = canvas.getContext("2d")!;
  g.fillStyle = mask ? "#000" : "#b08a4a";
  g.fillRect(0, 0, 256, 72);
  if (!mask) {
    g.strokeStyle = "rgba(60,40,10,0.6)";
    g.lineWidth = 3;
    g.strokeRect(5, 5, 246, 62);
  }
  g.fillStyle = mask ? "#fff" : "#1a1208";
  g.font = "bold 50px serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(letter, 128, 38);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const CRACK: Array<[number, number]> = [
  [0, 0.62], [0.12, 0.42], [-0.1, 0.22], [0.14, 0.02], [-0.08, -0.2], [0.1, -0.42], [0, -1],
];

function halfShape(side: 1 | -1): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, -1);
  if (side < 0) s.bezierCurveTo(-1.55, 0.05, -1.15, 1.3, 0, 0.62);
  else s.bezierCurveTo(1.55, 0.05, 1.15, 1.3, 0, 0.62);
  for (const [x, y] of CRACK) s.lineTo(x, y);
  return s;
}

function halfGeometry(side: 1 | -1): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(halfShape(side), {
    depth: 0.55,
    bevelEnabled: true,
    bevelSize: 0.1,
    bevelThickness: 0.14,
    bevelSegments: 4,
    curveSegments: 24,
  });
  geometry.translate(0, 0, -0.275);
  return geometry;
}

/** Yağ tabakası gibi yanardöner bataklık yüzeyi. */
function swampMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uLevel: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vWorld; varying vec2 vUv;
      void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uLevel; varying vec3 vWorld; varying vec2 vUv;
      void main() {
        float d = length(vUv - 0.5) * 2.0;
        float swirl = sin(vWorld.x * 0.7 + sin(vWorld.z * 0.5 + uTime * 0.3) * 2.0) + sin(vWorld.z * 0.9 - uTime * 0.2);
        vec3 film = 0.5 + 0.5 * cos(6.2831 * (swirl * 0.25 + vec3(0.0, 0.33, 0.67)));
        vec3 mud = vec3(0.03, 0.035, 0.03);
        vec3 col = mix(mud, film * 0.55, 0.45 + 0.2 * sin(uTime + swirl));
        gl_FragColor = vec4(col, smoothstep(1.0, 0.8, d) * uLevel * 0.9);
      }
    `,
  });
}

interface Heart {
  base: THREE.Group;
  group: THREE.Group;
  left: THREE.Mesh;
  right: THREE.Mesh;
  seam: THREE.Mesh;
  plaque: THREE.Mesh;
  letter: THREE.MeshStandardMaterial;
  spot: THREE.Mesh;
  tears: Emitter;
  sparkle: Emitter;
  mend: number;
  mended: boolean;
}

export function createHeartsScene(kit: SceneKit): SongScene {
  const root = new THREE.Group();
  const basalt = new THREE.MeshPhysicalMaterial({ color: "#2e2e31", roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.35 });
  // Taş kalplerin kenarı soğuk bir ışığı yakalar: gri gökte de koyu zeminde de siluet okunur.
  addRimLight(basalt, "#c8d4e6", 0.55, 2.4);
  const plinth = new THREE.MeshStandardMaterial({ color: "#161618", roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: "#d9a441", metalness: 1, roughness: 0.25, emissive: "#ffb347", emissiveIntensity: 3 });
  const brass = new THREE.MeshStandardMaterial({ color: "#8f7440", metalness: 0.9, roughness: 0.35 });
  const left = halfGeometry(-1);
  const right = halfGeometry(1);
  const seamCurve = new THREE.CatmullRomCurve3(CRACK.map(([x, y]) => new THREE.Vector3(x, y, 0.42)), false, "catmullrom", 0.1);
  const seamGeometry = new THREE.TubeGeometry(seamCurve, 60, 0.075, 8);
  const pedestal = new THREE.CylinderGeometry(0.85, 1.05, 2.4, 32);
  const spotGeometry = new THREE.ConeGeometry(2.2, 14, 32, 1, true);
  spotGeometry.translate(0, -7, 0);
  const spotMaterial = new THREE.MeshBasicMaterial({ color: "#fff3dc", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

  // Bataklık: sergi alanını kaplayan yanardöner su birikintileri.
  const swamp = new THREE.Group();
  const swampShader = swampMaterial();
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2;
    const r = 6 + (i % 3) * 5;
    const x = STAGE.x + Math.cos(a) * r;
    const z = STAGE.z + 6 + Math.sin(a) * r * 0.7;
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4 + (i % 4), 40), swampShader);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(x, ground(x, z) + 0.06, z);
    pool.renderOrder = 1;
    swamp.add(pool);
  }
  root.add(swamp);

  const hearts: Heart[] = [];
  const colliders = [];
  for (let i = 0; i < HEARTS; i += 1) {
    const angle = Math.PI * (0.2 + (0.6 * i) / (HEARTS - 1));
    const x = STAGE.x + Math.cos(angle) * 15;
    const z = STAGE.z + 6 - Math.sin(angle) * 11;
    const base = new THREE.Group();
    onGround(base, x, z);
    faceTowards(base, GRAMOPHONE.x, GRAMOPHONE.z);
    const column = new THREE.Mesh(pedestal, plinth);
    column.position.y = 1.2;
    column.castShadow = column.receiveShadow = true;
    const group = new THREE.Group();
    group.position.y = 3.9;
    group.scale.setScalar(1.35);
    const leftMesh = new THREE.Mesh(left, basalt);
    const rightMesh = new THREE.Mesh(right, basalt);
    leftMesh.castShadow = rightMesh.castShadow = true;
    const seam = new THREE.Mesh(seamGeometry, gold);
    seam.scale.set(1, 0.001, 1);
    group.add(leftMesh, rightMesh, seam);
    // Adı geçen geçmeyen: okunmayan, silinmiş bir isim plaketi.
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.05), brass);
    plaque.position.set(0, 1.9, 1.08);
    plaque.rotation.x = -0.25;
    plaque.scale.setScalar(0.001);
    // Harf: soldan sağa (oyuncunun gördüğü sırayla) gizli kelime.
    const letter = new THREE.MeshStandardMaterial({ map: letterTexture(WORD[HEARTS - 1 - i]), roughness: 0.4, metalness: 0.3, emissive: "#ff2a1a", emissiveIntensity: 0, emissiveMap: letterTexture(WORD[HEARTS - 1 - i], true) });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.66, 0.47), letter);
    face.position.z = 0.03;
    plaque.add(face);
    const spot = new THREE.Mesh(spotGeometry, spotMaterial);
    spot.position.y = 17;
    base.add(column, group, plaque, spot);
    root.add(base);
    colliders.push(block(kit, x, z, 1.2));

    const tears = createEmitter({
      count: 40,
      colors: ["#e8eef5", "#8fa3b8"],
      size: 0.07,
      life: 1.1,
      spread: new THREE.Vector3(0.05, 0.05, 0.05),
      velocity: new THREE.Vector3(0, -0.2, 0),
      jitter: 0.08,
      gravity: -7,
      additive: false,
    });
    const sparkle = createEmitter(SPARKLE("#ffc861", 1.2));
    root.add(tears.points, sparkle.points);
    hearts.push({ base, group, left: leftMesh, right: rightMesh, seam, plaque, letter, spot, tears, sparkle, mend: 0, mended: false });
  }

  // Her kalbin önünde anma mumları: taşı alttan sıcak bir ışıkla aydınlatır.
  const wax = new THREE.MeshStandardMaterial({ color: "#efe6d2", roughness: 0.6, emissive: "#ffb870", emissiveIntensity: 0.35 });
  const candleFlames: THREE.Sprite[] = [];
  hearts.forEach((heart) => {
    for (let c = 0; c < 5; c += 1) {
      const h = 0.18 + (c % 3) * 0.09;
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, h, 10), wax);
      const cx = (c - 2) * 0.24 + (c % 2 ? 0.05 : -0.05);
      const cz = 1.35 + (c % 2) * 0.18;
      candle.position.set(cx, h / 2, cz);
      const flame = glowSprite(c % 2 ? "#ffb347" : "#ffd28a", 0.5);
      flame.position.set(cx, h + 0.07, cz);
      heart.base.add(candle, flame);
      candleFlames.push(flame);
    }
  });

  // Kalplerin tepesinde tüneyen güvercinler: "öldürdük" anında havalanır, gökte döner.
  const doveMaterial = new THREE.MeshStandardMaterial({ color: "#e8e6e2", roughness: 0.8, side: THREE.DoubleSide, emissive: "#3a3a40", emissiveIntensity: 0.5 });
  const doves: Flyer[] = hearts.slice(0, 5).map(() => {
    const dove = bird(doveMaterial);
    dove.group.scale.setScalar(2);
    root.add(dove.group);
    return dove;
  });
  const doveAt = new THREE.Vector3();
  const perch = new THREE.Vector3();
  let doveFlight = -1;

  // Ağlayan gök: ince, ışığı yakalayan yağmur.
  const rain = createRain(900, "#cfd8e6", new THREE.Vector3(60, 26, 60), 20);
  root.add(rain.lines);
  let rainTarget = 0;
  let rainLevel = 0;
  const rainCenter = new THREE.Vector3();

  // Cam müze: sergiyi saran ince çerçeveli cam paneller.
  const museum = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: "#dfe6ea", roughness: 0.05, transparent: true, opacity: 0.12, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const frame = new THREE.MeshStandardMaterial({ color: "#1b1b1c", metalness: 0.7, roughness: 0.3 });
  for (let i = 0; i < 8; i += 1) {
    const a = Math.PI * (0.12 + (0.76 * i) / 7);
    const x = STAGE.x + Math.cos(a) * 20;
    const z = STAGE.z + 6 - Math.sin(a) * 15;
    const panel = new THREE.Group();
    panel.position.set(x, ground(x, z), z);
    panel.rotation.y = Math.atan2(STAGE.x - x, STAGE.z + 6 - z) + Math.PI / 2;
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 9), glass);
    pane.position.y = 4.5;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 9, 0.15), frame);
    post.position.set(3.75, 4.5, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.15, 0.15), frame);
    beam.position.y = 9;
    panel.add(pane, post, beam);
    museum.add(panel);
    kit.colliders.solid(pane, { pad: 0.12, maxCircles: 16 });
  }
  root.add(museum);

  // Jilet gibi dudaklar: havada süzülen ince, parlak bıçak parçaları.
  const blades = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.9, 0.02, 0.22),
    new THREE.MeshStandardMaterial({ color: "#d8dde2", metalness: 1, roughness: 0.12 }),
    26,
  );
  blades.frustumCulled = false;
  root.add(blades);

  // Gizli keşifler: müze bileti ve bataklıkta açan çiçek.
  const ticket = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.16), new THREE.MeshStandardMaterial({ color: "#c9b37a", roughness: 0.9, side: THREE.DoubleSide }));
  ticket.rotation.x = -Math.PI / 2;
  ticket.rotation.z = 0.4;
  const tx = GRAMOPHONE.x - 3;
  const tz = GRAMOPHONE.z - 10;
  ticket.position.set(tx, ground(tx, tz) + 0.03, tz);
  root.add(ticket);
  const flower = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.5, 6), new THREE.MeshStandardMaterial({ color: "#2f5d2a" }));
  stem.position.y = 0.25;
  const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: "#ff5fa2", emissive: "#ff2d7a", emissiveIntensity: 0.6 }));
  bloom.position.y = 0.52;
  bloom.scale.set(1, 0.6, 1);
  flower.add(stem, bloom);
  const fx = STAGE.x - 11;
  const fz = STAGE.z + 11;
  flower.position.set(fx, ground(fx, fz), fz);
  root.add(flower);
  const ticketRest = ticket.position.clone();
  let ticketFly = -1;
  let scent = -1;
  const scentBurst = createEmitter({ ...SPARKLE("#ff7ab8", 1.4), count: 90 });
  root.add(scentBurst.points);

  let mendedCount = 0;
  let clock = 0;
  let swampLevel = 0;
  let swampTarget = 0;
  let plaques = 0;
  let plaquesTarget = 0;
  let broken = 0;
  let weep = 0.4;
  let beatCycle = false;
  let bladesLevel = 0;
  let bladesTarget = 0;
  let museumLevel = 0;
  let museumTarget = 0;

  // Taş kalp mezarlığı: bütün kraterde, toprağa yarı gömülü, çoktan pes etmiş kırık taş kalpler.
  const GRAVES = 44;
  const graveLeft = new THREE.InstancedMesh(left, basalt, GRAVES);
  const graveRight = new THREE.InstancedMesh(right, basalt, GRAVES);
  graveLeft.frustumCulled = graveRight.frustumCulled = false;
  const graveMatrix = new THREE.Matrix4();
  const graveSpots = Array.from({ length: GRAVES }, (_, i) => {
    const a = (i / GRAVES) * Math.PI * 2 + kit.random() * 0.4;
    const r = 18 + kit.random() * 52;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return { x, z, y: ground(x, z), yaw: kit.random() * Math.PI * 2, tilt: (kit.random() - 0.5) * 0.9, sink: 0.4 + kit.random() * 1.2, gap: 0.2 + kit.random() * 0.5, scale: 1.1 + kit.random() * 0.9 };
  });
  graveSpots.forEach((g, i) => {
    for (const [mesh, side] of [[graveLeft, -1], [graveRight, 1]] as const) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(g.tilt * side, g.yaw, side * 0.3));
      graveMatrix.compose(new THREE.Vector3(g.x + Math.cos(g.yaw) * g.gap * side, g.y - g.sink + 1.2, g.z + Math.sin(g.yaw) * g.gap * side), q, new THREE.Vector3(g.scale, g.scale, g.scale));
      mesh.setMatrixAt(i, graveMatrix);
    }
  });
  root.add(graveLeft, graveRight);
  const GRAVE_NEAR = new THREE.Vector3(graveSpots[5].x, graveSpots[5].y + 1.2, graveSpots[5].z);
  // Yas tutan: mezardan mezara yürür, her birinin önünde diz çöker; harfler yanınca taş kalplerin önüne,
  // müze belirince camın önüne gider. Kimin için yas tuttuğunu söylemez.
  const mourner = createActor(createFigure({ material: new THREE.MeshStandardMaterial({ color: "#111114", roughness: 0.9 }), height: 1.8 }), ground, { speed: 1.3 });
  mourner.figure.group.position.set(graveSpots[5].x + 2, graveSpots[5].y, graveSpots[5].z + 2);
  root.add(mourner.figure.group);
  // Elindeki kalp: gerçek et rengi; "ağlama" dizesinde kâğıda döner ve ikiye yırtılıp düşer.
  const heldHeart = heartBody("#b8161f", 0.34);
  heldHeart.position.set(0, -0.55, 0.12);
  mourner.figure.hold(heldHeart);
  const heartFlesh = (heldHeart.material as THREE.MeshStandardMaterial).clone();
  heldHeart.material = heartFlesh;
  const paperTone = new THREE.Color("#efe6d2");
  const fleshTone = heartFlesh.color.clone();
  const paperHalves = [0, 1].map((k) => {
    const shape = new THREE.Shape();
    // Yarım kalp (kâğıt): dış kavis ve yırtık kenar.
    shape.moveTo(0, 0.1);
    shape.bezierCurveTo(0, 0.28, 0.24, 0.3, 0.24, 0.12);
    shape.bezierCurveTo(0.24, -0.02, 0.06, -0.14, 0, -0.22);
    for (let i = 1; i <= 6; i += 1) shape.lineTo((i % 2 ? 0.02 : -0.02), -0.22 + (i / 6) * 0.32);
    shape.lineTo(0, 0.1);
    const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: "#efe6d2", roughness: 1, side: THREE.DoubleSide }));
    mesh.scale.x = k === 0 ? 1 : -1;
    mesh.visible = false;
    root.add(mesh);
    return { mesh, vel: new THREE.Vector3(), spin: 0 };
  });
  let paper = 0;
  let paperTarget = 0;
  let torn = -1;
  const mournerAt = (dx: number, dy: number, dz: number) => () => mourner.figure.group.position.clone().add(new THREE.Vector3(dx, dy, dz));
  let mournerRest: "kneel" | "still" = "still";
  let heartless = -1;
  let lips = 0;
  let lipsTarget = 0;
  const lipPoint = (i: number, out: THREE.Vector3) => {
    // 13 jilet üst dudakta (ortası çentikli yay), 13'ü alt dudakta (dolgun yay).
    const upper = i < 13;
    const t = ((upper ? i : i - 13) / 12) * 2 - 1;
    const x = t * 4.2;
    const y = upper ? 0.55 * Math.cos(t * Math.PI * 0.5) + 0.32 * Math.exp(-t * t * 18) * -1 + 0.2 : -0.95 * Math.cos(t * Math.PI * 0.5) + 0.05;
    return out.set(STAGE.x + x, ground(STAGE.x, STAGE.z + 8) + 5.2 + y, STAGE.z + 8);
  };
  const point = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const matrixPoint = new THREE.Vector3();

  const interactables = [
    ...hearts.map((heart) =>
      gazeTarget({
        position: (target) => heart.group.getWorldPosition(target),
        radius: 1.8,
        reach: 26,
        label: () => (heart.mended ? null : "Kalbi altınla onar"),
        use: () => {
          heart.mended = true;
          mendedCount += 1;
          kit.sfx.cue("chime");
          heart.sparkle.burst(clock);
          announce(
            kit.hud,
            mendedCount === HEARTS ? "Kırık yerleri altınla dolan kalp, eskisinden değerli." : `Onarılan kalpler ${mendedCount} / ${HEARTS}`,
            mendedCount === HEARTS ? 6 : 3,
          );
        },
      }),
    ),
    secretItem(kit, "onlar-bilet", (target) => target.copy(ticket.position), {
      label: "Yerdeki bileti al",
      radius: 0.3,
      reach: 2.4,
      onFound: () => {
        ticketFly = 0;
        kit.sfx.cue("pickup");
      },
    }),
    secretItem(kit, "onlar-cicek", (target) => target.copy(flower.position).setY(flower.position.y + 0.5), {
      label: "Bataklıktaki çiçeği kokla",
      radius: 0.3,
      reach: 2.4,
      available: () => swampLevel > 0.5,
      onFound: () => {
        scent = 0;
        scentBurst.origin.copy(flower.position).setY(flower.position.y + 0.55);
        scentBurst.burst(clock);
        kit.sfx.cue("chime");
      },
    }),
  ];

  return {
    root,
    hint: "Kırık kalplerin müzesi. Kalplere bak ve E ile altınla onar; şarkı ilerledikçe müze kendini kuracak.",
    interactables,
    colliders,
    // Klip: gri taş galeri, rengârenk bataklıkta neon; kalpsiz anlarında kan kırmızısı; müzede soğuk cam.
    // Klip: taş kalplerin krateri. Sırttan gelirken bütün kraterde yarı gömülü kırık taş kalpler görünür;
    // bataklık, harfler, jiletler, cam müze; gökten yağmur; sonda mezarlığın üstünden ayrılış.
    shots: [
      // Yas tutan: mezarın önünde, sonra kalplerin ve camın önünde.
      { at: 12.5, from: mournerAt(1.8, 1.2, 2.4), to: mournerAt(1.1, 1.1, 1.7), look: mournerAt(0, 1.3, 0), fov: 42, grade: { ...GRADES.bleach, soft: 0.5 } },
      { at: L.sad + 1.5, from: mournerAt(-3.2, 1.2, 3.4), to: mournerAt(-2.6, 1.0, 2.8), look: mournerAt(0, 0.7, 0), fov: 42, grade: "cold" },
      { at: L.museum + 2.5, from: mournerAt(0, 1.5, -3.5), to: mournerAt(0, 1.5, -2.2), look: mournerAt(0, 1.4, 0), lookTo: mournerAt(0, 3, 6), fov: 46, grade: "cold" },
      { at: 0, from: ridge(4.2, 46), path: [pt(30, 24, 30), pt(10, 8, 62)], to: cam(0, 4.5, 68), look: CENTER, lookTo: cam(0, 3, 44), fov: 48, curve: "linear", grade: "bleach", in: "fade" },
      { at: 10, from: pt(GRAVE_NEAR.x + 3, GRAVE_NEAR.y + 0.4, GRAVE_NEAR.z + 3), to: pt(GRAVE_NEAR.x + 2, GRAVE_NEAR.y + 0.2, GRAVE_NEAR.z + 2), look: GRAVE_NEAR, fov: 40, grade: { ...GRADES.bleach, soft: 0.6 } },
      { at: 15, from: cam(-9, 1.4, 56), to: cam(9, 1.4, 56), look: cam(0, 4, 42), fov: 44, curve: "linear", grade: "bleach" },
      { at: 24, from: rim(1.0, 2.2), path: [pt(24, 3, 40)], to: cam(12, 2.4, 52), look: pt(0, 2, 20), lookTo: cam(0, 3, 44), fov: 46, curve: "linear", grade: "bleach" },
      { at: L.swamp, from: cam(-15, 0.9, 61), to: cam(9, 0.9, 59), look: cam(0, 0, 50), fov: 50, curve: "linear", grade: "neon" },
      { at: L.sinking, from: cam(3, 0.35, 56), to: cam(2, 0.3, 54), look: cam(-2, 0.1, 50), fov: 40, grade: { ...GRADES.neon, soft: 0.8 } },
      { at: L.silence, orbit: { center: cam(0, 0, 50), radius: 11, height: 3, from: 1.2, to: 1.95 }, look: cam(0, 3.5, 44), fov: 50, curve: "linear", grade: "night" },
      { at: L.noise, from: cam(0, 12, 64), path: [pt(-14, 16, 40)], to: pt(-24, 12, 12), look: cam(0, 0, 48), lookTo: CENTER, fov: 54, handheld: 0.05, curve: "linear", grade: "neon" },
      { at: L.names, from: cam(-14, 2.4, 50), to: cam(14, 2.4, 50), look: cam(0, 2.2, 42), fov: 40, curve: "linear", grade: "bleach" },
      { at: L.forget, from: follow(hearts[3].base, 1.4, 3.2, 6.5), to: follow(hearts[3].base, 0.5, 2.7, 4.8), look: follow(hearts[3].base, 0, 2.2, 1), fov: 36, grade: { ...GRADES.bleach, soft: 0.8 } },
      { at: L.lips, from: cam(0, 0.6, 53), to: cam(2, 0.5, 51), look: cam(0, 4.6, 43), fov: 62, grade: "noir" },
      { at: L.sad, from: follow(hearts[1].group, 3.4, 0.8, 5.6), to: follow(hearts[1].group, 2.2, 0.3, 4.4), look: follow(hearts[1].group, 0, -0.5, 0), fov: 42, grade: "cold" },
      { at: 84, from: pt(GRAVE_NEAR.x - 4, GRAVE_NEAR.y + 1.2, GRAVE_NEAR.z + 2), to: pt(GRAVE_NEAR.x - 2.6, GRAVE_NEAR.y + 0.8, GRAVE_NEAR.z + 1.2), look: GRAVE_NEAR, fov: 40, grade: "cold" },
      { at: L.lala, from: rim(2.2, 8), path: arc(0, 0, 50, 9, 2.2, 3.4, 3), to: cam(-6, 7, 62), look: CENTER, lookTo: cam(0, 3, 44), fov: 50, curve: "linear", grade: "neon" },
      { at: L.loved, from: follow(hearts[5].group, -2.6, 0.4, 4), to: follow(hearts[5].group, -1.8, 0.2, 3), look: follow(hearts[5].group), fov: 40, grade: "pastel" },
      { at: L.killed, from: follow(hearts[5].group, 1.8, 0.2, 3), look: follow(hearts[5].group), fov: 40, grade: "blood", in: "flash" },
      { at: L.heartless, from: cam(-13, 2.3, 51), to: cam(13, 2.3, 51), look: cam(-12, 2.1, 45), lookTo: cam(12, 2.1, 45), fov: 34, grade: "blood", curve: "linear" },
      { at: L.loved2, from: cam(-17, 2.6, 51), to: cam(17, 2.6, 51), look: cam(0, 3.6, 42), fov: 46, curve: "linear", grade: "pastel" },
      { at: L.heartless2, from: cam(-13, 2.3, 51), to: cam(13, 2.3, 51), look: cam(-12, 2.1, 45), lookTo: cam(12, 2.1, 45), fov: 34, grade: "blood", curve: "linear" },
      { at: L.razor, from: pt(0, ground(0, 54) + 5.4, 68), to: pt(0, ground(0, 54) + 5.3, 65), look: pt(0, ground(0, 54) + 5.2, 54), fov: 38, grade: { ...GRADES.cold, aberration: 0.006 }, in: "flash" },
      { at: L.bleed, from: pt(1.5, ground(0, 54) + 5.2, 62), to: pt(0.8, ground(0, 54) + 5.2, 60), look: pt(0, ground(0, 54) + 5.2, 54), fov: 40, grade: "blood" },
      { at: L.museum, from: cam(0, 7, 30), to: cam(0, 5, 35), look: cam(0, 3, 52), fov: 52, grade: "cold" },
      { at: L.console, from: cam(-24, 3, 44), to: cam(-20, 3.4, 30), look: cam(0, 3, 44), fov: 44, curve: "linear", grade: "cold" },
      { at: L.smoke, from: cam(0, 3, 60), path: [pt(10, 14, 40)], to: pt(30, 10, 10), look: cam(0, 2, 44), lookTo: CENTER, fov: 50, curve: "linear", grade: "bleach" },
      { at: L.songs, orbit: { center: CENTER, radius: 34, height: 6, from: 0.5, to: 1.7 }, look: pt(0, 4, 20), fov: 50, curve: "linear", grade: "night" },
      { at: L.sad2, from: follow(hearts[4].group, -3, 0.6, 5), to: follow(hearts[4].group, -2, 0.3, 4), look: follow(hearts[4].group, 0, -0.4, 0), fov: 42, grade: "cold" },
      { at: 165, orbit: { center: cam(0, 0, 47), radius: 20, height: 4, from: 1.6, to: 2.6 }, look: cam(0, 3.5, 44), fov: 50, curve: "linear", grade: "neon" },
      { at: L.lala2, from: cam(0, 12, 64), to: cam(0, 10, 58), look: cam(0, 0, 48), fov: 54, grade: "neon" },
      { at: L.loved3, from: cam(17, 2.6, 51), to: cam(-17, 2.6, 51), look: cam(0, 3.6, 42), fov: 46, curve: "linear", grade: "pastel" },
      { at: L.heartless3, from: cam(-13, 2.3, 51), to: cam(13, 2.3, 51), look: cam(-12, 2.1, 45), lookTo: cam(12, 2.1, 45), fov: 34, grade: "blood", curve: "linear" },
      { at: 191.82, from: follow(hearts[2].group, 2.6, 0.4, 4), look: follow(hearts[2].group), fov: 40, grade: "pastel" },
      { at: L.heartless4, from: cam(-13, 2.3, 51), to: cam(13, 2.3, 51), look: cam(-12, 2.1, 45), lookTo: cam(12, 2.1, 45), fov: 34, grade: "blood", curve: "linear" },
      { at: L.razor2, from: pt(0, ground(0, 54) + 5.4, 68), to: pt(0, ground(0, 54) + 5.3, 65), look: pt(0, ground(0, 54) + 5.2, 54), fov: 38, grade: { ...GRADES.cold, aberration: 0.006 }, in: "flash" },
      { at: L.museum2, from: cam(0, 7, 30), to: cam(0, 5, 35), look: cam(0, 3, 52), fov: 52, grade: "cold" },
      { at: L.end, from: cam(0, 4, 60), path: [pt(-20, 16, 30), pt(-40, 30, -10)], to: ridge(3.6, 48), look: cam(0, 2, 44), lookTo: CENTER, fov: 50, curve: "linear", grade: "bleach", out: "fade" },
    ],
    beats: [
      { at: 0, id: "grey" },
      { at: L.swamp, id: "swamp", line: "Rengârenk bir bataklık. Mezarlar arasında yürüyen biri var; kimin için geldiğini söylemiyor." },
      { at: L.silence, id: "silence", line: "Sis çöküyor; bataklık bile susuyor." },
      { at: L.names, id: "names", line: "Taş plaketler beliriyor; her birinde tek bir harf." },
      { at: L.lips, id: "broken", line: "Taş kalpler çatlıyor." },
      { at: L.sad, id: "weep", line: "Taşlar ağlamaya başlıyor." },
      { at: L.loved, id: "cycle", line: "Kalpler birleşiyor gibi olup yeniden yarılıyor." },
      { at: L.killed, id: "killed", line: "Kalplerin tepesindeki güvercinler bir anda havalanıyor." },
      { at: L.heartless, id: "heartless", line: "Harfler tek tek yanıyor; kalpler sırtlarını dönüyor." },
      { at: L.heartless2, id: "heartless2" },
      { at: L.razor, id: "blades", line: "Havadaki jiletler bir dudak biçimine diziliyor." },
      { at: L.museum, id: "museum", line: "Camdan bir müze beliriyor; her vitrinde kırık bir kalp." },
      { at: L.smoke, id: "smoke", line: "Sis kalınlaşıyor; müzenin camları buğulanıyor." },
      { at: L.loved3, id: "cycle2" },
      { at: L.heartless3, id: "heartless3" },
      { at: L.heartless4, id: "heartless4" },
      { at: L.razor2, id: "blades2" },
      { at: L.end, id: "end", line: "Harfler sönüyor. Kalpler olduğu yerde." },
    ],
    onBeat(id) {
      if (id === "swamp") swampTarget = 1;
      if (id === "swamp") mourner.goTo(graveSpots[5].x + 1.4, graveSpots[5].z + 1.4, false, Math.atan2(graveSpots[5].x - (graveSpots[5].x + 1.4), graveSpots[5].z - (graveSpots[5].z + 1.4)));
      if (id === "names") {
        const b = hearts[0].base.position;
        mourner.goTo(b.x + 2.2, b.z + 2.2, false, Math.atan2(-2.2, -2.2));
        mournerRest = "still";
      }
      if (id === "weep") {
        mournerRest = "kneel";
        paperTarget = 1;
        torn = 3.2;
      }
      if (id === "names") {
        paperTarget = 0;
        torn = -1;
        heldHeart.visible = true;
      }
      if (id === "killed") {
        const b = hearts[3].base.position;
        mourner.goTo(b.x - 2.2, b.z + 2.4, false, Math.atan2(2.2, -2.4));
        mournerRest = "still";
      }
      if (id === "museum") {
        const p = museum.children[3].position;
        mourner.goTo(p.x, p.z + 3, false, Math.PI);
        mournerRest = "still";
      }
      if (id === "end") mournerRest = "kneel";
      if (id === "weep") rainTarget = 1;
      if (id === "museum") rainTarget = 0.4;
      if (id === "end") rainTarget = 0;
      if (id === "killed" && doveFlight < 0) doveFlight = 0;
      if (id === "silence") {
        kit.effects.fog = 2.2;
        kit.effects.dim = 0.2;
      }
      if (id === "names") {
        plaquesTarget = 1;
        kit.effects.fog = 1.3;
      }
      if (id === "broken") broken = 1;
      if (id === "weep") weep = 1.6;
      if (id === "cycle" || id === "cycle2") beatCycle = true;
      if (id === "blades" || id === "blades2") {
        bladesTarget = 1;
        lipsTarget = 1;
      }
      if (id.startsWith("heartless")) heartless = 0;
      if (id === "museum") {
        museumTarget = 1;
        bladesTarget = 0;
        lipsTarget = 0;
        kit.sfx.cue("chime");
      }
      if (id === "smoke") kit.effects.fog = 2;
      if (id === "end") {
        swampTarget = 0;
        bladesTarget = 0;
        beatCycle = false;
        weep = 0.3;
      }
    },
    reset() {
      doveFlight = -1;
      rainTarget = rainLevel = 0;
      mendedCount = 0;
      swampLevel = swampTarget = plaques = plaquesTarget = broken = bladesLevel = bladesTarget = museumLevel = museumTarget = lips = lipsTarget = 0;
      heartless = -1;
      weep = 0.4;
      beatCycle = false;
      for (const heart of hearts) {
        heart.mended = false;
        heart.mend = 0;
      }
    },
    update(dt, time, level) {
      clock = time;
      if (mourner.arrived) mourner.rest(mournerRest);
      mourner.update(dt, time);
      // Kalp → kâğıt: renk ve doku solar; sonra ikiye yırtılır, yarımlar dönerek yere düşer.
      paper += (paperTarget - paper) * Math.min(1, dt * 0.9);
      heartFlesh.color.copy(fleshTone).lerp(paperTone, paper);
      heartFlesh.roughness = 0.55 + paper * 0.45;
      heartFlesh.metalness = 0.15 * (1 - paper);
      heartFlesh.emissive.setRGB(0.18 * (1 - paper), 0, 0);
      if (torn > 0) {
        torn -= dt;
        if (torn <= 0) {
          heldHeart.visible = false;
          const origin = heldHeart.getWorldPosition(new THREE.Vector3());
          paperHalves.forEach((half, k) => {
            half.mesh.visible = true;
            half.mesh.position.copy(origin);
            half.mesh.rotation.set(0, mourner.figure.group.rotation.y, 0);
            half.vel.set((k === 0 ? -1 : 1) * 0.7, 0.9, 0.3);
            half.spin = (k === 0 ? -1 : 1) * 2.4;
          });
        }
      }
      for (const half of paperHalves) {
        if (!half.mesh.visible) continue;
        half.vel.y -= dt * 2.2;
        half.vel.multiplyScalar(1 - dt * 0.9);
        half.mesh.position.addScaledVector(half.vel, dt);
        half.mesh.rotation.z += half.spin * dt;
        half.mesh.rotation.x += half.spin * 0.4 * dt;
        const floor = ground(half.mesh.position.x, half.mesh.position.z) + 0.03;
        if (half.mesh.position.y < floor) {
          half.mesh.position.y = floor;
          half.vel.set(0, 0, 0);
          half.spin = 0;
          half.mesh.rotation.x = -Math.PI / 2;
        }
        half.mesh.visible = level > 0.05;
      }
      mourner.figure.group.visible = level > 0.05;
      root.position.y = (level - 1) * 6;
      // Mumlar titrer; yağmur yağar; güvercinler tünekten kalkar.
      candleFlames.forEach((flame, i) => {
        (flame.material as THREE.SpriteMaterial).opacity = level * (0.75 + 0.25 * Math.sin(time * 17 + i * 1.7) * Math.sin(time * 5 + i));
        flame.scale.setScalar(0.5 + Math.sin(time * 11 + i) * 0.05);
      });
      rainLevel += (rainTarget * level - rainLevel) * Math.min(1, dt * 0.6);
      rain.level = rainLevel;
      rainCenter.copy(kit.camera.position).setY(kit.camera.position.y - 6);
      rain.update(dt, rainCenter);
      if (doveFlight >= 0) doveFlight += dt;
      doves.forEach((dove, i) => {
        const heart = hearts[i];
        heart.group.getWorldPosition(perch).setY(perch.y + 1.9);
        if (doveFlight < 0 || doveFlight < i * 0.25) {
          dove.group.position.copy(perch);
          dove.group.rotation.set(0, heart.base.rotation.y + Math.sin(time * 0.7 + i) * 0.3, 0);
          flap(dove, time, 3, Math.sin(time * 1.3 + i) > 0.9 ? 0.3 : 0.02);
        } else {
          const t = doveFlight - i * 0.25;
          const lift = Math.min(1, t / 2.5);
          const a = time * 0.35 + i * 1.25;
          doveAt.set(STAGE.x + Math.cos(a) * (10 + i * 2), perch.y + lift * (8 + i * 1.5), STAGE.z + 6 + Math.sin(a) * (9 + i * 2));
          doveAt.lerpVectors(perch, doveAt, lift);
          flyTo(dove, doveAt);
          flap(dove, time, 8, 0.75);
        }
        dove.group.visible = level > 0.2;
      });
      swampLevel += (swampTarget * level - swampLevel) * Math.min(1, dt * 0.6);
      swampShader.uniforms.uTime.value = time;
      swampShader.uniforms.uLevel.value = swampLevel;
      swamp.visible = swampLevel > 0.01;
      // Bataklıkta yürümek ağırlaşır.
      const inSwamp = Math.hypot(kit.player.position.x - STAGE.x, kit.player.position.z - STAGE.z - 6) < 18;
      kit.effects.speed = inSwamp ? 1 - swampLevel * 0.45 : 1;

      plaques += (plaquesTarget * level - plaques) * Math.min(1, dt * 0.8);
      museumLevel += (museumTarget * level - museumLevel) * Math.min(1, dt * 0.35);
      museum.position.y = (ease(museumLevel) - 1) * 9.5;
      museum.visible = museumLevel > 0.01;
      spotMaterial.opacity = museumLevel * 0.12;

      hearts.forEach((heart, i) => {
        heart.mend = heart.mended ? Math.min(1, heart.mend + dt / 2.2) : 0;
        const k = heart.mend * heart.mend * (3 - 2 * heart.mend);
        // Her gün yeniden: kalp birleşir gibi olur, sonra yeniden yarılır.
        const cycle = beatCycle && !heart.mended ? (Math.sin(time * 1.6 + i) * 0.5 + 0.5) : 0;
        const gap = (1 - k) * (0.14 + broken * 0.12 - cycle * 0.12);
        heart.left.position.x = -gap;
        heart.right.position.x = gap;
        heart.left.rotation.z = (1 - k) * (0.05 + broken * 0.06);
        heart.right.rotation.z = -(1 - k) * (0.05 + broken * 0.06);
        heart.seam.scale.y = Math.max(0.001, k);
        // "Kalpsiz" anlarında taş kalpler sırtını döner; harfler soldan sağa tek tek kızıl yanar.
        const order = HEARTS - 1 - i;
        const lit = heartless >= 0 ? THREE.MathUtils.clamp((heartless - order * 0.7) * 3, 0, 1) * THREE.MathUtils.clamp((6.4 - heartless) * 1.5, 0, 1) : 0;
        heart.letter.emissiveIntensity = lit * 2.2;
        const turn = heartless >= 0 ? ease(THREE.MathUtils.clamp(heartless - 0.8 - order * 0.7, 0, 1)) * ease(THREE.MathUtils.clamp((6.6 - heartless) * 1.2, 0, 1)) : 0;
        heart.group.rotation.y = Math.sin(time * 0.4 + i) * 0.12 + turn * Math.PI;
        heart.group.position.y = 3.9 + Math.sin(time * 0.9 + i * 1.3) * 0.08;
        heart.plaque.scale.setScalar(Math.max(0.001, ease(plaques * 1.3 - i * 0.05)));
        heart.group.getWorldPosition(point);
        heart.tears.origin.copy(point).y -= 0.6;
        heart.tears.rate = Math.min(1, (1 - k) * weep) * level;
        heart.tears.intensity = level;
        heart.tears.update(time);
        heart.sparkle.origin.copy(point);
        heart.sparkle.update(time);
      });
      gold.emissiveIntensity = 3 + Math.sin(clock * 2) * 0.8;

      if (heartless >= 0) {
        heartless += dt;
        if (heartless > 7) heartless = -1;
      }
      bladesLevel += (bladesTarget * level - bladesLevel) * Math.min(1, dt * 0.8);
      // Dudak: dizesi gelince jiletler havada iki yay çizer; birkaç saniye sonra dağılır.
      if (lipsTarget > 0 && lips >= 1) lipsTarget = lips > 1.6 ? 0 : lipsTarget;
      lips = lipsTarget > 0 ? Math.min(2, lips + dt / 3) : Math.max(0, lips - dt / 2);
      const form = ease(Math.min(1, lips) * (lips > 1.6 ? Math.max(0, (2 - lips) / 0.4) : 1));
      for (let i = 0; i < 26; i += 1) {
        const a = time * 0.25 + (i / 26) * Math.PI * 2;
        position.set(STAGE.x + Math.cos(a) * (9 + (i % 3)), ground(STAGE.x, STAGE.z) + 3 + Math.sin(time + i) * 1.5, STAGE.z + 6 + Math.sin(a) * 7);
        if (form > 0) position.lerp(lipPoint(i, point), form);
        const slope = lipPoint(Math.min(25, i + 1), scale).y - lipPoint(Math.max(0, i - 1), matrixPoint).y;
        euler.set((time * 0.7 + i) * (1 - form) + form * (Math.PI / 2), a * (1 - form), (time * 0.4) * (1 - form) + form * Math.atan2(slope, 0.7));
        quaternion.setFromEuler(euler);
        scale.setScalar(bladesLevel * (1 + form * 0.7) + 0.0001);
        matrix.compose(position, quaternion, scale);
        blades.setMatrixAt(i, matrix);
      }
      blades.instanceMatrix.needsUpdate = true;
      blades.visible = bladesLevel > 0.01;
      ticket.visible = flower.visible = level > 0.3;
      scentBurst.update(time);
      // Bilet önce gözünün önüne kalkar, sonra kanat çırpar gibi müzeye doğru uçup kaybolur.
      if (ticketFly >= 0) {
        ticketFly += dt;
        const eye = kit.camera.position.clone().add(kit.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.9));
        if (ticketFly < 2.4) ticket.position.lerpVectors(ticketRest, eye, Math.min(1, ticketFly / 0.8));
        else ticket.position.lerp(new THREE.Vector3(STAGE.x, 6, STAGE.z), Math.min(1, dt * 0.9));
        ticket.lookAt(kit.camera.position);
        ticket.rotateZ(Math.sin(ticketFly * 12) * 0.2);
        ticket.visible = ticketFly < 6 && level > 0.3;
      }
      // Çiçek bir an kocaman açar, sonra yavaşça eski hâline döner.
      if (scent >= 0) {
        scent += dt;
        const open = Math.sin(Math.min(1, scent / 4) * Math.PI);
        bloom.scale.set(1 + open * 1.6, 0.6 + open * 1.2, 1 + open * 1.6);
        if (scent > 4) scent = -1;
      }
    },
  };
}
