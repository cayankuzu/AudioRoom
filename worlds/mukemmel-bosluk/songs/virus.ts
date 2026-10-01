import * as THREE from "three";
import { createText3D } from "../../../engine/core/text3d";
import type { SongScene } from "../../../engine/game/songStage";
import { createActor, createFigure } from "../../../engine/fx/figure";
import { WORLD_RADIUS } from "../terrain";
import { createCrowd } from "./crowd";
import { GRADES } from "../../../engine/game/director";
import { announce, arc, block, cam, CENTER, ease, follow, glowSprite, GRAMOPHONE, ground, me, pt, ridge, rim, secretItem, STAGE, type SceneKit } from "./kit";
import { lightCone, setConeLevel } from "../../../engine/fx/sceneProps";

/**
 * Aşk, Virüs — bir aşkın bir virüse dönüşmesi. Kalp atışıyla başlar; toprağa kızıl
 * damarlar yayılır, dünya taşar ve alabora olur. Bir koleksiyon belirir: beş vitrin,
 * numaralı plaketler; üçüncüsünün plaketinde "KUSURLU" yazar (koleksiyonun kötü parçası).
 * İsim hecelerine bölünür; lanetlendikçe hecelerin yankıları çoğalır ve çevrende döner.
 * Ölen hep aynı kişidir (kamera yere yığılır, renk çekilir) ve kendini başka bedenlere
 * gömer: yerden mankenler doğrulur, dokunuşlar plastikleşir. Aşk virüse dönüşür ve klip
 * mikroskobun merceğinden görülür. Tadı kaçmış sakız, dizesi gelince taştan uzar.
 */
const MAP = 512;
const EXTENT = WORLD_RADIUS * 2;
const VITRINES = 5;
const MANNEQUINS = 34;
const CORDON = 16;
const VIRUSES = 36;
const ECHOES = 12;
/** Dizelerin saniyeleri. */
const L = {
  nobody: 9.96, overflow: 18.2, capsize: 26.57, collection: 34.93, ah: 43.66, of: 50.36, syllables: 58.31, curse: 62.69, died: 66.73,
  bury: 70.82, virus: 78.87, plastic: 87.02, stuck: 95.43, gum: 103.84, of2: 112.53, chorus: 118.99, chorusB: 135.56, fever: 154.73,
  chorus2: 168.92, chorus2b: 185.64, end: 202.77,
} as const;

/** Vitrin plaketi: pirinç zemin, oyma harfler. */
function plaqueTexture(text: string, warn: boolean): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext("2d")!;
  g.fillStyle = warn ? "#3a0a0c" : "#8a6d3b";
  g.fillRect(0, 0, 256, 64);
  g.strokeStyle = "rgba(255,230,180,0.5)";
  g.strokeRect(4, 4, 248, 56);
  g.fillStyle = warn ? "#ff5a5a" : "#1c140a";
  g.font = "bold 26px serif";
  g.textAlign = "center";
  g.fillText(text, 128, 42);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface Tip {
  x: number;
  z: number;
  angle: number;
  speed: number;
  life: number;
  age: number;
  width: number;
}

function virusGeometry(): THREE.BufferGeometry {
  // Dikenli küre: ikosahedronun her köşesine sivri bir çıkıntı.
  const base = new THREE.IcosahedronGeometry(0.35, 1);
  const p = base.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 1) {
    v.fromBufferAttribute(p, i);
    const spike = (i % 3 === 0 ? 1.7 : 1) * 0.35;
    v.setLength(spike);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  base.computeVertexNormals();
  return base;
}

