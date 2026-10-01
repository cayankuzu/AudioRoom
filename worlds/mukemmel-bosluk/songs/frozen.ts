import * as THREE from "three";
import { createEmitter, SPARKLE } from "../../../engine/fx/emitter";
import type { SongScene } from "../../../engine/game/songStage";
import { createActor, createFigure } from "../../../engine/fx/figure";
import { createCrowd } from "./crowd";
import { GRADES } from "../../../engine/game/director";
import { announce, arc, cam, CENTER, ease, FIGURE_AT, follow, GRAMOPHONE, ground, me, pt, ridge, rim, secretItem, type SceneKit } from "./kit";
import { bird, createPetals, createRain, flap, flyTo, type Flyer } from "../../../engine/fx/sceneProps";

/**
 * Bugün Herkes Ölsün İstedim — özlem o kadar büyük ki dünya dursun. Kraterdeki
 * insanlar tek tek yok olur, ufuktaki şehir çöker. Güneşli bir günün anısı bir an geri
 * gelir: yerde yan yana uzanan iki gölge, altın rengi ışık; sonra biter. Hayat durur:
 * cam kırıkları havada donar, kamera donmuş zamanın çevresinde döner. Soru dizelerinde
 * yerdeki eski bir telefon çalar; kablosu toprağa gömülü, kimse açmaz (Laurie Anderson'ın
 * telesekretere düşen, kimsenin açmadığı telefonlu "O Superman"ine küçük bir selam). Sonunda gök
 * buruşup yırtılır ve kırıklar yavaşça yere iner.
 */
const SHARDS = 320;
const PEOPLE = 30;
const TOWERS = 22;
/** Dizelerin saniyeleri. */
const L = {
  gone: 14.11, missed: 20.96, city: 27.46, wanted: 33.46, memory: 40.21, stop: 54.2, unfinished: 60.55, day: 66.22,
  hear: 79.47, listen: 82.72, say: 85.47, hear2: 92.47, understand: 95.67, say2: 98.92, heart: 105.61, heartB: 118.96,
  tear: 160.22, missed2: 166.47, day2: 172.47, hear3: 185.47, listen3: 188.27, say3: 191.37, heart2: 198.47, heart3: 211.37,
  heart4: 224.46, heart5: 237.31, end: 250,
} as const;

/** Yerde uzanan insan gölgesi (anı): yumuşak kenarlı koyu siluet. */
function shadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const g = canvas.getContext("2d")!;
  g.filter = "blur(3px)";
  g.fillStyle = "rgba(20,12,4,0.85)";
  g.beginPath();
  g.ellipse(32, 26, 11, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(16, 44);
  g.quadraticCurveTo(32, 36, 48, 44);
  g.lineTo(44, 160);
  g.lineTo(40, 250);
  g.lineTo(34, 250);
  g.lineTo(32, 170);
  g.lineTo(30, 250);
  g.lineTo(24, 250);
  g.lineTo(20, 160);
  g.closePath();
  g.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface Shard {
  home: THREE.Vector3;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  state: "frozen" | "falling" | "gone";
}

function shardGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.5);
  shape.lineTo(0.22, -0.2);
  shape.lineTo(-0.05, -0.5);
  shape.lineTo(-0.2, 0.05);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false });
  geometry.center();
  return geometry;
}

