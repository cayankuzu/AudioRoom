import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ASSETS, CAT, PALETTE, WORLD } from "../config/config";

/**
 * Schrödinger'in kedisi — sahnede rastgele dolaşan tek bir kedi.
 *
 * Davranış:
 *  - Düşük poligon, mat siyah silüet (sarı zemin üstünde net kontrast,
 *    "kutudaki kedi" referansı: süperpozisyonun karanlık metaforu).
 *  - Random walk: rastgele bir hedef nokta seçer, oraya yürür, varınca
 *    veya zaman aşımına uğrayınca durur, bir süre dinlenir, yeni hedef
 *    seçer. Yürürken yön kademeli döner (smooth yaw).
 *  - Y zemine yapışır (dalgayı takip eder).
 *  - Kuyruk hareket halindeyken hafif sallanır.
 *
 * Yaklaşım algılama:
 *  - Oyuncu < `proximityShow` mesafede iken HTML isim levhası belirir
 *    ve kedinin başının üstüne yapışır (3D → ekran projeksiyonu).
 *  - `proximityHide` üstüne çıkınca solar.
 */

export type CatMode = "free" | "carried";

export interface CatHandle {
  group: THREE.Group;
  /** Kedinin world-space pozisyonu (read-only davran). */
  position: THREE.Vector3;
  /** Mevcut mod (carry sistemi okur). */
  readonly mode: CatMode;
  /**
   * Carry geçişi — Redd-style: scene ↔ camera reparenting.
   * `carried=true`: kameraya bağlanır, kucakta görünür.
   * `carried=false`: oyuncunun önüne bırakılır, free fizik geri döner.
   */
  setCarried(carried: boolean, camera: THREE.Camera): void;
  update(
    time: number,
    delta: number,
    getHeightAt: (x: number, z: number) => number,
    camera: THREE.Camera,
    playerPos: THREE.Vector3,
    container: HTMLElement,
  ): void;
  dispose(): void;
}

const PROXIMITY_SHOW = 6.0;
const PROXIMITY_HIDE = 9.0;

/** Hedef sahne yüksekliği (metre) — kedi modelin orijinal ölçeği STL'de
 *  mm/cm karışık olabilir; biz sabit bir görsel boya ölçekleriz. */
const CAT_HEIGHT_M = 1.2;

/**
 * STL → Mesh, mat siyah malzeme atanmış, sahnede ayağa kalkmış,
 * Y=0 ayak hizasında, ileri yönü +X olacak şekilde hizalanmış.
 *
 * STL koordinat sistemi genelde Z-up (CAD geleneği). Three.js Y-up.
 * Modeli rotateX(-π/2) ile yatırırız → Z-up → Y-up.
 * Ayrıca sphynx kediler genellikle modelci tarafından yan duracak
 * şekilde modellenir; gerekirse `yawOffset` ile düzeltiriz.
 */
function buildCatModel(geo: THREE.BufferGeometry): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.name = "kd-cat-model";

  const black = new THREE.MeshStandardMaterial({
    color: PALETTE.inkBlack,
    roughness: 0.78,
    metalness: 0.05,
  });

  /** STL vertex normaller bazen eksik / pürüzlü olur — yeniden hesapla. */
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, black);
  mesh.castShadow = false;
  mesh.receiveShadow = false;

  /** Bir ara grup → Z-up'tan Y-up'a yatırma ve yaw düzeltmesi
   *  burada yapılır; üst wrapper sadece scale + position taşır. */
  const orient = new THREE.Group();
  orient.add(mesh);
  /** Z-up STL → Y-up: -90° X. */
  orient.rotation.x = -Math.PI / 2;
  wrapper.add(orient);

  /** Bounding box → ölçek + ayağı yere oturt. */
  const bounds = new THREE.Box3().setFromObject(wrapper);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const center = new THREE.Vector3();
  bounds.getCenter(center);

  const currentH = Math.max(size.y, 0.0001);
  const scale = CAT_HEIGHT_M / currentH;
  wrapper.scale.setScalar(scale);

  /** Yeniden ölçekledik → bbox da değişti; ayak Y=0'a gelsin diye
   *  ölçek sonrası alt sınırı çıkarırız. */
  const scaledBounds = new THREE.Box3().setFromObject(wrapper);
  const minY = scaledBounds.min.y;
  const cx = (scaledBounds.min.x + scaledBounds.max.x) * 0.5;
  const cz = (scaledBounds.min.z + scaledBounds.max.z) * 0.5;
  /** Ortayı XZ'de hizala, ayağı Y=0'a oturt. */
  wrapper.position.set(-cx, -minY, -cz);

  /** Wrapper alt root'a daha temiz API için sarılır. */
  const root = new THREE.Group();
  root.add(wrapper);
  void center;

  return root;
}