export async function createVirusScene(kit: SceneKit): Promise<SongScene> {
  const root = new THREE.Group();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = MAP;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, MAP, MAP);
  g.lineCap = "round";
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;

  const uniforms = { uInfect: { value: texture }, uInfectLevel: { value: 0 }, uInfectTime: { value: 0 }, uInfectBeat: { value: 6.8 } };
  // Krater zeminine damar katmanı: haritadaki yoğunluk + kılcal desen + kalp atışı.
  kit.terrain.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vInfectWorld;")
      .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvInfectWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nuniform sampler2D uInfect;\nuniform float uInfectLevel, uInfectTime, uInfectBeat;\nvarying vec3 vInfectWorld;",
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        if (uInfectLevel > 0.001) {
          float inf = texture2D(uInfect, vInfectWorld.xz / ${EXTENT.toFixed(1)} + 0.5).r * uInfectLevel;
          float n = sin(vInfectWorld.x * 1.6 + sin(vInfectWorld.z * 0.8) * 2.2) * sin(vInfectWorld.z * 1.4 + sin(vInfectWorld.x * 1.1) * 2.2);
          float capillary = smoothstep(0.82, 1.0, 1.0 - abs(n));
          float beat = 0.6 + 0.4 * pow(0.5 + 0.5 * sin(uInfectTime * uInfectBeat), 6.0);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.0, 0.01), clamp(inf * 0.8, 0.0, 0.8));
          totalEmissiveRadiance += vec3(1.0, 0.03, 0.04) * inf * (0.25 + capillary * 1.5) * beat;
        }`,
      );
  };
  kit.terrain.needsUpdate = true;

  const tips: Tip[] = [];
  const toMap = (v: number) => (v / EXTENT + 0.5) * MAP;
  const spawn = (x: number, z: number, count: number, life: number, width: number) => {
    for (let i = 0; i < count; i += 1) {
      tips.push({ x, z, angle: kit.random() * Math.PI * 2, speed: 2.5 + kit.random() * 3, life: life * (0.6 + kit.random() * 0.8), age: 0, width });
    }
  };

  // --- Koleksiyon: camekânlar; birinin içindeki parça çatlak -----------------
  const glass = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.05, transparent: true, opacity: 0.18, clearcoat: 1, depthWrite: false });
  const plinth = new THREE.MeshStandardMaterial({ color: "#161618", roughness: 0.6 });
  const relic = new THREE.MeshStandardMaterial({ color: "#c8212c", roughness: 0.35, metalness: 0.2, emissive: "#3b0205", emissiveIntensity: 0.6 });
  const vitrines = Array.from({ length: VITRINES }, (_, i) => {
    const group = new THREE.Group();
    const a = Math.PI * (0.15 + (0.7 * i) / (VITRINES - 1));
    const x = STAGE.x + Math.cos(a) * 13;
    const z = STAGE.z + 4 - Math.sin(a) * 9;
    group.position.set(x, ground(x, z), z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), plinth);
    base.position.y = 0.6;
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.5, 1.3), glass);
    box.position.y = 1.95;
    const item = new THREE.Mesh(i === 2 ? new THREE.TorusKnotGeometry(0.28, 0.09, 64, 8) : new THREE.IcosahedronGeometry(0.35, 1), relic);
    item.position.y = 1.9;
    if (i === 2) item.scale.set(1, 0.85, 1);
    // Numaralı plaket; kusurlu parçanınki kızıl.
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.28), new THREE.MeshBasicMaterial({ map: plaqueTexture(i === 2 ? `No. ${i + 1} · KUSURLU` : `No. ${i + 1}`, i === 2) }));
    plaque.position.set(0, 0.85, 0.71);
    group.add(base, box, item, plaque);
    group.rotation.y = Math.atan2(STAGE.x - x, STAGE.z + 4 - z);
    group.scale.setScalar(0.001);
    root.add(group);
    return { group, item, cracked: i === 2 };
  });
  const colliders = vitrines.map((v) => block(kit, v.group.position.x, v.group.position.z, 1.1));
  // Müze spotları: her vitrinin üstünde tavandan inen soğuk bir ışık konisi; kusurlu olanınki kızıl.
  const spots = vitrines.map((v) => {
    const cone = lightCone(v.cracked ? "#ff5a5a" : "#e8f0ff", 7.5, 1.7);
    cone.position.set(0, 7.6, 0);
    const lamp = glowSprite(v.cracked ? "#ff7a7a" : "#f2f6ff", 0.9);
    lamp.position.set(0, 7.6, 0);
    v.group.add(cone, lamp);
    return { cone, lamp };
  });

  // Nakaratta yükselen çift sarmal: aşkın kalıtımı gibi, kırmızı ve beyaz boncuklardan.
  const HELIX = 44;
  const beadGeometry = new THREE.SphereGeometry(0.16, 12, 8);
  const helixRed = new THREE.InstancedMesh(beadGeometry, new THREE.MeshStandardMaterial({ color: "#d0202c", emissive: "#6a0610", emissiveIntensity: 1, roughness: 0.3 }), HELIX);
  const helixWhite = new THREE.InstancedMesh(beadGeometry, new THREE.MeshStandardMaterial({ color: "#f4eee8", emissive: "#5a5450", emissiveIntensity: 0.8, roughness: 0.3 }), HELIX);
  const rungs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), new THREE.MeshStandardMaterial({ color: "#e8c8c8", emissive: "#4a2a2a", roughness: 0.5 }), HELIX / 2);
  for (const mesh of [helixRed, helixWhite, rungs]) {
    mesh.frustumCulled = false;
    root.add(mesh);
  }
  const helixMatrix = new THREE.Matrix4();
  const helixQ = new THREE.Quaternion();
  const helixA = new THREE.Vector3();
  const helixB = new THREE.Vector3();
  const helixS = new THREE.Vector3();
  let helix = 0;
  let helixTarget = 0;

  // --- Hece: "sen" kelimesi ikiye bölünür, etrafta döner ---------------------
  const syllables = await Promise.all(
    ["SE", "Nİ"].map((text) => createText3D(text, { font: "cinzel-400", size: 3.2, depth: 0.6, color: "#b3141d", emissive: 0.6 })),
  );
  syllables.forEach((mesh) => {
    mesh.visible = false;
    root.add(mesh);
    kit.colliders.solid(mesh);
  });
  // Lanetlendikçe hecelerin küçük yankıları çoğalır ve çevrende döner.
  const echoes = Array.from({ length: ECHOES }, (_, i) => {
    const mesh = syllables[i % 2].clone();
    mesh.scale.setScalar(0.32);
    mesh.visible = false;
    root.add(mesh);
    return mesh;
  });

  // --- Başka bedenler: yerden yarı gömülü yükselen mankenler ------------------
  const mannequinMaterial = new THREE.MeshPhysicalMaterial({ color: "#e8dcd3", roughness: 0.8, clearcoat: 0 });
  const mannequins = createCrowd(MANNEQUINS, mannequinMaterial);
  // Hasta: kraterin ortasında tek bir adam. İsim hecelerine ayrılınca sendeler, "öldü"de yığılır, yeniden
  // kalkar; ateş yükselince titrer, sonda yine yığılır. Mankenler onun kopyaları; virüs ondan yayılır.
  const patient = createActor(createFigure({ material: new THREE.MeshStandardMaterial({ color: "#e6dfd2", roughness: 0.9 }), height: 1.85 }), ground);
  patient.figure.group.position.set(5, ground(5, -7), -7);
  patient.figure.group.rotation.y = Math.atan2(4 - 5, 82 + 7);
  root.add(patient.figure.group);
  // Tutan: hasta öldüğünde arkasında diz çöker, hasta kollarına yığılır (kucakta ölmek).
  const holder = createFigure({ material: new THREE.MeshStandardMaterial({ color: "#2a2a30", roughness: 0.9 }), height: 1.8 });
  holder.pose = "kneel";
  holder.group.visible = false;
  root.add(holder.group);
  let cradle = 0;
  let cradleTarget = 0;
  const patientAt = (dx: number, dy: number, dz: number) => () => patient.figure.group.position.clone().add(new THREE.Vector3(dx, dy, dz));
  let shiver = 0;
  root.add(mannequins.mesh);
  mannequins.solidify(kit.colliders);

  // --- Virüs parçacıkları ---------------------------------------------------
  const virusMaterial = new THREE.MeshStandardMaterial({ color: "#c8212c", roughness: 0.4, emissive: "#7a0a10", emissiveIntensity: 0.8, flatShading: true });
  const viruses = new THREE.InstancedMesh(virusGeometry(), virusMaterial, VIRUSES);
  viruses.frustumCulled = false;
  root.add(viruses);
  const virusSeeds = Array.from({ length: VIRUSES }, () => ({ a: kit.random() * Math.PI * 2, r: 3 + kit.random() * 16, h: 1 + kit.random() * 6, s: 0.5 + kit.random() * 1.2, w: 0.2 + kit.random() * 0.4 }));

  // --- Gizli keşif: tadı kaçmış sakız ----------------------------------------
  const gum = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: "#f2a7c0", roughness: 0.9 }));
  gum.scale.set(1.4, 0.45, 1.1);
  const gumX = GRAMOPHONE.x - 5;
  const gumZ = GRAMOPHONE.z - 7;
  gum.position.set(gumX, ground(gumX, gumZ) + 0.05, gumZ);
  root.add(gum);
  let gumPull = -1;

  let lastX = 0;
  let lastZ = 0;
  let travelled = 0;
  let shouts = 0;
  let dirty = false;
  let flush = 0;
  let collection = 0;
  let collectionTarget = 0;
  let split = 0;
  let splitTarget = 0;
  let buried = 0;
  let buriedTarget = 0;
  let plastic = 0;
  let virusLevel = 0;
  let virusTarget = 0;

  // Karantina şeridi: kraterin kenarını çevreleyen direkler, aralarında gergin kırmızı bant, tepede
  // yanıp sönen uyarı lambaları. Damarlar yayılınca belirir: bütün krater bir karantina bölgesidir.
  const cordon = new THREE.Group();
  const poleMaterial = new THREE.MeshStandardMaterial({ color: "#d8d2c6", roughness: 0.6 });
  const tapeMaterial = new THREE.MeshBasicMaterial({ color: "#d81c2a", side: THREE.DoubleSide });
  const cordonPoints = Array.from({ length: CORDON }, (_, i) => rim((i / CORDON) * Math.PI * 2 + 0.1, 0, 72));
  const warningLamps: THREE.Sprite[] = [];
  cordonPoints.forEach((p0, i) => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 8), poleMaterial);
    pole.position.copy(p0).y += 1.3;
    const lamp = glowSprite("#ff2a1a", 2.4);
    lamp.position.copy(p0).y += 2.75;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: "#ff3a2a" }));
    cap.position.copy(lamp.position);
    cordon.add(pole, lamp, cap);
    warningLamps.push(lamp);
    const p1 = cordonPoints[(i + 1) % CORDON];
    const mid = p0.clone().lerp(p1, 0.5);
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(p0.distanceTo(p1), 0.22), tapeMaterial);
    tape.position.copy(mid).y += 1.7;
    tape.rotation.y = Math.atan2(p0.x - p1.x, p0.z - p1.z) + Math.PI / 2;
    cordon.add(tape);
  });
  cordon.visible = false;
  root.add(cordon);
  let cordonLevel = 0;
  let cordonTarget = 0;
  let capsize = 0;
  let died = 0;
  let echo = 0;
  let echoTarget = 0;
  let walker = 0;
  const center = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();

  const surge = (count = 24) => spawn(kit.player.position.x, kit.player.position.z, count, 6, 5);

  return {
    root,
    hint: "Yürüdüğün her yere bulaşıyor. E ile ismi haykır; şarkı ilerledikçe aşk bir virüse dönüşecek.",
    interactables: [
      secretItem(kit, "ask-sakiz", (target) => target.copy(gum.position), {
        label: "Taşa yapışmış sakızı çek",
        radius: 0.4,
        reach: 2.5,
        onFound: () => void (gumPull = 0),
      }),
    ],
    colliders,
    action: {
      label: "İsmi haykır",
      use: () => {
        shouts += 1;
        surge(28);
        kit.sfx.cue("pulse");
        kit.effects.shake = 0.12;
        if (shouts === 1) announce(kit.hud, "Bir isim kana karıştı; bütün krater ona bulaşıyor.", 5);
        if (shouts === 10) kit.secrets.reveal("ask-hecele");
      },
    },
    // Klip: ateşli kırmızı; koleksiyonda ağartılmış müze ışığı; hecelerde neon; virüste mikroskop.
    // Klip: bir salgının haritası. Sırttan uçarak gelir; damarlar kraterde yayılır, kenarı karantina
    // şeridi sarar, manken bedenler bütün kratere yayılmış durur; vitrinler, heceler, sarmal; ateşte
    // bütün krater dönerek görünür; sonda kordonun dışına çıkılır.
    shots: [
      // Hasta: ismi hecelenirken sendeler, yığılır, kalkar; ateşte titrer.
      { at: L.nobody + 2.5, from: patientAt(1.6, 1.4, 2.6), to: patientAt(0.9, 1.3, 1.9), look: patientAt(0, 1.4, 0), fov: 40, grade: "cold" },
      { at: L.died + 1.2, from: patientAt(-2.4, 0.5, 2.0), to: patientAt(-1.4, 0.4, 1.4), look: patientAt(0, 0.7, 0), fov: 44, handheld: 0.04, grade: "blood" },
      { at: L.fever + 3, from: patientAt(2.4, 1.4, 3.2), to: patientAt(2.0, 1.2, 2.6), look: patientAt(0, 1.1, 0), fov: 38, handheld: 0.06, grade: "fever" },
      { at: 0, from: ridge(1.2, 50), path: [pt(-20, 30, 60), pt(-6, 8, 24)], to: me(kit, 2, 2.4, 5), look: CENTER, lookTo: me(kit, 0, 2, -12), fov: 55, curve: "linear", grade: "cold", in: "fade" },
      { at: L.nobody, from: me(kit, 1.2, 0.35, 1.5), to: me(kit, 2.2, 0.4, -0.5), look: me(kit, -1, 0, -4), fov: 50, grade: { ...GRADES.fever, soft: 0.7 } },
      { at: 14, from: me(kit, -9, 0.7, 3), to: me(kit, 9, 0.7, -1), look: me(kit, 0, 0, -12), fov: 50, curve: "linear", grade: "fever" },
      { at: L.overflow, from: pt(6, 44, 60), to: pt(2, 36, 20), look: CENTER, fov: 60, curve: "linear", grade: "fever" },
      { at: 22.5, from: rim(0.55, 1.4, 70), to: rim(0.75, 1.4, 70), look: rim(0.95, 1.8, 72), fov: 44, curve: "linear", grade: "fever" },
      { at: L.capsize, from: me(kit, 10, 3, 10), to: me(kit, 8, 3.5, 8), look: me(kit, -10, 1, -10), fov: 58, roll: 0, rollTo: 0.7, grade: "fever" },
      { at: 30.5, from: me(kit, 8, 3.5, 8), to: me(kit, 6, 4, 6), look: me(kit, -10, 1, -10), fov: 58, roll: 0.7, rollTo: -0.2, grade: "fever" },
      { at: L.collection, from: cam(-15, 1.7, 54), to: cam(15, 1.7, 54), look: cam(0, 1.6, 42), fov: 44, curve: "linear", grade: "bleach" },
      { at: 39.4, from: follow(vitrines[2].group, 0.6, 2.4, 4), to: follow(vitrines[2].group, 0.2, 1.8, 2.4), look: follow(vitrines[2].group, 0, 1.3, 0), fov: 40, grade: { ...GRADES.bleach, soft: 0.8 } },
      { at: L.ah, from: follow(vitrines[2].group, 0.3, 1.95, 1.4), look: follow(vitrines[2].item), fov: 34, grade: "fever", in: "flash", flashColor: "#ff3030" },
      { at: L.of, orbit: { center: cam(0, 0, 44), radius: 9, height: 2, from: 1.2, to: 2.1 }, look: cam(0, 1.8, 43), fov: 48, curve: "linear", grade: "cold" },
      { at: L.syllables, from: me(kit, 0, 3.4, -1), to: me(kit, 0, 3.8, -3), look: me(kit, 0, 4, -10), fov: 56, grade: "neon" },
      { at: L.curse, orbit: { center: me(kit, 0, 0, -4), radius: 12, height: 3, from: 0, to: 1.4 }, look: me(kit, 0, 3.5, -4), fov: 60, curve: "linear", grade: { ...GRADES.neon, glitch: 0.2 }, in: "glitch" },
      { at: L.died, from: me(kit, 0, 1.7, 0.1), to: me(kit, 0.4, 0.25, 0.6), look: me(kit, 0, 1.2, -5), lookTo: me(kit, 1, 0.3, -2), fov: 60, roll: 0, rollTo: 1.2, grade: "blood", out: "fade" },
      { at: L.bury, from: me(kit, 3, 0.5, 3), to: me(kit, -3, 0.6, 4), look: me(kit, 0, 1.6, -8), fov: 60, curve: "linear", grade: "bleach", in: "fade" },
      { at: 75, orbit: { center: me(kit), radius: 7, height: 1.4, from: 2, to: 2.9 }, look: me(kit, 0, 1.3, 0), fov: 46, curve: "linear", grade: "bleach" },
      { at: L.virus, orbit: { center: me(kit), radius: 10, height: 4, from: 0, to: 1.2 }, look: me(kit, 0, 3, 0), fov: 56, curve: "linear", grade: "fever", lens: "scope" },
      { at: 83, from: me(kit, 2, 3, 3), to: me(kit, -2, 3.5, 2), look: me(kit, 0, 3.5, -4), fov: 40, grade: "fever", lens: "scope" },
      { at: L.plastic, from: rim(2.5, 1.3), path: [pt(-30, 1.5, 30), pt(-12, 1.4, 44)], to: cam(-4, 1.2, 50), look: pt(-20, 1.5, 20), lookTo: cam(0, 1.6, 44), fov: 46, curve: "linear", grade: "pastel" },
      { at: L.stuck, from: me(kit, 1.5, 2.6, 2), to: me(kit, 0.5, 2.8, 1), look: me(kit, 0, 3.2, -3), fov: 44, grade: { ...GRADES.fever, aberration: 0.012 } },
      { at: L.gum, from: cam(GRAMOPHONE.x - 3.8, 0.7, GRAMOPHONE.z - 5.8), to: cam(GRAMOPHONE.x - 4.3, 0.5, GRAMOPHONE.z - 6.4), look: cam(GRAMOPHONE.x - 5, 0.4, GRAMOPHONE.z - 7), fov: 36, grade: { ...GRADES.pastel, soft: 0.8 } },
      { at: 108, from: rim(3.4, 24), path: arc(0, 0, 60, 26, 3.4, 4.6, 3), to: rim(4.6, 22), look: CENTER, fov: 52, curve: "linear", grade: "fever" },
      { at: L.of2, from: me(kit, 4, 1.8, 4), look: me(kit, 0, 2, 0), fov: 50, grade: "fever", in: "flash", flashColor: "#ff3030" },
      { at: L.chorus, from: rim(1.7, 3, 70), path: [pt(-4, 6, 52)], to: me(kit, 0, 6, 12), look: rim(1.5, 2, 72), lookTo: me(kit, 0, 4, -10), fov: 60, handheld: 0.05, curve: "linear", grade: "neon" },
      { at: 123.5, from: me(kit, 2, 1.2, -2), to: me(kit, 3.4, 5, -4), look: me(kit, 5, 4, -7), lookTo: me(kit, 5, 10, -7), fov: 48, grade: "neon" },
      { at: 127, orbit: { center: me(kit), radius: 14, height: 6, from: 1, to: 2.2 }, look: me(kit, 0, 2.5, 0), fov: 56, curve: "linear", grade: "fever" },
      { at: L.chorusB, from: me(kit, 8, 1.2, -2), to: me(kit, -8, 1.4, -2), look: me(kit, 0, 4, -10), fov: 58, curve: "linear", grade: "neon" },
      { at: 144, from: cam(15, 1.7, 54), to: cam(-15, 1.7, 54), look: cam(0, 1.6, 42), fov: 44, curve: "linear", grade: "bleach" },
      { at: L.fever, orbit: { center: CENTER, radius: 40, height: 9, from: 0, to: 2.2 }, look: pt(0, 6, 0), fov: 58, handheld: 0.06, curve: "linear", grade: { ...GRADES.fever, glitch: 0.15 }, lens: "scope", in: "glitch" },
      { at: 162, from: me(kit, 0, 8, 14), to: me(kit, 0, 6, 10), look: me(kit, 0, 2, -10), fov: 60, grade: "fever" },
      { at: L.chorus2, from: me(kit, 0, 2, 6), to: me(kit, 0, 6, 12), look: me(kit, 0, 4, -10), fov: 60, handheld: 0.05, grade: "neon" },
      { at: 176, orbit: { center: me(kit, 5, 0, -7), radius: 6, height: 3, from: 0, to: 1.6 }, look: me(kit, 5, 6, -7), fov: 52, curve: "linear", grade: "neon" },
      { at: L.chorus2b, from: rim(0.2, 2.2, 70), path: arc(0, 0, 70, 2.4, 0.2, 1.4, 3), to: rim(1.4, 2.2, 70), look: rim(0.6, 2, 72), lookTo: CENTER, fov: 50, curve: "linear", grade: "fever" },
      { at: 194, orbit: { center: me(kit), radius: 7, height: 1.4, from: 3, to: 3.8 }, look: me(kit, 0, 1.3, 0), fov: 44, curve: "linear", grade: "pastel" },
      { at: L.end, from: me(kit, 0, 3, 6), path: [pt(10, 12, 60), pt(30, 20, 76)], to: ridge(0.9, 40), look: me(kit, 0, 6, -20), lookTo: CENTER, fov: 55, curve: "linear", grade: "cold", out: "fade" },
    ],
    beats: [
      { at: L.nobody, id: "nobody", line: "Toprak kızarıyor; bir şey kana karışıyor." },
      { at: L.overflow, id: "overflow", line: "Damarlar yayılıyor; krater taşıyor." },
      { at: L.capsize, id: "capsize", line: "Dünya yan yatıyor; ufuk devriliyor." },
      { at: L.collection, id: "collection", line: "Beş vitrin; birinin plaketinde tek kelime: kusurlu." },
      { at: L.syllables, id: "syllables", line: "Bir isim hecelerine ayrılıyor." },
      { at: L.curse, id: "curse", line: "Heceler çoğalıyor, etrafında dönüyor." },
      { at: L.died, id: "died", line: "Ortadaki adam yığılıyor; kraterdeki bütün mankenler onun kopyası." },
      { at: L.bury, id: "bury", line: "Yerden bedenler doğruluyor; hepsi aynı mankenin kopyası." },
      { at: L.virus, id: "virus", line: "Merceğin altında: dikenli, kızıl bir şey çoğalıyor." },
      { at: L.plastic, id: "plastic", line: "Dokunuşlar parlıyor; teninin yerinde plastik." },
      { at: L.gum, id: "gum", line: "Taşa yapışmış sakız uzuyor, uzuyor, kopuyor." },
      { at: L.chorus, id: "chorus", line: "Heceler yeniden dönüyor; virüs her yerde." },
      { at: L.fever, id: "fever", line: "Ateş yükseliyor; mercek titriyor." },
      { at: L.chorus2, id: "chorus2" },
      { at: L.end, id: "end", line: "Damarlar soluyor. Geriye kızıl bir iz kalıyor." },
    ],
    onBeat(id) {
      if (id === "nobody") uniforms.uInfectBeat.value = 5;
      if (id === "syllables") patient.rest("tired");
      if (id === "died") {
        patient.rest("tired");
        cradleTarget = 1;
      }
      if (id === "bury") {
        patient.rest("still");
        cradleTarget = 0;
      }
      if (id === "fever") {
        patient.rest("tired");
        shiver = 1;
      }
      if (id === "end") patient.rest("kneel");
      if (id === "overflow") {
        cordonTarget = 1;
        surge(16);
        uniforms.uInfectBeat.value = 7.5;
      }
      if (id === "capsize") {
        capsize = 1;
        kit.sfx.cue("whoosh");
      }
      if (id === "collection") collectionTarget = 1;
      if (id === "syllables") splitTarget = 1;
      if (id === "curse") echoTarget = 1;
      if (id === "bury") echoTarget = 0.4;
      if (id === "chorus" || id === "chorus2") echoTarget = 1;
      if (id === "chorus" || id === "chorus2") helixTarget = 1;
      if (id === "fever" || id === "end") helixTarget = 0;
      if (id === "gum" && gumPull < 0) gumPull = 0;
      if (id === "curse" || id === "chorus" || id === "chorus2") {
        surge(30);
        kit.effects.shake = 0.18;
      }
      if (id === "died") died = 1;
      if (id === "bury") buriedTarget = 1;
      if (id === "virus") virusTarget = 1;
      if (id === "plastic") plastic = 0.001;
      if (id === "fever") virusTarget = 1.6;
      if (id === "end") {
        echoTarget = 0;
        virusTarget = 0;
        buriedTarget = 0;
        splitTarget = 0;
        collectionTarget = 0;
      }
    },
    reset() {
      patient.rest("still");
      shiver = 0;
      helix = helixTarget = 0;
      cordonLevel = cordonTarget = 0;
      tips.length = 0;
      shouts = 0;
      g.globalCompositeOperation = "source-over";
      g.fillStyle = "#000";
      g.fillRect(0, 0, MAP, MAP);
      texture.needsUpdate = true;
      lastX = kit.player.position.x;
      lastZ = kit.player.position.z;
      travelled = 0;
      collection = collectionTarget = split = splitTarget = buried = buriedTarget = plastic = virusLevel = virusTarget = capsize = died = echo = echoTarget = walker = 0;
      uniforms.uInfectBeat.value = 6.8;
      center.copy(kit.player.position);
      for (let i = 0; i < MANNEQUINS; i += 1) {
        const a = (i / MANNEQUINS) * Math.PI * 2 + kit.random() * 0.3;
        // İlk on dört oyuncunun yakınında; kalanı bütün kratere dağılmış (uzaktan da görünen bir salgın).
        const r = i < 14 ? 5 + kit.random() * 9 : 18 + kit.random() * 44;
        mannequins.place(i, center.x + Math.cos(a) * r, center.z + Math.sin(a) * r, a + Math.PI, 1.05);
      }
      mannequins.presence.fill(0);
    },
    update(dt, time, level) {
      // Kucak: hasta arkaya yatar, tutan arkasında diz çökmüş; gömme dizesinde ayağa kalkar.
      cradle += (cradleTarget - cradle) * Math.min(1, dt * 1.6);
      patient.figure.group.rotation.x = -1.05 * cradle;
      patient.lift = 0.38 * cradle;
      {
        const yaw = patient.figure.group.rotation.y;
        holder.group.position.set(patient.figure.group.position.x - Math.sin(yaw) * 0.55, patient.figure.group.position.y - patient.lift, patient.figure.group.position.z - Math.cos(yaw) * 0.55);
        holder.group.rotation.y = yaw;
        holder.group.visible = cradle > 0.03 && level > 0.05;
        holder.group.scale.setScalar((1.8 / 1.85) * Math.max(0.001, Math.min(1, cradle * 3)));
        holder.update(dt, time);
      }
      patient.update(dt, time);
      shiver = Math.max(0, shiver - dt / 30);
      patient.figure.group.rotation.z = Math.sin(time * 23) * 0.02 * shiver;
      patient.figure.group.visible = level > 0.05;
      // Sakız: yukarı doğru ipince uzar, kopup yerine geri yapışır.
      if (gumPull >= 0) {
        gumPull += dt;
        const stretch = gumPull < 1.1 ? gumPull / 1.1 : Math.max(0, 1 - (gumPull - 1.1) * 6);
        gum.scale.set(1.4 - stretch * 1.1, 0.45 + stretch * 5, 1.1 - stretch * 0.8);
        gum.position.y = ground(gumX, gumZ) + 0.05 + stretch * 0.55;
        if (gumPull > 1.1 && gumPull - dt <= 1.1) kit.sfx.cue("hit");
        if (gumPull > 1.4) gumPull = -1;
      }
      uniforms.uInfectLevel.value = level;
      uniforms.uInfectTime.value = time;
      const px = kit.player.position.x;
      const pz = kit.player.position.z;
      travelled += Math.hypot(px - lastX, pz - lastZ);
      lastX = px;
      lastZ = pz;
      if (travelled > 1.3 && level > 0.5) {
        travelled = 0;
        spawn(px, pz, 3, 3.2, 2.6);
      }
      // Klipte görünmez bir yürüyüş: damarlar oyuncu yürümese de şarkıyla kraterde yayılır.
      walker -= dt;
      if (kit.cinema() && level > 0.5 && walker <= 0) {
        walker = 0.45;
        const a = time * 0.23;
        const r = 5 + 9 * (0.5 + 0.5 * Math.sin(time * 0.37));
        spawn(center.x + Math.cos(a) * r, center.z + Math.sin(a) * r, 2, 3, 2.4);
      }

      // Uçlar dalgalanarak ilerler, incelerek iz bırakır.
      g.strokeStyle = "#fff";
      for (let i = tips.length - 1; i >= 0; i -= 1) {
        const tip = tips[i];
        tip.age += dt;
        tip.angle += (kit.random() - 0.5) * 3 * dt;
        const nx = tip.x + Math.cos(tip.angle) * tip.speed * dt;
        const nz = tip.z + Math.sin(tip.angle) * tip.speed * dt;
        const k = 1 - tip.age / tip.life;
        g.lineWidth = Math.max(0.6, tip.width * k);
        g.globalAlpha = 0.9;
        g.beginPath();
        g.moveTo(toMap(tip.x), toMap(tip.z));
        g.lineTo(toMap(nx), toMap(nz));
        g.stroke();
        tip.x = nx;
        tip.z = nz;
        if (kit.random() < dt * 0.9 && tip.width * k > 1.2) {
          tips.push({ ...tip, angle: tip.angle + (kit.random() < 0.5 ? -0.9 : 0.9), age: 0, life: (tip.life - tip.age) * 0.7, width: tip.width * k * 0.7 });
        }
        if (tip.age >= tip.life) tips.splice(i, 1);
        dirty = true;
      }
      g.globalAlpha = 1;
      flush -= dt;
      if (dirty && flush <= 0) {
        texture.needsUpdate = true;
        dirty = false;
        flush = 1 / 20;
      }

      // Alabora: kamera yana yatar, sonra doğrulur.
      capsize = Math.max(0, capsize - dt / 7);
      kit.effects.roll = Math.sin(capsize * Math.PI) * 0.35 * level;
      // Ölüm: renk çekilir, göz hizası yere iner.
      died = Math.max(0, died - dt / 4.5);
      kit.effects.saturation = 1 - Math.sin(Math.min(1, died) * Math.PI) * 0.95;
      kit.effects.dim = Math.sin(Math.min(1, died) * Math.PI) * 0.4;

      cordonLevel += (cordonTarget * level - cordonLevel) * Math.min(1, dt * 0.8);
      cordon.visible = cordonLevel > 0.02;
      cordon.scale.set(1, Math.max(0.001, cordonLevel), 1);
      warningLamps.forEach((lamp, i) => ((lamp.material as THREE.SpriteMaterial).opacity = cordonLevel * (Math.sin(time * 4 + i * 0.9) > 0.2 ? 1 : 0.08)));
      collection += (collectionTarget * level - collection) * Math.min(1, dt * 1.2);
      spots.forEach(({ cone, lamp }, i) => {
        const on = THREE.MathUtils.clamp(collection * 1.4 - i * 0.08, 0, 1) * (0.9 + 0.1 * Math.sin(time * 9 + i));
        setConeLevel(cone, on);
        (lamp.material as THREE.SpriteMaterial).opacity = on;
      });
      if (collection > 0.05 && level > 0.5) {
        const light = kit.lights[1];
        light.color.set("#f2f4ff");
        light.distance = 26;
        light.position.set(STAGE.x, ground(STAGE.x, STAGE.z) + 8, STAGE.z + 2);
        light.intensity = 90 * collection;
      }
      // Çift sarmal: oyuncunun önünde yükselir, döner.
      helix += (helixTarget * level - helix) * Math.min(1, dt * 0.7);
      const hx = kit.player.position.x + 5;
      const hz = kit.player.position.z - 7;
      const hy = ground(hx, hz);
      for (let i = 0; i < HELIX; i += 1) {
        const t = i / HELIX;
        const a = t * Math.PI * 6 + time * 0.9;
        const y = hy + 0.6 + t * 12 * ease(helix);
        helixA.set(hx + Math.cos(a) * 1.1, y, hz + Math.sin(a) * 1.1);
        helixB.set(hx - Math.cos(a) * 1.1, y, hz - Math.sin(a) * 1.1);
        const size = Math.max(0.0001, ease(helix * 1.3 - t * 0.3));
        helixMatrix.compose(helixA, helixQ.identity(), helixS.setScalar(size));
        helixRed.setMatrixAt(i, helixMatrix);
        helixMatrix.compose(helixB, helixQ.identity(), helixS.setScalar(size));
        helixWhite.setMatrixAt(i, helixMatrix);
        if (i % 2 === 0) {
          const mid = helixA.clone().add(helixB).multiplyScalar(0.5);
          const dir = helixB.clone().sub(helixA);
          helixMatrix.compose(mid, helixQ.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()), helixS.set(size, dir.length(), size));
          rungs.setMatrixAt(i / 2, helixMatrix);
        }
      }
      for (const mesh of [helixRed, helixWhite, rungs]) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.visible = helix > 0.01;
      }
      vitrines.forEach((v, i) => {
        v.group.scale.setScalar(Math.max(0.001, ease(collection * 1.4 - i * 0.08)));
        v.item.rotation.y = i + Math.sin(time * 0.4 + i) * 0.4;
        if (v.cracked) v.item.position.x = Math.sin(time * 23) * 0.015 * collection;
      });

      split += (splitTarget * level - split) * Math.min(1, dt * 0.7);
      syllables.forEach((mesh, i) => {
        const side = i === 0 ? -1 : 1;
        const a = time * 0.5 + i * Math.PI;
        const orbit = ease(split);
        mesh.position.set(
          center.x + side * (1.5 + orbit * 4) + Math.cos(a) * orbit * 6,
          ground(center.x, center.z) + 4 + Math.sin(time * 1.2 + i) * 0.6,
          center.z - 10 + Math.sin(a) * orbit * 6,
        );
        mesh.rotation.set(Math.sin(time + i) * 0.2, a + side * 0.4, side * orbit * 0.3);
        mesh.visible = split > 0.02;
      });

      echo += (echoTarget * level - echo) * Math.min(1, dt * 0.8);
      echoes.forEach((mesh, i) => {
        const a = time * (0.35 + (i % 3) * 0.08) + (i / ECHOES) * Math.PI * 2;
        const r = 7 + (i % 4) * 1.6;
        mesh.position.set(center.x + Math.cos(a) * r, ground(center.x, center.z) + 2 + (i % 5) * 0.9 + Math.sin(time + i) * 0.3, center.z - 4 + Math.sin(a) * r);
        mesh.rotation.set(0, -a + Math.PI / 2, Math.sin(time * 0.7 + i) * 0.2);
        mesh.scale.setScalar(Math.max(0.001, 0.32 * ease(echo * 1.3 - (i / ECHOES) * 0.3)));
        mesh.visible = echo > 0.02;
      });
      buried += (buriedTarget * level - buried) * Math.min(1, dt * 0.35);
      for (let i = 0; i < MANNEQUINS; i += 1) mannequins.presence[i] = Math.min(0.75, buried * (1.2 - i * 0.03));
      mannequins.update(time);
      if (plastic > 0) plastic = Math.min(1, plastic + dt / 3);
      mannequinMaterial.roughness = 0.8 - plastic * 0.7;
      mannequinMaterial.clearcoat = plastic;
      mannequinMaterial.color.setRGB(0.91 - plastic * 0.1, 0.86 - plastic * 0.25, 0.83 - plastic * 0.2);

      virusLevel += (virusTarget * level - virusLevel) * Math.min(1, dt * 0.6);
      virusSeeds.forEach((seed, i) => {
        const a = seed.a + time * seed.w;
        position.set(px + Math.cos(a) * seed.r, ground(px, pz) + seed.h + Math.sin(time * seed.s + i) * 0.8, pz + Math.sin(a) * seed.r);
        euler.set(time * seed.s, time * seed.w * 2, 0);
        quaternion.setFromEuler(euler);
        scale.setScalar(Math.min(1.5, virusLevel) * (0.8 + 0.2 * Math.sin(time * 6 + i)) + 0.0001);
        matrix.compose(position, quaternion, scale);
        viruses.setMatrixAt(i, matrix);
      });
      viruses.instanceMatrix.needsUpdate = true;
      viruses.visible = virusLevel > 0.01;
    },
  };
}
