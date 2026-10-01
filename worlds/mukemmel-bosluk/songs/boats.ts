import * as THREE from "three";
import { createEmitter, EMBERS, FIRE, type Emitter } from "../../../engine/fx/emitter";
import type { SongScene } from "../../../engine/game/songStage";
import { createFigure, type Figure, type FigurePose } from "../../../engine/fx/figure";
import type { Outfit } from "../../../engine/fx/character";
import { fitModel } from "../../../engine/core/models";
import type { ClipGrade, Shot } from "../../../engine/game/director";
import { announce, gazeTarget, glowSprite, ground, secretItem, type SceneKit } from "./kit";
import { lightCone, setConeLevel } from "../../../engine/fx/sceneProps";
import { createArmIk, type ArmIk } from "../../../engine/fx/armIk";
import { createFooting, type Footing } from "../../../engine/fx/footing";
import { createSkinPainter } from "../../../engine/fx/skinPaint";
import { createTube, type Tube } from "../../../engine/fx/tube";
import { Reflector } from "three/addons/objects/Reflector.js";

/**
 * Kalpsiz Romantik — tek bir adam, tek bir kıyı. Adam köprüleri yakar (gemiler); kıyıda bekleyenleri bırakıp gider;
 * bedeni alışkanlıkla yürür. Suya bakınca yansımasının yanında bir an o kadın durur. Sonra unutmak için başkalarının
 * bedenlerinin içinden geçer; her beden üstünde bir iz bırakır (kolunda iplik, omzunda saç teli, yakasında kumaş
 * parçası, yakasında ruj). Nereye yürüse aynı denize çıkar. İkinci kıtada izleri tek tek çıkarır (ruj çıkmaz); gece
 * o kadını odasında görür; kafasının çevresinde cam odalara kilitlenmiş kadınlar ve demirler belirir; eli yine eski
 * hareketleri yapar; bu kez bir kapının eşiğinde durur ve döner. Kalbi atıyor. İkinci turda döngü kırılır: dördüncüde
 * durur; izler dökülür. Sonunda o kadınla karşılaşır; bu kez o, adamın içinden geçip gider. Adam aynı kıyıya döner,
 * bedeni suya yürümek ister, kendini durdurur; son gemi söner; diz çöker.
 *
 * Film evrenin kendi yerinde geçer: kraterin denizi, aynı yedi gemi, aynı kıyı şeridi, iskele, deniz feneri. Bütün
 * hareket şarkının saniyesinin işlevidir (yollar, duruşlar, alevler, izler): ileri ve geri sarma aynı kareyi verir.
 */
const SEA = -3.2;
const SHIPS = 7;
/** Şarkının sesi (YouTube) 3:20,17 sürer; son kare sesle birlikte kararır. */
const AUDIO_END = 200.17;
/**
 * Dizelerin saniyeleri (kesmeler ve olaylar bunlara oturur). Nakarat dört dizedir ve iki tur söylenir; ikinci
 * turların ve son nakaratın ara dizeleri birinci turun aralıklarından türetilir. Sözler ~154,5'te biter, gerisi çıkış.
 */
const L = {
  night: 18.34, seas: 22.0, waitGo: 26.6, waiters: 30.91, tired: 34.73, auto: 39.3, love: 43.68, trauma: 47.57,
  saved: 52.35, bottom: 55.4, paper: 57.53,
  chorus: 61.16, forget: 64.09, bodies: 66.08, trips: 68.3, chorusB: 75.09, forgetB: 78.02, bodiesB: 80.01,
  lastNight: 92.39, pass: 100.56, anchor: 106.09, tired2: 109.27, love2: 117.6, saved2: 126.99,
  chorus2: 131.13, forget2: 133.9, bodies2: 135.53, trips2: 137.9, chorus2b: 144.3, another3: 147.05, bodies3: 148.7, trips3: 151.05,
} as const;

// --- Kıyı coğrafyası (kıyı koordinatı: s batıya metre, up su çizgisinden karaya metre) ------------------------------
// Doğudan batıya: adamın durduğu yer (0) · ateşin başı, fıçı masa (6) · yol ayrımı (7,8) · dar geçit, "kapı" (9) ·
// bank (12) · ilk kadın (14,95) · bedenin kendi kendine yürüdüğü yer (16,7) · su kenarı, yansıma (19,4) · son karşılaşma.
/** s = 0 açısı: adamın filmin başında ve sonunda durduğu yer. */
const TH0 = 1.28;
const R_REF = 42;
/** Kıyı patikası: su çizgisinin 1,5 m yukarısı. */
const PATH = 1.5;
/** Dört kadının duraklarının s değerleri: ilki ayakta patikada, ikincisi bankta, üçüncüsü geçitte, dördüncüsü masada. */
const R1 = 14.95;
const R2 = 12;
const R3 = 9;
const R4 = 6;
/** Sarılma mesafesi (iki kök arası). */
const HUG = 0.36;
const BENCH_S = R2;
const BENCH_UP = 2.15;
const SEAT_H = 0.47;
/** Oturma klibinde kalça kökün bu kadar arkasına iner: oturak oraya konur. */
const SIT_BACK = 0.3;
/** Dar geçit (kapı): iki yük yığınının arası; içinden tek kişi geçer. */
const GAP_S = R3;
const GAP_UP = 2.6;
const GAP_HALF = 1.15;
/** Yol ayrımı: masanın batısında, geçidin doğusunda. */
const X_S = 7.8;
const X_UP = 3.6;
/** Gidişte durduğu yer (beden kendi kendine yürür) ve su kenarı (yansıma). */
const A0 = R1 + 1.75;
const M0 = A0 + 2.7;
/** Ateşin başı: fıçı masa ve dört oturak (adam, dördüncü kadın, iki boş). */
const TABLE = [R4, 4.65] as const;
const SEATS = [[R4 + 0.75, 3.9], [R4 + 0.65, 5.4], [R4 - 0.65, 5.3], [R4 - 0.75, 3.9]] as const;
const FIRES = [[R4 - 2.1, 5.8], [R2 + 2.5, 12], [29, 13], [-28, 9], [47, 8]] as const;
/** Son karşılaşma: adamın durduğu ve kadının durduğu yer. */
const HF = 21.5;
const LF = 26;
/** İzlerin döküldüğü an (ikinci nakaratın sonu). */
const FALL_AT = 141.8;
/** Baş eğme yönü (kişinin sağ ekseni çevresinde; işaret modele göre). */
const TILT = -1;
/**
 * Figürlerin tonu: kara lav zemin gecede okunsun diye evrenin ışığı yükseltilir (moments.ts), figürler aynı oranda
 * kısılır; beyaz giysiler patlamaz, ten doğal kalır.
 */
const FIGURE_TONE = 0.6;

// --- Renk: akşam mavisi, okunur; ateşte ölçülü turuncu; geçişlerde sade; ikinci kıtada soğuk; sonda soluk ---------
const COAST: ClipGrade = { exposure: 1.05, contrast: 0.98, saturation: 0.94, tint: "#fbf3ea", lift: "#151b28", vignette: 0.2 };
const FIREG: ClipGrade = { exposure: 1.03, contrast: 1.0, saturation: 1.0, tint: "#ffeedd", lift: "#161822", vignette: 0.22 };
const PASS: ClipGrade = { exposure: 1.06, contrast: 0.98, saturation: 0.86, tint: "#f5f1ec", lift: "#161c2a", vignette: 0.2 };
const COLD: ClipGrade = { exposure: 1.05, contrast: 0.98, saturation: 0.78, tint: "#e2e9f6", lift: "#141d2e", vignette: 0.22 };
const FINAL: ClipGrade = { exposure: 1.04, contrast: 0.98, saturation: 0.6, tint: "#eef0f2", lift: "#161b26", vignette: 0.24 };

/** Gerçek bir tekne gövdesi: kıç geniş, pruva sivri, ortada derin; güverte çizgisi uçlarda kalkık. */
function hullGeometry(length: number, beam: number, depth: number): THREE.BufferGeometry {
  const along = 28;
  const around = 12;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= along; i += 1) {
    const u = i / along;
    const x = (u - 0.5) * length;
    const half = (beam / 2) * Math.pow(Math.max(Math.sin(Math.PI * (0.16 + 0.84 * u)), 0), 0.55);
    const sheer = depth * 0.28 * (2 * u - 1) ** 2;
    const keel = depth * (0.55 + 0.45 * Math.sin(Math.PI * u));
    for (let j = 0; j <= around; j += 1) {
      const a = (j / around) * Math.PI;
      positions.push(x, sheer - keel * Math.sin(a), half * Math.cos(a));
    }
  }
  for (let i = 0; i < along; i += 1) {
    for (let j = 0; j < around; j += 1) {
      const a = i * (around + 1) + j;
      const b = a + around + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function deckGeometry(length: number, beam: number, depth: number): THREE.BufferGeometry {
  const along = 28;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= along; i += 1) {
    const u = i / along;
    const x = (u - 0.5) * length;
    const half = (beam / 2) * Math.pow(Math.max(Math.sin(Math.PI * (0.16 + 0.84 * u)), 0), 0.55) * 0.96;
    const y = depth * 0.28 * (2 * u - 1) ** 2 - 0.05;
    positions.push(x, y, half, x, y, -half);
    if (i < along) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Rüzgârla şişmiş yelken. */
function sailGeometry(width: number, height: number, belly: number): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, height, 10, 10);
  const p = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i) / width + 0.5;
    const y = p.getY(i) / height + 0.5;
    p.setZ(i, Math.sin(Math.PI * x) * Math.sin(Math.PI * (0.15 + 0.85 * y)) * belly);
  }
  geometry.computeVertexNormals();
  return geometry;
}

interface Ship {
  group: THREE.Group;
  hullMaterial: THREE.MeshStandardMaterial;
  sails: THREE.Mesh[];
  /** Halatlar: yandıkça kopar (saydamlaşır). */
  rigging: THREE.MeshStandardMaterial[];
  fire: Emitter;
  embers: Emitter;
  halo: THREE.Sprite;
  orbit: { radius: number; speed: number; phase: number };
  angle: number;
  /** Tutuştuğu saniye (oyuncu erken yakabilir). */
  litAt: number;
  /** Hazır model mi (dokulu malzeme: renk çarpanı 1'den kararır). */
  textured: boolean;
}

