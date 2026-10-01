import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Reflector } from "three/addons/objects/Reflector.js";
import type { SongScene } from "../../../engine/game/songStage";
import { fitModel } from "../../../engine/core/models";
import { createRoach } from "../roach";
import { announce, arc, attach, CENTER, ease, follow, gazeTarget, glowSprite, GRAMOPHONE, ground, me, pt, rim as rimAt, secretItem, type SceneKit } from "./kit";
import { GRADES } from "../../../engine/game/director";
import { createMotes, createPetals } from "../../../engine/fx/sceneProps";
import { createFigure, heartBody } from "../../../engine/fx/figure";

/** Dizelerin saniyeleri. */
const L = {
  fridge: 16.58, hate: 22.88, bottom: 29.16, wrap: 32.33, dance: 41.73, swear: 48.14, dance2: 54.47, love: 60.75,
  quiet: 66.79, night: 74.58, quietB: 80.93, nightB: 87.16, gap: 94.41, tv: 98.6, radio: 101.77, kafka: 105.08,
  dance3: 111.31, love2: 117.67, quiet2: 123.5, night2: 131.45, quiet2b: 137.74, night2b: 144.05, gap2: 150.94,
  lonely: 158.17, broken: 163.07, since: 169.24, cantlove: 175.67, quiet3: 180.37, night3: 188.28, quiet3b: 194.53,
  night3b: 200.93, end: 206.18,
} as const;
/** Yalnız aynanın gördüğü katman. */
const MIRROR_ONLY = 3;

