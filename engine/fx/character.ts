import * as THREE from "three";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { assetUrl, type Assets } from "../core/assets";
import type { FigurePose } from "./figure";

/**
 * Karakter kütüphanesi (Quaternius, CC0): "Universal Base Characters" erkek ve kadın modelleri (dokulu ten,
 * göz, kaş, saç; kıyafetler dokuya boyanmış) ve aynı Unreal iskeletini kullanan iki manken (erkek/kadın).
 * Animasyonlar "Universal Animation Library" 1 ve 2'den gelir (86 klip); hepsi aynı kemik adlarına bağlanır.
 * Bir kez yüklenir; her figür modelin iskeletli bir kopyasını giyer. Yüklenemezse figürler kapsül rigde kalır.
 */
export type CharacterKind = "man" | "woman" | "mannequin" | "mannequinF";
export type Outfit = "man_hero" | "man_plain" | "man_dark" | "man_black" | "man_white" | "woman_red" | "woman_white" | "woman_blue" | "woman_ochre" | "woman_muted" | "woman_stone";

interface Model {
  scene: THREE.Group;
  /** T-pozundaki boy (m). */
  height: number;
}

interface Library {
  models: Map<CharacterKind, Model>;
  clips: Map<string, THREE.AnimationClip>;
  outfits: Map<Outfit, THREE.Texture>;
  loader: THREE.TextureLoader;
  base: (path: string) => string;
}

let library: Library | null = null;
let pending: Promise<Library | null> | null = null;

const MODEL_FILES: Record<CharacterKind, string> = {
  man: "models/characters/man.glb",
  woman: "models/characters/woman.glb",
  mannequin: "models/characters/mannequin_m.glb",
  mannequinF: "models/characters/mannequin_f.glb",
};

export async function loadCharacterLibrary(assets: Assets): Promise<boolean> {
  if (library) return true;
  if (!pending) {
    pending = (async () => {
      try {
        const [clipsA, clipsB, ...models] = await Promise.all([
          assets.gltf("models/characters/ual1.glb"),
          assets.gltf("models/characters/ual2.glb"),
          ...Object.values(MODEL_FILES).map((file) => assets.gltf(file)),
        ]);
        const clips = new Map<string, THREE.AnimationClip>();
        for (const clip of [...clipsA.animations, ...clipsB.animations]) clips.set(clip.name, clip);
        const map = new Map<CharacterKind, Model>();
        (Object.keys(MODEL_FILES) as CharacterKind[]).forEach((kind, i) => {
          const scene = models[i].scene;
          scene.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(scene);
          map.set(kind, { scene, height: Math.max(0.5, box.max.y - box.min.y) });
        });
        library = { models: map, clips, outfits: new Map(), loader: new THREE.TextureLoader(), base: assetUrl };
        return library;
      } catch (error) {
        console.warn("Karakter kütüphanesi yüklenemedi; kapsül figürler kullanılacak.", error);
        return null;
      }
    })();
  }
  return (await pending) !== null;
}

export function characterReady(): boolean {
  return library !== null;
}

/** Kıyafet dokusu (gövde): ilk istekte yüklenir, sonra paylaşılır. */
function outfitTexture(outfit: Outfit): THREE.Texture | null {
  if (!library) return null;
  let texture = library.outfits.get(outfit);
  if (!texture) {
    texture = library.loader.load(library.base(`models/characters/outfits/${outfit}.webp`));
    texture.flipY = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    library.outfits.set(outfit, texture);
  }
  return texture;
}

/** Duruş → klip adı ve döngü biçimi. */
const CLIP_FOR: Record<FigurePose, { clip: string; once?: boolean; reverse?: boolean }> = {
  still: { clip: "Idle_Loop" },
  walk: { clip: "Walk_Loop" },
  formal: { clip: "Walk_Formal_Loop" },
  run: { clip: "Jog_Fwd_Loop" },
  sprint: { clip: "Sprint_Loop" },
  dance: { clip: "Dance_Loop" },
  fight: { clip: "Sword_Regular_Combo" },
  stab: { clip: "Sword_Attack" },
  tired: { clip: "Crouch_Idle_Loop" },
  crawl: { clip: "Crouch_Fwd_Loop" },
  kneel: { clip: "Fixing_Kneeling" },
  sit: { clip: "Sitting_Idle_Loop" },
  sitTalk: { clip: "Sitting_Talking_Loop" },
  talk: { clip: "Idle_Talking_Loop" },
  phone: { clip: "Idle_TalkingPhone_Loop" },
  fold: { clip: "Idle_FoldArms_Loop" },
  no: { clip: "Idle_No_Loop" },
  yes: { clip: "Yes" },
  offer: { clip: "Spell_Simple_Idle_Loop" },
  reach: { clip: "Interact" },
  pickup: { clip: "PickUp_Table", once: true },
  push: { clip: "Push_Loop" },
  carry: { clip: "Walk_Carry_Loop" },
  torch: { clip: "Idle_Torch_Loop" },
  lantern: { clip: "Idle_Lantern_Loop" },
  consume: { clip: "Consume" },
  throw: { clip: "OverhandThrow" },
  aim: { clip: "Pistol_Aim_Neutral" },
  shoot: { clip: "Pistol_Shoot" },
  punch: { clip: "Punch_Cross" },
  hit: { clip: "Hit_Chest", once: true },
  knockback: { clip: "Hit_Knockback", once: true },
  death: { clip: "Death01", once: true },
  rise: { clip: "LayToIdle", once: true },
  swim: { clip: "Swim_Idle_Loop" },
  zombie: { clip: "Zombie_Walk_Fwd_Loop" },
  climb: { clip: "ClimbUp_1m" },
  plant: { clip: "Farm_PlantSeed" },
  water: { clip: "Farm_Watering" },
  chop: { clip: "TreeChopping_Loop" },
  rail: { clip: "Idle_Rail_Loop" },
  drive: { clip: "Driving_Loop" },
  jump: { clip: "Jump_Loop" },
  // Ayaktan yere uzanma: kalkış klibi tersten oynar ve yatarken durur.
  lie: { clip: "LayToIdle", once: true, reverse: true },
  roll: { clip: "Roll", once: true },
  hook: { clip: "Melee_Hook", once: true },
  block: { clip: "Sword_Block", once: true },
  // Geri geri yürüme: yürüyüş klibi tersten döner.
  back: { clip: "Walk_Loop", reverse: true },
};

