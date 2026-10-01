import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createEmitter, EMBERS, type Emitter } from "../../../engine/fx/emitter";
import { GRADES } from "../../../engine/game/director";
import type { SongScene } from "../../../engine/game/songStage";
import { createActor, createFigure } from "../../../engine/fx/figure";
import { announce, arc, block, cam, CENTER, ease, follow, gazeTarget, glowSprite, GRAMOPHONE, ground, onGround, pt, ridge, rim, secretItem, STAGE, type SceneKit } from "./kit";
import { bird, createMotes, createPetals, flap, flyTo, type Flyer } from "../../../engine/fx/sceneProps";

/**
 * Senden Vazgeçeli Çok Oldu — içindeki orman. Canlı bir koru soluyor, yaprakları
 * dökülüyor; bir ağacın içindeki kalp sönüyor; eve giden taşlar toprağa gömülüyor.
 * Gece evin penceresi mors alfabesiyle aynı kelimeyi tekrarlar (S-E-N): yalnız tek bir
 * kişinin okuyabileceği bir işaret. Orman küle döner, külden bir canavar doğar; görüntü
 * eski bir film arası gibi titreyip güne döner, su birikintilerinde benzin gibi renkler
 * dolaşır. Sonda bütün ağaçlar dağılır ama külün altında kalp hâlâ atar: "vazgeçtim"
 * demek, vazgeçmiş olmak değildir. Oyuncu her ağacı E ile bırakır; ağaç kül olup dağılır.
 */
const TREES = 11;
const LEAVES_PER_TREE = 26;
const STONES = 14;
const PUDDLES = 5;
/** Dizelerin saniyeleri. */
const L = {
  gaveup: 10.59, inside: 21.15, forest: 23.56, heart: 31.41, forget: 33.18, home: 41.87, path: 43.89, lost: 45.41,
  night: 52.1, song: 54.92, only: 57.19, empty: 62.46, loved: 67.53, maybe1: 71.73, maybe2: 76.75, maybe3: 82.0,
  self: 94.31, ash: 104.64, heartB: 115.1, monster: 125.44, dark: 135.63, sleepless: 145.97, burned: 151.01,
  m4: 155.23, m5: 160.12, m6: 165.53, m7: 176.11, m8: 181.04, m9: 186.38, end: 198.6, fin: 209.88,
} as const;

/** Mors: nokta 1, çizgi 3 birim yanık; harf arası 3, kelime sonu 7 birim sönük. */
function morse(word: string): boolean[] {
  const code: Record<string, string> = { S: "...", E: ".", N: "-." };
  const out: boolean[] = [];
  [...word].forEach((letter, i) => {
    if (i) out.push(false, false, false);
    [...code[letter]].forEach((mark, j) => {
      if (j) out.push(false);
      for (let k = 0; k < (mark === "." ? 1 : 3); k += 1) out.push(true);
    });
  });
  for (let k = 0; k < 7; k += 1) out.push(false);
  return out;
}
const SIGNAL = morse("SEN");

/** Su birikintisi: siyah ayna, üstünde benzin gibi dönen ince film renkleri. */
function puddleMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uAmount: { value: 0 }, uLevel: { value: 1 } },
    vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: `uniform float uTime, uAmount, uLevel; varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float edge = smoothstep(1.0, 0.82, r + 0.07 * sin(atan(p.y, p.x) * 5.0 + 1.3));
        float n = sin(p.x * 5.0 + sin(p.y * 4.0 + uTime * 0.35) * 2.2) + sin(p.y * 6.0 - uTime * 0.28 + sin(p.x * 3.5));
        vec3 film = mix(vec3(0.5), 0.5 + 0.5 * cos(6.2831 * (n * 0.33 + vec3(0.0, 0.33, 0.67))), 0.75);
        float band = smoothstep(0.35, 0.95, r) * (0.55 + 0.45 * sin(n * 3.0));
        vec3 col = vec3(0.01, 0.012, 0.018) + film * 0.3 * uAmount * band;
        gl_FragColor = vec4(col, edge * 0.94 * uLevel);
      }`,
  });
}

function treeGeometry(random: () => number, tips: THREE.Vector3[]): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const branch = (base: THREE.Matrix4, length: number, radius: number, depth: number) => {
    const bend = new THREE.Vector3((random() - 0.5) * 0.35, 1, (random() - 0.5) * 0.35).normalize();
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(bend.x * length * 0.4, length * 0.5, bend.z * length * 0.4),
      new THREE.Vector3((random() - 0.5) * length * 0.25, length, (random() - 0.5) * length * 0.25),
    );
    const tube = new THREE.TubeGeometry(curve, 6, radius, 7, false);
    const p = tube.attributes.position as THREE.BufferAttribute;
    const center = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 1) {
      const ring = Math.floor(i / 8);
      const t = ring / 6;
      curve.getPoint(t, center);
      const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)).sub(center).multiplyScalar(1 - t * 0.55);
      p.setXYZ(i, center.x + v.x, center.y + v.y, center.z + v.z);
    }
    tube.applyMatrix4(base);
    parts.push(tube);
    if (depth === 0) {
      tips.push(curve.getPoint(1).applyMatrix4(base));
      return;
    }
    const children = depth > 1 ? 3 : 2 + (random() < 0.5 ? 1 : 0);
    for (let i = 0; i < children; i += 1) {
      const from = curve.getPoint(Math.min(1, 0.55 + random() * 0.45));
      const child = new THREE.Matrix4()
        .copy(base)
        .multiply(new THREE.Matrix4().makeTranslation(from.x, from.y, from.z))
        .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0.55 + random() * 0.5, (i / children) * Math.PI * 2 + random(), 0, "YXZ")));
      branch(child, length * (0.55 + random() * 0.15), radius * 0.58, depth - 1);
    }
  };
  branch(new THREE.Matrix4(), 4.2 + random() * 2.2, 0.32, 3);
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  return merged;
}