/** Aynadaki çatlak: bir noktadan dağılan kırık çizgiler. */
function crackTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const g = canvas.getContext("2d")!;
  g.strokeStyle = "rgba(235,240,245,0.95)";
  g.lineCap = "round";
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 11; i += 1) {
    let x = 140;
    let y = 170;
    let a = (i / 11) * Math.PI * 2 + rnd() * 0.4;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(x, y);
    for (let step = 0; step < 9; step += 1) {
      a += (rnd() - 0.5) * 0.7;
      x += Math.cos(a) * (14 + rnd() * 18);
      y += Math.sin(a) * (14 + rnd() * 18);
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.lineWidth = 1.4;
  for (const r of [18, 42]) {
    g.beginPath();
    for (let i = 0; i <= 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      const rr = r * (0.8 + rnd() * 0.4);
      if (i === 0) g.moveTo(140 + Math.cos(a) * rr, 170 + Math.sin(a) * rr);
      else g.lineTo(140 + Math.cos(a) * rr, 170 + Math.sin(a) * rr);
    }
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Kafakafka — boşlukta bir evin gürültüsü. Buzdolabı boşalmış; süzülen bir ayna var ve
 * içine bakan kendini göremez: aynada, durduğun yerde bir hamamböceği durur (Kafka'nın
 * Dönüşüm'ü; ayna yalnız onu yansıtır). Dans edilir, ekranda sansür bandı. Nakaratlarda her
 * şey havada donar; bir tek duvar saati döner, bir gece birkaç saniyede geçer; telefonun
 * ahizesi kalkar ve asılı kalır. Ufukta dev bir ekranda kürsüdeki silüetin ağzı hiç durmaz,
 * radyo damla damla ağlar; kafa "kafka" olur, dünyaya böceğin petek gözlerinden bakılır.
 * Sonda eşyalar yalnızlığa dağılır, aynanın ortasından bir çatlak yürür.
 */
interface Appliance {
  name: string;
  group: THREE.Group;
  animate(time: number, on: boolean): void;
  on: boolean;
  fall: number;
  orbit: { radius: number; height: number; speed: number; phase: number };
  landing: THREE.Vector3;
}

type Built = Omit<Appliance, "orbit" | "landing" | "on" | "fall">;

const enamel = () => new THREE.MeshPhysicalMaterial({ color: "#e4e0d6", roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.2 });
const chrome = () => new THREE.MeshStandardMaterial({ color: "#c9c9cc", metalness: 1, roughness: 0.18 });
const black = () => new THREE.MeshStandardMaterial({ color: "#111112", roughness: 0.5 });
const walnut = () => new THREE.MeshPhysicalMaterial({ color: "#4a2a17", roughness: 0.45, clearcoat: 0.5 });

function box(w: number, h: number, d: number, material: THREE.Material, r = 0.04): THREE.Mesh {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), material);
  mesh.castShadow = true;
  return mesh;
}

/** Karlı ekran; "swear" modunda yerine sansürlü küfür simgeleri basar. */
function tvScreen(): { material: THREE.ShaderMaterial; setMode(mode: number): void } {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOn: { value: 1 }, uMode: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uOn, uMode; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 c = vUv - 0.5;
        float n = h(floor(vUv * vec2(180.0, 140.0)) + floor(uTime * 30.0));
        float scan = 0.82 + 0.18 * sin(vUv.y * 520.0 + uTime * 40.0);
        float vignette = smoothstep(0.75, 0.3, length(c * vec2(1.0, 1.25)));
        vec3 col = vec3(n * scan) * 1.5 * vignette;
        if (uMode > 0.5 && uMode < 1.5) {
          // Kürsüdeki konuşmacı: stüdyo mavisi, gri yüz, koyu takım, kırmızı kravat; ağzı hiç durmaz.
          vec3 studio = mix(vec3(0.05, 0.08, 0.22), vec3(0.2, 0.26, 0.52), vUv.y) * scan;
          float head = smoothstep(0.01, 0.0, length((c - vec2(0.0, 0.1)) * vec2(1.0, 0.8)) - 0.11);
          float suit = smoothstep(0.01, 0.0, length((c - vec2(0.0, -0.36)) * vec2(0.5, 1.0)) - 0.2);
          float tie = step(abs(c.x), 0.018) * step(c.y, -0.17) * step(-0.36, c.y) * suit;
          float mouth = smoothstep(0.01, 0.0, length((c - vec2(0.0, 0.045)) * vec2(1.0, 2.0 + 2.6 * abs(sin(uTime * 14.0)))) - 0.04);
          float podium = step(c.y, -0.3) * step(abs(c.x), 0.22);
          vec3 fig = studio;
          fig = mix(fig, vec3(0.42, 0.4, 0.38), head);
          fig = mix(fig, vec3(0.03), mouth * head);
          fig = mix(fig, vec3(0.05, 0.05, 0.07), suit);
          fig = mix(fig, vec3(0.6, 0.05, 0.05), tie);
          fig = mix(fig, vec3(0.28, 0.2, 0.14), podium);
          // Alt yazı bandı: anlamsız, sansürlü kelimeler akar.
          float band = step(-0.47, c.y) * step(c.y, -0.4);
          float words = step(0.35, h(vec2(floor(vUv.x * 14.0 + uTime * 2.0), 3.0)));
          fig = mix(fig, mix(vec3(0.9), vec3(0.02), words), band);
          col = fig * vignette * 1.4 + vec3(n) * 0.06;
        }
        // Sansür bandı.
        float bar = step(abs(c.y), 0.09) * step(1.5, uMode);
        col = mix(col, vec3(0.02), bar);
        gl_FragColor = vec4(col * uOn + vec3(0.02) * (1.0 - uOn), 1.0);
      }
    `,
  });
  return { material, setMode: (mode) => (material.uniforms.uMode.value = mode) };
}

function fridge(): Built & { door: THREE.Group; food: THREE.Group; lemon: THREE.Mesh; book: THREE.Mesh; glow: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  // İçi boş bir kasa (arka, yanlar, üst, alt): kapı açılınca içerisi, ışığı ve rafları görünür.
  const body = new THREE.Group();
  const shell = enamel();
  const inner = new THREE.MeshStandardMaterial({ color: "#eef2f2", roughness: 0.4 });
  const back = box(0.9, 1.9, 0.05, shell, 0.02);
  back.position.z = -0.375;
  const left = box(0.05, 1.9, 0.8, shell, 0.02);
  left.position.x = -0.425;
  const right = left.clone();
  right.position.x = 0.425;
  const top = box(0.9, 0.05, 0.8, shell, 0.02);
  top.position.y = 0.925;
  const bottom = top.clone();
  bottom.position.y = -0.925;
  const liner = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 1.78), inner);
  liner.position.z = -0.345;
  // İç lamba: kapı açıldıkça yanar (soğuk, beyaz buzdolabı ışığı).
  const glow = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#e9fbff", emissiveIntensity: 0 });
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.12), glow);
  bulb.position.set(0, 0.88, -0.2);
  body.add(back, left, right, top, bottom, liner, bulb);
  const door = new THREE.Group();
  door.position.set(-0.45, 0, 0.42);
  const panel = box(0.9, 1.86, 0.06, enamel(), 0.04);
  panel.position.x = 0.45;
  const handle = box(0.05, 0.7, 0.06, chrome(), 0.02);
  handle.position.set(0.8, 0.05, 0.05);
  door.add(panel, handle);
  // İçindekiler: yenmiş raflar, bir limon ve bir kitap.
  const food = new THREE.Group();
  const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshStandardMaterial({ color: "#f2d12a", roughness: 0.6 }));
  lemon.scale.set(1.2, 1, 1);
  lemon.position.set(-0.15, 0.2, 0.1);
  const book = box(0.22, 0.3, 0.05, new THREE.MeshStandardMaterial({ color: "#5c1b1b" }), 0.01);
  book.position.set(0.15, 0.25, 0.05);
  const shelf = box(0.78, 0.02, 0.6, chrome(), 0.005);
  shelf.position.y = 0.05;
  const shelf2 = shelf.clone();
  shelf2.position.y = -0.45;
  const shelf3 = shelf.clone();
  shelf3.position.y = 0.55;
  // Her şey yenmiş: boş süt şişesi, kabukları kalmış yumurtalık, ağzı açık bir kavanoz.
  const glass = new THREE.MeshStandardMaterial({ color: "#dfe9ee", roughness: 0.1, transparent: true, opacity: 0.45 });
  const milk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.3, 14), glass);
  milk.position.set(0.25, -0.28, 0.05);
  const carton = box(0.3, 0.06, 0.16, new THREE.MeshStandardMaterial({ color: "#c9b79a", roughness: 1 }), 0.01);
  carton.position.set(-0.18, 0.6, 0.02);
  const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 14, 1, true), glass);
  jar.position.set(-0.22, -0.37, 0.08);
  food.add(lemon, book, shelf, shelf2, shelf3, milk, carton, jar);
  group.add(body, door, food);
  return { name: "Buzdolabı", group, door, food, lemon, book, glow, animate: () => {} };
}

function television(screen: THREE.ShaderMaterial): Built {
  const group = new THREE.Group();
  const cabinet = box(1.3, 1.0, 0.95, walnut(), 0.08);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), screen);
  glass.position.set(-0.12, 0.02, 0.48);
  const knobs = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), chrome());
  knobs.rotation.x = Math.PI / 2;
  knobs.position.set(0.48, 0.18, 0.48);
  const antenna = new THREE.Group();
  for (const side of [-1, 1]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 6), chrome());
    rod.position.set(side * 0.2, 0.4, 0);
    rod.rotation.z = -side * 0.5;
    antenna.add(rod);
  }
  antenna.position.y = 0.5;
  group.add(cabinet, glass, knobs, antenna);
  return {
    name: "Televizyon",
    group,
    animate: (time, on) => {
      screen.uniforms.uTime.value = time;
      screen.uniforms.uOn.value += ((on ? 1 : 0) - screen.uniforms.uOn.value) * 0.1;
    },
  };
}

function radio(tears: THREE.Points): Built {
  const group = new THREE.Group();
  const body = box(1.1, 0.6, 0.42, walnut(), 0.1);
  const grill = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshStandardMaterial({ color: "#c7b58f", roughness: 1 }));
  grill.position.set(-0.22, 0, 0.215);
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), new THREE.MeshStandardMaterial({ color: "#ffd48a", emissive: "#ffb347", emissiveIntensity: 1.2 }));
  dial.position.set(0.3, 0.02, 0.216);
  const needle = box(0.01, 0.2, 0.01, black(), 0.004);
  needle.position.set(0.3, 0.02, 0.23);
  tears.position.set(-0.22, -0.05, 0.25);
  group.add(body, grill, dial, needle, tears);
  return {
    name: "Radyo",
    group,
    animate: (time, on) => {
      (dial.material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 1 + Math.sin(time * 9) * 0.3 : 0;
      needle.rotation.z = on ? Math.sin(time * 1.7) * 0.8 : needle.rotation.z;
    },
  };
}

function lamp(bulb: THREE.PointLight): Built {
  const group = new THREE.Group();
  const shadeMaterial = new THREE.MeshStandardMaterial({ color: "#efe3c4", emissive: "#ffd79a", emissiveIntensity: 2, side: THREE.DoubleSide });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.42, 0.45, 32, 1, true), shadeMaterial);
  shade.position.y = 0.55;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), chrome());
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.05, 24), black());
  foot.position.y = -0.6;
  group.add(shade, pole, foot);
  return {
    name: "Abajur",
    group,
    animate: (time, on) => {
      const flicker = on ? 0.85 + 0.15 * Math.sin(time * 37) * Math.sin(time * 13) : 0;
      shadeMaterial.emissiveIntensity = 1.1 * flicker;
      shade.getWorldPosition(bulb.position);
      bulb.color.set("#ffcf8a");
      bulb.distance = 9;
      bulb.intensity = 8 * flicker;
    },
  };
}

function washer(): Built {
  const group = new THREE.Group();
  const body = box(0.85, 0.9, 0.8, enamel(), 0.06);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 12, 40), chrome());
  ring.position.set(0, -0.02, 0.41);
  const drum = new THREE.Mesh(new THREE.CircleGeometry(0.24, 6), new THREE.MeshStandardMaterial({ color: "#3a4a58", roughness: 0.2, metalness: 0.4 }));
  drum.position.set(0, -0.02, 0.405);
  group.add(body, ring, drum);
  return { name: "Çamaşır makinesi", group, animate: (time, on) => void (on && (drum.rotation.z = time * 9)) };
}

function phone(): Built & { handset: THREE.Mesh } {
  const group = new THREE.Group();
  const red = new THREE.MeshPhysicalMaterial({ color: "#8e1016", roughness: 0.3, clearcoat: 1 });
  const base = box(0.5, 0.2, 0.45, red, 0.08);
  const handset = box(0.62, 0.1, 0.14, red, 0.05);
  handset.position.set(0, 0.16, 0);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 24), chrome());
  dial.position.set(0, 0.11, 0.1);
  dial.rotation.x = 0.4;
  group.add(base, handset, dial);
  return {
    name: "Telefon",
    group,
    handset,
    animate: (time, on) => {
      handset.position.y = on ? 0.16 + Math.max(0, Math.sin(time * 30)) * 0.03 * (Math.sin(time * 2) > 0 ? 1 : 0) : 0.16;
    },
  };
}

function clock(): Built & { hour: THREE.Mesh; minute: THREE.Mesh } {
  const group = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 48), enamel());
  face.rotation.x = Math.PI / 2;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 10, 48), black());
  const hour = box(0.03, 0.22, 0.02, black(), 0.01);
  hour.geometry.translate(0, 0.1, 0);
  hour.position.z = 0.06;
  const minute = box(0.02, 0.34, 0.02, black(), 0.01);
  minute.geometry.translate(0, 0.16, 0);
  minute.position.z = 0.07;
  group.add(face, rim, hour, minute);
  return {
    name: "Saat",
    group,
    hour,
    minute,
    animate: (time, on) => {
      if (!on) return;
      minute.rotation.z = -time * 6;
      hour.rotation.z = -time * 0.5;
    },
  };
}


export function createHouseScene(kit: SceneKit): SongScene {
  const root = new THREE.Group();
  const screen = tvScreen();
  const radioTears = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(20 * 3), 3)),
    new THREE.PointsMaterial({ color: "#bcd4ff", size: 0.05, transparent: true }),
  );
  const theFridge = fridge();
  const thePhone = phone();
  const theClock = clock();
  const builders: Array<() => Built> = [() => theFridge, () => television(screen.material), () => radio(radioTears), () => lamp(kit.lights[0]), washer, () => thePhone, () => theClock];
  const appliances: Appliance[] = builders.map((build, i) => {
    const item = build();
    item.group.scale.setScalar(1.5);
    root.add(item.group);
    kit.colliders.solid(item.group);
    return {
      ...item,
      on: true,
      fall: 0,
      orbit: { radius: 6 + (i % 3) * 1.6, height: 2 + (i % 4) * 0.9, speed: 0.12 + (i % 3) * 0.03, phase: (i / builders.length) * Math.PI * 2 },
      landing: new THREE.Vector3(),
    };
  });

  const [, tv, radioSet, lampSet, washerSet] = appliances;

  // Süzülen ayna: gerçek yansıma. İçinde oyuncu yok; durduğu yerde bir hamamböceği var.
  const mirror = new THREE.Group();
  const glassMirror = new Reflector(new THREE.CircleGeometry(0.5, 48), {
    textureWidth: 512,
    textureHeight: 768,
    color: new THREE.Color("#b9c0c4"),
    multisample: 2,
  });
  glassMirror.scale.set(1.1, 1.7, 1);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 12, 64), walnut());
  rim.scale.set(1.1, 1.7, 1);
  const backing = new THREE.Mesh(new THREE.CircleGeometry(0.5, 48), walnut());
  backing.scale.set(1.1, 1.7, 1);
  backing.rotation.y = Math.PI;
  backing.position.z = -0.02;
  const crackMaterial = new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, opacity: 0, depthWrite: false });
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.7), crackMaterial);
  crack.position.z = 0.006;
  mirror.add(glassMirror, rim, backing, crack);
  root.add(mirror);
  kit.colliders.solid(rim, { shape: "round", pad: 0.1 });
  // Yansımadaki "sen": yalnız aynanın kamerasının gördüğü, dik duran bir böcek.
  const reflect = glassMirror as unknown as { _getReflectionCamera(camera: THREE.Camera): THREE.Camera };
  const reflectionCamera = reflect._getReflectionCamera.bind(glassMirror);
  reflect._getReflectionCamera = (camera) => {
    const virtual = reflectionCamera(camera);
    virtual.layers.enable(MIRROR_ONLY);
    return virtual;
  };
  // Yansıma sahneyi ikinci kez çizer: iki karede bir (uzaktayken dört karede bir) tazelenir; ayna yavaş
  // süzüldüğü için fark edilmez, entegre GPU'da kare hızı korunur.
  const renderReflection = glassMirror.onBeforeRender.bind(glassMirror);
  let reflectionFrame = 0;
  glassMirror.onBeforeRender = (renderer, scene, camera, geometry, material, group) => {
    reflectionFrame += 1;
    const far = camera.position.distanceTo(mirror.position) > 18;
    if (reflectionFrame % (far ? 4 : 2) !== 0) return;
    renderReflection(renderer, scene, camera, geometry, material, group);
  };
  const self = createRoach();
  const selfPivot = new THREE.Group();
  self.group.rotation.set(-Math.PI / 2, 0, Math.PI);
  self.group.scale.setScalar(1.05);
  selfPivot.add(self.group);
  selfPivot.traverse((object) => object.layers.set(MIRROR_ONLY));
  root.add(selfPivot);
  const mirrorHome = new THREE.Vector3();
  let mirrorTurn = 0;
  let mirrorTarget = 0;
  let cracked = 0;
  let race = 0;
  let offHook = 0;

  // Uçuşan gazete sayfaları: televizyon ve radyo gürültüsünde evin çevresinde döner.
  const pages = createPetals(90, "#e8e2d4", 0.42, new THREE.Vector3(26, 10, 26), 0.25);
  root.add(pages.mesh);
  const pagesCenter = new THREE.Vector3();
  // Abajurun çevresindeki pervaneler.
  const moths = createMotes(40, "#fff0c8", 0.14, new THREE.Vector3(2.4, 2, 2.4));
  root.add(moths.points);
  const mothCenter = new THREE.Vector3();
  // Dönüşüm'e gizli selam: babanın fırlattığı elmalar böceğin sırtına saplanmış gibi havada asılı.
  const appleMaterial = new THREE.MeshStandardMaterial({ color: "#b3141d", roughness: 0.35, emissive: "#3a0206", emissiveIntensity: 0.6 });
  const apples = Array.from({ length: 3 }, (_, i) => {
    const apple = new THREE.Group();
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), appleMaterial);
    fruit.scale.set(1, 0.9, 1);
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.07, 5), new THREE.MeshStandardMaterial({ color: "#3a2616" }));
    stalk.position.y = 0.14;
    apple.add(fruit, stalk);
    apple.userData.i = i;
    root.add(apple);
    return apple;
  });

  // Ufuktaki dev televizyon: "biri bağırıyor".
  const giantTv = television(screen.material);
  giantTv.group.scale.setScalar(26);
  giantTv.group.position.set(0, 0, -110);
  root.add(giantTv.group);
  kit.colliders.solid(giantTv.group);

  // Kafka'nın böceği: gerçekçi, dev bir hamamböceği (bacaklarıyla yürür, antenleriyle yoklar).
  const roach = createRoach();
  const beetle = roach.group;
  beetle.scale.setScalar(3.2);
  root.add(beetle);
  kit.colliders.solid(roach.body);

  // Uçuşan yiyecekler (buzdolabı yenirken).
  const snacks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.14, 0.14), new THREE.MeshStandardMaterial({ color: "#d9b36a", roughness: 0.8 }), 16);
  snacks.frustumCulled = false;
  root.add(snacks);

  // Gizli keşif: yerdeki kumanda.
  const remote = box(0.08, 0.03, 0.26, black(), 0.012);
  const rx = GRAMOPHONE.x - 6;
  const rz = GRAMOPHONE.z - 4;
  remote.position.set(rx, ground(rx, rz) + 0.03, rz);
  remote.rotation.y = 0.8;
  root.add(remote);
  let channelPresses = 0;

  const center = new THREE.Vector3();
  let silenced = 0;
  let fridgeOpen = 0;
  let fridgeFind = -1;
  let fridgeTarget = 0;
  let snacksOut = -1;
  let dance = 0;
  let danceTarget = 0;
  let frozenAll = false;
  let tvRise = 0;
  let tvTarget = 0;
  let beetleLevel = 0;
  let beetleTarget = 0;
  let lonely = 0;
  let lonelyTarget = 0;

  // Kratere saçılmış ev: sandalyeler, masalar, kutular, bir kapı; toprağa yarı gömülü, devrilmiş.
  const debris = new THREE.Group();
  const debrisWood = walnut();
  const debrisWhite = enamel();
  const debrisPieces: THREE.Object3D[] = [];
  const DEBRIS = 28;
  // Gerçek ev eşyaları (Poly Haven, CC0), gerçek boylarının iki katı; saat ve çalar saat dev: Kafka'nın
  // dünyasında zaman odadaki her şeyden büyük. Model yoksa elle yapılmış kutular.
  const HOUSEHOLD: Array<[string, number, "length" | "height"]> = [
    ["dining_chair_02", 1.9, "height"],
    ["television_02", 1.0, "length"],
    ["vintage_suitcase", 2.4, "length"],
    ["book_encyclopedia_set_01", 1.3, "length"],
    ["vintage_microwave", 1.7, "length"],
    ["woodenchair_01", 2.0, "height"],
    ["wall_clock", 1.8, "length"],
    ["alarm_clock_01", 1.4, "height"],
  ];
  for (let i = 0; i < DEBRIS; i += 1) {
    const kind = i % 4;
    const [name, size, by] = HOUSEHOLD[i % HOUSEHOLD.length];
    const model = kit.models.get(name);
    let piece: THREE.Object3D;
    if (model) piece = fitModel(model, size, { by });
    else if (kind === 0) piece = box(0.5, 0.9, 0.5, debrisWood, 0.04);
    else if (kind === 1) piece = box(1.4, 0.08, 0.9, debrisWood, 0.02);
    else if (kind === 2) piece = box(0.8, 0.8, 0.8, debrisWhite, 0.06);
    else piece = box(0.9, 2, 0.08, debrisWood, 0.03);
    const a = (i / DEBRIS) * Math.PI * 2 + kit.random() * 0.4;
    const r = 20 + kit.random() * 50;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    piece.position.set(x, ground(x, z) + (model ? 0.02 : 0.2), z);
    piece.rotation.set((kit.random() - 0.5) * (model ? 1.1 : 1.6), kit.random() * Math.PI * 2, (kit.random() - 0.5) * (model ? 1.1 : 1.6));
    if (!model) piece.scale.setScalar(1.5);
    debris.add(piece);
    debrisPieces.push(piece);
  }
  root.add(debris);
  const debrisAt = (i: number, dy = 0) => debrisPieces[i].position.clone().add(new THREE.Vector3(0, dy, 0));

  // --- Kalp kovalamacası: bacaklı iki kalp bütün şarkı boyunca kraterin çevresinde koşar. Öndeki hiç
  // yorulmaz; arkadaki her turda biraz daha yorgun: yavaşlar, öne eğilir, nefes nefese durur, yine koşar.
  // Şarkının sonunda diz çöker. (Yorulan kalp; yorulmayan sevgili.)
  const heartAhead = createFigure({ body: heartBody("#ff3b4a", 0.55), material: new THREE.MeshStandardMaterial({ color: "#8a1a24", roughness: 0.7 }), height: 1.7 });
  const heartTired = createFigure({ body: heartBody("#a8202a", 0.55), material: new THREE.MeshStandardMaterial({ color: "#5a1018", roughness: 0.8 }), height: 1.7 });
  root.add(heartAhead.group, heartTired.group);
  const CHASE_R = 34;
  let chaseAngle = 0;
  let chaseGap = 0.55;
  let tiredPause = 0;
  let tiredness = 0;
  let chaseLevel = 0;
  const chaseSpot = (angle: number) => new THREE.Vector3(Math.cos(angle) * CHASE_R, ground(Math.cos(angle) * CHASE_R, Math.sin(angle) * CHASE_R), Math.sin(angle) * CHASE_R);
  const heartAt = (which: "ahead" | "tired", dx: number, dy: number, dz: number) => () => {
    const g = (which === "ahead" ? heartAhead : heartTired).group;
    const f = new THREE.Vector3(0, 0, 1).applyQuaternion(g.quaternion);
    const s = new THREE.Vector3(f.z, 0, -f.x);
    return g.position.clone().addScaledVector(s, dx).addScaledVector(f, dz).add(new THREE.Vector3(0, dy, 0));
  };

  // --- Kafanın içindeki hapishane: kraterin kenarına yarı gömülü dev bir baş; alnında demir parmaklıklı
  // bir hücre penceresi, içinde oturan biri; kilit dışarıda. Kafanın içine kilitlenen kişi.
  const HEAD_AT = rimAt(2.55, 0, 66);
  const headGroup = new THREE.Group();
  const skinMaterial = new THREE.MeshStandardMaterial({ color: "#4a3f44", roughness: 0.7 });
  // Kafatası üç parça: alnındaki hücre için gerçek bir oyuk bırakılır (üst kapak, alt gövde, deliğin
  // çevresindeki kuşak). Delik +z yönünde (kratere bakan yüz), phi = π/2 çevresinde.
  const HOLE_T0 = 0.84;
  const HOLE_T1 = 1.28;
  const HOLE_HALF = 0.36;
  const skull = new THREE.Group();
  const skullPart = (geometry: THREE.SphereGeometry) => {
    const mesh = new THREE.Mesh(geometry, skinMaterial);
    mesh.castShadow = mesh.receiveShadow = true;
    skull.add(mesh);
  };
  skullPart(new THREE.SphereGeometry(6, 44, 14, 0, Math.PI * 2, 0, HOLE_T0));
  skullPart(new THREE.SphereGeometry(6, 44, 22, 0, Math.PI * 2, HOLE_T1, Math.PI - HOLE_T1));
  skullPart(new THREE.SphereGeometry(6, 44, 6, Math.PI / 2 + HOLE_HALF, Math.PI * 2 - HOLE_HALF * 2, HOLE_T0, HOLE_T1 - HOLE_T0));
  skull.scale.set(1, 1.15, 1.05);
  skull.position.y = 4.2;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 3, 24), skinMaterial);
  neck.position.y = 0.8;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 12), skinMaterial);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 3.4, 6.0);
  const brow = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.6, 1.2), skinMaterial);
  brow.position.set(0, 6.4, 5.4);
  const ear = (side: number) => {
    const e = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.3, 10, 20), skinMaterial);
    e.position.set(side * 6, 4.2, 0);
    e.rotation.y = Math.PI / 2;
    return e;
  };
  // Alındaki hücre: oyuk, parmaklıklar, içeride oturan figür, dışarıda asma kilit.
  const cell = new THREE.Group();
  // Oyuğun ortası: sphere(6·1.15, 6·1.05) üzerinde theta≈1.06 → y = 6.9·cos, z = 6.3·sin.
  cell.position.set(0, 4.2 + 6.9 * Math.cos((HOLE_T0 + HOLE_T1) / 2), 6.3 * Math.sin((HOLE_T0 + HOLE_T1) / 2) - 0.2);
  const hollow = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 3.2), new THREE.MeshStandardMaterial({ color: "#1a1416", roughness: 1, side: THREE.BackSide }));
  hollow.position.z = -1.4;
  const barMaterial = new THREE.MeshStandardMaterial({ color: "#5c5f66", metalness: 0.85, roughness: 0.35 });
  for (let k = 0; k < 6; k += 1) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.4, 8), barMaterial);
    bar.position.set(-1.3 + k * 0.52, 0, 0);
    cell.add(bar);
  }
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 0.12), barMaterial);
  crossbar.position.y = 0.6;
  const padlock = new THREE.Group();
  const lockBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.18), new THREE.MeshStandardMaterial({ color: "#b48a3c", metalness: 0.8, roughness: 0.3 }));
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 8, 16, Math.PI), barMaterial);
  shackle.position.y = 0.25;
  padlock.add(lockBody, shackle);
  padlock.position.set(0.05, -0.55, 0.2);
  const inmate = createFigure({ material: new THREE.MeshStandardMaterial({ color: "#e6dccc", roughness: 0.9 }), height: 1.5 });
  inmate.pose = "kneel";
  inmate.group.position.set(0.2, -1.3, -1.6);
  inmate.group.rotation.y = 0.35;
  const cellLight = glowSprite("#ffd9a0", 3.2);
  cellLight.position.set(0, 0.6, -0.8);
  cell.add(hollow, crossbar, padlock, inmate.group, cellLight);
  headGroup.add(skull, neck, nose, brow, ear(-1), ear(1), cell);
  const cellWorld = new THREE.Vector3();
  headGroup.position.copy(HEAD_AT).y -= 1.8;
  headGroup.rotation.y = Math.atan2(CENTER.x - HEAD_AT.x, CENTER.z - HEAD_AT.z);
  headGroup.scale.setScalar(0.001);
  root.add(headGroup);
  kit.colliders.solid(skull, { shape: "round", pad: 0.2 });
  const heartGlowA = glowSprite("#ff6a78", 2.2);
  const heartGlowB = glowSprite("#ff3a4a", 2.2);
  root.add(heartGlowA, heartGlowB);
  let headLevel = 0;
  let headTarget = 0;
  const cellAt = (dx: number, dy: number, dz: number) => () => cell.localToWorld(new THREE.Vector3(dx, dy, dz));

  // --- İçinden dünya taşan adam: kraterin dibinde duran bir figürün göğsünden mavi bir dünya büyür,
  // kıtalarıyla döner, adamın boyunu aşar ve üstünden deniz dökülür. Dünya bir insanın içinden taşıyor.
  const overflowMan = createFigure({ material: new THREE.MeshStandardMaterial({ color: "#1a1a1e", roughness: 0.9 }), height: 1.9 });
  overflowMan.group.position.set(-26, ground(-26, -14), -14);
  overflowMan.group.rotation.y = Math.atan2(GRAMOPHONE.x + 26, GRAMOPHONE.z + 14);
  overflowMan.pose = "still";
  const globeCanvas = document.createElement("canvas");
  globeCanvas.width = 512;
  globeCanvas.height = 256;
  {
    const g = globeCanvas.getContext("2d")!;
    g.fillStyle = "#1c4f8a";
    g.fillRect(0, 0, 512, 256);
    g.fillStyle = "#3d7a3a";
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i += 1) {
      const cx = rnd() * 512;
      const cy = 40 + rnd() * 176;
      g.beginPath();
      for (let k = 0; k <= 14; k += 1) {
        const a = (k / 14) * Math.PI * 2;
        const r = 18 + rnd() * 34;
        if (k === 0) g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6);
        else g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6);
      }
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#e8f2f6";
    g.fillRect(0, 0, 512, 16);
    g.fillRect(0, 240, 512, 16);
  }
  const globeTexture = new THREE.CanvasTexture(globeCanvas);
  globeTexture.colorSpace = THREE.SRGBColorSpace;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshStandardMaterial({ map: globeTexture, roughness: 0.55, emissive: "#0a2a4a", emissiveIntensity: 0.35 }));
  globe.position.set(0, 1.45, 0.9);
  globe.scale.setScalar(0.001);
  overflowMan.group.add(globe);
  const spill = createPetals(220, "#7fc8ff", 0.14, new THREE.Vector3(8, 6, 8), 1.4);
  spill.mesh.position.copy(overflowMan.group.position);
  root.add(overflowMan.group, spill.mesh);
  let globeLevel = 0;
  let globeTarget = 0;
  const overflowAt = (dx: number, dy: number, dz: number) => () => overflowMan.group.position.clone().add(new THREE.Vector3(dx, dy, dz));
  const spillCenter = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  const disco = glowSprite("#ff3fd0", 1);
  root.add(disco);

  const interactables = [
    ...appliances.map((item) =>
      gazeTarget({
        position: (target) => item.group.getWorldPosition(target),
        radius: 1.3,
        reach: 16,
        label: () => (item.on ? `Sustur · ${item.name}` : null),
        use: () => {
          item.on = false;
          item.landing.copy(item.group.position);
          item.landing.y = ground(item.landing.x, item.landing.z) + 0.8;
          silenced += 1;
          kit.sfx.cue("switch");
          announce(kit.hud, silenced === appliances.length ? "Sessizlik. Boşlukta ev nihayet sustu." : `Susan eşyalar ${silenced} / ${appliances.length}`, silenced === appliances.length ? 6 : 2.5);
        },
      }),
    ),
    secretItem(kit, "kafka-limon", (target) => theFridge.group.getWorldPosition(target), {
      onFound: () => {
        fridgeFind = 0;
        kit.sfx.cue("drop");
      },
      label: "Buzdolabının içine bak",
      radius: 1.3,
      reach: 5,
      available: () => fridgeOpen > 0.5,
    }),
    gazeTarget({
      position: (target) => target.copy(remote.position),
      radius: 0.3,
      reach: 2.4,
      label: () => (kit.secrets.has("kafka-kumanda") ? null : "Kumandayla kanal değiştir"),
      use: () => {
        channelPresses += 1;
        screen.setMode(channelPresses % 3);
        kit.sfx.cue("switch");
        if (channelPresses >= 3) kit.secrets.reveal("kafka-kumanda");
      },
    }),
  ];

  return {
    root,
    hint: "Boşlukta bir evin gürültüsü. Eşyalara bak, E ile sustur; şarkı ilerledikçe ev de değişecek.",
    interactables,
    // Klip: pastel sabah → soğuk buzdolabı ışığı → neon dans → donmuş beyaz nakarat → CRT ekran → böcek gözü → noir çatlak.
    // Klip: boşlukta bir evin bütün kratere saçılmış eşyaları. Ufuktaki dev ekrandan uçarak gelir;
    // buzdolabı, ayna, dans, donan nakarat (saat, ahize), böceğin krateri dolaşan yolu, çatlayan ayna;
    // sonda kraterin kenarına savrulan eşyaların üstünden dev ekrana doğru ayrılış.
    shots: [
      { at: 0, from: pt(0, 40, -140), path: [pt(-40, 24, -60), pt(-16, 8, 40)], to: me(kit, 0, 5, 12), look: pt(0, 16, -110), lookTo: me(kit, 0, 3, 0), fov: 55, curve: "linear", grade: "pastel", in: "fade" },
      { at: 8, orbit: { center: me(kit), radius: 7, height: 2.4, from: 0, to: 1 }, look: me(kit, 0, 3, 0), fov: 50, curve: "linear", grade: "pastel" },
      { at: L.fridge, from: me(kit, 0, 2.4, 0), to: me(kit, 0, 3, 0), look: follow(theFridge.group, 0, 0.1, 0), fov: 36, grade: "cold" },
      { at: 19.6, from: attach(theFridge.group, 0, 0.75, -0.28), look: attach(theFridge.group, 0, 0.4, 3), fov: 72, grade: { ...GRADES.cold, soft: 0.4 } },
      { at: L.hate, from: follow(mirror, 1.5, 0.2, 2.2), to: follow(mirror, 1.1, 0.15, 1.7), look: follow(mirror), fov: 40, grade: "cold" },
      { at: 26, from: follow(mirror, 3, 0.4, 0.6), to: follow(mirror, 2.6, 0.3, 1.4), look: follow(mirror), fov: 42, grade: "cold" },
      { at: L.bottom, from: debrisAt(3, 0.6).add(new THREE.Vector3(3, 0, 3)), to: debrisAt(3, 0.5).add(new THREE.Vector3(2, 0, 2)), look: debrisAt(3, 0.4), fov: 42, grade: "deep" },
      { at: L.wrap, orbit: { center: me(kit), radius: 5, height: 1, from: 2, to: 3.5 }, look: me(kit, 0, 2.5, 0), fov: 60, curve: "linear", grade: "deep" },
      { at: 36.5, from: me(kit, 0, 1, 4), path: [pt(30, 12, 40)], to: rimAt(0.7, 8), look: me(kit, 0, 3, 0), lookTo: CENTER, fov: 52, curve: "linear", grade: "pastel" },
      { at: L.dance, orbit: { center: me(kit), radius: 8, height: 3.5, from: 1.5, to: 4 }, look: me(kit, 0, 3, 0), fov: 60, curve: "linear", handheld: 0.05, grade: "neon", in: "flash" },
      { at: 45, from: attach(washerSet.group, 1, 0.4, 2.4), to: attach(washerSet.group, 0.7, 0.3, 2), look: attach(washerSet.group), fov: 40, roll: 0.2, rollTo: -0.2, grade: "neon" },
      { at: L.swear, from: attach(tv.group, -0.12, 0.02, 1.5), to: attach(tv.group, -0.12, 0.02, 1.2), look: attach(tv.group, -0.12, 0.02, 0), fov: 40, lens: "crt", grade: "neutral", in: "glitch" },
      { at: 51.2, orbit: { center: me(kit), radius: 10, height: 5, from: 4, to: 5.5 }, look: me(kit, 0, 3, 0), fov: 54, curve: "linear", grade: "neon" },
      { at: L.dance2, from: attach(radioSet.group, 0.5, 0.3, 2.6), to: attach(radioSet.group, 0.35, 0.2, 2), look: attach(radioSet.group, 0.3, 0.02, 0), fov: 38, grade: "neon" },
      { at: 57.5, orbit: { center: me(kit), radius: 4, height: 1.2, from: 0, to: 1.6 }, look: me(kit, 0, 3, 0), fov: 62, roll: 0.25, rollTo: -0.25, curve: "linear", grade: "fever" },
      { at: L.love, from: attach(lampSet.group, 2.2, 1, 2.2), to: attach(lampSet.group, 1.8, 0.9, 1.8), look: attach(lampSet.group, 0, 0.5, 0), fov: 40, grade: "memory" },
      { at: 63.8, orbit: { center: me(kit), radius: 12, height: 3, from: 1, to: 2 }, look: me(kit, 0, 3, 0), fov: 50, curve: "linear", grade: "fever" },
      { at: L.quiet, from: rimAt(2.9, 4), path: arc(0, 0, 50, 5, 2.9, 3.9, 3), to: me(kit, -6, 3, 14), look: CENTER, lookTo: me(kit, 0, 3, 0), fov: 48, curve: "linear", grade: "bleach", in: "white" },
      { at: 70.7, from: attach(theClock.group, 0, 0, 1.8), to: attach(theClock.group, 0, 0, 1.3), look: attach(theClock.group), fov: 36, grade: "memory" },
      // Kafanın içindeki hücre: kenardaki dev başa yaklaşım, parmaklıkların ardındaki kişi.
      { at: L.night, from: cellAt(0, 0.4, 16), path: [cellAt(-3, 1.4, 9)], to: cellAt(-0.8, 0.3, 3.6), look: cellAt(0, 0, 0), fov: 44, curve: "linear", grade: { ...GRADES.cold, exposure: 1.4 } },
      { at: 77.8, from: attach(mirror, -0.4, 0.1, 2.4), to: attach(mirror, -0.3, 0.1, 1.9), look: attach(mirror), fov: 40, grade: "bleach" },
      { at: L.quietB, from: debrisAt(11, 0.7).add(new THREE.Vector3(2.6, 0.5, -2.2)), to: debrisAt(11, 0.6).add(new THREE.Vector3(2, 0.4, -1.7)), look: debrisAt(11, 0.4), lookTo: pt(0, 30, -140), fov: 46, grade: { ...GRADES.bleach, exposure: 1.3 } },
      { at: 84, from: attach(theFridge.group, 0.6, 0.3, 2.6), to: attach(theFridge.group, 0.4, 0.2, 2), look: attach(theFridge.group), fov: 40, grade: "cold" },
      { at: L.nightB, from: cellAt(1.1, 0.2, 2.6), to: cellAt(0.5, 0.1, 1.9), look: cellAt(0.2, -0.5, -1.4), fov: 38, grade: { ...GRADES.memory, exposure: 1.4 } },
      { at: 90.6, from: me(kit, 0, 3, 8), path: [pt(-20, 10, 20)], to: pt(-30, 8, -30), look: me(kit, 0, 3, 0), lookTo: pt(0, 16, -110), fov: 50, curve: "linear", grade: "bleach", out: "fade" },
      { at: L.gap, from: pt(-30, 3, -60), to: pt(-24, 3.4, -66), look: pt(0, 16, -110), fov: 42, curve: "linear", grade: "cold", in: "fade" },
      { at: L.tv, from: pt(-6, 4, -70), to: pt(-4, 6, -78), look: pt(0, 16, -110), fov: 38, grade: "neutral" },
      { at: L.radio, from: attach(radioSet.group, -0.22, -0.05, 1.1), to: attach(radioSet.group, -0.22, -0.1, 0.8), look: attach(radioSet.group, -0.22, -0.25, 0), fov: 40, grade: { ...GRADES.cold, soft: 0.5 } },
      { at: L.kafka, from: follow(beetle, 0, 4, 0), look: me(kit, 0, 3, 0), fov: 64, lens: "eye", grade: "deep", in: "glitch" },
      { at: 108.2, from: follow(beetle, -2.6, 0.5, 6), to: follow(beetle, -4.5, 0.6, 3), look: follow(beetle, 0, 1.4, 0), fov: 50, grade: "deep" },
      { at: L.dance3, orbit: { center: me(kit), radius: 14, height: 4, from: 2, to: 3.2 }, look: me(kit, 0, 3, 0), fov: 52, curve: "linear", grade: "neon" },
      { at: 114.5, from: follow(giantTv.group, -3, 2, 36), to: follow(giantTv.group, -3, 1, 28), look: follow(giantTv.group, -3, 0.5, 0), fov: 40, lens: "crt", grade: "neutral" },
      // İçinden dünya taşan adam: göğsünden büyüyen mavi dünya ve dökülen deniz.
      { at: L.love2, from: overflowAt(-3.4, 1.4, -2.2), to: overflowAt(-2.6, 1.5, -1.2), look: overflowAt(0.2, 1.4, 1.2), fov: 44, grade: "fever" },
      { at: 121, from: overflowAt(5, 1, -2), to: overflowAt(4.2, 3.2, 2.4), look: overflowAt(0, 1.5, 1.2), lookTo: overflowAt(0, 2.4, 2), fov: 50, curve: "linear", grade: "fever" },
      { at: 120.5, from: follow(beetle, 8, 1.5, 8), to: follow(beetle, 6, 1.4, 9), look: follow(beetle, 0, 1.2, 0), fov: 46, grade: "deep" },
      { at: L.quiet2, from: me(kit, 0, 8, 22), path: [pt(24, 10, 10)], to: pt(30, 6, -30), look: me(kit, 0, 2, 0), lookTo: CENTER, fov: 50, curve: "linear", grade: "bleach", in: "white" },
      { at: 127.5, from: attach(mirror, 0.4, 0.1, 2.2), to: attach(mirror, 0.2, 0.05, 1.7), look: attach(mirror), fov: 40, grade: "bleach" },
      // Kalp kovalamacası: yorgun kalp, öndeki kalbin peşinde.
      { at: L.night2, from: heartAt("tired", 2.2, 0.8, -1.5), to: heartAt("tired", 1.6, 0.9, -1.0), look: heartAt("ahead", 0, 0.9, 0), fov: 46, handheld: 0.04, grade: { ...GRADES.memory, exposure: 1.3 } },
      { at: 134.5, from: attach(thePhone.group, -0.9, 0.6, 1.1), look: attach(thePhone.group, 0.1, 0.35, 0), fov: 40, grade: "cold" },
      // Enkaz yakın planları alçaktan, arkada gök ve dev TV: gece karanlığında kare boğulmasın.
      { at: L.quiet2b, from: debrisAt(19, 0.6).add(new THREE.Vector3(-2.6, 0.9, 2.2)), to: debrisAt(19, 0.6).add(new THREE.Vector3(-1.8, 0.7, 1.6)), look: debrisAt(19, 0.5), lookTo: pt(0, 30, -140), fov: 48, grade: { ...GRADES.bleach, exposure: 1.3 } },
      { at: 141, from: attach(theFridge.group, 0, 0.75, -0.28), look: attach(theFridge.group, 0, 0.4, 3), fov: 72, grade: { ...GRADES.cold, soft: 0.4 } },
      { at: L.night2b, from: rimAt(2.2, 9), path: arc(CENTER.x, CENTER.z, 38, 8, 2.5, 3.3, 3), to: pt(Math.cos(3.6) * 30, 7, Math.sin(3.6) * 30), look: pt(0, 1.5, 0), fov: 50, curve: "linear", grade: "memory" },
      { at: 147.5, orbit: { center: CENTER, radius: 34, height: 8, from: 3, to: 4.2 }, look: pt(0, 4, 20), fov: 50, curve: "linear", grade: "bleach" },
      { at: L.gap2, from: follow(beetle, 0, 3.4, 0), look: me(kit, 0, 3, 0), fov: 60, lens: "eye", lensAmount: 0.7, grade: "deep", in: "glitch" },
      { at: 154.5, from: me(kit, 20, 16, 20), to: me(kit, 14, 12, 14), look: me(kit, 0, 3, 0), fov: 50, curve: "linear", grade: "cold" },
      { at: L.lonely, from: heartAt("tired", 0, 0.9, 3), to: heartAt("tired", 0, 3.5, 8), look: heartAt("tired", 0, 0.8, 0), lookTo: heartAt("ahead", 0, 0.8, 0), fov: 50, curve: "linear", grade: { ...GRADES.cold, exposure: 1.35 } },
      { at: L.broken, from: attach(mirror, 0.2, 0.05, 1.8), to: attach(mirror, 0.1, 0, 1.3), look: attach(mirror), fov: 40, grade: "noir", in: "flash" },
      { at: 166, from: rimAt(1.1, 3), path: arc(0, 0, 60, 4, 1.1, 2.0, 3), to: rimAt(2.0, 3), look: CENTER, fov: 50, curve: "linear", grade: "noir" },
      { at: L.since, from: attach(lampSet.group, 2, 0.9, 2), to: attach(lampSet.group, 1.6, 0.8, 1.6), look: attach(lampSet.group, 0, 0.5, 0), fov: 40, grade: { ...GRADES.candle, soft: 0.5 } },
      { at: 172.5, from: debrisAt(7, 0.5).add(new THREE.Vector3(3, 0.9, 1)), to: debrisAt(7, 0.5).add(new THREE.Vector3(2.2, 0.8, 0.8)), look: debrisAt(7, 0.3), lookTo: pt(0, 36, -140), fov: 44, grade: { ...GRADES.noir, exposure: 1.4 } },
      // Yorgun kalp diz çöker; öndeki geri dönüp bakmadan uzaklaşır.
      { at: L.cantlove, from: heartAt("tired", 1.4, 0.7, 2.4), to: heartAt("tired", 0.6, 0.6, 1.6), look: heartAt("tired", 0, 0.8, 0), fov: 40, grade: { ...GRADES.blood, exposure: 1.3 } },
      { at: L.quiet3, from: me(kit, 30, 14, 30), to: me(kit, 40, 20, 40), look: me(kit, 0, 3, 0), fov: 50, curve: "linear", grade: "bleach", in: "white" },
      { at: 184, from: rimAt(1.6, 6), to: rimAt(1.78, 5), look: pt(0, 40, -140), lookTo: pt(0, 3, 0), fov: 46, curve: "linear", grade: "memory" },
      { at: L.night3, from: heartAt("tired", -2.6, 1.1, 2.2), to: heartAt("tired", -1.5, 0.9, 1.4), look: heartAt("tired", 0, 0.9, 0), fov: 40, grade: { ...GRADES.cold, exposure: 1.4 } },
      { at: 191.5, from: me(kit, 30, 14, 30), to: me(kit, -30, 16, 30), look: me(kit, 0, 3, 0), fov: 50, curve: "linear", grade: "bleach" },
      { at: L.quiet3b, from: me(kit, -20, 1.5, 20), to: me(kit, -16, 1.8, 22), look: me(kit, 0, 3, 0), fov: 46, curve: "linear", grade: "bleach" },
      { at: L.night3b, from: attach(mirror, 0.3, 0.1, 2.4), look: attach(mirror), fov: 42, grade: "noir" },
      { at: L.end, from: me(kit, 0, 3, 6), path: [pt(-20, 20, -20), pt(-30, 30, -90)], to: pt(0, 40, -150), look: me(kit), lookTo: pt(0, 16, -110), fov: 55, curve: "linear", grade: "bleach", out: "fade" },
    ],
    beats: [
      { at: L.fridge, id: "fridge", line: "Buzdolabının kapısı açılıyor; raflar boş, soğuk ışık yüze vuruyor." },
      { at: L.hate, id: "hate", line: "Havada süzülen bir ayna. İçinde bakanın yerinde başka bir şey duruyor." },
      { at: 25.4, id: "turn" },
      { at: L.bottom, id: "bottom", line: "Her şey ağırlaşıyor; eşyalar yere çöküyor." },
      { at: L.dance, id: "dance", line: "Tepede bir disko ışığı dönmeye başlıyor; eşyalar sallanıyor." },
      { at: L.swear, id: "swear", line: "Ekranda sansür bandı; ses kesik kesik." },
      { at: L.quiet, id: "quiet", line: "Her şey havada donuyor. Bir tek duvar saati dönüyor: bir gece, birkaç saniyede." },
      { at: L.night, id: "phone", line: "Kraterin kenarında dev bir baş; alnında parmaklıklı bir hücre, içinde biri oturuyor." },
      { at: L.tv, id: "tv", line: "Ufukta dev bir ekran yükseliyor: kürsüde bir silüet, ağzı hiç durmuyor." },
      { at: L.radio, id: "radio", line: "Radyonun hoparlöründen damlalar süzülüyor." },
      { at: L.kafka, id: "kafka", line: "Yerde kocaman bir böcek beliriyor; dünyaya onun petek gözlerinden bakıyoruz." },
      { at: L.dance3, id: "dance2" },
      { at: L.love2, id: "overflow", line: "Dipte duran adamın göğsünden bir dünya büyüyor; kıtaları dönüyor, denizi üstünden taşıyor." },
      { at: L.quiet2, id: "quiet2" },
      { at: L.lonely, id: "lonely", line: "Bacaklı iki kalp: öndeki hiç yorulmuyor, arkadaki her adımda biraz daha ağır." },
      { at: L.broken, id: "broken", line: "Aynanın ortasından bir çatlak yürüyor." },
      { at: L.cantlove, id: "cantlove", line: "Yorgun kalp diz çöküyor; öndeki dönüp bakmadan uzaklaşıyor. Ayna yine arkasını dönüyor." },
      { at: L.quiet3, id: "quiet3" },
      { at: L.end, id: "end" },
    ],
    onBeat(id) {
      if (id === "fridge") {
        fridgeTarget = 1;
        snacksOut = 0;
        kit.sfx.cue("switch");
      }
      if (id === "bottom") kit.effects.gravity = 1.8;
      if (id === "turn" || id === "cantlove") mirrorTarget = 1;
      if (id === "dance" || id === "quiet3") mirrorTarget = 0;
      if (id === "broken") {
        cracked = 1;
        kit.sfx.cue("shatter");
      }
      if (id === "dance" || id === "dance2") {
        danceTarget = 1;
        frozenAll = false;
        kit.effects.gravity = 1;
      }
      if (id === "swear") screen.setMode(2);
      if (id === "quiet" || id === "quiet2" || id === "quiet3") {
        frozenAll = true;
        danceTarget = 0;
        screen.setMode(0);
      }
      if (id === "tv") {
        frozenAll = false;
        tvTarget = 1;
        screen.setMode(1);
      }
      if (id === "kafka") {
        beetleTarget = 1;
        kit.sfx.cue("crumble");
      }
      if (id === "hate") headTarget = 1;
      if (id === "overflow") globeTarget = 1;
      if (id === "quiet3") globeTarget = 0;
      if (id === "lonely") {
        lonelyTarget = 1;
        frozenAll = false;
        danceTarget = 0;
        tvTarget = 0;
        beetleTarget = 0;
      }
      if (id === "end") lonelyTarget = 1.4;
    },
    reset() {
      silenced = 0;
      mirrorTurn = mirrorTarget = cracked = race = offHook = 0;
      channelPresses = 0;
      fridgeOpen = fridgeTarget = dance = danceTarget = tvRise = tvTarget = beetleLevel = beetleTarget = lonely = lonelyTarget = 0;
      headLevel = headTarget = globeLevel = globeTarget = chaseLevel = tiredness = tiredPause = 0;
      chaseAngle = 0;
      chaseGap = 0.55;
      snacksOut = -1;
      frozenAll = false;
      screen.setMode(0);
      center.copy(kit.player.position);
      // Ayna oyuncunun önünde, ona dönük süzülür.
      mirrorHome.set(center.x - 2.4, 0, center.z - 3.6);
      mirrorHome.y = ground(mirrorHome.x, mirrorHome.z) + 1.55;
      for (const item of appliances) {
        item.on = true;
        item.fall = 0;
      }
    },
    update(dt, time, level) {
      // Limon raftan zıplayıp kapının önüne yuvarlanır; "Dönüşüm" kitabı sayfalarını açar.
      if (fridgeFind >= 0) {
        fridgeFind += dt;
        const k = Math.min(1, fridgeFind / 1.2);
        theFridge.lemon.position.set(-0.15 + k * 0.1, 0.2 + Math.sin(k * Math.PI) * 0.35 - k * 0.95, 0.1 + k * 0.75);
        theFridge.lemon.rotation.x = -k * 6;
        theFridge.book.rotation.y = -Math.min(1, fridgeFind / 2) * 1.2;
      }
      fridgeOpen += (fridgeTarget - fridgeOpen) * Math.min(1, dt * 2);
      theFridge.door.rotation.y = -ease(fridgeOpen) * 1.9;
      theFridge.glow.emissiveIntensity = ease(fridgeOpen) * 2.2 * level;
      dance += (danceTarget - dance) * Math.min(1, dt * 1.5);
      lonely += (lonelyTarget - lonely) * Math.min(1, dt * 0.3);

      // Kalp kovalamacası: öndeki sabit hızla koşar; arkadaki yoruldukça yavaşlar ve ara sıra durup soluklanır.
      chaseLevel += (level - chaseLevel) * Math.min(1, dt * 0.8);
      tiredness = Math.min(1, tiredness + dt / 150);
      const aheadSpeed = 0.11;
      chaseAngle += dt * aheadSpeed * chaseLevel;
      if (tiredPause > 0) tiredPause -= dt;
      else if (kit.random() < dt * 0.04 * tiredness) tiredPause = 1.5 + tiredness * 2.5;
      const tiredSpeed = tiredPause > 0 ? 0 : aheadSpeed * (1 - tiredness * 0.45);
      chaseGap = Math.min(1.6, chaseGap + dt * (aheadSpeed - tiredSpeed) * chaseLevel);
      const collapsed = lonelyTarget > 0 && tiredness > 0.9;
      const a1 = chaseAngle;
      const a2 = chaseAngle - chaseGap;
      heartAhead.group.position.copy(chaseSpot(a1));
      heartAhead.group.rotation.y = Math.atan2(-Math.sin(a1), Math.cos(a1)) + Math.PI / 2 + Math.PI;
      heartTired.group.position.copy(chaseSpot(a2));
      heartTired.group.rotation.y = Math.atan2(-Math.sin(a2), Math.cos(a2)) + Math.PI / 2 + Math.PI;
      heartAhead.pose = "run";
      heartAhead.energy = 1;
      heartTired.pose = collapsed ? "kneel" : tiredPause > 0 ? "tired" : tiredness > 0.5 ? "tired" : "run";
      heartTired.energy = Math.max(0.35, 1 - tiredness);
      heartAhead.update(dt, time);
      heartTired.update(dt, time);
      heartAhead.group.visible = heartTired.group.visible = level > 0.05;
      heartAhead.group.scale.setScalar((1.7 / 1.85) * Math.max(0.001, Math.min(1, level * 2)));
      heartTired.group.scale.setScalar((1.7 / 1.85) * Math.max(0.001, Math.min(1, level * 2)));
      // Kalpler gece de okunsun: her birinin çevresinde kendi renginde hafif bir hale (yakında söner).
      heartGlowA.position.copy(heartAhead.group.position).y += 1.1;
      heartGlowB.position.copy(heartTired.group.position).y += 1.0;
      (heartGlowA.material as THREE.SpriteMaterial).opacity = level * 0.35 * THREE.MathUtils.smoothstep(kit.camera.position.distanceTo(heartGlowA.position), 1.2, 4);
      (heartGlowB.material as THREE.SpriteMaterial).opacity = level * 0.35 * THREE.MathUtils.smoothstep(kit.camera.position.distanceTo(heartGlowB.position), 1.2, 4);
      heartGlowA.visible = heartGlowB.visible = level > 0.05;
      // Kamera kalplerin yanındayken paylaşılan ışık onları aydınlatır (gece de, noir da okunsunlar).
      {
        const near = heartGlowA.position.distanceTo(kit.camera.position) < heartGlowB.position.distanceTo(kit.camera.position) ? heartGlowA : heartGlowB;
        if (near.position.distanceTo(kit.camera.position) < 12 && level > 0.5) {
          const light = kit.lights[0];
          light.color.set("#ffd0c0");
          light.distance = 14;
          light.position.copy(near.position).add(new THREE.Vector3(0.5, 1.6, 0.5));
          light.intensity = 40 * level;
        }
      }

      // Kafa: yerden yükselir (toprağa yarı gömülü kalır); hücredeki kişi soluk alır.
      headLevel += (headTarget * level - headLevel) * Math.min(1, dt * 0.5);
      headGroup.scale.setScalar(Math.max(0.001, ease(headLevel)));
      headGroup.visible = headLevel > 0.005;
      inmate.update(dt, time);
      (cellLight.material as THREE.SpriteMaterial).opacity = headLevel * (0.55 + 0.15 * Math.sin(time * 2.3));
      // Hücrenin sıcak ışığı: kamera kafaya yakınken paylaşılan ışık kafanın önüne kayar.
      if (headLevel > 0.5 && dance < 0.05) {
        cell.getWorldPosition(cellWorld);
        if (kit.camera.position.distanceTo(cellWorld) < 22) {
          const light = kit.lights[1];
          light.color.set("#ffc890");
          light.distance = 20;
          light.position.copy(cellWorld).add(new THREE.Vector3(0, 0.5, 3));
          light.intensity = 60 * headLevel * level;
        }
      }

      // İçinden dünya taşan adam.
      globeLevel += (globeTarget * level - globeLevel) * Math.min(1, dt * 0.5);
      const g = ease(globeLevel);
      // Dünya göğsünden çıkar, adamın önünde büyür; adam onun ağırlığı altında diz çöker ama görünür kalır.
      globe.scale.setScalar(Math.max(0.001, g * 1.7));
      globe.position.set(0, 1.45 + g * 0.9, 0.9 + g * 1.5);
      globe.rotation.y = time * 0.25;
      overflowMan.pose = g > 0.5 ? "kneel" : "still";
      overflowMan.update(dt, time);
      overflowMan.group.visible = level > 0.05;
      overflowMan.group.scale.setScalar((1.9 / 1.85) * Math.max(0.001, Math.min(1, level * 2)));
      spill.level = g * level;
      spillCenter.copy(overflowMan.group.position).setY(overflowMan.group.position.y + 2.5 + g * 1.5);
      spill.update(time, spillCenter);
      appliances.forEach((item, i) => {
        const o = item.orbit;
        if (item.on) {
          if (!frozenAll) {
            const speed = o.speed * (1 + dance * 2.5);
            const a = o.phase + time * speed;
            const shake = 0.04;
            const radius = o.radius + lonely * (10 + i * 3);
            const x = center.x + Math.cos(a) * radius + (Math.random() - 0.5) * shake;
            const z = center.z + Math.sin(a) * radius + (Math.random() - 0.5) * shake;
            const bounce = dance * Math.abs(Math.sin(time * 6 + i)) * 1.2;
            item.group.position.set(x, ground(x, z) + o.height + bounce + Math.sin(time * 1.3 + i) * 0.3 - (1 - level) * 6, z);
            item.group.rotation.set(Math.sin(time * 0.7 + i) * 0.25 + dance * Math.sin(time * 5 + i) * 0.3, a + Math.PI, Math.cos(time * 0.6 + i) * 0.2);
          }
        } else {
          item.fall = Math.min(1, item.fall + dt / 2.5);
          const k = item.fall * item.fall * (3 - 2 * item.fall);
          item.group.position.lerp(item.landing, k * 0.08);
          item.group.rotation.x *= 1 - k * 0.1;
          item.group.rotation.z *= 1 - k * 0.1;
        }
        item.group.visible = level > 0.02;
        item.animate(time, item.on && !frozenAll && lonely < 0.9);
      });

      // Ayna: yüzünü döner, çatlar; yansımadaki böcek bakanın yerinde durur.
      mirrorTurn += (mirrorTarget - mirrorTurn) * Math.min(1, dt * 0.7);
      mirror.position.copy(mirrorHome).y += Math.sin(time * 0.8) * 0.06 - (1 - level) * 6;
      mirror.lookAt(center.x, mirrorHome.y, center.z);
      mirror.rotateY(ease(mirrorTurn) * Math.PI);
      mirror.visible = level > 0.02;
      crackMaterial.opacity = cracked * level;
      selfPivot.position.copy(kit.camera.position);
      selfPivot.position.y -= 0.25;
      selfPivot.lookAt(mirror.position.x, selfPivot.position.y, mirror.position.z);
      selfPivot.visible = mirror.visible && mirrorTurn < 0.5;
      if (selfPivot.visible) self.update(dt, time, 0.15);

      // Donunca yalnız saat döner (bir gece birkaç saniyede geçer); telefonun ahizesi kalkar, asılı kalır.
      if (frozenAll && lonely < 0.9) {
        race += dt;
        theClock.minute.rotation.z = -race * 7.5;
        theClock.hour.rotation.z = -race * 0.625;
      }
      offHook += ((frozenAll ? 1 : 0) - offHook) * Math.min(1, dt * 2);
      if (offHook > 0.01) {
        thePhone.handset.position.set(offHook * 0.22, 0.16 + offHook * 0.5, offHook * 0.12);
        thePhone.handset.rotation.set(0, offHook * 0.5, offHook * 0.9);
      }

      // Gazeteler: dev ekran yükselince çoğalır; sessizlikte havada durur.
      pages.level = Math.max(tvRise, dance * 0.4) * level * (1 - lonely * 0.7);
      pagesCenter.set(center.x, ground(center.x, center.z) - 1, center.z);
      pages.update(frozenAll ? 0 : time, pagesCenter);
      lampSet.group.getWorldPosition(mothCenter).y -= 1;
      moths.level = level * (1 - lonely) * 0.8;
      moths.update(time, mothCenter);
      // Elmalar: böcek varken sırtının üstünde süzülür (yalnız ona bakanın göreceği ayrıntı).
      apples.forEach((apple, i) => {
        beetle.localToWorld(apple.position.set((i - 1) * 0.28, 0.62 + Math.sin(time * 1.3 + i) * 0.04, -0.5 - i * 0.18));
        apple.scale.setScalar(beetle.scale.x * 0.6);
        apple.rotation.set(i, time * 0.4 + i, 0);
        apple.visible = beetle.visible;
      });

      // Yiyecekler buzdolabından saçılır.
      if (snacksOut >= 0) snacksOut += dt;
      theFridge.group.getWorldPosition(position);
      for (let i = 0; i < 16; i += 1) {
        const t = Math.max(0, snacksOut - i * 0.08);
        const a = i * 2.4;
        euler.set(t * 3 + i, t * 2, 0);
        quaternion.setFromEuler(euler);
        scale.setScalar(snacksOut >= 0 && t < 6 ? 1 : 0.0001);
        matrix.compose(new THREE.Vector3(position.x + Math.cos(a) * t * 1.6, position.y + t * 1.2 - t * t * 0.18, position.z + Math.sin(a) * t * 1.6), quaternion, scale);
        snacks.setMatrixAt(i, matrix);
      }
      snacks.instanceMatrix.needsUpdate = true;

      // Dans: renkli ışık dönüyor.
      if (dance > 0.05 && level > 0.5) {
        const light = kit.lights[1];
        light.color.setHSL((time * 0.2) % 1, 0.8, 0.55);
        light.distance = 24;
        light.position.set(center.x + Math.cos(time * 2) * 4, ground(center.x, center.z) + 6, center.z + Math.sin(time * 2) * 4);
        light.intensity = dance * 220;
        disco.position.copy(light.position);
        (disco.material as THREE.SpriteMaterial).color.copy(light.color);
      }
      disco.visible = dance > 0.05;
      disco.scale.setScalar(2 + dance * 2);

      debris.visible = level > 0.02;
      tvRise += (tvTarget * level - tvRise) * Math.min(1, dt * 0.6);
      giantTv.group.position.y = ground(0, -110) - 30 + ease(tvRise) * 45;
      giantTv.group.visible = tvRise > 0.01;
      giantTv.animate(time, true);

      beetleLevel += (beetleTarget * level - beetleLevel) * Math.min(1, dt * 0.6);
      const ba = time * 0.12;
      const bx = Math.cos(ba) * 30;
      const bz = Math.sin(ba) * 30 + 10;
      beetle.position.set(bx, ground(bx, bz) - 3 * (1 - ease(beetleLevel)), bz);
      beetle.rotation.y = -ba;
      beetle.visible = beetleLevel > 0.01;
      if (beetle.visible) roach.update(dt, time, 0.9);

      // Radyo ağlıyor: damlalar süzülür.
      const tears = radioTears.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < 20; i += 1) tears.setXYZ(i, (i % 4) * 0.05, -((time * 0.8 + i * 0.13) % 1) * 1.2, 0);
      tears.needsUpdate = true;
      (radioTears.material as THREE.PointsMaterial).opacity = tvRise;
      remote.visible = level > 0.3;
    },
  };
}
