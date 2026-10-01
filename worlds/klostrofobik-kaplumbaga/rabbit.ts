import * as THREE from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";

export type RabbitState = "wander" | "flee" | "dizzy" | "curious" | "hidden" | "free" | "dig" | "steal";

export interface Burrow {
  x: number;
  z: number;
}

export interface Rabbit {
  readonly root: THREE.Group;
  readonly hands: THREE.Object3D;
  state: RabbitState;
  hits: number;
  update(dt: number, time: number, player: THREE.Vector3, playerHidden: boolean): void;
  hit(): void;
  /** Plak alındıktan sonra tavşan artık kaçmaz, gramofonun yanına oturur. */
  release(target: THREE.Vector3): void;
  hitTest(point: THREE.Vector3): boolean;
  /** Kaçarken kazdığı çukurlar (yalnız tavşan dalar; tünel değildir). */
  readonly holes: readonly Burrow[];
  /**
   * Kazma başlayınca ("start") ve bitince ("done") dünyaya haber: toprak fırlar, geride girilebilir bir
   * ağız kalır. "done" kazılan tünelin öbür ucunu (tavşanın çıkacağı yuvayı) döndürebilir.
   */
  onDig: ((x: number, z: number, phase: "start" | "done") => Burrow | void) | null;
  /**
   * Plağa göz diker: hedefe (raf, yerdeki plak ya da elden kapmada oyuncunun arkası) koşar, ulaşınca onSteal
   * çağrılır. Raf/yer hedefinde oyuncu yaklaşırsa vazgeçip kaçar; fromHand ise oyuncuya sokulur.
   */
  steal(target: THREE.Vector3, onSteal: () => void, fromHand?: boolean): void;
  /** Kapma hedefini günceller (oyuncu kıpırdarsa arkası da kayar). */
  retarget(target: THREE.Vector3): void;
  /** Klip tavşanı yönetiyor: kendi aklı durur, konumu dışarıdan sürülür (drive ile canlandırılır). */
  scripted: boolean;
  /** Dışarıdan sürülürken adım animasyonu: hız 0 durur, 2+ yürür, 5+ koşar. */
  drive(dt: number, speed: number): void;
}

const HEIGHT = 2.1;
const ARENA = 38;