function createSea(): { mesh: THREE.Mesh; uniforms: Record<string, THREE.IUniform> } {
  const uniforms = {
    uTop: { value: new THREE.Color("#d6d6d8") },
    uHorizon: { value: new THREE.Color("#f7f7f6") },
    uTime: { value: 0 },
    uOpacity: { value: 0 },
    uFires: { value: Array.from({ length: SHIPS }, () => new THREE.Vector4()) },
    uMoon: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon; uniform float uTime, uOpacity, uMoon;
      uniform vec4 uFires[${SHIPS}];
      varying vec3 vWorld;
      void main() {
        vec3 view = normalize(vWorld - cameraPosition);
        // Küçük dalgacıklar: yansımayı kıran iki yönlü sinüs dalgası.
        float w = sin(vWorld.x * 0.55 + uTime * 0.8) * sin(vWorld.z * 0.42 - uTime * 0.6) * 0.03
                + sin((vWorld.x + vWorld.z) * 1.7 + uTime * 1.4) * 0.012;
        float fresnel = pow(clamp(1.0 - abs(view.y) + w * 0.3, 0.0, 1.0), 4.0);
        vec3 sky = mix(uTop, uHorizon, fresnel);
        vec3 col = mix(vec3(0.004, 0.004, 0.005), sky, 0.03 + fresnel * 0.6);
        // Ay yolu: dalgacıkların eğimiyle kırılan, aya doğru uzanan gümüş parıltı.
        vec3 n = normalize(vec3(
          -cos(vWorld.x * 0.55 + uTime * 0.8) * 0.55 * sin(vWorld.z * 0.42 - uTime * 0.6) * 0.3 - cos((vWorld.x + vWorld.z) * 1.7 + uTime * 1.4) * 0.35,
          1.0,
          -sin(vWorld.x * 0.55 + uTime * 0.8) * cos(vWorld.z * 0.42 - uTime * 0.6) * 0.42 * 0.3 - cos((vWorld.x + vWorld.z) * 1.7 + uTime * 1.4) * 0.35));
        vec3 moonDir = normalize(vec3(-0.45, 0.42, -0.78));
        float glint = pow(max(dot(reflect(view, n), moonDir), 0.0), 24.0);
        col += vec3(0.8, 0.86, 1.0) * glint * 0.35 * uMoon;
        // Yanan gemilerin sudaki titrek yansıması (bakış yönünde uzayan turuncu şerit).
        for (int i = 0; i < ${SHIPS}; i++) {
          vec4 f = uFires[i];
          if (f.z <= 0.0) continue;
          vec2 d = vWorld.xz - f.xy;
          vec2 dir = normalize(cameraPosition.xz - f.xy);
          float along = dot(d, dir);
          float across = length(d - dir * along);
          float streak = exp(-across * across / 5.0) * exp(-abs(along) / 12.0) * (0.86 + 0.14 * sin(vWorld.z * 1.1 + vWorld.x * 0.6 + uTime * 1.8));
          float pool = exp(-dot(d, d) / 40.0);
          col += (f.w > 0.5 ? vec3(1.0, 0.85, 0.55) : vec3(1.0, 0.36, 0.08)) * (streak * 0.2 + pool * 0.16) * f.z;
        }
        float edge = smoothstep(46.0, 40.0, length(vWorld.xz));
        gl_FragColor = vec4(col, uOpacity * edge);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(46, 128), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;
  return { mesh, uniforms };
}

export function createBoatsScene(kit: SceneKit): SongScene & { setSky(top: THREE.Color, horizon: THREE.Color): void } {
  const root = new THREE.Group();
  const random = kit.random;
  let seaLevel = -12;
  const sea = createSea();
  root.add(sea.mesh);

  // --- Kıyı: film tek bir kıyı şeridinde geçer. s: kıyı boyunca metre (batıya artar), up: su çizgisinden karaya metre.
  const WL_A0 = 0.4;
  const WL_STEP = 0.02;
  const waterlineTable: number[] = [];
  for (let a = WL_A0; a <= 2.8; a += WL_STEP) {
    let r = 35;
    while (r < 47 && ground(Math.cos(a) * r, Math.sin(a) * r) < SEA + 0.05) r += 0.1;
    waterlineTable.push(r);
  }
  const waterline = (angle: number) => {
    const f = THREE.MathUtils.clamp((angle - WL_A0) / WL_STEP, 0, waterlineTable.length - 1.001);
    const i = Math.floor(f);
    return waterlineTable[i] + (waterlineTable[i + 1] - waterlineTable[i]) * (f - i);
  };
  /** Kıyı noktası: h zeminden (suyun üstündeyse su yüzeyinden) yükseklik. */
  const shore = (s: number, up: number, h = 0, out = new THREE.Vector3()) => {
    const a = TH0 + s / R_REF;
    const r = waterline(a) + up;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return out.set(x, Math.max(ground(x, z), SEA) + h, z);
  };
  const at = (s: number, up: number, h: number) => () => shore(s, up, h);
  const yawToSea = (p: THREE.Vector3) => Math.atan2(-p.x, -p.z);

  // --- Gemiler: hep aynı yedi gemi; film boyunca yanar, sonda söner ------------------------------------------------
  const hull = hullGeometry(10, 3.2, 1.7);
  const deck = deckGeometry(10, 3.2, 1.7);
  const mainSail = sailGeometry(4.6, 5.2, 0.8);
  const foreSail = sailGeometry(3.8, 4.4, 0.7);
  const wood = new THREE.MeshStandardMaterial({ color: "#3a2a1e", roughness: 0.75 });
  const mast = new THREE.MeshStandardMaterial({ color: "#1f1712", roughness: 0.8 });
  const buildShip = () => {
    // Hazır model (Poly Haven, CC0: 17. yüzyıl Hollanda gemisi): gövde, halatlar ve yelkenler ayrı malzeme.
    const model = kit.models.get("dutch_ship_medium");
    if (model) {
      const group = new THREE.Group();
      const fitted = fitModel(model, 18, { keepY: true });
      group.add(fitted);
      let hullMaterial: THREE.MeshStandardMaterial | null = null;
      let hullMesh: THREE.Mesh | null = null;
      const sails: THREE.Mesh[] = [];
      const rigging: THREE.MeshStandardMaterial[] = [];
      fitted.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const material = (mesh.material as THREE.MeshStandardMaterial).clone();
        mesh.material = material;
        mesh.castShadow = material.name.includes("hull");
        mesh.receiveShadow = !material.name.includes("rigging");
        if (material.name.includes("hull")) {
          // Kor: parıltı gövdenin kendi ahşap dokusundan yükselir.
          material.emissive.set("#ff5a1a");
          material.emissiveMap = material.map;
          material.emissiveIntensity = 0;
          hullMaterial = material;
          hullMesh = mesh;
        } else if (material.name.includes("sails")) {
          material.transparent = true;
          material.alphaTest = 0.05;
          sails.push(mesh);
        } else if (material.name.includes("rigging")) {
          material.transparent = true;
          rigging.push(material);
        }
      });
      if (hullMaterial && hullMesh) {
        kit.colliders.solid(hullMesh);
        return { group, hullMaterial: hullMaterial as THREE.MeshStandardMaterial, sails, rigging, textured: true };
      }
    }
    const group = new THREE.Group();
    const hullMaterial = new THREE.MeshStandardMaterial({ color: "#2b1d14", roughness: 0.7, emissive: "#ff4a10", emissiveIntensity: 0 });
    const hullMesh = new THREE.Mesh(hull, hullMaterial);
    hullMesh.castShadow = true;
    group.add(hullMesh, new THREE.Mesh(deck, wood));
    const sails: THREE.Mesh[] = [];
    for (const [x, height, geometry] of [[-1.4, 8.5, mainSail], [2.1, 7, foreSail]] as const) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, height, 8), mast);
      pole.position.set(x, height / 2, 0);
      const sail = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#cdc3ae", roughness: 0.95, side: THREE.DoubleSide, transparent: true }));
      sail.rotation.y = Math.PI / 2;
      sail.position.set(x + 0.15, height * 0.58, 0);
      sail.castShadow = true;
      group.add(pole, sail);
      sails.push(sail);
    }
    group.scale.setScalar(1.8);
    kit.colliders.solid(hullMesh);
    return { group, hullMaterial, sails, rigging: [] as THREE.MeshStandardMaterial[], textured: false };
  };
  // Tutuşma sırası: ilki sözle birlikte; sonra bir, bir daha; ötekiler kıta boyunca. Patlama yok: tutuşur ve yanar.
  const LIT_AT = [L.night, 19.9, 21.4, 24.2, 27.6, 31.2, 34.6];
  const ships: Ship[] = [];
  for (let i = 0; i < SHIPS; i += 1) {
    const { group, hullMaterial, sails, rigging, textured } = buildShip();
    const fire = createEmitter(FIRE(3.4));
    const embers = createEmitter(EMBERS(4));
    const halo = glowSprite("#ff6a1a", 12);
    root.add(group, fire.points, embers.points, halo);
    ships.push({
      group,
      hullMaterial,
      sails,
      rigging,
      fire,
      embers,
      halo,
      // Dört halka, 6 m arayla (gemi eni ~5 m): aynı halkadakiler aynı hızla döner, hiç üst üste binmez.
      orbit: { radius: 8 + (i % 4) * 6 + random() * 0.6, speed: (0.013 + (i % 4) * 0.002) * (i % 2 ? 1 : -1), phase: (i / SHIPS) * Math.PI * 2 },
      angle: (i / SHIPS) * Math.PI * 2,
      litAt: LIT_AT[i],
      textured,
    });
  }
  /** Sönüş sırası: son dönüşte birer birer; en son sönen gemi (6) finalin anıdır. */
  const OUT_AT = [168, 170, 172, 174, 176, 178, 182];
  /** Geminin o andaki alevi (0..1): tutuşur, film boyunca yanar, son dönüşte azalır ve birer birer söner. */
  const flameOf = (ship: Ship, t: number) => {
    const i = ships.indexOf(ship);
    if (t < ship.litAt) return 0;
    const out = OUT_AT[i] ?? 180;
    return THREE.MathUtils.smoothstep(t, ship.litAt, ship.litAt + 4) * (1 - (i === SHIPS - 1 ? 0.15 : 0.55) * THREE.MathUtils.smoothstep(t, 150, 166)) * (1 - THREE.MathUtils.smoothstep(t, out, out + (i === SHIPS - 1 ? 3 : 2.2)));
  };

  // --- Denizin yüzü: çizgi film surat değil; yanan gemilerin sudaki yansıması bir an yüz olur. Işıktan bir oval
  // (ateşin yansıması), içinde koyu, dışa doğru düşen iki göz, ağır kapaklar, köpükten iç uçları kalkık kaşlar ve aşağı
  // bükülen bir ağız: yorgun, üzgün bir deniz. Dalgalarla kıpırdar, alevle titrer; bir kez görünür.
  const faceCanvas = document.createElement("canvas");
  faceCanvas.width = 384;
  faceCanvas.height = 512;
  {
    const g = faceCanvas.getContext("2d")!;
    const blot = (x: number, y: number, rx: number, ry: number, tilt: number, alpha: number, tone = "6,6,10") => {
      g.save();
      g.translate(x, y);
      g.rotate(tilt);
      g.scale(rx, ry);
      const fill = g.createRadialGradient(0, 0, 0.05, 0, 0, 1);
      fill.addColorStop(0, `rgba(${tone},${alpha})`);
      fill.addColorStop(0.62, `rgba(${tone},${alpha * 0.75})`);
      fill.addColorStop(1, `rgba(${tone},0)`);
      g.fillStyle = fill;
      g.beginPath();
      g.arc(0, 0, 1, 0, Math.PI * 2);
      g.fill();
      g.restore();
    };
    // Işık: ateşin suya düşen sıcak yansıması (yüzün ovali); düz bir disk değil, dalgacıklarla kırılmış parıltı.
    g.save();
    g.translate(192, 262);
    g.scale(168, 230);
    const oval = g.createRadialGradient(0, 0, 0.1, 0, 0, 1);
    oval.addColorStop(0, "rgba(255,176,110,0.5)");
    oval.addColorStop(0.6, "rgba(236,132,72,0.34)");
    oval.addColorStop(1, "rgba(210,96,48,0)");
    g.fillStyle = oval;
    g.beginPath();
    g.arc(0, 0, 1, 0, Math.PI * 2);
    g.fill();
    g.restore();
    // Dalga tepeleri: oval içinde parlak, kırık yatay çizgiler.
    for (let y = 46; y < 490; y += 9 + random() * 7) {
      for (let x = 30; x < 354; x += 18 + random() * 30) {
        const w = 10 + random() * 34;
        g.fillStyle = `rgba(255,214,160,${0.08 + random() * 0.12})`;
        g.fillRect(x, y, w, 1.5 + random() * 1.5);
      }
    }
    // Gözler: koyu, badem; dış uçları aşağı düşer (üzgün); üstte ağır kapak gölgesi, altta torba.
    for (const [x, side] of [[118, -1], [266, 1]] as const) {
      const tilt = side * 0.32;
      blot(x, 228, 58, 24, tilt, 0.92);
      blot(x + side * 3, 214, 64, 14, tilt, 0.62);
      blot(x + side * 8, 268, 50, 11, tilt * 0.8, 0.42);
      // Kaş: köpükten kırık bir çizgi; iç ucu yukarıda, dış ucu aşağıda.
      for (let k = 0; k <= 10; k += 1) {
        const u = k / 10;
        if (random() < 0.18) continue;
        const bx = x - side * 62 + side * u * 112;
        const by = 138 + u * 30 + (random() - 0.5) * 4;
        blot(bx, by, 8 + random() * 4, 3, side * 0.27, 0.5, "236,232,222");
      }
    }
    // Ağız: aşağı bükülen bir yay (koyu su), uçları düşük, dalgayla kırık.
    for (let k = 0; k <= 16; k += 1) {
      const u = (k - 8) / 8;
      blot(192 + u * 72, 392 + u * u * 26 + (random() - 0.5) * 3, 14, 7, u * 0.5, 0.74);
    }
    // Dalgacıklar her şeyi keser: yüz suyun yüzeyinde, çizgi çizgi okunur.
    g.globalCompositeOperation = "destination-out";
    for (let y = 40; y < 500; y += 7 + random() * 6) {
      g.fillStyle = `rgba(0,0,0,${0.22 + random() * 0.22})`;
      g.fillRect(0, y, 384, 2 + random() * 2.5);
    }
    g.globalCompositeOperation = "source-over";
  }
  const faceTexture = new THREE.CanvasTexture(faceCanvas);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  const faceUniforms = { map: { value: faceTexture as THREE.Texture }, uTime: { value: 0 }, uOpacity: { value: 0 } };
  const seaFace = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 8.5),
    new THREE.ShaderMaterial({
      uniforms: faceUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map; uniform float uTime, uOpacity; varying vec2 vUv;
        void main() {
          vec2 uv = vUv;
          // Dalga ritmi: yüz suyun yüzeyiyle kırılır, ağır ağır kıpırdar.
          uv.x += sin(uv.y * 36.0 + uTime * 1.3) * 0.005 + sin(uv.y * 9.0 - uTime * 0.6) * 0.004;
          uv.y += sin(uv.x * 22.0 + uTime * 0.9) * 0.004;
          vec4 c = texture2D(map, uv);
          // Işıklı kısımlar alevle titrer; koyu kısımlar durgun.
          float flicker = 0.86 + 0.14 * sin(uTime * 7.0) * sin(uTime * 3.1 + 1.0);
          float light = smoothstep(0.15, 0.6, max(c.r, max(c.g, c.b)));
          gl_FragColor = vec4(c.rgb * mix(1.0, flicker, light), c.a * uOpacity);
        }
      `,
    }),
  );
  seaFace.rotation.order = "YXZ";
  seaFace.renderOrder = 2;
  {
    const c = shore(1.5, -9.5);
    seaFace.position.copy(c);
    // Yüz kıyıdan bakana düz dursun: alnı açığa, çenesi kıyıya.
    seaFace.rotation.set(-Math.PI / 2, yawToSea(c) + Math.PI, 0);
  }
  root.add(seaFace);

  // Elimizde kibrit: serbest dolaşırken oyuncunun elinde (klipte kamerada değil).
  const match = new THREE.Group();
  const matchStick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.11, 6), new THREE.MeshStandardMaterial({ color: "#d9c9a0", roughness: 0.9 }));
  const matchHead = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshStandardMaterial({ color: "#3a1210", roughness: 0.6 }));
  matchHead.position.y = 0.058;
  const matchFlame = glowSprite("#ffb050", 0.12);
  matchFlame.position.y = 0.075;
  match.add(matchStick, matchHead, matchFlame);
  match.position.set(0.24, -0.2, -0.46);
  match.rotation.set(-0.55, 0.1, -0.35);
  match.visible = false;
  kit.camera.add(match);

  // --- İskele (doğu kıyısı): evrenin yerleşik yapısı; fenerler, yük, bank -------------------------------------------
  const pier = new THREE.Group();
  const boardWood = new THREE.MeshStandardMaterial({ color: "#3a2a1c", roughness: 0.85 });
  const pile = new THREE.MeshStandardMaterial({ color: "#231910", roughness: 0.9 });
  const PIER_START = new THREE.Vector3(Math.cos(0.15) * 48, 0, Math.sin(0.15) * 48);
  const PIER_END = new THREE.Vector3(Math.cos(0.15) * 28, 0, Math.sin(0.15) * 28);
  const PIER_Y = SEA + 1.3;
  const pierDir = PIER_END.clone().sub(PIER_START).normalize();
  const pierSide = new THREE.Vector3(-pierDir.z, 0, pierDir.x);
  for (let i = 0; i < 40; i += 1) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.42), boardWood);
    board.position.copy(PIER_START).addScaledVector(pierDir, i * 0.5 + 0.25).setY(PIER_Y + (i % 3) * 0.008);
    board.rotation.y = -Math.atan2(pierDir.x, pierDir.z) + Math.PI / 2;
    pier.add(board);
  }
  for (let i = 0; i <= 6; i += 1) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6, 8), pile);
      post.position.copy(PIER_START).addScaledVector(pierDir, i * 3).addScaledVector(pierSide, side * 1.2).setY(PIER_Y - 2.6);
      pier.add(post);
      if (i % 2 === 0) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6), pile);
        rail.position.copy(PIER_START).addScaledVector(pierDir, i * 3).addScaledVector(pierSide, side * 1.3).setY(PIER_Y + 0.5);
        pier.add(rail);
      }
    }
  }
  const lanternModel = kit.models.get("wooden_lantern_01");
  const pierLanterns = Array.from({ length: 4 }, (_, i) => {
    const lantern = glowSprite("#ffc070", 1.8);
    lantern.position.copy(PIER_START).addScaledVector(pierDir, 3 + i * 4.5).addScaledVector(pierSide, i % 2 ? 1.3 : -1.3).setY(PIER_Y + 1.15);
    if (lanternModel) {
      const body = fitModel(lanternModel.clone(true), 0.55, { by: "height" });
      body.position.copy(lantern.position).setY(PIER_Y + 0.9);
      body.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        const material = (mesh.material as THREE.MeshStandardMaterial).clone();
        material.emissive.set("#ffb347");
        material.emissiveIntensity = 0.35;
        mesh.material = material;
      });
      pier.add(lantern, body);
    } else {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16), new THREE.MeshStandardMaterial({ color: "#ffd9a0", emissive: "#ffb347", emissiveIntensity: 1.6 }));
      box.position.copy(lantern.position);
      pier.add(lantern, box);
    }
    return lantern;
  });
  const cargo: Array<[string, number, number, number, number]> = [
    ["wine_barrel_01", 1.0, 5.2, 0.7, 0.2],
    ["wine_barrel_01", 1.0, 5.95, 0.3, 1.1],
    ["wooden_crate_01", 0.95, 11.5, -0.75, 0.4],
    ["wooden_crate_01", 0.95, 12.3, -0.8, 2.0],
    ["wine_barrel_01", 1.0, 16.8, 0.8, 0.7],
  ];
  for (const [name, size, along, across, turn] of cargo) {
    const model = kit.models.get(name);
    if (!model) continue;
    const item = fitModel(model.clone(true), size, { by: name === "wine_barrel_01" ? "height" : "length" });
    item.position.copy(PIER_START).addScaledVector(pierDir, along).addScaledVector(pierSide, across).setY(PIER_Y + 0.04);
    item.rotation.y = turn;
    pier.add(item);
  }
  const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.45), boardWood);
  benchSeat.position.copy(PIER_END).addScaledVector(pierDir, -0.6).setY(PIER_Y + 0.45);
  benchSeat.rotation.y = -Math.atan2(pierDir.x, pierDir.z);
  pier.add(benchSeat);
  root.add(pier);
  kit.colliders.solid(benchSeat, { pad: 0.1 });

  // --- Kıyıdaki yerleşim: ateşler, yük yığınları (dar geçit), bank, fıçı masa, demirler ------------------------------
  const shoreFires = FIRES.map(([s, up]) => {
    const p = shore(s, up);
    const flame = createEmitter({ ...FIRE(0.38), count: 40 });
    flame.origin.set(p.x, p.y + 0.1, p.z);
    const glow = glowSprite("#ff9a3a", 1.1);
    glow.position.set(p.x, p.y + 0.4, p.z);
    const logs = new THREE.Group();
    for (let k = 0; k < 3; k += 1) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 7), pile);
      log.rotation.set(Math.PI / 2, 0, (k / 3) * Math.PI);
      log.position.set(p.x, p.y + 0.1, p.z);
      logs.add(log);
    }
    root.add(flame.points, glow, logs);
    return { flame, glow };
  });
  /** Hazır modelden (yoksa kutudan) set parçası: tabanı zemine oturur. */
  const prop = (name: string, size: number, by: "height" | "length", s: number, up: number, yaw: number, lift = 0) => {
    const model = kit.models.get(name);
    const p = shore(s, up);
    let item: THREE.Object3D;
    if (model) item = fitModel(model.clone(true), size, { by });
    else {
      const box = new THREE.Mesh(new THREE.BoxGeometry(size * 0.75, size, size * 0.75), boardWood);
      box.position.y = size / 2;
      item = new THREE.Group();
      item.add(box);
    }
    item.position.set(p.x, p.y + lift, p.z);
    item.rotation.y = yaw;
    root.add(item);
    return item;
  };
  // Dar geçit: iki yük yığını (ikişer fıçı, birer sandık); aralarından tek kişi geçer. Alçaktır: kadrajı kapatmaz.
  for (const [side, turn] of [[-1, 0.3], [1, 1.2]] as const) {
    const up = GAP_UP + side * GAP_HALF;
    prop("wine_barrel_01", 0.95, "height", GAP_S - 0.42, up, turn);
    prop("wine_barrel_01", 0.95, "height", GAP_S + 0.42, up + side * 0.06, turn + 1);
    prop("wooden_crate_01", 0.42, "height", GAP_S + 0.05, up + side * 0.78, turn + 0.4);
  }
  // Bank: dördüncü kadının oturduğu yer (iskeledeki bankın tahtasından).
  const bench = new THREE.Group();
  {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.42), boardWood);
    seat.position.set(0, SEAT_H - 0.035, -SIT_BACK);
    bench.add(seat);
    for (const x of [-0.8, 0.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, SEAT_H - 0.07, 0.38), pile);
      leg.position.set(x, (SEAT_H - 0.07) / 2, -SIT_BACK);
      bench.add(leg);
    }
    const p = shore(BENCH_S, BENCH_UP);
    bench.position.copy(p);
    bench.rotation.y = yawToSea(p);
    root.add(bench);
  }
  // Fıçı masa ve dört sandık oturak (ateşin yanında): kıyının gece oturulan yeri. Masada boş şişeler.
  const tableAt = shore(TABLE[0], TABLE[1]);
  prop("wine_barrel_01", 0.82, "height", TABLE[0], TABLE[1], 0.4);
  const bottleMaterial = new THREE.MeshPhysicalMaterial({ color: "#3d6b4e", roughness: 0.1, transparent: true, opacity: 0.8, clearcoat: 1 });
  for (let k = 0; k < 3; k += 1) {
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.16, 4, 10), bottleMaterial);
    mesh.position.set(tableAt.x + Math.cos(k * 2.1) * 0.13, tableAt.y + 0.82 + 0.115, tableAt.z + Math.sin(k * 2.1) * 0.13);
    root.add(mesh);
  }
  // Oturaklar: oturan kişinin kökünün SIT_BACK kadar arkasında (masadan uzak yanda).
  for (const [s, up] of SEATS) {
    const p = shore(s, up);
    const away = Math.atan2(p.x - tableAt.x, p.z - tableAt.z);
    const item = prop("wooden_crate_01", SEAT_H, "height", s, up, away + Math.PI / 2);
    item.position.x += Math.sin(away) * SIT_BACK;
    item.position.z += Math.cos(away) * SIT_BACK;
  }
  // Demirler: cam odalara kilitlenen gemi demirleri (kafa sahnesi).
  const iron = new THREE.MeshStandardMaterial({ color: "#1d1e20", metalness: 0.75, roughness: 0.5 });
  const makeAnchor = () => {
    const anchor = new THREE.Group();
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.9, 8), iron);
    shank.position.y = 0.45;
    const stock = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.56, 8), iron);
    stock.rotation.x = Math.PI / 2;
    stock.position.y = 0.8;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 16), iron);
    ring.position.y = 0.97;
    const arms = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.036, 8, 20, Math.PI), iron);
    arms.rotation.z = Math.PI;
    arms.position.y = 0.3;
    anchor.add(shank, stock, ring, arms);
    for (const side of [-1, 1]) {
      const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 4), iron);
      fluke.position.set(side * 0.3, 0.36, 0);
      fluke.rotation.z = side * -0.5;
      anchor.add(fluke);
    }
    root.add(anchor);
    return anchor;
  };

  // Kraterin kıyısında deniz feneri (evrenin yerleşik yapısı): gece yanar, huzmesi yavaşça döner.
  const lighthouse = new THREE.Group();
  const bandWhite = new THREE.MeshStandardMaterial({ color: "#e8e2d6", roughness: 0.7 });
  const bandRed = new THREE.MeshStandardMaterial({ color: "#8e1a1c", roughness: 0.6 });
  for (let k = 0; k < 6; k += 1) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.5 - (k + 1) * 0.12, 1.5 - k * 0.12, 2.6, 20), k % 2 ? bandRed : bandWhite);
    band.position.y = 1.3 + k * 2.6;
    lighthouse.add(band);
  }
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.25, 20), bandRed);
  gallery.position.y = 15.8;
  const lanternRoom = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.6, 16), new THREE.MeshStandardMaterial({ color: "#fff2c8", emissive: "#ffd28a", emissiveIntensity: 2.2, transparent: true, opacity: 0.9 }));
  lanternRoom.position.y = 16.8;
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.1, 16), bandRed);
  cap.position.y = 18.15;
  const lampGlow = glowSprite("#ffe0a0", 7);
  lampGlow.position.y = 16.8;
  const beams = new THREE.Group();
  beams.position.y = 16.8;
  for (const dir of [1, -1]) {
    const cone = lightCone("#ffe6b0", 150, 11);
    cone.rotation.z = (dir * Math.PI) / 2;
    beams.add(cone);
  }
  lighthouse.add(gallery, lanternRoom, cap, lampGlow, beams);
  lighthouse.position.set(-58, ground(-58, -34) - 0.5, -34);
  root.add(lighthouse);
  kit.colliders.solid(lighthouse.children[0] as THREE.Mesh, { shape: "round" });

  // Gizli keşif: suda sallanan bir şişe.
  const bottle = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 6, 12), new THREE.MeshPhysicalMaterial({ color: "#6a8f7a", roughness: 0.08, transparent: true, opacity: 0.8, clearcoat: 1 }));
  glass.rotation.z = Math.PI / 2 - 0.3;
  const note = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.36, 8), new THREE.MeshStandardMaterial({ color: "#efe3c4", roughness: 1 }));
  note.rotation.z = Math.PI / 2 - 0.3;
  bottle.add(glass, note);
  bottle.position.copy(shore(24, -2.2));
  root.add(bottle);

  // --- Kişiler: adam, unutmak istediği kadın, dört kadın ve "onlarca beden" koridoru / cam odalar için aynı dört kadının
  // tekrarları (kalabalık yok: aynı insanlar) ---------------------------------------------------------------------------
  type Look = "sea" | "land" | "west" | "east" | Person | readonly [number, number] | (() => THREE.Vector3);
  interface Person {
    figure: Figure;
    g: THREE.Group;
    ik: ArmIk;
    /** Yol: [saniye, s, up, yükseklik?]; iki anahtar arasında düz yürür. */
    keys: [number, number, number, number?][];
    /** Duruş: [saniye, duruş]; "move" yürürken yürüyüş, dururken duruş. */
    poses: [number, FigurePose | "move"][];
    /** Bakış: [saniye, hedef, kilit]; kilitliyse yürürken de o yöne bakar. */
    looks: [number, Look, boolean?][];
    /** Animasyon hızı: [saniye, çarpan]. */
    rates: [number, number][];
    materials: THREE.MeshStandardMaterial[];
    footing: Footing;
    scale: number;
    opacity: number;
    s: number;
    up: number;
    speed: number;
    poseEntry: [number, FigurePose | "move"] | null;
  }
  const makePerson = (kind: "man" | "woman", outfit: Outfit, height: number, hair?: string): Person => {
    const figure = createFigure({ kind, outfit, height });
    figure.group.visible = false;
    root.add(figure.group);
    const materials: THREE.MeshStandardMaterial[] = [];
    figure.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.visible || Array.isArray(mesh.material)) return;
      // Saydamlaşan beden denizden sonra çizilir (su, bedenin üstüne binmez).
      mesh.renderOrder = 3;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (hair && /Hair/i.test(material.name ?? "")) material.color.set(hair);
      if (/Superhero|Eyes/i.test(material.name ?? "")) material.color.multiplyScalar(FIGURE_TONE);
      materials.push(material);
    });
    return { figure, g: figure.group, ik: createArmIk(figure.group), keys: [], poses: [], looks: [], rates: [], materials, footing: createFooting(figure), scale: height / 1.85, opacity: 1, s: 0, up: 0, speed: 0, poseEntry: null };
  };
  const hero = makePerson("man", "man_white", 1.82);
  const lost = makePerson("woman", "woman_white", 1.7, "#1c120c");
  const w1 = makePerson("woman", "woman_blue", 1.68, "#5a3220");
  const w2 = makePerson("woman", "woman_stone", 1.73, "#14100d");
  const w3 = makePerson("woman", "woman_muted", 1.63, "#7a2e18");
  const w4 = makePerson("woman", "woman_red", 1.7, "#8a6a3c");
  const women = [w1, w2, w3, w4];
  // Tekrarlar: aynı dört kadının aynı kıyafet ve saçla ikinci görünüşleri (koridor ve cam odalar).
  const echoes = [
    makePerson("woman", "woman_blue", 1.68, "#5a3220"),
    makePerson("woman", "woman_stone", 1.73, "#14100d"),
    makePerson("woman", "woman_muted", 1.63, "#7a2e18"),
    makePerson("woman", "woman_red", 1.7, "#8a6a3c"),
    makePerson("woman", "woman_blue", 1.68, "#5a3220"),
    makePerson("woman", "woman_stone", 1.73, "#14100d"),
  ];
  const people = [hero, lost, ...women, ...echoes];
  /** Yansımada görünen kadın: yalnız yansıma kamerasının gördüğü katmanda. */
  const MIRROR_LAYER = 5;

  let songNow = 0;
  let clock = 0;
  /** Oturma yerleri ve durma noktaları (kıyı koordinatı). */
  const BENCH_FRONT: [number, number] = [R2, 1.7];
  const W4_UP: [number, number] = [R4 + 1.0, 4.61];
  const H4_UP: [number, number] = [R4 + 1.0, 4.25];
  const ROOM: [number, number] = [R3 - 2.7, 3.9];
  const LIE: [number, number] = [R2 + 0.7, 3.3];
  const LOST_NIGHT: [number, number] = [R2 + 2.3, 4.7];

  // Yollar (s, up): bütün hareket şarkının saniyesinin işlevidir; sarma ve geri sarma aynı kareyi verir.
  hero.keys = [
    [0, 0, 0.35], [30.9, 0, 0.35],
    // Gidiş: bekleyenlerin önünden batıya; beden kendi kendine iki adım daha; su kenarı.
    [39.3, A0, 0.5], [39.9, A0, 0.5], [40.5, A0 + 0.6, 0.5], [41.1, A0 + 0.6, 0.5], [41.7, A0 + 1.0, 0.5], [42.0, A0 + 1.0, 0.5],
    [43.4, M0, 0.15], [47.6, M0, 0.15], [48.4, M0, 0.5], [57.6, M0, 0.5],
    // Birinci nakarat (doğuya): ayakta bekleyen; bankta oturan; kapıdaki; masadaki.
    [60.9, R1 + HUG, PATH], [61.9, R1 + HUG, PATH], [62.7, R1 - 0.6, PATH],
    [64.6, R2 + HUG, BENCH_FRONT[1]], [65.4, R2 + HUG, BENCH_FRONT[1]], [66.0, R2 - 0.6, BENCH_FRONT[1]],
    [66.8, R3 + 0.9, GAP_UP], [67.3, R3 + 0.9, GAP_UP], [67.6, R3 + HUG, GAP_UP], [68.05, R3 + HUG, GAP_UP], [68.55, R3 - 0.6, GAP_UP],
    [69.7, SEATS[0][0], SEATS[0][1]], [71.8, SEATS[0][0], SEATS[0][1]], [72.3, H4_UP[0], H4_UP[1]], [73.0, H4_UP[0], H4_UP[1]], [73.6, H4_UP[0], 5.3],
    // Kameraya doğru yürür; arkasında dört kadın.
    [75.09, R4 - 1.2, 2.2], [80.0, 0.8, PATH],
    // Onlarca beden: aynı dört kadının tekrarlarının içinden ağır ağır yürüyerek (batıya); her geçiş görünür.
    [80.25, 0.8, PATH], [85.0, 7.4, PATH],
    // Yol ayrımı; üç yol; hepsi denize çıkar (aceleyle).
    [85.6, X_S, X_UP], [86.2, X_S, X_UP],
    [86.9, 9.4, 5.2], [87.5, 10.6, 4.0], [88.2, 10.5, 0.7], [88.45, 10.5, 0.7],
    [89.1, 9.2, 0.5], [89.8, 7.4, 0.8], [90.2, 6.8, 0.6],
    [90.8, R3 - 0.7, GAP_UP], [91.25, R3 + 0.8, GAP_UP], [91.6, R3 + 1.6, 3.1], [92.25, R3 + 1.8, 0.8],
    // Dün gece: ateşin yanına uzanır; gözlerini açar; kalkar.
    [93.6, LIE[0], LIE[1]], [100.6, LIE[0], LIE[1]],
    // İkinci kıta: bankta; izleri çıkarır; kafa sahnesi.
    [101.2, R2, BENCH_UP], [113.6, R2, BENCH_UP], [114.1, BENCH_FRONT[0], 1.85], [117.4, BENCH_FRONT[0], 1.85],
    // Kapının eşiği: girmez; döner.
    [119.0, R3 + 0.9, GAP_UP], [121.8, R3 + 0.9, GAP_UP], [122.4, R3 + 1.3, 2.4], [127.6, R1 - 1.2, 3.2], [129.4, R1 + 1.0, 3.0], [131.0, R1 + 1.6, PATH],
    // İkinci nakarat: aynı dört beden; dördüncüde durur.
    [132.3, R1 + HUG, PATH], [132.9, R1 + HUG, PATH], [133.7, R1 - 0.6, PATH],
    [134.3, R2 + 0.9, BENCH_FRONT[1]], [135.0, R2 + 0.9, BENCH_FRONT[1]], [135.2, R2 + HUG, BENCH_FRONT[1]], [135.4, R2 + HUG, BENCH_FRONT[1]], [135.9, R2 - 0.6, BENCH_FRONT[1]],
    [136.8, R3 + HUG, GAP_UP], [137.0, R3 + HUG, GAP_UP], [137.5, R3 - 0.6, GAP_UP],
    [138.9, H4_UP[0], 3.6], [139.4, H4_UP[0], 3.6], [139.9, H4_UP[0], 4.15], [140.6, H4_UP[0], 4.15], [141.4, H4_UP[0], 3.4], [144.3, H4_UP[0], 3.4],
    // Son arayış: yol kıvrılır; o kadın.
    [147.5, 13.5, 2.4], [151.5, HF, PATH], [152.6, HF, PATH], [153.3, HF + 0.6, PATH], [166.9, HF + 0.6, PATH],
    // Aynı kıyı: suya döner; beden suya yürür; kendini durdurur.
    [177.0, 0, 0.35], [178.4, 0, 0.05], [179.0, 0, 0.05], [179.5, 0, -0.05],
  ];
  hero.poses = [[0, "still"], [12, "lantern"], [23, "still"], [30.9, "move"], [69.7, "sit"], [71.8, "move"], [93.6, "lie"], [98.2, "rise"], [100.6, "move"], [101.2, "sit"], [113.6, "move"], [186.5, "kneel"]];
  hero.rates = [[93.6, 0.6], [98.2, 0.55], [99.0, 0], [99.6, 1.1], [186.5, 1], [187.8, 0.22]];
  hero.looks = [
    [0, "sea"], [26.8, w2], [30.9, "west"], [35.1, w2, true], [36.2, "west"], [42.0, "west"], [43.4, "sea"], [44.9, () => shore(M0 + 0.9, 0.2)], [46.1, "sea"], [48.4, "sea"], [57.6, "east"],
    [60.9, w1], [61.9, "east"], [64.6, w2], [65.4, "east"], [66.8, w3], [68.05, "east"], [69.7, TABLE], [72.3, w4], [73.0, "land"], [73.6, "east"],
    [80.0, "west"], [85.0, "land"], [85.6, "west"], [85.85, "east"], [86.05, "land"], [86.2, "west"], [88.2, "sea"], [88.45, "east"], [90.2, "sea"], [90.4, "west"], [92.25, "sea"],
    [92.4, "west"], [96.9, "west"], [101.2, "sea"], [113.6, "sea"], [116.9, "east"], [117.4, "east"], [119.0, w2], [121.8, "west"],
    [131.0, w1], [132.9, "east"], [134.3, w2], [135.4, "east"], [136.8, w3], [137.0, "east"], [138.9, w4], [141.4, w4], [144.3, "west"],
    [151.5, lost], [166.9, "east"], [177.0, "sea"],
  ];
  // Unutmak istediği kadın: yansımada yanında (yalnız yansıma katmanında); gece ateşin başında; sonunda gerçekten orada.
  lost.keys = [
    [0, M0 + 0.95, 0.2], [60, M0 + 0.95, 0.2], [61, LOST_NIGHT[0], LOST_NIGHT[1]], [120, LOST_NIGHT[0], LOST_NIGHT[1]], [121, LF, PATH],
    [153.9, LF, PATH], [154.6, LF - 0.6, PATH], [156.4, LF - 0.6, PATH], [158.3, HF + 0.6 + HUG, PATH], [158.9, HF + 0.6 + HUG, PATH], [159.8, HF - 0.1, PATH],
    [166, HF - 3.5, 7], [176, HF - 6, 22],
  ];
  lost.poses = [[0, "still"], [153.9, "move"], [154.6, "still"], [156.4, "move"]];
  // Geçtikten sonra yürürken gittiği yöne bakar (kilitsiz bakış, yürürken yol yönü).
  lost.looks = [[0, "sea"], [61, () => hero.g.position]];
  const lostShown = (t: number) => (t >= 96.2 && t < 99.33) || t >= 145;
  const lostMirrored = (t: number) => t >= 44.15 && t < 45.0;
  // Dört kadın: bekleyenlerdir. Sonra duraklarında: ilki patikada ayakta, ikincisi bankta, üçüncüsü geçitte (kapı),
  // dördüncüsü masada. Sonda hepsi karaya doğru yürüyüp gider.
  w1.keys = [[0, R1, PATH], [143.6, R1, PATH], [156, R1 + 4, 16]];
  w1.poses = [[0, "still"], [143.6, "move"]];
  w1.looks = [[0, () => hero.g.position], [62.8, "east", true], [70, () => hero.g.position]];
  w2.keys = [
    [0, R2 - 0.2, PATH], [35.1, R2 - 0.2, PATH], [35.6, R2 - 0.6, PATH], [48, R2 - 0.6, PATH], [49.5, R2, BENCH_UP], [64.0, R2, BENCH_UP], [64.5, BENCH_FRONT[0], BENCH_FRONT[1]],
    [83, BENCH_FRONT[0], BENCH_FRONT[1]], [88, ROOM[0], ROOM[1]], [124, ROOM[0], ROOM[1]], [130, R2, BENCH_UP], [134.0, R2, BENCH_UP], [134.4, BENCH_FRONT[0], BENCH_FRONT[1]],
    [144, BENCH_FRONT[0], BENCH_FRONT[1]], [156, R2 + 3, 16],
  ];
  w2.poses = [[0, "still"], [35.1, "move"], [49.5, "sit"], [64.0, "move"], [130, "sit"], [134.0, "move"]];
  w2.looks = [[0, () => hero.g.position], [49.5, "sea"], [64.0, () => hero.g.position], [66.0, "east", true], [70, () => hero.g.position], [88, () => shore(R3 + 0.9, GAP_UP)], [130, "sea"], [134.0, () => hero.g.position]];
  w3.keys = [[0, R3 + 0.3, PATH], [48, R3 + 0.3, PATH], [49.5, R3, GAP_UP], [83, R3, GAP_UP], [86, SEATS[3][0], SEATS[3][1]], [130, SEATS[3][0], SEATS[3][1]], [133, R3, GAP_UP], [144, R3, GAP_UP], [156, R3 + 2, 16]];
  w3.poses = [[0, "still"], [48, "move"], [86, "sit"], [130, "move"], [133, "still"], [144, "move"]];
  w3.looks = [[0, () => hero.g.position], [49.5, "west"], [66.5, () => hero.g.position], [68.55, "east", true], [70, () => hero.g.position], [86, TABLE], [133, "west"], [136.5, () => hero.g.position]];
  w4.keys = [[0, R4 + 0.6, PATH], [48, R4 + 0.6, PATH], [50, SEATS[1][0], SEATS[1][1]], [71.8, SEATS[1][0], SEATS[1][1]], [72.3, W4_UP[0], W4_UP[1]], [80, W4_UP[0], W4_UP[1]], [82, SEATS[1][0], SEATS[1][1]], [138.8, SEATS[1][0], SEATS[1][1]], [139.3, W4_UP[0], W4_UP[1]], [144.5, W4_UP[0], W4_UP[1]], [156, R4 + 1, 16]];
  w4.poses = [[0, "still"], [48, "move"], [50, "sit"], [71.8, "move"], [82, "sit"], [138.8, "move"], [144.5, "move"]];
  w4.looks = [[0, () => hero.g.position], [50, TABLE], [72.3, () => hero.g.position], [73.6, () => hero.g.position], [82, TABLE], [138.8, () => hero.g.position]];
  /** Koridor: aynı dört kadın (ve ikisi bir daha) patikada, adamın koşacağı yönde, 1 m arayla; cam odalarda da onlar. */
  const CORRIDOR = [1.6, 2.6, 3.6, 4.6, 5.6, 6.6];
  echoes.forEach((e, i) => {
    e.keys = [[0, CORRIDOR[i], PATH], [95, CORRIDOR[i], PATH]];
    e.poses = [[0, "still"]];
    e.looks = [[0, "east"]];
  });
  const echoShown = (t: number) => t >= 79.3 && t < 85.3;
  const chambersShown = (t: number) => t >= 106 && t < 113.9;

  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  const tmp3 = new THREE.Vector3();
  const tmp4 = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const lerp = THREE.MathUtils.lerp;
  const tangentYaw = (s: number, dir: 1 | -1) => {
    const a = shore(s, PATH, 0, tmp);
    const ax = a.x;
    const az = a.z;
    const b = shore(s + dir, PATH, 0, tmp);
    return Math.atan2(b.x - ax, b.z - az);
  };
  const entryAt = <T extends [number, ...unknown[]]>(table: T[], t: number): T | null => {
    let found: T | null = null;
    for (const entry of table) {
      if (entry[0] > t) break;
      found = entry;
    }
    return found;
  };
  /** rates tablosuna göre a..b arasında geçen klip süresi (sarmada tek seferlik klip doğru karesinden başlasın). */
  const clipTime = (p: Person, a: number, b: number) => {
    let total = 0;
    let at = a;
    while (at < b - 1e-4) {
      const rate = entryAt(p.rates, at)?.[1] ?? 1;
      const next = p.rates.find((r) => r[0] > at + 1e-6);
      const until = Math.min(b, next ? next[0] : b);
      total += (until - at) * rate;
      at = until;
    }
    return total;
  };
  /** Kişiyi şarkının t saniyesindeki yerine, duruşuna ve bakışına getirir. */
  const act = (p: Person, t: number, dt: number, time: number) => {
    const keys = p.keys;
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1][0] <= t) i += 1;
    const a = keys[i];
    const b = keys[Math.min(i + 1, keys.length - 1)];
    const u = b[0] > a[0] ? THREE.MathUtils.clamp((t - a[0]) / (b[0] - a[0]), 0, 1) : 0;
    p.s = a[1] + (b[1] - a[1]) * u;
    p.up = a[2] + (b[2] - a[2]) * u;
    const moving = t >= a[0] && t < b[0] && (a[1] !== b[1] || a[2] !== b[2]);
    p.speed = moving ? Math.hypot(b[1] - a[1], b[2] - a[2]) / (b[0] - a[0]) : 0;
    shore(p.s, p.up, 0, p.g.position);
    const entry = entryAt(p.poses, t);
    const pose = entry?.[1] ?? "still";
    p.figure.pose = pose === "move" ? (p.speed > 3.6 ? "sprint" : p.speed > 2.4 ? "run" : p.speed > 0.1 ? "walk" : "still") : pose;
    // Adım hızı yürüyüş hızına uyar (ayak kaymaz).
    const stride = p.figure.pose === "sprint" ? p.speed / 4.6 : p.figure.pose === "run" ? p.speed / 3 : p.figure.pose === "walk" ? p.speed / 1.55 : 1;
    p.figure.energy = p.figure.pose === "walk" || p.figure.pose === "run" || p.figure.pose === "sprint" ? (stride - 0.7) / 0.35 : 0.3;
    const look = entryAt(p.looks, t);
    let yaw: number | null = null;
    if (moving && !look?.[2]) {
      const from = shore(a[1], a[2], 0, tmp);
      const fx = from.x;
      const fz = from.z;
      const to = shore(b[1], b[2], 0, tmp);
      yaw = Math.atan2(to.x - fx, to.z - fz);
    } else if (look) {
      const target = look[1];
      if (target === "sea") yaw = yawToSea(p.g.position);
      else if (target === "land") yaw = yawToSea(p.g.position) + Math.PI;
      else if (target === "west") yaw = tangentYaw(p.s, 1);
      else if (target === "east") yaw = tangentYaw(p.s, -1);
      else {
        const q = typeof target === "function" ? target() : "g" in target ? target.g.position : shore(target[0], target[1], 0, tmp);
        if (Math.hypot(q.x - p.g.position.x, q.z - p.g.position.z) > 0.3) yaw = Math.atan2(q.x - p.g.position.x, q.z - p.g.position.z);
      }
    }
    if (yaw !== null) {
      const delta = Math.atan2(Math.sin(yaw - p.g.rotation.y), Math.cos(yaw - p.g.rotation.y));
      p.g.rotation.y += delta * (dt > 0.4 ? 1 : Math.min(1, dt * 7));
    }
    const rate = entryAt(p.rates, t)?.[1] ?? 1;
    // Önceki karenin el ve baş düzeltmeleri geri alınır (klibin yazmadığı kemikte birikmesin).
    p.ik.restore();
    // Duruş değişti ve şarkı o duruşun başından çok ilerideyse (sarma): klip aradaki süre kadar ileri alınır.
    let caughtUp = false;
    if (entry !== p.poseEntry) {
      p.poseEntry = entry;
      const behind = entry ? t - entry[0] : 0;
      if (entry && behind > 0.12) {
        p.figure.update(0, time);
        p.figure.update(Math.min(8, clipTime(p, entry[0], t)), time);
        caughtUp = true;
      }
    }
    if (!caughtUp) p.figure.update(dt * rate, time);
    // Ayaklar, dizler, sırt ve baş toprağın altına inmez.
    p.footing.settle(ground, p.scale);
  };
  const setOpacity = (p: Person, opacity: number) => {
    if (Math.abs(opacity - p.opacity) < 0.004) return;
    p.opacity = opacity;
    for (const material of p.materials) {
      material.transparent = opacity < 0.995;
      material.opacity = opacity;
    }
  };
  const flatDistance = (a: Person, b: Person) => Math.hypot(a.g.position.x - b.g.position.x, a.g.position.z - b.g.position.z);
  const bones = new Map<string, THREE.Object3D | null>();
  const boneAt = (p: Person, name: string, out: THREE.Vector3) => {
    const key = `${people.indexOf(p)}:${name}`;
    let bone = bones.get(key);
    if (bone === undefined || bone === null) {
      bone = p.g.getObjectByName(name) ?? null;
      bones.set(key, bone);
    }
    if (bone) return bone.getWorldPosition(out);
    return out.copy(p.g.position).setY(p.g.position.y + 1.2);
  };
  const boneOf = (p: Person, name: string) => {
    boneAt(p, name, tmp);
    return bones.get(`${people.indexOf(p)}:${name}`) ?? null;
  };
  /** Kişiye göre yön: sağ, yukarı, ön. */
  const axes = (p: Person, right: number, upward: number, forward: number, out: THREE.Vector3) => {
    const yaw = p.g.rotation.y;
    return out.set(-Math.cos(yaw) * right + Math.sin(yaw) * forward, upward, Math.sin(yaw) * right + Math.cos(yaw) * forward);
  };
  const smooth01 = (x: number) => {
    const k = THREE.MathUtils.clamp(x, 0, 1);
    return k * k * (3 - 2 * k);
  };
  const bump = (t: number, a: number, b: number, c: number, d: number) => THREE.MathUtils.smoothstep(t, a, b) * (1 - THREE.MathUtils.smoothstep(t, c, d));
  const beatAt = (t: number, from: number, length = 0.34) => (t >= from && t < from + length ? Math.sin(((t - from) / length) * Math.PI) : 0);

  // --- Adamın elindeki kibrit -----------------------------------------------------------------------------------------
  const handMatch = new THREE.Group();
  const handStick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.09, 6), new THREE.MeshStandardMaterial({ color: "#d9c9a0", roughness: 0.9 }));
  handStick.position.y = 0.045;
  const handHead = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), new THREE.MeshStandardMaterial({ color: "#3a1210", roughness: 0.6 }));
  handHead.position.y = 0.09;
  const handFlame = glowSprite("#ffb050", 0.16);
  handFlame.position.y = 0.105;
  handMatch.add(handStick, handHead, handFlame);
  hero.figure.hold(handMatch);
  const flameAt = () => handFlame.getWorldPosition(new THREE.Vector3());

  // Sarılmalar: [saran, sarılan, başlangıç, bitiş]. Kollar gerçekten ötekinin sırtına dolanır (IK). Aynı eylem kuralı:
  // temas, sarılma, giriş, geçiş, çıkış, iz. İkinci turda dördüncüye sarılmaz.
  const HUGS: [Person, Person, number, number][] = [
    [hero, w1, 60.9, 61.9], [hero, w2, 64.8, 65.4], [hero, w3, 67.6, 68.05], [hero, w4, 72.4, 73.0],
    [hero, w1, 132.3, 132.9], [hero, w2, 135.2, 135.4], [hero, w3, 136.8, 137.0],
    [lost, hero, 158.3, 158.9],
  ];
  const hug = (p: Person, q: Person, weight: number) => {
    if (p === hero) {
      // Adam kadının sırtından sarar: eller kürek kemiklerinin üstünde, sırtın dışında.
      const back = boneAt(q, "spine_02", tmp);
      p.ik.reach("r", tmp2.copy(back).add(axes(q, -0.13, 0.1, -0.21, tmp3)), weight, axes(p, 1, -0.5, 0.2, tmp4));
      p.ik.reach("l", tmp2.copy(back).add(axes(q, 0.13, 0.02, -0.21, tmp3)), weight, axes(p, -1, -0.5, 0.2, tmp4));
      return;
    }
    // Kadın kollarını boynuna dolar (kolu adamın sırtına yetişmez, böğrüne giriyordu): eller ensesinin iki yanında.
    const neck = boneAt(q, "neck_01", tmp);
    p.ik.reach("r", tmp2.copy(neck).add(axes(q, -0.1, -0.04, -0.11, tmp3)), weight, axes(p, 1, -0.3, 0.2, tmp4));
    p.ik.reach("l", tmp2.copy(neck).add(axes(q, 0.1, -0.06, -0.11, tmp3)), weight, axes(p, -1, -0.3, 0.2, tmp4));
  };
  /**
   * Sarılırken iki beden kendi soluna biraz kayar ve baş yana döner: başlar birbirinin omzunun üstünden geçer
   * (yüz yüze duran iki baş iç içe giriyordu).
   */
  const hugStance = (p: Person, weight: number) => {
    p.g.position.add(axes(p, -0.075 * weight, 0, 0, tmp3));
    p.g.updateMatrixWorld(true);
  };
  const rightOf = new THREE.Vector3();
  /** Klip duruşlarının üstüne eller: sarılma, kendiliğinden uzanan el, göğse dokunma, izleri çıkarma, eski hareketler. */
  const gestures = (t: number, time: number) => {
    for (const [p, q, t0, t1] of HUGS) {
      const weight = THREE.MathUtils.smoothstep(t, t0 - 0.3, t0 + 0.15) * (1 - THREE.MathUtils.smoothstep(t, t1 - 0.05, t1 + 0.35));
      if (weight <= 0.001) continue;
      hugStance(p, weight);
      hugStance(q, weight);
      hug(p, q, weight);
      hug(q, p, weight);
      p.ik.tilt("Head", UP, 0.32 * weight);
      q.ik.tilt("Head", UP, 0.32 * weight);
    }
    const front = (right: number, height: number, forward: number, out: THREE.Vector3) => out.copy(hero.g.position).add(axes(hero, right, height, forward, tmp4));
    const chest = (out: THREE.Vector3) => boneAt(hero, "spine_03", out).add(axes(hero, -0.05, 0.07, 0.16, tmp4));
    axes(hero, 1, 0, 0, rightOf);
    // Kibriti çakış: sol el alevin ucuna gider, çekilir.
    const strike = bump(t, 13.4, 13.9, 14.05, 14.5);
    if (strike > 0) hero.ik.reach("l", handFlame.getWorldPosition(tmp), strike, axes(hero, -1, -0.4, 0.2, tmp2));
    // Beden otomatik: sağ el kendiliğinden boşluğa uzanır, hiçbir şey tutmaz, geri gelir; eline bakar.
    const auto = bump(t, 41.3, 41.8, 42.5, 43.0);
    if (auto > 0) {
      const grab = bump(t, 41.9, 42.1, 42.3, 42.5);
      hero.ik.reach("r", front(0.22, 1.2, 0.55 - grab * 0.05, tmp), auto, axes(hero, 1, -0.7, 0, tmp2));
      hero.ik.tilt("Head", rightOf, 0.45 * auto * TILT);
    }
    // Suya eğilip bakış (yansıma): baş aşağı.
    const water = bump(t, 43.3, 43.8, 44.8, 45.1) + bump(t, 46.1, 46.5, 47.3, 47.7);
    if (water > 0) hero.ik.tilt("Head", rightOf, 0.55 * Math.min(1, water) * TILT);
    // Kalbin boş yeri: eli göğsüne gider; katman açılır; eli üstüne kapar.
    const touch = bump(t, 52.8, 53.6, 57.0, 57.6) + bump(t, 163.3, 163.9, 166.2, 166.8);
    if (touch > 0) hero.ik.reach("r", chest(tmp), Math.min(1, touch), axes(hero, 1, -0.8, 0.3, tmp2));
    const down = bump(t, 53.0, 53.8, 57.0, 57.6) + bump(t, 126.9, 127.6, 130.6, 131.1) + bump(t, 163.3, 163.9, 166.2, 166.8);
    if (down > 0) hero.ik.tilt("Head", rightOf, 0.45 * Math.min(1, down) * TILT);
    // Dördüncü kadın masada elini ona uzatır.
    const offer = bump(t, 69.0, 69.5, 70.6, 71.0);
    if (offer > 0) w4.ik.reach("l", front(0.1, 0.72, 0.3, tmp), offer, axes(w4, -1, -0.6, 0, tmp2));
    // Üçüncü kadın kapıda ona uzanır.
    const reach3 = bump(t, 66.8, 67.2, 67.5, 67.8);
    if (reach3 > 0) w3.ik.reach("r", boneAt(hero, "spine_03", tmp), reach3 * 0.8, axes(w3, 1, -0.6, 0, tmp2));
    // İkinci kadın ayağa kalkınca eli eline dokunur.
    const touch2 = bump(t, 64.6, 64.85, 65.0, 65.2);
    if (touch2 > 0) {
      hero.ik.reach("r", boneAt(w2, "hand_l", tmp), touch2, axes(hero, 1, -0.7, 0, tmp2));
      w2.ik.reach("l", hero.ik.hand("r", tmp), touch2, axes(w2, -1, -0.7, 0, tmp2));
    }
    // Yol ayrımı: sağa, sola, ileri; başı döner.
    // İzleri çıkarma: sol eli sağ kolundaki ipliğe, sağ eli omzundaki saç teline, sonra yakadaki kumaşa; ruj çıkmaz.
    const pick1 = bump(t, 101.3, 101.6, 101.9, 102.2);
    if (pick1 > 0) hero.ik.reach("l", boneAt(hero, "lowerarm_r", tmp).add(axes(hero, 0, 0.02, 0.05, tmp4)), pick1, axes(hero, -1, -0.6, 0.2, tmp2));
    const look1 = bump(t, 101.8, 102.0, 102.3, 102.6);
    if (look1 > 0) hero.ik.reach("l", front(-0.08, 1.05, 0.34, tmp), look1, axes(hero, -1, -0.6, 0, tmp2));
    const pick2 = bump(t, 102.8, 103.1, 103.4, 103.7);
    if (pick2 > 0) hero.ik.reach("r", boneAt(hero, "clavicle_l", tmp).add(axes(hero, -0.04, 0.02, 0.1, tmp4)), pick2, axes(hero, 1, -0.6, 0.3, tmp2));
    const pick3 = bump(t, 104.2, 104.5, 104.8, 105.1);
    if (pick3 > 0) hero.ik.reach("r", boneAt(hero, "neck_01", tmp).add(axes(hero, 0.04, -0.05, 0.1, tmp4)), pick3, axes(hero, 1, -0.6, 0.3, tmp2));
    const rub = bump(t, 105.3, 105.6, 105.9, 106.1);
    if (rub > 0) hero.ik.reach("r", boneAt(hero, "neck_01", tmp).add(axes(hero, -0.05 + Math.sin(time * 14) * 0.02, -0.06, 0.1, tmp4)), rub, axes(hero, 1, -0.6, 0.3, tmp2));
    const lookDown = bump(t, 101.3, 101.7, 105.9, 106.2);
    if (lookDown > 0) hero.ik.tilt("Head", rightOf, 0.4 * lookDown * TILT);
    // Dün gece: gözlerini açar, ona döner (başı).
    const wake = bump(t, 97.4, 97.9, 99.2, 99.4);
    if (wake > 0) hero.ik.tilt("Head", tmp.set(0, 1, 0), 0.5 * wake);
    // İkinci otomatik beden: eli bir omza uzanır, durur; olmayan birine sarılır; yakasını düzeltir; kapıya döner.
    const shoulder = bump(t, 114.3, 114.7, 115.0, 115.3);
    if (shoulder > 0) hero.ik.reach("r", front(0.3, 1.42, 0.55, tmp), shoulder, axes(hero, 1, -0.6, 0, tmp2));
    const embrace = bump(t, 115.3, 115.8, 116.0, 116.3);
    if (embrace > 0) {
      hero.ik.reach("r", front(0.18, 1.27, 0.45, tmp), embrace, axes(hero, 1, -0.4, 0.2, tmp2));
      hero.ik.reach("l", front(-0.18, 1.2, 0.45, tmp), embrace, axes(hero, -1, -0.4, 0.2, tmp2));
    }
    const shirt = bump(t, 116.3, 116.6, 116.8, 117.0);
    if (shirt > 0) {
      hero.ik.reach("r", boneAt(hero, "neck_01", tmp).add(axes(hero, 0.08, -0.08, 0.1, tmp4)), shirt, axes(hero, 1, -0.6, 0.2, tmp2));
      hero.ik.reach("l", boneAt(hero, "neck_01", tmp).add(axes(hero, -0.08, -0.08, 0.1, tmp4)), shirt, axes(hero, -1, -0.6, 0.2, tmp2));
    }
    // İkinci nakarat, dördüncü: el uzanır, dokunmadan durur, iner.
    const almost = bump(t, 139.5, 139.9, 140.3, 140.8);
    if (almost > 0) {
      hero.ik.reach("r", boneAt(w4, "spine_03", tmp).add(axes(w4, 0.12, 0, 0.3, tmp4)), almost * 0.8, axes(hero, 1, -0.6, 0, tmp2));
      w4.ik.reach("l", boneAt(hero, "spine_03", tmp).add(axes(hero, -0.1, 0, 0.3, tmp4)), almost * 0.7, axes(w4, -1, -0.6, 0, tmp2));
    }
    // İzler dökülünce: iki eline bakar.
    const hands = bump(t, 143.2, 143.6, 144.0, 144.4);
    if (hands > 0) {
      hero.ik.reach("r", front(0.13, 1.16, 0.34, tmp), hands, axes(hero, 1, -0.8, 0, tmp2));
      hero.ik.reach("l", front(-0.13, 1.14, 0.34, tmp), hands, axes(hero, -1, -0.8, 0, tmp2));
      hero.ik.tilt("Head", rightOf, 0.35 * hands * TILT);
    }
    // Son: diz çöker; elleri yere dokunur.
    const ground2 = bump(t, 187.8, 188.6, 199, 200);
    if (ground2 > 0) {
      hero.ik.reach("r", front(0.22, 0.03, 0.45, tmp).setY(ground(tmp.x, tmp.z) + 0.03), ground2, axes(hero, 1, 0.3, 0.2, tmp2));
      hero.ik.reach("l", front(-0.2, 0.03, 0.42, tmp).setY(ground(tmp.x, tmp.z) + 0.03), ground2, axes(hero, -1, 0.3, 0.2, tmp2));
    }
  };

  // Bedenin içi: geçiş sırasında saydamlaşan gövdede görünen yumuşak kumaş katmanları, ışıktan bir koridor (organ yok).
  const inner = new THREE.Group();
  const foldCanvas = document.createElement("canvas");
  foldCanvas.width = 64;
  foldCanvas.height = 256;
  {
    const g = foldCanvas.getContext("2d")!;
    const image = g.createImageData(64, 256);
    for (let y = 0; y < 256; y += 1) {
      for (let x = 0; x < 64; x += 1) {
        const u = x / 63;
        const v = y / 255;
        const alpha = Math.pow(Math.sin(Math.PI * u), 1.6) * Math.pow(Math.sin(Math.PI * v), 0.9) * (0.75 + 0.25 * Math.sin(v * 17 + u * 5));
        const o = (y * 64 + x) * 4;
        image.data[o] = image.data[o + 1] = image.data[o + 2] = 255;
        image.data[o + 3] = Math.round(255 * THREE.MathUtils.clamp(alpha, 0, 1));
      }
    }
    g.putImageData(image, 0, 0);
  }
  const foldTexture = new THREE.CanvasTexture(foldCanvas);
  const veils = Array.from({ length: 5 }, (_, i) => {
    const veil = new THREE.Mesh(
      new THREE.PlaneGeometry(0.2 + (i % 2) * 0.06, 0.95, 1, 6),
      new THREE.MeshStandardMaterial({ color: ["#ecd9c6", "#f3e9dc", "#e2c5ad", "#f6efe6", "#e9d2bd"][i], map: foldTexture, roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0, depthWrite: false }),
    );
    veil.position.set((i - 2) * 0.055, 1.02 + (i % 3) * 0.06, ((i * 37) % 5) * 0.035 - 0.07);
    veil.rotation.y = (i - 2) * 0.5;
    veil.renderOrder = 2;
    inner.add(veil);
    return veil;
  });
  inner.visible = false;
  root.add(inner);

  // Soluk kalp: göğüs katmanı açılınca içinde görünen, neredeyse yok olmuş küçük bir kalp (parlamaz).
  const dimHeart = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshStandardMaterial({ color: "#4a2a2e", roughness: 0.8, transparent: true, opacity: 0 }));
  dimHeart.scale.set(1, 1.15, 0.8);
  dimHeart.renderOrder = 4;
  root.add(dimHeart);

  // --- İzler: her beden adamın üstünde bir şey bırakır (kolunda iplik, omzunda saç teli, yakasında kumaş, yakasında ruj).
  const painter = createSkinPainter(hero.g);
  const threadMaterial = new THREE.MeshStandardMaterial({ color: "#cfc8b6", roughness: 1 });
  const hairMaterial = new THREE.MeshStandardMaterial({ color: "#14100d", roughness: 0.55 });
  const scrapMaterial = new THREE.MeshStandardMaterial({ color: "#6e7a8e", roughness: 0.95, side: THREE.DoubleSide });
  interface Trace {
    tube: Tube | null;
    mesh: THREE.Mesh | null;
    bone: string;
    offset: [number, number, number];
    hang: [number, number, number];
    radius: number;
    /** Takılı olduğu aralıklar: [belirdiği an, düştüğü an]. */
    spans: [number, number][];
    seed: number;
    /** Düştüğü yerler (her aralık için). */
    rest: THREE.Vector3[];
  }
  const makeTrace = (kind: "thread" | "hair" | "scrap", bone: string, offset: [number, number, number], hang: [number, number, number], spans: [number, number][], rests: [number, number][]): Trace => {
    let tube: Tube | null = null;
    let mesh: THREE.Mesh | null = null;
    if (kind === "scrap") {
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.045), scrapMaterial);
      mesh.visible = false;
      root.add(mesh);
    } else {
      tube = createTube(kind === "thread" ? threadMaterial : hairMaterial, 8, 4);
      root.add(tube.mesh);
    }
    return { tube, mesh, bone, offset, hang, radius: kind === "thread" ? 0.0026 : 0.0018, spans, seed: random() * 6, rest: rests.map(([s, up]) => shore(s, up, 0.012)) };
  };
  const traces: Trace[] = [
    makeTrace("thread", "lowerarm_r", [0.03, -0.02, 0.05], [0.02, -0.26, 0.03], [[62.5, 101.9], [133.4, FALL_AT]], [[R2 + 0.3, BENCH_UP - 0.5], [H4_UP[0] - 0.2, 3.2]]),
    makeTrace("hair", "clavicle_l", [-0.06, 0.05, 0.1], [-0.03, -0.2, 0.04], [[65.9, 103.5], [135.8, FALL_AT + 0.45]], [[R2 - 0.2, BENCH_UP - 0.55], [H4_UP[0] + 0.15, 3.25]]),
    makeTrace("scrap", "neck_01", [0.05, -0.06, 0.09], [0, 0, 0], [[68.4, 104.9], [137.4, FALL_AT + 0.9]], [[R2 + 0.1, BENCH_UP - 0.7], [H4_UP[0], 3.1]]),
  ];
  /** Yakadaki ruj izi (dokuya işlenir): dördüncüden kalır; ikinci kıtada çıkmaz; ikinci nakaratın sonunda solar. */
  const MARK: [number, number, number, string] = [-0.045, 0.83, 0.014, "150,24,38"];
  const MARK_AT = 73.4;
  const MARK_FADE = FALL_AT + 1.2;
  let markSample: { x: number; y: number } | null = null;
  let heartSample: { x: number; y: number } | null = null;
  let markKey = -1;
  const flake = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.02), new THREE.MeshStandardMaterial({ color: `rgb(${MARK[3]})`, roughness: 1, side: THREE.DoubleSide }));
  flake.visible = false;
  root.add(flake);
  /** Kalbin atışı (göğüs hafifçe kabarır; gömleğin altında sıcak bir nabız): ikinci kıtada iki atış, sonda iki atış daha. */
  const pulseAt = (t: number) => Math.max(0.7 * beatAt(t, 128.0, 0.4), 0.7 * beatAt(t, 129.3, 0.4), beatAt(t, 164.2, 0.42), beatAt(t, 165.7, 0.42), 0.35 * beatAt(t, 56.2, 0.5));
  /** Göğüs katmanının açık olduğu an (kalbin soluk göründüğü yer). */
  const layerAt = (t: number) => bump(t, 54.6, 55.4, 56.9, 57.4);

  // --- Kafa sahnesi: başının çevresinde dört cam oda; içlerinde aynı dört kadın; her odaya bir demir kilitli. ----------
  interface Chamber {
    group: THREE.Group;
    glass: THREE.MeshStandardMaterial;
    metal: THREE.MeshStandardMaterial[];
    anchor: THREE.Group;
    chain: Tube;
    appear: number;
    /** Başa göre yer: sağ, yukarı (tabanın yüksekliği), ön. */
    at: [number, number, number];
  }
  const glassBase = new THREE.MeshStandardMaterial({ color: "#d4e2ea", roughness: 0.32, metalness: 0.1, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const frameBase = new THREE.MeshStandardMaterial({ color: "#2a2c30", roughness: 0.4, metalness: 0.7, transparent: true, opacity: 0 });
  const chainMaterial = new THREE.MeshStandardMaterial({ color: "#3a3b3e", roughness: 0.5, metalness: 0.7 });
  const CHAMBER_R = 0.52;
  const CHAMBER_H = 2.0;
  const chambers: Chamber[] = [[-1.45, 0.3, -0.1, 106.4], [1.45, 0.3, -0.1, 107.9], [-0.95, 0.3, -1.35, 109.4], [0.95, 0.3, -1.35, 110.9]].map(([r, up, f, appear]) => {
    const group = new THREE.Group();
    const glass = glassBase.clone();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(CHAMBER_R, CHAMBER_R, CHAMBER_H, 32, 1, true), glass);
    tube.position.y = CHAMBER_H / 2;
    tube.renderOrder = 5;
    const metal = [frameBase.clone(), frameBase.clone()];
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(CHAMBER_R + 0.03, CHAMBER_R + 0.03, 0.05, 32), metal[0]);
    const ringTop = new THREE.Mesh(new THREE.TorusGeometry(CHAMBER_R, 0.025, 8, 32), metal[1]);
    ringTop.rotation.x = Math.PI / 2;
    ringTop.position.y = CHAMBER_H;
    // Kapı: önde iki ince kasa çubuğu ve bir kol.
    for (const side of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, CHAMBER_H, 0.025), metal[1]);
      bar.position.set(Math.sin(side * 0.42) * CHAMBER_R, CHAMBER_H / 2, Math.cos(side * 0.42) * CHAMBER_R);
      group.add(bar);
    }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.04), metal[1]);
    handle.position.set(Math.sin(0.3) * (CHAMBER_R + 0.02), 1.0, Math.cos(0.3) * (CHAMBER_R + 0.02));
    // Kilit: tabanın altında, zincirin bağlandığı kutu.
    const lock = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.11, 0.05), metal[0]);
    lock.position.set(0, -0.1, CHAMBER_R * 0.6);
    group.add(tube, floor, ringTop, handle, lock);
    root.add(group);
    const anchor = makeAnchor();
    anchor.visible = false;
    const chain = createTube(chainMaterial, 10, 5);
    root.add(chain.mesh);
    group.visible = false;
    return { group, glass, metal, anchor, chain, appear, at: [r, up, f] as [number, number, number] };
  });

  // --- Yansıma: suyun kenarında sakin su bir aynadır; o kadın yalnız yansımada, onun yanında görünür. ---------------------
  const mirror = new Reflector(new THREE.CircleGeometry(4.2, 48), {
    textureWidth: 1024,
    textureHeight: 1024,
    clipBias: 0.003,
    shader: {
      name: "SeaMirror",
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uFade: { value: 0 } },
      vertexShader: /* glsl */ `
        uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vLocal;
        void main() { vUv = textureMatrix * vec4(position, 1.0); vLocal = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform float uFade; varying vec4 vUv; varying vec2 vLocal;
        void main() {
          vec4 base = texture2DProj(tDiffuse, vUv);
          float edge = 1.0 - smoothstep(2.8, 4.2, length(vLocal));
          gl_FragColor = vec4(base.rgb * 0.72 + vec3(0.01, 0.015, 0.03), edge * uFade * 0.9);
        }
      `,
    },
  });
  (mirror.material as THREE.ShaderMaterial).transparent = true;
  (mirror.material as THREE.ShaderMaterial).depthWrite = false;
  mirror.rotation.x = -Math.PI / 2;
  mirror.renderOrder = 2;
  mirror.visible = false;
  root.add(mirror);
  /** Yansıma kamerası (Reflector her görüntü kamerası için bir kopya kurar): yansıma katmanını da görür. */
  const mirrorCameras = (mirror as unknown as { _reflectionCameras: WeakMap<THREE.Camera, THREE.Camera> })._reflectionCameras;
  const setLayer = (p: Person, layer: number) => {
    p.g.traverse((child) => child.layers.set(layer));
  };

  // Kapağın yazıları (gökteki başlık, yamaçtaki REDD) film boyunca gizlenir: ekranda yazı yok.
  let coverText: THREE.Object3D[] = [];
  const coverTexts = () => (coverText.length ? coverText : (coverText = kit.scene.children.filter((o) => o.userData.coverText === true)));

  // --- Karartma katmanı: göz kırpma (kadın kaybolur) ve son karede siyah ---------------------------------------------
  const blackout = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 1, depthTest: false, depthWrite: false, fog: false }));
  blackout.position.z = -0.1;
  blackout.renderOrder = 1000;
  blackout.frustumCulled = false;
  blackout.visible = false;
  kit.camera.add(blackout);

  // --- Çekim yardımcıları -----------------------------------------------------------------------------------------
  /** Kişiye göre nokta: right sağına, forward baktığı yöne, h ayak hizasından yukarı. */
  const rel = (p: Person, right: number, h: number, forward: number) => () => {
    const yaw = p.g.rotation.y;
    const o = p.g.position;
    return new THREE.Vector3(o.x - Math.cos(yaw) * right + Math.sin(yaw) * forward, o.y + h, o.z + Math.sin(yaw) * right + Math.cos(yaw) * forward);
  };
  /** Adamla birlikte kıyı boyunca kayan nokta (kıyı koordinatında). */
  const track = (ds: number, up: number, h: number) => () => shore(hero.s + ds, up, h);
  const bodyOf = (p: Person, h = 1.2) => () => p.g.position.clone().setY(p.g.position.y + h);
  const between = (a: Person, b: Person, h: number) => () => a.g.position.clone().add(b.g.position).multiplyScalar(0.5).setY((a.g.position.y + b.g.position.y) / 2 + h);
  const shipAt = (index: number, h: number) => () => ships[index].group.position.clone().setY(ships[index].group.position.y + h);
  const headAt = (dy = 0) => () => boneAt(hero, "Head", new THREE.Vector3()).add(new THREE.Vector3(0, dy, 0));
  // Kamera kimsenin içine girmez (bilinçli beden geçişi çekimi dışında).
  const clearCam = (p: THREE.Vector3): THREE.Vector3 => {
    for (const person of people) {
      if (!person.g.visible) continue;
      const base = person.g.position;
      if (p.y < base.y - 0.1 || p.y > base.y + 1.95) continue;
      const dx = p.x - base.x;
      const dz = p.z - base.z;
      const d = Math.hypot(dx, dz);
      if (d >= 0.45) continue;
      const ux = d > 1e-3 ? dx / d : Math.sin(person.g.rotation.y);
      const uz = d > 1e-3 ? dz / d : Math.cos(person.g.rotation.y);
      p.x = base.x + ux * 0.47;
      p.z = base.z + uz * 0.47;
    }
    return p;
  };
  const clearPoint = (point: THREE.Vector3 | (() => THREE.Vector3)) => () => clearCam((typeof point === "function" ? point() : point).clone());
  const withClearance = (list: Shot[]): Shot[] =>
    list.map((shot) => ({ ...shot, from: shot.from ? clearPoint(shot.from) : shot.from, to: shot.to ? clearPoint(shot.to) : shot.to, path: shot.path?.map((pt) => clearPoint(pt)) }));
  /**
   * Ana nakarat: aynı görsel cümle iki kez; dört beden, dört kamera dili: ayakta sarılma / ileriden; oturandan
   * kalkma / yandan izleme; kapı / arkadan izleme; masa / yakın ikili.
   */
  const refrainShots = (times: [number, number, number, number, number], second: boolean): Shot[] =>
    withClearance([
      // 1: ileriden (kadının arkasından, çapraz): iki kişi görünür; sarılır; içinden geçer; sırtından kameraya çıkar.
      { at: times[0], from: at(R1 - 2.6, PATH - 1.6, 1.5), to: at(R1 - 2.2, PATH - 1.3, 1.45), look: at(R1 + 0.2, PATH, 1.15), fov: 36, curve: "linear", grade: PASS },
      // 2: yandan izleme (deniz tarafından): bankta oturan kalkar, dokunur, sarılır, geçer.
      { at: times[1], from: () => shore(THREE.MathUtils.lerp(R2 + 1.4, R2 - 0.9, THREE.MathUtils.clamp((songNow - times[1]) / (times[2] - times[1]), 0, 1)), -1.3, 1.35), to: () => shore(THREE.MathUtils.lerp(R2 + 1.4, R2 - 0.9, THREE.MathUtils.clamp((songNow - times[1]) / (times[2] - times[1]), 0, 1)), -1.3, 1.35), look: between(hero, w2, 1.15), fov: 40, curve: "linear", grade: PASS },
      // 3: kapı: arkasından izleme; geçidin ağzında duraksar; içinden geçer.
      { at: times[2], from: rel(hero, 0.3, 1.62, -2.1), to: rel(hero, 0.3, 1.6, -1.9), look: rel(hero, 0, 1.3, 1.6), fov: 40, curve: "linear", grade: PASS },
      // 4: masa: yakın ikili (oturak hizasında); ikinci turda dokunmadan durur.
      { at: times[3], from: at(R4 + 2.3, 3.2, 1.05), to: at(R4 + 2.1, 3.3, 1.05), look: at(R4 + 0.8, 4.6, 0.95), fov: second ? 36 : 38, curve: "linear", grade: PASS },
      { at: times[4], from: at(R4 + 2.9, 4.3, 1.45), to: at(R4 + 2.6, 4.4, 1.45), look: between(hero, w4, 1.2), fov: 38, curve: "linear", grade: PASS },
    ]);

  const ignite = (ship: Ship) => {
    ship.litAt = Math.min(ship.litAt, songNow);
    kit.sfx.cue("ignite");
  };
  const shipTargets = ships.map((ship) =>
    gazeTarget({
      position: (target) => target.copy(ship.group.position).setY(ship.group.position.y + 3),
      radius: 5,
      reach: 120,
      label: () => (songNow >= ship.litAt ? null : "Gemiyi ateşe ver"),
      use: () => {
        ignite(ship);
        const burning = ships.filter((other) => songNow >= other.litAt).length;
        announce(kit.hud, burning === SHIPS ? "Bütün gemiler yanıyor. Dönüş yok." : `Yanan gemiler ${burning} / ${SHIPS}`, burning === SHIPS ? 6 : 3);
      },
    }),
  );
  let letter = -1;
  const bottleSecret = secretItem(kit, "kalpsiz-sise", (target) => target.copy(bottle.position), {
    label: "Şişedeki mektubu oku",
    radius: 0.8,
    reach: 4,
    available: () => seaLevel > SEA - 1,
    onFound: () => {
      letter = 0;
      kit.sfx.cue("whoosh");
    },
  });
  // Gizli keşif: cam odalardan birinin kilidini dene (kafa sahnesinde).
  let tries = 0;
  const lockSecret = gazeTarget({
    position: (target) => target.copy(chambers[0].group.position).setY(chambers[0].group.position.y + 1),
    radius: 0.9,
    reach: 6,
    label: () => (kit.secrets.has("kalpsiz-demir") || !chambersShown(songNow) ? null : "Kilidi açmayı dene"),
    use: () => {
      tries += 1;
      kit.sfx.cue("deny");
      if (tries < 3) announce(kit.hud, tries === 1 ? "Kilitli." : "Demir tutuyor.", 3);
      else kit.secrets.reveal("kalpsiz-demir");
    },
  });

  // Söndükten sonra gemiden ince bir duman yükselir (ışımaz).
  const smokes = ships.map(() => {
    const smoke = createEmitter({ count: 60, colors: ["#5a5a60", "#2a2a2e"], size: 1.4, life: 6, spread: new THREE.Vector3(0.8, 0.3, 0.8), velocity: new THREE.Vector3(0.2, 1.3, 0.1), jitter: 0.4, gravity: 0, additive: false, loop: true });
    root.add(smoke.points);
    return smoke;
  });

  return {
    root,
    hint: "Kraterdeki gemilere bak ve E ile ateşe ver. Kıyıda bir adam, bekleyenler ve sönmeyen gemiler var.",
    interactables: [...shipTargets, bottleSecret, lockSecret],
    beats: [
      { at: 0, id: "coast", line: "Kıyı, akşam mavisi; tek başına bir adam; elinde bir kibrit." },
      { at: 14, id: "strike", line: "Kibriti çakar; alevden suya." },
      { at: L.night, id: "ships", line: "Gemiler birer birer tutuşur; patlama yok." },
      { at: L.seas, id: "sea", line: "Su bir kez yorgun bir yüze benzer." },
      { at: L.waitGo, id: "waiters", line: "Kıyıda bekleyen dört kişi." },
      { at: L.waiters, id: "leave", line: "Yürüyüp gider; biri bir adım atar, durur." },
      { at: L.auto, id: "auto", line: "Durur; ayağı bir adım daha atar; eli boşluğu tutar." },
      { at: L.love, id: "mirror", line: "Suda yansıması; bir an yanında o kadın; döner: kimse yok." },
      { at: L.saved, id: "heart", line: "Göğsüne dokunur; katmanın altında soluk bir kalp." },
      { at: L.paper, id: "ahead", line: "İlerde bekleyen bir kadın." },
      { at: L.chorus, id: "pass1", line: "Sarılır; içinden geçer; kolunda bir iplik." },
      { at: L.forget, id: "pass2", line: "Bankta oturan kalkar; geçer; omzunda bir saç teli." },
      { at: L.bodies, id: "pass3", line: "Kapıdaki; duraksar; geçer; yakasında kumaş." },
      { at: L.trips, id: "pass4", line: "Masada oturur; kalkarlar; geçer; yakasında ruj; dönüp bakmaz." },
      { at: L.chorusB, id: "payoff", line: "Kameraya yürür; dördü arkasında; üstü izlerle dolu." },
      { at: L.bodiesB, id: "dozens", line: "Aynı dört kadın bir koridor olur; duraksamadan geçer." },
      { at: 85.2, id: "crossroads", line: "Yol ayrımı; üç yol; hepsi aynı denize çıkar." },
      { at: L.lastNight, id: "lastnight", line: "Ateşin yanına uzanır; gözlerini açınca o kadın orada; kırpınca yok." },
      { at: L.pass, id: "traces", line: "İplik, saç, kumaş: tek tek çıkarır; ruj çıkmaz." },
      { at: L.anchor, id: "anchor", line: "Kafasının çevresinde cam odalar; içlerinde kadınlar; demirler kilitli." },
      { at: 113.6, id: "habits", line: "Eli omza uzanır; kimseye sarılır; yakasını düzeltir; kapıya döner." },
      { at: L.love2, id: "doorway", line: "Kapının eşiğinde durur; girmez; döner." },
      { at: L.saved2, id: "heartbeat", line: "Göğsü: bir atış, bir atış daha." },
      { at: L.chorus2, id: "pass1b", line: "Aynı geçiş: daha yavaş." },
      { at: L.forget2, id: "pass2b", line: "Dokunmadan önce duraksar." },
      { at: L.bodies2, id: "pass3b", line: "Uzak, kayıtsız." },
      { at: L.trips2, id: "pass4b", line: "Neredeyse girer; durur. İzler dökülür." },
      { at: L.chorus2b, id: "search", line: "Her yol ona çıkar." },
      { at: L.trips3, id: "meet", line: "Birkaç metre: bir adım, bir adım; ayrı durmak." },
      { at: 156.4, id: "reverse", line: "O, onun içinden geçip gider." },
      { at: 163, id: "pulse", line: "Kalbi açıkça atıyor." },
      { at: 166.9, id: "shore", line: "Aynı kıyı; ateşler neredeyse sönmüş." },
      { at: 177, id: "stop", line: "Beden suya yürür; kendini durdurur." },
      { at: 182, id: "release", line: "Son gemi söner." },
      { at: 186.5, id: "kneel", line: "Diz çöker; elleri toprakta; kamera uzaklaşır." },
    ],
    shots: [
      ...withClearance([
        // AÇILIŞ: çok geniş. Adam suyun kenarında; su, ufuk, kara, gök. Elinde tek bir kibrit.
        { at: 0, from: at(-1.9, 16, 2.6), to: at(-1.9, 13, 2.3), look: at(-1.6, -3.2, 0.9), fov: 38, curve: "linear", grade: COAST, in: "fade" },
        { at: 10, from: rel(hero, -2.6, 1.6, 2.8), to: rel(hero, -0.9, 1.55, 1.5), look: bodyOf(hero, 1.45), fov: 38, fovTo: 34, curve: "ease", grade: COAST },
        { at: 14.6, from: rel(hero, -0.9, 1.55, 1.5), to: rel(hero, -0.7, 1.56, 1.3), look: bodyOf(hero, 1.6), lookTo: () => flameAt().lerp(bodyOf(hero, 1.62)(), 0.5), fov: 34, fovTo: 24, curve: "ease", grade: FIREG },
        // Alevden suya: ilk gemi tutuşur; bir gemi, bir gemi daha.
        { at: L.night, from: at(0.8, 0.5, 1.5), to: at(1.2, 1.2, 1.7), look: shipAt(0, 2.5), lookTo: at(-1, -18, 2), fov: 9, fovTo: 42, curve: "ease", grade: FIREG },
        // Deniz yoruldu: kamera suyun üstüne çıkar, aşağı bakar; bir kez yüz.
        { at: L.seas, from: at(1.2, 1.2, 1.7), to: at(1.5, -5.4, 10.6), look: at(-1, -18, 2), lookTo: at(1.5, -9.6, 0), fov: 42, fovTo: 46, curve: "ease", grade: FIREG },
        // Yüz: suyun üstünde, tepeden; yavaş bir iniş (bir kez).
        { at: 23.9, from: at(1.5, -5.4, 10.6), to: at(1.5, -5.9, 9.6), look: at(1.5, -9.6, 0), fov: 46, fovTo: 44, curve: "linear", grade: FIREG },
        // Bekleyenler: sudan uzaklaşan kamera; kıyıda dört kişi.
        { at: L.waitGo, from: at(-2.2, 0.8, 1.5), to: at(-6, 6.6, 2.5), look: bodyOf(hero, 1.3), lookTo: at(9.5, 1, 1), fov: 40, fovTo: 34, curve: "ease", grade: COAST },
        // Gidiş: önlerinden geçer; kamera onunla kalır.
        { at: L.waiters, from: track(-3.6, 4.8, 1.7), to: track(-3.2, 4.6, 1.65), look: track(3, 0.4, 1.1), fov: 44, curve: "linear", grade: COAST },
        // Bir kadın bir adım atar, durur (adamın omzunun üstünden geriye).
        { at: 34.9, from: rel(hero, 0.5, 1.66, -1.4), to: rel(hero, 0.5, 1.66, -1.3), look: bodyOf(w2, 1.3), fov: 34, curve: "linear", grade: COAST },
        { at: 36.4, from: track(3.8, -0.4, 1.35), to: track(3.2, -0.2, 1.35), look: bodyOf(hero, 1.3), fov: 40, curve: "linear", grade: COAST },
        // Beden otomatik: sakin, sabit kamera; bütün beden görünür.
        { at: L.auto, from: at(A0 + 0.9, 5.4, 1.35), to: at(A0 + 1.2, 5.2, 1.35), look: bodyOf(hero, 0.95), fov: 36, curve: "linear", grade: COAST },
        // Suya: yansıması; bir an yanında o kadın. Döner: kimse yok. Yine bakar: yalnız kendisi.
        { at: 42.0, from: at(M0 + 2.6, 2.4, 1.6), to: at(M0 + 2.2, 2.1, 1.7), look: bodyOf(hero, 1.0), fov: 38, curve: "linear", grade: COAST },
        { at: 43.5, from: () => shore(M0 + 0.6, -5.8, 0.55), to: () => shore(M0 + 0.6, -5.5, 0.55), look: () => shore(M0 + 0.6, -0.2, 0.05), fov: 52, curve: "linear", grade: COAST },
        { at: 44.95, from: () => shore(M0 - 0.2, -1.0, 1.55), to: () => shore(M0 - 0.1, -1.0, 1.55), look: () => shore(M0 + 0.5, 0.3, 1.35), fov: 36, curve: "linear", grade: COAST },
        { at: 46.1, from: () => shore(M0 + 0.6, -5.8, 0.55), to: () => shore(M0 + 0.6, -5.5, 0.55), look: () => shore(M0 + 0.6, -0.2, 0.05), fov: 52, curve: "linear", grade: COAST },
        { at: L.trauma, from: rel(hero, -0.55, 1.58, 1.8), to: rel(hero, -0.45, 1.58, 1.5), look: bodyOf(hero, 1.56), fov: 30, curve: "linear", grade: COAST },
        { at: 50, from: at(M0 - 3.2, 3.6, 1.5), to: at(M0 - 3.0, 3.3, 1.5), look: bodyOf(hero, 1.2), fov: 36, curve: "linear", grade: COAST },
        // Boş kalp: eli göğsünde; katman açılır, kalp soluk; kapatır.
        { at: L.saved, from: rel(hero, 0.35, 1.46, 1.8), to: rel(hero, 0.2, 1.36, 1.05), look: bodyOf(hero, 1.28), fov: 32, fovTo: 26, curve: "ease", grade: PASS },
        // İlerde bekleyen: ikisi birden görünür.
        { at: L.paper, from: at(R1 + 2.8, PATH - 3.2, 1.6), to: at(R1 + 2.2, PATH - 3.0, 1.55), look: between(hero, w1, 1.1), fov: 42, curve: "linear", grade: PASS },
      ]),
      // BİRİNCİ NAKARAT: dört beden, dört kamera dili.
      ...refrainShots([L.chorus, L.forget, L.bodies, L.trips, 72.3], false),
      ...withClearance([
        // Dönüp bakmadan gider; kadın arkasında kalır.
        { at: 73.6, from: at(R4 + 3.2, 6.8, 1.6), to: at(R4 + 3.0, 6.6, 1.6), look: bodyOf(hero, 1.1), fov: 40, curve: "linear", grade: PASS },
        // Kamera geriye; adam kameraya yürür; arkasında dört kadın farklı uzaklıklarda.
        { at: L.chorusB, from: track(-3.2, 1.2, 1.55), to: track(-2.4, 1.3, 1.5), look: track(3.5, 2.2, 1.2), fov: 40, curve: "linear", grade: PASS },
        // Yakın: üstü izlerle dolu (kol, omuz, yaka).
        { at: 78.6, from: rel(hero, 0.25, 1.45, 1.2), to: rel(hero, 0.2, 1.42, 1.05), look: bodyOf(hero, 1.32), fov: 32, curve: "linear", grade: PASS },
        // Onlarca beden: ağır, kesmesiz yan izleme (deniz tarafından); her bedenin içinden geçişi kadrajın ortasında.
        { at: L.bodiesB, from: track(0.25, -1.55, 1.35), to: track(0.25, -1.55, 1.35), look: bodyOf(hero, 1.1), fov: 44, curve: "linear", grade: PASS },
        // Yol ayrımı: sola, sağa, ileri bakar; seçer.
        { at: 85.2, from: at(X_S + 2.4, X_UP + 2.8, 1.8), to: at(X_S + 2.2, X_UP + 2.6, 1.8), look: at(X_S, X_UP, 1.2), fov: 42, curve: "linear", grade: PASS },
        // Birinci yol: yukarı kıvrılır; yine deniz.
        { at: 86.4, from: rel(hero, 0.4, 1.7, -2.4), to: rel(hero, 0.4, 1.7, -2.2), look: rel(hero, 0, 1.2, 2), fov: 44, curve: "linear", grade: PASS },
        // İkinci yol: öbür yöne; kıyı boyunca dönerek; yine aynı su.
        { at: 88.5, from: track(1.8, 3.6, 1.8), to: track(1.4, 3.4, 1.8), look: track(-2, -1.2, 0.9), fov: 44, curve: "linear", grade: PASS },
        // Üçüncü yol: kapı, geçit, oda; çıkış: deniz.
        { at: 90.4, from: rel(hero, 0.3, 1.62, -2.0), to: rel(hero, 0.3, 1.6, -1.9), look: rel(hero, 0, 1.3, 1.8), fov: 42, curve: "linear", grade: PASS },
        { at: 91.6, from: at(R3 + 1.8, 5.8, 2.0), to: at(R3 + 1.8, 5.4, 1.9), look: at(R3 + 1.8, -2, 0.8), fov: 44, curve: "linear", grade: PASS },
        // DÜN GECE: ateşin yanına uzanır; gözleri kapalı; açar: o kadın ateşin ışığında; oturur; kırpar: yok.
        { at: L.lastNight, from: at(LIE[0] - 2.8, 1.2, 1.4), to: at(LIE[0] - 2.5, 1.35, 1.35), look: at(LIE[0], LIE[1], 0.5), fov: 40, curve: "linear", grade: COLD },
        { at: 96.2, from: () => boneAt(hero, "Head", new THREE.Vector3()).add(axes(hero, 0.5, 0.55, -0.2, new THREE.Vector3())), to: () => boneAt(hero, "Head", new THREE.Vector3()).add(axes(hero, 0.45, 0.5, -0.2, new THREE.Vector3())), look: headAt(0), fov: 32, curve: "linear", grade: COLD },
        { at: 97.6, from: at(LIE[0] - 0.6, LIE[1] - 0.4, 0.55), to: at(LIE[0] - 0.55, LIE[1] - 0.35, 0.55), look: bodyOf(lost, 1.4), fov: 34, curve: "linear", grade: COLD },
        { at: 98.5, from: at(LIE[0] - 2.4, LIE[1] - 1.5, 1.2), to: at(LIE[0] - 2.3, LIE[1] - 1.4, 1.2), look: at(LIE[0] + 0.8, LIE[1] + 0.6, 0.8), fov: 40, curve: "linear", grade: COLD },
        // İkinci kıta: durgun, yakın; bankta; izleri tek tek çıkarır.
        { at: 100.6, from: at(R2 + 1.2, 0.2, 1.1), to: at(R2 + 1.0, 0.3, 1.1), look: bodyOf(hero, 0.9), fov: 34, curve: "linear", grade: COLD },
        { at: 103.9, from: rel(hero, -0.35, 1.2, 1.1), to: rel(hero, -0.3, 1.2, 1.0), look: bodyOf(hero, 1.02), fov: 30, curve: "linear", grade: COLD },
        // KAFA SAHNESİ: sabit orta-geniş kadraj; çok yavaş başına doğru itiş; cam odalar belirir.
        { at: L.anchor, from: rel(hero, 0, 1.25, 5.4), to: rel(hero, 0, 1.2, 2.4), look: headAt(0.1), fov: 44, fovTo: 42, curve: "linear", grade: COLD },
        // İkinci otomatik beden: bütün beden.
        { at: 113.6, from: rel(hero, 0.6, 1.3, 3.4), to: rel(hero, 0.5, 1.3, 3.2), look: bodyOf(hero, 1.0), fov: 38, curve: "linear", grade: COLD },
        // AŞK BİTTİ (ikinci): kapıya yürür; eşikte durur; içerideki kadın; bakışırlar; döner, gider.
        { at: L.love2, from: rel(hero, 0.3, 1.62, -2.0), to: rel(hero, 0.3, 1.6, -1.9), look: rel(hero, 0, 1.3, 1.8), fov: 42, curve: "linear", grade: COLD },
        { at: 119.2, from: rel(w2, 0.4, 1.62, -1.2), to: rel(w2, 0.38, 1.6, -1.1), look: bodyOf(hero, 1.45), fov: 32, curve: "linear", grade: COLD },
        { at: 120.6, from: rel(hero, -0.25, 1.55, 1.3), to: rel(hero, -0.22, 1.55, 1.2), look: bodyOf(hero, 1.5), fov: 30, curve: "linear", grade: COLD },
        { at: 121.8, from: at(R3 + 2.4, -0.4, 1.6), to: at(R3 + 2.6, -0.2, 1.6), look: at(R3, GAP_UP + 0.4, 1.2), fov: 44, curve: "linear", grade: COLD },
        { at: 124, from: track(-2.8, 0.1, 1.4), to: track(-2.4, 0.2, 1.4), look: bodyOf(hero, 1.2), fov: 40, curve: "linear", grade: COLD },
        // Kalp: göğsü yakın; bir atış, bir atış daha.
        { at: L.saved2, from: rel(hero, 0.3, 1.36, 0.95), to: rel(hero, 0.25, 1.34, 0.85), look: bodyOf(hero, 1.3), fov: 30, curve: "linear", grade: COLD },
      ]),
      // İKİNCİ NAKARAT: aynı görsel cümle (aynı kameralar).
      ...refrainShots([L.chorus2, L.forget2, L.bodies2, L.trips2, 139.4], true),
      ...withClearance([
        // İzler dökülür: tertemiz, bembeyaz; rahatlamaz.
        { at: FALL_AT, from: at(H4_UP[0] + 1.9, 1.8, 1.0), to: at(H4_UP[0] + 1.6, 2.0, 1.0), look: bodyOf(hero, 0.9), fov: 44, curve: "linear", grade: PASS },
        { at: 143.1, from: rel(hero, 0.3, 1.5, 1.35), to: rel(hero, 0.24, 1.48, 1.15), look: bodyOf(hero, 1.36), fov: 34, curve: "linear", grade: PASS },
        // SON ARAYIŞ: yol kıvrılır; kıyı boyunca uzun takip; sonunda o.
        { at: L.chorus2b, from: track(-3.4, -1.6, 1.6), to: track(-3.0, -1.5, 1.6), look: track(5, 1.2, 1.2), fov: 42, curve: "linear", grade: FINAL },
        { at: 148.6, from: rel(hero, 0.5, 1.66, -1.6), to: rel(hero, 0.45, 1.64, -1.4), look: at(LF, PATH, 1.2), fov: 32, curve: "linear", grade: FINAL },
        // Karşılaşma: uzun, sabit ikili; birer adım; ayrı.
        { at: L.trips3, from: at((HF + LF) / 2, -3.4, 1.5), to: at((HF + LF) / 2, -3.2, 1.5), look: at((HF + LF) / 2, PATH, 1.15), fov: 40, curve: "linear", grade: FINAL },
        // Tersine geçiş: kadın ona yürür, sarılır, içinden geçer; sırtından çıkar; yürüyüp gider.
        { at: 156.4, from: at(HF + 1.2, -2.6, 1.4), to: at(HF + 1.0, -2.3, 1.4), look: at(HF + 0.6, PATH, 1.1), fov: 42, curve: "linear", grade: FINAL },
        { at: 161.2, from: rel(hero, 0.5, 1.66, 1.6), to: rel(hero, 0.45, 1.64, 1.4), look: bodyOf(lost, 1.2), fov: 36, curve: "linear", grade: FINAL },
        // Kalp: açıkça atıyor; ona bakar.
        { at: 163.2, from: rel(hero, 0.35, 1.44, 1.5), to: rel(hero, 0.2, 1.36, 1.05), look: bodyOf(hero, 1.3), fov: 30, fovTo: 26, curve: "linear", grade: FINAL },
        // AYNI KIYI: suya döner; gemiler neredeyse sönmüş. Açılışın kadrajı.
        { at: 166.9, from: track(4.2, 1.9, 1.7), to: track(3.6, 1.7, 1.65), look: track(-5, -2.5, 1), fov: 42, curve: "linear", grade: FINAL },
        { at: 172.5, from: at(-1.9, 13.4, 2.35), to: at(-1.9, 12.6, 2.3), look: at(-1.6, -3.2, 0.9), fov: 38, curve: "linear", grade: FINAL },
        // Beden suya yürür; kendini durdurur: bütün beden yandan.
        { at: 177, from: at(-2.8, 0.9, 1.1), to: at(-2.7, 0.8, 1.1), look: bodyOf(hero, 0.9), fov: 38, curve: "linear", grade: FINAL },
        // Son gemi söner: omzunun üstünden gemiye.
        { at: 181, from: rel(hero, 0.45, 1.7, -1.6), to: rel(hero, 0.4, 1.7, -1.5), look: shipAt(6, 2), fov: 22, curve: "linear", grade: FINAL },
        // Diz çöker; elleri toprakta; nefes.
        { at: 186, from: at(-2.8, 1.4, 0.95), path: [at(-2.9, -0.4, 0.9)], to: at(-1.8, -1.6, 0.85), look: bodyOf(hero, 0.6), fov: 38, curve: "linear", grade: FINAL },
        // SON ÇEKİM: kamera geri çekilir; deniz, kıyı, ufuk, adam.
        { at: 190, from: at(-0.6, 3.4, 1.7), path: [at(-0.8, 8, 2.1)], to: at(-1.9, 16, 2.6), look: bodyOf(hero, 0.6), lookTo: at(-1.6, -3.2, 0.9), fov: 38, curve: "ease", grade: FINAL },
        { at: AUDIO_END - 0.3, from: at(-1.9, 16, 2.6), to: at(-1.9, 16, 2.6), look: at(-1.6, -3.2, 0.9), fov: 38, curve: "linear", grade: FINAL },
      ]),
    ],
    onBeat(id) {
      if (id === "strike" || id === "ships") kit.sfx.cue("ignite");
      if (id === "kneel") kit.sfx.cue("drop");
    },
    setSky(top, horizon) {
      sea.uniforms.uTop.value.copy(top);
      sea.uniforms.uHorizon.value.copy(horizon);
    },
    reset() {
      for (const o of coverTexts()) o.visible = true;
      tries = 0;
      songNow = 0;
      seaLevel = -12;
      markKey = -1;
      painter.paint(null);
      ships.forEach((ship, i) => {
        ship.litAt = LIT_AT[i];
        ship.angle = ship.orbit.phase;
      });
      for (const p of people) setOpacity(p, 1);
      setLayer(lost, 0);
      kit.effects.dim = 0;
      blackout.visible = false;
      mirror.visible = false;
    },
    update(dt, time, level, songTime) {
      clock = time;
      const t = Math.min(Math.max(songTime, 0), AUDIO_END);
      songNow = t;
      const cinema = kit.cinema();
      // Deniz: sahneyle birlikte dolar ve durur (film boyunca aynı deniz).
      seaLevel += (THREE.MathUtils.lerp(-12, SEA, THREE.MathUtils.smoothstep(level, 0, 0.5)) - seaLevel) * Math.min(1, dt * 2.5);
      sea.mesh.position.y = seaLevel;
      sea.uniforms.uTime.value = time;
      sea.uniforms.uOpacity.value = THREE.MathUtils.clamp((seaLevel + 11) / 3, 0, 1) * level;
      sea.uniforms.uMoon.value = 0;
      kit.effects.dim = 0.04 * level;
      for (const o of coverTexts()) o.visible = !(cinema && level > 0.02 && songTime < AUDIO_END);

      // Gemiler: aynı yedi gemi, aynı yörüngeler; alev zamanın işlevi; söndükten sonra ince bir duman.
      let nearest = -1;
      let nearestDistance = 1e9;
      let nearestFlame = 0;
      ships.forEach((ship, i) => {
        ship.angle += dt * ship.orbit.speed;
        const x = Math.cos(ship.angle) * ship.orbit.radius;
        const z = Math.sin(ship.angle) * ship.orbit.radius;
        // Yandıkça su alır, yan yatar ve batar; söndükten sonra da iner. Son gemi en az batar (finalin görüntüsü).
        const out = OUT_AT[i] ?? 180;
        const sinkTo = i === SHIPS - 1 ? 2.3 : 3.6;
        const sink = t < ship.litAt ? 0 : sinkTo * (0.72 * smooth01((t - ship.litAt - 22) / Math.max(10, out - ship.litAt - 16)) + 0.28 * smooth01((t - out) / 14));
        const list = sink / sinkTo;
        const lean = i % 2 ? 1 : -1;
        ship.group.position.set(x, Math.max(seaLevel, ground(x, z) + 0.8) + 0.35 + Math.sin(time * 0.9 + i) * 0.12 * (1 - 0.6 * list) - sink, z);
        ship.group.rotation.set(Math.sin(time * 0.7 + i) * 0.03 + lean * 0.08 * list, -ship.angle + (ship.orbit.speed > 0 ? -Math.PI / 2 : Math.PI / 2), Math.cos(time * 0.6 + i) * 0.04 - lean * 0.17 * list);
        ship.group.visible = level > 0.05;
        const flame = flameOf(ship, t) * level;
        const char = t < ship.litAt ? 0 : THREE.MathUtils.clamp((t - ship.litAt) / 45, 0, 1);
        // Kül: geç dönemde kömür grileşir (kül), halatlar kopar.
        const ash = t < ship.litAt ? 0 : smooth01((t - out + 30) / 34);
        for (const rope of ship.rigging) rope.opacity = THREE.MathUtils.clamp(1 - (char - 0.3) * 2.2, 0, 1);
        ship.sails.forEach((sail) => {
          const material = sail.material as THREE.MeshStandardMaterial;
          if (ship.textured) material.color.setScalar(1 - char * 0.93);
          else material.color.setRGB(0.8 - char * 0.75, 0.76 - char * 0.72, 0.68 - char * 0.64);
          material.opacity = THREE.MathUtils.clamp(1 - (char - 0.3) * 2, 0, 1);
          sail.scale.y = THREE.MathUtils.clamp(1 - (char - 0.25) * 1.3, 0.05, 1);
        });
        if (ship.textured) {
          const c = 1 - char * 0.86;
          ship.hullMaterial.color.setRGB(lerp(c, 0.34, ash * 0.6), lerp(c, 0.33, ash * 0.6), lerp(c, 0.32, ash * 0.6));
        } else ship.hullMaterial.color.setRGB(0.17 - char * 0.13, 0.11 - char * 0.09, 0.08 - char * 0.07);
        ship.hullMaterial.roughness = lerp(0.75, 1, char);
        // Kor: alevle birlikte; söndükten sonra bir süre için için yanar.
        const smoulder = 0.3 * bump(t, out, out + 1.5, out + 7, out + 14) * level;
        ship.hullMaterial.emissiveIntensity = (0.6 + 0.4 * Math.sin(time * 11 + i)) * (flame * (ship.textured ? 2.2 : 1.5) + smoulder);
        ship.group.localToWorld(tmp.set(0, 2.2, 0));
        ship.fire.origin.copy(tmp);
        ship.embers.origin.copy(tmp).y += 1;
        ship.fire.rate = ship.fire.intensity = flame;
        ship.embers.rate = ship.embers.intensity = flame * 0.8;
        ship.fire.update(time);
        ship.embers.update(time);
        ship.halo.position.copy(tmp).y += 2;
        (ship.halo.material as THREE.SpriteMaterial).opacity = flame * (0.42 + 0.18 * Math.sin(time * 13 + i));
        ship.halo.visible = flame > 0.01;
        sea.uniforms.uFires.value[i].set(tmp.x, tmp.z, flame, 0);
        const smoke = smokes[i];
        smoke.origin.copy(tmp).y += 0.6;
        smoke.rate = smoke.intensity = bump(t, OUT_AT[i] + 0.4, OUT_AT[i] + 2.2, OUT_AT[i] + 9, OUT_AT[i] + 15) * 0.55 * level;
        smoke.update(time);
        const d = Math.hypot(tmp.x - hero.g.position.x, tmp.z - hero.g.position.z);
        if (flame > 0.05 && d < nearestDistance) {
          nearest = i;
          nearestDistance = d;
          nearestFlame = flame;
        }
      });

      // Denizin yüzü: yalnız o dizede, yaklaşan kameraya; sonra bir daha dönmez.
      const faceLevel = bump(t, L.seas + 0.6, L.seas + 1.9, L.waitGo - 0.5, L.waitGo + 0.3);
      seaFace.position.y = seaLevel + 0.06;
      faceUniforms.uOpacity.value = faceLevel * level;
      faceUniforms.uTime.value = time;
      seaFace.visible = faceLevel > 0.01;

      // --- Kişiler -----------------------------------------------------------------------------------------------
      const shown = level > 0.05;
      const inChambers = chambersShown(t);
      for (const p of people) {
        let visible = shown;
        if (p === lost) visible = shown && (lostShown(t) || lostMirrored(t));
        else if (echoes.includes(p)) {
          const i = echoes.indexOf(p);
          visible = shown && (echoShown(t) || (inChambers && i < chambers.length));
        } else if (women.includes(p)) visible = shown && t < 158;
        p.g.visible = visible;
        if (visible) act(p, t, dt, time);
      }
      // Yansımadaki kadın yalnız yansıma katmanında (görüntü kamerası onu görmez).
      setLayer(lost, lostMirrored(t) ? MIRROR_LAYER : 0);
      if (shown) gestures(t, time);

      // Beden geçişi: adam bir kadının (ya da tekrarının) içindeyken o kadının gövdesi saydamlaşır; sonda tersine.
      let passing: Person | null = null;
      let passLevel = 0;
      for (const w of [...women, ...echoes]) {
        if (!w.g.visible || (inChambers && echoes.includes(w))) continue;
        // Koridordaki tekrarlar adam yaklaşırken biraz daha erken saydamlaşır: her geçiş görünür (sarılmalar etkilenmez).
        const corridor = echoes.includes(w);
        const ghost = 1 - THREE.MathUtils.smoothstep(flatDistance(hero, w), corridor ? 0.12 : 0.14, corridor ? 0.5 : 0.35);
        setOpacity(w, 1 - ghost * 0.62);
        if (ghost > passLevel) {
          passLevel = ghost;
          passing = w;
        }
      }
      const reversed = t > 158 && t < 161 ? 1 - THREE.MathUtils.smoothstep(flatDistance(hero, lost), 0.14, 0.35) : 0;
      setOpacity(hero, 1 - reversed * 0.62);
      if (reversed > passLevel) {
        passLevel = reversed;
        passing = hero;
      }
      inner.visible = passLevel > 0.02 && passing !== null;
      if (passing && inner.visible) {
        inner.position.copy(passing.g.position);
        inner.rotation.y = passing.g.rotation.y;
        veils.forEach((veil, i) => {
          (veil.material as THREE.MeshStandardMaterial).opacity = passLevel * 0.3;
          veil.rotation.y = (i - 2) * 0.5 + Math.sin(time * 0.8 + i) * 0.12;
        });
      }

      // Kalbin atışı: göğüs hafifçe kabarır. Göğüs katmanı açılınca içinde soluk, küçük bir kalp.
      const pulse = pulseAt(t);
      const chestBone = boneOf(hero, "spine_03");
      if (chestBone) chestBone.scale.setScalar(1 + 0.035 * pulse);
      const layer = layerAt(t);
      if (painter.material) {
        const want = layer > 0.01 || reversed > 0.01;
        painter.material.transparent = want;
        painter.material.opacity = Math.min(1 - reversed * 0.62, 1 - layer * 0.55);
      }
      dimHeart.visible = shown && layer > 0.01;
      if (dimHeart.visible) {
        boneAt(hero, "spine_03", dimHeart.position).add(axes(hero, -0.05, 0.03, 0.05, tmp));
        (dimHeart.material as THREE.MeshStandardMaterial).opacity = 0.8 * layer;
        dimHeart.scale.setScalar(1 + 0.08 * beatAt(t, 56.2, 0.5)).multiply(tmp.set(1, 1.15, 0.8));
      }

      // --- Kafa sahnesi: cam odalar başının çevresinde; içlerinde kadınlar; demirler kilitli. ------------------------
      const head = boneAt(hero, "Head", tmp4);
      const headX = head.x;
      const headZ = head.z;
      chambers.forEach((chamber, i) => {
        const k = inChambers ? smooth01((t - chamber.appear) / 0.7) * (1 - smooth01((t - 113.3) / 0.5)) : 0;
        const on = shown && k > 0.01;
        chamber.group.visible = on;
        chamber.anchor.visible = on;
        chamber.chain.mesh.visible = on;
        if (!on) return;
        const [r, up, f] = chamber.at;
        const offset = axes(hero, r, 0, f, tmp);
        const px = headX + offset.x;
        const pz = headZ + offset.z;
        // Oda eğimli zeminde toprağa gömülmez (içindeki kadının ayakları da).
        let floor = hero.g.position.y + up;
        for (const [ox, oz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) floor = Math.max(floor, ground(px + ox * CHAMBER_R, pz + oz * CHAMBER_R) + 0.02);
        chamber.group.position.set(px, floor, pz);
        chamber.group.rotation.y = Math.atan2(headX - px, headZ - pz);
        chamber.glass.opacity = 0.16 * k;
        for (const m of chamber.metal) m.opacity = k;
        // İçindeki kadın: odanın zemininde, ona dönük; ilki kapıyı zorlar.
        const e = echoes[i];
        e.g.position.set(px, floor + 0.04, pz);
        e.g.rotation.y = chamber.group.rotation.y;
        setOpacity(e, k);
        if (i === 0) {
          const push = bump(t, 107.4, 107.8, 109.0, 109.4);
          if (push > 0) {
            const handle = chamber.group.localToWorld(tmp2.set(Math.sin(0.3) * CHAMBER_R * 0.9, 1.0 + Math.sin(time * 9) * 0.015, Math.cos(0.3) * CHAMBER_R * 0.9));
            e.ik.reach("r", handle, push, axes(e, 1, -0.5, 0, tmp3));
          }
        }
        // Demir: odanın altında yerde; zincir kilitten demirin halkasına.
        const ax = px + Math.sin(chamber.group.rotation.y) * 0.1;
        const az = pz + Math.cos(chamber.group.rotation.y) * 0.1;
        chamber.anchor.position.set(ax, ground(ax, az) + 0.02, az);
        chamber.anchor.rotation.set(0, chamber.group.rotation.y + i, 0.12);
        const lockAt = chamber.group.localToWorld(tmp2.set(0, -0.14, CHAMBER_R * 0.6));
        const ring = chamber.anchor.localToWorld(tmp3.set(0, 0.97, 0));
        for (let s = 0; s <= chamber.chain.segments; s += 1) {
          const u = s / chamber.chain.segments;
          chamber.chain.points[s].lerpVectors(lockAt, ring, u).y -= Math.sin(u * Math.PI) * 0.03;
        }
        chamber.chain.build(0.012, k);
      });

      // --- Yansıma: suyun kenarında; kadın yalnız yansımada. ----------------------------------------------------------
      const mirrorFade = bump(t, 42.6, 43.2, 47.3, 47.8);
      mirror.visible = shown && mirrorFade > 0.01;
      if (mirror.visible) {
        mirror.position.copy(shore(M0 + 0.6, -2.4, 0, tmp)).setY(seaLevel + 0.035);
        (mirror.material as THREE.ShaderMaterial).uniforms.uFade.value = mirrorFade * level;
        mirrorCameras.get(kit.camera)?.layers.enable(MIRROR_LAYER);
      }

      // --- Kararma: göz kırpma (kadın o anda kaybolur) ve sesle birlikte son kare siyah. ---------------------------
      const blink = t >= 99.22 && t < 99.4;
      const ending = t >= AUDIO_END - 0.07;
      blackout.visible = cinema && shown && (blink || ending);
      if (blackout.visible) {
        const h = 2 * 0.1 * Math.tan(THREE.MathUtils.degToRad(kit.camera.fov) / 2) * 1.1;
        blackout.scale.set(h * kit.camera.aspect * 1.1, h, 1);
      }

      // Kibrit: 14. saniyede çakar; gemiler tutuşunca söner.
      const lit = t >= 14 && t < 23 ? 1 - THREE.MathUtils.smoothstep(t, 21.6, 23) : 0;
      handMatch.visible = t < 24;
      (handFlame.material as THREE.SpriteMaterial).opacity = lit * level * (0.75 + 0.25 * Math.sin(time * 17) * Math.sin(time * 5));
      handFlame.visible = lit > 0.01;
      match.visible = level > 0.5 && !cinema;
      (matchFlame.material as THREE.SpriteMaterial).opacity = 0.65 + 0.3 * Math.sin(time * 17) * Math.sin(time * 5);

      // --- İzler: iplik, saç teli ve kumaş parçası kemiğe tutunur; çıkarılınca ya da döküldüğünde yere düşer. -------
      for (const trace of traces) {
        let span = -1;
        for (let j = 0; j < trace.spans.length; j += 1) if (t >= trace.spans[j][0]) span = j;
        const hide = () => {
          if (trace.tube) trace.tube.mesh.visible = false;
          if (trace.mesh) trace.mesh.visible = false;
        };
        if (!shown || span < 0) {
          hide();
          continue;
        }
        const [, fallAt] = trace.spans[span];
        if (t > fallAt + 8) {
          hide();
          continue;
        }
        const falling = THREE.MathUtils.clamp((t - fallAt) / 0.9, 0, 1);
        const start = boneAt(hero, trace.bone, tmp).add(axes(hero, trace.offset[0], trace.offset[1], trace.offset[2], tmp2));
        if (falling > 0) start.lerp(trace.rest[span], falling * falling);
        const sway = Math.sin(time * 1.7 + trace.seed) * 0.02 * (1 - falling);
        if (trace.tube) {
          const hang = axes(hero, trace.hang[0], trace.hang[1] * (1 - falling), trace.hang[2], tmp2);
          if (falling >= 1) hang.set(Math.cos(trace.seed) * 0.2, 0, Math.sin(trace.seed) * 0.2);
          for (let k = 0; k <= trace.tube.segments; k += 1) {
            const u = k / trace.tube.segments;
            const floorY = ground(start.x + hang.x * u, start.z + hang.z * u) + 0.01;
            trace.tube.points[k].set(start.x + hang.x * u + sway * u * u, Math.max(floorY, start.y + hang.y * u - 0.05 * u * (1 - u)), start.z + hang.z * u + sway * u);
          }
          trace.tube.build(trace.radius);
        } else if (trace.mesh) {
          trace.mesh.visible = true;
          trace.mesh.position.copy(start);
          trace.mesh.rotation.set(falling >= 1 ? -Math.PI / 2 : falling * 1.5, hero.g.rotation.y + trace.seed * falling, 0.3 + falling * 2);
        }
      }
      // Yakadaki ruj ve kalbin üstündeki sıcak nabız (dokuya işlenir).
      if (painter.prepare()) {
        if (!markSample) {
          markSample = painter.sample(MARK[0], MARK[1]);
          heartSample = painter.sample(0.03, 0.756);
        }
        const visible = t >= MARK_AT ? THREE.MathUtils.smoothstep(t, MARK_AT, MARK_AT + 0.5) * (1 - THREE.MathUtils.smoothstep(t, MARK_FADE, MARK_FADE + 0.5)) : 0;
        const key = Math.round(visible * 24) + Math.round(pulse * 16) * 100;
        if (key !== markKey) {
          markKey = key;
          if (visible <= 0.001 && pulse <= 0.01) painter.paint(null);
          else {
            const mark = markSample;
            const heart = heartSample;
            painter.paint((g) => {
              if (mark && visible > 0.001) {
                g.globalCompositeOperation = "multiply";
                const r = MARK[2] * painter.metre;
                g.save();
                g.translate(mark.x, mark.y);
                g.rotate(0.9);
                g.scale(1.6, 0.7);
                const fill = g.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
                fill.addColorStop(0, `rgba(${MARK[3]},${0.92 * visible})`);
                fill.addColorStop(0.65, `rgba(${MARK[3]},${0.6 * visible})`);
                fill.addColorStop(1, `rgba(${MARK[3]},0)`);
                g.fillStyle = fill;
                g.beginPath();
                g.arc(0, 0, r, 0, Math.PI * 2);
                g.fill();
                g.restore();
              }
              if (heart && pulse > 0.01) {
                g.globalCompositeOperation = "source-over";
                const pr = 0.03 * painter.metre;
                const glow = g.createRadialGradient(heart.x, heart.y, 0, heart.x, heart.y, pr);
                glow.addColorStop(0, `rgba(196,70,70,${0.28 * pulse})`);
                glow.addColorStop(1, "rgba(196,70,70,0)");
                g.fillStyle = glow;
                g.beginPath();
                g.arc(heart.x, heart.y, pr, 0, Math.PI * 2);
                g.fill();
              }
            });
          }
        }
      }
      {
        const k = (t - (MARK_FADE + 0.4)) / 1;
        flake.visible = shown && k > 0 && k < 8;
        if (flake.visible) {
          const drop = Math.min(1, k);
          const restAt = shore(H4_UP[0] + 0.3, 3.35, 0.012, tmp2);
          if (drop >= 1) {
            flake.position.copy(restAt);
            flake.rotation.set(-Math.PI / 2, 0, 1);
          } else {
            boneAt(hero, "neck_01", tmp).add(axes(hero, -0.05, -0.08, 0.12, tmp3));
            flake.position.lerpVectors(tmp, restAt, drop * drop);
            flake.rotation.set(drop * 4, 1, drop * 3);
          }
        }
      }

      // Işık: yanan gemilerin turuncusu kıyıya vurur; yüzler her zaman okunur; beyazlar patlamaz.
      if (level > 0.5) {
        const fire = kit.lights[0];
        fire.color.set("#ff8a3a");
        fire.distance = 80;
        fire.intensity = 0;
        if (nearest >= 0) {
          fire.position.copy(ships[nearest].group.position).y += 5;
          fire.intensity = (nearestFlame * (95 + Math.sin(time * 17) * 14)) / FIGURE_TONE;
        }
        const key = kit.lights[1];
        key.distance = 24;
        const focus = (t >= 97.6 && t < 98.5) || (t >= 119.2 && t < 120.6) ? (t < 110 ? lost : w2) : hero;
        if (lit > 0.05 && t < L.night) {
          key.color.set("#ffb070");
          handFlame.getWorldPosition(key.position);
          key.intensity = (lit * (0.55 + 0.12 * Math.sin(time * 17)) * level) / FIGURE_TONE;
        } else {
          key.color.set(t >= 92.4 && t < 101 ? "#ffc896" : "#dfe7ff");
          key.position.copy(focus.g.position).add(axes(focus, 1.2, 3.6, 2.6, tmp));
          key.intensity = (10 * level) / FIGURE_TONE;
        }
      }

      // Kıyı ateşleri, iskele fenerleri, deniz feneri, şişe.
      shoreFires.forEach(({ flame, glow }, i) => {
        flame.rate = flame.intensity = level;
        flame.update(time);
        (glow.material as THREE.SpriteMaterial).opacity = level * (0.24 + 0.08 * Math.sin(time * 9 + i)) * THREE.MathUtils.smoothstep(kit.camera.position.distanceTo(glow.position), 2, 7);
      });
      pierLanterns.forEach((lantern, i) => ((lantern.material as THREE.SpriteMaterial).opacity = level * (0.8 + 0.2 * Math.sin(time * 6 + i))));
      pier.visible = level > 0.05;
      beams.rotation.y = time * 0.45;
      beams.children.forEach((cone) => setConeLevel(cone as THREE.Mesh, 0.85 * level));
      (lampGlow.material as THREE.SpriteMaterial).opacity = 0.25 + 0.75 * level;
      lighthouse.visible = level > 0.05;
      bottle.visible = seaLevel > SEA - 1.5;
      bottle.position.y = seaLevel + 0.1 + Math.sin(clock * 1.4) * 0.08;
      bottle.rotation.z = Math.sin(clock * 1.1) * 0.12;
      if (letter >= 0) {
        letter += dt;
        const rise = Math.min(1, letter / 1.4);
        note.position.set(0, rise * 1.1, 0);
        note.rotation.z = (Math.PI / 2 - 0.3) * (1 - rise);
        if (letter > 4.5 && letter - dt <= 4.5) kit.sfx.cue("ignite");
        note.visible = letter < 5.2;
      }
    },
  };
}
