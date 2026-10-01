import * as THREE from "three";
import { createEmitter, SPARKLE } from "../../../engine/fx/emitter";
import type { SongScene } from "../../../engine/game/songStage";
import { createActor, createFigure } from "../../../engine/fx/figure";
import { createCrowd } from "./crowd";
import { GRADES } from "../../../engine/game/director";
import { announce, arc, cam, CENTER, FIGURE_AT, follow, gazeTarget, glowSprite, GRAMOPHONE, ground, me, pt, ridge, rim, secretItem, softGlow, type SceneKit } from "./kit";
import { createLanterns, createPetals } from "../../../engine/fx/sceneProps";

/**
 * Hala Seni Çok Özlüyorum — gramofondan merkeze küçük ışıklar yanar. Hayalet bir kalabalık
 * kameranın içinden geçip gider. Darbeler flaşla keser; gece-gündüz hızla birbirini kovalar.
 * Tozda çizilmiş gülen bir yüzün gözünden yaş süzülür. Yerde kızıl bir yara açılır, kaçtıkça
 * ayağının dibinde bir leke peşinden gelir. Özlem dizelerinde bir an, karşıda sıcak renkli tek
 * bir hayalet durur ve söner (kalabalığın tersine yürüyen tek kişi). Sonda kraterin ortasında
 * bir kalp sözlerle birlikte atar ve yara dikiş izine döner. Oyuncu E ile yarayı kapatır;
 * yara kapanır, sonra yeniden açılır.
 */
const STITCHES = 7;
const SEGMENTS = 220;
const GHOSTS = 26;
const PATH_LIGHTS = 18;
const ACROSS = 9;
/** Dizelerin saniyeleri. */
const L = {
  survive: 23.2, alone: 31.08, thousand: 35.48, over: 41.45, hit1: 48.34, days: 54.19, laugh: 60.84, wound: 73.72,
  open: 82.49, flee: 86.55, far: 95.22, hit4: 99.22, days2: 105.44, laugh2: 112.08, miss: 125.04, miss2: 141.78,
  hit5: 163.64, days3: 169.54, laugh3: 176.49, miss3: 189.09, miss4: 205.15, miss5: 218.34, miss6: 226.21,
  quiet: 248.05, heart: 265.93, heartB: 268.96, live: 271.75, you: 278.15,
} as const;

