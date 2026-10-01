import * as THREE from "three";
import { createCharacterSkin, type CharacterKind, type CharacterSkin, type Outfit } from "./character";

/**
 * Eklemli figür: kliplerin "oyuncuları". Kalça ve omuz eklemleri döner; gövde yerine kalp gibi
 * başka bir beden de takılabilir (bacaklı kalp). Duruşlar zamanla harmanlanır:
 *  still  — kıpırdamadan durur (yalnız nefes),
 *  walk   — yürür, run — koşar (adım hızı `pace`),
 *  dance  — dans eder (`energy` 0..1: sallanmadan çılgın dansa),
 *  fight  — sağ kolla vurur, sol kolla korunur,
 *  tired  — öne eğik, ağır adım, nefes nefese,
 *  kneel  — diz çöker, başı öne düşer,
 *  sit    — oturur (sandalye, bank, kaya).
 */
export type FigurePose =
  | "still" | "walk" | "formal" | "run" | "sprint" | "dance" | "fight" | "stab" | "tired" | "crawl" | "kneel" | "sit" | "sitTalk"
  | "talk" | "phone" | "fold" | "no" | "yes" | "offer" | "reach" | "pickup" | "push" | "carry" | "torch" | "lantern" | "consume"
  | "throw" | "aim" | "shoot" | "punch" | "hit" | "knockback" | "death" | "rise" | "swim" | "zombie" | "climb" | "plant" | "water"
  | "chop" | "rail" | "drive" | "jump" | "lie" | "roll" | "hook" | "block" | "back";

export interface Figure {
  readonly group: THREE.Group;
  readonly head: THREE.Object3D;
  readonly torso: THREE.Object3D;
  pose: FigurePose;
  /** Dans için canlılık, yürüyüş için hız (adım/sn), dövüş için vuruş hızı. */
  energy: number;
  /** Manken giyildi mi (karakter kütüphanesi yüklüyse); yoksa kapsül rig görünür. */
  readonly skinned: boolean;
  /** Nesneyi sağ ele tutuşturur (sopa, meşale, kalp): mankende el kemiğine, kapsülde kolun alt eklemine. */
  hold(object: THREE.Object3D): void;
  /** Nesneyi sol ele tutuşturur. */
  holdLeft(object: THREE.Object3D): void;
  /** Nesneyi bir kemiğe bağlar (ör. "spine_03" göğüs, "Head" baş); figür uzayı ölçeği korunur. Kemik yoksa gövdeye. */
  attach(object: THREE.Object3D, bone: string): void;
  /** Kıyafet değiştirir (yalnız dokulu insan modellerinde). */
  setOutfit(outfit: Outfit): void;
  update(dt: number, time: number): void;
}

export interface FigureOptions {
  material?: THREE.Material;
  /** Gövde yerine takılacak beden (kalp, kutu…); merkezi kalça hizasının üstünde olmalı. */
  body?: THREE.Object3D;
  /** Boy (m). */
  height?: number;
  /** Model: dokulu erkek/kadın ya da manken (varsayılan manken). */
  kind?: CharacterKind;
  /** Dokulu modellerde kıyafet. */
  outfit?: Outfit;
}

