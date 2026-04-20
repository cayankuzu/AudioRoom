import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSETS, COMPOSITION, PALETTE, ROTATION } from "../config/config";
import { patchTurkishGlyphs } from "../utils/fontPatcher";

/**
 * Merkez kompozisyon — kapaktaki sıralama:
 *   1. "HAYKO CEPKİN"          (üstte, krem-amber, regular)
 *   2. Bebek ikon              (ortada, sıcak ten tonu, GLB)
 *   3. "BENİ BÜYÜTEN ŞARKILAR" (altta, bold, beyaz)
 *      "VOL.1"                 (en altta, küçük etiket)
 *
 * Hepsi kendi Y eksenlerinde aynı yöne, aynı hızla döner — Henry the Lee
 * `centerPiece.ts` kalıbı. Bebek 3D model olduğu için yazılar düz tipo,
 * model her açıdan görünür.
 */

export interface CenterPieceHandle {
  group: THREE.Group;
  ready: Promise<void>;
  update(time: number, delta: number): void;
}

interface SpinPart {
  group: THREE.Group;
  speed: number;
  baseY: number;
  breatheStrength: number;
}

function loadFont(url: string): Promise<Font> {
  const loader = new FontLoader();
  return new Promise((resolve, reject) => {
    loader.load(url, (font) => resolve(font), undefined, (e) => reject(e));
  });
}

function loadGLB(url: string): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      undefined,
      (e) => reject(e),
    );
  });
}

/**
 * Modeli targetSize küpüne sığdırır + merkeze hizalar. Bebek için
 * orijinal Meshy texture'ı korunur (tene benzer turuncu-pembe ton);
 * sahnedeki kor ışık ile zaten kapaktaki sıcaklığı yakalar.
 */
function fitGLBToBox(model: THREE.Group, targetSize: number): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.add(model);

  const bounds = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const center = new THREE.Vector3();
  bounds.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;

  model.position.sub(center);
  wrapper.scale.setScalar(scale);

  /** Texture varsa koru; yoksa sıcak ten tonu fallback. */
  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const m = obj.material as THREE.MeshStandardMaterial | undefined;
      if (m && (m as THREE.MeshStandardMaterial).map) {
        m.roughness = 0.65;
        m.metalness = 0.0;
        m.emissive = new THREE.Color(PALETTE.bloodDeep);
        m.emissiveIntensity = 0.15;
        m.needsUpdate = true;
      } else {
        obj.material = new THREE.MeshStandardMaterial({
          color: PALETTE.flesh,
          roughness: 0.62,
          metalness: 0.02,
          emissive: new THREE.Color(PALETTE.bloodDeep),
          emissiveIntensity: 0.18,
        });
      }
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });

  return wrapper;
}

/**
 * Göbek kordonu — bebeğin karnından (origin yakını) yukarıya doğru,
 * dome'un içlerine kadar uzanan organik, helezonik tüp.
 * Üç katman:
 *   1. Damar tüpü (TubeGeometry, helezon eğri) — ana kordon dokusu
 *   2. İç parıltı (additive emissive) — kalp atışıyla nabız
 *   3. Helezonik damar şeritleri — kordonun etrafında dolanan ince hatlar
 *
 * Kordon iconGroup ile birlikte Y ekseninde döner (bebek dönerken kordon
 * da onunla beraber savrulur). Üst ucu fog içinde kaybolarak "sonsuzluk"
 * hissini kuvvetlendirir.
 */
