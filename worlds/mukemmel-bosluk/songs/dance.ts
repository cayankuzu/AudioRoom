import * as THREE from "three";
import { createEmitter, SPARKLE } from "../../../engine/fx/emitter";
import type { SongScene } from "../../../engine/game/songStage";
import { createCrowd } from "./crowd";
import { GRADES } from "../../../engine/game/director";
import { arc, cam, CENTER, follow, gazeTarget, glowSprite, ground, me, pt, ridge, rim, STAGE, type SceneKit } from "./kit";
import { createMotes, createPetals } from "../../../engine/fx/sceneProps";
import { createFigure } from "../../../engine/fx/figure";

/**
 * Boşlukta Dans — önce her şey su altındaymış gibi: yerde ışık ağları (kostik), yükselen
 * kabarcıklar. Sonra havada bir beşik dönencesi belirir: ay, yıldız, bulut ve ucunda boş bir
 * isim kartı ("Adı: ……" — adı hiç yazılmamış). Kelebekler, ışıktan kalpler; görünmez bir
 * akıntı merkeze çeker; uzakta gölge askerler düşer. Sokak lambaları dizilir ve neon bir dansa
 * döner. Sonda su geri gelir, dönence yalnız döner. Oyuncu hareket ettikçe havada ışıktan
 * bir kurdele bırakır; E ile kendi etrafında döner.
 */
const TRAIL = 120;
const PARTNERS = 6;
const BUTTERFLIES = 7;
const SOLDIERS = 16;
const LAMPS = 12;
/** Dizelerin saniyeleri. */
const L = {
  void: 16.34, nameless: 46.78, butterfly: 54.75, loved: 63.13, dragged: 80.03, wars: 96.08, homeless: 112.05,
  live: 120.05, street: 127.97, live2: 136.02, street2: 143.91, live3: 152.01, outro: 162.89, breath: 192.24, end: 214.86,
} as const;