export function createRabbit(
  gltf: GLTF,
  burrows: Burrow[],
  random: () => number,
  resolve: (position: THREE.Vector3, radius: number) => void = () => {},
  isFree: (x: number, z: number, radius: number) => boolean = () => true,
): Rabbit {
  const root = new THREE.Group();
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = HEIGHT / Math.max(size.y, 0.0001);
  model.scale.setScalar(scale);
  model.position.set(-((box.min.x + box.max.x) / 2) * scale, -box.min.y * scale, -((box.min.z + box.max.z) / 2) * scale);
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.frustumCulled = false;
    }
  });
  root.add(model);

  const hands = new THREE.Object3D();
  hands.position.set(0.05, 1.25, 0.42);
  root.add(hands);

  // Sersemleme yıldızları.
  const stars = new THREE.Group();
  const starMaterial = new THREE.MeshBasicMaterial({ color: "#fff1b0" });
  for (let i = 0; i < 4; i += 1) {
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), starMaterial);
    star.position.set(Math.cos((i / 4) * Math.PI * 2) * 0.45, 0, Math.sin((i / 4) * Math.PI * 2) * 0.45);
    stars.add(star);
  }
  stars.position.y = HEIGHT + 0.25;
  stars.visible = false;
  root.add(stars);

  const mixer = new THREE.AnimationMixer(model);
  const clip = (word: string) => gltf.animations.find((a) => a.name.toLowerCase().includes(word));
  const run = clip("run") ? mixer.clipAction(clip("run")!) : null;
  const walk = clip("walk") ? mixer.clipAction(clip("walk")!) : null;
  run?.play();
  walk?.play();

  const target = new THREE.Vector3(10, 0, -10);
  const before = new THREE.Vector3();
  let stuck = 0;
  /** Serbestken oturma yerine kaç kez varamadı: her seferinde daha geniş bir halkada boş yer arar. */
  let freeRetries = 0;
  const toPlayer = new THREE.Vector3();
  const direction = new THREE.Vector3();
  let speed = 0;
  let timer = 0;
  let exitBurrow: Burrow | null = null;
  let diveBurrow: Burrow | null = null;
  const holes: Burrow[] = [];
  let digCooldown = 6;
  /** Az önce kaçtıysa (saniye): kaçışın hemen ardından durup çukur kazar. */
  let fledTimer = 0;
  /** Plağı kaptıktan sonra (saniye): en yakın deliğe koşar, dalar, başka yerden çıkar. */
  let escapeTimer = 0;
  let escapeHole: Burrow | null = null;
  const stealTarget = new THREE.Vector3();
  let onSteal: (() => void) | null = null;
  let stealFromHand = false;
  /** Sürüm 1 gibi kaçış: oyuncudan uzak, rastgele sapmalı bir kaçış noktası seçer; oraya varana dek koşar. */
  const escape = new THREE.Vector3();
  let hasEscape = false;
  const chooseEscape = (player: THREE.Vector3) => {
    // Aday yönler: oyuncudan düz uzak, iki yana sapmış ve kenar boyunca iki teğet; hepsi kâğıdın içinde
    // tutulur, oyuncudan en uzağa düşen seçilir (kenara sıkışınca kıyı boyunca kaçar, oyuncunun üstünden geçmez).
    const away = Math.atan2(root.position.x - player.x, root.position.z - player.z);
    const radial = Math.atan2(root.position.x, root.position.z);
    const dist = 18 + random() * 9;
    let best = -Infinity;
    for (const dir of [away, away + 0.8, away - 0.8, radial + Math.PI / 2, radial - Math.PI / 2]) {
      const x = root.position.x + Math.sin(dir) * dist;
      const z = root.position.z + Math.cos(dir) * dist;
      const r = Math.hypot(x, z);
      const k = r > ARENA - 3 ? (ARENA - 3) / r : 1;
      const px = x * k;
      const pz = z * k;
      // Engelli hedef (kitaplık, kürsü, kâse) ve engelli yol seçilmez: tavşan bir daha duvara yaslanıp kalmaz.
      const blocked = !isFree(px, pz, 1.2) || !isFree((root.position.x + px) / 2, (root.position.z + pz) / 2, 1.0);
      const score = Math.hypot(px - player.x, pz - player.z) + random() * 3 - (k < 1 ? 4 : 0) - (blocked ? 40 : 0);
      if (score > best) {
        best = score;
        escape.set(px, 0, pz);
      }
    }
    hasEscape = true;
  };

  const pickWander = () => {
    for (let k = 0; k < 12; k += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 8 + random() * (ARENA - 12);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      if (isFree(x, z, 1.2)) {
        target.set(x, 0, z);
        return;
      }
    }
    target.set(12, 0, -14);
  };
  pickWander();
  root.position.set(12, 0, -14);

  const rabbit: Rabbit = {
    root,
    hands,
    state: "wander",
    hits: 0,
    holes,
    onDig: null,
    scripted: false,
    drive(dt, want) {
      speed += (want - speed) * Math.min(1, dt * 4);
      mixer.update(dt * (0.6 + speed * 0.12));
      const blend = THREE.MathUtils.clamp((speed - 2) / 4, 0, 1);
      run?.setEffectiveWeight(blend);
      walk?.setEffectiveWeight(1 - blend);
    },
    update(dt, time, player, playerHidden) {
      if (rabbit.scripted) return;
      mixer.update(dt * (0.6 + speed * 0.12));
      timer -= dt;
      digCooldown -= dt;
      fledTimer -= dt;
      escapeTimer -= dt;
      toPlayer.copy(player).sub(root.position).setY(0);
      const distance = toPlayer.length();
      let desired = 0;

      switch (rabbit.state) {
        case "hidden":
          // Dalış: deliğin ağzına süzülüp aşağı batar; sonra başka bir delikten yükselerek çıkar.
          if (timer > 1.7 && diveBurrow) {
            root.visible = true;
            root.position.x += (diveBurrow.x - root.position.x) * Math.min(1, dt * 9);
            root.position.z += (diveBurrow.z - root.position.z) * Math.min(1, dt * 9);
            root.position.y -= dt * 5.5;
            return;
          }
          root.visible = false;
          if (timer <= 0 && exitBurrow) {
            root.position.set(exitBurrow.x, -2.2, exitBurrow.z);
            root.visible = true;
            rabbit.state = "wander";
            pickWander();
          }
          return;
        case "dig":
          // Durup pençeleriyle kazar; bitince kendi çukuruna dalar, başka bir delikten çıkar.
          root.position.y = -Math.abs(Math.sin(time * 16)) * 0.14;
          root.rotation.x = -Math.abs(Math.sin(time * 16)) * 0.25;
          if (timer <= 0) {
            root.rotation.x = 0;
            const hole = { x: root.position.x, z: root.position.z };
            holes.push(hole);
            if (holes.length > 4) holes.shift();
            const exit = rabbit.onDig?.(hole.x, hole.z, "done");
            diveBurrow = hole;
            exitBurrow = exit ?? burrows[Math.floor(random() * burrows.length)];
            rabbit.state = "hidden";
            timer = 2.2;
            digCooldown = 10 + random() * 8;
          }
          return;
        case "steal":
          // Hedefe (raf, yerdeki plak ya da oyuncunun arkası) koşar; ulaşınca kapar ve kaçar.
          // Raf/yer hedefinde oyuncu 5 m'ye yaklaşırsa vazgeçer; elden kapmada zaten oyuncuya sokulur.
          if (!stealFromHand && distance < 5) {
            onSteal = null;
            rabbit.state = "flee";
            break;
          }
          target.copy(stealTarget);
          desired = stealFromHand ? 4.2 : 3.4;
          // Ulaşınca (ya da rafın/oyuncunun önünde çarpışmaya dayanıp kaldıysa) uzanıp kapar.
          const reach = root.position.distanceTo(stealTarget);
          // Hedefe varamıyorsa (raf önü kapalı, engel var) vazgeçer: sonsuza dek duvara yaslanmaz.
          if (stuck > 2.5 && reach >= 2.4) {
            onSteal = null;
            stuck = 0;
            rabbit.state = "flee";
            fledTimer = 4;
            chooseEscape(player);
            break;
          }
          if (reach < (stealFromHand ? 0.9 : 1.1) || (reach < 2.4 && stuck > 0.5)) {
            onSteal?.();
            onSteal = null;
            rabbit.state = "flee";
            escapeTimer = 12;
            escapeHole = null;
          }
          break;
        case "dizzy":
          stars.visible = true;
          stars.rotation.y += dt * 4;
          if (timer <= 0) {
            stars.visible = false;
            rabbit.state = "flee";
          }
          break;
        case "free":
          desired = root.position.distanceTo(target) > 1.6 ? 2.2 : 0;
          // Oturma yerine ulaşamıyorsa (kitaplık, sehpa): yakınında boş bir yer seçer; her denemede halka
          // genişler, böylece rafla gramofonun arasına sıkışıp kalmaz.
          if (stuck > 1.2) {
            stuck = 0;
            freeRetries += 1;
            const ring = Math.min(6, 1.8 + freeRetries * 1.2);
            for (let k = 0; k < 10; k += 1) {
              const a = random() * Math.PI * 2;
              const x = target.x + Math.cos(a) * ring;
              const z = target.z + Math.sin(a) * ring;
              if (isFree(x, z, 0.8) && isFree((root.position.x + x) / 2, (root.position.z + z) / 2, 0.6)) {
                target.set(x, 0, z);
                break;
              }
            }
          }
          break;
        case "curious":
          // Oyuncu kabuğundayken tavşan merakla yaklaşır ve koklar.
          if (!playerHidden) {
            rabbit.state = distance < 4 ? "dizzy" : "flee";
            timer = 2.5;
            break;
          }
          target.copy(player).addScaledVector(toPlayer.normalize(), -2.2).setY(0);
          desired = distance > 2.6 ? 2 : 0;
          break;
        default: {
          // Plağı yeni kaptıysa: senden uzak tarafta kalan en yakın deliğe koşar ve dalar.
          if (escapeTimer > 0) {
            rabbit.state = "flee";
            if (!escapeHole) {
              let best = Infinity;
              for (const hole of [...burrows, ...holes]) {
                const mine = Math.hypot(hole.x - root.position.x, hole.z - root.position.z);
                const theirs = Math.hypot(hole.x - player.x, hole.z - player.z);
                const score = mine - Math.min(theirs, 20) * 0.6;
                if (mine > 1.5 && score < best) {
                  best = score;
                  escapeHole = hole;
                }
              }
            }
            if (escapeHole) {
              target.set(escapeHole.x, 0, escapeHole.z);
              desired = 6.4;
              if (Math.hypot(escapeHole.x - root.position.x, escapeHole.z - root.position.z) < 1.3) {
                diveBurrow = escapeHole;
                const others = burrows.filter((b) => b !== escapeHole);
                exitBurrow = others[Math.floor(random() * others.length)];
                escapeTimer = 0;
                escapeHole = null;
                rabbit.state = "hidden";
                timer = 2.2;
                return;
              }
              break;
            }
          }
          if (playerHidden && distance < 24) {
            rabbit.state = "curious";
            break;
          }
          const fleeRadius = 12;
          if (distance < fleeRadius || (hasEscape && distance < 22)) {
            rabbit.state = "flee";
            fledTimer = 4;
            // Tehlikedeyse yakındaki bir tavşan deliğine ya da kendi çukuruna dalabilir.
            const burrow = [...burrows, ...holes].find((b) => Math.hypot(b.x - root.position.x, b.z - root.position.z) < 2.5);
            if (burrow && random() < 0.02) {
              exitBurrow = burrows[(Math.max(0, burrows.indexOf(burrow)) + 1 + Math.floor(random() * (burrows.length - 1))) % burrows.length];
              diveBurrow = burrow;
              rabbit.state = "hidden";
              timer = 2.2;
              return;
            }
            // Kaçış noktası yoksa, varıldıysa ya da oyuncu o noktaya yaklaştıysa yenisini seç (zikzak).
            if (!hasEscape || root.position.distanceTo(escape) < 2 || Math.hypot(escape.x - player.x, escape.z - player.z) < 7) chooseEscape(player);
            target.copy(escape);
            desired = Math.max(3.4, 8.2 - rabbit.hits * 1.5);
          } else {
            hasEscape = false;
            // Kaçışın hemen ardından, sen daha uzaktayken durup çukur kazar: kaçış yolunu kendi açar.
            if (fledTimer > 0 && distance < 26 && digCooldown <= 0 && random() < dt * 0.7) {
              rabbit.state = "dig";
              timer = 1.8;
              rabbit.onDig?.(root.position.x, root.position.z, "start");
              return;
            }
            rabbit.state = "wander";
            if (root.position.distanceTo(target) < 1.5 || timer <= 0) {
              pickWander();
              timer = 6 + random() * 5;
            }
            desired = 2.1;
          }
        }
      }

      speed += (desired - speed) * Math.min(1, dt * 4);
      direction.copy(target).sub(root.position).setY(0);
      if (direction.lengthSq() > 0.01 && speed > 0.05) {
        direction.normalize();
        root.position.addScaledVector(direction, speed * dt);
        // Gramofon, kitaplık, kâse gibi engellere takılmaz: dışarı itilir; uzun süre ilerleyemezse hedef değişir.
        before.copy(root.position);
        resolve(root.position, 0.45);
        stuck = before.distanceTo(root.position) > 0.02 ? stuck + dt : 0;
        if (stuck > 0.8 && rabbit.state === "flee") {
          // Kaçarken engele takıldı: başka bir kaçış noktası (engelsiz) seç.
          stuck = 0;
          chooseEscape(player);
          target.copy(escape);
        } else if (stuck > 1.2 && rabbit.state !== "steal" && rabbit.state !== "free") {
          stuck = 0;
          pickWander();
        }
        const yaw = Math.atan2(direction.x, direction.z);
        root.rotation.y += Math.atan2(Math.sin(yaw - root.rotation.y), Math.cos(yaw - root.rotation.y)) * Math.min(1, dt * 8);
      } else if (rabbit.state === "curious" || rabbit.state === "free") {
        const yaw = Math.atan2(toPlayer.x, toPlayer.z);
        root.rotation.y += Math.atan2(Math.sin(yaw - root.rotation.y), Math.cos(yaw - root.rotation.y)) * Math.min(1, dt * 3);
      }
      const blend = THREE.MathUtils.clamp((speed - 2) / 4, 0, 1);
      run?.setEffectiveWeight(blend);
      walk?.setEffectiveWeight(1 - blend);
      // Delikten çıkarken aşağıdan yükselir.
      root.position.y = rabbit.state === "dizzy" ? Math.abs(Math.sin(time * 6)) * 0.05 : Math.min(0, root.position.y + dt * 4.5);
    },
    hit() {
      if (rabbit.state === "hidden" || rabbit.state === "free") return;
      rabbit.hits += 1;
      if (rabbit.hits >= 3) {
        rabbit.state = "dizzy";
        timer = 4.5;
        rabbit.hits = 0;
      }
    },
    release(point) {
      rabbit.state = "free";
      onSteal = null;
      stars.visible = false;
      stuck = 0;
      freeRetries = 0;
      target.copy(point).setY(0);
    },
    steal(point, callback, fromHand = false) {
      stealTarget.copy(point).setY(0);
      onSteal = callback;
      stealFromHand = fromHand;
      stars.visible = false;
      rabbit.state = "steal";
    },
    retarget(point) {
      stealTarget.copy(point).setY(0);
    },
    hitTest(point) {
      if (!root.visible) return false;
      const dx = point.x - root.position.x;
      const dz = point.z - root.position.z;
      return dx * dx + dz * dz < 0.8 && point.y > 0 && point.y < HEIGHT + 0.3;
    },
  };
  return rabbit;
}