/** Kabuk: önce canlı ağaç, sonra kömürleşmiş ve çatlaklarında nabız gibi yanan közler. */
function barkMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({ color: "#2d2016", roughness: 0.95, emissive: "#ff4a0c", emissiveIntensity: 1 });
  const uniforms = { uTime: { value: 0 }, uGlow: { value: 0 } };
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCharPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCharPos = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime, uGlow;\nvarying vec3 vCharPos;")
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        float cracks = sin(vCharPos.y * 9.0 + sin(vCharPos.x * 13.0) * 2.0) * sin(vCharPos.x * 11.0 + vCharPos.z * 17.0);
        float ember = smoothstep(0.86, 0.99, cracks) * (0.6 + 0.4 * sin(uTime * 2.3 + vCharPos.y * 3.0));
        totalEmissiveRadiance *= ember * uGlow * 1.8;`,
      );
  };
  return material;
}

function monsterGeometry(): THREE.BufferGeometry {
  const body = new THREE.SphereGeometry(1, 20, 14);
  body.scale(1.3, 1, 0.9);
  body.translate(0, 1.1, 0);
  const head = new THREE.SphereGeometry(0.55, 16, 12);
  head.translate(0, 2.05, 0.45);
  const hornL = new THREE.ConeGeometry(0.12, 0.7, 8);
  hornL.rotateZ(0.5);
  hornL.translate(-0.35, 2.6, 0.4);
  const hornR = new THREE.ConeGeometry(0.12, 0.7, 8);
  hornR.rotateZ(-0.5);
  hornR.translate(0.35, 2.6, 0.4);
  const armL = new THREE.CapsuleGeometry(0.22, 1.2, 4, 8);
  armL.rotateZ(0.3);
  armL.translate(-1.25, 0.8, 0.3);
  const armR = new THREE.CapsuleGeometry(0.22, 1.2, 4, 8);
  armR.rotateZ(-0.3);
  armR.translate(1.25, 0.8, 0.3);
  const merged = mergeGeometries([body, head, hornL, hornR, armL, armR].map((g) => g.toNonIndexed()));
  merged.computeVertexNormals();
  return merged;
}

interface Tree {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  leaves: THREE.InstancedMesh;
  leafHome: THREE.Vector3[];
  ash: Emitter;
  embers: Emitter;
  fade: number;
  gone: boolean;
  top: number;
}

export function createAshScene(kit: SceneKit): SongScene {
  const root = new THREE.Group();
  const trees: Tree[] = [];
  const colliders = [];
  const leafGeometry = new THREE.IcosahedronGeometry(0.55, 0);
  const leafMaterial = new THREE.MeshStandardMaterial({ color: "#1f3a1f", roughness: 0.9, flatShading: true });
  for (let i = 0; i < TREES; i += 1) {
    const angle = (i / TREES) * Math.PI * 2 + kit.random() * 0.4;
    const radius = 6 + kit.random() * 17;
    const x = STAGE.x + Math.cos(angle) * radius;
    const z = STAGE.z + Math.sin(angle) * radius * 0.8;
    const material = barkMaterial();
    const tips: THREE.Vector3[] = [];
    const geometry = treeGeometry(kit.random, tips);
    geometry.computeBoundingBox();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    onGround(mesh, x, z, -0.2);
    mesh.rotation.y = kit.random() * Math.PI * 2;
    mesh.scale.setScalar(1.4 + kit.random() * 0.6);
    mesh.updateMatrixWorld();
    root.add(mesh);
    const leaves = new THREE.InstancedMesh(leafGeometry, leafMaterial, LEAVES_PER_TREE);
    const leafHome = Array.from({ length: LEAVES_PER_TREE }, (_, k) => {
      const tip = tips[k % tips.length].clone().applyMatrix4(mesh.matrixWorld);
      return tip.add(new THREE.Vector3((kit.random() - 0.5) * 1.6, (kit.random() - 0.3) * 1.2, (kit.random() - 0.5) * 1.6));
    });
    leaves.frustumCulled = false;
    root.add(leaves);
    colliders.push(block(kit, x, z, 0.8));
    const ash = createEmitter({
      count: 180,
      colors: ["#8d8a86", "#3a3836"],
      size: 0.28,
      life: 3,
      spread: new THREE.Vector3(1.6, 3, 1.6),
      velocity: new THREE.Vector3(0.4, 0.5, 0),
      jitter: 1.4,
      gravity: -0.6,
      additive: false,
      loop: false,
    });
    const embers = createEmitter({ ...EMBERS(1.6), loop: false, life: 2.6 });
    root.add(ash.points, embers.points);
    trees.push({ mesh, material, leaves, leafHome, ash, embers, fade: 0, gone: false, top: geometry.boundingBox!.max.y * mesh.scale.y });
  }

  // İçindeki kalp: bir ağacın gövdesinde nabız gibi atan kırmızı ışık.
  const heartTree = trees[3];
  const heart = glowSprite("#ff2a2a", 1.6);
  const heartOut = new THREE.Vector3(1, 0, 1).normalize().multiplyScalar(0.75);
  const heartHome = heartTree.mesh.position.clone().add(heartOut).setY(heartTree.mesh.position.y + 1.6);
  heart.position.copy(heartHome);
  root.add(heart);

  // Uzaktaki ev ve ona giden taş yol.
  const house = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3.4), new THREE.MeshStandardMaterial({ color: "#1b1b1d", roughness: 0.9 }));
  walls.position.y = 1.5;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.8, 4), new THREE.MeshStandardMaterial({ color: "#111", roughness: 0.9 }));
  roof.position.y = 3.9;
  roof.rotation.y = Math.PI / 4;
  const windowMaterial = new THREE.MeshBasicMaterial({ color: "#ffcf7a" });
  const window1 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), windowMaterial);
  window1.position.set(0, 1.7, 1.71);
  house.add(walls, roof, window1);
  const hx = -52;
  const hz = 28;
  // Evden giden: şarkının başında evin önünde durur; ormana doğru yürür ve bir daha arkasına bakmaz.
  // Orman yanarken uzak kenardadır, sırtı eve dönük oturur; kül yağarken diz çöker.
  const leaver = createActor(createFigure({ material: new THREE.MeshStandardMaterial({ color: "#111114", roughness: 0.9 }), height: 1.85 }), ground, { speed: 1.4 });
  leaver.figure.group.position.set(hx + 4, ground(hx + 4, hz + 4), hz + 4);
  leaver.figure.group.rotation.y = Math.atan2(-4, -4) + Math.PI;
  root.add(leaver.figure.group);
  const leaverAt = (dx: number, dy: number, dz: number) => () => leaver.figure.group.position.clone().add(new THREE.Vector3(dx, dy, dz));
  let leaverRest: "still" | "sit" | "kneel" = "still";
  onGround(house, hx, hz);
  house.rotation.y = Math.atan2(GRAMOPHONE.x - hx, GRAMOPHONE.z - hz);
  root.add(house);
  kit.colliders.solid(walls);
  const windowGlow = glowSprite("#ffcf7a", 3.2);
  root.add(windowGlow);
  house.updateMatrixWorld();
  window1.getWorldPosition(windowGlow.position);
  windowGlow.position.y += 0.02;
  /** Evden gramofona yön: pencere çekimleri bu doğrultuda. */
  const hv = new THREE.Vector3(GRAMOPHONE.x - hx, 0, GRAMOPHONE.z - hz).normalize();
  const side = new THREE.Vector3(-hv.z, 0, hv.x);
  const win = (d: number, h: number, s = 0) => follow(window1, hv.x * d + side.x * s, h, hv.z * d + side.z * s);
  const stones = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.6, 0.12, 10), new THREE.MeshStandardMaterial({ color: "#4a4a4d", roughness: 1 }), STONES);
  const stoneSpots = Array.from({ length: STONES }, (_, i) => {
    const t = (i + 1) / (STONES + 1);
    const x = THREE.MathUtils.lerp(GRAMOPHONE.x - 4, hx + 3, t) + Math.sin(t * 7) * 2;
    const z = THREE.MathUtils.lerp(GRAMOPHONE.z - 6, hz + 3, t);
    return new THREE.Vector3(x, ground(x, z) + 0.05, z);
  });
  root.add(stones);

  // Gece lambası.
  const lamp = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 10), new THREE.MeshStandardMaterial({ color: "#1a1a1a", metalness: 0.6 }));
  pole.position.y = 2.1;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffe2a8" }));
  head.position.y = 4.3;
  const halo = glowSprite("#ffd48a", 4);
  halo.position.y = 4.3;
  lamp.add(pole, head, halo);
  onGround(lamp, GRAMOPHONE.x - 3, GRAMOPHONE.z - 5);
  root.add(lamp);
  kit.colliders.solid(lamp, { shape: "round" });

  // Su birikintileri: lambanın ışığını ve benzin gibi renkleri yansıtır.
  const puddleMat = puddleMaterial();
  const puddles = Array.from({ length: PUDDLES }, (_, i) => {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(0.9 + (i % 3) * 0.35, 40), puddleMat);
    mesh.rotation.x = -Math.PI / 2;
    const t = 0.15 + i * 0.13;
    const x = THREE.MathUtils.lerp(GRAMOPHONE.x - 3, hx, t) + (i % 2 ? 2.2 : -1.8);
    const z = THREE.MathUtils.lerp(GRAMOPHONE.z - 5, hz, t) + (i % 2 ? -1 : 1.4);
    mesh.position.set(x, ground(x, z) + 0.03, z);
    mesh.renderOrder = 1;
    root.add(mesh);
    return mesh;
  });

  // Külden doğan canavar.
  const monster = new THREE.Mesh(monsterGeometry(), new THREE.MeshStandardMaterial({ color: "#070707", roughness: 1 }));
  monster.scale.setScalar(9);
  const eyes = [glowSprite("#ff3010", 3), glowSprite("#ff3010", 3)];
  root.add(monster, ...eyes);
  kit.colliders.solid(monster, { shape: "round", pad: -0.15 });

  // Gizli keşifler: her yönü gösteren tabela ve küçük, utangaç canavar.
  const sign = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), new THREE.MeshStandardMaterial({ color: "#3a2616" }));
  post.position.y = 1.1;
  sign.add(post);
  const arrows: THREE.Group[] = [];
  for (let i = 0; i < 4; i += 1) {
    const pivot = new THREE.Group();
    const arrow = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.04), new THREE.MeshStandardMaterial({ color: "#c9b37a" }));
    arrow.position.set(0.45, 0, 0);
    pivot.add(arrow);
    pivot.position.y = 1.6 + i * 0.1 - 0.15;
    pivot.rotation.y = (i / 4) * Math.PI * 2 + 0.3;
    sign.add(pivot);
    arrows.push(pivot);
  }
  let signSpin = -1;
  onGround(sign, GRAMOPHONE.x - 7, GRAMOPHONE.z - 12);
  root.add(sign);
  kit.colliders.solid(sign, { shape: "round", pad: -0.35 });
  const shy = new THREE.Mesh(monsterGeometry(), new THREE.MeshStandardMaterial({ color: "#161616", roughness: 1 }));
  shy.scale.setScalar(0.35);
  const shyTree = trees[7];
  const shyEyes = glowSprite("#ff6a3a", 0.4);
  root.add(shy, shyEyes);
  kit.colliders.solid(shy, { shape: "round" });

  let released = 0;
  let clock = 0;
  let wither = 0;
  let witherTarget = 0;
  let heartLevel = 1;
  let heartTarget = 1;
  let pathLost = 0;
  let pathTarget = 0;
  let night = 0;
  let nightTarget = 0;
  let burnt = 0;
  let burntTarget = 0;
  let monsterRise = 0;
  let monsterTarget = 0;
  let dawn = 0;
  let sheen = 0;
  let sheenTarget = 0;

  // Dış orman: koru kraterin bütününe yayılır (aynı kabuk malzemesi; sahne ile birlikte solar, kararır, kor tutar).
  const OUTER = 64;
  const outerBark = barkMaterial();
  const outerGeometry = treeGeometry(kit.random, []);
  const outerTrees = new THREE.InstancedMesh(outerGeometry, outerBark, OUTER);
  outerTrees.frustumCulled = false;
  outerTrees.castShadow = true;
  const outerSpots = Array.from({ length: OUTER }, (_, i) => {
    const a = (i / OUTER) * Math.PI * 2 + kit.random() * 0.3;
    const r = 27 + kit.random() * 40;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return { x, z, y: ground(x, z) - 0.2, yaw: kit.random() * Math.PI * 2, scale: 1.3 + kit.random() * 0.9 };
  });
  const outerMatrix = new THREE.Matrix4();
  const outerQ = new THREE.Quaternion();
  root.add(outerTrees);
  const outerLeaves = createPetals(360, "#3f6a25", 0.5, new THREE.Vector3(140, 16, 140), 0.35);
  root.add(outerLeaves.mesh);
  const outerLeafMaterial = outerLeaves.mesh.material as THREE.MeshStandardMaterial;
  /** Dış ağaçlardan birinin tepesi (çekimler için). */
  const outerAt = (i: number, dy = 0) => new THREE.Vector3(outerSpots[i].x, outerSpots[i].y + dy, outerSpots[i].z);
  let finale = false;

  // Dökülen yapraklar: yeşil başlar, sarıya, sonra küle döner.
  const leaves = createPetals(320, "#4f7a2a", 0.16, new THREE.Vector3(46, 16, 40), 0.7);
  root.add(leaves.mesh);
  const leafColor = leaves.mesh.material as THREE.MeshStandardMaterial;
  const forestCenter = new THREE.Vector3(STAGE.x, ground(STAGE.x, STAGE.z), STAGE.z);
  // Gece ormanında ateşböcekleri: pencerenin işaretine eşlik eder; yangında söner.
  const fireflies = createMotes(90, "#d8ff8a", 0.4, new THREE.Vector3(40, 6, 34));
  root.add(fireflies.points);
  // Kül yangınında yükselen kıvılcımlar.
  const sparks = createMotes(260, "#ff7a2a", 0.45, new THREE.Vector3(44, 22, 38), 4);
  root.add(sparks.points);
  // Baykuş: gece bir dalda oturur, kül gelince havalanır.
  const owlMaterial = new THREE.MeshStandardMaterial({ color: "#8a7458", roughness: 0.8, side: THREE.DoubleSide, emissive: "#2a2016" });
  const owl: Flyer = bird(owlMaterial);
  owl.group.scale.setScalar(3.2);
  root.add(owl.group);
  const owlEyes = glowSprite("#ffd24a", 0.09);
  owl.group.add(owlEyes);
  owlEyes.position.set(0, 0.06, 0.2);
  const owlPerch = new THREE.Vector3();
  const owlAt = new THREE.Vector3();
  let owlFlight = -1;

  const point = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();

  const releaseTree = (tree: Tree) => {
    if (tree.gone) return;
    tree.gone = true;
    released += 1;
    point.copy(tree.mesh.position).setY(tree.mesh.position.y + tree.top * 0.5);
    tree.ash.origin.copy(point);
    tree.embers.origin.copy(point);
    tree.ash.burst(clock);
    tree.embers.burst(clock);
  };

  const interactables = [
    ...trees.map((tree) =>
      gazeTarget({
        position: (target) => target.copy(tree.mesh.position).setY(tree.mesh.position.y + tree.top * 0.5),
        radius: 2.6,
        reach: 40,
        label: () => (tree.gone ? null : "Vazgeç — küle dönsün"),
        use: () => {
          releaseTree(tree);
          kit.sfx.cue("crumble");
          if (released === TREES) {
            kit.effects.dust = 0.05;
            announce(kit.hud, "Orman gitti. Kül de artık yağmıyor.", 6);
          } else announce(kit.hud, `Bırakılan ağaçlar ${released} / ${TREES}`, 3);
        },
      }),
    ),
    secretItem(kit, "senden-tabela", (target) => target.copy(sign.position).setY(sign.position.y + 1.6), {
      label: "Tabelayı oku",
      radius: 0.6,
      reach: 3,
      onFound: () => {
        signSpin = 0;
        kit.sfx.cue("whoosh");
      },
    }),
    secretItem(kit, "senden-canavar", (target) => target.copy(shy.position).setY(shy.position.y + 0.6), {
      label: "Ağacın arkasındaki şey",
      radius: 0.5,
      reach: 2.6,
      available: () => monsterTarget > 0,
    }),
  ];

  return {
    root,
    hint: "İçindeki orman. Ağaçlara bak, E ile bırak; şarkı ilerledikçe orman solacak, küle dönecek.",
    interactables,
    colliders,
    // Klip: yeşil orman → gece (mavi, mors pencere) → kor (ateş) → film arası (eski film) → şafak → külde atan kalp.
    // Klip: bütün krater bir ormandır. Sırttan uçarak gelir, ağaçların üstünden geçer; kalp ağacı, eve giden
    // taşlar, gece pencerenin işareti, kül, canavar, şafak; sonda ormanın üstünden ayrılış ve külün altındaki kalp.
    shots: [
      // Evden giden: evi arkasında bırakır; kamera önce evi, sonra sırtını görür.
      { at: L.forest + 2.5, from: leaverAt(0, 1.6, 4.5), to: leaverAt(0, 1.5, 2.8), look: leaverAt(0, 1.3, 0), lookTo: leaverAt(0, 1.2, -8), fov: 48, grade: "memory" },
      { at: L.ash + 4, from: leaverAt(-2.4, 1.0, -2.2), to: leaverAt(-1.6, 0.9, -1.4), look: leaverAt(0, 0.9, 0), lookTo: pt(hx, 3, hz), fov: 44, grade: "fire" },
      { at: L.burned + 3, from: leaverAt(1.4, 0.7, 1.8), to: leaverAt(0.9, 0.6, 1.2), look: leaverAt(0, 0.8, 0), fov: 40, grade: "bleach" },
      { at: 0, from: ridge(0.9, 40), path: [pt(40, 18, 60), pt(18, 8, 76)], to: cam(6, 6, 72), look: CENTER, lookTo: cam(0, 3, 46), fov: 50, curve: "linear", grade: "dawn", in: "fade" },
      { at: 5.3, from: outerAt(10, 1.1), to: outerAt(10, 1.1).add(new THREE.Vector3(4, 0, 4)), look: cam(4, 3, 40), fov: 40, curve: "linear", grade: "dawn" },
      { at: L.gaveup, from: cam(-6, 1.7, 70), to: cam(-2, 1.7, 60), look: cam(0, 4, 46), fov: 52, curve: "linear", grade: "neutral" },
      { at: 16, from: follow(trees[0].mesh, 4, trees[0].top * 0.7, 4), to: follow(trees[0].mesh, 3, trees[0].top * 0.85, 2.6), look: follow(trees[0].mesh, 0, trees[0].top * 0.8, 0), fov: 44, grade: "neutral" },
      { at: L.inside, from: cam(0.4, 0.5, 46), look: cam(0, 2, 40), lookTo: cam(1, 16, 44), fov: 72, grade: "pastel" },
      { at: L.forest, from: rim(1.3, 6), path: arc(0, 0, 44, 7, 1.3, 2.2, 3), to: cam(-14, 6, 60), look: CENTER, lookTo: cam(0, 5, 46), fov: 54, curve: "linear", grade: "pastel" },
      { at: L.heart, from: follow(heart, 3.5, 0.2, 3.5), to: follow(heart, 1.8, 0, 1.8), look: follow(heart), fov: 42, grade: { ...GRADES.memory, soft: 0.6 } },
      { at: L.forget, from: follow(heart, 1.6, 0.1, 1.6), to: follow(heart, 7, 1.2, 7), look: follow(heart), fov: 40, grade: "memory" },
      { at: L.home, from: cam(-40, 2.2, 40), to: cam(-45, 2, 34), look: cam(-52, 2, 28), fov: 40, grade: "neutral" },
      { at: L.path, from: cam(GRAMOPHONE.x - 5, 0.35, GRAMOPHONE.z - 4), to: cam(GRAMOPHONE.x - 14, 0.35, GRAMOPHONE.z - 11), look: cam(hx, 1.5, hz), fov: 36, curve: "linear", grade: "cold" },
      { at: L.lost, from: cam(14, 9, 82), to: cam(10, 11, 84), look: cam(-30, 0, 40), fov: 46, curve: "linear", grade: "cold" },
      { at: L.night, from: follow(lamp, 2.2, 0.8, 2.2), to: follow(lamp, 1.6, 1.2, 1.6), look: follow(lamp, 0, 4.3, 0), fov: 52, grade: "night", in: "fade" },
      { at: L.song, from: win(9, 0.4), to: win(7, 0.3), look: follow(window1), fov: 34, grade: "night" },
      { at: L.only, from: win(24, 1.2, 8), to: win(22, 1, 4), look: follow(window1), fov: 38, curve: "linear", grade: "night" },
      { at: L.empty, from: outerAt(30, 4), path: [pt(-20, 6, -10), pt(-40, 5, 10)], to: cam(-44, 3, 30), look: CENTER, lookTo: cam(hx, 2, hz), fov: 50, curve: "linear", grade: "night" },
      { at: L.loved, from: follow(heart, 2.4, 0.3, 2.4), to: follow(heart, 1.4, 0.1, 1.4), look: follow(heart), fov: 40, grade: { ...GRADES.night, soft: 0.7 } },
      { at: L.maybe1, from: win(20, 0.6), to: win(16, 0.5), look: follow(window1), fov: 40, grade: "night" },
      { at: L.maybe2, from: win(12, 0.4), to: win(9, 0.3), look: follow(window1), fov: 38, grade: "night" },
      { at: 80, from: follow(owl.group, 3.2, -0.6, 0.6), to: follow(owl.group, 2.6, -0.5, 1.2), look: follow(owl.group, 0, 0.2, 0), fov: 40, grade: "night" },
      { at: L.maybe3, from: win(8, 0.6), to: win(6, 0.4), look: follow(window1), fov: 36, grade: "night" },
      { at: 88, from: cam(8, 1.2, 60), to: cam(-4, 1.6, 64), look: cam(-6, 3, 44), fov: 50, curve: "linear", grade: "night", out: "fade" },
      { at: L.self, from: cam(0, 1.2, 58), to: cam(0, 1.6, 50), look: cam(0, 6, 40), fov: 58, curve: "linear", handheld: 0.04, grade: "fire", in: "fade" },
      { at: L.ash, from: follow(trees[2].mesh, 1.6, 1.4, 1.6), to: follow(trees[2].mesh, 1.1, 2.6, 1.1), look: follow(trees[2].mesh, 0, 2.2, 0), fov: 40, grade: { ...GRADES.fire, soft: 0.5 } },
      { at: 110, from: outerAt(20, 3), path: arc(0, 0, 40, 5, 3.1, 4.2, 3), to: cam(12, 4, 60), look: CENTER, lookTo: cam(0, 4, 46), fov: 52, curve: "linear", grade: "fire" },
      { at: L.heartB, from: follow(heartTree.mesh, 4, 2, 4), to: follow(heartTree.mesh, 2.6, 1.8, 2.6), look: follow(heartTree.mesh, 0, 1.6, 0), fov: 42, grade: "fire" },
      { at: 120, from: cam(20, 3, 70), to: cam(6, 4, 74), look: cam(0, 8, 40), fov: 50, curve: "linear", grade: "fire" },
      { at: L.monster, from: cam(0, 1.2, 40), to: cam(1, 1, 38), look: pt(4, 10, 10), lookTo: follow(monster, 0, 20, 0), fov: 62, grade: "blood", in: "flash", flashColor: "#ff3010" },
      { at: 130.5, from: follow(monster, 0, 19, 26), to: follow(monster, 0, 19, 18), look: follow(monster, 0, 19, 0), fov: 34, grade: "blood" },
      { at: L.dark, from: rim(2.6, 10), path: arc(0, 0, 70, 12, 2.6, 3.6, 2), to: cam(-10, 14, 76), look: follow(monster, 0, 16, 0), fov: 48, curve: "linear", grade: "dawn", lens: "film", in: "flash" },
      { at: 140.8, from: cam(12, 1.4, 64), to: cam(4, 1.4, 60), look: pt(-40, 30, -120), fov: 44, curve: "linear", grade: "dawn", lens: "film" },
      { at: L.sleepless, from: follow(puddles[0], 2.4, 0.5, 2.4), to: follow(puddles[0], 1.7, 0.4, 1.7), look: follow(puddles[0], -2, 0.3, -2), fov: 42, grade: "candle" },
      { at: L.burned, orbit: { center: CENTER, radius: 36, height: 6, from: 3.4, to: 4.6 }, look: pt(0, 6, 20), fov: 54, curve: "linear", grade: "fire", in: "flash", flashColor: "#ff7a2a" },
      { at: L.m4, from: win(10, 0.4), to: win(7, 0.3), look: follow(window1), fov: 36, grade: "memory" },
      { at: L.m5, from: follow(monster, 4, 17, 34), to: follow(monster, 1.5, 18, 27), look: follow(monster, 0, 19, 0), fov: 36, grade: "blood" },
      { at: L.m6, from: follow(puddles[1], -2.6, 0.3, 2.6), to: follow(puddles[1], -2, 0.25, 2), look: follow(lamp, 0, 3, 0), fov: 42, grade: "candle" },
      { at: 170.5, from: outerAt(48, 2.2), to: outerAt(48, 2.2).add(new THREE.Vector3(-3, 0.6, 2)), look: cam(-8, 3, 44), fov: 48, curve: "linear", grade: "fire" },
      { at: L.m7, from: follow(lamp, 3, 5.5, 3), to: follow(lamp, 2, 5, 2), look: follow(lamp, 0, 4.3, 0), fov: 40, grade: "candle" },
      { at: L.m8, from: cam(-36, 3, 44), to: cam(-40, 3, 38), look: cam(-52, 2, 28), fov: 38, grade: "memory" },
      { at: L.m9, from: follow(heartTree.mesh, 3, 1.6, 3), to: follow(heartTree.mesh, 2, 1.5, 2), look: follow(heartTree.mesh, 0, 1.6, 0), fov: 40, grade: { ...GRADES.fire, soft: 0.5 } },
      { at: 192, from: cam(0, 6, 80), path: [pt(30, 20, 40)], to: rim(-0.6, 30), look: cam(0, 3, 46), lookTo: CENTER, fov: 50, curve: "linear", grade: "dawn", out: "fade" },
      { at: L.end, from: cam(0, 5, 78), to: cam(0, 3, 68), look: cam(0, 4, 46), fov: 50, curve: "linear", grade: "bleach", in: "fade" },
      { at: 205, from: follow(heart, 3.4, 1.2, 3.4), to: follow(heart, 2.2, 0.6, 2.2), look: follow(heart), fov: 40, grade: { ...GRADES.candle, soft: 0.6 }, out: "fade" },
    ],
    beats: [
      { at: L.gaveup, id: "gaveup", line: "Kraterde yemyeşil ağaçlar; aralarında ışığı yanan tek bir ev. Evin önünde biri, sırtı kapıya dönük." },
      { at: L.inside, id: "wither", line: "Yapraklar tek tek dökülüyor." },
      { at: L.heart, id: "heart", line: "Bir gövdenin içinde kırmızı bir ışık atıyor; yavaşça kısılıyor." },
      { at: L.home, id: "home", line: "Eve giden taşlar birer birer toprağa gömülüyor." },
      { at: L.night, id: "night", line: "Gece. Lamba yanıyor; evin penceresi yanıp sönüyor: kısa, kısa, kısa…" },
      { at: L.empty, id: "signal", line: "Pencere hep aynı işareti tekrarlıyor. Okuyabilecek tek kişi burada değil." },
      { at: L.self, id: "ash", line: "Kabuklar kararıyor; çatlaklarda kor yanıyor." },
      { at: L.heartB, id: "forget-again" },
      { at: L.monster, id: "monster", line: "Kurumuş ağaçların arasından koca bir gölge doğruluyor." },
      { at: L.dark, id: "dawn", line: "Görüntü eski bir film gibi titriyor; gökyüzü griden sarıya dönüyor." },
      { at: L.sleepless, id: "sheen", line: "Su birikintilerinde benzin gibi renkler dönüyor; lamba hâlâ yanık." },
      { at: L.burned, id: "fuel", line: "Közler yeniden harlanıyor." },
      { at: L.end, id: "end", line: "Son ağaç da dağılıyor. Külün altında küçük bir kor hâlâ atıyor." },
    ],
    onBeat(id) {
      if (id === "wither") {
        witherTarget = 1;
        leaver.goTo(hx + 24, hz - 8);
      }
      if (id === "home") leaver.goTo(-12, 2);
      if (id === "ash") {
        leaver.goTo(Math.cos(0.3) * 66, Math.sin(0.3) * 66, false, 0.3 + Math.PI / 2);
        leaverRest = "sit";
      }
      if (id === "monster") leaverRest = "still";
      if (id === "fuel") leaverRest = "kneel";
      if (id === "heart") heartTarget = 0;
      if (id === "home") pathTarget = 1;
      if (id === "night") nightTarget = 1;
      if (id === "ash") {
        burntTarget = 1;
        kit.sfx.cue("ignite");
      }
      if (id === "monster") {
        monsterTarget = 1;
        kit.effects.shake = 0.3;
        kit.sfx.cue("pulse");
      }
      if (id === "dawn") {
        nightTarget = 0;
        dawn = 1;
      }
      if (id === "sheen") sheenTarget = 1;
      if (id === "signal") heartTarget = 0.4;
      if (id === "forget-again") heartTarget = 0;
      if (id === "fuel") for (const tree of trees) (tree.material.userData.uniforms as { uGlow: { value: number } }).uGlow.value = 2.4;
      if (id === "end") {
        monsterTarget = 0;
        // Kalp kökten kopar, küle düşer ve orada atmaya devam eder.
        finale = true;
        heartTarget = 0.8;
        heart.position.copy(heartTree.mesh.position).add(heartOut).setY(heartTree.mesh.position.y + 0.4);
        trees.forEach((tree, i) => window.setTimeout(() => releaseTree(tree), i * 350));
      }
    },
    reset() {
      leaverRest = "still";
      leaver.rest("still");
      leaver.figure.group.position.set(hx + 4, ground(hx + 4, hz + 4), hz + 4);
      owlFlight = -1;
      released = 0;
      kit.effects.dust = 1;
      wither = witherTarget = pathLost = pathTarget = night = nightTarget = burnt = burntTarget = monsterRise = monsterTarget = dawn = 0;
      heartLevel = heartTarget = 1;
      sheen = sheenTarget = 0;
      finale = false;
      heart.position.copy(heartHome);
      for (const tree of trees) {
        tree.gone = false;
        tree.fade = 0;
        tree.mesh.visible = true;
        tree.mesh.scale.y = tree.mesh.scale.x;
      }
    },
    update(dt, time, level) {
      if (leaver.arrived) leaver.rest(leaverRest);
      leaver.update(dt, time);
      leaver.figure.group.visible = level > 0.05;
      // Oklar pusula iğnesi gibi döner; hangisini seçsen aynı mesafe.
      if (signSpin >= 0) {
        signSpin += dt;
        const k = Math.min(1, signSpin / 3);
        arrows.forEach((pivot, i) => (pivot.rotation.y = (i / 4) * Math.PI * 2 + 0.3 + (1 - (1 - k) ** 3) * (6 + i * 1.7)));
        if (k >= 1) signSpin = -1;
      }
      clock = time;
      wither += (witherTarget - wither) * Math.min(1, dt * 0.4);
      heartLevel += (heartTarget - heartLevel) * Math.min(1, dt * 0.5);
      pathLost += (pathTarget - pathLost) * Math.min(1, dt * 0.3);
      night += (nightTarget - night) * Math.min(1, dt * 0.5);
      burnt += (burntTarget - burnt) * Math.min(1, dt * 0.4);
      monsterRise += (monsterTarget * level - monsterRise) * Math.min(1, dt * 0.35);
      dawn = Math.max(0, dawn - dt / 10);
      kit.effects.dim = night * 0.18 * level - Math.sin(dawn * Math.PI) * 0.2;

      leafMaterial.color.setRGB(0.12 + wither * 0.3, 0.23 - wither * 0.1, 0.12 - wither * 0.06);
      for (const tree of trees) {
        const uniforms = tree.material.userData.uniforms as { uTime: { value: number }; uGlow: { value: number } };
        uniforms.uTime.value = time;
        if (tree.gone) tree.fade = Math.min(1, tree.fade + dt / 2.5);
        const k = tree.fade;
        tree.mesh.scale.y = tree.mesh.scale.x * (1 - k * k) * level + 0.0001;
        tree.mesh.visible = k < 1 && level > 0.02;
        tree.material.color.setRGB(0.18 - burnt * 0.1, 0.13 - burnt * 0.06, 0.09 - burnt * 0.03);
        if (uniforms.uGlow.value < 2) uniforms.uGlow.value = burnt * (1 + k * 3) * level;
        // Yapraklar solar ve dökülür; kül anında tamamen gider.
        tree.leafHome.forEach((home, i) => {
          const fall = THREE.MathUtils.clamp(wither * 1.4 - (i % 7) * 0.08, 0, 1);
          position.set(home.x + Math.sin(time + i) * fall * 0.6, home.y - fall * (home.y - ground(home.x, home.z)) * ease(wither), home.z);
          quaternion.setFromEuler(new THREE.Euler(i, time * fall * 0.5, i * 0.3));
          scale.setScalar(Math.max(0.0001, (1 - burnt) * (1 - k) * level * (1 - fall * 0.4)));
          matrix.compose(position, quaternion, scale);
          tree.leaves.setMatrixAt(i, matrix);
        });
        tree.leaves.instanceMatrix.needsUpdate = true;
        tree.ash.update(time);
        tree.embers.update(time);
      }

      (heart.material as THREE.SpriteMaterial).opacity = heartLevel * level * (0.6 + 0.4 * Math.pow(0.5 + 0.5 * Math.sin(time * 5), 6));
      heart.visible = heartLevel > 0.02 && (!heartTree.gone || finale);
      if (finale) heart.scale.setScalar(0.55 + 0.3 * Math.pow(0.5 + 0.5 * Math.sin(time * 4.2), 8));
      else heart.scale.setScalar(1.6);

      // Dış orman: koru ile birlikte solar, sonda ağaçlar birer birer dağılır.
      const outerUniforms = outerBark.userData.uniforms as { uTime: { value: number }; uGlow: { value: number } };
      outerUniforms.uTime.value = time;
      outerUniforms.uGlow.value = burnt * 1.4 * level;
      outerBark.color.setRGB(0.18 - burnt * 0.1, 0.13 - burnt * 0.06, 0.09 - burnt * 0.03);
      outerSpots.forEach((spot, i) => {
        const gone = finale ? Math.max(0, Math.min(1, (released - i * 0.12) * 0.5)) : 0;
        outerQ.setFromEuler(new THREE.Euler(0, spot.yaw, 0));
        outerMatrix.compose(new THREE.Vector3(spot.x, spot.y, spot.z), outerQ, new THREE.Vector3(spot.scale, Math.max(0.0001, spot.scale * (1 - gone) * level), spot.scale));
        outerTrees.setMatrixAt(i, outerMatrix);
      });
      outerTrees.instanceMatrix.needsUpdate = true;
      outerTrees.visible = level > 0.02;
      outerLeaves.level = (1 - burnt) * level * (0.35 + wither * 0.65);
      outerLeafMaterial.color.setRGB(0.25 + wither * 0.55 - burnt * 0.2, 0.42 - wither * 0.1 - burnt * 0.2, 0.15 - wither * 0.08);
      outerLeafMaterial.emissive.copy(outerLeafMaterial.color).multiplyScalar(0.3);
      outerLeaves.update(time, CENTER);

      sheen += (sheenTarget - sheen) * Math.min(1, dt * 0.4);
      puddleMat.uniforms.uTime.value = time;
      puddleMat.uniforms.uAmount.value = 0.12 + sheen * 0.88;
      puddleMat.uniforms.uLevel.value = level;
      puddles.forEach((puddle) => (puddle.visible = level > 0.02));

      // Yapraklar: solma ile yoğunlaşır, rengi yeşilden sarıya, külde griye döner.
      leaves.level = Math.min(1, wither * 1.3) * (1 - burnt) * level;
      leafColor.color.setRGB(0.31 + wither * 0.5 - burnt * 0.2, 0.48 - wither * 0.12 - burnt * 0.2, 0.16 - wither * 0.1);
      leafColor.emissive.copy(leafColor.color).multiplyScalar(0.35);
      leaves.update(time, forestCenter);
      fireflies.level = night * (1 - burnt) * level;
      fireflies.update(time, forestCenter);
      sparks.level = burnt * level * (dawn > 0.1 ? 0.4 : 1);
      sparks.update(time, forestCenter);
      // Baykuş: kalp ağacının dalında; kül yangını başlayınca havalanıp göğe süzülür.
      heartTree.mesh.localToWorld(owlPerch.set(0.6, heartTree.top / heartTree.mesh.scale.y * 0.72, 0.3));
      if (burnt > 0.3 && owlFlight < 0) owlFlight = 0;
      if (owlFlight >= 0) {
        owlFlight += dt;
        const t = Math.min(1, owlFlight / 6);
        owlAt.set(owlPerch.x + Math.sin(owlFlight * 0.6) * 18 * t, owlPerch.y + t * 22, owlPerch.z + Math.cos(owlFlight * 0.6) * 18 * t - t * 10);
        flyTo(owl, owlAt);
        flap(owl, time, 5, 0.8);
      } else {
        owl.group.position.copy(owlPerch);
        owl.group.rotation.set(0, Math.atan2(GRAMOPHONE.x - owlPerch.x, GRAMOPHONE.z - owlPerch.z) + Math.sin(time * 0.4) * 0.6, 0);
        flap(owl, time, 2, 0.05);
      }
      owl.group.visible = level > 0.2 && night + burnt > 0.2 && (owlFlight < 0 || owlFlight < 9);
      (owlEyes.material as THREE.SpriteMaterial).opacity = night * level;


      stoneSpots.forEach((spot, i) => {
        const lost = THREE.MathUtils.clamp(pathLost * STONES * 1.2 - (STONES - i), 0, 1);
        position.copy(spot).y -= lost * 0.3;
        scale.setScalar(Math.max(0.0001, (1 - lost) * level));
        matrix.compose(position, quaternion.identity(), scale);
        stones.setMatrixAt(i, matrix);
      });
      stones.instanceMatrix.needsUpdate = true;
      // Gece pencere mors ile "S-E-N" der; gündüz yalnız yol kayboldukça söner.
      const lit = 0.2 + (1 - pathLost) * 0.8;
      const signal = night > 0.3 || sheenTarget > 0 ? (SIGNAL[Math.floor(time / 0.26) % SIGNAL.length] ? 1 : 0.06) : 1;
      windowMaterial.color.setScalar(Math.max(lit, night > 0.3 ? 1 : 0) * signal);
      // Yakından bakınca hale kadrajı boğmasın.
      const nearWindow = THREE.MathUtils.smoothstep(kit.camera.position.distanceTo(windowGlow.position), 3, 11);
      (windowGlow.material as THREE.SpriteMaterial).opacity = level * nearWindow * (night > 0.3 || sheenTarget > 0 ? signal : lit * 0.4);

      const lampOn = Math.max(night, sheen * 0.8);
      lamp.visible = lampOn > 0.05 && level > 0.3;
      (halo.material as THREE.SpriteMaterial).opacity = lampOn * (0.8 + Math.sin(time * 9) * 0.05) * (sheen > 0.1 && Math.sin(time * 23) > 0.93 ? 0.3 : 1);
      if (lampOn > 0.05 && level > 0.5) {
        const light = kit.lights[1];
        light.color.set("#ffcf8a");
        light.distance = 16;
        light.position.copy(lamp.position).y += 4.2;
        light.intensity = lampOn * 60;
      }

      const mx = STAGE.x + 4;
      const mz = STAGE.z - 36;
      monster.position.set(mx, ground(mx, mz) - 30 * (1 - ease(monsterRise)), mz);
      monster.rotation.y = Math.atan2(kit.player.position.x - mx, kit.player.position.z - mz);
      monster.visible = monsterRise > 0.01;
      const fx = Math.sin(monster.rotation.y);
      const fz = Math.cos(monster.rotation.y);
      eyes.forEach((eye, i) => {
        const sx = i ? 1.7 : -1.7;
        eye.position.set(monster.position.x + fx * 9 + fz * sx, monster.position.y + 19.2, monster.position.z + fz * 9 - fx * sx);
        (eye.material as THREE.SpriteMaterial).opacity = ease(monsterRise) * (0.7 + 0.3 * Math.sin(time * 3));
        eye.visible = monster.visible;
      });

      // Utangaç canavar: seçili ağacın arkasına saklanır, oyuncu yaklaşınca biraz daha gizlenir.
      const away = new THREE.Vector3().subVectors(shyTree.mesh.position, kit.player.position).setY(0).normalize();
      shy.position.copy(shyTree.mesh.position).addScaledVector(away, 1.1);
      shy.position.y = ground(shy.position.x, shy.position.z);
      shy.rotation.y = Math.atan2(-away.x, -away.z);
      shy.visible = monsterTarget > 0 && level > 0.5;
      shyEyes.position.copy(shy.position).y += 0.75;
      shyEyes.visible = shy.visible;
      sign.visible = level > 0.3;
    },
  };
}
