import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createText3D } from "../../../engine/core/text3d";
import { createEmitter, SPARKLE } from "../../../engine/fx/emitter";
import type { SongScene } from "../../../engine/game/songStage";
import { createActor, createFigure } from "../../../engine/fx/figure";
import { fitModel } from "../../../engine/core/models";
import { GRADES } from "../../../engine/game/director";
import { announce, arc, attach, block, cam, ease, FIGURE_AT, follow, gazeTarget, glowSprite, GRAMOPHONE, ground, me, pt, ridge, rim, STAGE, type SceneKit } from "./kit";
import { createMeteors, createMotes } from "../../../engine/fx/sceneProps";

/**
 * Sextronot — kraterin ortasında tek başına bir kapı, eşiğinde boş bir uzay giysisi (kaskın
 * yanında küçük bir şimşek: Aladdin Sane'e selam). Yanında eski bir kapsül: yan yüzünde
 * "MT · 1969" yazar (Major Tom ve Space Oddity'nin yılı) ve bir yer kontrol anteni. Oyuncunun
 * başında aylar döner; masanın çevresinde ince bir atmosfer kabarcığı oluşur, kadehlerdeki buz
 * erir. Yerçekimi geri gelir, koltuk-duvar-yatak havada döner, "esner". Geri sayımda kırmızı
 * alarm; kalkış. Sonda karşılıklı duran iki sandalye yan yana gelir.
 */
const RINGS = 16;
/**
 * Sözlerdeki geri sayımın zamanı. 2:07.26'daki dizenin sonunda "10, 9, 8, 7" sayılır, "6" tam
 * 2:14.19'da bir sonraki dizeyi açar: sayılar saniyede birdir (10 → 130.2 sn … 1 → 139.2 sn),
 * ardından vedalaşma ve kalkış.
 */
const COUNT_START = 130.19;
const COUNT_STEP = 1.0;
const LAUNCH_AT = 140.3;
/** Dizelerin saniyeleri. */
const L = {
  astro: 17.22, suit: 20.55, welcome: 30.13, moons: 33.12, never: 36.55, atmos: 39.2, talk: 43.2, there: 46.21,
  drink: 49.42, ice: 52.43, earth: 68.09, couch: 74.68, search: 77.77, earth2: 81.05, couch2: 87.5, search2: 90.63,
  back: 121.04, stretch: 127.26, again: 145.88, couch3: 152.41, search3: 155.59, again2: 158.96, couch4: 165.44,
  search4: 170.49, yine: 171.99, search5: 182.73, yine2: 184.8, found: 195.66,
} as const;

