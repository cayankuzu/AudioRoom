import * as THREE from "three";
import { approach } from "../../engine/fx/fade";
import { createEmitter, SPARKLE } from "../../engine/fx/emitter";
import { glowSprite } from "../../engine/fx/glow";
import type { PromptLine } from "../../engine/game/interaction";
import type { WorldContext } from "../../engine/world";
import { SHADOW_AZIMUTH, wombGround } from "./womb";

/**
 * Hatıra eşyaları: her şarkının klibine ait nesneler. Ait olduğu şarkının ilgili anında
 * zarın içinde belirir (ör. "kerem" perdesinde yanan bir tüy) ve şarkı bitince kaybolur;
 * birkaçı klip sırasında bir davranışla açılır (kâbusta zıplamak, meydanla bağırmak).
 * Şarkı çalmazken rahim kapaktaki hâlindedir: hiçbiri görünmez.
 */
interface Keepsake {
  id: string;
  object: THREE.Object3D;
  label: string;
  /** Yalnızca bu şarkı çalarken, [from, until) saniyeleri arasında görünür. */
  track?: string;
  from?: number;
  until?: number;
  radius?: number;
  reach?: number;
  /** E'ye basılınca; false dönerse sır henüz açılmaz (ör. beş damladan biri). */
  onUse?(): boolean | void;
  /** Etkileşim yerine bir durumla açılır (ör. içinde durmak); true: açığa çıkar. */
  check?(player: THREE.Vector3): boolean;
  /** Sır açılınca oynayan kısa sahne (t: açıldığından beri geçen süre); false dönünce biter. */
  effect?(t: number, dt: number): boolean;
  fx: number;
  visible: number;
}

/** Gölge perdesinin önündeki yay üzerinde bir nokta (a: perdeye göre açı farkı, r: merkezden uzaklık). */
function spot(a: number, r: number, lift = 0): THREE.Vector3 {
  const angle = SHADOW_AZIMUTH + a;
  const x = Math.sin(angle) * r;
  const z = -Math.cos(angle) * r;
  return new THREE.Vector3(x, wombGround(x, z) + lift, z);
}

function paper(width: number, height: number, draw: (g: CanvasRenderingContext2D) => void): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = Math.round((256 * height) / width);
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#efe3c8";
  g.fillRect(0, 0, canvas.width, canvas.height);
  draw(g);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, side: THREE.DoubleSide, emissive: "#3a2410", emissiveIntensity: 0.35 }),
  );
  return mesh;
}

function lines(g: CanvasRenderingContext2D, from: number, to: number, step = 16): void {
  g.strokeStyle = "rgba(40,30,20,0.55)";
  g.lineWidth = 3;
  for (let y = from; y < to; y += step) {
    g.beginPath();
    g.moveTo(26, y);
    g.lineTo(230 - ((y * 7) % 40), y);
    g.stroke();
  }
}

const wood = new THREE.MeshStandardMaterial({ color: "#7a4a26", roughness: 0.7 });
const dark = new THREE.MeshStandardMaterial({ color: "#161012", roughness: 0.4, metalness: 0.2 });

export interface Keepsakes {
  update(dt: number, time: number, track: string | null, songTime: number): void;
  /** Genel eylem (bakılan nesne yokken): Yuh Yuh'ta meydanla bağırmak. */
  prompt(): PromptLine[] | null;
  use(): boolean;
}

