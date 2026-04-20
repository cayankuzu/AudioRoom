import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ASSETS, COMPOSITION, PALETTE, ROTATION } from "../config/config";
import { patchTurkishGlyphs } from "../utils/fontPatcher";

/**
 * Merkez kompozisyon — üstten alta:
 *   1. İkon (albüm kapağı: smiley + ip) bir 2 yüzlü panele yapıştırılmış
 *   2. "KUANTUM DOLANIKLIĞI" — ekstrude 3B yazı, sarı
 *   3. "HENRY THE LEE"        — ekstrude 3B yazı, sönük krem-sarı
 *
 * Hepsi kendi Y eksenlerinde aynı yöne, aynı hızla döner. Mukemmel
 * Boşluk'taki "compositionGroup" davranışına benzer — fakat burada her
 * eleman kendi alt grubunda, böylece konumsal layout (Y) korunurken
 * sadece eksenel rotasyon uygulanır.
 */

export interface CenterPieceHandle {
  group: THREE.Group;
  /** Yükleme tamamlandığında çözümlenir; layout için collider eklemek gibi
   *  şeyler yapılacaksa bekleyebilirsiniz. */
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
 * Yüklenen GLB modelini `targetSize` küpüne sığdırır + merkeze hizalar.
 * Model orijinal koordinatlarda nerede olursa olsun, ortaya getirilir.
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

  /** Önce merkeze çek, sonra ölçeklendir. Wrapper grubunda scale ile
   *  uygula — model alt-mesh transform'ları korunsun. */
  model.position.sub(center);
  wrapper.scale.setScalar(scale);

  /**
   * Tüm meshlere derin mat siyah malzeme ata — kullanıcı isteği:
   * "ikon siyah olmalı". Orijinal doku (altın/sarı) burada bilinçli olarak
   * üzerine yazılır; sarı kutu içinde net silüet veriyor.
   */
  const blackMat = new THREE.MeshStandardMaterial({
    color: PALETTE.inkBlack,
    roughness: 0.85,
    metalness: 0.05,
    emissive: new THREE.Color("#000000"),
    emissiveIntensity: 0,
  });
  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.material = blackMat;
      obj.castShadow = false;
      obj.receiveShadow = false;
    }
  });

  return wrapper;
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

  /** Kompozisyonu X/Y merkezine hizala. */
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
  root.name = "kd-center";
  scene.add(root);

  const parts: SpinPart[] = [];

  /** İlk başta görünür placeholder yok; yükleme sonrası eklenir. */
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

    /** ── GLB ikon ──────────────────────────────────────────────── */
    if (iconModel) {
      const iconGroup = new THREE.Group();
      iconGroup.position.y = COMPOSITION.iconY;
      const fitted = fitGLBToBox(iconModel, COMPOSITION.iconSize);
      /**
       * Modelin lokal Y dönüşü — kullanıcı "albümü Y ekseninde 180° çevir,
       * şuan ters duruyor" dedi. Spinning grup zaten Y'de süzülüyor;
       * bu, modelin **lokal frame** ofseti — başlangıç pozunda doğru
       * yüze bakar, sonra normal döner.
       */
      fitted.rotation.y = COMPOSITION.iconYawOffset;
      iconGroup.add(fitted);
      root.add(iconGroup);
      parts.push({
        group: iconGroup,
        speed: ROTATION.composition,
        baseY: COMPOSITION.iconY,
        breatheStrength: 0.6,
      });
    }

    /** ── "KUANTUM DOLANIKLIĞI" ─────────────────────────────────── */
    const titleGroup = new THREE.Group();
    titleGroup.position.y = COMPOSITION.titleY;
    const titleMesh = buildExtrudedText("KUANTUM DOLANIKLIK", bold, {
      size: 0.84,
      depth: 0.22,
      letterSpacing: 0.20,
      bevelThickness: 0.018,
      bevelSize: 0.012,
      /** Mat ink black — kapaktaki ip ve smiley tonu, klasik sarı+siyah
       *  magazin / Penguin kapak estetiği. */
      color: PALETTE.inkBlack,
      emissive: "#000000",
      emissiveIntensity: 0,
      roughness: 0.78,
      metalness: 0.04,
    });
    titleGroup.add(titleMesh);
    root.add(titleGroup);
    parts.push({
      group: titleGroup,
      speed: ROTATION.composition,
      baseY: COMPOSITION.titleY,
      breatheStrength: 0.5,
    });

    /** ── "HENRY THE LEE" ───────────────────────────────────────── */
    const artistGroup = new THREE.Group();
    artistGroup.position.y = COMPOSITION.artistY;
    const artistMesh = buildExtrudedText("HENRY THE LEE", regular, {
      size: 0.55,
      depth: 0.14,
      letterSpacing: 0.26,
      bevelThickness: 0.010,
      bevelSize: 0.007,
      /** Koyu kahve — başlığın siyahıyla hiyerarşi (büyük: siyah,
       *  küçük: koyu kahve). Sarı zemine kontrast. */
      color: "#1a1208",
      emissive: "#000000",
      emissiveIntensity: 0,
      roughness: 0.85,
      metalness: 0.02,
    });
    artistGroup.add(artistMesh);
    root.add(artistGroup);
    parts.push({
      group: artistGroup,
      speed: ROTATION.composition,
      baseY: COMPOSITION.artistY,
      breatheStrength: 0.35,
    });

    console.log("[centerPiece] hazır:", parts.length, "öğe");
  })().catch((err) => {
    console.error("[centerPiece] yüklenemedi:", err);
  });

  return {
    group: root,
    ready,
    update(time, delta) {
      for (const part of parts) {
        part.group.rotation.y += part.speed * delta;
        const breathe =
          Math.sin(time * 0.5 + part.baseY) *
          COMPOSITION.breatheAmplitude *
          part.breatheStrength;
        part.group.position.y = part.baseY + breathe;
      }
    },
  };
}
