import * as THREE from "three";
import { approach } from "../../engine/fx/fade";
import { createEmitter } from "../../engine/fx/emitter";
import { glowSprite } from "../../engine/fx/glow";
import { bird, createMotes, createPetals, createRain, flap, flyTo, type Flyer } from "../../engine/fx/sceneProps";
import { SHADOW_AZIMUTH, wombGround } from "./womb";
import { dress } from "../../engine/core/dressing";
import type { Models } from "../../engine/core/models";

/**
 * Şarkıya özel sahne parçaları: gölge oyunu zarda anlatırken rahmin içinde, bebeğin
 * çevresinde her şarkının tek bir güçlü imgesi belirir. Klip bu parçalara keser.
 *
 * - Ben İnsan Değil miyim: kubbeden inen kukla ipleri bebeğin bileklerine bağlanır; isyanda kopar.
 * - Aldırma Gönül: parmaklıklı küçük bir hücre penceresi (Sinop), ardında deniz ışığı; şafakta
 *   parmaklıklar çözülür, kâğıt martılar çıkar.
 * - O Çeşme: kurumuş taş çeşme; hatıra perdelerinde musluktan birkaç damla düşer.
 * - İtirazım Var: zarın tabanında halka olmuş yumruklar, perdeler ilerledikçe kalkar.
 * - Ağla Sevdam: bebeğin üstünde kırmızı bir şemsiye, çevresinde yağmur; yangında kıvılcım.
 * - Issızlığın Ortasında: tabandan yükselen otuz üç küçük ışık (Sivas, 2 Temmuz 1993'e sessiz
 *   bir anma; sayı hiçbir yerde yazmaz).
 * - Neydi Günahım: kubbeden bebeğe düşen tek bir spot; Kerem perdesinde dibinde alev halkası.
 * - Yuh Yuh: havada bir bağlama, telleri titrer; kürsüdeki beyin silindir şapkası koroda küçülür.
 * - Nem Kaldı: tabana birer birer dikilen çit kazıkları rahmi parsellere böler.
 *
 * Her şarkının bir de hareketli atmosferi vardır: rahmin içine yağan yağmur, anı kabarcıklarından
 * dökülen taç yaprakları, göğe savrulan bildiriler, kül, kor, kuşlar, kuru yapraklar.
 */
export const FETUS_AT = new THREE.Vector3(0, 7.5, 0);
/** Parçaların sabit konumları (klip çekimleri modül yüklenirken bunlara bakar). */
export const PROP_AT = {
  window: new THREE.Vector3(5, 15, -7),
  fountain: new THREE.Vector3(-6.5, wombGround(-6.5, 7), 7),
  umbrella: new THREE.Vector3(0, 12.6, 0),
  saz: new THREE.Vector3(4.2, 9.4, 4.4),
  hat: new THREE.Vector3(-4, 12, 3),
  bar: new THREE.Vector3(0, 21, 0),
  spot: new THREE.Vector3(0, 27, 0),
  floor: new THREE.Vector3(0, wombGround(0, 0), 0),
};
const LIGHTS = 33;
const FISTS = 24;
const POSTS = 30;

export interface SongProps {
  update(dt: number, time: number, track: string | null, act: string, songTime: number): void;
}

const basic = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