export function createFigure(options: FigureOptions = {}): Figure {
  const textured = !options.material && (options.kind === "man" || options.kind === "woman");
  const material = options.material ?? new THREE.MeshStandardMaterial({ color: "#151517", roughness: 0.9 });
  const group = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  group.add(hips);

  const torso = options.body ?? new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.42, 4, 12), material);
  if (!options.body) torso.position.y = 0.42;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), material);
  neck.position.y = 0.78;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), material);
  head.position.y = 0.94;
  const spine = new THREE.Group();
  spine.add(torso, neck, head);
  hips.add(spine);

  const limb = (length: number, radius: number, y: number, x: number, z = 0) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length * 0.46, 4, 8), material);
    upper.position.y = -length * 0.26;
    const joint = new THREE.Group();
    joint.position.y = -length * 0.5;
    const lower = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.85, length * 0.44, 4, 8), material);
    lower.position.y = -length * 0.25;
    joint.add(lower);
    pivot.add(upper, joint);
    return { pivot, joint };
  };
  const armL = limb(0.62, 0.05, 0.7, -0.24);
  const armR = limb(0.62, 0.05, 0.7, 0.24);
  const legL = limb(0.92, 0.07, 0, -0.11);
  const legR = limb(0.92, 0.07, 0, 0.11);
  spine.add(armL.pivot, armR.pivot);
  hips.add(legL.pivot, legR.pivot);
  const foot = (leg: ReturnType<typeof limb>) => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.22), material);
    f.position.set(0, -0.48, 0.05);
    leg.joint.add(f);
  };
  foot(legL);
  foot(legR);
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) mesh.castShadow = true;
  });
  const scale = (options.height ?? 1.85) / 1.85;
  group.scale.setScalar(scale);
  // Manken: kütüphane yüklüyse kapsül rig görünmez kalır (konum/başlık referansları sürer), iskeletli kopya giyilir.
  // Özel gövdeli figürler (bacaklı kalp) kapsülde kalır.
  let skin: CharacterSkin | null = null;
  if (!options.body) {
    skin = createCharacterSkin(1.85, { kind: options.kind, outfit: options.outfit });
    if (skin) {
      group.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) mesh.visible = false;
      });
      if (!textured) skin.setMaterial(material);
      group.add(skin.root);
    }
  }

  // Yumuşak harman: hedef açılar hesaplanır, mevcut açılar onlara yaklaşır.
  const target = { hipsY: 0.95, spineX: 0, spineY: 0, headX: 0, aL: 0, aR: 0, fL: 0, fR: 0, lL: 0, lR: 0, kL: 0, kR: 0, aLz: 0, aRz: 0 };
  const current = { ...target };
  let phase = 0;

  const figure: Figure = {
    group,
    head,
    torso,
    pose: "still",
    energy: 1,
    get skinned() {
      return skin !== null;
    },
    hold(object) {
      if (skin?.handR) {
        // Kemik uzayı: kütüphane metresi; nesnenin figür uzayındaki boyu korunur, uzun ekseni parmaklar yönünde.
        object.position.set(0, 0.1, 0.02);
        object.rotation.set(0, 0, 0);
        object.scale.multiplyScalar(1 / skin.scale);
        skin.handR.add(object);
        return;
      }
      armR.joint.add(object);
    },
    holdLeft(object) {
      if (skin?.handL) {
        object.position.set(0, 0.1, 0.02);
        object.rotation.set(0, 0, 0);
        object.scale.multiplyScalar(1 / skin.scale);
        skin.handL.add(object);
        return;
      }
      armL.joint.add(object);
    },
    attach(object, bone) {
      const target = skin?.bone(bone);
      if (target && skin) {
        object.scale.multiplyScalar(1 / skin.scale);
        target.add(object);
        return;
      }
      spine.add(object);
    },
    setOutfit(outfit) {
      skin?.setOutfit(outfit);
    },
    update(dt, time) {
      if (skin) skin.update(dt, figure.pose, figure.energy);
      const e = figure.energy;
      const pose = figure.pose;
      // Adım fazı: yürüyüş/koşu/dansta ilerler.
      const pace = pose === "run" ? 3.2 * Math.max(0.4, e) : pose === "walk" ? 1.8 * Math.max(0.4, e) : pose === "tired" ? 0.9 : pose === "dance" ? 2.2 + e * 1.6 : 1;
      phase += dt * pace * Math.PI * 2;
      const s = Math.sin(phase);
      const c = Math.cos(phase);
      const breath = Math.sin(time * 1.6) * 0.012;
      Object.assign(target, { hipsY: 0.95 + breath, spineX: 0, spineY: 0, headX: 0, aL: 0, aR: 0, fL: 0.15, fR: 0.15, lL: 0, lR: 0, kL: 0, kR: 0, aLz: 0.08, aRz: -0.08 });
      if (pose === "walk" || pose === "run") {
        const swing = pose === "run" ? 0.95 : 0.55;
        target.lL = s * swing;
        target.lR = -s * swing;
        target.kL = Math.max(0, -c) * swing * 1.1;
        target.kR = Math.max(0, c) * swing * 1.1;
        target.aL = -s * swing * 0.9;
        target.aR = s * swing * 0.9;
        target.fL = target.fR = pose === "run" ? 1.2 : 0.35;
        target.spineX = pose === "run" ? 0.22 : 0.06;
        target.hipsY = 0.95 + Math.abs(s) * (pose === "run" ? 0.07 : 0.03);
      } else if (pose === "tired") {
        target.lL = s * 0.32;
        target.lR = -s * 0.32;
        target.kL = Math.max(0, -c) * 0.5;
        target.kR = Math.max(0, c) * 0.5;
        target.spineX = 0.55;
        target.headX = 0.35;
        target.aL = 0.35 + s * 0.1;
        target.aR = 0.35 - s * 0.1;
        target.fL = target.fR = 0.1;
        target.hipsY = 0.9 + Math.sin(time * 3.1) * 0.02; // nefes nefese
      } else if (pose === "dance") {
        const wild = e;
        target.hipsY = 0.95 + Math.abs(s) * 0.08 * wild;
        target.spineY = Math.sin(phase * 0.5) * 0.45 * wild;
        target.spineX = -0.08 * wild;
        target.aL = -1.8 * wild + s * 0.9 * wild;
        target.aR = -1.8 * wild - s * 0.9 * wild;
        target.aLz = 0.9 * wild;
        target.aRz = -0.9 * wild;
        target.fL = 0.6 + Math.max(0, s) * 1.2 * wild;
        target.fR = 0.6 + Math.max(0, -s) * 1.2 * wild;
        target.lL = s * 0.35 * wild;
        target.lR = -s * 0.35 * wild;
        target.kL = Math.max(0, -c) * 0.8 * wild;
        target.kR = Math.max(0, c) * 0.8 * wild;
        target.headX = -0.15 * wild + Math.sin(phase) * 0.12 * wild;
      } else if (pose === "fight") {
        const swing = Math.pow(Math.max(0, Math.sin(phase * 0.9)), 3);
        target.spineX = 0.18 + swing * 0.25;
        target.spineY = -0.3 + swing * 0.7;
        target.aR = -2.6 + swing * 2.2; // yukarıdan aşağı indirir
        target.fR = 0.9;
        target.aL = -0.9;
        target.fL = 1.6; // korunma
        target.lL = 0.35;
        target.lR = -0.35;
        target.kR = 0.5;
      } else if (pose === "sit") {
        target.hipsY = 0.52;
        target.lL = -1.45;
        target.lR = -1.45;
        target.kL = 1.5;
        target.kR = 1.5;
        target.spineX = 0.08;
        target.aL = 0.25;
        target.aR = 0.25;
        target.fL = target.fR = 0.9;
      } else if (pose === "kneel") {
        target.hipsY = 0.55;
        target.lL = -1.5;
        target.kL = 2.2;
        target.lR = 0.2;
        target.kR = 1.4;
        target.spineX = 0.5;
        target.headX = 0.55;
        target.aL = 0.3;
        target.aR = 0.3;
        target.fL = target.fR = 0.6;
      }
      const k = Math.min(1, dt * 6);
      for (const key of Object.keys(target) as Array<keyof typeof target>) current[key] += (target[key] - current[key]) * k;
      hips.position.y = current.hipsY;
      spine.rotation.set(current.spineX, current.spineY, 0);
      head.rotation.x = current.headX;
      armL.pivot.rotation.set(current.aL, 0, current.aLz);
      armR.pivot.rotation.set(current.aR, 0, current.aRz);
      armL.joint.rotation.x = -current.fL;
      armR.joint.rotation.x = -current.fR;
      legL.pivot.rotation.x = current.lL;
      legR.pivot.rotation.x = current.lR;
      legL.joint.rotation.x = current.kL;
      legR.joint.rotation.x = current.kR;
    },
  };
  return figure;
}

