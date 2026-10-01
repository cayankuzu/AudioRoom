import * as THREE from "three";
import type { Sfx } from "../../../engine/audio/sfx";
import type { CircleCollider, Colliders } from "../../../engine/core/colliders";
import type { Models } from "../../../engine/core/models";
import type { Player } from "../../../engine/core/player";
import type { Interactable } from "../../../engine/game/interaction";
import type { Secrets } from "../../../engine/game/secrets";
import type { Hud } from "../../../engine/ui/hud";
import { craterHeight } from "../terrain";

/** Gramofonun durduğu yer; set parçaları buradan kratere doğru dizilir. */
export const GRAMOPHONE = { x: 7, z: 72 };
/** Sahne merkezi: gramofondan bakınca kraterin iç yamacı. */
export const STAGE = { x: 0, z: 46 };

export const ground = craterHeight;

/**
 * Sahnelerin dünya ile konuştuğu küçük arayüz: oyuncu, ses, HUD, gizli keşifler
 * ve dünyanın anlara göre değiştirdiği paylaşılan etkiler.
 */
export interface SceneKit {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  player: Player;
  sfx: Sfx;
  hud: Hud;
  random: () => number;
  colliders: Colliders;
  secrets: Secrets;
  /** Terrain malzemesi (Aşk, Virüs damarları için). */
  terrain: THREE.MeshStandardMaterial;
  /**
   * Paylaşılan nokta ışıkları: sahneler kendi ışığını eklemez (ışık sayısı değişince
   * tüm shader'lar yeniden derlenir). Dünya her kare sıfırlar; baskın sahne yakar.
   */
  lights: THREE.PointLight[];
  effects: SharedEffects;
  /** Sinema kamerası (klip) açık mı: kamera oyuncunun gözü değildir. */
  cinema(): boolean;
  /** Hazır modeller (Poly Haven, CC0); yüklenemeyen model null döner, sahne elle modellenmiş hâline düşer. */
  models: Models;
  /** Çizici: sahne içi doku basımı için (ör. kadının portresi modelden fotoğrafa). */
  renderer: THREE.WebGLRenderer;
  /** Gökteki ayın yönü (birim vektör). */
  moonDirection: THREE.Vector3;
}

/** Sahnelerin ana dünyaya bıraktığı etkiler; her şarkı başında sıfırlanır. */
export interface SharedEffects {
  /** Gökteki yarığın ek genişliği (0..1). */
  crack: number;
  /** true: donmuş zaman kırıldı, figür ve toz yeniden hareket eder. */
  timeBroken: boolean;
  /** Toz/kül yoğunluğu çarpanı. */
  dust: number;
  /** Ek yerçekimi çarpanı. */
  gravity: number;
  /** Kamera sarsıntısı (metre, söner). */
  shake: number;
  /** Kamera eğilmesi (radyan; alabora, sarhoşluk). */
  roll: number;
  /** 0..1 dünyayı karartır (gece, göz kapakları). */
  dim: number;
  /** 0..1 gündüz: gök, sis ve güneş gün ışığına döner (yıldızlar söner). Kanıyorduk odası ve çayırı. */
  daylight: number;
  /** Doygunluk çarpanı (0: siyah-beyaz). */
  saturation: number;
  /** Sis yoğunluğu çarpanı. */
  fog: number;
  /** Oyuncunun hareket hızı çarpanı (bataklık, bağlı eller). */
  speed: number;
  /** Figürün ek yüksekliği (şarkıya göre iner ya da yükselir). */
  figureLift: number;
  /** 0..1 yarım ayın dolunaya tamamlanması. */
  moonFull: number;
  /** 0..1 yarım ayın ince bir hilale dönmesi (eksik ay). */
  crescent: number;
  /** 0..1 uzay: gök kubbe her yönde boşluk, yıldız ve bulutsu (ufuk yok). */
  space: number;
  /** 0..1 yeryüzünü yukarıdan aydınlatma (yükselirken kara parçası okunsun). */
  groundLight: number;
}

export function createEffects(): SharedEffects {
  return { crack: 0, timeBroken: false, dust: 1, gravity: 1, shake: 0, roll: 0, dim: 0, daylight: 0, saturation: 1, fog: 1, speed: 1, figureLift: 0, moonFull: 0, crescent: 0, space: 0, groundLight: 0 };
}

/** Çekimler için: krater zemininden h metre yukarıdaki nokta. */
export function cam(x: number, h: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, ground(x, z) + h, z);
}