export interface CharacterSkin {
  readonly root: THREE.Group;
  readonly handR: THREE.Object3D | null;
  readonly handL: THREE.Object3D | null;
  readonly head: THREE.Object3D | null;
  /** Adıyla kemik (ör. "spine_03", "upperarm_l"); yoksa null. */
  bone(name: string): THREE.Object3D | null;
  /** Rig kökünün ölçeği (boy / model boyu). */
  readonly scale: number;
  setMaterial(material: THREE.Material): void;
  setOutfit(outfit: Outfit): void;
  update(dt: number, pose: FigurePose, energy: number): void;
}

export interface SkinOptions {
  kind?: CharacterKind;
  outfit?: Outfit;
}

/** Kütüphaneden iskeletli bir kopya; `height` metre boyunda. Kütüphane yoksa null. */
export function createCharacterSkin(height: number, options: SkinOptions = {}): CharacterSkin | null {
  if (!library) return null;
  const kind = options.kind ?? "mannequin";
  const model = library.models.get(kind) ?? library.models.get("mannequin")!;
  const root = cloneSkeleton(model.scene) as THREE.Group;
  const scale = height / model.height;
  root.scale.setScalar(scale);
  const bones = new Map<string, THREE.Object3D>();
  const meshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      // Malzemeler kopyalanır: bir figürün kıyafeti ya da rengi öbürlerini etkilemesin.
      if (!Array.isArray(mesh.material)) mesh.material = mesh.material.clone();
      // Karakter kilidi: adam koyu saçlı, kadın uzun koyu kahve saçlı (taban dokular açık renk).
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (!Array.isArray(mesh.material) && /Hair/i.test(material.name ?? "")) {
        material.color.set(kind === "woman" ? "#4a2a16" : "#241a12");
      }
      meshes.push(mesh);
    }
    if ((child as THREE.Bone).isBone && !bones.has(child.name)) bones.set(child.name, child);
  });
  const mixer = new THREE.AnimationMixer(root);
  const actions = new Map<string, THREE.AnimationAction>();
  const actionFor = (name: string) => {
    let action = actions.get(name);
    if (!action) {
      const clip = library!.clips.get(name) ?? library!.clips.get("Idle_Loop")!;
      action = mixer.clipAction(clip);
      action.enabled = true;
      actions.set(name, action);
    }
    return action;
  };
  let current: THREE.AnimationAction | null = null;
  let currentPose: FigurePose | null = null;
  let direction = 1;
  const skin: CharacterSkin = {
    root,
    handR: bones.get("hand_r") ?? null,
    handL: bones.get("hand_l") ?? null,
    head: bones.get("Head") ?? null,
    bone: (name) => bones.get(name) ?? null,
    scale,
    setMaterial(material) {
      for (const mesh of meshes) mesh.material = material;
    },
    setOutfit(outfit) {
      const texture = outfitTexture(outfit);
      if (!texture) return;
      for (const mesh of meshes) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        if (material.name && /Superhero/.test(material.name)) {
          material.map = texture;
          material.needsUpdate = true;
        }
      }
    },
    update(dt, pose, energy) {
      if (pose !== currentPose) {
        const spec = CLIP_FOR[pose] ?? CLIP_FOR.still;
        const next = actionFor(spec.clip);
        next.reset();
        if (spec.once) {
          next.setLoop(THREE.LoopOnce, 1);
          next.clampWhenFinished = true;
        } else next.setLoop(pose === "kneel" ? THREE.LoopPingPong : THREE.LoopRepeat, Infinity);
        if (spec.reverse) next.time = next.getClip().duration - 0.001;
        if (current && current !== next) next.crossFadeFrom(current, 0.35, true);
        next.play();
        current = next;
        currentPose = pose;
        direction = spec.reverse ? -1 : 1;
      }
      if (current) {
        // Canlılık: yürüyüş/koşu/dansta hız; yorgunlukta ağır.
        const speed =
          pose === "walk" || pose === "run" || pose === "sprint" || pose === "formal"
            ? THREE.MathUtils.clamp(0.7 + energy * 0.35, 0.6, 1.6)
            : pose === "dance"
              ? THREE.MathUtils.clamp(0.6 + energy * 0.5, 0.5, 1.4)
              : pose === "tired"
                ? 0.6
                : pose === "fight" || pose === "stab"
                  ? THREE.MathUtils.clamp(energy, 0.5, 1.2)
                  : 1;
        current.timeScale = speed * direction;
      }
      mixer.update(dt);
    },
  };
  if (options.outfit) skin.setOutfit(options.outfit);
  return skin;
}