function stencil(text: string, width: number, height: number, color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext("2d")!;
  g.fillStyle = color;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `700 ${Math.round(height * 0.62)}px "Arial Black", Impact, sans-serif`;
  g.fillText(text, width / 2, height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Kaskın yanındaki şimşek (kırmızı-mavi zikzak). */
function boltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 96;
  const g = canvas.getContext("2d")!;
  const path = [[40, 2], [14, 50], [32, 50], [20, 94], [52, 38], [34, 38], [48, 2]];
  g.beginPath();
  path.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = "#d8262c";
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = "#2a6ad8";
  g.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export async function createOrbitScene(kit: SceneKit): Promise<SongScene> {
  const root = new THREE.Group();

  // Geri sayım rakamları: gökte, kraterin üstünde asılı.
  const digitGroup = new THREE.Group();
  digitGroup.position.set(0, 36, 6);
  digitGroup.rotation.y = Math.atan2(4, 82 - 6);
  const digits = await Promise.all(
    Array.from({ length: 11 }, (_, n) => createText3D(String(n), { font: "cinzel-400", size: 14, depth: 1.6, color: "#f4f1ea", emissive: 1.4 })),
  );
  digits.forEach((mesh) => {
    mesh.visible = false;
    digitGroup.add(mesh);
  });
  root.add(digitGroup);

  // Kraterin ortasında tek başına duran kapı ve önünde çıkarılmış astronot kıyafeti.
  const doorSpot = new THREE.Vector3(GRAMOPHONE.x - 4, 0, GRAMOPHONE.z - 14);
  doorSpot.y = ground(doorSpot.x, doorSpot.z);
  const door = new THREE.Group();
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#e8e4dc", roughness: 0.6 });
  for (const [x, y, w, h] of [[-0.95, 1.2, 0.12, 2.4], [0.95, 1.2, 0.12, 2.4], [0, 2.4, 2.02, 0.12]] as const) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.18), frameMaterial);
    part.position.set(x, y, 0);
    door.add(part);
  }
  const hinge = new THREE.Group();
  hinge.position.set(-0.9, 0, 0);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.78, 2.3, 0.06), new THREE.MeshStandardMaterial({ color: "#6d5a48", roughness: 0.5 }));
  leaf.position.set(0.89, 1.17, 0);
  hinge.add(leaf);
  door.add(hinge);
  kit.colliders.solid(leaf, { pad: 0.1 });
  const doorLight = glowSprite("#dfe8ff", 3);
  doorLight.position.set(0, 1.2, -0.3);
  door.add(doorLight);
  door.position.copy(doorSpot);
  door.rotation.y = Math.atan2(GRAMOPHONE.x - doorSpot.x, GRAMOPHONE.z - doorSpot.z);
  root.add(door);
  const suit = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: "#ecebe6", roughness: 0.7 });
  const torso = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.9, 0.45, 3, 0.15), white);
  torso.position.set(0, 0.25, 0);
  torso.rotation.x = -1.3;
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), white);
  helmet.position.set(0.8, 0.3, 0.2);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14, 0, Math.PI), new THREE.MeshPhysicalMaterial({ color: "#c79a45", metalness: 1, roughness: 0.05, clearcoat: 1 }));
  visor.position.set(0.8, 0.3, 0.38);
  const bolt = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.21), new THREE.MeshBasicMaterial({ map: boltTexture(), transparent: true }));
  bolt.position.set(1.103, 0.32, 0.2);
  bolt.rotation.y = Math.PI / 2;
  suit.add(torso, helmet, visor, bolt);
  suit.position.copy(doorSpot).add(new THREE.Vector3(0.6, 0.05, 1.2));
  root.add(suit);
  kit.colliders.solid(suit);

  // Küçük uydular: oyuncunun etrafında döner.
  const moons = Array.from({ length: 3 }, (_, i) => {
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.18 + i * 0.05, 18, 12), new THREE.MeshStandardMaterial({ color: "#d8d4ca", roughness: 0.9, emissive: "#8a8a9a", emissiveIntensity: 0.3 }));
    root.add(moon);
    return moon;
  });

  // Havadan sudan: iki sandalye, masa, iki bardak ve eriyen buz.
  const talk = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: "#3a2616", roughness: 0.6 });
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 24), wood);
  table.position.y = 0.75;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.75, 8), wood);
  leg.position.y = 0.375;
  talk.add(table, leg);
  const ice: THREE.Mesh[] = [];
  const chairs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const chair = new THREE.Group();
    const seat = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.06, 0.5, 2, 0.02), wood);
    seat.position.y = 0.46;
    const rest = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.55, 0.05, 2, 0.02), wood);
    rest.position.set(0, 0.76, -0.23);
    chair.add(seat, rest);
    for (const [lx, lz] of [[-0.21, -0.21], [0.21, -0.21], [-0.21, 0.21], [0.21, 0.21]]) {
      const chairLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 6), wood);
      chairLeg.position.set(lx, 0.23, lz);
      chair.add(chairLeg);
    }
    // Gerçek sandalye (Poly Haven, CC0) varsa elle yapılmışın yerine geçer.
    const realChair = kit.models.get("dining_chair_02");
    if (realChair) {
      chair.clear();
      chair.add(fitModel(realChair, 0.97, { by: "height" }));
    }
    chair.position.set(side * 0.95, 0, 0);
    chair.rotation.y = -side * Math.PI / 2;
    chair.userData.side = side;
    talk.add(chair);
    chairs.push(chair);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 16, 1, true), new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.35, roughness: 0.05, side: THREE.DoubleSide }));
    glass.position.set(side * 0.2, 0.86, 0);
    const cube = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.07, 0.07, 2, 0.015), new THREE.MeshPhysicalMaterial({ color: "#e8f4ff", transparent: true, opacity: 0.7, roughness: 0.1 }));
    cube.position.set(side * 0.2, 0.86, 0);
    talk.add(glass, cube);
    ice.push(cube);
  }
  talk.position.set(STAGE.x + 6, ground(STAGE.x + 6, STAGE.z + 14), STAGE.z + 14);
  root.add(talk);

  // Eski bir kapsül (yan yüzünde MT · 1969) ve yer kontrol anteni.
  const capsule = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color: "#dfe2e6", metalness: 0.35, roughness: 0.45, emissive: "#1c222a" });
  const shell = new THREE.Mesh(new THREE.LatheGeometry([[0, 0.3], [1.9, 0.3], [1.95, 0.45], [0.45, 3.1], [0.3, 3.3], [0, 3.3]].map(([x, y]) => new THREE.Vector2(x, y)), 40), hull);
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(1.92, 1.7, 0.3, 40), new THREE.MeshStandardMaterial({ color: "#3a2a20", roughness: 0.9 }));
  shield.position.y = 0.15;
  const slope = Math.atan2(1.5, 2.65);
  const porthole = (angle: number, y: number) => {
    const r = 1.95 - ((y - 0.45) / 2.65) * 1.5;
    const window = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), new THREE.MeshBasicMaterial({ color: "#ffd9a0" }));
    window.position.set(Math.sin(angle) * (r + 0.01), y, Math.cos(angle) * (r + 0.01));
    window.rotation.set(-slope, angle, 0, "YXZ");
    return window;
  };
  const labelR = 1.95 - ((1.35 - 0.45) / 2.65) * 1.5;
  const capsuleLabel = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.3), new THREE.MeshBasicMaterial({ map: stencil("MT · 1969", 512, 128, "#1a1a1c"), transparent: true }));
  capsuleLabel.position.set(0, 1.35, labelR + 0.02);
  capsuleLabel.rotation.x = -slope;
  const beaconMaterial = new THREE.MeshStandardMaterial({ color: "#ff2a1a", emissive: "#ff2a1a", emissiveIntensity: 0 });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), beaconMaterial);
  beacon.position.y = 3.42;
  capsule.add(shell, shield, porthole(0.9, 2), porthole(-0.9, 2), capsuleLabel, beacon);
  const capsuleSpot = new THREE.Vector3(doorSpot.x - 7, 0, doorSpot.z - 4);
  // Astronot: uzaydan yeni dönmüş biri. Kapının eşiğinde durur, masada oturur (iki kadeh), yerçekimi gidince
  // kalkar, geri sayımda kapsüle gider, kalkışta yükselir; yerçekimi dönünce düşer ve sonda masaya döner.
  const astronaut = createActor(createFigure({ material: new THREE.MeshStandardMaterial({ color: "#eef0f4", roughness: 0.5, metalness: 0.1 }), height: 1.8 }), ground, { speed: 1.5 });
  astronaut.figure.group.position.set(doorSpot.x + 1.2, ground(doorSpot.x + 1.2, doorSpot.z + 2.4), doorSpot.z + 2.4);
  astronaut.figure.group.rotation.y = Math.atan2(4 - doorSpot.x, 82 - doorSpot.z);
  root.add(astronaut.figure.group);
  const astronautAt = (dx: number, dy: number, dz: number) => () => astronaut.figure.group.position.clone().add(new THREE.Vector3(dx, dy, dz));
  let astronautRest: "still" | "sit" | "kneel" = "still";
  let ascent = -1;
  capsule.position.set(capsuleSpot.x, ground(capsuleSpot.x, capsuleSpot.z) - 0.05, capsuleSpot.z);
  capsule.rotation.y = Math.atan2(GRAMOPHONE.x - capsuleSpot.x, GRAMOPHONE.z - capsuleSpot.z);
  root.add(capsule);
  kit.colliders.solid(shell, { shape: "round", pad: -0.2 });

  const antenna = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: "#9aa0a8", metalness: 0.8, roughness: 0.3 });
  for (let i = 0; i < 3; i += 1) {
    const a = (i / 3) * Math.PI * 2;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.3, 6), steel);
    strut.position.set(Math.sin(a) * 0.5, 1.05, Math.cos(a) * 0.5);
    strut.rotation.set(Math.cos(a) * 0.25, 0, -Math.sin(a) * 0.25);
    antenna.add(strut);
  }
  const dishPivot = new THREE.Group();
  dishPivot.position.y = 2.2;
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.25, 28, 10, 0, Math.PI * 2, 0, 0.75), new THREE.MeshStandardMaterial({ color: "#e4e6ea", metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide }));
  dish.rotation.x = Math.PI;
  dish.position.y = 1.2;
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6), steel);
  feed.position.y = 0.55;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: "#ff3020" }));
  tip.position.y = 1.1;
  const dishArm = new THREE.Group();
  dishArm.add(dish, feed, tip);
  dishArm.rotation.x = 0.9;
  dishPivot.add(dishArm);
  antenna.add(dishPivot);
  const antennaSpot = new THREE.Vector3(doorSpot.x + 8, 0, doorSpot.z - 5);
  antenna.position.set(antennaSpot.x, ground(antennaSpot.x, antennaSpot.z), antennaSpot.z);
  root.add(antenna);
  kit.colliders.solid(antenna, { shape: "round", maxCircles: 1, pad: -0.4 });

  // İnce bir atmosfer: masanın çevresinde, kenarı mavi parlayan bir kabarcık.
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(4.2, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uLevel: { value: 0 } },
      vertexShader: "varying vec3 vN; varying vec3 vV; void main() { vec4 w = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); gl_Position = projectionMatrix * w; }",
      fragmentShader: "uniform float uLevel; varying vec3 vN; varying vec3 vV; void main() { float rim = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(vec3(0.45, 0.68, 1.0) * rim * 0.9 * uLevel, 1.0); }",
    }),
  );
  root.add(atmosphere);
  atmosphere.position.copy(talk.position).y += 1.2;

  // Havada süzülen ev eşyaları: bordo kadife koltuk (minderler, kolçaklar, ahşap ayaklar), duvar kâğıtlı
  // duvar parçası (çerçeveli fotoğraf, priz), yatak (şilte, battaniye, yastık, ayaklar). Hepsi bir odanın parçaları:
  // dünya, yerçekimi giderken ev eşyalarıyla birlikte yükselir.
  const velvet = new THREE.MeshStandardMaterial({ color: "#6b2a2a", roughness: 0.85 });
  const walnutDark = new THREE.MeshStandardMaterial({ color: "#3b2415", roughness: 0.55 });
  const linen = new THREE.MeshStandardMaterial({ color: "#e9e4da", roughness: 0.95 });
  const blanket = new THREE.MeshStandardMaterial({ color: "#4e6484", roughness: 0.9 });
  const sofa = new THREE.Group();
  {
    const base = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.42, 0.9, 3, 0.08), velvet);
    base.position.y = 0.45;
    const back = new THREE.Mesh(new RoundedBoxGeometry(2.2, 0.72, 0.22, 3, 0.08), velvet);
    back.position.set(0, 0.98, -0.36);
    sofa.add(base, back);
    for (const side of [-1, 1]) {
      const cushion = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.22, 0.78, 3, 0.09), velvet);
      cushion.position.set(side * 0.53, 0.77, 0.04);
      const arm = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.64, 0.92, 3, 0.08), velvet);
      arm.position.set(side * 1.11, 0.62, 0);
      const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.38, 0.13, 3, 0.06), linen);
      pillow.position.set(side * 0.7, 1.05, -0.2);
      pillow.rotation.set(-0.25, side * 0.3, side * 0.15);
      sofa.add(cushion, arm, pillow);
      for (const front of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.28, 8), walnutDark);
        leg.position.set(side * 0.98, 0.14, front * 0.36);
        sofa.add(leg);
      }
    }
  }
  const wallPiece = new THREE.Group();
  {
    const paperCanvas = document.createElement("canvas");
    paperCanvas.width = paperCanvas.height = 256;
    const g = paperCanvas.getContext("2d")!;
    g.fillStyle = "#d8d0c0";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = "#c9bfa9";
    for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 14, 256);
    g.fillStyle = "#b9ad95";
    for (let y = 16; y < 256; y += 48) for (let x = 20; x < 256; x += 32) {
      g.beginPath();
      g.arc(x, y, 3, 0, Math.PI * 2);
      g.fill();
    }
    const paper = new THREE.CanvasTexture(paperCanvas);
    paper.colorSpace = THREE.SRGBColorSpace;
    paper.wrapS = paper.wrapT = THREE.RepeatWrapping;
    paper.repeat.set(2, 1.6);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 0.15), new THREE.MeshStandardMaterial({ map: paper, roughness: 0.95 }));
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.94, 0.05), walnutDark);
    frame.position.set(-0.6, 0.3, 0.1);
    const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshStandardMaterial({ color: "#8fa3b8", roughness: 0.6, emissive: "#2a3a4a", emissiveIntensity: 0.3 }));
    photo.position.set(-0.6, 0.3, 0.13);
    const socket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.03), linen);
    socket.position.set(0.9, -0.7, 0.09);
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 6), walnutDark);
    hook.rotation.x = Math.PI / 2;
    hook.position.set(0.8, 0.9, 0.11);
    wallPiece.add(wall, frame, photo, socket, hook);
  }
  const bed = new THREE.Group();
  {
    const frame = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.24, 2.7, 3, 0.05), walnutDark);
    frame.position.y = 0.34;
    const mattress = new THREE.Mesh(new RoundedBoxGeometry(2.0, 0.32, 2.6, 3, 0.1), linen);
    mattress.position.y = 0.62;
    const cover = new THREE.Mesh(new RoundedBoxGeometry(2.06, 0.12, 1.75, 3, 0.05), blanket);
    cover.position.set(0, 0.83, 0.42);
    const fold = new THREE.Mesh(new RoundedBoxGeometry(2.06, 0.08, 0.36, 3, 0.03), linen);
    fold.position.set(0, 0.93, -0.35);
    const pillow = new THREE.Mesh(new RoundedBoxGeometry(0.82, 0.18, 0.5, 3, 0.08), linen);
    pillow.position.set(0, 0.87, -0.95);
    pillow.rotation.x = -0.12;
    const headboard = new THREE.Mesh(new RoundedBoxGeometry(2.1, 0.9, 0.08, 3, 0.03), walnutDark);
    headboard.position.set(0, 0.85, -1.36);
    bed.add(frame, mattress, cover, fold, pillow, headboard);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.26, 8), walnutDark);
      leg.position.set(sx * 0.95, 0.13, sz * 1.22);
      bed.add(leg);
    }
  }
  // Hazır modeller varsa gerçek koltuk ve gündüz yatağı (Poly Haven, CC0); duvar parçası elle yapılmış kalır.
  const realSofa = kit.models.get("sofa_02");
  const realBed = kit.models.get("vintage_day_bed");
  const furniture: THREE.Object3D[] = [realSofa ? fitModel(realSofa, 2.3) : sofa, wallPiece, realBed ? fitModel(realBed, 2.6) : bed];
  furniture.forEach((item) => {
    item.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true;
    });
    root.add(item);
    kit.colliders.solid(item);
  });

  // Yıldız halkaları: kalkıştan sonra figüre doğru.
  const ringGeometry = new THREE.TorusGeometry(1.6, 0.09, 12, 64);
  const rings = Array.from({ length: RINGS }, (_, i) => {
    const material = new THREE.MeshBasicMaterial({ color: "#dbe8ff", transparent: true });
    const mesh = new THREE.Mesh(ringGeometry, material);
    const halo = glowSprite("#9fc0ff", 5);
    const a = i * 0.9;
    const radius = 7 + (i % 3) * 1.5;
    const x = STAGE.x + Math.cos(a) * radius;
    const z = STAGE.z - 10 + Math.sin(a) * radius;
    mesh.position.set(x, ground(x, z) + 5 + i * 3.4, z);
    halo.position.copy(mesh.position);
    root.add(mesh, halo);
    return { mesh, halo, material, taken: false };
  });
  const sparkle = createEmitter({ ...SPARKLE("#bcd4ff", 1.4), count: 90 });
  const launch = createEmitter({ ...SPARKLE("#ffffff", 2.6), count: 200, life: 1.8 });
  const found = glowSprite("#ffe2b0", 30);
  found.position.set(0, ground(0, 0) + 6, 0);
  root.add(sparkle.points, launch.points, found);
  const colliders = [block(kit, doorSpot.x, doorSpot.z, 1.1), block(kit, talk.position.x, talk.position.z, 1.6)];

  let clock = 0;
  let doorOpen = 0;
  let doorTarget = 0;
  let moonsLevel = 0;
  let moonsTarget = 0;
  let talkLevel = 0;
  let talkTarget = 0;
  let melt = 0;
  let furnitureLevel = 0;
  let furnitureTarget = 0;
  let shown = -1;
  let launched = false;
  let taken = 0;
  let thrustReady = 0;
  let foundLevel = 0;
  let foundTarget = 0;
  let helmetOn = false;
  let atmos = 0;
  let atmosTarget = 0;
  let stretch = -1;
  // Kayan yıldızlar ve yörüngede yavaşça dönen eski bir uydu (antenin dinlediği ses).
  const meteors = createMeteors(10);
  root.add(meteors.group);
  let meteorClock = 0;
  const satellite = new THREE.Group();
  const satBody = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.2, 12), new THREE.MeshStandardMaterial({ color: "#d9dce2", metalness: 0.8, roughness: 0.3, emissive: "#20242a" }));
  satBody.rotation.z = Math.PI / 2;
  const panelMaterial = new THREE.MeshStandardMaterial({ color: "#1a2a5a", metalness: 0.5, roughness: 0.3, emissive: "#0a1a4a", emissiveIntensity: 0.8 });
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 0.9), panelMaterial);
    panel.position.x = side * 2;
    satellite.add(panel);
  }
  const satBlink = glowSprite("#ff3a2a", 1.2);
  satBlink.position.y = 0.6;
  satellite.add(satBody, satBlink);
  satellite.scale.setScalar(2.2);
  root.add(satellite);
  // Gökten süzülen yıldız tozu (kalkıştan sonra ağırlıksızlık).
  const stardust = createMotes(200, "#cfe0ff", 0.3, new THREE.Vector3(40, 30, 40), 1.5);
  root.add(stardust.points);

  // Kraterin kıyısında beş takip çanağı: uyduyu izlerler, kalkıştan sonra oyuncuya dönerler.
  const DISHES = 5;
  const dishSteel = new THREE.MeshStandardMaterial({ color: "#c9ccd2", metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide });
  const dishDark = new THREE.MeshStandardMaterial({ color: "#2a2d33", metalness: 0.5, roughness: 0.6 });
  const bowlGeometry = new THREE.LatheGeometry(
    Array.from({ length: 10 }, (_, k) => {
      const r = (k / 9) * 3.2;
      return new THREE.Vector2(r, r * r * 0.1);
    }),
    36,
  );
  const dishes = Array.from({ length: DISHES }, (_, i) => {
    const spot = rim(0.55 + i * 1.18, 0, 75);
    const group = new THREE.Group();
    group.position.copy(spot);
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.2, 3.4, 14), dishDark);
    pedestal.position.y = 1.7;
    pedestal.castShadow = true;
    const yoke = new THREE.Group();
    yoke.position.y = 3.6;
    const bowl = new THREE.Mesh(bowlGeometry, dishSteel);
    bowl.rotation.x = Math.PI / 2; // çukur yüz +z'ye bakar; yoke.lookAt ile hedefe döner
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 0.5, 8), dishDark);
    horn.rotation.x = Math.PI / 2;
    horn.position.z = 2.1;
    const struts = [0, 1, 2].map((k) => {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.6, 6), dishDark);
      const a = (k / 3) * Math.PI * 2;
      strut.position.set(Math.cos(a) * 1.2, Math.sin(a) * 1.2, 1.1);
      strut.lookAt(horn.position.clone().add(new THREE.Vector3(0, 0, 0.5)));
      strut.rotateX(Math.PI / 2);
      return strut;
    });
    const blink = glowSprite("#ff3a2a", 1.4);
    blink.position.set(0, 3.2, 0.9);
    yoke.add(bowl, horn, ...struts, blink);
    group.add(pedestal, yoke);
    root.add(group);
    kit.colliders.solid(pedestal, { shape: "round", pad: 0.3 });
    return { group, yoke, blink };
  });
  const dishTarget = new THREE.Vector3();

  // Merkezin üstünde dönen yedi soluk ay: ağırlıksızlık halkası (kalkıştan sonra büyür).
  const MOON_RING = 7;
  const moonRing = Array.from({ length: MOON_RING }, (_, i) => {
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1.4 + (i % 3) * 0.5, 22, 14), new THREE.MeshStandardMaterial({ color: "#d3d0c8", roughness: 0.95, emissive: "#6a6a7a", emissiveIntensity: 0.35 }));
    root.add(moon);
    return moon;
  });
  const dustCenter = new THREE.Vector3();
  let together = 0;
  let togetherTarget = 0;
  const toRing = new THREE.Vector3();
  const moonPosition = (i: number, target: THREE.Vector3) =>
    target.set(
      kit.player.position.x + Math.cos(clock * (0.8 + i * 0.3) + i * 2) * (2.2 + i * 0.6),
      kit.player.position.y + 1.9 + Math.sin(clock * 1.3 + i) * 0.3,
      kit.player.position.z + Math.sin(clock * (0.8 + i * 0.3) + i * 2) * (2.2 + i * 0.6),
    );

  const setHelmet = (on: boolean) => {
    helmetOn = on;
    document.body.classList.toggle("ar-visor", on);
    suit.children[1].visible = suit.children[2].visible = suit.children[3].visible = !on;
  };

  return {
    root,
    hint: "Uzaydan yeni dönmüş biri var. Kapıya yaklaş, kaskı tak; geri sayım şarkıyla birlikte gelecek.",
    interactables: [
      gazeTarget({
        position: (target) => target.copy(suit.position).setY(suit.position.y + 0.3),
        radius: 0.6,
        reach: 3,
        label: () => (helmetOn ? "Kaskı çıkar" : "Astronot kaskını tak"),
        use: () => {
          setHelmet(!helmetOn);
          kit.sfx.cue("switch");
        },
      }),
      ...moons.map((_, i) =>
        gazeTarget({
          position: (target) => moonPosition(i, target),
          radius: 0.3,
          reach: 4,
          label: () => (moonsLevel > 0.5 && !kit.secrets.has("sextronot-uydu") ? "Uyduya dokun" : null),
          use: () => kit.secrets.reveal("sextronot-uydu"),
        }),
      ),
    ],
    colliders,
    action: {
      get label() {
        return launched ? "İtiş" : "";
      },
      use: () => {
        if (!launched || clock < thrustReady) return;
        thrustReady = clock + 1.2;
        kit.player.velocity.y = Math.max(kit.player.velocity.y, 7);
        launch.origin.copy(kit.player.position);
        launch.burst(clock);
        kit.sfx.cue("whoosh");
      },
    },
    // Klip: derin mavi uzay → soğuk kapı ve giysi → pastel aylar → mum ışığında masa → neon ev eşyaları
    // → kırmızı alarmlı geri sayım → beyaz kalkış → sıcak şafak; sonda yan yana iki sandalye.
    shots: [
      // Astronot: eşikte, masada, kapsülün yanında; kalkışta yükselir, düşer, sonda masaya döner.
      { at: L.astro + 1.4, from: astronautAt(-1.4, 1.5, 2.4), to: astronautAt(-0.8, 1.4, 1.7), look: astronautAt(0, 1.4, 0), fov: 40, grade: "cold" },
      { at: 57.5, from: astronautAt(1.8, 1.1, 1.2), to: astronautAt(1.3, 1.0, 0.9), look: astronautAt(0, 1.0, 0), fov: 38, grade: "candle" },
      { at: COUNT_START + 4.5, from: astronautAt(-2.2, 1.2, -1.6), to: astronautAt(-1.6, 1.3, -1.1), look: astronautAt(0, 1.3, 0), lookTo: follow(capsule, 0, 2, 0), fov: 46, grade: "blood", in: "flash", flashColor: "#ff2a1a" },
      { at: LAUNCH_AT + 1.5, from: astronautAt(0, 0.4, 5), to: astronautAt(0, 2, 5), look: astronautAt(0, 1.2, 0), lookTo: astronautAt(0, 18, 0), fov: 60, curve: "linear", grade: "bleach" },
      { at: L.again + 1.8, from: astronautAt(2.2, 0.6, 2.2), to: astronautAt(1.4, 0.5, 1.4), look: astronautAt(0, 0.7, 0), fov: 44, grade: "pastel" },
      { at: 0, from: ridge(2.4, 48), path: [rim(2.0, 30), pt(doorSpot.x + 26, 14, doorSpot.z + 36)], to: cam(doorSpot.x + 9, 4.5, doorSpot.z + 14), look: pt(0, 40, 0), lookTo: cam(doorSpot.x, 1.5, doorSpot.z), fov: 52, curve: "linear", grade: "night", in: "fade" },
      { at: 8.5, from: follow(capsule, -8, 1.4, 6), to: follow(capsule, -6, 1.2, 5), look: follow(capsule, 0, 1.6, 0), fov: 42, curve: "linear", grade: "night" },
      { at: L.astro, from: cam(doorSpot.x + 3, 1.6, doorSpot.z + 5), to: cam(doorSpot.x + 1.4, 1.4, doorSpot.z + 3.4), look: cam(doorSpot.x, 1.2, doorSpot.z), fov: 44, grade: "cold" },
      { at: L.suit, from: follow(suit, 2.3, 0.6, 0.7), to: follow(suit, 1.9, 0.5, 0.45), look: follow(suit, 0.9, 0.3, 0.2), fov: 36, grade: "cold" },
      { at: 25, from: follow(dishes[0].group, 7, 1.6, 8), to: follow(dishes[0].group, 4.5, 3.2, 5), look: follow(dishes[0].group, 0, 4.5, 0), lookTo: follow(satellite), fov: 46, grade: "cold" },
      { at: L.welcome, orbit: { center: me(kit), radius: 3.2, height: 1.9, from: 0, to: 1.4 }, look: me(kit, 0, 1.9, 0), fov: 52, curve: "linear", grade: "pastel" },
      { at: L.moons, from: rim(1.1, 34), path: arc(0, 0, 50, 30, 1.4, 2.3, 3), to: pt(Math.cos(2.6) * 50, 28, Math.sin(2.6) * 50), look: pt(0, 24, 0), fov: 54, curve: "linear", grade: "pastel" },
      { at: L.never, orbit: { center: me(kit), radius: 9, height: 3, from: 1.4, to: 2.2 }, look: me(kit, 0, 2, 0), fov: 50, curve: "linear", grade: "pastel" },
      { at: L.atmos, from: follow(talk, 11, 4, 11), to: follow(talk, 9, 3, 9), look: follow(talk, 0, 1.5, 0), fov: 42, grade: "dawn" },
      { at: L.talk, from: follow(talk, 2.6, 1.6, 2.6), to: follow(talk, 1.4, 1.3, 1.4), look: follow(talk, 0, 0.8, 0), fov: 40, grade: "candle" },
      { at: L.there, from: follow(talk, 0.3, 1.02, 0.5), to: follow(talk, 0.1, 0.98, 0.4), look: follow(talk, -0.2, 0.86, 0), fov: 30, grade: { ...GRADES.candle, soft: 0.7 } },
      { at: L.drink, from: follow(talk, 0, 0.45, 3), to: follow(talk, 0, 0.5, 2.3), look: follow(talk, 0, 0.9, 0), fov: 40, grade: "candle" },
      { at: L.ice, from: follow(talk, 0.5, 1.02, -0.5), to: follow(talk, 0.4, 0.98, -0.4), look: follow(talk, 0.2, 0.86, 0), fov: 30, grade: { ...GRADES.candle, soft: 0.7 } },
      { at: 56, orbit: { center: follow(talk), radius: 4, height: 1.2, from: 0.3, to: 1.6 }, look: follow(talk, 0, 0.8, 0), fov: 46, curve: "linear", grade: "candle" },
      { at: 62, from: follow(talk, 1, 1, 1), look: follow(talk, -2, 2.5, -4), lookTo: follow(talk, -3, 4.5, -4), fov: 72, grade: "dawn" },
      { at: L.earth, from: rim(0.2, 12), path: arc(0, 0, 44, 16, 0.5, 1.6, 3), to: pt(Math.cos(1.9) * 40, 14, Math.sin(1.9) * 40), look: pt(0, 2, 0), lookTo: me(kit, 0, 3, 0), fov: 56, curve: "linear", grade: "neon", in: "flash" },
      { at: 71.5, from: follow(furniture[0], 3, 0.8, 3), to: follow(furniture[0], 2.2, 0.6, 2.2), look: follow(furniture[0]), fov: 44, grade: "neon" },
      { at: L.couch, from: follow(furniture[1], 3.4, 0.5, 3.4), look: follow(furniture[1]), fov: 44, roll: 0.15, grade: "neon" },
      { at: L.search, from: follow(furniture[2], 3, 2.4, 3), to: follow(furniture[2], 2.4, 2, 2.4), look: follow(furniture[2]), fov: 44, grade: "neon" },
      { at: L.earth2, from: rim(3.4, 22), path: arc(0, 0, 64, 24, 3.7, 4.6, 3), to: pt(Math.cos(4.9) * 60, 20, Math.sin(4.9) * 60), look: pt(0, 6, 0), fov: 52, curve: "linear", grade: "neon" },
      { at: 84.3, from: follow(furniture[0], -3, 1, 2.6), look: follow(furniture[0]), fov: 42, roll: -0.2, rollTo: 0.2, grade: "fever" },
      { at: L.couch2, from: follow(furniture[2], -3, 1.4, -3), look: follow(furniture[2]), fov: 44, grade: "fever" },
      { at: L.search2, from: me(kit, 0, 1, 16), to: me(kit, 0, 10, 20), look: me(kit, 0, 5, 0), fov: 52, curve: "linear", grade: "neon", out: "fade" },
      { at: 96, orbit: { center: follow(capsule), radius: 6.5, height: 2.5, from: 2.2, to: 3.6 }, look: follow(capsule, 0, 1.8, 0), fov: 44, curve: "linear", grade: "night", in: "fade" },
      { at: 103, orbit: { center: follow(antenna), radius: 5, height: 2.5, from: 0.5, to: 1.4 }, look: follow(antenna, 0, 2.6, 0), fov: 44, curve: "linear", grade: "cold" },
      { at: 110, from: follow(dishes[2].group, -7, 1.4, 5), to: follow(dishes[2].group, -3.5, 2.6, 3), look: follow(dishes[2].group, 0, 5, 0), lookTo: follow(satellite), fov: 48, curve: "linear", grade: "dawn" },
      { at: L.back, from: follow(capsule, 6, 2, 6), to: follow(capsule, 5, 1.8, 4), look: follow(capsule, 0, 1.6, 0), fov: 42, grade: "cold" },
      { at: 124, from: attach(capsule, 0.3, 1.4, labelR + 1.6), to: attach(capsule, 0.1, 1.35, labelR + 1.1), look: attach(capsule, 0, 1.35, labelR), fov: 34, grade: "cold" },
      { at: L.stretch, from: follow(furniture[0], 3.2, 1, 3.2), look: follow(furniture[0]), fov: 46, grade: "fever" },
      { at: COUNT_START, from: me(kit, 0, 1.2, 4), look: pt(0, 36, 6), fov: 58, handheld: 0.02, grade: "blood", in: "flash", flashColor: "#ff2a1a" },
      { at: COUNT_START + 3, from: follow(capsule, 6, 3.6, 6), to: follow(capsule, 5, 3.4, 5), look: follow(capsule, 0, 2.6, 0), fov: 40, grade: "blood", in: "flash", flashColor: "#ff2a1a" },
      { at: COUNT_START + 6, from: follow(dishes[3].group, 4.5, 1, 4.5), to: follow(dishes[3].group, 3.6, 1.6, 3.6), look: follow(dishes[3].group, 0, 4.6, 0), fov: 46, grade: "blood", in: "flash", flashColor: "#ff2a1a" },
      { at: COUNT_START + 8, from: me(kit, 0, 1.4, 2), look: pt(0, 36, 6), fov: 40, handheld: 0.03, grade: "blood", in: "flash", flashColor: "#ff2a1a" },
      { at: LAUNCH_AT, from: me(kit, 3, -3, 6), look: me(kit, 0, 1.5, 0), fov: 64, handheld: 0.1, grade: "bleach", in: "white" },
      { at: 143, from: me(kit, 0, 1, 0), look: me(kit, 0, 30, -5), fov: 70, grade: "deep" },
      { at: L.again, from: me(kit, 0, 44, 30), path: [me(kit, 24, 30, 8)], to: me(kit, 0, 6, 10), look: me(kit, 0, 1, 0), fov: 55, curve: "linear", grade: "pastel" },
      { at: L.couch3, orbit: { center: me(kit), radius: 12, height: 3, from: 2, to: 3.4 }, look: me(kit, 0, 5, 0), fov: 54, curve: "linear", grade: "neon" },
      { at: L.search3, from: follow(furniture[2], 3, 2.4, 3), look: follow(furniture[2]), fov: 44, grade: "neon" },
      { at: L.again2, from: rim(4.2, 30), path: arc(0, 0, 46, 27, 4.5, 5.5, 3), to: pt(Math.cos(5.8) * 46, 27, Math.sin(5.8) * 46), look: pt(0, 26, 0), lookTo: me(kit, 0, 2, 0), fov: 54, curve: "linear", grade: "neon" },
      { at: L.couch4, from: follow(talk, 2.2, 1.4, 2.2), to: follow(talk, 1.6, 1.2, 1.6), look: follow(talk, 0, 0.8, 0), fov: 40, grade: "candle" },
      { at: L.search4, from: follow(talk, 0.3, 1.02, 0.5), look: follow(talk, -0.2, 0.86, 0), fov: 30, grade: { ...GRADES.candle, soft: 0.7 } },
      { at: L.yine, orbit: { center: me(kit), radius: 6, height: 2, from: 0, to: 1.8 }, look: me(kit, 0, 3, 0), fov: 60, roll: 0.2, rollTo: -0.2, curve: "linear", grade: "fever" },
      { at: 176, from: rim(3.2, 10), path: [rim(3.65, 16)], to: rim(4.1, 10), look: me(kit, 0, 3, 0), fov: 50, curve: "linear", grade: "neon" },
      { at: L.search5, from: follow(furniture[1], 3, 0.6, 3), look: follow(furniture[1]), fov: 44, grade: "fever" },
      { at: L.yine2, orbit: { center: me(kit), radius: 10, height: 4, from: 5, to: 6 }, look: me(kit, 0, 3, 0), fov: 54, curve: "linear", grade: "neon" },
      { at: 190, from: follow(capsule, 8, 1.2, 8), to: follow(capsule, 6, 1.4, 7), look: follow(capsule, 0, 1.6, 0), fov: 42, grade: "cold", out: "fade" },
      { at: L.found, from: cam(14, 3, 26), to: cam(7, 2.4, 15), look: cam(0, 6, 0), lookTo: FIGURE_AT, fov: 58, grade: "dawn", in: "fade" },
      { at: 201, from: follow(talk, 0.6, 1.3, -2.8), to: follow(talk, 0.4, 1.1, -2.2), look: follow(talk, 0, 0.6, 0.8), fov: 40, grade: { ...GRADES.candle, soft: 0.5 } },
      { at: 208, from: follow(talk, 0, 1.4, 5), to: follow(talk, 0, 16, 20), look: follow(talk, 0, 0.8, 0), fov: 50, curve: "linear", grade: "dawn" },
      { at: 215, from: me(kit, 0, 3, 6), path: [pt(28, 30, 56)], to: ridge(0.9, 56), look: me(kit), lookTo: pt(0, 24, 0), fov: 55, curve: "linear", grade: "dawn", out: "fade" },
    ],
    beats: [
      { at: 0, id: "space" },
      { at: L.astro, id: "door", line: "Kraterin ortasında tek başına bir kapı; eşiğinde boş bir uzay giysisi." },
      { at: L.welcome, id: "welcome", line: "Başının üstünde küçük aylar dönmeye başlıyor." },
      { at: L.atmos, id: "atmos", line: "Masanın çevresinde ince, mavi bir hava kabarcığı oluşuyor." },
      { at: L.talk, id: "talk", line: "Uzaydan dönen adam masaya oturuyor: iki kadeh, ama karşısı boş; buz yavaş yavaş küçülüyor." },
      { at: L.earth, id: "earthling", line: "Yerçekimi geri geliyor: bir koltuk, bir duvar, bir yatak havada dönüyor." },
      { at: L.back, id: "goodbye", line: "Kapsülün ışıkları yanıyor; geri sayım yaklaşıyor." },
      { at: L.stretch, id: "stretch" },
      { at: COUNT_START, id: "count" },
      { at: LAUNCH_AT, id: "launch", line: "Kapsül ateşleniyor; yerçekimi seni bırakıyor." },
      { at: L.again, id: "again", line: "Ayakların yeniden yere basıyor; yerçekimi geri geliyor." },
      { at: L.found, id: "found", line: "Kraterin ortasında sıcak bir ışık doğuyor. Karşılıklı duran iki sandalye yan yana geliyor." },
    ],
    onBeat(id) {
      if (id === "talk") {
        astronaut.goTo(talk.position.x - 0.95, talk.position.z + 0.15, false, Math.PI / 2);
        astronautRest = "sit";
      }
      if (id === "earthling") {
        astronaut.goTo(talk.position.x - 3, talk.position.z + 2);
        astronautRest = "still";
      }
      if (id === "goodbye") {
        astronaut.goTo(capsuleSpot.x + 2.6, capsuleSpot.z + 1.2, false, Math.atan2(-2.6, -1.2));
        astronautRest = "still";
      }
      if (id === "launch") ascent = 0;
      if (id === "again") {
        ascent = -1;
        astronaut.lift = 0;
        astronaut.figure.group.position.set(STAGE.x + 3, ground(STAGE.x + 3, STAGE.z + 9), STAGE.z + 9);
        astronaut.rest("kneel");
        astronautRest = "kneel";
      }
      if (id === "found") {
        astronaut.goTo(talk.position.x - 0.95, talk.position.z + 0.15, false, Math.PI / 2);
        astronautRest = "sit";
      }
      if (id === "door") {
        doorTarget = 1;
        kit.sfx.cue("switch");
      }
      if (id === "welcome") moonsTarget = 1;
      if (id === "talk") talkTarget = 1;
      if (id === "earthling" || id === "again") furnitureTarget = 1;
      if (id === "atmos") atmosTarget = 1;
      if (id === "goodbye") moonsTarget = 0;
      if (id === "stretch") stretch = 0;
      if (id === "launch") {
        launched = true;
        furnitureTarget = 0;
        atmosTarget = 0;
        kit.effects.gravity = 0.35;
        kit.player.velocity.y = Math.max(kit.player.velocity.y, 11);
        launch.origin.copy(kit.player.position);
        launch.burst(clock);
        kit.effects.shake = 0.3;
        kit.sfx.cue("whoosh");
        announce(kit.hud, "Yerçekimi seni bıraktı. Yıldız halkalarına dokunarak yüksel; E ile itiş.", 6);
      }
      if (id === "again") kit.effects.gravity = 0.7;
      if (id === "found") {
        foundTarget = 1;
        togetherTarget = 1;
        kit.effects.gravity = 1;
      }
    },
    reset() {
      astronautRest = "still";
      ascent = -1;
      astronaut.lift = 0;
      astronaut.rest("still");
      astronaut.figure.group.position.set(doorSpot.x + 1.2, ground(doorSpot.x + 1.2, doorSpot.z + 2.4), doorSpot.z + 2.4);
      shown = -1;
      launched = false;
      taken = 0;
      doorOpen = doorTarget = moonsLevel = moonsTarget = talkLevel = talkTarget = melt = furnitureLevel = furnitureTarget = foundLevel = foundTarget = 0;
      setHelmet(false);
      for (const ring of rings) ring.taken = false;
      atmos = atmosTarget = together = togetherTarget = 0;
      stretch = -1;
    },
    update(dt, time, level, songTime) {
      clock = time;
      if (ascent >= 0) {
        ascent += dt;
        astronaut.lift = ascent * ascent * 1.6;
        astronaut.figure.group.rotation.z = Math.sin(ascent * 0.8) * 0.6;
        astronaut.rest("still");
      } else astronaut.figure.group.rotation.z = 0;
      if (astronaut.arrived) astronaut.rest(astronautRest);
      astronaut.update(dt, time);
      astronaut.figure.group.visible = level > 0.05;
      if (level < 0.05 && helmetOn) setHelmet(false);

      // Sözlerle senkron geri sayım: 10'dan 1'e, sonra kalkış.
      const count = songTime >= COUNT_START && songTime < LAUNCH_AT ? Math.max(1, 10 - Math.floor((songTime - COUNT_START) / COUNT_STEP)) : -1;
      if (count !== shown) {
        shown = count;
        digits.forEach((mesh, n) => (mesh.visible = n === count));
        if (count > 0) kit.sfx.cue("ui");
      }
      const beat = count > 0 ? 1 - ((songTime - COUNT_START) % COUNT_STEP) / COUNT_STEP : 0;
      digitGroup.scale.setScalar(0.9 + beat * 0.15);
      digitGroup.visible = level > 0.3 && count > 0;

      doorOpen += (doorTarget * level - doorOpen) * Math.min(1, dt * 1.5);
      hinge.rotation.y = -ease(doorOpen) * 1.6;
      (doorLight.material as THREE.SpriteMaterial).opacity = doorOpen * (0.7 + 0.3 * Math.sin(time * 3));
      door.visible = suit.visible = level > 0.05;

      moonsLevel += (moonsTarget * level - moonsLevel) * Math.min(1, dt);
      moons.forEach((moon, i) => {
        moonPosition(i, moon.position);
        moon.scale.setScalar(Math.max(0.001, moonsLevel));
        moon.visible = moonsLevel > 0.01;
      });

      // Atmosfer kabarcığı; kapsülün kırmızı alarmı; anten geri sayımda göğe döner.
      atmos += (atmosTarget * level - atmos) * Math.min(1, dt * 0.8);
      (atmosphere.material as THREE.ShaderMaterial).uniforms.uLevel.value = atmos;
      atmosphere.scale.setScalar(0.4 + ease(atmos) * 0.6);
      atmosphere.visible = atmos > 0.01;
      capsule.visible = antenna.visible = level > 0.05;
      const alarm = count > 0 ? beat : 0;
      beaconMaterial.emissiveIntensity = count > 0 ? 1 + alarm * 5 : 0.4 + 0.3 * Math.sin(time * 2);
      if (level > 0.5) {
        // Kapsülü ve anteni aydınlatan projektörler; geri sayımda kapsülünki kırmızı alarma döner.
        const flood = kit.lights[1];
        flood.distance = 20;
        if (count > 0) {
          flood.color.set("#ff2a1a");
          capsule.localToWorld(flood.position.set(0, 4.2, 1.5));
          flood.intensity = (18 + alarm * 50) * level;
        } else {
          flood.color.set("#d6e4ff");
          capsule.localToWorld(flood.position.set(2.5, 5, 4));
          flood.intensity = 45 * level;
        }
        const dishLight = kit.lights[0];
        dishLight.color.set("#d6e4ff");
        dishLight.distance = 12;
        dishLight.position.copy(antenna.position).add(new THREE.Vector3(1.5, 5, 2));
        dishLight.intensity = 25 * level;
        if (togetherTarget > 0) {
          // Sonda sıcak bir ışık masanın üstüne iner.
          dishLight.color.set("#ffcf9a");
          dishLight.distance = 9;
          dishLight.position.copy(talk.position).add(new THREE.Vector3(0.6, 3.2, 1.2));
          dishLight.intensity = 22 * level * ease(together);
        }
      }
      const skyward = songTime >= COUNT_START && songTime < LAUNCH_AT + 6 ? 1 : 0;
      dishPivot.rotation.y = skyward ? dishPivot.rotation.y : time * 0.25;
      dishArm.rotation.x += ((skyward ? 0.05 : 0.9) - dishArm.rotation.x) * Math.min(1, dt * 1.5);
      tip.visible = Math.sin(time * 4) > 0;
      // Sandalyeler: karşılıklıdan yan yana.
      together += (togetherTarget - together) * Math.min(1, dt * 0.5);
      const k = ease(together);
      chairs.forEach((chair) => {
        const side = chair.userData.side as number;
        chair.position.set(THREE.MathUtils.lerp(side * 0.95, side * 0.34, k), 0, THREE.MathUtils.lerp(0, 0.95, k));
        chair.rotation.y = THREE.MathUtils.lerp(-side * Math.PI / 2, Math.PI, k);
      });

      talkLevel += (talkTarget * level - talkLevel) * Math.min(1, dt);
      talk.scale.setScalar(Math.max(0.001, ease(talkLevel)));
      if (talkTarget > 0) melt = Math.min(1, melt + dt / 20);
      ice.forEach((cube) => cube.scale.setScalar(Math.max(0.05, 1 - melt)));

      furnitureLevel += (furnitureTarget * level - furnitureLevel) * Math.min(1, dt * 0.6);
      if (stretch >= 0) stretch += dt;
      const elastic = stretch >= 0 && stretch < 3 ? Math.sin(stretch * 7) * Math.exp(-stretch * 1.2) : 0;
      furniture.forEach((mesh, i) => {
        const a = time * 0.15 + (i / 3) * Math.PI * 2;
        mesh.position.set(kit.player.position.x + Math.cos(a) * 9, ground(kit.player.position.x, kit.player.position.z) + 3 + i * 1.5 + Math.sin(time + i) * 0.6 - (1 - furnitureLevel) * 10, kit.player.position.z + Math.sin(a) * 9);
        mesh.rotation.set(Math.sin(time * 0.3 + i) * 0.5, a, Math.cos(time * 0.25 + i) * 0.4);
        // "Esner": koltuk ve yatak lastik gibi uzar, geri toplanır.
        mesh.scale.set(1 + (i !== 1 ? elastic * 0.7 : 0), 1 - (i !== 1 ? elastic * 0.25 : 0), 1);
        mesh.visible = furnitureLevel > 0.02;
      });

      for (const [i, ring] of rings.entries()) {
        ring.mesh.rotation.set(Math.PI / 2 + Math.sin(time * 0.6 + i) * 0.3, time * 0.4 + i, 0);
        const alpha = ring.taken ? Math.max(0, ring.material.opacity - dt * 2) : level * (launched ? 1 : 0);
        ring.material.opacity = alpha;
        (ring.halo.material as THREE.SpriteMaterial).opacity = alpha * 0.8;
        ring.mesh.visible = ring.halo.visible = alpha > 0.01;
        if (launched && !ring.taken && toRing.copy(ring.mesh.position).sub(kit.camera.position).length() < 3) {
          ring.taken = true;
          taken += 1;
          kit.player.velocity.y = Math.max(kit.player.velocity.y, 9);
          sparkle.origin.copy(ring.mesh.position);
          sparkle.burst(time);
          kit.sfx.cue("chime");
          if (taken === RINGS) kit.secrets.reveal("sextronot-bowie");
          else announce(kit.hud, `Halkalar ${taken} / ${RINGS}`, 2);
        }
      }
      sparkle.update(time);
      launch.update(time);
      meteorClock -= dt;
      if (meteorClock <= 0 && level > 0.5) {
        meteorClock = 2 + kit.random() * 3;
        meteors.spawn(songTime >= COUNT_START && songTime < LAUNCH_AT ? "#ff6a4a" : "#dfe8ff");
      }
      meteors.update(dt, kit.player.position);
      meteors.group.visible = level > 0.05;
      const sa = time * 0.05;
      satellite.position.set(kit.player.position.x + Math.cos(sa) * 70, 60 + Math.sin(time * 0.1) * 4, kit.player.position.z + Math.sin(sa) * 70);
      satellite.rotation.set(time * 0.1, sa, 0.3);
      (satBlink.material as THREE.SpriteMaterial).opacity = Math.sin(time * 3) > 0.6 ? level : 0.1 * level;
      satellite.visible = level > 0.05;
      stardust.level = (launched ? 1 : 0.35) * level;
      dishes.forEach((dish, i) => {
        dishTarget.copy(launched ? kit.player.position : satellite.position);
        dish.yoke.lookAt(dishTarget);
        (dish.blink.material as THREE.SpriteMaterial).opacity = level * (0.3 + 0.7 * Math.max(0, Math.sin(time * 2.2 + i * 1.3)));
        dish.group.visible = level > 0.05;
      });
      moonRing.forEach((moon, i) => {
        const a = time * 0.05 + (i / MOON_RING) * Math.PI * 2;
        const r = 46 + Math.sin(time * 0.3 + i) * 2;
        moon.position.set(Math.cos(a) * r, 26 + i * 1.6 + Math.sin(time * 0.5 + i) * 1.2, Math.sin(a) * r);
        moon.rotation.y = time * 0.2 + i;
        moon.scale.setScalar(Math.max(0.001, level * (launched ? 1.4 : 1)));
        moon.visible = level > 0.05;
      });
      dustCenter.copy(kit.player.position).setY(kit.player.position.y - 4);
      stardust.update(time, dustCenter);
      foundLevel += (foundTarget * level - foundLevel) * Math.min(1, dt * 0.4);
      (found.material as THREE.SpriteMaterial).opacity = foundLevel * 0.6;
      found.visible = foundLevel > 0.01;
    },
  };
}
