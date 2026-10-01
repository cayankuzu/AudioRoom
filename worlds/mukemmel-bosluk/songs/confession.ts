import * as THREE from "three";
import { createEmitter, EMBERS, FIRE, type Emitter } from "../../../engine/fx/emitter";
import type { SongScene } from "../../../engine/game/songStage";
import { createActor, createFigure } from "../../../engine/fx/figure";
import { fitModel } from "../../../engine/core/models";
import { GRADES } from "../../../engine/game/director";
import { announce, block, ease, follow, gazeTarget, glowSprite, GRAMOPHONE, ground, pt, ridge, rim, secretItem, softGlow, type SceneKit } from "./kit";
import { createLanterns, createMotes } from "../../../engine/fx/sceneProps";
import { approach } from "../../../engine/fx/fade";

/**
 * İtiraf — gramofondan kratere inen yol boyunca sönük mumlar. Yolun başında boş bir
 * günah çıkarma kafesi durur: öbür tarafında dinleyen kimse yok, itiraf boşluğa yapılır.
 * Kafesin önüne otuz gümüş sikke saçılmış (Yahuda'nın otuz gümüşü: "sattım"ın alt metni).
 * Her itirafta (E) sıradaki mum yanar; kalp vurdukça görüntü sarsılır, yalnız kalınca
 * yağmur başlar ve görüntü göz kırpar gibi kararır. "Abarttım"da bütün alevler boylarından
 * büyük parlar. Son itirafta büyük ateşin ortasında bir kalp atar.
 * Zamanlar stüdyo kaydına göre (canlı kaydın senkronundan ölçeklendi: stüdyo ≈ 0.967 × canlı − 23.96).
 */
const CANDLES = 10;
const PATH_POINTS = 260;
const COINS = 30;
/** Dizelerin saniyeleri (stüdyo kaydı). */
const L = {
  tore: 21.8, enemy: 27.06, sometimes: 33.55, sold: 36.33, pound: 44.85, alone: 56.88, nobody: 60.43, drown: 63.68,
  rain: 66.65, alone1b: 69.71, nobody1b: 72.11, drown1b: 75.37, rain1b: 78.83, aaa: 82.07, exaggerate: 103.12,
  regret: 108.87, sometimes2: 115.1, sold2: 117.67, pound2: 126.68, confess: 135.97, alone2: 142.14, nobody2: 144.59,
  drown2: 147.62, rain2: 151.08, alone2b: 153.88, nobody2b: 156.66, drown2b: 159.87, rain2b: 162.92, aaa2: 166.59,
  love: 186.9,
} as const;