/** İki nokta arasına ince bir silindir (ip, çubuk). */
function rod(material: THREE.Material, radius = 0.025): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 6), material);
  mesh.userData.rod = true;
  return mesh;
}
function stretch(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): void {
  mesh.position.copy(a).lerp(b, 0.5);
  const d = b.clone().sub(a);
  mesh.scale.set(1, Math.max(0.001, d.length()), 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}

/** Şarkı başına silüet eşyalar (Poly Haven modelleri, gölge oyunu siyahı): perdenin önünde, zemin üstünde. */
const SILHOUETTES: Record<string, Array<[string, number, number, number, number?]>> = {
  // [model, açı ofseti (perdeye göre), yarıçap, boy, yaw]
  "ben-insan-degil-miyim": [["painted_wooden_bench", -0.22, 17, 1.6], ["metal_trash_can", 0.2, 17.5, 1.0], ["street_lamp_01", 0.05, 18.5, 4.4]],
  "aldirma-gonul": [["large_iron_gate", 0, 19, 4.2], ["wooden_bucket_01", -0.18, 16.5, 0.5], ["jug_01", 0.16, 16.8, 0.45], ["lifebuoy", 0.28, 18, 0.8]],
  "o-cesme": [["jug_01", -0.14, 16, 0.6], ["wooden_bucket_02", 0.12, 16.4, 0.55], ["ceramic_vase_01", 0.22, 17, 0.7], ["wicker_basket_01", -0.26, 17.2, 0.7]],
  "itirazim-var": [["standing_chalkboard_01", -0.2, 18, 1.9], ["wooden_ladder", 0.18, 18.5, 3.2], ["cardboard_box_01", 0.05, 16.5, 0.7], ["hand_truck", -0.06, 17, 1.3]],
  "agla-sevdam": [["street_lamp_01", -0.24, 18.5, 4.6], ["korean_public_payphone_01", 0.2, 18.6, 2.4], ["metal_trash_can", 0.06, 16.8, 1.0], ["lifebuoy", -0.1, 16.4, 0.8]],
  "issizligin-ortasinda": [["tree_stump_01", -0.2, 17, 1.4], ["dead_quiver_branch_01", 0.15, 17.6, 2.2], ["dead_quiver_trunk", 0.3, 18.4, 3.0], ["wooden_axe", -0.05, 16.4, 0.8]],
  "neydi-gunahim": [["woodenchair_01", -0.12, 17, 1.9], ["ukulele_01", -0.1, 16.6, 0.7], ["portable_searchlight", 0.22, 18, 1.3], ["vintage_suitcase", 0.08, 16.8, 1.0]],
  "yuh-yuh": [["ukulele_01", 0.1, 16.6, 0.8], ["fishermans_hat", -0.14, 16.5, 0.5], ["rockingchair_01", -0.24, 17.6, 1.6], ["ottoman_01", 0.24, 17.2, 0.5]],
  "nem-kaldi": [["wooden_axe_02", -0.16, 16.6, 0.8], ["wooden_bucket_01", 0.1, 16.5, 0.5], ["watering_can_metal_01", 0.26, 17, 0.7], ["tree_stump_02", -0.28, 17.8, 1.3]],
};
export function silhouetteModels(): string[] {
  return [...new Set(Object.values(SILHOUETTES).flat().map((s) => s[0]))];
}

export function createSongProps(scene: THREE.Scene, random: () => number, models?: Models): SongProps {
  const groups: Record<string, THREE.Group> = {};
  const level: Record<string, number> = {};
  const add = (id: string) => {
    const group = new THREE.Group();
    group.visible = false;
    scene.add(group);
    groups[id] = group;
    level[id] = 0;
    // Silüet eşyalar: perdenin (zardaki gölge oyununun) önünde, zeminde; ışıksız siyah.
    if (models && SILHOUETTES[id]) {
      const base = SHADOW_AZIMUTH;
      const placements = SILHOUETTES[id].map(([model, da, r, size, yaw]) => {
        const a = base + da;
        return { model, x: Math.sin(a) * r, z: -Math.cos(a) * r, size, by: "height" as const, yaw: yaw ?? Math.atan2(-Math.sin(a), Math.cos(a)) };
      });
      group.add(dress(models, placements, { ground: wombGround, style: "silhouette" }));
    }
    return group;
  };

  // --- Ben İnsan Değil miyim: kukla ipleri ---
  const puppet = add("ben-insan-degil-miyim");
  const woodDark = new THREE.MeshStandardMaterial({ color: "#3a2214", roughness: 0.6 });
  const bar = new THREE.Group();
  for (const r of [0, Math.PI / 2]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.18, 0.18), woodDark);
    beam.rotation.y = r;
    bar.add(beam);
  }
  bar.position.copy(PROP_AT.bar);
  puppet.add(bar);
  const threadMaterial = basic("#ffe6d2", 0.85);
  const handles = [new THREE.Vector3(2, 0, 0), new THREE.Vector3(-2, 0, 0), new THREE.Vector3(0, 0, 2), new THREE.Vector3(0, 0, -2)];
  const wrists = [new THREE.Vector3(1.4, 1.6, 1.2), new THREE.Vector3(-1.8, -0.4, 1), new THREE.Vector3(0.8, 2.4, -1.2), new THREE.Vector3(-1, 0.2, -1.4)];
  const threads = handles.map(() => {
    const mesh = rod(threadMaterial, 0.022);
    puppet.add(mesh);
    return mesh;
  });
  const cordTop = rod(threadMaterial, 0.03);
  puppet.add(cordTop);
  let snap = 0;

  // --- Aldırma Gönül: hücre penceresi ---
  const cell = add("aldirma-gonul");
  const stone = new THREE.MeshStandardMaterial({ color: "#2a1a16", roughness: 0.95 });
  const frameParts = [
    [0, 1.7, 2.8, 0.3],
    [0, -1.7, 2.8, 0.3],
    [-1.25, 0, 0.3, 3.7],
    [1.25, 0, 0.3, 3.7],
  ];
  for (const [x, y, w, h] of frameParts) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), stone);
    part.position.set(x, y, 0);
    cell.add(part);
  }
  const seaMaterial = new THREE.MeshBasicMaterial({ color: "#7fb8d6", transparent: true, opacity: 0.85 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.1), seaMaterial);
  sea.position.z = -0.2;
  cell.add(sea);
  const barMaterial = new THREE.MeshStandardMaterial({ color: "#141010", metalness: 0.6, roughness: 0.4, transparent: true });
  const bars = [-0.8, -0.4, 0, 0.4, 0.8].map((x) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.2, 8), barMaterial);
    b.position.set(x, 0, 0.05);
    cell.add(b);
    return b;
  });
  const seaGlow = glowSprite("#9fd4f0", 6);
  seaGlow.position.z = -0.6;
  cell.add(seaGlow);
  const gullShape = new THREE.Shape();
  gullShape.moveTo(-0.5, 0.1);
  gullShape.quadraticCurveTo(-0.25, 0.28, 0, 0);
  gullShape.quadraticCurveTo(0.25, 0.28, 0.5, 0.1);
  gullShape.quadraticCurveTo(0.25, 0.14, 0, 0.06);
  gullShape.quadraticCurveTo(-0.25, 0.14, -0.5, 0.1);
  const gullGeometry = new THREE.ShapeGeometry(gullShape, 8);
  const gulls = Array.from({ length: 3 }, (_, i) => {
    const gull = new THREE.Mesh(gullGeometry, new THREE.MeshBasicMaterial({ color: "#fff6ea", side: THREE.DoubleSide, transparent: true }));
    gull.userData.seed = i * 2.1;
    cell.add(gull);
    return gull;
  });
  cell.position.copy(PROP_AT.window);
  cell.lookAt(0, PROP_AT.window.y, 17);
  let dawn = 0;

  // --- O Çeşme: kurumuş taş çeşme ---
  const fountain = add("o-cesme");
  const limestone = new THREE.MeshStandardMaterial({ color: "#b8a58a", roughness: 0.9, emissive: "#6a4a30", emissiveIntensity: 0.45 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.6), limestone);
  body.position.y = 1.1;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 8, 20, Math.PI), limestone);
  arch.position.set(0, 1.55, 0.32);
  const basin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.7), limestone);
  basin.position.set(0, 0.2, 0.6);
  const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), new THREE.MeshStandardMaterial({ color: "#8a6a3a", metalness: 0.8, roughness: 0.35 }));
  tap.rotation.x = Math.PI / 2;
  tap.position.set(0, 1.1, 0.45);
  const dropMaterial = new THREE.MeshBasicMaterial({ color: "#cfe8ff", transparent: true });
  const drop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), dropMaterial);
  drop.scale.set(1, 1.5, 1);
  const rippleMaterial = new THREE.MeshBasicMaterial({ color: "#cfe8ff", transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const ripple = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 32), rippleMaterial);
  ripple.rotation.x = -Math.PI / 2;
  ripple.position.set(0, 0.41, 0.6);
  fountain.add(body, arch, basin, tap, drop, ripple);
  fountain.position.copy(PROP_AT.fountain);
  fountain.rotation.y = Math.atan2(0 - PROP_AT.fountain.x, 17 - PROP_AT.fountain.z);
  let dripClock = 0;

  // --- İtirazım Var: halka olmuş yumruklar ---
  const protest = add("itirazim-var");
  const fistGeometry = (() => {
    const arm = new THREE.CylinderGeometry(0.12, 0.15, 1.3, 8);
    arm.translate(0, 0.65, 0);
    const fist = new THREE.BoxGeometry(0.34, 0.3, 0.3);
    fist.translate(0, 1.42, 0);
    const knuckle = new THREE.CylinderGeometry(0.08, 0.08, 0.34, 8);
    knuckle.rotateZ(Math.PI / 2);
    knuckle.translate(0, 1.52, 0.12);
    const merged = new THREE.BufferGeometry();
    const parts = [arm, fist, knuckle].map((g) => g.toNonIndexed());
    const positions = parts.flatMap((g) => Array.from(g.attributes.position.array as Float32Array));
    merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    merged.computeVertexNormals();
    return merged;
  })();
  const fists = new THREE.InstancedMesh(fistGeometry, new THREE.MeshStandardMaterial({ color: "#1a0806", roughness: 0.8 }), FISTS);
  fists.frustumCulled = false;
  protest.add(fists);
  const fistSpots = Array.from({ length: FISTS }, (_, i) => {
    const a = (i / FISTS) * Math.PI * 2 + random() * 0.1;
    const r = 11 + random() * 3;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return { x, z, y: wombGround(x, z), delay: random() * 0.8, scale: 1.2 + random() * 0.6, phase: random() * 6 };
  });
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scaleV = new THREE.Vector3();
  const position = new THREE.Vector3();

  // --- Ağla Sevdam: kırmızı şemsiye ve yağmur ---
  const rainy = add("agla-sevdam");
  const umbrella = new THREE.Group();
  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 0.9, 10, 1, true),
    new THREE.MeshStandardMaterial({ color: "#8e0e12", roughness: 0.55, side: THREE.DoubleSide, emissive: "#3a0204" }),
  );
  canopy.position.y = 0.45;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), woodDark);
  shaft.position.y = -0.7;
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 12, Math.PI), woodDark);
  hook.position.set(0.14, -1.9, 0);
  hook.rotation.z = Math.PI;
  umbrella.add(canopy, shaft, hook);
  umbrella.position.copy(PROP_AT.umbrella);
  rainy.add(umbrella);
  const rain = createEmitter({
    count: 500,
    colors: ["#ffd8c8", "#c8a0a0"],
    size: 0.05,
    life: 1.2,
    spread: new THREE.Vector3(9, 1, 9),
    velocity: new THREE.Vector3(0.3, -12, 0),
    jitter: 0.3,
    additive: false,
  });
  rain.origin.set(0, 22, 0);
  const sparks = createEmitter({
    count: 120,
    colors: ["#ffb347", "#ff3a0a"],
    size: 0.12,
    life: 3,
    spread: new THREE.Vector3(10, 1, 10),
    velocity: new THREE.Vector3(0, 2.2, 0),
    jitter: 0.8,
  });
  sparks.origin.set(0, PROP_AT.floor.y + 1, 0);
  rainy.add(rain.points, sparks.points);

  // --- Issızlığın Ortasında: otuz üç ışık ---
  const vigil = add("issizligin-ortasinda");
  const lights = Array.from({ length: LIGHTS }, (_, i) => {
    const a = (i / LIGHTS) * Math.PI * 2 * 3.1 + random() * 0.3;
    const r = 3 + ((i * 7) % LIGHTS) / LIGHTS * 13;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const sprite = glowSprite("#ffc27a", 0.9);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), basic("#fff2d8"));
    vigil.add(sprite, core);
    return { sprite, core, x, z, floor: wombGround(x, z) + 0.3, top: 16 + random() * 10, delay: i * 0.35, sway: random() * 6 };
  });
  let rise = -1;

  // --- Neydi Günahım: tek spot ---
  const stage = add("neydi-gunahim");
  const spotMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uLevel: { value: 0 } },
    vertexShader: "varying float vY; varying vec3 vN; varying vec3 vV; void main() { vY = uv.y; vec4 w = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); gl_Position = projectionMatrix * w; }",
    fragmentShader: "uniform float uLevel; varying float vY; varying vec3 vN; varying vec3 vV; void main() { float face = pow(abs(dot(vN, vV)), 1.5); gl_FragColor = vec4(vec3(1.0, 0.9, 0.72) * face * (0.08 + 0.3 * (1.0 - vY)) * uLevel, 1.0); }",
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 4.2, PROP_AT.spot.y - FETUS_AT.y + 3, 32, 1, true), spotMaterial);
  beam.position.set(0, (PROP_AT.spot.y + FETUS_AT.y - 3) / 2, 0);
  const lamp = glowSprite("#fff0d0", 3);
  lamp.position.copy(PROP_AT.spot);
  const flames = Array.from({ length: 10 }, (_, i) => {
    const sprite = glowSprite(i % 2 ? "#ff7a2a" : "#ffb347", 1.2);
    stage.add(sprite);
    return sprite;
  });
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(160 * 3);
  for (let i = 0; i < 160; i += 1) {
    const a = random() * Math.PI * 2;
    const r = 6 + random() * 18;
    starPositions.set([Math.cos(a) * r, 4 + random() * 22, Math.sin(a) * r], i * 3);
  }
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: "#fff4e0", size: 0.16, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const nearStar = glowSprite("#fff4e0", 1.6);
  nearStar.position.set(2.4, 10.5, 2.2);
  stage.add(beam, lamp, stars, nearStar);

  // --- Yuh Yuh: bağlama ve silindir şapka ---
  const square = add("yuh-yuh");
  const saz = new THREE.Group();
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry([[0, -0.9], [0.35, -0.75], [0.48, -0.4], [0.42, 0], [0.18, 0.28], [0.06, 0.34]].map(([x, y]) => new THREE.Vector2(x, y)), 20),
    new THREE.MeshStandardMaterial({ color: "#6a3a1c", roughness: 0.45 }),
  );
  bowl.scale.z = 0.55;
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.06), woodDark);
  neck.position.y = 1.5;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.08), woodDark);
  head.position.y = 2.9;
  head.rotation.z = 0.2;
  const sazStrings = [-0.03, 0, 0.03].map((x) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 3.3, 3), basic("#f4ead8"));
    s.position.set(x, 1.05, 0.2);
    saz.add(s);
    return s;
  });
  saz.add(bowl, neck, head);
  saz.position.copy(PROP_AT.saz);
  saz.rotation.set(0.1, -0.6, 0.45);
  const hat = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 20), new THREE.MeshStandardMaterial({ color: "#0e0c0c", roughness: 0.3 }));
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 24), crown.material);
  brim.position.y = -0.55;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.16, 20), new THREE.MeshStandardMaterial({ color: "#6a0c10" }));
  band.position.y = -0.4;
  hat.add(crown, brim, band);
  hat.position.copy(PROP_AT.hat);
  square.add(saz, hat);
  let hatLevel = 0;

  // --- Nem Kaldı: çit kazıkları ---
  const land = add("nem-kaldi");
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.6, 0.14), new THREE.MeshStandardMaterial({ color: "#3a2a1c", roughness: 0.9 }), POSTS);
  posts.frustumCulled = false;
  const postSpots = Array.from({ length: POSTS }, (_, i) => {
    const line = i % 3;
    const k = Math.floor(i / 3);
    const a = line * ((Math.PI * 2) / 3) + 0.4;
    const r = 3 + k * 1.8;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return { x, z, y: wombGround(x, z), order: k * 3 + line };
  });
  const wireMaterial = basic("#8a7a6a", 0.8);
  const wires = [0, 1, 2].map(() => {
    const wire = rod(wireMaterial, 0.012);
    land.add(wire);
    return wire;
  });
  const bowlEmpty = new THREE.Mesh(
    new THREE.LatheGeometry([[0, 0], [0.3, 0.02], [0.42, 0.16], [0.44, 0.2]].map(([x, y]) => new THREE.Vector2(x, y)), 20),
    new THREE.MeshStandardMaterial({ color: "#8a6a4a", roughness: 0.8, side: THREE.DoubleSide }),
  );
  bowlEmpty.position.set(-2.4, wombGround(-2.4, 5) + 0.02, 5);
  land.add(posts, bowlEmpty);

  // --- Hareketli atmosfer --------------------------------------------------
  const center = new THREE.Vector3(0, PROP_AT.floor.y - 1, 0);
  const box = new THREE.Vector3(34, 22, 34);
  const wombRain = createRain(700, "#ffd8d0", box, 14, 0.7);
  const blossoms = createPetals(160, "#ffc2cc", 0.12, box, 0.5);
  const leaflets = createPetals(120, "#f4ecd8", 0.24, box, 0.35);
  const ash = createPetals(220, "#8a8480", 0.1, box, 0.45);
  const dryLeaves = createPetals(140, "#a8742e", 0.16, box, 0.6);
  const confetti = createPetals(200, "#ffd24a", 0.1, box, 0.9);
  const embers = createMotes(180, "#ff8a3a", 0.35, box, 2.5);
  const doveMaterial = new THREE.MeshStandardMaterial({ color: "#f2ece4", roughness: 0.8, side: THREE.DoubleSide, emissive: "#4a3a34", emissiveIntensity: 0.5 });
  const doves: Flyer[] = Array.from({ length: 7 }, () => {
    const dove = bird(doveMaterial);
    dove.group.scale.setScalar(2.2);
    dove.group.visible = false;
    scene.add(dove.group);
    return dove;
  });
  scene.add(wombRain.lines, blossoms.mesh, leaflets.mesh, ash.mesh, dryLeaves.mesh, confetti.mesh, embers.points);
  const doveAt = new THREE.Vector3();
  /** Şarkı ve perdeye göre atmosfer yoğunlukları (0..1). */
  const weather = (track: string | null, act: string) => ({
    rain: track === "ben-insan-degil-miyim" ? (act === "isyan" ? 1 : act === "son" ? 0.3 : 0.7) : track === "agla-sevdam" ? (act === "bos" || act === "son" ? 0.4 : 0.8) : 0,
    blossoms: track === "o-cesme" ? (act === "damla" || act === "damla2" ? 1 : 0.25) : 0,
    leaflets: track === "itirazim-var" ? (act === "buyuk" || act === "yuzler" || act === "son" ? 1 : act.startsWith("cehennem") ? 0.6 : 0.15) : 0,
    ash: track === "issizligin-ortasinda" ? (act === "ates" || act === "ates2" || act === "sazlar" || act === "ayakta" ? 1 : 0.15) : 0,
    dry: track === "nem-kaldi" ? (act === "ac" || act === "sermaye" || act === "son" ? 1 : 0.35) : 0,
    confetti: track === "yuh-yuh" ? (act === "koro" || act === "son" ? 1 : 0) : 0,
    embers: track === "neydi-gunahim" ? (act === "kerem" || act === "haydi" ? 1 : 0) : track === "agla-sevdam" ? (act === "yangin" || act === "yola" ? 0.8 : 0) : 0,
    doves: track === "agla-sevdam" && (act === "kuslar" || act === "yola") ? 1 : track === "aldirma-gonul" && (act === "gunler" || act === "son") ? 1 : 0,
  });
  const levels = { rain: 0, blossoms: 0, leaflets: 0, ash: 0, dry: 0, confetti: 0, embers: 0, doves: 0 };

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  let last: string | null = null;

  return {
    update(dt, time, track, act, songTime) {
      if (track !== last) {
        last = track;
        snap = dawn = hatLevel = 0;
        rise = -1;
        dripClock = 0;
      }
      for (const id of Object.keys(groups)) {
        const on = id === track ? 1 : 0;
        level[id] = approach(level[id], on, on ? 0.9 : 1.6, dt);
        groups[id].visible = level[id] > 0.01;
      }
      const k = (id: string) => level[id];

      // Atmosfer: perdeye göre yumuşakça yoğunlaşır, şarkı bitince söner.
      const want = weather(track, act);
      for (const key of Object.keys(levels) as (keyof typeof levels)[]) levels[key] = approach(levels[key], want[key], 0.8, dt);
      wombRain.level = levels.rain;
      wombRain.update(dt, center);
      blossoms.level = levels.blossoms;
      blossoms.update(time, center);
      leaflets.level = levels.leaflets;
      leaflets.update(time, center);
      ash.level = levels.ash;
      ash.update(time, center);
      dryLeaves.level = levels.dry;
      dryLeaves.update(time, center);
      confetti.level = levels.confetti;
      (confetti.mesh.material as THREE.MeshStandardMaterial).color.setHSL((time * 0.08) % 1, 0.8, 0.62);
      confetti.update(time, center);
      embers.level = levels.embers;
      embers.update(time, center);
      // Kuşlar: şemsiyenin ya da hücre penceresinin çevresinde halkalar çizer.
      const doveHome = track === "aldirma-gonul" ? PROP_AT.window : PROP_AT.umbrella;
      doves.forEach((dove, i) => {
        const angle = time * (0.35 + (i % 3) * 0.06) + i * 0.9;
        const radius = 3.5 + (i % 3) * 1.6 + (1 - levels.doves) * 14;
        doveAt.set(doveHome.x + Math.cos(angle) * radius, doveHome.y + 1.5 + Math.sin(time * 0.9 + i) * 0.8 + (1 - levels.doves) * 8, doveHome.z + Math.sin(angle) * radius);
        flyTo(dove, doveAt);
        flap(dove, time, 7 + (i % 3), 0.7);
        dove.group.visible = levels.doves > 0.03;
      });

      // Kukla: ipler perdeye göre iner; isyanda kopar ve yukarı çekilir.
      if (puppet.visible) {
        const strung = act === "kukla" || act === "yeniden" || act === "vur" ? 1 : act === "isyan" || act === "son" ? 1 : 0;
        if (act === "isyan" || act === "son") snap = Math.min(1, snap + dt / 1.6);
        const down = strung * k("ben-insan-degil-miyim");
        bar.position.set(PROP_AT.bar.x + Math.sin(time * 0.7) * 0.4, PROP_AT.bar.y + (1 - down) * 12, PROP_AT.bar.z);
        bar.rotation.set(Math.sin(time * 0.9) * 0.08, time * 0.1, Math.cos(time * 0.8) * 0.08);
        threads.forEach((thread, i) => {
          a.copy(handles[i]).applyEuler(bar.rotation).add(bar.position);
          b.copy(wrists[i]).add(FETUS_AT);
          // Kopunca ipin alt ucu yukarı savrulur.
          b.lerp(a, snap * (0.55 + i * 0.1));
          b.x += Math.sin(time * 3 + i) * snap * 0.6;
          stretch(thread, a, b);
          thread.visible = down > 0.02;
        });
        stretch(cordTop, bar.position, a.set(bar.position.x, 34, bar.position.z));
        threadMaterial.opacity = 0.85 * down * (1 - snap * 0.6);
      }

      // Hücre penceresi: şafakta parmaklıklar çözülür, martılar çıkar.
      if (cell.visible) {
        cell.scale.setScalar(Math.max(0.001, k("aldirma-gonul")));
        if (act === "gunler" || act === "son") dawn = Math.min(1, dawn + dt / 4);
        barMaterial.opacity = 1 - dawn;
        bars.forEach((bar2, i) => (bar2.position.y = dawn * (i % 2 ? 3 : -3)));
        seaMaterial.color.setRGB(0.5 + dawn * 0.5, 0.72 + dawn * 0.15, 0.84 - dawn * 0.2);
        (seaGlow.material as THREE.SpriteMaterial).opacity = 0.35 + dawn * 0.5 + Math.sin(time * 0.8) * 0.05;
        gulls.forEach((gull) => {
          const s = gull.userData.seed as number;
          const f = Math.max(0, dawn * 8 - s);
          gull.visible = dawn > 0.05;
          gull.position.set(Math.sin(time * 0.6 + s) * (1 + f * 0.5), 0.6 + Math.sin(time * 1.3 + s) * 0.4 + f * 0.3, 0.6 + f);
          gull.rotation.set(0, 0, Math.sin(time * 6 + s) * 0.25);
          gull.scale.setScalar(0.7 + Math.sin(time * 6 + s) * 0.08);
        });
      }

      // Çeşme: hatıra perdelerinde damlar.
      if (fountain.visible) {
        fountain.scale.setScalar(Math.max(0.001, k("o-cesme")));
        const dripping = act === "damla" || act === "damla2";
        if (dripping) dripClock += dt;
        const phase = dripClock % 1.4;
        drop.visible = dripping && phase < 0.55;
        drop.position.set(0, 1.08 - (phase / 0.55) ** 2 * 0.68, 0.58);
        const ring = dripping && phase >= 0.55 ? (phase - 0.55) / 0.85 : 1;
        ripple.scale.setScalar(1 + ring * 6);
        rippleMaterial.opacity = (1 - ring) * 0.8;
      }

      // Yumruklar: perdeler ilerledikçe daha çoğu kalkar; kızıl perdelerde titrer.
      if (protest.visible) {
        const raised = act === "bekleyis" ? 0 : act === "itiraz" ? 0.15 : act === "yarim" || act === "yaka" ? 0.55 : act === "kaybeden" ? 0.2 : 1;
        fistSpots.forEach((f, i) => {
          const on = i / FISTS < raised ? 1 : 0;
          const lift = on * k("itirazim-var");
          const shake = act.startsWith("cehennem") ? Math.sin(time * 18 + f.phase) * 0.06 : 0;
          position.set(f.x, f.y - 2.2 * (1 - lift), f.z);
          quaternion.setFromEuler(new THREE.Euler(shake, Math.atan2(-f.x, -f.z), Math.sin(time * 1.2 + f.phase) * 0.05 * lift));
          scaleV.setScalar(f.scale);
          matrix.compose(position, quaternion, scaleV);
          fists.setMatrixAt(i, matrix);
        });
        fists.instanceMatrix.needsUpdate = true;
      }

      // Şemsiye, yağmur, yangın kıvılcımları.
      if (rainy.visible) {
        const closing = act === "bos" || act === "son" ? 1 : 0;
        umbrella.position.set(PROP_AT.umbrella.x + Math.sin(time * 0.5) * 0.3, PROP_AT.umbrella.y - closing * 4, PROP_AT.umbrella.z);
        umbrella.rotation.set(Math.sin(time * 0.6) * 0.08, time * 0.15, Math.cos(time * 0.5) * 0.08 + closing * 0.8);
        canopy.scale.set(1 - closing * 0.75, 1 + closing * 1.2, 1 - closing * 0.75);
        umbrella.scale.setScalar(Math.max(0.001, k("agla-sevdam")));
        rain.rate = rain.intensity = k("agla-sevdam");
        rain.update(time);
        const fire = act === "yangin" || act === "yola" ? 1 : 0;
        sparks.rate = sparks.intensity = fire * k("agla-sevdam");
        sparks.update(time);
      }

      // Otuz üç ışık: ıssızlıkta tabandan yükselir, sonda kubbede kalır.
      if (vigil.visible) {
        if ((act === "issiz" || act === "ates2" || act === "issiz2" || act === "son") && rise < 0) rise = 0;
        if (rise >= 0) rise += dt;
        lights.forEach((l) => {
          const t = rise >= 0 ? Math.min(1, Math.max(0, (rise - l.delay) / 40)) : 0;
          const y = l.floor + (l.top - l.floor) * (1 - (1 - t) ** 2);
          const x = l.x + Math.sin(time * 0.4 + l.sway) * 0.3 * t;
          l.core.position.set(x, y, l.z);
          l.sprite.position.copy(l.core.position);
          const on = rise >= 0 && rise > l.delay ? 1 : 0;
          (l.sprite.material as THREE.SpriteMaterial).opacity = on * k("issizligin-ortasinda") * (0.75 + 0.25 * Math.sin(time * 7 + l.sway));
          l.core.visible = on > 0;
        });
      }

      // Tek spot; Kerem'de alev halkası; felekte yıldızlar.
      if (stage.visible) {
        const dim = act === "son" ? 0.2 : 1;
        spotMaterial.uniforms.uLevel.value = k("neydi-gunahim") * dim * (0.9 + 0.1 * Math.sin(time * 11));
        (lamp.material as THREE.SpriteMaterial).opacity = k("neydi-gunahim") * dim;
        const burning = act === "kerem" || act === "haydi" ? 1 : 0;
        flames.forEach((flame, i) => {
          const angle = (i / flames.length) * Math.PI * 2 + time * 0.3;
          flame.position.set(Math.cos(angle) * 3.2, FETUS_AT.y - 3 + Math.sin(time * 5 + i) * 0.2, Math.sin(angle) * 3.2);
          (flame.material as THREE.SpriteMaterial).opacity = burning * k("neydi-gunahim") * (0.6 + 0.4 * Math.sin(time * 13 + i));
          flame.scale.setScalar(1 + Math.sin(time * 9 + i) * 0.25);
        });
        const night = act === "felek" || act === "son" ? 1 : 0;
        (stars.material as THREE.PointsMaterial).opacity = night * k("neydi-gunahim");
        (nearStar.material as THREE.SpriteMaterial).opacity = night * k("neydi-gunahim") * (0.7 + 0.3 * Math.sin(time * 2));
      }

      // Bağlama telleri titrer; şapka koroda küçülür.
      if (square.visible) {
        saz.scale.setScalar(Math.max(0.001, k("yuh-yuh")));
        saz.position.y = PROP_AT.saz.y + Math.sin(time * 0.8) * 0.2;
        sazStrings.forEach((s, i) => (s.position.x = [-0.03, 0, 0.03][i] + Math.sin(time * 60 + i) * 0.004));
        const hatOn = act === "bey" || act === "asalet" ? 1 : act === "koro" ? 0.25 : 0;
        hatLevel = approach(hatLevel, hatOn, 0.8, dt);
        hat.scale.setScalar(Math.max(0.001, hatLevel * k("yuh-yuh") * 1.6));
        hat.rotation.set(Math.sin(time * 0.7) * 0.1, time * 0.3, 0);
        hat.visible = hatLevel > 0.02;
      }

      // Çitler: parsel perdesinden itibaren birer birer dikilir.
      if (land.visible) {
        const stage2 = ["tarla"].includes(act) ? 0 : act === "parsel" ? Math.min(1, (songTime - 24.3) / 10) : 1;
        postSpots.forEach((p) => {
          const on = p.order / POSTS < stage2 ? 1 : 0;
          position.set(p.x, p.y + 0.8 - (1 - on * k("nem-kaldi")) * 1.8, p.z);
          matrix.compose(position, quaternion.identity(), scaleV.setScalar(1));
          posts.setMatrixAt(p.order, matrix);
        });
        posts.instanceMatrix.needsUpdate = true;
        wires.forEach((wire, line) => {
          const first = postSpots.find((p) => p.order === line)!;
          const lastPost = postSpots.filter((p) => p.order % 3 === line).at(-1)!;
          const visibleCount = postSpots.filter((p) => p.order % 3 === line && p.order / POSTS < stage2).length;
          const end = postSpots.filter((p) => p.order % 3 === line)[Math.max(0, visibleCount - 1)] ?? lastPost;
          stretch(wire, a.set(first.x, first.y + 1.2, first.z), b.set(end.x, end.y + 1.2, end.z));
          wire.visible = visibleCount > 1;
        });
        bowlEmpty.visible = act === "ac" || act === "sermaye" || act === "son";
      }
    },
  };
}