/** Boş isim kartı: "Adı:" ve yazılmamış noktalı bir satır. */
function nameCard(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#f6efe2";
  g.fillRect(0, 0, 256, 160);
  g.strokeStyle = "#c9b8a0";
  g.lineWidth = 4;
  g.strokeRect(10, 10, 236, 140);
  g.fillStyle = "#6a5a48";
  g.font = "italic 30px Georgia, serif";
  g.fillText("Adı:", 26, 88);
  g.setLineDash([4, 8]);
  g.beginPath();
  g.moveTo(90, 92);
  g.lineTo(226, 92);
  g.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createDanceScene(kit: SceneKit): SongScene {
  const root = new THREE.Group();

  // Kurdele: son konumlardan üretilen, uca doğru incelip sönen şerit.
  const positions = new Float32Array(TRAIL * 2 * 3);
  const alphas = new Float32Array(TRAIL * 2);
  const indices: number[] = [];
  for (let i = 0; i < TRAIL - 1; i += 1) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("alpha", new THREE.BufferAttribute(alphas, 1));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: { uLevel: { value: 0 } },
    vertexShader: /* glsl */ `
      attribute float alpha; varying float vAlpha;
      void main() { vAlpha = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform float uLevel; varying float vAlpha;
      void main() {
        vec3 col = mix(vec3(1.0, 0.35, 0.42), vec3(1.0, 0.96, 0.9), vAlpha);
        gl_FragColor = vec4(col, vAlpha * vAlpha * 0.8 * uLevel);
      }
    `,
  });
  const ribbon = new THREE.Mesh(geometry, material);
  ribbon.frustumCulled = false;
  root.add(ribbon);
  const history: THREE.Vector3[] = Array.from({ length: TRAIL }, () => new THREE.Vector3());

  const partners = Array.from({ length: PARTNERS }, (_, i) => {
    const sprite = glowSprite(i % 2 ? "#ff9fb0" : "#ffe2bf", 0.9);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: "#ffffff" }));
    root.add(sprite, core);
    return { sprite, core, phase: (i / PARTNERS) * Math.PI * 2, height: 0.4 + (i % 3) * 0.6 };
  });
  const burst = createEmitter({ ...SPARKLE("#ffc2cc", 1.6), count: 140 });
  root.add(burst.points);

  // Kelebekler: renkli, ince kanatlı, çırpınan.
  const wing = new THREE.PlaneGeometry(0.22, 0.28);
  wing.translate(0.11, 0, 0);
  const butterflies = Array.from({ length: BUTTERFLIES }, (_, i) => {
    const group = new THREE.Group();
    const color = new THREE.Color().setHSL((i * 0.14) % 1, 0.85, 0.6);
    const wingMaterial = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const left = new THREE.Mesh(wing, wingMaterial);
    const right = new THREE.Mesh(wing, wingMaterial);
    right.rotation.y = Math.PI;
    group.add(left, right);
    root.add(group);
    return { group, left, right, phase: i * 1.7, caught: false };
  });

  // Işıktan kalpler: yükselip söner.
  const hearts = Array.from({ length: 14 }, (_, i) => {
    const sprite = glowSprite(i % 2 ? "#ff5f7a" : "#ffd0da", 1.4);
    root.add(sprite);
    return { sprite, offset: new THREE.Vector3((Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 16), speed: 0.8 + Math.random() * 0.8 };
  });

  // Kalpsiz savaşlar: yere yığılan gölge askerler.
  const soldiers = createCrowd(SOLDIERS, new THREE.MeshStandardMaterial({ color: "#1a1a1c", roughness: 1 }));
  for (let i = 0; i < SOLDIERS; i += 1) {
    const a = (i / SOLDIERS) * Math.PI * 2;
    soldiers.place(i, STAGE.x + Math.cos(a) * 16, STAGE.z + Math.sin(a) * 12, a + Math.PI, 1.1);
  }
  root.add(soldiers.mesh);
  soldiers.solidify(kit.colliders);

  // Sokaklar evi: krateri boydan boya kesen bir sokak lambası dizisi.
  const lamps = Array.from({ length: LAMPS }, (_, i) => {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 4, 8), new THREE.MeshStandardMaterial({ color: "#1a1a1a", metalness: 0.6 }));
    pole.position.y = 2;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: "#ffe2a8" }));
    head.position.y = 4.1;
    const halo = glowSprite("#ffd48a", 3.5);
    halo.position.y = 4.1;
    group.add(pole, head, halo);
    const t = i / (LAMPS - 1);
    const x = -40 + t * 80;
    const z = STAGE.z + 8 + Math.sin(t * 5) * 3;
    group.position.set(x, ground(x, z), z);
    root.add(group);
    kit.colliders.solid(pole, { shape: "round", pad: 0.05 });
    return { group, halo };
  });

  // Su altı: yerde dalgalanan ışık ağları ve yükselen kabarcıklar.
  const caustics = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60, 48, 48).rotateX(-Math.PI / 2),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uLevel: { value: 0 } },
      vertexShader: "varying vec2 vXZ; void main() { vXZ = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: /* glsl */ `
        uniform float uTime, uLevel; varying vec2 vXZ;
        void main() {
          vec2 p = mod(vXZ * 0.22, 6.2831) - 250.0;
          vec2 i = p;
          float c = 1.0;
          for (int n = 0; n < 4; n++) {
            float t = uTime * 0.35 * (1.0 - (3.5 / float(n + 1)));
            i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
            c += 1.0 / length(vec2(p.x / (sin(i.x + t) / 0.005), p.y / (cos(i.y + t) / 0.005)));
          }
          c /= 4.0;
          c = 1.17 - pow(c, 1.4);
          float light = pow(abs(c), 8.0);
          float fade = smoothstep(30.0, 12.0, length(vXZ));
          gl_FragColor = vec4(vec3(0.35, 0.75, 1.0) * min(light, 1.5) * fade * uLevel * 0.8, 1.0);
        }
      `,
    }),
  );
  caustics.frustumCulled = false;
  root.add(caustics);
  const bubbles = createEmitter({
    count: 160,
    colors: ["#d8f2ff", "#8fcfff"],
    size: 0.14,
    life: 6,
    spread: new THREE.Vector3(14, 1, 14),
    velocity: new THREE.Vector3(0, 1.1, 0),
    jitter: 0.25,
  });
  root.add(bubbles.points);

  // Beşik dönencesi: ay, yıldız, bulut ve boş bir isim kartı.
  const mobile = new THREE.Group();
  const pastel = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, emissive: color, emissiveIntensity: 0.35, side: THREE.DoubleSide });
  const thread = new THREE.MeshBasicMaterial({ color: "#e8e2d6", transparent: true, opacity: 0.5 });
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 8, 4), thread);
  cord.position.y = 4;
  const arms = new THREE.Group();
  for (const r of [0, Math.PI / 2]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 6), pastel("#c9a57a"));
    arm.rotation.set(0, r, Math.PI / 2);
    arms.add(arm);
  }
  mobile.add(cord, arms);
  const moonShape = new THREE.Shape();
  moonShape.absarc(0, 0, 0.14, Math.PI * 0.5, Math.PI * 1.5, false);
  moonShape.absarc(0.05, 0, 0.11, Math.PI * 1.5, Math.PI * 0.5, true);
  const starShape = new THREE.Shape();
  for (let k = 0; k < 10; k += 1) {
    const r = k % 2 ? 0.06 : 0.14;
    const a = (k / 10) * Math.PI * 2 + Math.PI / 2;
    if (k === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const cloud = new THREE.Group();
  [[-0.08, 0, 0.08], [0.02, 0.04, 0.1], [0.11, 0, 0.07]].forEach(([x, y, r]) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), pastel("#dfe9f4"));
    puff.position.set(x, y, 0);
    puff.scale.z = 0.6;
    cloud.add(puff);
  });
  const card = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.19), new THREE.MeshStandardMaterial({ map: nameCard(), emissive: "#ffffff", emissiveMap: nameCard(), emissiveIntensity: 0.35, side: THREE.DoubleSide }));
  const hangers = [
    new THREE.Mesh(new THREE.ShapeGeometry(moonShape, 16), pastel("#f4e3a8")),
    new THREE.Mesh(new THREE.ShapeGeometry(starShape), pastel("#f5c9d4")),
    cloud,
    card,
  ];
  hangers.forEach((item, k) => {
    const a = (k / 4) * Math.PI * 2;
    const drop = 0.35 + (k % 2) * 0.18;
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, drop, 4), thread);
    string.position.set(Math.cos(a) * 0.55, -drop / 2, Math.sin(a) * 0.55);
    item.position.set(Math.cos(a) * 0.55, -drop - 0.12, Math.sin(a) * 0.55);
    mobile.add(string, item);
  });
  const mobileGlow = glowSprite("#ffe6c8", 2.4);
  mobileGlow.position.y = -0.5;
  mobile.add(mobileGlow);
  root.add(mobile);
  let water = 0;
  let waterTarget = 0;
  let cradle = 0;
  let cradleTarget = 0;
  // Neon dansta yağan renkli konfeti; nefessizlikte ağır ağır yükselen ışık zerreleri.
  const confetti = createPetals(260, "#ff5fa8", 0.1, new THREE.Vector3(30, 14, 30), 1.1);
  root.add(confetti.mesh);
  const confettiColors = confetti.mesh.material as THREE.MeshStandardMaterial;

  // Kraterin ortasında neon pist: iki halka, on iki neon direk, tepelerinde haleler.
  // Sokak lambaları yanınca pist de yanar; vuruşla nabız gibi atar.
  const NEON_POLES = 12;
  const neonPink = new THREE.MeshBasicMaterial({ color: "#ff4fd8", transparent: true, opacity: 0 });
  const neonCyan = new THREE.MeshBasicMaterial({ color: "#4fe8ff", transparent: true, opacity: 0 });
  const neon = new THREE.Group();
  neon.position.copy(CENTER);
  const neonPinkSoft = new THREE.MeshBasicMaterial({ color: "#ff4fd8", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const neonCyanSoft = new THREE.MeshBasicMaterial({ color: "#4fe8ff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const ringA = new THREE.Mesh(new THREE.TorusGeometry(11, 0.3, 10, 96), neonPink);
  const ringB = new THREE.Mesh(new THREE.TorusGeometry(12.4, 0.22, 10, 96), neonCyan);
  const ringAGlow = new THREE.Mesh(new THREE.TorusGeometry(11, 1.1, 10, 96), neonPinkSoft);
  const ringBGlow = new THREE.Mesh(new THREE.TorusGeometry(12.4, 0.9, 10, 96), neonCyanSoft);
  ringA.rotation.x = ringB.rotation.x = ringAGlow.rotation.x = ringBGlow.rotation.x = -Math.PI / 2;
  // Krater tabanı merkezden dışa doğru yükselir: halkalar en yüksek zemin noktasının üstünde durur.
  const ringLift = Math.max(...Array.from({ length: 12 }, (_, k) => ground(Math.cos(k / 12 * Math.PI * 2) * 12.4, Math.sin(k / 12 * Math.PI * 2) * 12.4))) - CENTER.y;
  ringA.position.y = ringAGlow.position.y = ringLift + 0.5;
  ringB.position.y = ringBGlow.position.y = ringLift + 0.8;
  neon.add(ringA, ringB, ringAGlow, ringBGlow);
  const neonPoles = Array.from({ length: NEON_POLES }, (_, i) => {
    const a = (i / NEON_POLES) * Math.PI * 2;
    const x = Math.cos(a) * 13.8;
    const z = Math.sin(a) * 13.8;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.6, 8), i % 2 ? neonPink : neonCyan);
    const floor = ground(x, z) - CENTER.y;
    tube.position.set(x, floor + 2.3, z);
    const halo = glowSprite(i % 2 ? "#ff4fd8" : "#4fe8ff", 4);
    halo.position.set(x, floor + 4.7, z);
    neon.add(tube, halo);
    // Çarpışma yalnızca direk görünürken (şarkı çalarken) etkin: öbür şarkılarda görünmez duvar olmasın.
    kit.colliders.addCircle(CENTER.x + x, CENTER.z + z, 0.25, tube);
    return { tube, halo };
  });
  root.add(neon);
  let neonLevel = 0;

  // Boşluktaki adam: kraterin tam ortasında, şarkı boyunca kıpırdamadan durur — suyun altında, kelebekler
  // arasında, askerler düşerken bile. Müzik hızlanınca önce parmakları, sonra bütün bedeni dansa katılır;
  // sonda ışıklar sönünce yine taş kesilir. Boşlukta sessiz kalan, boşlukta dans eden aynı adam.
  const dancer = createFigure({ material: new THREE.MeshStandardMaterial({ color: "#101012", roughness: 0.85 }), height: 1.9 });
  dancer.group.position.set(CENTER.x, ground(CENTER.x, CENTER.z - 2.5), CENTER.z - 2.5);
  dancer.pose = "still";
  dancer.energy = 0;
  root.add(dancer.group);
  kit.colliders.addCircle(dancer.group.position.x, dancer.group.position.z, 0.45, dancer.group);
  /** Dansın canlılığı (0 taş gibi, 1 çılgın); hedefe yavaşça yaklaşır. */
  let dancerTarget = 0;
  let dancerEnergy = 0;
  /** Adama bağlı çekim noktaları (kalça hizası + ofset, dönüşten bağımsız). */
  const him = (dx: number, dy: number, dz: number) => () => new THREE.Vector3(dancer.group.position.x + dx, dancer.group.position.y + dy, dancer.group.position.z + dz);
  const haloWorld = new THREE.Vector3();
  const breathMotes = createMotes(140, "#bfe6ff", 0.25, new THREE.Vector3(26, 10, 26), 1.2);
  root.add(breathMotes.points);
  const partyCenter = new THREE.Vector3();

  let sample = 0;
  let spread = 0;
  let spin = 0;
  let spins = 0;
  let wasGrounded = true;
  let clock = 0;
  let fog = 0;
  let fogTarget = 0;
  let flutter = 0;
  let flutterTarget = 0;
  let love = 0;
  let loveTarget = 0;
  let drag = 0;
  let war = -1;
  let street = 0;
  let streetTarget = 0;
  let danceBeat = 0;
  let danceTarget = 0;
  const hand = new THREE.Vector3();
  const side = new THREE.Vector3();
  const pull = new THREE.Vector3();

  return {
    root,
    hint: "Yerçekimi yok gibi. Zıpla, koş, çevrende dön — boşlukta dans et. E ile bir dönüş yap.",
    interactables: butterflies.map((butterfly) =>
      gazeTarget({
        position: (target) => butterfly.group.getWorldPosition(target),
        radius: 0.4,
        reach: 3,
        label: () => (flutter > 0.5 && !butterfly.caught && !kit.secrets.has("dans-kelebek") ? "Kelebeği avuçla" : null),
        use: () => {
          butterfly.caught = true;
          kit.secrets.reveal("dans-kelebek");
        },
      }),
    ),
    action: {
      label: "Dön",
      use: () => {
        spin = 1;
        spread = 1;
        spins += 1;
        burst.origin.copy(kit.player.position).y += 1;
        burst.burst(clock);
        kit.sfx.cue("whoosh");
        if (spins === 5) kit.secrets.reveal("dans-donus");
      },
    },
    // Klip: su altı mavisi (kostik, kabarcık) → yumuşak odaklı dönence ve boş isim kartı → pastel kelebekler
    // → sıcak kalpler → noir askerler → gece lambaları → neon dans → yeniden su altı.
    shots: [
      // Perde 1 — Sessizlik: kraterin ortasında kıpırdamayan bir adam; su onu yutuyor, o durmuyor bile.
      { at: 0, from: ridge(1.6, 44), path: [rim(1.3, 24), him(10, 10, 18)], to: him(0, 2.6, 7), look: pt(0, 0, 0), lookTo: him(0, 1.5, 0), fov: 55, curve: "linear", grade: "deep", in: "fade" },
      { at: 8, from: him(-1.6, 1.55, 2.2), to: him(-0.8, 1.5, 1.6), look: him(0, 1.6, 0), fov: 34, curve: "linear", grade: { ...GRADES.deep, exposure: 1.5 } },
      { at: L.void, from: him(3, 0.4, 3), to: him(2, 0.3, 2.2), look: him(0, 1.5, 0), fov: 50, grade: "deep" },
      { at: 22, from: him(0.9, 0.9, 0.9), to: him(0.6, 1.0, 0.7), look: him(0.25, 0.75, 0), fov: 36, grade: "deep" },
      { at: 28, orbit: { center: him(0, 0, 0), radius: 4.5, height: 1.6, from: 0, to: 1.8 }, look: him(0, 1.4, 0), fov: 56, curve: "linear", grade: "deep" },
      { at: 34, orbit: { center: CENTER, radius: 30, height: 8, from: 0.5, to: 1.4 }, look: him(0, 1, 0), fov: 52, curve: "linear", grade: "deep" },
      { at: 40, from: him(1.5, 1.4, 2.5), to: him(-1.5, 1.8, 2.5), look: him(0, 1.7, 0), fov: 60, curve: "linear", grade: "deep" },
      { at: L.nameless, orbit: { center: follow(mobile, 0, -0.8, 0), radius: 2.8, height: 0.1, from: 0, to: 0.9 }, look: follow(mobile, 0, -0.8, 0), fov: 44, curve: "linear", grade: "memory" },
      { at: 50.8, from: follow(card, 1.1, 0.15, 1.1), to: follow(card, 0.8, 0.1, 0.8), look: follow(card), fov: 34, grade: { ...GRADES.memory, soft: 0.8 } },
      { at: L.butterfly, from: me(kit, 1.5, 1.4, 2.5), to: me(kit, -1.5, 1.8, 2.5), look: me(kit, 0, 1.9, 0), fov: 60, curve: "linear", grade: "pastel" },
      { at: 58.9, orbit: { center: me(kit), radius: 4, height: 1.6, from: 1, to: 2.2 }, look: me(kit, 0, 1.6, 0), fov: 56, curve: "linear", grade: "pastel" },
      { at: L.loved, from: him(0, 1, 8), to: him(0, 1.4, 6), look: him(0, 1.6, 0), lookTo: him(0, 5, 0), fov: 60, grade: "candle" },
      { at: 69, orbit: { center: him(0, 0, 0), radius: 8, height: 2, from: 2, to: 3.2 }, look: him(0, 1.6, 0), fov: 56, curve: "linear", grade: "candle" },
      { at: 75, from: him(0, 30, 4), to: him(0, 12, 3), look: him(0, 1.5, 0), fov: 56, grade: "candle" },
      { at: L.dragged, from: rim(2.9, 12), path: arc(0, 0, 50, 10, 3.2, 4.0, 3), to: me(kit, 6, 4, 6), look: me(kit, 0, 1.5, 0), fov: 54, curve: "linear", roll: 0.1, rollTo: -0.1, grade: "dawn" },
      { at: 86, from: me(kit, 0, 1.6, 6), to: me(kit, 0, 1.6, 3), look: me(kit, 0, 1.4, -10), fov: 52, handheld: 0.05, grade: "dawn" },
      { at: 91, from: me(kit, 14, 8, 14), to: me(kit, 10, 6, 10), look: me(kit, 0, 1.5, 0), fov: 50, curve: "linear", grade: "dawn", out: "fade" },
      { at: L.wars, from: rim(1.3, 8), to: rim(1.5, 7), look: cam(0, 1, 46), fov: 40, curve: "linear", grade: "noir", in: "flash" },
      { at: 100, orbit: { center: cam(0, 0, 46), radius: 18, height: 2.4, from: 0.5, to: 1.3 }, look: cam(0, 1, 46), fov: 50, curve: "linear", grade: "noir" },
      { at: 106, from: cam(12, 0.6, 52), to: cam(10, 0.6, 50), look: cam(16, 1, 46), fov: 40, grade: "noir" },
      { at: L.homeless, from: cam(-44, 3, 67), to: cam(40, 3, 67), look: cam(0, 2, 52), fov: 48, curve: "linear", grade: "night" },
      { at: 116, from: cam(-8, 1.2, 61), to: cam(-6.5, 1.4, 60), look: cam(-3.6, 4.1, 56.3), fov: 44, grade: "night" },
      // Perde 3 — Kıpırtı: ilk hareket parmak ucunda; sonra omuz, sonra bütün beden.
      { at: L.live, from: him(1.2, 0.5, 1.4), to: him(0.5, 0.9, 1.0), look: him(0.3, 0.7, 0), fov: 34, grade: "neon" },
      { at: 124, orbit: { center: him(0, 0, 0), radius: 4.2, height: 1.4, from: 0.4, to: 2.2 }, look: him(0, 1.3, 0), fov: 52, curve: "linear", grade: "neon" },
      { at: L.street, orbit: { center: him(0, 0, 0), radius: 7.5, height: 2.2, from: 3, to: 5 }, look: him(0, 1.4, 0), fov: 60, curve: "linear", handheld: 0.04, grade: "neon", in: "flash" },
      { at: 132, from: cam(4, 1.4, 60), to: cam(8, 1.6, 60), look: cam(6, 4, 54), fov: 44, grade: "neon" },
      { at: L.live2, orbit: { center: him(0, 0, 0), radius: 5, height: 1.2, from: 5, to: 6.5 }, look: him(0, 1.5, 0), fov: 62, roll: 0.2, rollTo: -0.2, curve: "linear", grade: "fever" },
      { at: 140, from: pt(0, CENTER.y + 40, 2), to: pt(0, CENTER.y + 16, 1), look: pt(0, CENTER.y + 0.5, 0), fov: 60, grade: "neon" },
      { at: L.street2, from: rim(0.4, 12), path: arc(0, 0, 40, 8, 0.7, 1.5, 3), to: pt(Math.cos(1.8) * 20, CENTER.y + 4, Math.sin(1.8) * 20), look: pt(0, CENTER.y + 1.5, 0), lookTo: me(kit, 0, 1.8, 0), fov: 56, curve: "linear", grade: "neon", in: "flash" },
      { at: 148, from: him(2, 0.4, 2), to: him(-2, 0.6, 2), look: him(0, 1.2, 0), fov: 64, curve: "linear", grade: "neon" },
      { at: L.live3, orbit: { center: him(0, 0, 0), radius: 5, height: 1.2, from: 8, to: 9.5 }, look: him(0, 1.5, 0), fov: 62, roll: -0.2, rollTo: 0.2, curve: "linear", grade: "fever" },
      { at: 156, from: cam(-40, 3, 67), to: cam(30, 3, 67), look: cam(0, 2, 52), fov: 48, curve: "linear", grade: "neon" },
      { at: L.outro, orbit: { center: him(0, 0, 0), radius: 10, height: 5, from: 7, to: 9 }, look: him(0, 1.6, 0), fov: 56, curve: "linear", grade: "neon" },
      { at: 172, from: him(0, 3, 10), path: [pt(0, CENTER.y + 20, 30)], to: pt(0, CENTER.y + 12, 26), look: him(0, 1.6, 0), lookTo: pt(0, CENTER.y + 1, 0), fov: 52, curve: "linear", grade: "night" },
      { at: 182, orbit: { center: CENTER, radius: 26, height: 9, from: 0, to: 1 }, look: pt(0, CENTER.y + 1, 0), fov: 52, curve: "linear", grade: "night", out: "fade" },
      { at: L.breath, orbit: { center: follow(mobile, 0, -0.8, 0), radius: 3, height: 0.2, from: 1, to: 2 }, look: follow(mobile, 0, -0.8, 0), fov: 46, curve: "linear", grade: { ...GRADES.deep, soft: 0.6 }, in: "fade" },
      // Son: adam yine taş; su geri geliyor. Kamera ondan uzaklaşarak sırta çıkar.
      { at: 200, from: him(0, 1.4, 4), path: [pt(20, 26, 50)], to: ridge(1.1, 54), look: him(0, 1.5, 0), lookTo: pt(0, 0, 0), fov: 55, curve: "linear", grade: "deep", out: "fade" },
    ],
    beats: [
      { at: L.void, id: "void", line: "Kraterin ortasında biri duruyor; su onu yutuyor, o kıpırdamıyor bile." },
      { at: L.nameless, id: "cradle", line: "Havada bir beşik dönencesi dönüyor; ucunda boş bir isim kartı." },
      { at: L.butterfly, id: "nameless", line: "Kelebekler çıkıyor; kanatları incecik, ışıkta titriyor." },
      { at: L.loved, id: "loved", line: "Işıktan kalpler yükseliyor, sonra usulca dağılıyor." },
      { at: L.dragged, id: "dragged", line: "Görünmez bir akıntı seni kraterin ortasına doğru çekiyor." },
      { at: L.wars, id: "wars", line: "Uzakta gölge askerler birer birer düşüyor." },
      { at: L.homeless, id: "homeless", line: "Sokak lambaları diziliyor; altlarında kimse yok." },
      { at: L.live, id: "live", line: "Ortadaki adam kıpırdıyor: önce parmak ucu, sonra omuz." },
      { at: L.street, id: "dance", line: "Şarkı boyunca taş gibi duran adam, lambaların altında dans ediyor." },
      { at: L.breath, id: "breath", line: "Dans bitti; adam yine kıpırdamıyor. Su geri geliyor, dönence yalnız dönüyor." },
    ],
    onBeat(id) {
      if (id === "void") {
        fogTarget = 1;
        waterTarget = 1;
      }
      if (id === "cradle") {
        cradleTarget = 1;
        fogTarget = 0.3;
        waterTarget = 0.35;
      }
      if (id === "nameless") {
        flutterTarget = 1;
        fogTarget = 0.5;
      }
      if (id === "loved") {
        loveTarget = 1;
        waterTarget = 0;
        cradleTarget = 0;
      }
      if (id === "dragged") drag = 1;
      if (id === "wars") {
        war = 0;
        loveTarget = 0;
        drag = 0;
      }
      if (id === "homeless") streetTarget = 1;
      if (id === "live") dancerTarget = 0.35;
      if (id === "dance") {
        danceTarget = 1;
        dancerTarget = 1;
        fogTarget = 0;
        flutterTarget = 0.6;
      }
      if (id === "breath") {
        waterTarget = 1;
        cradleTarget = 1;
        danceTarget = 0;
        dancerTarget = 0;
        fogTarget = 1;
        streetTarget = 0.4;
      }
    },
    reset() {
      hand.copy(kit.player.position);
      history.forEach((point) => point.copy(hand));
      spins = 0;
      fog = fogTarget = flutter = flutterTarget = love = loveTarget = drag = street = streetTarget = danceBeat = danceTarget = dancerTarget = dancerEnergy = 0;
      war = -1;
      water = waterTarget = cradle = cradleTarget = 0;
      // Su ışığı ve dönence şarkının başladığı yerde.
      const c = kit.player.position;
      caustics.position.set(c.x, 0, c.z);
      const cp = caustics.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < cp.count; i += 1) cp.setY(i, ground(c.x + cp.getX(i), c.z + cp.getZ(i)) + 0.06);
      cp.needsUpdate = true;
      mobile.position.set(c.x + 1.8, ground(c.x, c.z) + 2.7, c.z - 2.8);
      butterflies.forEach((b) => (b.caught = false));
      soldiers.presence.fill(0);
    },
    update(dt, time, level) {
      clock = time;
      material.uniforms.uLevel.value = level;
      fog += (fogTarget - fog) * Math.min(1, dt * 0.6);
      kit.effects.fog = 1 + fog * 2.5;
      if (spin > 0) {
        const step = Math.min(spin, dt / 1.2);
        kit.player.yaw += step * Math.PI * 2;
        spin -= step;
      }
      if (kit.cinema()) {
        // Klipte görünmez bir dansçı: oyuncunun yerinde sekiz çizen, yükselip alçalan bir el; şerit boşluğa dans yazar.
        const t = time * (0.9 + danceBeat * 0.8);
        const p = kit.player.position;
        hand.set(p.x + Math.sin(t) * 2.2, p.y + 1.5 + Math.sin(t * 2) * 0.5 + danceBeat * Math.abs(Math.sin(t * 3)) * 0.6, p.z + Math.sin(t * 2) * 1.2);
      } else {
        hand.set(0.35, -0.45, -0.5).applyQuaternion(kit.camera.quaternion).add(kit.camera.position);
      }
      sample -= dt;
      if (sample <= 0) {
        sample = 1 / 40;
        history.pop();
        history.unshift(hand.clone());
      }
      for (let i = 0; i < TRAIL; i += 1) {
        const p = history[i];
        const nextPoint = history[Math.min(TRAIL - 1, i + 1)];
        side.copy(nextPoint).sub(p).cross(THREE.Object3D.DEFAULT_UP).normalize();
        if (!Number.isFinite(side.x)) side.set(1, 0, 0);
        const width = 0.32 * (1 - i / TRAIL);
        positions.set([p.x + side.x * width, p.y + width, p.z + side.z * width], i * 6);
        positions.set([p.x - side.x * width, p.y - width, p.z - side.z * width], i * 6 + 3);
        alphas[i * 2] = alphas[i * 2 + 1] = 1 - i / TRAIL;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.alpha.needsUpdate = true;

      const grounded = Math.abs(kit.player.velocity.y) < 0.2;
      if (wasGrounded && !grounded && kit.player.velocity.y > 1) spread = Math.max(spread, 0.7);
      wasGrounded = grounded;
      spread = Math.max(0, spread - dt * 0.6);
      danceBeat += (danceTarget - danceBeat) * Math.min(1, dt);
      partners.forEach((partner, i) => {
        const a = partner.phase + time * (0.9 + (i % 2) * 0.4 + danceBeat * 0.8) * (i % 2 ? -1 : 1);
        const radius = 2.4 + spread * 4 + Math.sin(time * 1.3 + i) * 0.4;
        const p = kit.player.position;
        partner.core.position.set(p.x + Math.cos(a) * radius, p.y + partner.height + Math.sin(time * 2 + i) * 0.5, p.z + Math.sin(a) * radius);
        partner.sprite.position.copy(partner.core.position);
        (partner.sprite.material as THREE.SpriteMaterial).opacity = level;
        partner.core.visible = level > 0.3;
      });
      burst.update(time);

      flutter += (flutterTarget * level - flutter) * Math.min(1, dt);
      butterflies.forEach((b, i) => {
        const a = b.phase + time * 0.7;
        const p = kit.player.position;
        b.group.position.set(p.x + Math.cos(a) * (3 + (i % 3)), p.y + 1.4 + Math.sin(time * 1.9 + i) * 0.6, p.z + Math.sin(a * 1.3) * (3 + (i % 3)));
        b.group.rotation.y = -a;
        const flap = Math.sin(time * 18 + i) * 1.1;
        b.left.rotation.y = flap;
        b.right.rotation.y = Math.PI - flap;
        b.group.scale.setScalar(Math.max(0.001, flutter));
        b.group.visible = flutter > 0.02 && !b.caught;
      });

      love += (loveTarget * level - love) * Math.min(1, dt * 0.8);
      hearts.forEach((heart, i) => {
        const rise = (time * heart.speed + i * 0.7) % 6;
        heart.sprite.position.copy(kit.player.position).add(heart.offset).setY(kit.player.position.y + rise);
        (heart.sprite.material as THREE.SpriteMaterial).opacity = love * Math.sin((rise / 6) * Math.PI);
        heart.sprite.visible = love > 0.02;
      });

      // Aşka sürüklenme: figüre doğru nazik bir çekim.
      drag = Math.max(0, drag - dt / 14);
      if (drag > 0 && level > 0.5) {
        pull.set(-kit.player.position.x, 0, -kit.player.position.z).normalize().multiplyScalar(dt * 2.2 * drag);
        kit.player.position.add(pull);
      }

      if (war >= 0) war += dt;
      for (let i = 0; i < SOLDIERS; i += 1) {
        const fallen = war >= 0 && war > 2 + i * 0.5;
        const standing = war >= 0 ? (fallen ? 0 : 1) : 0;
        soldiers.presence[i] += (standing * level - soldiers.presence[i]) * Math.min(1, dt * (fallen ? 3 : 1));
      }
      soldiers.update(time);

      water += (waterTarget * level - water) * Math.min(1, dt * 0.7);
      (caustics.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
      (caustics.material as THREE.ShaderMaterial).uniforms.uLevel.value = water;
      caustics.visible = water > 0.01;
      bubbles.origin.copy(kit.player.position);
      bubbles.rate = water;
      bubbles.intensity = water;
      bubbles.update(time);
      confetti.level = danceBeat * level;
      confettiColors.color.setHSL((time * 0.1) % 1, 0.85, 0.62);
      confettiColors.emissive.copy(confettiColors.color).multiplyScalar(0.4);
      partyCenter.copy(kit.player.position).setY(kit.player.position.y - 1);
      confetti.update(time, partyCenter);
      breathMotes.level = Math.max(water, love * 0.6) * level;
      breathMotes.update(time, partyCenter);
      cradle += (cradleTarget * level - cradle) * Math.min(1, dt * 0.6);
      mobile.rotation.y = time * 0.25;
      mobile.scale.setScalar(Math.max(0.001, cradle * 1.6));
      mobile.visible = cradle > 0.01;
      hangers.forEach((item, k) => (item.rotation.y = -time * 0.25 + Math.sin(time * 0.7 + k) * 0.4));
      (mobileGlow.material as THREE.SpriteMaterial).opacity = cradle * 0.5;

      street += (streetTarget * level - street) * Math.min(1, dt * 0.6);
      // Adam: canlılık 0'a inince taş kesilir; 0.35'te yalnız hafif sallanır; 1'de dans eder.
      dancerEnergy += (dancerTarget * level - dancerEnergy) * Math.min(1, dt * (dancerTarget > dancerEnergy ? 0.35 : 0.6));
      dancer.pose = dancerEnergy > 0.05 ? "dance" : "still";
      dancer.energy = dancerEnergy;
      dancer.group.rotation.y = dancerEnergy > 0.5 ? Math.sin(time * 0.6) * 0.9 * (dancerEnergy - 0.5) * 2 : 0;
      dancer.update(dt, time);
      dancer.group.visible = level > 0.05;
      neonLevel += (street * level - neonLevel) * Math.min(1, dt * 0.8);
      const neonPulse = 0.75 + 0.25 * danceBeat * Math.pow(0.5 + 0.5 * Math.sin(time * 7.6), 3);
      neonPink.opacity = neonLevel * neonPulse;
      neonCyan.opacity = neonLevel * (1.05 - neonPulse * 0.3);
      neonPinkSoft.opacity = neonPink.opacity * 0.22;
      neonCyanSoft.opacity = neonCyan.opacity * 0.2;
      neonPoles.forEach((pole, i) => {
        const beam = neonLevel * (0.6 + 0.4 * Math.pow(0.5 + 0.5 * Math.sin(time * 3.8 + i * 0.52), 2));
        // Kamera direğe yaklaşınca hale kadrajı boğmasın.
        const near = THREE.MathUtils.smoothstep(kit.camera.position.distanceTo(pole.halo.getWorldPosition(haloWorld)), 3, 9);
        (pole.halo.material as THREE.SpriteMaterial).opacity = beam * 0.8 * near;
        pole.halo.scale.setScalar(4 * (0.8 + beam * 0.5));
      });
      neon.visible = neonLevel > 0.01;
      lamps.forEach((lamp, i) => {
        const on = THREE.MathUtils.clamp(street * LAMPS - i, 0, 1);
        const pulse = 1 + danceBeat * 0.5 * Math.pow(0.5 + 0.5 * Math.sin(time * 7.6 + i * 0.5), 4);
        (lamp.halo.material as THREE.SpriteMaterial).opacity = on * 0.9;
        (lamp.halo.material as THREE.SpriteMaterial).color.setHSL(danceBeat > 0.05 ? (time * 0.15 + i * 0.08) % 1 : 0.11, danceBeat > 0.05 ? 0.9 * danceBeat + 0.1 : 0.7, 0.62);
        lamp.halo.scale.setScalar(3.5 * pulse);
        lamp.group.visible = street > 0.02;
      });
    },
  };
}
