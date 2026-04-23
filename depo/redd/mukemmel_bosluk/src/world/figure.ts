import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { COMPOSITION, PLAYER, WORLD } from "../config/config";
import type { WorldLights } from "../scene/lights";
import { LAYER } from "../scene/layers";
import { applyFixedColorMarker } from "../utils/fixedColorMarker";

export interface FigureHandle {
  root: THREE.Group;
  /** Figür kafasının world-space Y değeri — ses mesafe referansı için de kullanılır. */
  headWorldY(): number;
  /** Kompozisyon merkezinin world-space konumu (figür = merkez). */
  centerWorld(target: THREE.Vector3): THREE.Vector3;
  update(time: number, delta: number): void;
}

/**
 * `public/assets/models/levitation.glb` kök `public/` içindeki statik asset.
 * URL'i çalışma zamanında `document.baseURI` (Redd HTML sayfasının kendi URL'i)
 * üzerinden mutlak biçimde çözüyoruz — bu sayede:
 *   - Dev  : `http://localhost:5173/depo/redd/mukemmel_bosluk/` → `.../assets/...`
 *   - Pages: `https://user.github.io/AudioRoom/depo/redd/mukemmel_bosluk/`
 *           → `https://user.github.io/AudioRoom/assets/...`
 * Three.js FileLoader'ı relative stringi `document.baseURI` ile çözer ama bazı
 * ortamlarda (hydration / service worker) `baseURI` geç set edildiği için
 * inşa anında mutlak href üretiyoruz.
 */
const MODEL_URL = new URL(
  "../../../assets/models/levitation.glb",
  typeof document !== "undefined" ? document.baseURI : "/",
).href;

const DAY_BG = new THREE.Color("#bfbfc1");
const NIGHT_BG = new THREE.Color("#0d0f12");
const DAY_FOG = new THREE.Color("#b0b4b8");
const NIGHT_FOG = new THREE.Color("#1a1e24");

/**
 * Figür materyali:
 * - Son derece koyu taban rengi (kapkara değil — nüans için çok az gri).
 * - Hafif metallic + düşük roughness rim okunurluğu için minimal.
 * - Emissive yok — sahne ışığına tepkisiz görünsün, silüet baskın kalsın.
 */
function buildFigureMaterial(): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    /**
     * Saf siyah silüet — albüm kapağındaki gibi. Hiçbir gri kayma
     * istemiyoruz; grading'in red-mask kuralı sayesinde bu pikseller
     * zaten monokrom kanada düşüyor, hafif hemi dolgu silüetin kenarlarına
     * minik bir detay bırakıyor.
     */
    color: "#000000",
    roughness: 1.0,
    metalness: 0,
    emissive: "#000000",
    emissiveIntensity: 0,
  });
  /**
   * Parlaklık/kontrast slider'ları figürü değiştirmesin — post-process
   * grading bu pikselleri alpha marker üzerinden tamamen atlar.
   */
  applyFixedColorMarker(mat);
  return mat;
}

function buildFallbackFigure(mat: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.2, 6, 12), mat);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), mat);
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.82, 4, 8), mat);
  const armR = armL.clone();
  const legL = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.85, 4, 8), mat);
  const legR = legL.clone();
  torso.position.y = 1.25;
  head.position.set(0, 2.15, 0);
  armL.position.set(-0.44, 1.4, 0);
  armR.position.set(0.44, 1.4, 0);
  armL.rotation.z = 0.42;
  armR.rotation.z = -0.42;
  legL.position.set(-0.17, 0.42, 0);
  legR.position.set(0.17, 0.42, 0);
  group.add(torso, head, armL, armR, legL, legR);
  [torso, head, armL, armR, legL, legR].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = false;
  });
  return group;
}

/**
 * Figür — `compositionGroup` altında TAM MERKEZLİ (local (0, figureLift, 0)).
 *
 * Güneş:
 * - Kompozisyon içinde figürün TAM KAFA ARKASINDA.
 * - Görünür DİSK YOK — sadece ışık etkisi.
 * - Figür → silüet; yazılar → kendi layer fill'leri ile okunur.
 */