export function createWoundScene(kit: SceneKit): SongScene {
  const root = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: 7 }, (_, i) => {
      const t = i / 6;
      const x = THREE.MathUtils.lerp(GRAMOPHONE.x - 3, -2, t) + Math.sin(t * 7.5) * 4;
      const z = THREE.MathUtils.lerp(GRAMOPHONE.z - 5, 6, t);
      return new THREE.Vector3(x, 0, z);
    }),
  );

  const positions: number[] = [];
  const along: number[] = [];
  const across: number[] = [];
  const indices: number[] = [];
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const t = i / SEGMENTS;
    const p = curve.getPointAt(t);
    curve.getTangentAt(t, tangent);
    normal.set(-tangent.z, 0, tangent.x).normalize();
    const width = 0.9 + Math.sin(t * Math.PI) * 1.8 + Math.sin(t * 40) * 0.2;
    // Enine de birkaç köşe: şerit engebeli zemine her noktada otursun (ortası toprağa gömülmesin).
    for (let k = 0; k < ACROSS; k += 1) {
      const s = -1 + (2 * k) / (ACROSS - 1);
      const x = p.x + normal.x * width * s;
      const z = p.z + normal.z * width * s;
      positions.push(x, ground(x, z) + 0.12, z);
      along.push(t);
      across.push(s);
    }
    if (i < SEGMENTS) {
      for (let k = 0; k < ACROSS - 1; k += 1) {
        const a = i * ACROSS + k;
        const c = a + ACROSS;
        indices.push(a, c, a + 1, c, c + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("along", new THREE.Float32BufferAttribute(along, 1));
  geometry.setAttribute("across", new THREE.Float32BufferAttribute(across, 1));
  geometry.setIndex(indices);

  const closed = new Float32Array(STITCHES);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    // Üçgenlerin sarımı aşağı bakıyor: iki yüzlü çizilmezse yukarıdan hiç görünmüyordu.
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    uniforms: { uTime: { value: 0 }, uLevel: { value: 0 }, uOpen: { value: 0 }, uClosed: { value: closed } },
    vertexShader: /* glsl */ `
      attribute float along; attribute float across; varying float vAlong; varying float vAcross;
      void main() { vAlong = along; vAcross = across; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uLevel, uOpen; uniform float uClosed[${STITCHES}];
      varying float vAlong; varying float vAcross;
      void main() {
        float close = 0.0;
        for (int i = 0; i < ${STITCHES}; i++) {
          float c = (float(i) + 0.5) / ${STITCHES}.0;
          close = max(close, uClosed[i] * exp(-pow((vAlong - c) * ${STITCHES}.0 * 1.4, 2.0)));
        }
        // Yara yavaşça açılır: gramofon ucundan merkeze doğru yırtılır.
        float opened = smoothstep(vAlong - 0.05, vAlong + 0.05, uOpen);
        float edge = 1.0 - abs(vAcross);
        float width = mix(1.0, 0.08, close);
        float gash = smoothstep(1.0 - width, 1.0, edge);
        float beat = 0.7 + 0.3 * pow(0.5 + 0.5 * sin(uTime * 6.3), 8.0);
        vec3 inner = vec3(1.0, 0.04, 0.05) * (1.4 + beat);
        vec3 bruise = vec3(0.12, 0.0, 0.01);
        vec3 scar = vec3(1.0, 0.86, 0.72);
        vec3 col = mix(bruise, inner, gash);
        col = mix(col, scar, close * smoothstep(0.85, 1.0, edge));
        float alpha = smoothstep(0.0, 0.45, edge) * uLevel * (0.9 - close * 0.5) * opened;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const wound = new THREE.Mesh(geometry, material);
  wound.renderOrder = 1;
  root.add(wound);
  const sparkle = createEmitter({ ...SPARKLE("#fff2e6", 1), count: 90 });
  root.add(sparkle.points);

  // Peşinden gelen yara: kaçtıkça oyuncunun ayağının dibinde açılan kızıl leke.
  const follower = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 32),
    new THREE.MeshBasicMaterial({ color: "#a00a10", map: softGlow(), transparent: true, depthWrite: false, opacity: 0 }),
  );
  follower.rotation.x = -Math.PI / 2;
  root.add(follower);

  // Bir yolunu bulmak: gramofondan merkeze ışık noktaları.
  const pathLights = Array.from({ length: PATH_LIGHTS }, (_, i) => {
    const sprite = glowSprite("#fff4e6", 0.9);
    const p = curve.getPointAt(i / (PATH_LIGHTS - 1));
    sprite.position.set(p.x + 2.8, ground(p.x + 2.8, p.z) + 0.3, p.z);
    root.add(sprite);
    return sprite;
  });

  // Bin dünya insan: içinden geçen yarı saydam kalabalık.
  const ghosts = createCrowd(GHOSTS, new THREE.MeshBasicMaterial({ color: "#f4f1ea", transparent: true, opacity: 0.22, depthWrite: false }));
  const ghostLane = Array.from({ length: GHOSTS }, (_, i) => ({ offset: (i / GHOSTS) * 60 - 30, lane: (i % 5) - 2, speed: 2 + (i % 4) * 0.4 }));
  root.add(ghosts.mesh);
  // Kraterin her yanından merkeze yürüyen uzak hayaletler: bütün çukur sessiz bir geçit töreni.
  const WANDERERS = 36;
  const wanderers = createCrowd(WANDERERS, new THREE.MeshBasicMaterial({ color: "#e9e4dc", transparent: true, opacity: 0.16, depthWrite: false }));
  const wanderLane = Array.from({ length: WANDERERS }, (_, i) => ({ angle: i * 2.399963 + kit.random() * 0.3, phase: kit.random(), speed: 0.011 + kit.random() * 0.009 }));
  root.add(wanderers.mesh);

  // Sonda atan kalp: arkasında hale, önünde kalp biçimi.
  const heart = glowSprite("#ff3a4a", 8);
  heart.position.set(0, ground(0, 0) + 3, 0);
  const heartShape = new THREE.Shape();
  heartShape.moveTo(0, -0.5);
  heartShape.bezierCurveTo(-0.8, 0.05, -0.55, 0.65, 0, 0.3);
  heartShape.bezierCurveTo(0.55, 0.65, 0.8, 0.05, 0, -0.5);
  const heartMark = new THREE.Mesh(
    new THREE.ShapeGeometry(heartShape, 24),
    new THREE.MeshBasicMaterial({ color: "#ff3a4a", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  );
  heartMark.position.copy(heart.position);
  root.add(heart, heartMark);
  let heartKick = 0;

  // Özlem: kalabalığın tersine yürüyen tek kişi; karşıda bir an durur, sıcak renkli.
  const her = createCrowd(1, new THREE.MeshBasicMaterial({ color: "#ffd2a8", transparent: true, opacity: 0.4, depthWrite: false }));
  root.add(her.mesh);
  const herAnchor = new THREE.Object3D();
  root.add(herAnchor);
  let herLevel = 0;
  let herTarget = 0;

  // Gizli keşifler: tutmayan yara bandı ve toza çizilmiş, gözü yaşlı gülen yüz.
  const bandage = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.5), new THREE.MeshStandardMaterial({ color: "#e9c7a6", roughness: 0.9 }));
  const bp = curve.getPointAt(0.35);
  bandage.position.set(bp.x + 3.4, ground(bp.x + 3.4, bp.z) + 0.05, bp.z);
  bandage.rotation.set(0, 0.7, 0.08);
  root.add(bandage);
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = faceCanvas.height = 256;
  const g = faceCanvas.getContext("2d")!;
  g.strokeStyle = "rgba(220,215,205,0.9)";
  g.lineWidth = 7;
  g.lineCap = "round";
  g.beginPath();
  g.arc(128, 128, 100, 0, Math.PI * 2);
  g.moveTo(90, 100);
  g.arc(90, 100, 3, 0, Math.PI * 2);
  g.moveTo(166, 100);
  g.arc(166, 100, 3, 0, Math.PI * 2);
  g.moveTo(75, 150);
  g.quadraticCurveTo(128, 200, 181, 150);
  g.moveTo(166, 115);
  g.quadraticCurveTo(170, 135, 166, 150);
  g.stroke();
  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  const smile = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true, depthWrite: false }));
  smile.rotation.x = -Math.PI / 2;
  const sx = GRAMOPHONE.x - 6;
  const sz = GRAMOPHONE.z - 9;
  smile.position.set(sx, ground(sx, sz) + 0.04, sz);
  root.add(smile);
  const bandageRest = bandage.position.clone();
  const bandageRot = bandage.rotation.clone();
  let bandageTry = -1;
  const tear = glowSprite("#9fd4ff", 0.16);
  tear.visible = false;
  root.add(tear);
  let tearTime = -1;

  const timers = new Float32Array(STITCHES);
  const everClosed = new Set<number>();
  let clock = 0;
  let open = 0;
  let openTarget = 0;
  let pathLevel = 0;
  let pathTarget = 0;
  let ghostsLevel = 0;
  let ghostsTarget = 0;
  let wanderLevel = 0;
  let wanderTarget = 0;
  let hits: number[] = [];
  let hitFlash = 0;
  let daysFlicker = 0;
  let tears = 0;
  let fleeing = 0;
  let missing = 0;
  let heartLevel = 0;
  let heartTarget = 0;
  let smileShown = false;
  let healed = false;
  // Sonda gökyüzü fenerleri: kalp atmaya başlayınca kraterin ortasından yükselir.
  const lanterns = createLanterns(34);
  root.add(lanterns.group);
  // Özlem dizelerinde yavaşça düşen beyaz taç yaprakları.
  const petals = createPetals(180, "#fff4ee", 0.12, new THREE.Vector3(36, 14, 36), 0.6);
  root.add(petals.mesh);
  const petalCenter = new THREE.Vector3();
  // Dayan: darbeler gelirken E ile kendini toparla; zamanında dayanırsan sarsıntı hafifler.
  let brace = 0;
  let braced = 0;

  const interactables = [
    ...Array.from({ length: STITCHES }, (_, index) =>
      gazeTarget({
        position: (target) => {
          const p = curve.getPointAt((index + 0.5) / STITCHES);
          return target.set(p.x, ground(p.x, p.z) + 0.3, p.z);
        },
        radius: 1.8,
        reach: 8,
        label: () => (open < (index + 0.5) / STITCHES || closed[index] > 0.5 ? null : "Yarayı kapat"),
        use: () => {
          timers[index] = 7;
          everClosed.add(index);
          const p = curve.getPointAt((index + 0.5) / STITCHES);
          sparkle.origin.set(p.x, ground(p.x, p.z) + 0.4, p.z);
          sparkle.burst(clock);
          kit.sfx.cue("chime");
          if (everClosed.size === STITCHES) announce(kit.hud, "Yara kapanmıyor. Ama boşluk artık mükemmel.", 7);
          else if (everClosed.size === 1) announce(kit.hud, "Kapandı… şimdilik.", 3);
        },
      }),
    ),
    secretItem(kit, "hala-yara-bandi", (target) => target.copy(bandage.position), {
      label: "Yara bandını yapıştır",
      radius: 0.8,
      reach: 3,
      available: () => open > 0.3,
      onFound: () => void (bandageTry = 0),
    }),
    secretItem(kit, "hala-gulen-yuz", (target) => target.copy(smile.position), {
      label: "Tozdaki çizime bak",
      radius: 0.7,
      reach: 3,
      available: () => smileShown,
      onFound: () => void (tearTime = 0),
    }),
  ];

  // Yolun üç durağı (çekimler için): başı, ortası, merkeze yakın ucu.
  // Yolu yürüyen: gramofondan merkeze giden ışıklı yolu adım adım yürür; her darbede sendeler, yara açılınca
  // kaçar, özlem gelince geri döner, sonda kraterin ortasındaki kalbin önünde diz çöker.
  const walker = createActor(createFigure({ material: new THREE.MeshStandardMaterial({ color: "#111114", roughness: 0.9 }), height: 1.85 }), ground, { speed: 1.1, runSpeed: 4.5 });
  const start0 = curve.getPointAt(0.02);
  walker.figure.group.position.set(start0.x, ground(start0.x, start0.z), start0.z);
  root.add(walker.figure.group);
  const walkerAt = (dx: number, dy: number, dz: number) => () => walker.figure.group.position.clone().add(new THREE.Vector3(dx, dy, dz));
  let walkerLeg = 0;
  let walkerRest: "still" | "tired" | "kneel" = "still";
  let stagger = 0;
  const pathA = curve.getPointAt(0.15);
  const pathB = curve.getPointAt(0.5);
  const pathC = curve.getPointAt(0.85);
  return {
    root,
    hint: "Darbeler gelirken E ile dayan. Gramofonun önünden merkeze bir yara açılacak; yaraya eğil, kapatmayı dene.",
    interactables,
    action: {
      get label() {
        return brace > 0 ? "" : "Dayan";
      },
      use: () => {
        brace = 1.4;
        kit.sfx.cue("switch");
      },
    },
    // Klip: soğuk gece → şafak ışıkları → ağartılmış hayaletler → kan kırmızı darbe flaşları → yara →
    // sıcak anı (özlem, tek hayalet) → kalp; sonda yara dikiş izine döner.
    shots: [
      // Yolu yürüyen: yolda, darbede sendeleyen, kaçan, geri dönen, kalbin önünde diz çöken.
      { at: L.survive + 3, from: walkerAt(-1.6, 1.5, -2.4), to: walkerAt(-0.9, 1.4, -1.6), look: walkerAt(0, 1.3, 0), lookTo: walkerAt(0, 1, 8), fov: 48, grade: "dawn" },
      { at: L.flee + 2.5, from: walkerAt(0, 1.2, -3.5), to: walkerAt(0, 1.4, -5.5), look: walkerAt(0, 1.2, 0), fov: 56, handheld: 0.08, grade: "blood" },
      { at: L.heart + 1.2, from: walkerAt(-2.2, 0.8, -2.2), to: walkerAt(-1.4, 0.7, -1.4), look: walkerAt(0, 0.8, 0), lookTo: pt(0, 3, 0), fov: 42, grade: "blood" },
      { at: 0, from: ridge(1.3, 46), path: [rim(1.5, 24), pt(GRAMOPHONE.x + 14, 8, GRAMOPHONE.z + 22)], to: cam(GRAMOPHONE.x + 5, 2.5, GRAMOPHONE.z + 8), look: pt(0, 0, 0), lookTo: cam(GRAMOPHONE.x, 1, GRAMOPHONE.z), fov: 50, curve: "linear", grade: "cold", in: "fade" },
      { at: 8, from: cam(GRAMOPHONE.x + 3, 1.2, GRAMOPHONE.z + 3), to: cam(GRAMOPHONE.x + 2.2, 1.1, GRAMOPHONE.z + 2.2), look: cam(GRAMOPHONE.x, 1, GRAMOPHONE.z), fov: 40, grade: "cold" },
      { at: 15, from: cam(pathB.x + 12, 2.5, pathB.z + 12), to: cam(pathB.x + 10, 2.2, pathB.z + 8), look: cam(pathB.x - 10, 4, pathB.z - 20), fov: 48, curve: "linear", grade: "cold" },
      { at: L.survive, from: cam(pathA.x + 2, 1.2, pathA.z + 3), to: cam(pathB.x + 2, 1.4, pathB.z + 3), look: cam(pathC.x, 0, pathC.z), fov: 52, curve: "linear", grade: "dawn" },
      { at: L.alone, orbit: { center: CENTER, radius: 44, height: 16, from: 1.0, to: 1.8 }, look: cam(pathB.x, 0, pathB.z), fov: 48, curve: "linear", grade: "cold" },
      { at: L.thousand, from: me(kit, 0.3, 1.5, 9), to: me(kit, 0.2, 1.5, 7), look: me(kit, 0, 1.5, -10), fov: 50, grade: { ...GRADES.bleach, soft: 0.5 } },
      { at: L.over, from: me(kit, -8, 1.6, 0), to: me(kit, -8, 1.6, -6), look: me(kit, 0, 1.5, -3), fov: 46, curve: "linear", grade: "bleach" },
      { at: L.hit1, from: me(kit, 1.5, 1.5, 2.5), look: me(kit, 0, 1.6, -12), fov: 60, handheld: 0.12, grade: "blood", in: "flash", flashColor: "#ff1a1a" },
      { at: L.hit1 + 1.9, from: me(kit, -1.2, 1.3, 1.8), look: me(kit, 0, 1.8, -12), fov: 56, handheld: 0.15, grade: "blood", in: "flash" },
      { at: L.hit1 + 3.8, from: me(kit, 0, 2.2, 3), look: me(kit, 0, 1.6, -10), fov: 60, handheld: 0.1, grade: "blood", in: "flash", flashColor: "#ff1a1a" },
      { at: L.days, from: rim(3.0, 10), path: arc(0, 0, 60, 8, 3.3, 4.2, 3), to: pt(Math.cos(4.5) * 50, CENTER.y + 8, Math.sin(4.5) * 50), look: pt(0, CENTER.y + 2, 0), fov: 50, curve: "linear", grade: "bleach" },
      { at: L.laugh, from: follow(smile, 0.2, 2.4, 0.7), to: follow(smile, 0.1, 1.7, 0.45), look: follow(smile), fov: 44, grade: { ...GRADES.cold, soft: 0.5 } },
      { at: 66.5, orbit: { center: me(kit), radius: 5, height: 1.4, from: 0, to: 1.4 }, look: me(kit, 0, 0.6, 0), fov: 52, curve: "linear", grade: "cold" },
      { at: L.wound, from: cam(pathA.x - 6, 3.2, pathA.z + 3), to: cam(pathA.x - 4, 2.2, pathA.z - 2), look: cam(pathA.x, 0, pathA.z - 5), lookTo: cam(pathB.x, 0, pathB.z), fov: 52, curve: "linear", grade: "blood" },
      { at: L.open, from: cam(pathB.x, 9, pathB.z + 2), to: cam(pathB.x, 7, pathB.z + 1.5), look: cam(pathB.x, 0, pathB.z), fov: 50, grade: "blood" },
      { at: L.flee, from: me(kit, 0, 1.6, 0), to: me(kit, -10, 1.6, -12), look: me(kit, -30, 1.2, -36), fov: 62, handheld: 0.12, curve: "linear", grade: "blood" },
      { at: L.far, from: me(kit, 0, 12, 6), path: [me(kit, 10, 30, 20)], to: rim(0.8, 30), look: me(kit), fov: 56, curve: "linear", grade: "blood" },
      { at: L.hit4, from: me(kit, -1.5, 1.5, 2.5), look: me(kit, 0, 1.6, -12), fov: 60, handheld: 0.12, grade: "blood", in: "flash", flashColor: "#ff1a1a" },
      { at: L.hit4 + 1.9, from: me(kit, 1.2, 1.3, 1.8), look: me(kit, 0, 1.8, -12), fov: 56, handheld: 0.15, grade: "blood", in: "flash" },
      { at: L.hit4 + 3.8, from: me(kit, 0, 2.2, -3), look: me(kit, 0, 1.6, 10), fov: 60, handheld: 0.1, grade: "blood", in: "flash", flashColor: "#ff1a1a" },
      { at: L.days2, from: cam(0, 30, 70), to: cam(0, 24, 30), look: pt(0, -12, 0), fov: 52, curve: "linear", grade: "bleach" },
      { at: L.laugh2, from: follow(smile, -0.5, 1.6, 0.6), to: follow(smile, -0.3, 1.3, 0.4), look: follow(smile), fov: 40, grade: { ...GRADES.cold, soft: 0.5 } },
      { at: 118, orbit: { center: me(kit), radius: 7, height: 2, from: 1.4, to: 2.4 }, look: me(kit, 0, 0.8, 0), fov: 52, curve: "linear", grade: "cold", out: "fade" },
      { at: L.miss, from: cam(0, 0.8, 8), to: cam(0, 1.4, 12), look: pt(0, 10, 0), lookTo: FIGURE_AT, fov: 58, grade: "memory", in: "fade" },
      { at: 131.5, from: me(kit, 0.7, 1.6, 2.4), to: me(kit, 0.5, 1.6, 1.6), look: follow(herAnchor, 0, 1.3, 0), fov: 40, grade: "memory" },
      { at: 137, from: follow(herAnchor, 2.2, 1.4, 2.2), to: follow(herAnchor, 1.8, 1.4, 1.6), look: follow(herAnchor, 0, 1.2, 0), fov: 38, grade: { ...GRADES.memory, soft: 0.8 } },
      { at: L.miss2, orbit: { center: CENTER, radius: 40, height: 12, from: 0.5, to: 1.6 }, look: cam(pathC.x, 0, pathC.z), fov: 50, curve: "linear", grade: "memory" },
      { at: 150, from: cam(pathA.x + 3, 0.6, pathA.z + 2), to: cam(pathA.x + 3, 0.8, pathA.z - 2), look: cam(pathC.x + 2.8, 0.3, pathC.z), fov: 40, curve: "linear", grade: "memory" },
      { at: 156, from: me(kit, 0.7, 1.6, 2.4), look: follow(herAnchor, 0, 1.3, 0), fov: 44, grade: "memory", out: "fade" },
      { at: L.hit5, from: me(kit, 1.5, 1.5, 2.5), look: me(kit, 0, 1.6, -12), fov: 60, handheld: 0.12, grade: "blood", in: "flash", flashColor: "#ff1a1a" },
      { at: L.hit5 + 1.9, from: me(kit, -1.2, 1.3, 1.8), look: me(kit, 0, 1.8, -12), fov: 56, handheld: 0.15, grade: "blood", in: "flash" },
      { at: L.hit5 + 3.8, from: me(kit, 0, 2.2, 3), look: me(kit, 0, 1.6, -10), fov: 60, handheld: 0.1, grade: "blood", in: "flash", flashColor: "#ff1a1a" },
      { at: L.days3, from: rim(5.4, 8), path: arc(0, 0, 56, 6, 5.7, 6.5, 3), to: pt(Math.cos(6.8) * 48, CENTER.y + 6, Math.sin(6.8) * 48), look: cam(pathB.x, 0.5, pathB.z), fov: 48, curve: "linear", grade: "bleach" },
      { at: L.laugh3, from: follow(smile, 0.2, 2.4, 0.7), to: follow(smile, 0.1, 1.7, 0.45), look: follow(smile), fov: 44, grade: { ...GRADES.cold, soft: 0.5 } },
      { at: 182, orbit: { center: me(kit), radius: 9, height: 2.5, from: 2.4, to: 3.4 }, look: me(kit, 0, 1, 0), fov: 52, curve: "linear", grade: "cold" },
      { at: L.miss3, orbit: { center: me(kit), radius: 12, height: 3, from: 2, to: 3.2 }, look: me(kit, 0, 1, 0), fov: 52, curve: "linear", grade: "memory" },
      { at: 196, from: cam(0, 0.8, 10), to: cam(0, 1, 14), look: FIGURE_AT, fov: 50, grade: "memory" },
      { at: L.miss4, from: me(kit, -0.7, 1.6, 2.4), to: me(kit, -0.5, 1.6, 1.6), look: follow(herAnchor, 0, 1.3, 0), fov: 40, grade: "memory" },
      { at: 212, from: cam(pathA.x + 3, 0.6, pathA.z + 2), to: cam(pathA.x + 3, 0.8, pathA.z - 2), look: cam(pathC.x + 2.8, 0.3, pathC.z), fov: 40, curve: "linear", grade: "memory" },
      { at: L.miss5, from: rim(2.3, 30), path: [pt(Math.cos(2.0) * 50, CENTER.y + 26, Math.sin(2.0) * 50)], to: cam(0, 16, 10), look: cam(pathC.x, 0, pathC.z), lookTo: cam(0, 0, 0), fov: 50, curve: "linear", grade: "memory" },
      { at: L.miss6, from: cam(GRAMOPHONE.x + 3, 1.2, GRAMOPHONE.z + 3), to: cam(GRAMOPHONE.x + 2, 1.1, GRAMOPHONE.z + 2), look: cam(GRAMOPHONE.x, 1, GRAMOPHONE.z), fov: 40, grade: { ...GRADES.memory, soft: 0.6 } },
      { at: 234, orbit: { center: CENTER, radius: 52, height: 18, from: 1.8, to: 2.8 }, look: cam(pathC.x, 0, pathC.z), fov: 50, curve: "linear", grade: "cold", out: "fade" },
      { at: L.quiet, from: cam(0, 1.2, 12), to: cam(0, 1.6, 8), look: pt(0, -10, 0), fov: 50, grade: "cold", in: "fade" },
      { at: 257, from: cam(8, 2, 16), to: cam(4, 2.4, 14), look: FIGURE_AT, fov: 44, curve: "linear", grade: "cold" },
      { at: L.heart, from: cam(0, 3, 14), to: cam(0, 3, 11), look: cam(0, 3, 0), fov: 44, grade: "blood", in: "flash", flashColor: "#ff1a1a" },
      { at: L.heartB, from: cam(3, 3.2, 8), to: cam(2, 3.1, 6.5), look: cam(0, 3, 0), fov: 40, grade: "blood", in: "flash", flashColor: "#ff1a1a" },
      { at: L.live, from: cam(pathB.x, 9, pathB.z + 2), to: cam(pathB.x, 12, pathB.z + 3), look: cam(pathB.x, 0, pathB.z), fov: 50, grade: "dawn" },
      { at: L.you, from: cam(0, 4, 10), path: [pt(16, CENTER.y + 30, 40)], to: ridge(0.7, 56), look: pt(0, 3, 0), lookTo: pt(0, -10, 0), fov: 52, curve: "linear", grade: "dawn", out: "fade" },
    ],
    beats: [
      { at: L.survive, id: "survive", line: "Gramofondan merkeze küçük ışıklar birer birer yanıyor; biri o yolu adım adım yürümeye başlıyor." },
      { at: L.thousand, id: "thousand", line: "Hayalet bir kalabalık kameranın içinden geçip gidiyor." },
      { at: L.hit1, id: "hit1", line: "Bir darbe; ardından bir tane daha." },
      { at: L.hit1 + 1.9, id: "hit2" },
      { at: L.hit1 + 3.8, id: "hit3" },
      { at: L.days, id: "days", line: "Gece ve gündüz hızla birbirini kovalıyor." },
      { at: L.laugh, id: "laugh", line: "Tozun üstüne çizilmiş gülen bir yüz; bir gözünden yaş süzülüyor." },
      { at: L.wound, id: "wound", line: "Yerde kızıl bir yarık açılıyor; gramofondan merkeze doğru yırtılıyor." },
      { at: L.flee, id: "flee", line: "Nereye gidersen git, ayağının dibinde kızıl bir leke açılıyor." },
      { at: L.hit4, id: "hit4" },
      { at: L.hit4 + 1.9, id: "hit4b" },
      { at: L.hit4 + 3.8, id: "hit4c" },
      { at: L.laugh2, id: "laugh" },
      { at: L.miss, id: "miss", line: "Havadaki figür yavaşça aşağı iniyor. Karşıda, sıcak renkli tek bir gölge duruyor." },
      { at: 158, id: "her-gone" },
      { at: L.hit5, id: "hit5" },
      { at: L.hit5 + 1.9, id: "hit5b" },
      { at: L.hit5 + 3.8, id: "hit5c" },
      { at: L.laugh3, id: "laugh" },
      { at: L.miss3, id: "miss2", line: "Yara yeniden sızlıyor." },
      { at: L.miss4, id: "her" },
      { at: 216, id: "her-gone" },
      { at: L.quiet, id: "quiet" },
      { at: L.heart, id: "heart", line: "Kraterin ortasında bir kalp atıyor." },
      { at: L.heartB, id: "kick" },
      { at: L.live, id: "live", line: "Yara kapanıyor; geriye ince bir dikiş izi kalıyor." },
      { at: L.you, id: "kick" },
    ],
    onBeat(id) {
      if (id === "survive") {
        pathTarget = 1;
        walkerLeg = 1;
      }
      if (id.startsWith("hit")) stagger = 1.8;
      if (id === "flee") walker.goTo(Math.cos(0.9) * 56, Math.sin(0.9) * 56, true);
      if (id === "miss") {
        walkerLeg = 1;
        walkerRest = "still";
      }
      if (id === "heart") {
        walker.goTo(0, 3.2, false, Math.PI);
        walkerRest = "kneel";
        walkerLeg = 0;
      }
      if (id === "thousand") ghostsTarget = 1;
      // Uzak hayaletler: kalabalık, günler ve özlem perdelerinde kraterin her yanından yürür.
      if (id === "thousand" || id.startsWith("days") || id === "miss" || id === "her") wanderTarget = 1;
      if (id === "flee" || id === "quiet" || id === "heart") wanderTarget = 0;
      if (id.startsWith("hit")) {
        // Zamanında dayanan daha az sarsılır; darbe yine de iz bırakır.
        const ready = brace > 0;
        hitFlash = ready ? 0.35 : 1;
        kit.effects.shake = ready ? 0.07 : 0.28;
        kit.sfx.cue("pulse");
        hits = [...hits, clock];
        if (ready) {
          braced += 1;
          if (braced === 1) announce(kit.hud, "Dayandı.", 2);
          if (braced === 3) announce(kit.hud, "Darbeler geçmiyor; ama o hâlâ ayakta.", 4);
        }
      }
      if (id === "days") {
        daysFlicker = 1;
        ghostsTarget = 0;
      }
      if (id === "laugh") {
        tears = 1;
        smileShown = true;
        tearTime = 0;
      }
      if (id === "miss" || id === "her") {
        herTarget = 1;
        const p = kit.player.position;
        herAnchor.position.set(p.x - 1, ground(p.x - 1, p.z - 7), p.z - 7);
        her.place(0, herAnchor.position.x, herAnchor.position.z, 0, 1);
      }
      if (id === "her-gone") herTarget = 0;
      if (id === "kick" || id === "heart" || id === "live") heartKick = 1;
      if (id === "live") healed = true;
      if (id === "wound") openTarget = 1;
      if (id === "flee") fleeing = 1;
      if (id === "miss" || id === "miss2") missing = 1;
      if (id === "quiet") {
        fleeing = 0;
        missing = 0.5;
      }
      if (id === "heart") {
        heartTarget = 1;
        lanterns.release(new THREE.Vector3(0, ground(0, 0), 0));
      }
    },
    reset() {
      walkerLeg = 0;
      stagger = 0;
      walkerRest = "still";
      walker.rest("still");
      walker.figure.group.position.set(start0.x, ground(start0.x, start0.z), start0.z);
      closed.fill(0);
      timers.fill(0);
      everClosed.clear();
      open = openTarget = pathLevel = pathTarget = ghostsLevel = ghostsTarget = wanderLevel = wanderTarget = hitFlash = daysFlicker = tears = fleeing = missing = heartLevel = heartTarget = 0;
      hits = [];
      smileShown = false;
      healed = false;
      brace = braced = 0;
      herLevel = herTarget = heartKick = 0;
    },
    update(dt, time, level) {
      clock = time;
      // Yol boyunca adım adım (bir sonraki durağa varınca yenisi).
      if (walkerLeg > 0 && walker.arrived) {
        const u = Math.min(0.98, 0.05 + walkerLeg * 0.11);
        const p = curve.getPointAt(u);
        walker.goTo(p.x, p.z);
        walkerLeg = u < 0.98 ? walkerLeg + 1 : 0;
      }
      stagger = Math.max(0, stagger - dt);
      if (walker.arrived) walker.rest(stagger > 0 ? "tired" : walkerRest);
      else if (stagger > 0) walker.figure.pose = "tired";
      walker.update(dt, time);
      walker.figure.group.visible = level > 0.05;
      brace = Math.max(0, brace - dt);
      material.uniforms.uTime.value = time;
      material.uniforms.uLevel.value = level;
      open += (openTarget - open) * Math.min(1, dt * 0.25);
      material.uniforms.uOpen.value = open;
      for (let i = 0; i < STITCHES; i += 1) {
        timers[i] = Math.max(0, timers[i] - dt);
        const target = timers[i] > 0 || healed ? 1 : 0;
        closed[i] += (target - closed[i]) * Math.min(1, dt * (target ? 2.5 : 0.35));
      }
      sparkle.update(time);

      pathLevel += (pathTarget * level - pathLevel) * Math.min(1, dt * 0.8);
      pathLights.forEach((sprite, i) => {
        const on = THREE.MathUtils.clamp(pathLevel * PATH_LIGHTS - i, 0, 1);
        (sprite.material as THREE.SpriteMaterial).opacity = on * (0.7 + 0.3 * Math.sin(time * 2 + i));
        sprite.visible = on > 0.01;
      });

      ghostsLevel += (ghostsTarget * level - ghostsLevel) * Math.min(1, dt * 0.8);
      const px = kit.player.position.x;
      const pz = kit.player.position.z;
      ghostLane.forEach((g2, i) => {
        const x = px + g2.lane * 1.4;
        const z = pz + ((g2.offset + time * g2.speed) % 60) - 30;
        ghosts.place(i, x, z, Math.PI, 1);
        ghosts.presence[i] = ghostsLevel;
      });
      ghosts.update(time);
      ghosts.mesh.visible = ghostsLevel > 0.01;
      wanderLevel += (Math.max(wanderTarget, missing * 0.7) * level - wanderLevel) * Math.min(1, dt * 0.6);
      wanderLane.forEach((w, i) => {
        const t = (w.phase + time * w.speed) % 1;
        const r = 74 - t * 64;
        wanderers.place(i, Math.cos(w.angle) * r, Math.sin(w.angle) * r, Math.atan2(Math.cos(w.angle), Math.sin(w.angle)), 1);
        wanderers.presence[i] = wanderLevel * Math.min(1, t * 6) * Math.min(1, (1 - t) * 6);
      });
      wanderers.update(time);
      wanderers.mesh.visible = wanderLevel > 0.01;

      // Vuruşlar kızıl bir çakma; günler hızla gece-gündüz titreşir; gözyaşı.
      hitFlash = Math.max(0, hitFlash - dt * 2);
      daysFlicker = Math.max(0, daysFlicker - dt / 6);
      tears = Math.max(0, tears - dt / 8);
      // Günler hızla geçer: gece-gündüz yumuşak bir salınım (sert kare dalga göz yoruyordu).
      const dayNight = daysFlicker > 0 ? (0.16 + 0.22 * Math.sin(time * 5.5)) * daysFlicker : 0;
      kit.effects.dim = hitFlash * 0.3 + dayNight;
      kit.effects.saturation = 1 + hitFlash * 0.8 - tears * 0.4;
      kit.effects.figureLift = -missing * 7;
      missing = Math.max(0, missing - dt / 40);

      // Kaçtıkça peşinden gelen yara.
      fleeing = Math.max(0, fleeing - dt / 40);
      const followerMaterial = follower.material as THREE.MeshBasicMaterial;
      followerMaterial.opacity += ((fleeing > 0 ? 0.75 : 0) * level - followerMaterial.opacity) * Math.min(1, dt * 2);
      follower.position.x += (px - follower.position.x) * Math.min(1, dt * 1.2);
      follower.position.z += (pz - follower.position.z) * Math.min(1, dt * 1.2);
      follower.position.y = ground(follower.position.x, follower.position.z) + 0.05;
      follower.visible = followerMaterial.opacity > 0.01;

      heartLevel += (heartTarget * level - heartLevel) * Math.min(1, dt * 0.6);
      heartKick = Math.max(0, heartKick - dt * 2.2);
      const beatPulse = Math.pow(0.5 + 0.5 * Math.sin(time * 5.2), 6) * 0.15 + heartKick * 0.35;
      heart.scale.setScalar(8 * (0.85 + beatPulse));
      (heart.material as THREE.SpriteMaterial).opacity = heartLevel * 0.6;
      heart.visible = heartLevel > 0.01;
      heartMark.lookAt(kit.camera.position);
      heartMark.scale.setScalar(heartLevel * 3 * (1 + beatPulse));
      (heartMark.material as THREE.MeshBasicMaterial).opacity = heartLevel;
      heartMark.visible = heartLevel > 0.01;
      // Karşıdaki sıcak gölge: belirir, durur, söner.
      herLevel += (herTarget * level - herLevel) * Math.min(1, dt * (herTarget ? 0.5 : 0.8));
      her.presence[0] = herLevel;
      her.update(time);
      lanterns.update(dt, time, level);
      petals.level = Math.max(missing, herLevel) * level;
      petalCenter.copy(kit.player.position).setY(kit.player.position.y - 1);
      petals.update(time, petalCenter);
      her.mesh.visible = herLevel > 0.01;
      bandage.visible = level > 0.3;
      smile.visible = smileShown && level > 0.3;
      // Yara bandı: yaranın ortasına uçar, yapışır; birkaç saniye sonra kenarı kalkar ve kayıp düşer.
      if (bandageTry >= 0) {
        bandageTry += dt;
        const mid = curve.getPointAt(0.5);
        const on = new THREE.Vector3(mid.x, ground(mid.x, mid.z) + 0.12, mid.z);
        if (bandageTry < 1) bandage.position.lerpVectors(bandageRest, on, bandageTry).setY(bandage.position.y + Math.sin(bandageTry * Math.PI) * 1.2);
        else if (bandageTry < 4) bandage.position.copy(on);
        else bandage.position.lerpVectors(on, bandageRest, Math.min(1, bandageTry - 4));
        bandage.rotation.set(bandageRot.x + (bandageTry > 3.2 && bandageTry < 5 ? Math.sin((bandageTry - 3.2) * 4) * 0.4 : 0), bandageRot.y, bandageRot.z);
        if (bandageTry > 3.3 && bandageTry - dt <= 3.3) kit.sfx.cue("deny");
        if (bandageTry > 5) {
          bandageTry = -1;
          bandage.position.copy(bandageRest);
          bandage.rotation.copy(bandageRot);
        }
      }
      // Gözyaşı: çizimin sağ gözünden süzülür (iki kez).
      if (tearTime >= 0) {
        tearTime += dt;
        const k = (tearTime % 1.6) / 1.6;
        const v = 115 + k * 45;
        tear.position.set(smile.position.x + (166 / 256 - 0.5) * 1.4, smile.position.y + 0.03, smile.position.z + (v / 256 - 0.5) * 1.4);
        tear.visible = smile.visible;
        if (tearTime > 3.2) {
          tearTime = -1;
          tear.visible = false;
        }
      }
    },
  };
}