export function createKeepsakes(ctx: WorldContext, kick: () => void): Keepsakes {
  const { scene, interaction, secrets, sfx, player, camera } = ctx;
  const list: Keepsake[] = [];
  const sparkle = createEmitter({ ...SPARKLE("#ffe0b0", 1.4), count: 80 });
  scene.add(sparkle.points);
  let clock = 0;

  const add = (item: Omit<Keepsake, "visible" | "fx">) => {
    const keepsake: Keepsake = { ...item, visible: item.track ? 0 : 1, fx: -1 };
    // Hafif bir hale: kırmızımsı zarda eşyayı seçilir kılar (nesneyle kesişip yarılmasın diye derinlik testi yok).
    const halo = glowSprite("#ffb070", 1.3);
    halo.material.opacity = 0.32;
    halo.material.depthTest = false;
    keepsake.object.add(halo);
    keepsake.object.scale.setScalar(keepsake.visible);
    keepsake.object.visible = keepsake.visible > 0;
    scene.add(keepsake.object);
    list.push(keepsake);
    if (item.check) return keepsake;
    interaction.add({
      radius: item.radius ?? 0.5,
      reach: item.reach,
      position: (target) => keepsake.object.getWorldPosition(target),
      prompt: () => (keepsake.visible > 0.6 && !secrets.has(item.id) ? [{ key: "E", label: item.label }] : null),
      use: () => {
        if (item.onUse?.() === false) return;
        if (secrets.reveal(item.id)) {
          sparkle.origin.copy(keepsake.object.getWorldPosition(new THREE.Vector3()));
          sparkle.burst(clock);
          keepsake.fx = 0;
        }
      },
    });
    return keepsake;
  };
  const place = (object: THREE.Object3D, at: THREE.Vector3, yaw = 0) => {
    object.position.copy(at);
    object.rotation.y = yaw;
    return object;
  };

  // --- Ben İnsan Değil Miyim ----------------------------------------------------
  // Kukla: iplerle tepeden sarkar; iplerini kesince yere düşer, özgür.
  const puppet = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: "#c79a6a", roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.22, 4, 8), wood);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), skin);
  head.position.y = 0.26;
  const limbs: THREE.Mesh[] = [];
  for (const [x, y, len] of [[-0.14, 0.02, 0.2], [0.14, 0.02, 0.2], [-0.05, -0.28, 0.24], [0.05, -0.28, 0.24]]) {
    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, len, 3, 6), wood);
    limb.position.set(x, y, 0);
    limbs.push(limb);
  }
  const doll = new THREE.Group();
  doll.add(body, head, ...limbs);
  const cross = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), wood);
  cross.position.y = 2.3;
  const stringMaterial = new THREE.LineBasicMaterial({ color: "#f2e6d0", transparent: true, opacity: 0.8 });
  const strings = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.24, 2.3, 0), new THREE.Vector3(-0.14, 0.1, 0),
      new THREE.Vector3(0, 2.3, 0), new THREE.Vector3(0, 0.34, 0),
      new THREE.Vector3(0.24, 2.3, 0), new THREE.Vector3(0.14, 0.1, 0),
    ]),
    stringMaterial,
  );
  puppet.add(doll, cross, strings);
  let cut = -1;
  add({
    id: "kukla",
    object: place(puppet, spot(0.3, 14, 1.3), -0.3),
    label: "Kuklanın iplerini kes",
    track: "ben-insan-degil-miyim",
    from: 118.1,
    onUse: () => {
      cut = 0;
      sfx.cue("hit");
    },
  });

  // Kara yağmur: isyan perdesinde tek bir bulut ve altında simsiyah yağmur.
  const storm = new THREE.Group();
  const cloud = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 10), new THREE.MeshStandardMaterial({ color: "#120606", roughness: 1 }));
  cloud.scale.set(1.4, 0.45, 1.4);
  cloud.position.y = 6;
  const blackRain = createEmitter({
    count: 260,
    colors: ["#050303", "#1a0a08"],
    size: 0.09,
    life: 0.9,
    spread: new THREE.Vector3(1.4, 0.2, 1.4),
    velocity: new THREE.Vector3(0, -7, 0),
    jitter: 0.2,
    additive: false,
  });
  storm.add(cloud);
  scene.add(blackRain.points);
  const stormKeep = add({
    id: "kara-yagmur",
    object: place(storm, spot(-0.55, 15)),
    label: "",
    track: "ben-insan-degil-miyim",
    from: 219.8,
    check: (p) => Math.hypot(p.x - storm.position.x, p.z - storm.position.z) < 1.7,
  });

  // --- Aldırma Gönül ------------------------------------------------------------
  const letter = new THREE.Group();
  const envelope = paper(0.34, 0.22, (g) => {
    g.strokeStyle = "rgba(60,40,20,0.5)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(128, 90);
    g.lineTo(256, 0);
    g.stroke();
    g.strokeStyle = "rgba(40,50,120,0.75)";
    g.lineWidth = 5;
    g.beginPath();
    g.arc(200, 120, 30, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "rgba(40,50,120,0.75)";
    g.font = "bold 13px monospace";
    g.fillText("SİNOP", 178, 125);
    g.fillStyle = "#3a2a1a";
    g.font = "italic 20px serif";
    g.fillText("Aldırma.", 30, 140);
  });
  envelope.rotation.x = -Math.PI / 2;
  letter.add(envelope);
  const mektup = add({ id: "mektup", object: place(letter, spot(0.95, 11.5, 0.03), 0.3), label: "Mektubu aç", track: "aldirma-gonul", from: 35.2 });
  const page = paper(0.28, 0.36, (g) => {
    g.fillStyle = "#2a1a10";
    g.font = "italic 30px serif";
    g.fillText("Aldırma.", 60, 150);
    g.font = "16px serif";
    g.fillText("— Sinop", 150, 300);
  });
  page.visible = false;
  letter.add(page);
  mektup.effect = (t) => {
    page.visible = true;
    const k = Math.min(1, t / 1.2);
    page.position.set(0, 0.05 + k * 0.55, 0);
    page.rotation.set(-Math.PI / 2 * (1 - k), 0, 0);
    return t < 1.2;
  };

  // --- O Çeşme ------------------------------------------------------------------
  // Beş damla: perdeye yakın, farklı yüksekliklerde süzülen su damlaları.
  const dropMaterial = new THREE.MeshStandardMaterial({ color: "#bfe6ff", emissive: "#5aa8ff", emissiveIntensity: 1.2, roughness: 0.1 });
  let drops = 0;
  for (let i = 0; i < 5; i += 1) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), dropMaterial);
    drop.scale.y = 1.4;
    const holder = new THREE.Group();
    holder.add(drop);
    // Tek tek toplanır: alınan damla kaybolur, sır beşincisinde açılır.
    add({
      id: "damla",
      object: place(holder, spot(-0.9 + i * 0.4, 12 + ((i * 3) % 5), 1 + (i % 3) * 0.4)),
      label: "Damlayı avucuna al",
      track: "o-cesme",
      from: 33.4,
      radius: 0.35,
      onUse: () => {
        holder.userData.taken = true;
        drops += 1;
        sfx.cue("chime");
        if (drops < 5) ctx.hud.hint(`Damla ${drops}/5`, 2);
        return drops >= 5;
      },
    });
  }

  const jug = new THREE.Group();
  const profile = [
    [0.0, 0], [0.12, 0.01], [0.16, 0.08], [0.17, 0.2], [0.12, 0.33], [0.06, 0.4], [0.065, 0.46],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const clay = new THREE.MeshStandardMaterial({ color: "#a4532e", roughness: 0.85, side: THREE.DoubleSide });
  const jugBody = new THREE.Mesh(new THREE.LatheGeometry(profile, 20, 0.6, Math.PI * 1.65), clay);
  const shard = new THREE.Mesh(new THREE.LatheGeometry(profile.slice(1, 4), 6, 0, 0.5), clay);
  shard.position.set(0.3, 0, 0.1);
  shard.rotation.set(1.3, 0, 0.2);
  jug.add(jugBody, shard);
  jug.rotation.z = 0.3;
  const testi = add({ id: "testi", object: place(jug, spot(-1.1, 14, 0.05)), label: "Kırık testiye bak", track: "o-cesme", from: 121 });
  const shardHome = shard.position.clone();
  const shardRot = shard.rotation.clone();
  const sip = glowSprite("#9fd4ff", 0.35);
  sip.position.set(0, 0.36, 0);
  sip.visible = false;
  jug.add(sip);
  testi.effect = (t) => {
    const k = t < 3.5 ? Math.min(1, t / 1) : Math.max(0, 1 - (t - 3.5) / 0.6);
    shard.position.lerpVectors(shardHome, new THREE.Vector3(0, 0, 0), k);
    shard.rotation.set(shardRot.x * (1 - k), shardRot.y * (1 - k), shardRot.z * (1 - k));
    sip.visible = k > 0.95;
    if (t > 3.5 && t - 0.05 <= 3.5) sfx.cue("shatter");
    return t < 4.1;
  };

  // --- İtirazım Var -------------------------------------------------------------
  const petition = paper(0.3, 0.42, (g) => {
    g.fillStyle = "#2a1a10";
    g.font = "bold 20px serif";
    g.fillText("KADER MAKAMINA", 30, 40);
    lines(g, 70, 280);
    g.strokeStyle = "rgba(160,30,30,0.8)";
    g.lineWidth = 4;
    g.strokeRect(150, 300, 80, 44);
    g.fillStyle = "rgba(160,30,30,0.8)";
    g.font = "bold 14px monospace";
    g.fillText("İTİRAZ", 162, 328);
  });
  petition.rotation.x = -Math.PI / 2 + 0.05;
  const petitionHolder = new THREE.Group();
  petitionHolder.add(petition);
  const dilekce = add({ id: "dilekce", object: place(petitionHolder, spot(-0.2, 13, 0.03), 0.5), label: "Dilekçeyi oku", track: "itirazim-var", from: 24.3 });
  dilekce.effect = (t) => {
    if (t < 0.05) {
      const map = (petition.material as THREE.MeshStandardMaterial).map as THREE.CanvasTexture;
      const g = (map.image as HTMLCanvasElement).getContext("2d")!;
      g.save();
      g.translate(128, 190);
      g.rotate(-0.25);
      g.strokeStyle = "rgba(170,20,20,0.85)";
      g.lineWidth = 6;
      g.strokeRect(-90, -30, 180, 60);
      g.fillStyle = "rgba(170,20,20,0.85)";
      g.font = "bold 30px monospace";
      g.textAlign = "center";
      g.fillText("ALINDI", 0, 11);
      g.restore();
      map.needsUpdate = true;
      sfx.cue("hit");
    }
    petitionHolder.position.y = petitionHolder.userData.y ?? (petitionHolder.userData.y = petitionHolder.position.y);
    petitionHolder.position.y += Math.sin(Math.min(1, t / 0.4) * Math.PI) * 0.15;
    return t < 0.4;
  };

  // Kızıl halkalar: "cehennem" perdelerinde yerde yanan üç halka.
  const rings = new THREE.Group();
  const ringMaterial = new THREE.MeshBasicMaterial({ color: "#ff3a1a", transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const r of [0.8, 1.5, 2.2]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.05, 6, 64), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    rings.add(ring);
  }
  const ringsA = add({
    id: "cehennem",
    object: place(rings, spot(-0.62, 9)),
    label: "",
    track: "itirazim-var",
    from: 104.1,
    until: 141.5,
    check: (p) => Math.hypot(p.x - rings.position.x, p.z - rings.position.z) < 0.7,
  });
  const ringsB = rings.clone();
  const ringsBKeep = add({
    id: "cehennem",
    object: place(ringsB, spot(-0.62, 9)),
    label: "",
    track: "itirazim-var",
    from: 221.6,
    check: (p) => Math.hypot(p.x - ringsB.position.x, p.z - ringsB.position.z) < 0.7,
  });

  // --- Ağla Sevdam --------------------------------------------------------------
  // Klarnet: kendi kendine çalar; ona bakınca utanıp susar.
  const clarinet = new THREE.Group();
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.62, 12), dark);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.1, 16, 1, true), dark);
  bell.position.y = -0.36;
  const silver = new THREE.MeshStandardMaterial({ color: "#d8d8e0", metalness: 0.5, roughness: 0.3 });
  for (let k = 0; k < 6; k += 1) {
    const key = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.005, 6, 16), silver);
    key.rotation.x = Math.PI / 2;
    key.position.y = 0.2 - k * 0.08;
    clarinet.add(key);
  }
  clarinet.add(tube, bell);
  clarinet.rotation.z = 0.5;
  const notes = createEmitter({
    count: 40,
    colors: ["#fff4dc", "#ffb070"],
    size: 0.12,
    life: 2.2,
    spread: new THREE.Vector3(0.05, 0.05, 0.05),
    velocity: new THREE.Vector3(0.2, 0.6, 0),
    jitter: 0.25,
    additive: true,
  });
  scene.add(notes.points);
  let shy = 0;
  const clarinetKeep = add({
    id: "klarnet",
    object: place(clarinet, spot(-0.35, 15, 1.5)),
    label: "Klarnete kulak ver",
    track: "agla-sevdam",
    from: 0,
    radius: 0.4,
    onUse: () => void (shy = 1),
  });

  // Boş saray: tabure ve hâlâ sıcak bir çay.
  const tea = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20), wood);
  seat.position.y = 0.42;
  tea.add(seat);
  for (let k = 0; k < 3; k += 1) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 6), wood);
    const a = (k / 3) * Math.PI * 2;
    leg.position.set(Math.cos(a) * 0.13, 0.2, Math.sin(a) * 0.13);
    tea.add(leg);
  }
  const glass = new THREE.Mesh(
    new THREE.LatheGeometry([[0.022, 0], [0.03, 0.02], [0.02, 0.05], [0.032, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 16),
    new THREE.MeshStandardMaterial({ color: "#c2461a", emissive: "#6a1a04", emissiveIntensity: 0.8, transparent: true, opacity: 0.85, roughness: 0.1 }),
  );
  glass.position.set(0.05, 0.445, 0);
  const steam = glowSprite("#ffffff", 0.18);
  steam.position.set(0.05, 0.62, 0);
  tea.add(glass, steam);
  const sarayItem = add({ id: "bos-saray", object: place(tea, spot(-1, 12)), label: "Tabureye otur", track: "agla-sevdam", from: 105.7 });
  sarayItem.effect = (t) => {
    const k = t < 6 ? Math.min(1, t / 0.8) : Math.max(0, 1 - (t - 6) / 0.8);
    player.options.eyeHeight = 1.7 - k * 0.75;
    steam.scale.setScalar(0.18 + k * 0.5);
    return t < 6.8;
  };

  // --- Issızlığın Ortasında -----------------------------------------------------
  const brokenSaz = new THREE.Group();
  // Armut biçimli tekne, göğüs tahtası, uzun sap ve burgular; teller kopup sarkmış.
  const sazBody = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), wood);
  sazBody.scale.set(1, 1.45, 0.62);
  sazBody.position.y = 0.3;
  const soundboard = new THREE.Mesh(new THREE.CircleGeometry(0.19, 24), new THREE.MeshStandardMaterial({ color: "#c9965a", roughness: 0.6 }));
  soundboard.scale.set(1, 1.42, 1);
  soundboard.position.set(0, 0.3, 0.121);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.8, 0.035), wood);
  neck.position.y = 0.95;
  const pegbox = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.04), wood);
  pegbox.position.y = 1.42;
  const broken = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.012, 1.34, 0.03), new THREE.Vector3(-0.07, 1.02, 0.06),
      new THREE.Vector3(0.012, 1.34, 0.03), new THREE.Vector3(0.05, 0.96, 0.07),
      new THREE.Vector3(0, 0.14, 0.13), new THREE.Vector3(0.06, 0.42, 0.16),
    ]),
    stringMaterial,
  );
  brokenSaz.add(sazBody, soundboard, neck, pegbox, broken);
  brokenSaz.rotation.z = -0.25;
  const sazItem = add({ id: "saz-telleri", object: place(brokenSaz, spot(-0.1, 14, 0.02), 0.4), label: "Telleri kesik saza dokun", track: "issizligin-ortasinda", from: 95.2 });
  sazItem.effect = (t) => {
    broken.position.x = Math.sin(t * 70) * 0.012 * Math.max(0, 1 - t / 2);
    return t < 2;
  };

  // Uyanış: kâbus perdelerinde zıplayan uyanır.
  const nightmare = (song: number) => (song >= 83.4 && song < 123.5) || (song >= 160.2 && song < 200);

  // --- Neydi Günahım ------------------------------------------------------------
  const feather = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.25);
  shape.quadraticCurveTo(0.09, 0, 0, 0.28);
  shape.quadraticCurveTo(-0.07, 0, 0, -0.25);
  const vane = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 8),
    new THREE.MeshStandardMaterial({ color: "#ffd2a0", emissive: "#ff6a1a", emissiveIntensity: 1.4, side: THREE.DoubleSide }),
  );
  feather.add(vane, glowSprite("#ff7a2a", 0.9));
  feather.rotation.z = 0.4;
  const keremItem = add({ id: "kerem-tuyu", object: place(feather, spot(-0.8, 12, 1.4)), label: "Yanan tüye dokun", track: "neydi-gunahim", from: 100.4 });
  const featherY = feather.position.y;
  keremItem.effect = (t) => {
    const k = Math.sin(Math.min(1, t / 3.5) * Math.PI);
    feather.position.y = featherY + k * 1.6;
    (vane.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4 + k * 3;
    return t < 3.5;
  };

  // Felekten bir gece: perdenin üstünde tek bir yıldız; E ile koparılır.
  const star = new THREE.Group();
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: "#fff6e0" }));
  star.add(core, glowSprite("#ffe6b0", 3));
  let plucked = -1;
  const starHome = spot(-0.1, 17, 8.5);
  add({
    id: "felekten-gece",
    object: place(star, starHome),
    label: "Yıldızı kopar",
    track: "neydi-gunahim",
    from: 132.2,
    radius: 1.2,
    reach: 40,
    onUse: () => void (plucked = 0),
  });

  // --- Yuh Yuh ------------------------------------------------------------------
  const amulet = new THREE.Group();
  const tri = new THREE.Shape();
  tri.moveTo(-0.12, 0);
  tri.lineTo(0.12, 0);
  tri.lineTo(0, -0.2);
  tri.closePath();
  const pouch = new THREE.Mesh(
    new THREE.ExtrudeGeometry(tri, { depth: 0.03, bevelEnabled: false }),
    new THREE.MeshStandardMaterial({ color: "#5a3418", roughness: 0.8 }),
  );
  const cord = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0.015), new THREE.Vector3(0, 2, 0.015)]),
    stringMaterial,
  );
  amulet.add(pouch, cord);
  const muskaItem = add({ id: "muska", object: place(amulet, spot(-0.45, 13, 1.5)), label: "Muskayı aç", track: "yuh-yuh", from: 40.7 });
  const strip = paper(0.26, 0.08, (g) => {
    g.fillStyle = "#2a1a10";
    g.font = "italic 26px serif";
    g.fillText("yalnızca vicdan", 30, 50);
  });
  strip.visible = false;
  amulet.add(strip);
  muskaItem.effect = (t) => {
    pouch.rotation.x = Math.min(1, t / 0.6) * 1.3;
    strip.visible = true;
    strip.position.set(0, -0.25 - Math.min(1, t / 1.5) * 0.6, 0.05);
    strip.rotation.z = Math.sin(t * 5) * 0.2;
    return t < 1.5;
  };
  let shouts = 0;

  // --- Nem Kaldı ----------------------------------------------------------------
  const deed = paper(0.34, 0.26, (g) => {
    g.fillStyle = "#2a1a10";
    g.font = "bold 22px serif";
    g.fillText("TAPU SENEDİ", 50, 36);
    lines(g, 64, 170, 18);
    g.strokeStyle = "rgba(120,30,30,0.6)";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(200, 160, 22, 0, Math.PI * 2);
    g.stroke();
  });
  deed.rotation.x = -Math.PI / 2;
  const deedHolder = new THREE.Group();
  deedHolder.add(deed);
  const tapuItem = add({ id: "tapu", object: place(deedHolder, spot(-0.95, 12, 0.03), -0.4), label: "Tapuyu oku", track: "nem-kaldi", from: 24.3 });
  const deedY = deedHolder.position.y;
  tapuItem.effect = (t) => {
    const k = Math.sin(Math.min(1, t / 2.6) * Math.PI);
    deedHolder.position.y = deedY + k * 1.1;
    deedHolder.rotation.x = Math.sin(t * 9) * 0.35 * k;
    return t < 2.6;
  };

  const stone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.36, 2.2, 5),
    new THREE.MeshStandardMaterial({ color: "#5a4c46", roughness: 0.95, flatShading: true }),
  );
  stone.position.y = 1.1;
  const menhir = new THREE.Group();
  menhir.add(stone);
  const stonePosition = spot(-0.62, 13.5);
  const stoneCollider = ctx.colliders.addCircle(stonePosition.x, stonePosition.z, 0.45);
  stoneCollider.enabled = false;
  const stoneKeep = add({ id: "dikili-tas", object: place(menhir, stonePosition), label: "Dikili taşa dokun", track: "nem-kaldi", from: 35.2, radius: 0.6 });
  const carvingCanvas = document.createElement("canvas");
  carvingCanvas.width = 128;
  carvingCanvas.height = 256;
  const cc = carvingCanvas.getContext("2d")!;
  cc.fillStyle = "#ffd9a0";
  cc.font = "bold 44px serif";
  cc.textAlign = "center";
  cc.save();
  cc.translate(64, 128);
  cc.rotate(-Math.PI / 2);
  cc.fillText("kaldı", 0, 14);
  cc.restore();
  const carving = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.8),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(carvingCanvas), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  carving.position.set(0, 1.3, 0.33);
  menhir.add(carving);
  stoneKeep.effect = (t) => {
    (carving.material as THREE.MeshBasicMaterial).opacity = Math.min(1, t / 1.5) * 0.9;
    carving.lookAt(camera.position.x, carving.getWorldPosition(new THREE.Vector3()).y, camera.position.z);
    return t < 1.6;
  };

  // --- Durumlar --------------------------------------------------------------------
  const toFetus = new THREE.Vector3();
  const forward = new THREE.Vector3();
  let currentTrack: string | null = null;
  let song = 0;

  return {
    update(dt, time, track, songTime) {
      clock = time;
      currentTrack = track;
      song = songTime;
      for (const item of list) {
        const on = !item.track || (item.track === track && songTime >= (item.from ?? 0) && songTime < (item.until ?? Infinity));
        const taken = item.object.userData.taken === true;
        const previous = item.visible;
        item.visible = approach(item.visible, on && !taken ? 1 : 0, 3, dt);
        if (previous < 0.05 && item.visible >= 0.05) {
          sparkle.origin.copy(item.object.position);
          sparkle.burst(time);
        }
        item.object.visible = item.visible > 0.01;
        item.object.scale.setScalar(Math.max(0.001, item.visible));
        if (item.check && item.visible > 0.6 && item.check(player.position) && secrets.reveal(item.id)) item.fx = 0;
        if (item.effect && item.fx >= 0) {
          item.fx += dt;
          if (!item.effect(item.fx, dt)) item.fx = -1;
        }
      }
      sparkle.update(time);

      // Kukla düşer; ipler kopar.
      if (cut >= 0) {
        cut += dt;
        strings.visible = false;
        cross.position.y = Math.min(4, 2.3 + cut * 3);
        doll.position.y = Math.max(-1.2, -cut * cut * 4.9);
        doll.rotation.z = Math.min(1.4, cut * 2);
      } else {
        doll.rotation.z = Math.sin(time * 1.3) * 0.15;
        limbs[0].rotation.z = Math.sin(time * 2.1) * 0.5;
        limbs[1].rotation.z = -Math.sin(time * 2.1 + 1) * 0.5;
      }
      // Kara yağmur ve yükselme akımı yalnızca göründüklerinde akar.
      blackRain.origin.copy(storm.position).setY(storm.position.y + 5.8);
      blackRain.intensity = stormKeep.visible;
      blackRain.update(time);
      // Kızıl halkalar nabız gibi atar.
      for (const keep of [ringsA, ringsBKeep]) {
        keep.object.children.forEach((ring, k) => ring.scale.setScalar(1 + Math.sin(time * 4 - k) * 0.05));
      }
      ringMaterial.opacity = 0.55 + Math.sin(time * 6) * 0.25;
      // Klarnet: notalar yükselir; bakan olunca (ya da dinleyince) utanıp susar.
      notes.origin.copy(clarinet.position).add(new THREE.Vector3(-0.12, -0.3, 0));
      camera.getWorldDirection(forward);
      const toClarinet = toFetus.subVectors(clarinet.position, camera.position);
      const looking = clarinetKeep.visible > 0.6 && toClarinet.length() < 9 && toClarinet.normalize().dot(forward) > 0.97;
      if (looking) shy = Math.min(1, shy + dt * 0.8);
      else shy = Math.max(0, shy - dt * 0.15);
      if (shy >= 1) secrets.reveal("klarnet");
      notes.intensity = clarinetKeep.visible * (1 - shy);
      notes.update(time);
      // Çay buharı
      steam.position.y = 0.62 + Math.sin(time * 1.4) * 0.03;
      steam.material.opacity = 0.35 + Math.sin(time * 2.3) * 0.15;
      // Koparılan yıldız oyuncunun avucuna iner.
      if (plucked >= 0) {
        plucked = Math.min(1, plucked + dt * 0.5);
        const target = camera.position.clone().add(forward.clone().multiplyScalar(1.2));
        star.position.lerpVectors(starHome, target, plucked * plucked);
        star.scale.setScalar(Math.max(0.2, 1 - plucked * 0.8));
        if (plucked >= 1) {
          plucked = -1;
          star.position.copy(starHome);
          star.userData.taken = true;
        }
      } else {
        core.scale.setScalar(1 + Math.sin(time * 3) * 0.12);
      }
      // Dikili taş: göründüğünde içinden geçilmez.
      stoneCollider.enabled = stoneKeep.visible > 0.5;
      // Kâbusta zıplayan uyanır.
      if (track === "issizligin-ortasinda" && nightmare(songTime) && !player.onGround && player.velocity.y > 2.5) secrets.reveal("uyanis");
    },
    prompt() {
      if (currentTrack !== "yuh-yuh" || song < 13.6 || secrets.has("yuhla")) return null;
      return [{ key: "E", label: `Meydanla birlikte bağır (${shouts}/10)` }];
    },
    use() {
      if (currentTrack !== "yuh-yuh" || song < 13.6 || secrets.has("yuhla")) return false;
      shouts += 1;
      sfx.cue("hit");
      kick();
      if (shouts >= 10) secrets.reveal("yuhla");
      return true;
    },
  };
}