function createUmbilicalCord(): THREE.Group {
  const group = new THREE.Group();
  group.name = "umbilicalCord";

  /**
   * Kordon eğrisi — bebek karnından tavanın iç yüzeyine kadar uzanan
   * helezonik tüp. dome.radius = 240, iconGroup y = 9, yani kordonun
   * iconGroup-uzayında 235m yukarı çıkması lazım ki dome'a değsin.
   */
  const points: THREE.Vector3[] = [];
  const segments = 200;
  const totalHeight = 235;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const y = t * totalHeight;
    /**
     * Helezonik tabanda dar (karna sıkı oturur), yükseğe çıktıkça hafifçe
     * genişler. Yarıçap ve sarmal hızı log eğrisiyle yumuşatılır →
     * yukarıdaki uzun mesafede sarmal çok seyrek olmasın.
     */
    const radius = 0.10 + Math.log(1 + t * 9) * 0.55;
    const angle = Math.pow(t, 0.7) * Math.PI * 18;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    points.push(new THREE.Vector3(x, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.4);

  /**
   * Ana et tüpü — koyu maroon dış, sıcak emissive iç. Kordon yukarıya
   * doğru hafifçe inceleceği için TubeGeometry'yi sabit yarıçapla
   * çizip ardından scale.y zaten istenen yüksekliğe oturmuş kalır.
   */
  const tubeGeo = new THREE.TubeGeometry(curve, 600, 0.22, 14, false);
  const tubeMat = new THREE.MeshStandardMaterial({
    color: "#8a2820",
    emissive: "#5a0a0a",
    emissiveIntensity: 0.45,
    roughness: 0.78,
    metalness: 0.05,
  });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  tube.castShadow = false;
  tube.receiveShadow = false;
  group.add(tube);

  /** İnce damar şeritleri — kordonun etrafında 2 helezon hat. */
  for (const phase of [0, Math.PI]) {
    const veinPoints: THREE.Vector3[] = [];
    const veinSegs = segments * 2;
    for (let i = 0; i <= veinSegs; i += 1) {
      const t = i / veinSegs;
      const y = t * totalHeight;
      const r = 0.10 + Math.log(1 + t * 9) * 0.55 + 0.035;
      const a = Math.pow(t, 0.7) * Math.PI * 36 + phase;
      veinPoints.push(
        new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
      );
    }
    const veinCurve = new THREE.CatmullRomCurve3(veinPoints);
    const veinGeo = new THREE.TubeGeometry(veinCurve, 700, 0.03, 6, false);
    const veinMat = new THREE.MeshStandardMaterial({
      color: "#3a0a08",
      emissive: "#a02828",
      emissiveIntensity: 0.6,
      roughness: 0.6,
      metalness: 0.05,
    });
    const veinMesh = new THREE.Mesh(veinGeo, veinMat);
    group.add(veinMesh);
  }

  /** Bebek karnına oturan plasenta köprüsü — düşük yarıçaplı yumuşak küre. */
  const navel = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 24, 16),
    new THREE.MeshStandardMaterial({
      color: "#9a3020",
      emissive: "#6a1010",
      emissiveIntensity: 0.4,
      roughness: 0.65,
      metalness: 0.06,
    }),
  );
  navel.position.y = -0.05;
  group.add(navel);

  return group;
}

interface TextStyle {
  size: number;
  depth: number;
  letterSpacing: number;
  bevelThickness: number;
  bevelSize: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
}

function buildExtrudedText(
  text: string,
  font: Font,
  style: TextStyle,
): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: style.color,
    emissive: style.emissive,
    emissiveIntensity: style.emissiveIntensity,
    roughness: style.roughness,
    metalness: style.metalness,
    side: THREE.FrontSide,
  });

  let cursor = 0;
  const chars = Array.from(text);
  for (const ch of chars) {
    if (ch === " ") {
      cursor += style.size * 0.5;
      continue;
    }
    const geometry = new TextGeometry(ch, {
      font,
      size: style.size,
      depth: style.depth,
      bevelEnabled: true,
      bevelThickness: style.bevelThickness,
      bevelSize: style.bevelSize,
      bevelSegments: 2,
      curveSegments: 10,
    });
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    const bbox = geometry.boundingBox;
    if (!bbox) continue;
    const width = bbox.max.x - bbox.min.x;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = cursor - bbox.min.x;
    group.add(mesh);
    cursor += width + style.letterSpacing;
  }

  /** X/Y merkezine hizala. */
  const bounds = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  bounds.getCenter(center);
  const inner = new THREE.Group();
  inner.add(group);
  group.position.set(-center.x, -center.y, -center.z);
  return inner;
}