/** Kalp biçimli beden (bacaklı kalp için): kırmızı, hafif parlak. */
export function heartBody(color: THREE.ColorRepresentation = "#c8202c", size = 0.5): THREE.Mesh {
  const shape = new THREE.Shape();
  const s = size;
  shape.moveTo(0, -s * 0.9);
  shape.bezierCurveTo(s * 1.1, -s * 0.15, s * 0.95, s * 0.75, 0, s * 0.35);
  shape.bezierCurveTo(-s * 0.95, s * 0.75, -s * 1.1, -s * 0.15, 0, -s * 0.9);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: s * 0.55, bevelEnabled: true, bevelThickness: s * 0.12, bevelSize: s * 0.1, bevelSegments: 4 });
  geometry.center();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05, emissive: color, emissiveIntensity: 0.12 }));
  mesh.position.y = s * 0.95;
  mesh.castShadow = true;
  return mesh;
}

/**
 * Oyuncu: figürü hedefe yürütür (yürür/koşar), varınca dinlenme duruşuna geçer, zemine oturtur.
 * `lift` zeminden ek yükseklik (uçuş, düşüş); `face` varınca bakılacak yön (radyan) — verilmezse geliş yönü kalır.
 */
export interface Actor {
  readonly figure: Figure;
  readonly arrived: boolean;
  lift: number;
  goTo(x: number, z: number, run?: boolean, face?: number): void;
  /** Hedefi bırakır; olduğu yerde verilen duruşa geçer. */
  rest(pose: FigurePose): void;
  update(dt: number, time: number): void;
}

export function createActor(figure: Figure, ground: (x: number, z: number) => number, options: { speed?: number; runSpeed?: number } = {}): Actor {
  const target = new THREE.Vector3();
  let moving = false;
  let running = false;
  let restPose: FigurePose = "still";
  let face: number | undefined;
  const speed = options.speed ?? 1.7;
  const runSpeed = options.runSpeed ?? 4.2;
  const actor: Actor = {
    figure,
    lift: 0,
    get arrived() {
      return !moving;
    },
    goTo(x, z, run = false, faceAt) {
      target.set(x, 0, z);
      moving = true;
      running = run;
      face = faceAt;
    },
    rest(pose) {
      moving = false;
      restPose = pose;
    },
    update(dt, time) {
      const g = figure.group;
      if (moving) {
        const dx = target.x - g.position.x;
        const dz = target.z - g.position.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.35) {
          moving = false;
          if (face !== undefined) g.rotation.y = face;
        } else {
          const step = Math.min(d, (running ? runSpeed : speed) * dt);
          g.position.x += (dx / d) * step;
          g.position.z += (dz / d) * step;
          const yaw = Math.atan2(dx, dz);
          g.rotation.y += Math.atan2(Math.sin(yaw - g.rotation.y), Math.cos(yaw - g.rotation.y)) * Math.min(1, dt * 6);
          figure.pose = running ? "run" : "walk";
          figure.energy = 1;
        }
      }
      if (!moving) figure.pose = restPose;
      g.position.y = ground(g.position.x, g.position.z) + actor.lift;
      figure.update(dt, time);
    },
  };
  return actor;
}