export function createFrozenScene(kit: SceneKit): SongScene {
  const root = new THREE.Group();

  // Anı: güneşli bir günden kalma, yan yana uzanan iki gölge (gölgeleri yapan kimse yok).
  // Kaba arazi ağının analitik yüksekliğin biraz üstünde kalabildiği yerlerde gömülmesin diye öne itilir.
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
  const shadows = [0, 1].map((k) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 5.2), shadowMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.renderOrder = 2;
    root.add(mesh);
    return { mesh, k };
  });

  // Eski bir telefon: kablosu toprağa gömülü. Soru dizelerinde çalar, kimse açmaz.
  const phone = new THREE.Group();
  const bakelite = new THREE.MeshPhysicalMaterial({ color: "#8e1212", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.2, 24), bakelite);
  body.position.y = 0.1;
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 24), new THREE.MeshStandardMaterial({ color: "#d8d2c4", roughness: 0.5 }));
  dial.rotation.x = 0.5;
  dial.position.set(0, 0.2, 0.1);
  const receiver = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.34, 4, 10), bakelite);
  handle.rotation.z = Math.PI / 2;
  const cups = [-1, 1].map((side) => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.07, 14), bakelite);
    cup.position.set(side * 0.2, -0.04, 0);
    return cup;
  });
  receiver.add(handle, ...cups);
  receiver.position.y = 0.26;
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), new THREE.MeshBasicMaterial({ color: "#ff2a1a" }));
  bell.position.set(0.16, 0.2, 0.12);
  const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.18, 0.08, 0), new THREE.Vector3(-0.5, 0.02, 0.2), new THREE.Vector3(-0.9, 0.01, -0.1), new THREE.Vector3(-1.3, -0.1, 0.1),
  ]), 20, 0.012, 5), bakelite);
  phone.add(body, dial, receiver, bell, cord);
  phone.scale.setScalar(1.6);
  root.add(phone);
  const phoneLight = new THREE.PointLight("#ff3b2a", 0, 7, 1.6);
  phoneLight.position.set(0, 1.2, 0.4);
  phone.add(phoneLight);

  // Anının güneşi: alçak, sıcak bir ışık (gölgeler onun uzattığı gölgeler).
  const sun = new THREE.DirectionalLight("#ffc27a", 0);
  root.add(sun, sun.target);
  let ring = -1;
  const material = new THREE.MeshPhysicalMaterial({
    color: "#e9ecef",
    metalness: 0.2,
    roughness: 0.05,
    clearcoat: 1,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.InstancedMesh(shardGeometry(), material, SHARDS);
  mesh.frustumCulled = false;
  root.add(mesh);
  const burst = createEmitter({ ...SPARKLE("#dfe7ef", 0.8), count: 160 });
  root.add(burst.points);

  // Kraterdeki insanlar: tek tek yok olurlar.
  const people = createCrowd(PEOPLE, new THREE.MeshStandardMaterial({ color: "#101012", roughness: 1 }));
  for (let i = 0; i < PEOPLE; i += 1) {
    const a = (i / PEOPLE) * Math.PI * 2 + kit.random() * 0.3;
    const r = 14 + kit.random() * 40;
    people.place(i, Math.cos(a) * r, Math.sin(a) * r + 10, kit.random() * Math.PI * 2, 0.95 + kit.random() * 0.2);
  }
  root.add(people.mesh);
  people.solidify(kit.colliders);

  // Ufuktaki şehir: kraterin kenarında gri kuleler, çöker.
  const towers = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#3b3b3e", roughness: 0.9 }), TOWERS);
  const towerSpots = Array.from({ length: TOWERS }, (_, i) => {
    const a = Math.PI * (1.15 + (0.7 * i) / TOWERS);
    const r = 100 + kit.random() * 10;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 10 + kit.random() * 26, w: 4 + kit.random() * 4, delay: kit.random() * 3 };
  });
  root.add(towers);

  // Yankı halkaları: "duyuyor musun" sorusu sessizliğe yayılır.
  const ringMaterial = new THREE.MeshBasicMaterial({ color: "#f2f2f2", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  const rings = Array.from({ length: 3 }, () => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 96), ringMaterial.clone());
    ring.rotation.x = -Math.PI / 2;
    root.add(ring);
    return { ring, age: 99 };
  });

  // Gizli keşif: yerde, durmuş bir cep saati.
  const watch = new THREE.Group();
  const caseMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 32), new THREE.MeshStandardMaterial({ color: "#c9a24a", metalness: 0.5, roughness: 0.3 }));
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), new THREE.MeshStandardMaterial({ color: "#f3efe4" }));
  face.rotation.x = -Math.PI / 2;
  face.position.y = 0.021;
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.002, 0.1), new THREE.MeshStandardMaterial({ color: "#111" }));
  hand.position.set(0.02, 0.023, -0.03);
  hand.rotation.y = 0.6;
  watch.add(caseMesh, face, hand);
  const wx = GRAMOPHONE.x + 4;
  const wz = GRAMOPHONE.z - 9;
  watch.position.set(wx, ground(wx, wz) + 0.03, wz);
  root.add(watch);
  const watchRest = watch.position.clone();
  let watchLook = -1;

  const shards: Shard[] = Array.from({ length: SHARDS }, () => ({
    home: new THREE.Vector3(),
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(),
    spin: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    scale: 1,
    state: "frozen",
  }));
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const towerMatrix = new THREE.Matrix4();
  let broken = 0;
  let clock = 0;
  let shattered = false;
  let vanish = -1;
  let cityFall = -1;
  let memory = 0;
  let frozen = 0;
  let frozenTarget = 0;
  let listening = false;
  let heartStop = 0;
  let heartTarget = 0;
  let tearing = false;
  let release = false;
  // Yağmur: hayat durunca damlalar bütün kraterde havada asılı kalır; bırakışta yeniden düşer.
  const rain = createRain(1400, "#dfe6f0", new THREE.Vector3(120, 26, 120), 16, 0.6);
  root.add(rain.lines);
  const rainCenter = new THREE.Vector3();
  let rainLevel = 0;

  // Karga sürüsü: kraterin üstünde döner; hayat durunca kanatları açık, havada donar; sonda dağılır.
  const crowMaterial = new THREE.MeshStandardMaterial({ color: "#141416", roughness: 0.7, side: THREE.DoubleSide });
  const crows: Flyer[] = Array.from({ length: 24 }, () => {
    const crow = bird(crowMaterial);
    crow.group.scale.setScalar(2.4);
    root.add(crow.group);
    return crow;
  });
  const crowAt = new THREE.Vector3();
  let crowClock = 0;
  let scatter = 0;
  // Gökteki yarıktan dökülen kül: gri, yavaş, yoğun.
  const ash = createPetals(260, "#9a9a9e", 0.1, new THREE.Vector3(50, 22, 50), 0.5);
  root.add(ash.mesh);
  let ashLevel = 0;
  const ashCenter = new THREE.Vector3();
  const phoneAt = new THREE.Vector3();
  // Zaman durduğunda yürümeye devam eden tek kişi: kalabalık silinirken merkeze yürür, kırıklar donarken
  // aralarından geçer, telefon çalınca yanına diz çöker, gök yırtılınca kalkar, kırıklar inince koşar.
  const walker = createActor(createFigure({ material: new THREE.MeshStandardMaterial({ color: "#e6dfd2", roughness: 0.9 }), height: 1.85 }), ground, { speed: 1.2, runSpeed: 4 });
  walker.figure.group.position.copy(rim(2.0, 0, 60));
  root.add(walker.figure.group);
  const walkerAt = (dx: number, dy: number, dz: number) => () => walker.figure.group.position.clone().add(new THREE.Vector3(dx, dy, dz));
  let walkerKneel = false;

  const breakShard = (shard: Shard, push: THREE.Vector3 | null) => {
    if (shard.state !== "frozen") return;
    shard.state = "falling";
    shard.velocity.set((kit.random() - 0.5) * 1.5, kit.random() * 1.2, (kit.random() - 0.5) * 1.5);
    if (push) shard.velocity.addScaledVector(push, 6 + kit.random() * 4);
    shard.spin.set(kit.random() * 8 - 4, kit.random() * 8 - 4, kit.random() * 8 - 4);
    broken += 1;
  };

  const progress = () => {
    kit.effects.crack = Math.max(kit.effects.crack, broken / SHARDS);
    if (!shattered && broken / SHARDS > 0.6) {
      shattered = true;
      kit.effects.timeBroken = true;
      kit.sfx.cue("pulse");
      announce(kit.hud, "Zaman kırıldı. Gökyüzü tam ortasından yarıldı.", 6);
    }
  };

  const echo = () => {
    const free = rings.reduce((best, ring) => (ring.age > best.age ? ring : best));
    free.age = 0;
    free.ring.position.copy(kit.player.position).setY(ground(kit.player.position.x, kit.player.position.z) + 0.2);
  };

  const away = new THREE.Vector3();
  return {
    root,
    hint: "Özlem dünyayı durduruyor. Havada donan kırıkların içinden geç ya da E ile öfkeni patlat.",
    interactables: [
      // Bakınca saat yerden kalkıp sana döner; akrep ilerlemek için titrer, ama geri düşer: zaman durmuş.
      secretItem(kit, "bugun-saat", (target) => target.copy(watch.position), {
        label: "Yerdeki cep saatine bak",
        radius: 0.3,
        reach: 2.4,
        onFound: () => void (watchLook = 0),
      }),
    ],
    action: {
      get label() {
        if (listening && !kit.secrets.has("bugun-yanki")) return "Seslen";
        return frozen > 0.5 ? "Öfkeni patlat" : "";
      },
      use: () => {
        if (listening && !kit.secrets.has("bugun-yanki")) {
          echo();
          kit.sfx.cue("chime");
          window.setTimeout(() => kit.secrets.reveal("bugun-yanki"), 1400);
          return;
        }
        let count = 0;
        for (const shard of shards) {
          if (shard.state !== "frozen") continue;
          away.copy(shard.position).sub(kit.camera.position);
          const d = away.length();
          if (d < 14) {
            breakShard(shard, away.normalize().multiplyScalar(1 - d / 14));
            count += 1;
          }
        }
        burst.origin.copy(kit.camera.position);
        burst.burst(clock);
        kit.effects.shake = 0.2;
        kit.sfx.cue(count ? "shatter" : "pulse");
        progress();
      },
    },
    // Klip: ağartılmış gri; anıda altın; donmuş zamanda siyah-beyaz; telefon anlarında soğuk mavi.
    // Klip: bütün kraterin durduğu gün. Sırttan gelirken kalabalık ve ufuktaki şehir görünür; kuleler
    // çökerken kamera kenar boyunca uçar; anı, donan zaman (yağmur havada, kargalar askıda), telefon;
    // yarık ve kül; sonda telefondan sırta doğru yükseliş.
    shots: [
      // Donmuş zamanda yürüyen: kırıkların arasından geçer, telefonun başında diz çöker.
      { at: L.stop + 2.5, from: walkerAt(-3.6, 1.5, 4.0), to: walkerAt(-2.8, 1.4, 3.2), look: walkerAt(0, 1.2, 0), fov: 44, grade: "cold" },
      { at: L.hear + 2.5, from: walkerAt(3.0, 1.2, 3.0), to: walkerAt(2.4, 1.0, 2.4), look: walkerAt(0, 0.8, 0), fov: 42, grade: { ...GRADES.cold, soft: 0.5 } },
      { at: 236, from: walkerAt(0, 1.4, -4), to: walkerAt(0, 1.6, -2.6), look: walkerAt(0, 1.2, 0), fov: 48, handheld: 0.05, grade: "bleach" },
      { at: 0, from: ridge(2.4, 40), path: [pt(-30, 18, 60), pt(-12, 4, 30)], to: cam(-4, 0.7, 20), look: CENTER, lookTo: cam(2, 5, 66), fov: 48, curve: "linear", grade: "bleach", in: "fade" },
      { at: 7, from: cam(16, 0.5, 6), to: cam(10, 0.5, 12), look: cam(-20, 5, 58), fov: 40, curve: "linear", grade: "bleach" },
      { at: L.gone, from: cam(-6, 0.6, 22), to: cam(2, 0.6, 26), look: cam(4, 5, 70), fov: 42, curve: "linear", grade: "cold" },
      { at: L.missed, from: cam(10, 0.4, 28), to: cam(8, 0.4, 32), look: cam(-6, 4, 72), fov: 34, grade: { ...GRADES.cold, soft: 0.8 } },
      { at: L.city, from: rim(3.5, 10, 84), path: arc(0, 0, 86, 12, 3.5, 4.3, 3), to: rim(4.3, 8, 84), look: pt(0, 16, -100), lookTo: pt(20, 12, -96), fov: 34, handheld: 0.04, curve: "linear", grade: "bleach" },
      { at: L.wanted, from: cam(34, 5, 64), to: cam(16, 5, 74), look: pt(0, 12, -100), fov: 40, curve: "linear", grade: "cold" },
      { at: L.memory, from: follow(phone, 4.4, 1.7, 5), to: follow(phone, 3.8, 1.4, 3.4), look: follow(phone, 3.2, 0.3, -6), fov: 48, grade: "memory" },
      { at: 47, orbit: { center: me(kit), radius: 7, height: 2, from: 0.8, to: 1.9 }, look: me(kit, 0, 1.4, 0), fov: 50, curve: "linear", grade: "memory", out: "white" },
      { at: L.stop, from: me(kit, -6, 2.5, 6), to: me(kit, 6, 3, -8), look: me(kit, 0, 3, -2), fov: 55, curve: "linear", grade: "noir", in: "white" },
      { at: L.unfinished, from: follow(crows[3].group, 2.6, 0.6, 2.6), to: follow(crows[3].group, 1.8, 0.4, 1.8), look: follow(crows[3].group), fov: 36, grade: { ...GRADES.noir, soft: 0.6 } },
      { at: L.day, from: me(kit, 16, 5, 0), path: [pt(-10, 8, 20), pt(-30, 6, 0)], to: pt(-20, 4, -30), look: me(kit, 0, 3, 0), lookTo: CENTER, fov: 50, curve: "linear", grade: "cold" },
      { at: 72.5, from: me(kit, 6, 1.2, 8), to: me(kit, 4, 1.4, 6), look: me(kit, -4, 12, -10), fov: 58, curve: "linear", grade: "bleach" },
      { at: L.hear, from: follow(phone, 1.2, 0.7, 1.4), to: follow(phone, 0.9, 0.6, 1.1), look: follow(phone, 0, 0.3, 0), fov: 36, grade: "cold", in: "flash" },
      { at: L.listen, from: follow(phone, 0.3, 0.5, 5), to: follow(phone, 0.3, 0.7, 7), look: follow(phone, 0, 1.2, -20), fov: 50, grade: "cold" },
      { at: L.say, from: follow(phone, -1.4, 0.4, 1.2), look: follow(phone, 0, 0.3, 0), fov: 34, grade: "cold" },
      { at: L.hear2, from: follow(phone, 3, 1.4, 3), to: follow(phone, 2, 1.1, 2), look: follow(phone, 0, 0.3, 0), fov: 44, grade: "cold", in: "flash" },
      { at: L.understand, from: me(kit, 10, 1.2, 10), to: me(kit, 6, 1.4, 6), look: me(kit, 0, 1.5, 0), fov: 44, grade: "cold" },
      { at: L.say2, from: follow(phone, 1.3, 0.7, 1.7), look: follow(phone, 0, 0.35, 0), fov: 34, grade: "cold" },
      { at: L.heart, orbit: { center: me(kit, 0, 3, 0), radius: 6, height: 0.5, from: 0, to: 1.6 }, look: me(kit, 0, 3, 0), fov: 50, curve: "linear", grade: "noir", in: "white" },
      { at: 112, from: pt(0, 20, 30), to: pt(0, 26, 16), look: FIGURE_AT, fov: 45, grade: "noir" },
      { at: L.heartB, orbit: { center: me(kit, 0, 3, 0), radius: 9, height: 1.5, from: 3, to: 1.6 }, look: me(kit, 0, 3, 0), fov: 50, curve: "linear", grade: "noir" },
      { at: 132, orbit: { center: CENTER, radius: 34, height: 7, from: 0, to: 1.2 }, look: pt(0, 4, 0), fov: 50, curve: "linear", grade: "bleach" },
      { at: 146, from: rim(1.3, 3), path: [pt(10, 5, 30)], to: pt(-24, 4, 6), look: CENTER, fov: 48, curve: "linear", grade: "cold" },
      { at: L.tear, from: me(kit, 0, 1.7, 0), look: pt(0, 50, -40), lookTo: pt(0, 60, -30), fov: 70, grade: "bleach" },
      { at: L.missed2, from: pt(0, 20, 40), to: pt(0, 30, 10), look: pt(0, 70, -40), fov: 60, curve: "linear", grade: "cold" },
      { at: L.day2, from: pt(4, 14, 30), to: pt(2, 18, 22), look: FIGURE_AT, fov: 50, grade: "memory" },
      { at: L.hear3, from: follow(phone, 1.2, 0.7, 1.4), to: follow(phone, 0.9, 0.6, 1.1), look: follow(phone, 0, 0.3, 0), fov: 36, grade: "cold", in: "flash" },
      { at: L.listen3, from: follow(phone, -0.3, 0.5, 5), to: follow(phone, -0.3, 0.8, 8), look: follow(phone, 0, 1.2, -20), fov: 50, grade: "cold" },
      { at: L.say3, from: follow(phone, 1.8, 0.9, 1.4), look: follow(phone, 0, 0.3, 0), fov: 36, grade: "cold" },
      { at: L.heart2, from: me(kit, 2, 0.4, 4), to: me(kit, 1, 0.6, 2), look: me(kit, 0, 4, -6), fov: 62, grade: "bleach" },
      { at: L.heart3, orbit: { center: CENTER, radius: 30, height: 4, from: 1, to: 2.4 }, look: pt(0, 6, 0), fov: 52, curve: "linear", grade: "bleach" },
      { at: L.heart4, from: me(kit, -10, 0.8, 8), to: me(kit, 6, 1, 10), look: me(kit, 4, 5, -24), fov: 46, curve: "linear", grade: "cold" },
      { at: L.heart5, from: pt(4, 14, 30), to: pt(2, 20, 20), look: FIGURE_AT, fov: 48, grade: "bleach" },
      { at: L.end, from: follow(phone, 0.8, 0.5, 1.6), path: [follow(phone, 4, 6, 12), pt(20, 26, 60)], to: ridge(0.8, 46), look: follow(phone, 0, 0.3, 0), lookTo: CENTER, fov: 50, curve: "linear", grade: "bleach", out: "fade" },
    ],
    beats: [
      { at: 0, id: "grey" },
      { at: L.gone, id: "vanish", line: "Kalabalık birer birer siliniyor; meydan boşalıyor." },
      { at: L.city, id: "city", line: "Ufuktaki kuleler tek tek çöküyor." },
      { at: L.memory, id: "memory", line: "Bir anı: altın bir ışık, yerde yan yana iki gölge. Gölgeleri yapan kimse yok." },
      { at: L.stop, id: "stop", line: "Her şey havada donuyor: kırıklar, toz, ışık. Yalnızca bir adam yürümeye devam ediyor." },
      { at: L.hear, id: "hear", line: "Yerde eski bir telefon çalıyor. Kablosu toprağa gömülü." },
      { at: L.hear2, id: "hear-again", line: "Yine çalıyor. Kimse açmıyor." },
      { at: L.heart, id: "heart-stop", line: "Donmuş zamanın içinde kamera dönüyor; hiçbir şey kıpırdamıyor." },
      { at: 125, id: "after" },
      { at: L.tear, id: "tear", line: "Gökyüzü kâğıt gibi buruşuyor, ortasından yarılıyor." },
      { at: L.hear3, id: "hear3", line: "Telefon son kez çalıyor." },
      { at: L.heart2, id: "release", line: "Kırıklar yavaşça yere iniyor." },
      { at: L.end, id: "end" },
    ],
    onBeat(id) {
      if (id === "vanish") {
        vanish = 0;
        walker.goTo(6, 6);
      }
      if (id === "stop") walker.goTo(-8, -10);
      if (id === "hear") {
        walker.goTo(phoneAt.x + 1.2, phoneAt.z + 1.2, false, Math.atan2(-1.2, -1.2));
        walkerKneel = true;
      }
      if (id === "tear") {
        walkerKneel = false;
        walker.goTo(walker.figure.group.position.x + 2, walker.figure.group.position.z - 2);
      }
      if (id === "release") walker.goTo(0, -22, true);
      if (id === "city") {
        cityFall = 0;
        kit.effects.shake = 0.1;
        kit.sfx.cue("crumble");
      }
      if (id === "memory") memory = 0.001;
      if (id === "stop") {
        frozenTarget = 1;
        kit.sfx.cue("pulse");
      }
      if (id === "hear" || id === "hear-again" || id === "hear3") {
        listening = true;
        echo();
        ring = 0;
      }
      if (id === "heart-stop") {
        listening = false;
        heartTarget = 1;
        kit.sfx.cue("pulse");
      }
      if (id === "after") heartTarget = 0.35;
      if (id === "tear") tearing = true;
      if (id === "release") release = true;
      if (id === "end") {
        frozenTarget = 0;
        listening = false;
      }
    },
    reset() {
      walkerKneel = false;
      walker.rest("still");
      walker.figure.group.position.copy(rim(2.0, 0, 60));
      crowClock = scatter = ashLevel = 0;
      broken = 0;
      shattered = tearing = release = listening = false;
      vanish = cityFall = -1;
      memory = frozen = frozenTarget = heartStop = heartTarget = 0;
      ring = -1;
      phoneLight.intensity = 0;
      // Telefon ve anının gölgeleri oyuncunun yanında (şarkı başladığı yerde).
      phoneAt.set(kit.player.position.x - 3.5, 0, kit.player.position.z - 3.5);
      phoneAt.y = ground(phoneAt.x, phoneAt.z);
      phone.position.copy(phoneAt);
      phone.rotation.y = Math.atan2(kit.player.position.x - phoneAt.x, kit.player.position.z - phoneAt.z);
      shadows.forEach(({ mesh, k }) => {
        const x = phoneAt.x + 2.6 + k * 1.3;
        const z = phoneAt.z - 1.6;
        mesh.position.set(x, ground(x, z) + 0.14, z);
        mesh.rotation.z = 0.5 + k * 0.08;
      });
      sun.target.position.copy(phoneAt);
      sun.position.set(phoneAt.x - 30, phoneAt.y + 8, phoneAt.z + 40);
      kit.effects.crack = 0;
      kit.effects.timeBroken = false;
      people.presence.fill(0);
      const center = kit.player.position;
      for (const shard of shards) {
        const angle = kit.random() * Math.PI * 2;
        const radius = 3 + kit.random() ** 0.7 * 40;
        const x = center.x + Math.cos(angle) * radius;
        const z = center.z + Math.sin(angle) * radius;
        shard.home.set(x, ground(x, z) + 0.6 + kit.random() * 7, z);
        shard.position.copy(shard.home);
        shard.rotation.set(kit.random() * 6, kit.random() * 6, kit.random() * 6);
        shard.scale = 0.5 + kit.random() * 1.4;
        shard.state = "frozen";
      }
    },
    update(dt, time, level) {
      clock = time;
      if (walker.arrived) walker.rest(walkerKneel ? "kneel" : "still");
      walker.update(dt, time);
      walker.figure.group.visible = level > 0.05;

      // İnsanlar: önce belirir, sonra "yok olsun" anında tek tek toprağa gömülür.
      if (vanish >= 0) vanish += dt;
      for (let i = 0; i < PEOPLE; i += 1) {
        const gone = vanish >= 0 && vanish > i * 0.45;
        people.presence[i] += ((gone ? 0 : 1) * level - people.presence[i]) * Math.min(1, dt * (gone ? 2 : 0.8));
      }
      people.update(time);

      if (cityFall >= 0) cityFall += dt;
      towerSpots.forEach((t, i) => {
        const fall = cityFall >= 0 ? ease((cityFall - t.delay) / 4) : 0;
        const h = t.h * (1 - fall) * level + 0.001;
        towerMatrix.compose(
          new THREE.Vector3(t.x, ground(t.x, t.z) + h / 2 - 0.5, t.z),
          quaternion.setFromEuler(new THREE.Euler(fall * 0.3, Math.atan2(-t.x, -t.z), fall * 0.2 * (i % 2 ? 1 : -1))),
          new THREE.Vector3(t.w, h, t.w),
        );
        towers.setMatrixAt(i, towerMatrix);
      });
      towers.instanceMatrix.needsUpdate = true;

      // Güneşli günün anısı: bir anlığına renk ve ışık, sonra biter.
      if (memory > 0) memory = Math.min(1, memory + dt / 11);
      const glow = Math.sin(memory * Math.PI);
      shadowMaterial.opacity = Math.min(1, glow * 1.4) * level;
      sun.intensity = glow * 2.6 * level;
      shadows.forEach(({ mesh }) => (mesh.visible = glow > 0.02));
      // Telefon: dört çalış; zil sallanır, ahize zıplar, kırmızı ışık yanıp söner.
      phone.visible = level > 0.3;
      if (ring >= 0) {
        ring += dt;
        const buzz = ring % 1.6 < 0.9 ? 1 : 0;
        receiver.position.y = 0.26 + buzz * Math.abs(Math.sin(ring * 40)) * 0.03;
        phone.rotation.z = buzz * Math.sin(ring * 60) * 0.03;
        (bell.material as THREE.MeshBasicMaterial).color.setRGB(buzz ? 1 : 0.2, buzz ? 0.15 : 0.02, 0.02);
        phoneLight.intensity = buzz * 6 * level;
        if (buzz && Math.floor(ring / 1.6) !== Math.floor((ring - dt) / 1.6)) kit.sfx.cue("switch");
        if (ring > 6.4) {
          ring = -1;
          phone.rotation.z = 0;
          receiver.position.y = 0.26;
          phoneLight.intensity = 0;
        }
      }
      kit.effects.saturation = 1 + glow * 0.6 - ease(heartStop) * 0.9;

      // Yağmur: durmuş zamanda askıda (dt 0), bırakışta düşer.
      rainLevel += ((frozenTarget > 0 || release ? 1 : 0) * level - rainLevel) * Math.min(1, dt * 0.5);
      rain.level = rainLevel;
      rainCenter.set(kit.camera.position.x, ground(kit.camera.position.x, kit.camera.position.z) - 1, kit.camera.position.z);
      rain.update(frozen > 0.5 && !release ? 0 : dt, rainCenter);
      // Kargalar: zaman donunca kendi saatleri de durur (kanat havada, sürü askıda).
      crowClock += dt * (1 - Math.min(1, frozen * 1.2));
      if (release) scatter = Math.min(1, scatter + dt / 8);
      const pc = kit.player.position;
      crows.forEach((crow, i) => {
        const a = crowClock * (0.22 + (i % 5) * 0.02) + i * 0.52;
        const r = 14 + (i % 6) * 3.2 + scatter * 40;
        crowAt.set(pc.x + Math.cos(a) * r, ground(pc.x, pc.z) + 9 + (i % 4) * 2.2 + Math.sin(crowClock * 0.8 + i) * 1.2 + scatter * 25, pc.z + Math.sin(a) * r);
        flyTo(crow, crowAt);
        flap(crow, crowClock, 7 + (i % 3), 0.7);
        crow.group.visible = level > 0.2 && scatter < 1;
      });
      // Kül: yarık açılınca başlar, bırakışta yoğunlaşır.
      ashLevel += ((tearing ? (release ? 1 : 0.7) : 0) * level - ashLevel) * Math.min(1, dt * 0.5);
      ash.level = ashLevel;
      ashCenter.set(pc.x, ground(pc.x, pc.z) - 1, pc.z);
      ash.update(release || frozen < 0.5 ? time : 0, ashCenter);
      kit.effects.dim = -glow * 0.25;

      // Kalp durunca: renk çekilir; "sonrası"nda kısmen geri gelir.
      heartStop += (heartTarget - heartStop) * Math.min(1, dt * 0.6);
      if (tearing) kit.effects.crack = Math.min(1, kit.effects.crack + dt / 12);

      frozen += (frozenTarget * level - frozen) * Math.min(1, dt * 1.5);
      material.opacity = 0.75 * frozen;
      let fell = false;
      shards.forEach((shard, i) => {
        if (frozen > 0.5 && !kit.cinema() && shard.state === "frozen" && shard.position.distanceTo(kit.camera.position) < 2.3) {
          breakShard(shard, away.copy(shard.position).sub(kit.camera.position).normalize().multiplyScalar(0.4));
          fell = true;
        }
        if (release && shard.state === "frozen" && kit.random() < dt * 0.25) breakShard(shard, null);
        if (shard.state === "falling") {
          shard.velocity.y -= (release ? 2.5 : 9.8) * dt;
          shard.position.addScaledVector(shard.velocity, dt);
          shard.rotation.x += shard.spin.x * dt;
          shard.rotation.y += shard.spin.y * dt;
          shard.rotation.z += shard.spin.z * dt;
          if (shard.position.y < ground(shard.position.x, shard.position.z)) {
            shard.state = "gone";
            if (!release && kit.random() < 0.25) kit.sfx.cue("shatter");
          }
        }
        const visible = shard.state !== "gone";
        scale.setScalar(visible ? shard.scale * ease(frozen * 1.2 - (i % 10) * 0.02) : 0);
        quaternion.setFromEuler(shard.rotation);
        matrix.compose(shard.position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = frozen > 0.01;
      if (fell) {
        kit.sfx.cue("shatter");
        progress();
      }
      burst.update(time);

      rings.forEach(({ ring }, i) => {
        rings[i].age += dt;
        const k = rings[i].age / 4;
        ring.scale.setScalar(1 + k * 60);
        (ring.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - k) * 0.6 * level;
        ring.visible = k < 1;
      });
      watch.visible = level > 0.3;
      if (watchLook >= 0) {
        watchLook += dt;
        const up = Math.sin(Math.min(1, watchLook / 5) * Math.PI);
        watch.position.copy(watchRest).setY(watchRest.y + up * 1.1);
        watch.lookAt(kit.camera.position);
        watch.rotateX(Math.PI / 2 * up);
        // Akrep her saniye ileri atılmaya çalışır, geri düşer.
        const tick = (watchLook % 1) < 0.12 ? 0.35 : 0;
        hand.rotation.y = 0.6 - tick;
        if (tick && (watchLook - dt) % 1 >= 0.12) kit.sfx.cue("switch");
        if (watchLook > 5) {
          watchLook = -1;
          watch.position.copy(watchRest);
          watch.rotation.set(0, 0, 0);
          hand.rotation.y = 0.6;
        }
      }
    },
  };
}
