import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { COMPOSITION, PLAYER, WORLD } from "../config/config";
import type { WorldLights } from "../scene/lights";
import { LAYER } from "../scene/layers";

export interface FigureHandle {
  root: THREE.Group;
  /** Figür kafasının world-space Y değeri — ses mesafe referansı için de kullanılır. */
  headWorldY(): number;
  /** Kompozisyon merkezinin world-space konumu (figür = merkez). */
  centerWorld(target: THREE.Vector3): THREE.Vector3;
  update(time: number, delta: number): void;
}

const MODEL_URL = `${import.meta.env.BASE_URL}assets/models/levitation.glb`;

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
  return new THREE.MeshStandardMaterial({
    color: "#030305",
    roughness: 0.98,
    metalness: 0.03,
    emissive: "#000000",
    emissiveIntensity: 0,
  });
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

  /** Fill / crater / textRim — sahne seviyesinde sabit. */
  const textBaseY = craterFloorY + COMPOSITION.baseLift;

  /**
   * textFill + textBoost dünya uzayında kalır — composition rotasyonu
   * figür silüetini istenilen şekilde dönderir, ancak yazıların yüzüne
   * vuran ışık viewer tarafından stabil gelir → okunurluk korunur.
   */
  const worldTextY = textBaseY + COMPOSITION.titleExtraY;
  lights.textFill.position.set(
    viewerDir.x * 26,
    worldTextY + 8,
    viewerDir.y * 26,
  );
  lights.textFill.target.position.set(WORLD.craterCenter.x, worldTextY, WORLD.craterCenter.z);
  lights.textBoost.position.set(
    WORLD.craterCenter.x + viewerDir.x * 4,
    worldTextY + 1.2,
    WORLD.craterCenter.z + viewerDir.y * 4,
  );
  lights.fill.position.set(viewerDir.x * 20, 32, viewerDir.y * 20 + 14);
  lights.fill.target.position.set(WORLD.craterCenter.x, textBaseY + 2.5, WORLD.craterCenter.z);
  lights.craterFill.position.set(WORLD.craterCenter.x, craterFloorY + 11, WORLD.craterCenter.z);
  lights.textRim.position.set(
    WORLD.craterCenter.x + viewerDir.x * 5.5,
    textBaseY + 5.5,
    WORLD.craterCenter.z + viewerDir.y * 5.5,
  );

  const sunWorld = new THREE.Vector3();
  const targetWorld = new THREE.Vector3();
  const toSun = new THREE.Vector3();
  const sunBaseLocal = sunLocalPos.clone();

  const mat = buildFigureMaterial();
  const fallback = buildFallbackFigure(mat);
  liftRoot.add(fallback);

  let figureHeadLocalY = COMPOSITION.figureHeadLocalY;

  const loader = new GLTFLoader();
  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        /** Figür TEXT layer'ında DEĞİL — textFill ve textBoost onu etkilemez. */
        mesh.layers.set(LAYER.DEFAULT);
        const tint = (material: THREE.MeshStandardMaterial) => {
          material.color = new THREE.Color("#030305");
          material.roughness = 0.98;
          material.metalness = 0.03;
          material.emissive = new THREE.Color("#000000");
          material.emissiveIntensity = 0;
        };
        const m = mesh.material as
          | THREE.MeshStandardMaterial
          | THREE.MeshStandardMaterial[]
          | undefined;
        if (Array.isArray(m)) m.forEach(tint);
        else if (m) tint(m);
      });

      const bounds = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      bounds.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const targetHeight = 2.45;
      const scale = targetHeight / maxDim;
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
    },
    undefined,
    () => {
      /* fallback kalır */
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