function loadSTL(url: string): Promise<THREE.BufferGeometry> {
  const loader = new STLLoader();
  return new Promise((resolve, reject) => {
    loader.load(url, (geo) => resolve(geo), undefined, (e) => reject(e));
  });
}

function buildNameplate(parent: HTMLElement): HTMLElement {
  const el = document.createElement("div");
  el.className = "kd-cat-nameplate";
  el.innerHTML = `
    <div class="kd-cat-nameplate__inner">
      <span class="kd-cat-nameplate__eyebrow">Tanışma</span>
      <span class="kd-cat-nameplate__name">Şrödinger'in Kedisi</span>
      <span class="kd-cat-nameplate__sub">aynı anda hem burada hem değil</span>
    </div>
  `;
  parent.appendChild(el);
  return el;
}

export interface CatOptions {
  startPosition: { x: number; z: number };
}

export function createCat(scene: THREE.Scene, options: CatOptions): CatHandle {
  /** Hierarchy: root (world pos + smoothYaw)
   *               └── gaitGroup (yürüme animasyonu — bob/pitch/roll)
   *                    └── model (STL, async eklenir)
   *
   * STL tek parça mesh — kemik/iskelet yok. Yürüme animasyonu modeli
   * komple sallayarak/eğerek/yükselterek taklit edilir (çocuk-oyuncak
   * yürüyüş hissi). Bacak hareketi simüle edilemez ama vücut bob'u +
   * yan/ön salınımlar gözle anlamlı bir gait oluşturur. */
  const root = new THREE.Group();
  root.name = "kd-cat";
  const gaitGroup = new THREE.Group();
  gaitGroup.name = "kd-cat-gait";
  root.add(gaitGroup);
  scene.add(root);

  loadSTL(ASSETS.catModel)
    .then((geo) => {
      const model = buildCatModel(geo);
      gaitGroup.add(model);
      console.log("[cat] STL yüklendi");
    })
    .catch((e) => {
      console.warn("[cat] STL yüklenemedi:", e);
    });

  /** ── State ───────────────────────────────────────────────── */
  const position = new THREE.Vector3(options.startPosition.x, 0, options.startPosition.z);
  const target = new THREE.Vector3(position.x, 0, position.z);
  let walkMode: "idle" | "walking" = "idle";
  let isFleeing = false;
  let stateTimer = 1.5;
  let smoothYaw = Math.random() * Math.PI * 2;
  let smoothY = 0;

  /** Carry modu — "free" iken random walk + flee; "carried" iken
   *  kameraya bağlı, fizik durur. */
  let carryMode: CatMode = "free";

  const limit = WORLD.half - 4;

  const pickTarget = () => {
    /** Mevcut konuma 8–35 m mesafede rastgele yön. */
    const angle = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * 27;
    const tx = position.x + Math.cos(angle) * dist;
    const tz = position.z + Math.sin(angle) * dist;
    target.set(
      Math.max(-limit, Math.min(limit, tx)),
      0,
      Math.max(-limit, Math.min(limit, tz)),
    );
  };

  /** Kucağa alındığında uygulanacak el-pozisyonu (kamera lokal). */
  const carriedPosition = new THREE.Vector3(0.0, -0.85, -1.2);
  const carriedEuler = new THREE.Euler(-0.15, Math.PI, 0);
  const carriedScale = 0.85;

  /** Nameplate DOM — dökümana eklenmiş, container parent içinde olacak. */
  let nameplate: HTMLElement | null = null;
  let nameplateOpacity = 0;
  const tmpVec = new THREE.Vector3();

  /** ── Gait state ───────────────────────────────────────────────
   *  - `gaitPhase`: yürüme döngüsünün anlık fazı (radyan).
   *  - `gaitIntensity`: 0..1, yürürken 1'e gider, idle'da 0'a iner —
   *    smooth geçiş için.
   *  Bir adım = `2π / strideHz` saniye.
   *  Hız bağlı modülasyon: hız arttıkça step sıklığı artar.
   */
  let gaitPhase = 0;
  let gaitIntensity = 0;
  /** Stride hızı CAT.walkSpeed'e orantılı: hızlı → daha sık adım. */
  const STRIDE_HZ = 2.4 * (CAT.walkSpeed / 1.4);
  const BOB_AMP = 0.045; /** Y bob (m) — adım inişlerinde yere doğru */
  const ROLL_AMP = 0.10; /** Z roll (rad) — vücut yan-yana sallanır */
  const PITCH_AMP = 0.06; /** X pitch (rad) — burun aşağı/yukarı küçük */
  const YAW_WOB_AMP = 0.045; /** Y yaw wobble (rad) — burun sağ/sol */
  /** Idle nefes — yavaş Y bob. */
  const IDLE_BREATHE_AMP = 0.012;
  const IDLE_BREATHE_HZ = 0.55;

  return {
    group: root,
    position,
    get mode() { return carryMode; },
    setCarried(carried, camera) {
      if (carried && carryMode === "free") {
        scene.remove(root);
        camera.add(root);
        root.position.copy(carriedPosition);
        root.rotation.copy(carriedEuler);
        root.scale.setScalar(carriedScale);
        carryMode = "carried";
        /** Kucakta animasyon dursun (kedi sakinleşir, mırıltı). */
        gaitIntensity = 0;
        walkMode = "idle";
        isFleeing = false;
      } else if (!carried && carryMode === "carried") {
        camera.remove(root);
        scene.add(root);
        root.scale.setScalar(1);
        root.rotation.set(0, smoothYaw, 0);
        /** Oyuncunun önüne, ~1.6 m mesafede bırak. */
        const forward = new THREE.Vector3(0, 0, -1);
        camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 1e-4) forward.set(0, 0, -1);
        forward.normalize();
        const tx = camera.position.x + forward.x * 1.6;
        const tz = camera.position.z + forward.z * 1.6;
        position.x = Math.max(-limit, Math.min(limit, tx));
        position.z = Math.max(-limit, Math.min(limit, tz));
        carryMode = "free";
        /** Yere indi → kısa süre uyuşuk dursun, sonra rastgele yürüsün. */
        walkMode = "idle";
        stateTimer = 0.6 + Math.random() * 1.0;
      }
    },
    update(_time, delta, getHeightAt, camera, playerPos, container) {
      if (!nameplate) nameplate = buildNameplate(container);

      /** ── CARRIED: kameraya bağlı, fizik yok ──────────────────
       *  Sadece nefes-bob + nameplate (her zaman görünür). */
      if (carryMode === "carried") {
        const breathe =
          Math.sin(_time * IDLE_BREATHE_HZ * 1.6 * Math.PI * 2) *
          IDLE_BREATHE_AMP * 1.4;
        gaitGroup.position.y = breathe;
        gaitGroup.rotation.x = 0;
        gaitGroup.rotation.z = 0;
        /** Kucakta nameplate üst-sol köşede sürekli görünür yap. */
        if (nameplate) {
          nameplate.style.opacity = "0.9";
          /** Ekranda sabit konum: kamera-altı orta. */
          const sx = window.innerWidth * 0.5;
          const sy = window.innerHeight * 0.78;
          nameplate.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%)`;
        }
        return;
      }

      stateTimer -= delta;

      /** ── Oyuncu mesafesi & flee kararı ────────────────────────
       *  Oyuncu CAT.fleeTrigger içine girerse: hedef = ters yönde
       *  CAT.fleeDistance noktası (room'a clamp), hız = fleeSpeed.
       *  Oyuncu uzaklaşınca isFleeing = false → normal random walk. */
      const dxp = position.x - playerPos.x;
      const dzp = position.z - playerPos.z;
      const distP = Math.hypot(dxp, dzp);

      if (distP < CAT.fleeTrigger) {
        if (!isFleeing) {
          isFleeing = true;
          stateTimer = 0;
        }
        /** Her frame yeni hedef = oyuncudan zıt yönde fleeDistance.
         *  Açıya küçük jitter (±10°) → düz çizgide robotik kaçmasın. */
        const fleeBase = Math.atan2(dzp, dxp);
        const jitter = (Math.random() - 0.5) * (Math.PI / 9);
        const fa = fleeBase + jitter;
        const tx = position.x + Math.cos(fa) * CAT.fleeDistance;
        const tz = position.z + Math.sin(fa) * CAT.fleeDistance;
        target.set(
          Math.max(-limit, Math.min(limit, tx)),
          0,
          Math.max(-limit, Math.min(limit, tz)),
        );
        walkMode = "walking";
      } else if (isFleeing && distP > CAT.fleeTrigger * 1.5) {
        /** Hysteresis — oyuncu yeterince uzaklaştı, kaçma sön. */
        isFleeing = false;
        walkMode = "idle";
        stateTimer = 0.8 + Math.random() * 1.5;
      }

      if (!isFleeing) {
        if (walkMode === "idle") {
          if (stateTimer <= 0) {
            pickTarget();
            walkMode = "walking";
            stateTimer = 6 + Math.random() * 6;
          }
        } else {
          const dx = target.x - position.x;
          const dz = target.z - position.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.5 || stateTimer <= 0) {
            walkMode = "idle";
            stateTimer = 1.0 + Math.random() * 2.5;
          }
        }
      }

      /** Hareket — flee veya normal walking için ortak. */
      if (walkMode === "walking") {
        const dx = target.x - position.x;
        const dz = target.z - position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.01) {
          const inv = 1 / dist;
          const sp = isFleeing ? CAT.fleeSpeed : CAT.walkSpeed;
          position.x += dx * inv * sp * delta;
          position.z += dz * inv * sp * delta;
          const desiredYaw = Math.atan2(dx, dz) - Math.PI / 2;
          let dy = desiredYaw - smoothYaw;
          while (dy > Math.PI) dy -= Math.PI * 2;
          while (dy < -Math.PI) dy += Math.PI * 2;
          smoothYaw += dy * Math.min(1, delta * (isFleeing ? 9 : 6));
        }
      }

      /** Y → zemin. */
      const targetY = getHeightAt(position.x, position.z);
      smoothY = smoothY + (targetY - smoothY) * (1 - Math.exp(-delta * 9));
      position.y = smoothY;

      /** ── Yürüme animasyonu — gait faz ilerletme ────────────── */
      const targetIntensity = walkMode === "walking" ? 1 : 0;
      gaitIntensity +=
        (targetIntensity - gaitIntensity) * (1 - Math.exp(-delta * 6));

      if (walkMode === "walking") {
        /** Kaçışta tempolu — stride hızı %40 artar. */
        const stride = STRIDE_HZ * (isFleeing ? 1.4 : 1.0);
        gaitPhase += delta * stride * Math.PI * 2;
      }

      const sinP = Math.sin(gaitPhase);
      const sin2P = Math.sin(gaitPhase * 2);
      const bob = Math.abs(sinP) * BOB_AMP;
      const roll = sinP * ROLL_AMP;
      const pitch = sin2P * PITCH_AMP * 0.5;
      const yawWob = sinP * YAW_WOB_AMP;

      const breathe =
        Math.sin(_time * IDLE_BREATHE_HZ * Math.PI * 2) *
        IDLE_BREATHE_AMP *
        (1 - gaitIntensity);

      gaitGroup.position.y = bob * gaitIntensity + breathe;
      gaitGroup.rotation.x = pitch * gaitIntensity;
      gaitGroup.rotation.z = roll * gaitIntensity;

      root.position.copy(position);
      root.rotation.y = smoothYaw + yawWob * gaitIntensity;

      /** ── Yaklaşım & nameplate konumlandır ─────────────────────
       *  `distP` yukarıda flee kararı için zaten hesaplandı; tekrar
       *  hesaplamayız. */
      const visible = distP < PROXIMITY_SHOW;
      const fade = distP < PROXIMITY_HIDE ? 1 - Math.max(0, (distP - PROXIMITY_SHOW) / (PROXIMITY_HIDE - PROXIMITY_SHOW)) : 0;
      const targetOpacity = visible ? 1 : fade;
      nameplateOpacity += (targetOpacity - nameplateOpacity) * (1 - Math.exp(-delta * 8));

      if (nameplate) {
        if (nameplateOpacity < 0.01) {
          nameplate.style.opacity = "0";
          nameplate.style.transform = "translate(-9999px, -9999px)";
        } else {
          /** Kedinin başının ~0.6 m üstünü ekrana yansıt. */
          tmpVec.set(position.x, position.y + 1.5, position.z);
          tmpVec.project(camera);
          const sx = (tmpVec.x * 0.5 + 0.5) * window.innerWidth;
          const sy = (-tmpVec.y * 0.5 + 0.5) * window.innerHeight;
          /** Z > 1 → kamera arkası, gizle. */
          if (tmpVec.z > 1) {
            nameplate.style.opacity = "0";
          } else {
            nameplate.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -100%)`;
            nameplate.style.opacity = String(nameplateOpacity);
          }
        }
      }
    },
    dispose() {
      nameplate?.remove();
    },
  };
}