/** Çekimler için: mutlak dünya noktası. */
export function pt(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

/** Kraterin üstünde süzülen figürün gövde ortası (çekimlerde bakış noktası). */
export const FIGURE_AT = new THREE.Vector3(0, 32, 0);

/**
 * Evrenin uzak noktaları: klipler bütün kratere yayılsın diye çekimler bunlara gider.
 * CENTER figürün altı, CONE kapaktaki koni tepe, RIM kraterin kenarı (r≈78), RIDGE uzak sırt (r≈150),
 * MAIL posta kutusu, FLAG kraterin dışındaki bayrak, NOTEBOOK başlangıcın arkasındaki defter.
 */
export const CENTER = new THREE.Vector3(0, craterHeight(0, 0), 0);
export const CONE = new THREE.Vector3(7, craterHeight(7, -17), -17);
export const MAIL = new THREE.Vector3(-58, craterHeight(-58, -142), -142);
export const FLAG = new THREE.Vector3(124, craterHeight(124, 38), 38);
export const NOTEBOOK = new THREE.Vector3(10, craterHeight(10, 94), 94);
/** Kraterin kenarında, verilen açıda (radyan) bir nokta; h zeminden yükseklik. */
export function rim(angle: number, h = 2, radius = 78): THREE.Vector3 {
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  return new THREE.Vector3(x, craterHeight(x, z) + h, z);
}
/** Uzak sırtta bir nokta. */
export const ridge = (angle: number, h = 6) => rim(angle, h, 150);
/**
 * Krater üstünde yay çizen uçuş noktaları: merkez (cx, cz) çevresinde a0'dan a1'e, r yarıçapta,
 * zeminden h yükseklikte n nokta. `path` alanına verilir; kamera bütün evreni dolaşır.
 */
export function arc(cx: number, cz: number, r: number, h: number, a0: number, a1: number, n = 4): THREE.Vector3[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / (n + 1);
    const a = a0 + (a1 - a0) * t;
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    return new THREE.Vector3(x, craterHeight(x, z) + h, z);
  });
}

/** Çekimler için: oyuncunun ayağına göre nokta (oyuncu yükselirse kamera da izler). */
export function me(kit: SceneKit, dx = 0, dy = 0, dz = 0): () => THREE.Vector3 {
  const out = new THREE.Vector3();
  return () => out.set(kit.player.position.x + dx, kit.player.position.y + dy, kit.player.position.z + dz);
}

/** Hareketli bir nesneyi izleyen nokta (ofsetli). */
export function follow(object: THREE.Object3D, dx = 0, dy = 0, dz = 0): () => THREE.Vector3 {
  const out = new THREE.Vector3();
  return () => object.getWorldPosition(out).add(new THREE.Vector3(dx, dy, dz));
}

/** Nesnenin kendi eksenlerinde bir nokta: nesne dönse, ölçeklense de ona yapışık kalır. */
export function attach(object: THREE.Object3D, dx = 0, dy = 0, dz = 0): () => THREE.Vector3 {
  const out = new THREE.Vector3();
  return () => object.localToWorld(out.set(dx, dy, dz));
}

/** (x, z) noktasını kraterin yüzeyine oturtur. */
export function onGround(object: THREE.Object3D, x: number, z: number, lift = 0): THREE.Object3D {
  object.position.set(x, ground(x, z) + lift, z);
  return object;
}

/** Bir nesneyi yatayda bir noktaya çevirir (yalnızca y ekseni). */
export function faceTowards(object: THREE.Object3D, x: number, z: number): void {
  object.rotation.y = Math.atan2(x - object.position.x, z - object.position.z);
}

/** Uzaktan bakıp E ile tetiklenen hedef (sahne nesneleri için). */
export function gazeTarget(options: {
  position: (target: THREE.Vector3) => THREE.Vector3;
  radius: number;
  reach: number;
  label: () => string | null;
  use: () => void;
}): Interactable {
  return {
    position: options.position,
    radius: options.radius,
    reach: options.reach,
    prompt: () => {
      const label = options.label();
      return label ? [{ key: "E", label }] : null;
    },
    use: options.use,
  };
}

/**
 * Gizli keşif nesnesi: yakına gelip bakınca "İncele" istemi çıkar, E ile sır açılır.
 * Bulunduktan sonra istem kaybolur; nesne yerinde kalır (dünyanın bir parçası).
 */
export function secretItem(
  kit: SceneKit,
  id: string,
  position: (target: THREE.Vector3) => THREE.Vector3,
  options: { label?: string; radius?: number; reach?: number; available?: () => boolean; onFound?: () => void } = {},
): Interactable {
  return {
    position,
    radius: options.radius ?? 0.6,
    reach: options.reach ?? 3,
    prompt: () => (!kit.secrets.has(id) && (options.available?.() ?? true) ? [{ key: "E", label: options.label ?? "İncele" }] : null),
    use: () => {
      if (kit.secrets.reveal(id)) options.onFound?.();
    },
  };
}

/** Sahneye özel çarpışma alanı (sahne kapalıyken devre dışı; sahne yöneticisi açar). */
export function block(kit: SceneKit, x: number, z: number, r: number): CircleCollider {
  const collider = kit.colliders.addCircle(x, z, r);
  collider.enabled = false;
  return collider;
}

/** Kısa, üstte beliren ilerleme bildirimi (ör. "Gemiler 3 / 7"). */
export function announce(hud: Hud, text: string, seconds = 3.5): void {
  hud.hint(text, seconds);
}

export { glowSprite, softGlow } from "../../../engine/fx/glow";

/** Yakınlığa göre 0..1 (near içinde 1, far dışında 0). */
export function proximity(a: THREE.Vector3, x: number, y: number, z: number, near: number, far: number): number {
  const d = Math.hypot(a.x - x, a.y - y, a.z - z);
  return THREE.MathUtils.clamp((far - d) / (far - near), 0, 1);
}

/** 0..1 yumuşak adım. */
export const ease = (x: number) => {
  const k = THREE.MathUtils.clamp(x, 0, 1);
  return k * k * (3 - 2 * k);
};