export function createFigure(
  scene: THREE.Scene,
  compositionGroup: THREE.Group,
  getHeightAt: (x: number, z: number) => number,
  lights: WorldLights,
): FigureHandle {
  /** Figürü TAM MERKEZE sabitle — anıtsal kompozisyon ortada hizalı. */
  const localX = COMPOSITION.figureForwardOffset; // = 0
  const localZ = 0;

  const pivot = new THREE.Group();
  pivot.name = "figurePivot";
  const liftRoot = new THREE.Group();
  pivot.add(liftRoot);
  compositionGroup.add(pivot);

  const craterFloorY = getHeightAt(WORLD.craterCenter.x, WORLD.craterCenter.z);
  pivot.position.set(localX, COMPOSITION.figureWorldLift, localZ);

  /** Viewer yönü — composition local ekseninde backlight için. */
  const viewerDir = new THREE.Vector2(
    PLAYER.startPosition.x,
    PLAYER.startPosition.z,
  ).normalize();
  const backDir = new THREE.Vector2(-viewerDir.x, -viewerDir.y);

  /** LightRig — compositionGroup'un çocuğu. Sun + target. (Disk YOK.) */
  const lightRig = new THREE.Group();
  lightRig.name = "lightRig";
  compositionGroup.add(lightRig);

  /**
   * Sun target tam figür kafasında. Sun pozisyonu head'in tam arkasında,
   * biraz daha yüksekte — bu sayede silüet net ve güçlü oluyor.
   */
  const headLocalY = COMPOSITION.figureWorldLift + COMPOSITION.figureHeadLocalY;
  const lightTarget = new THREE.Object3D();
  lightTarget.position.set(localX, headLocalY, localZ);
  lightRig.add(lightTarget);

  /** Sun'ı sahneden çıkarıp compositionGroup içine al → kafa arkasında hizala. */
  scene.remove(lights.sun);
  scene.remove(lights.sun.target);

  const sunDist = COMPOSITION.sunDistance;
  const sunLocalPos = new THREE.Vector3(
    localX + backDir.x * sunDist,
    headLocalY + COMPOSITION.sunHeight,
    localZ + backDir.y * sunDist,
  );
  lights.sun.position.copy(sunLocalPos);
  lights.sun.target = lightTarget;
  lights.sun.intensity = 2.4;
  lights.sun.color.set("#fff4d8");
  lights.sun.castShadow = true;
  lightRig.add(lights.sun);

  /**
   * Güneş DİSKİ YOK — görünür mesh eklenmiyor. İstenen davranış:
   * "ışık kaynağı görünür olmasın, sadece etkisi hissedilsin".
   * Horizon glow ihtiyacı olursa fog + hemi dengesi yeterli.
   */

  /** Fill / crater — sahne seviyesinde sabit. */
  const textBaseY = craterFloorY + COMPOSITION.baseLift;

  /**
   * ---- KOMPOZİSYON-LOCAL TEXT AYDINLATMASI ----
   *
   * `textFill`, `textBoost` ve `textRim` artık `lightRig`'e (yani
   * compositionGroup'un çocuğuna) parentlanır. Local koordinatlar
   * figürün/yazıların önünde (viewerDir yönünde) konumlandırılır, target
   * yazıların tam merkezine bakar.
   *
   * Kompozisyon döndüğünde ışıklar da onunla birlikte döner; text'in
   * yüzüne vuran frontal-fill açısı her rotasyonda SABİT kalır →
   * "MÜKEMMEL BOŞLUK" ve "REDD" hiçbir rotasyonda karanlığa düşmez.
   *
   * Local frame: composition world pos (0, compositionBaseY, 0) etrafında
   * döner; yazılar local (0, titleExtraY, 0) ve (0, artistExtraY, 0)'da
   * duruyor. Local Y'ler hesabı için figür pivot lift'ini temel alıyoruz.
   */
  const localTitleY = COMPOSITION.titleExtraY;
  const localArtistY = COMPOSITION.artistExtraY;
  /** Orta Y — textFill ikisini de yalayacak şekilde. */
  const localTextMidY = (localTitleY + localArtistY) * 0.5;

  /**
   * textFill — yazının ÖNÜNDE (viewerDir yönünde), hafif yukardan iniyor.
   * Figür siluetinin karşı tarafında kalarak yazıya frontal ışık verir.
   * Composition çocuğu olduğu için composition rotasyonu ile döner.
   */
  lights.textFill.position.set(
    viewerDir.x * 26,
    localTextMidY + 8,
    viewerDir.y * 26,
  );
  lights.textFill.target.position.set(0, localTextMidY, 0);
  lightRig.add(lights.textFill);
  lightRig.add(lights.textFill.target);

  /** textBoost — yazıya çok yakın, kısa menzilli okunurluk garantisi. */
  lights.textBoost.position.set(
    viewerDir.x * 4,
    localTextMidY + 1.2,
    viewerDir.y * 4,
  );
  lightRig.add(lights.textBoost);

  /** textRim — yazıya yandan vurup kenar parlamasını öne çıkarır. */
  lights.textRim.position.set(
    viewerDir.x * 5.5,
    localTextMidY + 2.0,
    viewerDir.y * 5.5,
  );
  lightRig.add(lights.textRim);

  /** fill / craterFill — sahne seviyesinde sabit (composition dışı). */
  lights.fill.position.set(viewerDir.x * 20, 32, viewerDir.y * 20 + 14);
  lights.fill.target.position.set(WORLD.craterCenter.x, textBaseY + 2.5, WORLD.craterCenter.z);
  lights.craterFill.position.set(WORLD.craterCenter.x, craterFloorY + 11, WORLD.craterCenter.z);

  const sunWorld = new THREE.Vector3();
  const targetWorld = new THREE.Vector3();
  const toSun = new THREE.Vector3();
  const sunBaseLocal = sunLocalPos.clone();

  const mat = buildFigureMaterial();
  const fallback = buildFallbackFigure(mat);
  liftRoot.add(fallback);

  let figureHeadLocalY = COMPOSITION.figureHeadLocalY;

  const loader = new GLTFLoader();
  console.log("[Figür] GLB yükleniyor:", MODEL_URL);
  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      let meshCount = 0;
      model.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        meshCount += 1;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.frustumCulled = false;
        /** Figür TEXT layer'ında DEĞİL — textFill ve textBoost onu etkilemez. */
        mesh.layers.set(LAYER.DEFAULT);
        const tint = (material: THREE.MeshStandardMaterial) => {
          /**
           * SAF SİYAH SİLÜET — GLB texture'ı olsa bile onu iptal ediyoruz
           * (map/roughness/metal/normal/emissive null'lanır). Albüm kapak
           * referansına göre figür ton farkı olmayan düz siyah bir form;
           * yalnızca hemi + fill ışık kenarlarında çok hafif bir nüans
           * bırakır, içi ölü siyah kalır.
           */
          material.map = null;
          material.normalMap = null;
          material.roughnessMap = null;
          material.metalnessMap = null;
          material.emissiveMap = null;
          material.aoMap = null;
          material.color = new THREE.Color("#000000");
          material.roughness = 1.0;
          material.metalness = 0;
          material.emissive = new THREE.Color("#000000");
          material.emissiveIntensity = 0;
          material.transparent = false;
          material.depthWrite = true;
          material.side = THREE.FrontSide;
          /** Parlaklık/kontrast slider'ından bağımsız sabit silüet. */
          applyFixedColorMarker(material);
          material.needsUpdate = true;
        };
        const m = mesh.material as
          | THREE.MeshStandardMaterial
          | THREE.MeshStandardMaterial[]
          | undefined;
        if (Array.isArray(m)) m.forEach(tint);
        else if (m) tint(m);
      });

      /** Ölçekleme: referans Y (figür boyu), diyagonal değil. */
      const bounds = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      bounds.getSize(size);
      const modelHeight = size.y > 0.01 ? size.y : Math.max(size.x, size.z, 1);
      const targetHeight = 2.8;
      const scale = targetHeight / modelHeight;
      model.scale.setScalar(scale);

      /** XZ merkezine hizala — GLB pivot off ise düzeltir. */
      const postBounds = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      postBounds.getCenter(center);
      model.position.x -= center.x;
      model.position.z -= center.z;
      model.position.y -= postBounds.min.y;

      liftRoot.remove(fallback);
      liftRoot.add(model);
      figureHeadLocalY = targetHeight * 0.92;
      /** Sun target'ı gerçek head Y'ye güncelle. */
      lightTarget.position.y = COMPOSITION.figureWorldLift + figureHeadLocalY;
      console.log("[Figür] GLB yüklendi", {
        meshes: meshCount,
        targetHeight: targetHeight.toFixed(2),
        originalY: size.y.toFixed(2),
        scale: scale.toFixed(3),
      });
    },
    (progress) => {
      if (progress.lengthComputable && progress.total > 0) {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        if (pct === 25 || pct === 50 || pct === 75 || pct === 100) {
          console.log(`[Figür] yükleniyor… %${pct}`);
        }
      }
    },
    (err) => {
      console.error("[Figür] GLB yüklenemedi — fallback aktif:", err);
    },
  );

  const levitationAmp = COMPOSITION.figureLevitationAmplitude;
  const centerCache = new THREE.Vector3();

  return {
    root: pivot,
    headWorldY() {
      const cg = compositionGroup.position.y;
      return cg + pivot.position.y + liftRoot.position.y + figureHeadLocalY;
    },
    centerWorld(target) {
      compositionGroup.getWorldPosition(centerCache);
      target.copy(centerCache);
      target.y = this.headWorldY() - 1.1;
      return target;
    },
    update(time) {
      /** Yumuşak çift-sinüs salınımı — ruhani, ağır hissi. */
      const lift =
        Math.sin(time * 0.32) * 0.6 * levitationAmp +
        Math.sin(time * 0.11 + 0.9) * 0.4 * levitationAmp;
      liftRoot.position.y = lift;

      /** Sun yalnız dikeyde figürle ufak takip; yatay sabit (kafa arkasında). */
      lights.sun.position.set(sunBaseLocal.x, sunBaseLocal.y + lift * 0.4, sunBaseLocal.z);
      lightTarget.position.y = COMPOSITION.figureWorldLift + figureHeadLocalY + lift;

      /** Gün-gece eğrisi — backlight elev'inden hesapla. */
      lights.sun.getWorldPosition(sunWorld);
      lightTarget.getWorldPosition(targetWorld);
      toSun.subVectors(sunWorld, targetWorld).normalize();
      const elev = toSun.y;
      const day = THREE.MathUtils.clamp((elev + 0.15) / 0.7, 0, 1);
      const night = 1 - day;

      lights.sun.intensity = 1.35 + day * 2.0;
      lights.hemi.intensity = 0.34 + day * 0.42;
      lights.hemi.color.setHex(day > 0.35 ? 0xd9dde2 : 0x3f4956);
      lights.hemi.groundColor.setHex(day > 0.35 ? 0x26211c : 0x121011);
      lights.ambient.intensity = 0.18 + day * 0.18;
      lights.ambient.color.lerpColors(
        new THREE.Color("#323842"),
        new THREE.Color("#c8c8c8"),
        day,
      );

      lights.fill.intensity = 0.4 + day * 0.32;
      lights.craterFill.intensity = 0.7 + day * 0.45;
      lights.textRim.intensity = 0.42 + day * 0.34;
      /** textFill + textBoost neredeyse sabit — yazılar 7/24 okunur kalsın. */
      lights.textFill.intensity = 3.0 + day * 0.5;
      lights.textBoost.intensity = 2.0 + day * 0.4;

      const bg = scene.background as THREE.Color;
      bg.copy(DAY_BG).lerp(NIGHT_BG, night * 0.65);
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.copy(DAY_FOG).lerp(NIGHT_FOG, night * 0.6);
        scene.fog.near = 34 + night * 14;
        scene.fog.far = 215 + night * 35;
      }
    },
  };
}