export function createCenterPiece(scene: THREE.Scene): CenterPieceHandle {
  const root = new THREE.Group();
  root.name = "bbs-center";
  scene.add(root);

  const parts: SpinPart[] = [];

  const ready = (async () => {
    const [iconModel, regular, bold] = await Promise.all([
      loadGLB(ASSETS.iconModel).catch((e) => {
        console.warn("[centerPiece] GLB ikon yüklenemedi:", e);
        return null;
      }),
      loadFont(ASSETS.fontRegular),
      loadFont(ASSETS.fontBold),
    ]);

    patchTurkishGlyphs(regular);
    patchTurkishGlyphs(bold);

    /** ── Bebek (GLB) ────────────────────────────────────────────── */
    if (iconModel) {
      const iconGroup = new THREE.Group();
      iconGroup.position.y = COMPOSITION.iconY;

      /**
       * Bebek "yatay süzülen fetus" pozisyonunda — kapaktaki gibi.
       *
       * Hedef poz:
       *   - Sırt aşağı (back faces -Y)
       *   - Yüz yukarı (face faces +Y)
       *   - Vücut uzun ekseni yatay (baş bir duvar, ayaklar diğer duvar)
       *   - Ayak tabanları radyal olarak duvarlara bakar
       *
       * İki katmanlı pivot:
       *   1. orientPivot — modelin orijinal eksenini WORLD eksenlerine
       *      hizalar (yatay yatış + yüz yukarı). Quaternion ile.
       *   2. fitted   — model boyutu/scale'i sığdırır.
       *
       * iconGroup yine Y ekseninde yavaşça döner; bu sırada bebek hep
       * yatay-sırtüstü pozisyonda kalır, sadece başı yavaşça yer
       * değiştirir (sweep).
       */
      const orientPivot = new THREE.Group();
      orientPivot.name = "babyOrient";

      /**
       * Quaternion bestesi — uygulama sırası (önce yapan):
       *   1. qPitch (Rx): modelin yüzünü dünya +Y'ye çevirir.
       *   2. qRoll  (Rz): vücudu yana yatırır (gerekirse).
       *   3. qYaw   (Ry): orient sonrası dünya +Y etrafında yatay
       *                   takas (baş/ayak yönlerini ters çevirir).
       *
       * Quaternion `.multiply(p)` → q*p (önce p, sonra q vektöre uygulanır)
       *   final = qYaw * qRoll * qPitch
       */
      const qPitch = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        COMPOSITION.iconPitch,
      );
      const qRoll = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        COMPOSITION.iconRoll,
      );
      const qYaw = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        COMPOSITION.iconYawOffset,
      );
      orientPivot.quaternion.copy(qYaw.multiply(qRoll).multiply(qPitch));
      iconGroup.add(orientPivot);

      const fitted = fitGLBToBox(iconModel, COMPOSITION.iconSize);
      orientPivot.add(fitted);

      /** Göbek kordonu — bebeğin karnından yukarıya, sonsuzluğa. */
      const cord = createUmbilicalCord();
      iconGroup.add(cord);

      root.add(iconGroup);
      parts.push({
        group: iconGroup,
        speed: ROTATION.composition,
        baseY: COMPOSITION.iconY,
        breatheStrength: 0.85,
      });
    }

    /** ── "HAYKO CEPKİN" — üstte, krem-amber bold ─────────────────
     *  Not: noktalı İ kullanıyoruz; gentilis fontunun sade Latin "I"
     *  glyph'i Türkçe okuyucuya "ı" gibi görünüyordu. fontPatcher
     *  İ glyph'ini I + nokta kombinasyonuyla sentezler.
     */
    const artistGroup = new THREE.Group();
    artistGroup.position.y = COMPOSITION.artistY;
    const artistMesh = buildExtrudedText("HAYKO CEPKİN", bold, {
      size: 0.72,
      depth: 0.18,
      letterSpacing: 0.22,
      bevelThickness: 0.014,
      bevelSize: 0.010,
      /** Krem-amber — kapaktaki sıcak yazı tonu. */
      color: PALETTE.cream,
      emissive: PALETTE.amber,
      emissiveIntensity: 0.35,
      roughness: 0.55,
      metalness: 0.05,
    });
    artistGroup.add(artistMesh);
    root.add(artistGroup);
    parts.push({
      group: artistGroup,
      speed: ROTATION.composition,
      baseY: COMPOSITION.artistY,
      breatheStrength: 0.5,
    });

    /** ── "BENİ BÜYÜTEN ŞARKILAR" — altta, ana başlık ─────────────── */
    const titleGroup = new THREE.Group();
    titleGroup.position.y = COMPOSITION.subtitleY;
    const titleMesh = buildExtrudedText("BENİ BÜYÜTEN ŞARKILAR", bold, {
      size: 0.62,
      depth: 0.16,
      letterSpacing: 0.18,
      bevelThickness: 0.012,
      bevelSize: 0.008,
      color: PALETTE.cream,
      emissive: PALETTE.ember,
      emissiveIntensity: 0.28,
      roughness: 0.6,
      metalness: 0.04,
    });
    titleGroup.add(titleMesh);
    root.add(titleGroup);
    parts.push({
      group: titleGroup,
      speed: ROTATION.composition,
      baseY: COMPOSITION.subtitleY,
      breatheStrength: 0.42,
    });

    /** ── "VOL.1" — başlığın altında küçük etiket ─────────────────── */
    const volGroup = new THREE.Group();
    volGroup.position.y = COMPOSITION.subtitleY - 1.35;
    const volMesh = buildExtrudedText("VOL.1", regular, {
      size: 0.42,
      depth: 0.10,
      letterSpacing: 0.36,
      bevelThickness: 0.008,
      bevelSize: 0.006,
      color: PALETTE.amber,
      emissive: PALETTE.ember,
      emissiveIntensity: 0.22,
      roughness: 0.7,
      metalness: 0.06,
    });
    volGroup.add(volMesh);
    root.add(volGroup);
    parts.push({
      group: volGroup,
      speed: ROTATION.composition,
      baseY: COMPOSITION.subtitleY - 1.35,
      breatheStrength: 0.32,
    });

    console.log("[bbs-centerPiece] hazır:", parts.length, "öğe");
  })().catch((err) => {
    console.error("[bbs-centerPiece] yüklenemedi:", err);
  });

  return {
    group: root,
    ready,
    update(time, delta) {
      for (const part of parts) {
        part.group.rotation.y += part.speed * delta;
        const breathe =
          Math.sin(time * 0.55 + part.baseY) *
          COMPOSITION.breatheAmplitude *
          part.breatheStrength;
        part.group.position.y = part.baseY + breathe;
      }
    },
  };
}