/** Kafes: koyu ahşapta baklava delikler. */
function latticeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 448;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#4a2c18";
  g.fillRect(0, 0, 256, 448);
  g.globalCompositeOperation = "destination-out";
  const size = 30;
  for (let y = 40; y < 420; y += size) {
    for (let x = 20; x < 250; x += size) {
      const cx = x + ((Math.floor(y / size) % 2) * size) / 2;
      if (cx > 236) continue;
      g.beginPath();
      g.moveTo(cx, y - 11);
      g.lineTo(cx + 11, y);
      g.lineTo(cx, y + 11);
      g.lineTo(cx - 11, y);
      g.closePath();
      g.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Şarkının itiraf anlarında yanmış olması gereken mum sayısı. */
const AUTO_LIGHT: Record<string, number> = { tore: 1, burned: 2, pound: 3, alone: 4, cry: 5, dry: 6, pound2: 8, confess: CANDLES };

export function createConfessionScene(kit: SceneKit): SongScene {
  const root = new THREE.Group();
  const path = new THREE.CatmullRomCurve3(
    Array.from({ length: 8 }, (_, i) => {
      const t = i / 7;
      const x = THREE.MathUtils.lerp(GRAMOPHONE.x - 2, 0, t) + Math.sin(t * Math.PI * 2.2) * 7;
      const z = THREE.MathUtils.lerp(GRAMOPHONE.z - 6, 3, t);
      return new THREE.Vector3(x, ground(x, z), z);
    }),
  );

  const wax = new THREE.MeshPhysicalMaterial({ color: "#efe6d2", roughness: 0.55, sheen: 0.4, emissive: "#ffb870", emissiveIntensity: 0 });
  const stone = new THREE.MeshStandardMaterial({ color: "#1d1d1f", roughness: 0.9 });
  interface Candle {
    group: THREE.Group;
    material: THREE.MeshPhysicalMaterial;
    flame: Emitter;
    halo: THREE.Sprite;
    top: THREE.Vector3;
    lit: number;
  }
  const candles: Candle[] = [];
  const colliders = [];
  for (let i = 0; i < CANDLES; i += 1) {
    const last = i === CANDLES - 1;
    const p = path.getPointAt(i / (CANDLES - 1));
    const group = new THREE.Group();
    group.position.set(p.x, ground(p.x, p.z), p.z);
    const height = last ? 0.2 : 0.9 + (i % 3) * 0.25;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(last ? 3 : 0.42, last ? 3.3 : 0.5, 0.3, 24), stone);
    base.position.y = 0.15;
    const material = wax.clone();
    group.add(base);
    if (!last) {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, height, 24), material);
      body.position.y = 0.3 + height / 2;
      body.castShadow = true;
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), stone);
      wick.position.y = 0.3 + height + 0.04;
      group.add(body, wick);
      colliders.push(block(kit, p.x, p.z, 0.45));
    }
    root.add(group);
    const flame = createEmitter(last ? FIRE(3.2) : { ...FIRE(0.28), count: 40 });
    const halo = glowSprite("#ffb45a", last ? 16 : 1.6);
    root.add(flame.points, halo);
    candles.push({ group, material, flame, halo, top: new THREE.Vector3(p.x, group.position.y + 0.3 + height + 0.08, p.z), lit: 0 });
  }
  const bonfireEmbers = createEmitter(EMBERS(4));
  root.add(bonfireEmbers.points);
  const heartFlame = glowSprite("#ff5a2a", 1);
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.5);
  heartShape.bezierCurveTo(-0.8, 0.05, -0.55, 0.65, 0, 0.3);
  heartShape.bezierCurveTo(0.55, 0.65, 0.8, 0.05, 0, -0.5);
  const heartGeometry = new THREE.ShapeGeometry(heartShape, 24);
  const heartOuter = new THREE.Mesh(heartGeometry, new THREE.MeshBasicMaterial({ color: "#ff4a1a", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const heartInner = new THREE.Mesh(heartGeometry, new THREE.MeshBasicMaterial({ color: "#ffd08a", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  heartInner.scale.setScalar(0.55);
  heartInner.position.z = 0.01;
  const heartMark = new THREE.Group();
  heartMark.add(heartOuter, heartInner);
  root.add(heartFlame, heartMark);

  // Yere dökülen alev: yol boyunca, yakılan muma kadar uzanan titrek bir ateş şeridi.
  const pathGeometry = new THREE.BufferGeometry();
  const pathPositions = new Float32Array(PATH_POINTS * 3);
  const pathT = new Float32Array(PATH_POINTS);
  for (let i = 0; i < PATH_POINTS; i += 1) {
    const t = i / (PATH_POINTS - 1);
    const p = path.getPointAt(t);
    const side = (kit.random() - 0.5) * 0.8;
    pathPositions.set([p.x + side, ground(p.x + side, p.z) + 0.15, p.z + (kit.random() - 0.5) * 0.6], i * 3);
    pathT[i] = t;
  }
  pathGeometry.setAttribute("position", new THREE.BufferAttribute(pathPositions, 3));
  pathGeometry.setAttribute("pathT", new THREE.BufferAttribute(pathT, 1));
  const pathMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uReach: { value: 0 }, uLevel: { value: 0 }, uScale: { value: window.innerHeight / 2 }, uCracks: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float pathT; uniform float uTime, uReach, uScale, uCracks; varying float vFlicker; varying float vOn; varying float vCrack;
      void main() {
        vec3 p = position; float f = fract(uTime * 1.3 + position.x * 0.7 + position.z * 0.41);
        vOn = step(pathT, uReach); vCrack = uCracks * (1.0 - vOn);
        p.y += f * 0.9 * vOn; vFlicker = 1.0 - f;
        vec4 mv = modelViewMatrix * vec4(p, 1.0); gl_Position = projectionMatrix * mv;
        gl_PointSize = (0.35 + vFlicker * 0.45) * uScale / max(-mv.z, 0.1);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uLevel; varying float vFlicker; varying float vOn; varying float vCrack;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * (vFlicker * vOn + vCrack * 0.35) * uLevel;
        if (a < 0.003) discard;
        vec3 fire = mix(vec3(1.0, 0.22, 0.04), vec3(1.0, 0.78, 0.38), vFlicker);
        gl_FragColor = vec4(mix(vec3(0.7, 0.02, 0.02), fire, vOn), a);
      }
    `,
  });
  const firePath = new THREE.Points(pathGeometry, pathMaterial);
  firePath.frustumCulled = false;
  root.add(firePath);

  // Yağmur: yalnız kaldığında.
  const rain = createEmitter({
    count: 700,
    colors: ["#cfd8e2", "#9aa6b2"],
    size: 0.05,
    life: 1.2,
    spread: new THREE.Vector3(22, 1, 22),
    velocity: new THREE.Vector3(0.6, -16, 0),
    jitter: 0.4,
    additive: false,
  });
  root.add(rain.points);

  // Yolun başında boş bir günah çıkarma kafesi.
  const booth = new THREE.Group();
  const walnut = new THREE.MeshStandardMaterial({ color: "#3a2212", roughness: 0.7 });
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 2.28),
    new THREE.MeshStandardMaterial({ map: latticeTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 }),
  );
  screen.position.y = 1.34;
  for (const x of [-0.72, 0.72]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.6, 0.14), walnut);
    post.position.set(x, 1.3, 0);
    booth.add(post);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.2), walnut);
  lintel.position.y = 2.56;
  const kneeler = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.34), walnut);
  kneeler.position.set(0, 0.07, 0.55);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.22), walnut);
  shelf.position.set(0.25, 1.02, -0.3);
  const votive = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.14, 12), wax);
  votive.position.set(0.25, 1.12, -0.3);
  const votiveGlow = glowSprite("#ffb45a", 0.5);
  votiveGlow.position.set(0.25, 1.26, -0.3);
  booth.add(screen, lintel, kneeler, shelf, votive, votiveGlow);
  const boothX = GRAMOPHONE.x - 5.5;
  const boothZ = GRAMOPHONE.z - 8;
  booth.position.set(boothX, ground(boothX, boothZ), boothZ);
  booth.rotation.y = Math.atan2(GRAMOPHONE.x - boothX, GRAMOPHONE.z - boothZ);
  root.add(booth);
  kit.colliders.solid(lintel, { pad: 0.1 });

  // Otuz gümüş sikke: kafesin önüne saçılmış.
  const coinGeometry = new THREE.CylinderGeometry(0.075, 0.075, 0.012, 20);
  const coins = new THREE.InstancedMesh(coinGeometry, new THREE.MeshStandardMaterial({ color: "#d9dde2", metalness: 0.95, roughness: 0.22, emissive: "#3a3c40" }), COINS);
  coins.frustumCulled = false;
  const coinCenter = new THREE.Vector3(boothX + 1.2, 0, boothZ - 1.4);
  coinCenter.y = ground(coinCenter.x, coinCenter.z);
  const coinAnchor = new THREE.Object3D();
  coinAnchor.position.copy(coinCenter);
  root.add(coins, coinAnchor);
  const coinSpots = Array.from({ length: COINS }, (_, i) => {
    const a = kit.random() * Math.PI * 2;
    const r = Math.sqrt(kit.random()) * 1.1;
    const x = coinCenter.x + Math.cos(a) * r;
    const z = coinCenter.z + Math.sin(a) * r;
    // Birkaçı üst üste: küçük bir yığın.
    const stack = i < 6 ? i : 0;
    return {
      rest: new THREE.Vector3(i < 6 ? coinCenter.x : x, (i < 6 ? coinCenter.y : ground(x, z)) + 0.008 + stack * 0.013, i < 6 ? coinCenter.z : z),
      tilt: new THREE.Euler((kit.random() - 0.5) * 0.2, kit.random() * 6, (kit.random() - 0.5) * 0.2),
      spin: 4 + kit.random() * 8,
      delay: kit.random() * 0.6,
    };
  });
  let coinLevel = 0;
  let coinTarget = 0;
  let toss = -1;
  const coinMatrix = new THREE.Matrix4();
  const coinPosition = new THREE.Vector3();
  const coinQuaternion = new THREE.Quaternion();
  const coinScale = new THREE.Vector3();
  const euler = new THREE.Euler();

  // Ansızın parlayan ateş (başkasını yakmak) ve gizli keşif: boş benzin bidonu.
  const flare = createEmitter({ ...FIRE(3.2), loop: false, life: 3.4, count: 260 });
  const flareGlow = glowSprite("#ff7a2a", 7);
  let flareAge = 99;
  root.add(flare.points, flareGlow);
  // Benzin bidonu: gerçek metal bidon (Poly Haven, CC0); yoksa kırmızı kutu.
  const canModel = kit.models.get("metal_jerrycan");
  const jerrycan: THREE.Object3D = canModel ? fitModel(canModel, 0.46, { by: "height" }) : new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.45, 0.16), new THREE.MeshStandardMaterial({ color: "#7a1414", roughness: 0.5, metalness: 0.3 }));
  const jx = GRAMOPHONE.x + 3;
  const jz = GRAMOPHONE.z - 8;
  jerrycan.position.set(jx, ground(jx, jz) + (canModel ? 0.03 : 0.22), jz);
  jerrycan.rotation.set(0, 0.6, 0.4);
  root.add(jerrycan);
  kit.colliders.solid(jerrycan, { pad: 0.05 });
  const canRest = jerrycan.position.clone();
  let canLift = -1;

  // "Kaç kişiye benzin döktüm, yaktım": kafesin önünde bir sıra insan (kadın, erkek karışık). İtiraf eden
  // elindeki bidonla önlerinden geçip döker; tutuşurlar; sonra kendine döker, kendini de yakar.
  // Gölgeler: figürün altında, ışıktan uzağa uzanan koyu bir leke. Benzin gölgeye dökülür ve yalnız gölge yanar;
  // beden hiç dokunulmamış kalır.
  const shadowTexture = (() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 256;
    const g = canvas.getContext("2d")!;
    const grad = g.createRadialGradient(64, 128, 6, 64, 128, 120);
    grad.addColorStop(0, "rgba(0,0,0,0.9)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.75)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 256);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  })();
  const makeShadow = () => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.4), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, opacity: 0, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 2;
    root.add(mesh);
    return mesh;
  };
  /** Gölgeyi figürün ayağından ışığın ters yönüne uzatır. */
  const layShadow = (mesh: THREE.Mesh, at: THREE.Vector3, lightAt: THREE.Vector3, strength: number) => {
    const dx = at.x - lightAt.x;
    const dz = at.z - lightAt.z;
    const a = Math.atan2(dx, dz);
    mesh.position.set(at.x + Math.sin(a) * 1.0, ground(at.x, at.z) + 0.03, at.z + Math.cos(a) * 1.0);
    mesh.rotation.z = -a;
    (mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * strength;
    mesh.visible = strength > 0.02;
  };
  const rowLocal = [-2.6, 0, 2.6];
  const silhouette = new THREE.MeshStandardMaterial({ color: "#0c0c10", roughness: 0.95 });
  const victims = rowLocal.map((x, i) => {
    const height = [1.68, 1.84, 1.7][i];
    const figure = createFigure({ kind: i === 1 ? "man" : "woman", material: silhouette, height });
    const p = booth.localToWorld(new THREE.Vector3(x, 0, 3.4));
    figure.group.position.set(p.x, ground(p.x, p.z), p.z);
    figure.group.rotation.y = booth.rotation.y + Math.PI;
    figure.pose = "still";
    figure.energy = 0.15 + i * 0.05;
    figure.group.visible = false;
    root.add(figure.group);
    const fire = createEmitter({ ...FIRE(0.9), count: 80 });
    root.add(fire.points);
    const glow = glowSprite("#ff8a2a", 2.0);
    glow.visible = false;
    root.add(glow);
    return { figure, fire, glow, lit: 0, seat: p, shadow: makeShadow() };
  });
  const selfShadow = makeShadow();
  const canHeld: THREE.Object3D = canModel ? fitModel(canModel, 0.4, { by: "height" }) : new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.14), new THREE.MeshStandardMaterial({ color: "#7a1414", roughness: 0.5, metalness: 0.3 }));
  canHeld.visible = false;
  const selfFire = createEmitter({ ...FIRE(1.3), count: 110 });
  root.add(selfFire.points);
  const selfGlow = glowSprite("#ff8a2a", 3);
  selfGlow.visible = false;
  root.add(selfGlow);
  const fuel = createEmitter({ count: 160, colors: ["#8a7a4a", "#3a3020"], size: 0.03, life: 0.55, spread: new THREE.Vector3(0.03, 0.03, 0.03), velocity: new THREE.Vector3(0, -1.2, 1.6), jitter: 0.5, gravity: -8, additive: false });
  root.add(fuel.points);
  let pour = -1;
  let selfBurn = 0;
  const canSpout = new THREE.Vector3();

  // "Bu sürtük bedende patlayacak gibi vuruyor kalbim": çizgi film gibi göğsünden fırlayan bir kalp.
  const heartMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(heartShape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 3 }),
    new THREE.MeshStandardMaterial({ color: "#c8101e", roughness: 0.3, emissive: "#6a0008", emissiveIntensity: 0.5 }),
  );
  heartMesh.scale.setScalar(0.001);
  heartMesh.position.set(0.05, 1.27, 0.16);
  heartMesh.rotation.set(0, 0, 0);
  let heartLevel = 0;

  // "Kendi kendime kaldığımda boğulurum": cam bir oda; ağladıkça dolar, su boynunu geçer, o kıpırdamaz.
  const room = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: "#dfe8ee", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
  const ROOM = 5.2;
  for (let k = 0; k < 4; k += 1) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, 2.7), glass);
    const a = (k * Math.PI) / 2;
    wall.position.set(Math.sin(a) * (ROOM / 2), 1.35, Math.cos(a) * (ROOM / 2));
    wall.rotation.y = a + Math.PI;
    room.add(wall);
  }
  const roomEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(ROOM, 2.7, ROOM)), new THREE.LineBasicMaterial({ color: "#cfd8e0", transparent: true, opacity: 0.6 }));
  roomEdges.position.y = 1.35;
  room.add(roomEdges);
  const water = new THREE.Mesh(new THREE.BoxGeometry(ROOM - 0.02, 1, ROOM - 0.02), new THREE.MeshStandardMaterial({ color: "#2a6a86", roughness: 0.08, transparent: true, opacity: 0.42, depthWrite: false }));
  water.position.y = 0.5;
  room.add(water);
  room.visible = false;
  root.add(room);
  const tears = [-1, 1].map(() => {
    const emitter = createEmitter({ count: 140, colors: ["#d6e8ff", "#7aa8d0"], size: 0.028, life: 0.9, spread: new THREE.Vector3(0.01, 0.01, 0.01), velocity: new THREE.Vector3(0, -0.9, 0.12), jitter: 0.12, gravity: -6, additive: true });
    root.add(emitter.points);
    return emitter;
  });
  let roomLevel = 0;
  let roomTarget = 0;
  let waterLevel = 0;
  let waterTarget = 0;
  // İlk gözyaşı: gözden düşer, yere çarpar, su olur (küçük bir birikinti); sonra oda dolmaya başlar.
  const firstTear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshPhysicalMaterial({ color: "#dfefff", roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.9 }));
  firstTear.visible = false;
  root.add(firstTear);
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshStandardMaterial({ color: "#2a6a86", roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false }));
  puddle.rotation.x = -Math.PI / 2;
  puddle.visible = false;
  root.add(puddle);
  let tearDrop = -1;
  let puddleLevel = 0;
  // Son gözyaşı: yukarı süzülür, sudan çıkar, minicik saydam bir küre olur.
  const lastTear = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshPhysicalMaterial({ color: "#eaf6ff", roughness: 0.02, transmission: 0.7, transparent: true, opacity: 0.95, clearcoat: 1 }));
  lastTear.visible = false;
  root.add(lastTear);
  let tearRise = -1;
  // Devleşen kalp atışı: üç vuruş, sonra durur.
  let bigBeats = -1;
  let bigBeatClock = 0;
  let heartStopped = false;
  let stillness = 0;
  const eye = new THREE.Vector3();
  // Son itirafta gökyüzü fenerleri: her biri bir itiraf gibi yükselir.
  const lanterns = createLanterns(30);
  root.add(lanterns.group);
  // Mumlardan yükselen kor.
  const embers = createMotes(160, "#ffb060", 0.3, new THREE.Vector3(26, 14, 40), 2);
  root.add(embers.points);

  // Krater boyunca adak mumları: her itirafla merkezden dışa bir halka daha tutuşur;
  // son itirafta bütün çukur yanar. Kırmızı cam kadehler, ufak alevler ve ortak bir ışık bulutu.
  const VOTIVES = 150;
  const votiveCup = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.09, 0.18, 10),
    new THREE.MeshPhysicalMaterial({ color: "#b2231c", roughness: 0.25, transmission: 0.45, thickness: 0.2, emissive: "#ff3a1a", emissiveIntensity: 0 }),
    VOTIVES,
  );
  const votiveFlame = new THREE.InstancedMesh(new THREE.ConeGeometry(0.05, 0.18, 8), new THREE.MeshBasicMaterial({ color: "#ffcf7a" }), VOTIVES);
  const votiveSpots = Array.from({ length: VOTIVES }, (_, i) => {
    const a = i * 2.399963 + kit.random() * 0.5;
    const r = 12 + Math.sqrt(i / VOTIVES) * 58;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return new THREE.Vector3(x, ground(x, z), z);
  });
  const votiveMatrix = new THREE.Matrix4();
  const votiveQuat = new THREE.Quaternion();
  const votivePos = new THREE.Vector3();
  const votiveScale = new THREE.Vector3();
  votiveSpots.forEach((p, i) => {
    votiveMatrix.makeTranslation(p.x, p.y + 0.09, p.z);
    votiveCup.setMatrixAt(i, votiveMatrix);
    votiveMatrix.makeScale(0.001, 0.001, 0.001);
    votiveFlame.setMatrixAt(i, votiveMatrix);
  });
  votiveCup.instanceMatrix.needsUpdate = true;
  const fieldGlowGeometry = new THREE.BufferGeometry();
  fieldGlowGeometry.setAttribute("position", new THREE.Float32BufferAttribute(votiveSpots.flatMap((p) => [p.x, p.y + 0.3, p.z]), 3));
  const votiveColors = new Float32Array(VOTIVES * 3);
  fieldGlowGeometry.setAttribute("color", new THREE.BufferAttribute(votiveColors, 3));
  const fieldGlow = new THREE.Points(
    fieldGlowGeometry,
    new THREE.PointsMaterial({ size: 2.8, map: softGlow(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }),
  );
  root.add(votiveCup, votiveFlame, fieldGlow);
  let votiveLevel = 0;
  const emberCenter = new THREE.Vector3();

  let next = 0;
  let reach = 0;
  // İtiraf eden: kafesin önünde diz çökmüştür. Her mum tutuştuğunda kalkar, o muma yürür ve önünde diz çöker;
  // son itirafta büyük ateşin karşısına geçer. Kafesin öbür yanı hep boştur: itiraf boşluğa yapılır.
  const confessor = createActor(createFigure({ kind: "man", outfit: "man_black", height: 1.84 }), ground, { speed: 1.5 });
  const kneelSpot = booth.localToWorld(new THREE.Vector3(0, 0, 1.0));
  confessor.figure.group.position.set(kneelSpot.x, ground(kneelSpot.x, kneelSpot.z), kneelSpot.z);
  confessor.figure.group.rotation.y = booth.rotation.y + Math.PI;
  confessor.rest("kneel");
  root.add(confessor.figure.group);
  confessor.figure.hold(canHeld);
  confessor.figure.group.add(heartMesh);
  const confessorAt = (dx: number, dy: number, dz: number) => () => confessor.figure.group.position.clone().add(new THREE.Vector3(dx, dy, dz));
  /** İtiraf edenin baktığı yöne göre nokta (dz ileri, dx sağa). */
  const confessorFront = (dx: number, dy: number, dz: number) => () => {
    const yaw = confessor.figure.group.rotation.y;
    const p = confessor.figure.group.position;
    return new THREE.Vector3(p.x + Math.cos(yaw) * dx + Math.sin(yaw) * dz, p.y + dy, p.z - Math.sin(yaw) * dx + Math.cos(yaw) * dz);
  };
  let confessorRest: "kneel" | "still" = "kneel";
  let confessorGoal = -1;
  let cracks = 0;
  let cracksTarget = 0;
  let pounding = false;
  let raining = 0;
  let rainTarget = 0;
  let blink = false;
  let exaggerate = 0;
  let love = 0;
  let loveTarget = 0;
  let poundTimer = 0;
  const last = candles[CANDLES - 1];
  /** En son tutuşan mumun alevine göre nokta (klip her itirafta ona keser). */
  const interactables = [
    ...candles.map((candle, index) =>
      gazeTarget({
        position: (target) => target.copy(candle.top),
        radius: index === CANDLES - 1 ? 3 : 0.7,
        reach: 5,
        label: () => (index === next ? (index === CANDLES - 1 ? "Son itiraf — ateşi yak" : "İtiraf et — mumu yak") : null),
        use: () => {
          if (index !== next) return;
          next += 1;
          kit.sfx.cue("ignite");
          if (next === CANDLES) announce(kit.hud, "Son itiraf da alev aldı. Yol merkeze çıktı.", 6);
          else announce(kit.hud, `İtiraflar ${next} / ${CANDLES} — alev bir sonraki muma uzanıyor`, 3);
        },
      }),
    ),
    // Kaldırınca bidon havaya kalkar, baş aşağı çevrilir: tek damla akmaz. Sonra yerine konur.
    secretItem(kit, "itiraf-benzin", (target) => target.copy(jerrycan.position), {
      label: "Benzin bidonunu kaldır",
      radius: 0.4,
      reach: 2.4,
      onFound: () => {
        canLift = 0;
        kit.sfx.cue("pickup");
      },
    }),
  ];

  return {
    root,
    hint: "Gramofonun önünden kratere inen mumları sırayla yak; her itiraf yolu merkeze biraz daha açar.",
    interactables,
    colliders,
    // Klip: mum ışığı (chiaroscuro) → kafesin arkasından bakış → kırmızı çatlaklar → soğuk gümüş sikkeler
    // → yağmurda gece mavisi, göz kırpan karanlık → abartılı alevler → büyük ateşte atan kalp.
    shots: [
      // Çıplak karanlık oda: adam tek başına, yanında küçük metal bidon.
      { at: 0, from: ridge(1.2, 46), path: [rim(1.5, 26), pt(GRAMOPHONE.x + 24, 10, GRAMOPHONE.z + 30)], to: confessorAt(-3.4, 1.6, -3.4), look: pt(0, 2, 0), lookTo: confessorAt(0, 1, 0), fov: 50, curve: "linear", grade: "candle", in: "fade" },
      { at: 9, from: confessorAt(2.2, 1.3, 2.2), to: confessorAt(1.7, 1.2, 1.7), look: confessorAt(0, 1.0, 0), fov: 42, curve: "linear", grade: { ...GRADES.candle, soft: 0.5 } },
      { at: 15, from: follow(jerrycan, 0.9, 0.5, 0.9), to: follow(jerrycan, 0.6, 0.35, 0.6), look: follow(jerrycan, 0, 0.2, 0), fov: 34, curve: "linear", grade: "candle" },
      // Kendi gölgesine benzin: bidon eğilir, sıvı gölgeye akar; gölge tutuşur; beden dokunulmamış.
      { at: L.tore, from: confessorFront(1.4, 1.2, 1.8), to: confessorFront(1.0, 1.0, 1.4), look: confessorFront(0, 0.6, 0.9), fov: 44, curve: "linear", grade: "fire" },
      { at: L.tore + 3, from: () => selfShadow.position.clone().add(new THREE.Vector3(1.2, 0.5, 0.8)), to: () => selfShadow.position.clone().add(new THREE.Vector3(0.8, 0.4, 0.6)), look: () => selfShadow.position.clone(), fov: 40, curve: "linear", grade: "fire" },
      // Üç siluet belirir; gölgelerine de döker; yalnız gölgeler yanar.
      { at: L.enemy, from: () => victims[1].seat.clone().add(new THREE.Vector3(-3.4, 1.4, 2.6)), to: () => victims[1].seat.clone().add(new THREE.Vector3(3.2, 1.4, 2.6)), look: () => victims[1].seat.clone().add(new THREE.Vector3(0, 1.2, 0)), fov: 44, curve: "linear", grade: "fire" },
      { at: L.sometimes, from: confessorAt(-3.2, 1.3, 1.2), to: confessorAt(-2.4, 1.2, 1.8), look: confessorAt(0, 1.0, 1.4), fov: 46, handheld: 0.02, grade: "fire" },
      { at: L.sold, from: () => victims[0].shadow.position.clone().add(new THREE.Vector3(1.4, 0.6, 1.2)), to: () => victims[2].shadow.position.clone().add(new THREE.Vector3(1.4, 0.6, 1.2)), look: () => victims[0].shadow.position.clone(), lookTo: () => victims[2].shadow.position.clone(), fov: 44, curve: "linear", grade: "fire" },
      { at: 40, from: () => victims[1].seat.clone().add(new THREE.Vector3(0, 1.5, 3.2)), to: () => victims[1].seat.clone().add(new THREE.Vector3(0, 1.4, 2.6)), look: () => victims[1].seat.clone().add(new THREE.Vector3(0, 1.2, 0)), fov: 40, curve: "linear", grade: "fire" },
      // Kalp atışı görünür: göğüs her vuruşta dışarı itilir; duvarlar titrer.
      { at: L.pound, from: confessorFront(0.95, 1.35, 1.1), to: confessorFront(0.7, 1.3, 0.85), look: confessorFront(0.05, 1.27, 0.2), fov: 36, handheld: 0.05, grade: "blood" },
      { at: 50, from: confessorFront(-1.6, 1.5, 2.0), to: confessorFront(-1.2, 1.4, 1.6), look: confessorFront(0, 1.2, 0), fov: 44, curve: "linear", grade: "blood" },
      // İlk gözyaşı: yüz; damla düşer; yere çarpar; su olur.
      { at: L.alone, from: confessorFront(0.5, 1.62, 0.9), to: confessorFront(0.3, 1.6, 0.6), look: confessorFront(0, 1.58, 0.1), fov: 28, curve: "linear", grade: "night" },
      { at: L.alone + 2.2, from: () => firstTear.position.clone().add(new THREE.Vector3(0.5, 0.15, 0.5)), to: () => firstTear.position.clone().add(new THREE.Vector3(0.35, 0.1, 0.35)), look: () => firstTear.position.clone(), fov: 26, curve: "linear", grade: "night" },
      { at: L.nobody, from: confessorFront(1.2, 0.5, 1.6), to: confessorFront(0.9, 0.35, 1.2), look: () => puddle.position.clone(), fov: 40, curve: "linear", grade: "night" },
      // Oda dolar; adam kıpırdamaz; su ağza, sonra yüze.
      { at: L.drown, from: confessorFront(-1.9, 1.35, 2.4), to: confessorFront(-1.5, 1.3, 2.0), look: confessorFront(0, 1.1, 0.1), fov: 40, curve: "linear", grade: "deep" },
      { at: L.rain, from: confessorFront(1.6, 1.55, 1.2), to: confessorFront(1.2, 1.5, 0.9), look: confessorFront(0, 1.45, 0.1), fov: 34, curve: "linear", grade: "deep" },
      { at: L.alone1b, from: confessorAt(0, 3.6, 1.4), to: confessorAt(0, 3.0, 1.0), look: confessorAt(0, 1.2, 0), fov: 46, curve: "linear", grade: "deep" },
      { at: L.drown1b, from: confessorFront(0.95, 1.62, 1.1), to: confessorFront(0.6, 1.58, 0.8), look: confessorFront(0, 1.55, 0.12), fov: 30, handheld: 0.02, grade: "deep" },
      { at: L.rain1b, from: confessorFront(-1.2, 1.7, 1.6), to: confessorFront(-0.9, 1.75, 1.2), look: confessorFront(0, 1.62, 0.1), fov: 34, curve: "linear", grade: "deep" },
      // Su yüzü örter; suyun içinde yanan gölgeler batık siluetlere döner.
      { at: L.aaa, from: confessorFront(0.8, 1.9, 1.4), to: confessorFront(0.5, 1.75, 1.0), look: confessorFront(0, 1.6, 0.1), fov: 32, curve: "linear", grade: "deep" },
      { at: 88, from: () => victims[1].seat.clone().add(new THREE.Vector3(-2.4, 1.3, 2.4)), to: () => victims[1].seat.clone().add(new THREE.Vector3(2.4, 1.3, 2.4)), look: () => victims[1].seat.clone().add(new THREE.Vector3(0, 1.1, 0)), fov: 46, curve: "linear", grade: "deep" },
      { at: 96, from: confessorAt(2.6, 1.4, 2.6), to: confessorAt(2.0, 1.3, 2.0), look: confessorAt(0, 1.2, 0), fov: 42, curve: "linear", grade: "deep" },
      { at: L.exaggerate, from: () => victims[0].seat.clone().add(new THREE.Vector3(1.2, 1.4, 1.6)), to: () => victims[2].seat.clone().add(new THREE.Vector3(1.2, 1.4, 1.6)), look: () => victims[0].seat.clone().add(new THREE.Vector3(0, 1.1, 0)), lookTo: () => victims[2].seat.clone().add(new THREE.Vector3(0, 1.1, 0)), fov: 40, curve: "linear", grade: "deep" },
      { at: L.regret, from: confessorFront(-0.9, 1.6, 1.1), to: confessorFront(-0.6, 1.58, 0.8), look: confessorFront(0, 1.55, 0.12), fov: 30, curve: "linear", grade: "deep" },
      { at: L.sometimes2, from: confessorAt(0, 3.2, 0.6), to: confessorAt(0, 2.6, 0.4), look: confessorAt(0, 1.2, 0), fov: 50, curve: "linear", grade: "deep" },
      // Kalp atışı devleşir: bir, iki, üç; durur.
      { at: L.pound2, from: confessorFront(0.95, 1.35, 1.1), to: confessorFront(0.8, 1.3, 0.95), look: confessorFront(0.05, 1.27, 0.2), fov: 34, handheld: 0.08, grade: "blood" },
      { at: L.confess, from: confessorFront(-1.4, 1.4, 1.8), to: confessorFront(-1.1, 1.35, 1.4), look: confessorFront(0, 1.25, 0.1), fov: 40, curve: "linear", grade: "blood" },
      { at: L.alone2, from: confessorFront(0.6, 1.4, 0.9), to: confessorFront(0.5, 1.35, 0.75), look: confessorFront(0.05, 1.27, 0.2), fov: 30, handheld: 0.08, grade: "blood" },
      // Her şey durur.
      { at: L.drown2, from: confessorFront(1.8, 1.5, 2.2), to: confessorFront(1.6, 1.45, 2.0), look: confessorFront(0, 1.2, 0.1), fov: 40, curve: "linear", grade: "deep" },
      { at: L.rain2, from: confessorAt(0, 3.8, 1.2), to: confessorAt(0, 3.4, 1.0), look: confessorAt(0, 1.2, 0), fov: 46, curve: "linear", grade: "deep" },
      { at: L.alone2b, from: () => victims[1].seat.clone().add(new THREE.Vector3(-2.0, 1.2, 2.2)), to: () => victims[1].seat.clone().add(new THREE.Vector3(-1.4, 1.2, 1.8)), look: () => victims[1].seat.clone().add(new THREE.Vector3(0, 1.1, 0)), fov: 42, curve: "linear", grade: "deep" },
      { at: L.drown2b, from: confessorFront(-0.7, 1.62, 0.9), to: confessorFront(-0.55, 1.6, 0.75), look: confessorFront(0, 1.58, 0.1), fov: 28, curve: "linear", grade: "deep" },
      { at: L.rain2b, from: confessorAt(2.8, 1.3, 2.8), to: confessorAt(2.4, 1.25, 2.4), look: confessorAt(0, 1.2, 0), fov: 40, curve: "linear", grade: "deep" },
      { at: L.aaa2, from: confessorFront(1.2, 1.5, 1.4), to: confessorFront(1.0, 1.45, 1.2), look: confessorFront(0, 1.3, 0.1), fov: 38, curve: "linear", grade: "deep" },
      // Bir gözyaşı yukarı süzülür; sudan çıkar; minicik saydam bir küre. Karanlık.
      { at: L.love, from: () => lastTear.position.clone().add(new THREE.Vector3(0.45, 0.05, 0.45)), to: () => lastTear.position.clone().add(new THREE.Vector3(0.3, 0.02, 0.3)), look: () => lastTear.position.clone(), fov: 26, curve: "linear", grade: "deep", in: "fade" },
      { at: 195, from: () => lastTear.position.clone().add(new THREE.Vector3(0.3, 0.02, 0.3)), to: () => lastTear.position.clone().add(new THREE.Vector3(0.22, 0.01, 0.22)), look: () => lastTear.position.clone(), fov: 20, curve: "linear", grade: "deep", out: "fade" },
    ],
    beats: [
      { at: 2, id: "room", line: "Çıplak, karanlık bir oda. Adam tek başına. Yanında küçük metal bir bidon." },
      { at: L.tore, id: "tore", line: "Benzini kendi gölgesine döküyor. Gölge tutuşuyor. Bedeni dokunulmamış kalıyor." },
      { at: L.enemy, id: "silhouettes", line: "Üç insan silueti beliriyor." },
      { at: L.sometimes, id: "burned", line: "Onların gölgelerine de döküyor. Bedenleri kıpırdamıyor; yalnız gölgeler yanıyor." },
      { at: L.sold, id: "coins" },
      { at: L.pound, id: "pound", line: "Kalp atışı görünür oluyor: göğüs her vuruşta dışarı itiliyor. Duvarlar titriyor." },
      { at: L.alone, id: "alone", line: "İlk gözyaşı düşüyor. Yere çarpıyor. Su oluyor." },
      { at: L.nobody, id: "fill", line: "Daha çok gözyaşı. Oda dolmaya başlıyor. Adam kıpırdamıyor." },
      { at: L.drown, id: "drownline", line: "Su ağzına ulaşıyor. Ayakta durmaya devam ediyor." },
      { at: L.aaa, id: "cry", line: "Su yüzünü örtüyor. Suyun içinde yanan gölgeler hâlâ görünüyor; batık siluetlere dönüşüyorlar." },
      { at: L.exaggerate, id: "exaggerate" },
      { at: L.sometimes2, id: "burned2" },
      { at: L.sold2, id: "toss" },
      { at: L.pound2, id: "pound2", line: "Kalp atışı devleşiyor. Bir. İki. Üç." },
      { at: L.drown2, id: "stop", line: "Sonra duruyor. Her şey hareketsiz." },
      { at: L.love, id: "love", line: "Bir gözyaşı düşmek yerine yukarı süzülüyor. Sudan çıkıyor; minicik, saydam bir küre oluyor. Karanlık." },
    ],
    onBeat(id) {
      // Klip kendi kendine de ilerler: her itiraf dizesinde bir mum daha tutuşur (oyuncu önden gidebilir).
      const lit = AUTO_LIGHT[id];
      if (lit !== undefined && next < lit) {
        next = lit;
        kit.sfx.cue("ignite");
      }
      if (id === "room") {
        confessor.rest("still");
        confessorRest = "still";
      }
      if (id === "tore") {
        cracksTarget = 1;
        // Kendi gölgesine benzin: bidon elde, eğilir; gölge tutuşur.
        pour = 0;
        confessorRest = "still";
        kit.sfx.cue("ignite");
      }
      if (id === "silhouettes") for (const v of victims) v.figure.group.visible = true;
      if (id === "coins") coinTarget = 1;
      if (id === "toss") toss = 0;
      if (id === "burned") {
        // Üç siluetin gölgelerine benzin: sıranın önünden geçer, döker; yalnız gölgeler tutuşur.
        pour = 0;
        for (const v of victims) v.lit = 0;
        const front = booth.localToWorld(new THREE.Vector3(0, 0, 2.1));
        confessor.goTo(front.x, front.z, false, booth.rotation.y);
        confessorRest = "still";
        kit.sfx.cue("ignite");
      }
      if (id === "burned2") exaggerate = 0.6;
      if (id === "pound") pounding = true;
      if (id === "alone") {
        pounding = false;
        blink = true;
        pour = -1;
        fuel.rate = 0;
        canHeld.visible = false;
        // İlk gözyaşı; oda adamın durduğu yerde kurulur; su birikintiden başlar.
        tearDrop = 0;
        room.position.copy(confessor.figure.group.position);
        room.rotation.y = confessor.figure.group.rotation.y;
        roomTarget = 1;
        waterLevel = 0.02;
        waterTarget = 0.06;
        confessor.rest("still");
        confessorRest = "still";
      }
      if (id === "fill") {
        rainTarget = 0.6;
        waterTarget = 0.9;
      }
      if (id === "drownline") waterTarget = 1.5;
      if (id === "cry") {
        rainTarget = 1;
        waterTarget = 2.1;
      }
      if (id === "exaggerate") exaggerate = 1;
      if (id === "pound2") {
        bigBeats = 0;
        bigBeatClock = 0;
        pounding = true;
      }
      if (id === "stop") {
        pounding = false;
        heartStopped = true;
        rainTarget = 0;
        blink = false;
      }
      if (id === "love") {
        loveTarget = 0.4;
        tearRise = 0;
        rainTarget = 0;
        pounding = false;
        kit.sfx.cue("chime");
      }
    },
    reset() {
      confessorGoal = -1;
      confessorRest = "kneel";
      confessor.rest("kneel");
      confessor.figure.group.position.set(kneelSpot.x, ground(kneelSpot.x, kneelSpot.z), kneelSpot.z);
      next = 0;
      reach = cracks = cracksTarget = raining = rainTarget = exaggerate = love = loveTarget = 0;
      pounding = blink = false;
      for (const candle of candles) candle.lit = 0;
      coinLevel = coinTarget = 0;
      toss = -1;
      pour = -1;
      selfBurn = heartLevel = roomLevel = roomTarget = waterLevel = waterTarget = 0;
      for (const v of victims) {
        v.lit = 0;
        v.figure.group.visible = false;
        v.shadow.visible = false;
      }
      canHeld.visible = false;
      tearDrop = -1;
      puddleLevel = 0;
      puddle.visible = firstTear.visible = lastTear.visible = false;
      tearRise = -1;
      bigBeats = -1;
      heartStopped = false;
      stillness = 0;
      confessor.rest("still");
      confessorRest = "still";
    },
    update(dt, time, level) {
      // Yeni bir mum tutuştuysa itiraf eden ona yürür (son mumda ateşin karşısına).
      const lastLit = Math.min(CANDLES, next) - 1;
      if (lastLit >= 0 && lastLit !== confessorGoal) {
        confessorGoal = lastLit;
        const top = candles[lastLit].top;
        const away = lastLit === CANDLES - 1 ? 5 : 1.3;
        const dir = new THREE.Vector2(top.x - GRAMOPHONE.x, top.z - GRAMOPHONE.z).normalize();
        confessor.goTo(top.x - dir.x * away, top.z - dir.y * away, false, Math.atan2(dir.x, dir.y));
        confessorRest = "kneel";
      }
      if (confessor.arrived) confessor.rest(confessorRest);
      confessor.update(dt, time);
      confessor.figure.group.visible = level > 0.05;
      // Gölgeler: ışık kaynağı büyük ateş (ya da kafesin mumu); gölge ışıktan uzağa uzanır.
      const lightAt = last.lit > 0.3 ? last.top : booth.position;
      layShadow(selfShadow, confessor.figure.group.position, lightAt, level);
      for (const v of victims) layShadow(v.shadow, v.figure.group.position, lightAt, v.figure.group.visible ? level : 0);

      // Benzin dökme: bidon elde eğilir, sıvı akar; sıra soldan sağa tutuşur; sonra kendini yakar.
      if (pour >= 0) {
        pour += dt;
        canHeld.visible = pour < 6.5;
        canHeld.rotation.z = -Math.sin(Math.min(1, pour / 0.8) * Math.PI / 2) * 1.6;
        canHeld.getWorldPosition(canSpout);
        fuel.origin.copy(canSpout).add(new THREE.Vector3(0, -0.1, 0.1));
        fuel.rate = fuel.intensity = pour > 0.4 && pour < 3.8 ? 1 : 0;
        // İlk döküş (tore) kendi gölgesine; ikinci döküş (burned) üç gölgeye.
        const victimsShown = victims[0].figure.group.visible;
        if (victimsShown) {
          victims.forEach((v, i) => {
            if (pour > 1.4 + i * 0.5) v.lit = Math.min(1, v.lit + dt * 2.5);
          });
        } else if (pour > 1.6) selfBurn = Math.min(1, selfBurn + dt * 2);
        if (pour > 22) {
          pour = -1;
          fuel.rate = 0;
        }
      }
      fuel.update(time);
      // Yalnız gölgeler yanar: ateş gölgenin üstünde, beden kıpırdamaz. Su içinde alevler kısılır; batık siluet kalır.
      const underwater = roomLevel > 0.5 && waterLevel > 1.8;
      const damp = underwater ? 0.25 : 1;
      victims.forEach((v, i) => {
        v.figure.pose = "still";
        v.figure.energy = 0.12 + i * 0.05;
        v.figure.update(dt, time);
        v.fire.origin.copy(v.shadow.position).y += 0.15;
        v.fire.rate = v.fire.intensity = v.lit * level * damp;
        v.fire.update(time);
        v.glow.position.copy(v.shadow.position).y += 0.5;
        v.glow.visible = v.lit > 0.02;
        (v.glow.material as THREE.SpriteMaterial).opacity = v.lit * level * damp * (0.6 + 0.3 * Math.sin(time * 15 + i));
      });
      selfFire.origin.copy(selfShadow.position).y += 0.15;
      selfFire.rate = selfFire.intensity = selfBurn * level * damp;
      selfFire.update(time);
      selfGlow.position.copy(selfShadow.position).y += 0.5;
      selfGlow.visible = selfBurn > 0.02;
      (selfGlow.material as THREE.SpriteMaterial).opacity = selfBurn * level * damp * (0.6 + 0.3 * Math.sin(time * 13));
      // İlk gözyaşı: gözden düşer, yere çarpar; birikinti açılır.
      if (tearDrop >= 0) {
        tearDrop += dt;
        const g = confessor.figure.group;
        const eyeAt = new THREE.Vector3(0.04, 1.6, 0.12).applyEuler(g.rotation).add(g.position);
        const floorY = ground(eyeAt.x, eyeAt.z) + 0.02;
        const k = Math.min(1, tearDrop / 1.1);
        firstTear.position.set(eyeAt.x, THREE.MathUtils.lerp(eyeAt.y, floorY, k * k), eyeAt.z + 0.02);
        firstTear.visible = tearDrop < 1.1;
        if (tearDrop >= 1.1) {
          puddleLevel = Math.min(1, puddleLevel + dt * 0.5);
          puddle.position.set(eyeAt.x, floorY, eyeAt.z);
          puddle.scale.setScalar(Math.max(0.001, ease(puddleLevel) * 0.9));
          puddle.visible = puddleLevel > 0.01 && waterLevel < 0.3;
        }
        if (tearDrop > 30) tearDrop = -1;
      }
      // Devleşen kalp: üç ağır vuruş; sonra durur.
      if (bigBeats >= 0 && !heartStopped) {
        bigBeatClock += dt;
        if (bigBeatClock > 1.6 && bigBeats < 3) {
          bigBeatClock = 0;
          bigBeats += 1;
          kit.effects.shake = 0.28;
          kit.sfx.cue("pulse");
        }
      }
      if (heartStopped) stillness = Math.min(1, stillness + dt * 0.4);
      // Son gözyaşı: yukarı süzülür, su yüzeyini geçer, saydam küre olarak asılı kalır.
      if (tearRise >= 0) {
        tearRise += dt;
        const g = confessor.figure.group;
        const eyeAt = new THREE.Vector3(0.04, 1.58, 0.14).applyEuler(g.rotation).add(g.position);
        const up = Math.min(1, tearRise / 7);
        lastTear.position.set(eyeAt.x + Math.sin(tearRise * 0.8) * 0.03, eyeAt.y + ease(up) * 1.6, eyeAt.z + 0.02);
        lastTear.scale.setScalar(1 + up * 0.8);
        lastTear.visible = true;
      }

      // Kalp: nabızla göğsünden dışarı fırlar (çizgi film abartısı); devleşen vuruşlarda üç kat.
      heartLevel = approach(heartLevel, pounding && !heartStopped ? 1 : 0, 3, dt);
      const big = bigBeats >= 0 && !heartStopped ? Math.pow(Math.max(0, 1 - bigBeatClock / 0.9), 2) * 2.2 : 0;
      const beat = bigBeats >= 0 ? big : Math.pow(0.5 + 0.5 * Math.sin(time * 8.4), 9);
      heartMesh.scale.setScalar(Math.max(0.001, heartLevel * (0.2 + beat * 0.34)));
      heartMesh.position.z = 0.12 + beat * 0.3 * heartLevel;
      heartMesh.visible = heartLevel > 0.01;

      // Cam oda ve göz yaşı: oda belirir, su yükselir; iki gözden aşağı ince iki akıntı.
      roomLevel = approach(roomLevel, roomTarget * level, 1.4, dt);
      room.visible = roomLevel > 0.01;
      waterLevel = approach(waterLevel, waterTarget, 0.35, dt);
      if (room.visible) {
        room.scale.set(1, Math.max(0.001, roomLevel), 1);
        water.scale.y = Math.max(0.001, waterLevel);
        water.position.y = (waterLevel * 1) / 2 + 0.01;
        (water.material as THREE.MeshStandardMaterial).opacity = 0.42 * roomLevel;
        glass.opacity = 0.16 * roomLevel;
      }
      tears.forEach((tear, k) => {
        eye.set(k === 0 ? -0.045 : 0.045, confessor.figure.pose === "kneel" ? 1.12 : 1.62, 0.12).applyEuler(confessor.figure.group.rotation).add(confessor.figure.group.position);
        tear.origin.copy(eye);
        tear.rate = roomLevel * (tearDrop >= 0 && tearDrop < 4 ? 0 : 1) * (1 - stillness);
        tear.intensity = roomLevel * 0.7;
        tear.update(time);
      });
      pathMaterial.uniforms.uTime.value = time;
      pathMaterial.uniforms.uLevel.value = level;
      pathMaterial.uniforms.uScale.value = window.innerHeight / 2;
      cracks += (cracksTarget - cracks) * Math.min(1, dt * 0.5);
      pathMaterial.uniforms.uCracks.value = cracks;
      const target = next === 0 ? 0 : Math.min(1, (next - 1) / (CANDLES - 1) + (next < CANDLES ? 0.5 / (CANDLES - 1) : 0));
      reach += (target - reach) * Math.min(1, dt * 0.6);
      pathMaterial.uniforms.uReach.value = reach;
      root.position.y = (level - 1) * 3;
      exaggerate = Math.max(0, exaggerate - dt / 8);

      // Kalp atışı: kamerada nabız (devleşen vuruşlar kendi sarsıntısını verir).
      if (pounding && bigBeats < 0) {
        poundTimer -= dt;
        if (poundTimer <= 0) {
          poundTimer = 0.75;
          kit.effects.shake = 0.06;
          kit.sfx.cue("pulse");
        }
      }
      raining += (rainTarget * level - raining) * Math.min(1, dt * 0.8);
      rain.origin.copy(kit.player.position).y += 14;
      rain.rate = Math.min(1, raining);
      rain.intensity = Math.min(1, raining);
      rain.update(time);
      // Göz kapakları: yavaş kırpışlar.
      const lid = blink ? Math.pow(Math.max(0, Math.sin(time * 0.9)), 30) : 0;
      kit.effects.dim = raining * 0.1 + lid * 0.6;

      let brightest: Candle | null = null;
      candles.forEach((candle, i) => {
        candle.lit = i < next ? Math.min(1, candle.lit + dt * 2) : 0;
        const flicker = 0.85 + 0.15 * Math.sin(time * 23 + i) * Math.sin(time * 7 + i);
        const big = 1 + ease(exaggerate) * 2.5;
        candle.flame.origin.copy(candle.top).y += root.position.y;
        candle.flame.rate = candle.lit;
        candle.flame.intensity = candle.lit * level * (1 - Math.min(0.6, raining * 0.3));
        candle.flame.update(time);
        candle.halo.position.copy(candle.top).y += root.position.y + (i === CANDLES - 1 ? 2.5 : 0.25);
        candle.halo.scale.setScalar((i === CANDLES - 1 ? 11 : 1.6) * big);
        // Yakın planda hale alevi boğmasın: kamera yaklaştıkça söner.
        const haloNear = THREE.MathUtils.smoothstep(kit.camera.position.distanceTo(candle.halo.position), 1.5, 5);
        (candle.halo.material as THREE.SpriteMaterial).opacity = candle.lit * level * flicker * 0.9 * (i === CANDLES - 1 ? 1 : haloNear);
        candle.halo.visible = candle.lit > 0.01;
        candle.material.emissiveIntensity = candle.lit * 0.22 * flicker;
        if (candle.lit > 0.5) brightest = candle;
      });
      bonfireEmbers.origin.copy(last.top).y += 1;
      bonfireEmbers.rate = last.lit;
      bonfireEmbers.intensity = last.lit * level;
      bonfireEmbers.update(time);
      flare.update(time);
      lanterns.update(dt, time, level);
      embers.level = Math.min(1, next / 4) * level * 0.8;
      emberCenter.set((last.top.x + GRAMOPHONE.x) / 2, last.top.y - 1, (last.top.z + GRAMOPHONE.z) / 2);
      embers.update(time, emberCenter);

      // Adak mumları: itiraf sayısıyla merkezden dışa doğru yanar; yağmur alevleri kısar.
      const votiveTarget = next >= CANDLES ? 1 : next / CANDLES;
      votiveLevel += (votiveTarget * level - votiveLevel) * Math.min(1, dt * 0.45);
      const dampRain = 1 - Math.min(0.6, raining * 0.6);
      for (let i = 0; i < VOTIVES; i += 1) {
        const on = THREE.MathUtils.clamp(votiveLevel * VOTIVES * 1.15 - i, 0, 1);
        const flicker = on * dampRain * (0.72 + 0.28 * Math.sin(time * 11 + i * 1.7) * Math.sin(time * 5.3 + i));
        const p = votiveSpots[i];
        votivePos.set(p.x, p.y + 0.26, p.z);
        votiveScale.setScalar(Math.max(0.001, flicker * 1.6));
        votiveMatrix.compose(votivePos, votiveQuat, votiveScale);
        votiveFlame.setMatrixAt(i, votiveMatrix);
        votiveColors[i * 3] = flicker;
        votiveColors[i * 3 + 1] = flicker * 0.62;
        votiveColors[i * 3 + 2] = flicker * 0.28;
      }
      votiveFlame.instanceMatrix.needsUpdate = true;
      fieldGlowGeometry.attributes.color.needsUpdate = true;
      (votiveCup.material as THREE.MeshPhysicalMaterial).emissiveIntensity = votiveLevel * dampRain * 0.7;
      votiveFlame.visible = fieldGlow.visible = votiveLevel > 0.005;
      votiveCup.visible = level > 0.05;
      flareAge += dt;
      const flareK = flareAge < 3.4 ? Math.sin(Math.min(1, flareAge / 3.4) * Math.PI) : 0;
      flareGlow.position.copy(flare.origin).y += 1.4;
      (flareGlow.material as THREE.SpriteMaterial).opacity = flareK * 0.8 * level;
      flareGlow.visible = flareK > 0.01;

      // Hâlâ seviyor: büyük ateşin ortasında nabız gibi atan bir kalp alevi.
      love += (loveTarget * level - love) * Math.min(1, dt * 0.5);
      const pulse = Math.pow(0.5 + 0.5 * Math.sin(time * 5), 6);
      heartFlame.position.copy(last.top).y += 3;
      heartFlame.scale.setScalar(2 + love * 6 * (0.9 + 0.1 * pulse));
      (heartFlame.material as THREE.SpriteMaterial).opacity = love * 0.5;
      heartFlame.visible = love > 0.01;
      heartMark.position.copy(last.top).y += 5.6;
      heartMark.lookAt(kit.camera.position);
      heartMark.scale.setScalar(love * 4.6 * (1 + 0.12 * pulse));
      (heartOuter.material as THREE.MeshBasicMaterial).opacity = love;
      (heartInner.material as THREE.MeshBasicMaterial).opacity = love * (0.5 + 0.4 * pulse);
      heartMark.visible = love > 0.01;
      if (last.lit > 0.5 && Math.hypot(kit.player.position.x - last.top.x, kit.player.position.z - last.top.z) < 2.5) kit.secrets.reveal("itiraf-merkez");
      jerrycan.visible = booth.visible = level > 0.3;
      // Sikkeler: belirir, parlar; "savrulma"da havaya kalkıp döner, yere düşer.
      coinLevel += (coinTarget * level - coinLevel) * Math.min(1, dt * 1.5);
      if (toss >= 0) toss += dt;
      coinSpots.forEach((coin, i) => {
        const t = toss >= 0 ? Math.max(0, toss - coin.delay) : 0;
        const air = t > 0 && t < 1.6 ? Math.sin((t / 1.6) * Math.PI) : 0;
        const spinAngle = t > 0 && t < 1.6 ? t * coin.spin : 0;
        euler.set(coin.tilt.x + spinAngle, coin.tilt.y, coin.tilt.z);
        coinMatrix.compose(
          coinPosition.copy(coin.rest).setY(coin.rest.y + air * (1 + (i % 5) * 0.2) + root.position.y),
          coinQuaternion.setFromEuler(euler),
          coinScale.setScalar(Math.max(0.0001, ease(coinLevel))),
        );
        coins.setMatrixAt(i, coinMatrix);
      });
      coins.instanceMatrix.needsUpdate = true;
      coins.visible = coinLevel > 0.01;
      if (toss > 2.4) toss = -1;
      if (canLift >= 0) {
        canLift += dt;
        const up = Math.sin(Math.min(1, canLift / 3.2) * Math.PI);
        jerrycan.position.copy(canRest).setY(canRest.y + up * 1.3);
        jerrycan.rotation.set(0, 0.6, 0.4 + up * (Math.PI - 0.4) + Math.sin(canLift * 9) * 0.06 * up);
        if (canLift > 3.2) {
          canLift = -1;
          jerrycan.position.copy(canRest);
          jerrycan.rotation.set(0, 0.6, 0.4);
          kit.sfx.cue("place");
        }
      }

      if (booth.visible && level > 0.5) {
        const light = kit.lights[1];
        light.color.set("#ffae5a");
        light.distance = 7;
        votiveGlow.getWorldPosition(light.position);
        light.intensity = 12 * level * (0.85 + 0.15 * Math.sin(time * 17) * Math.sin(time * 5));
      }
      if (brightest && level > 0.5) {
        const light = kit.lights[0];
        const isBig = brightest === last;
        light.color.set("#ff9a3c");
        light.distance = isBig ? 90 : 14;
        light.position.copy((brightest as Candle).top).y += isBig ? 4 : 1.2;
        light.intensity = (isBig ? 1100 : 16) * (0.85 + 0.15 * Math.sin(time * 19)) * (1 + love * 0.3);
      }
    },
  };
}
