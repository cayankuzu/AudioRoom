import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import type { SphereCollider } from "../types";
import { COMPOSITION, WORLD } from "../config/config";
import { patchTurkishGlyphs } from "../utils/fontPatcher";
import { LAYER } from "../scene/layers";

export interface Text3DHandle {
  titleGroup: THREE.Group;
  bandNameGroup: THREE.Group;
  colliders: SphereCollider[];
  update(time: number, delta: number): void;
}

const FONT_REGULAR_URL = `${import.meta.env.BASE_URL}assets/fonts/gentilis_regular.typeface.json`;
const FONT_BOLD_URL = `${import.meta.env.BASE_URL}assets/fonts/gentilis_bold.typeface.json`;

interface TextStyle {
  size: number;
  depth: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
  bevelSegments: number;
  curveSegments: number;
  letterSpacing: number;
  color: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
}

/**
 * Albüm kapağıyla birebir tipografik hedef:
 *  - "MÜKEMMEL BOŞLUK" → saf beyaz, ince (regular) serif, çok geniş harf
 *    aralığı, mat yüzey (minimum metalness/emissive).
 *  - "REDD" → kanlı kırmızı, biraz daha kalın (bold), yine çok geniş aralık,
 *    başlıktan küçük.
 *  - Her iki yazı da çok hafif extrude + çok ince bevel → hacimli ama
 *    kapaktaki düz baskı hissine yakın.
 */
const TITLE_STYLE: TextStyle = {
  size: 1.25,
  depth: 0.22,
  bevelEnabled: true,
  bevelThickness: 0.012,
  bevelSize: 0.008,
  bevelSegments: 2,
  curveSegments: 10,
  /** Kapaktaki uzatılmış geniş aralık. */
  letterSpacing: 0.55,
  /** SİYAH başlık — "MÜKEMMEL BOŞLUK". Bevel + ışık silüeti koruyor. */
  color: "#060608",
  emissive: "#000000",
  emissiveIntensity: 0,
  roughness: 0.58,
  metalness: 0.1,
};

const BAND_STYLE: TextStyle = {
  size: 0.82,
  depth: 0.24,
  bevelEnabled: true,
  bevelThickness: 0.014,
  bevelSize: 0.01,
  bevelSegments: 2,
  curveSegments: 10,
  letterSpacing: 0.78,
  color: "#c41018",
  emissive: "#7a0a10",
  emissiveIntensity: 0.28,
  roughness: 0.5,
  metalness: 0.06,
};

/**
 * Tek karakter → TextGeometry → merkezlenmiş Mesh.
 * Harfler tek tek üretilir: her harfin kendi genişliğini bounding-box ile
 * ölçüp gerçek `letterSpacing` ve soldan-sağa yerleşim uygulayabiliyoruz.
 * Bu, typeface-json'un `ha` (horizontal advance) değeri ile uyumlu, sentezlenen
 * Ş/ş glyph'inde de tutarlı sonuç verir.
 */
function buildTextMesh(text: string, font: Font, style: TextStyle): THREE.Mesh {
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
      cursor += style.size * 0.55;
      continue;
    }
    const geometry = new TextGeometry(ch, {
      font,
      size: style.size,
      depth: style.depth,
      bevelEnabled: style.bevelEnabled,
      bevelThickness: style.bevelThickness,
      bevelSize: style.bevelSize,
      bevelSegments: style.bevelSegments,
      curveSegments: style.curveSegments,
    });
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    const bbox = geometry.boundingBox;
    if (!bbox) continue;
    const width = bbox.max.x - bbox.min.x;
    /** Glyph origin-based → kendi baseline'ında bırak, Y sadece ortalanır. */
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.layers.enable(LAYER.TEXT);
    mesh.position.x = cursor - bbox.min.x;
    group.add(mesh);
    cursor += width + style.letterSpacing;
  }

  /** Kompozisyonu X/Y merkezine hizala. */
  const bounds = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const center = new THREE.Vector3();
  bounds.getCenter(center);

  const merged = new THREE.Group();
  merged.add(group);
  group.position.set(-center.x, -bounds.min.y, -center.z);

  /** Wrapper mesh-lookalike: dönen referansı `Mesh` gibi kullanabilelim diye
   *  bir proxy mesh yaratıyoruz. Gerçek render alt düğümlerde. */
  const proxyGeometry = new THREE.BufferGeometry();
  const proxy = new THREE.Mesh(proxyGeometry, material);
  proxy.add(merged);
  proxy.userData.textSize = { width: size.x, height: size.y, depth: size.z };
  proxy.layers.enable(LAYER.TEXT);
  return proxy;
}

function loadFontAsync(url: string): Promise<Font> {
  const loader = new FontLoader();
  return new Promise((resolve, reject) => {
    loader.load(url, (font) => resolve(font), undefined, (err) => reject(err));
  });
}

/**
 * "MÜKEMMEL BOŞLUK" ve "REDD" — gerçek 3D `TextGeometry` mesh'leri
 * (ExtrudeGeometry tabanlı). Her iki yazı da `compositionGroup`'un
 * çocuğudur; self-rotation YOK.
 *
 * - Türkçe karakterler `patchTurkishGlyphs` ile garantiye alınır.
 * - Hacimli extrude + hafif bevel → her açıdan görünür silüet.
 * - `TEXT_LAYER` (1) aktif → dedicated text-fill ışık bu yazılara daha
 *   fazla etki eder; figür silüeti bozulmaz.
 * - Placeholder (flat text) yüklenene kadar kullanıcıya sahne boş görünmesin.
 */
export function createText3D(
  compositionGroup: THREE.Group,
  getHeightAt: (x: number, z: number) => number,
): Text3DHandle {
  void getHeightAt;

  const titleGroup = new THREE.Group();
  titleGroup.name = "titleGroup";
  titleGroup.position.y = COMPOSITION.titleExtraY;
  compositionGroup.add(titleGroup);

  const bandNameGroup = new THREE.Group();
  bandNameGroup.name = "bandNameGroup";
  bandNameGroup.position.y = COMPOSITION.artistExtraY;
  compositionGroup.add(bandNameGroup);

  /** Yazı yüklenirken collider yok. Yüklendiğinde eklenecek. */
  const colliders: SphereCollider[] = [];

  /** Async font yükleme — hata olursa konsola düş, sahne çalışmaya devam etsin. */
  Promise.all([loadFontAsync(FONT_BOLD_URL), loadFontAsync(FONT_REGULAR_URL)])
    .then(([bold, regular]) => {
      patchTurkishGlyphs(bold);
      patchTurkishGlyphs(regular);

      /**
       * Başlık `regular` font'ta — kapaktaki ince/zarif tipografi hissine
       * uygun. "REDD" ise `bold` ile — kanlı kırmızı rengiyle birlikte
       * daha fiziksel, daha oturaklı.
       */
      const titleMesh = buildTextMesh("MÜKEMMEL BOŞLUK", regular, TITLE_STYLE);
      const bandMesh = buildTextMesh("REDD", bold, BAND_STYLE);

      /**
       * `textSize.width` mesh'in toplam genişliği — onu oyuncu
       * başlangıç yönünün SAĞ-SOL ekseninde konumlandırıyoruz.
       * Yazılar Z=0, X=0'a hizalanır (composition merkezi).
       */
      titleGroup.add(titleMesh);
      bandNameGroup.add(bandMesh);

      /** Collider: yazı bloklarına yaklaşık kürelerle çarpışma. */
      const craterCenter = new THREE.Vector3(
        WORLD.craterCenter.x,
        COMPOSITION.titleExtraY,
        WORLD.craterCenter.z,
      );
      const titleSize = (titleMesh.userData as { textSize: { width: number } }).textSize;
      const bandSize = (bandMesh.userData as { textSize: { width: number } }).textSize;
      /** Basit — tek merkezli çarpışma, tüm yazı bloğunu kapsar. */
      colliders.push({
        center: craterCenter.clone(),
        radius: Math.max(4, titleSize.width * 0.5),
      });
      colliders.push({
        center: new THREE.Vector3(
          WORLD.craterCenter.x,
          COMPOSITION.artistExtraY,
          WORLD.craterCenter.z,
        ),
        radius: Math.max(2.2, bandSize.width * 0.5),
      });
      console.log("[Text3D] gerçek 3D yazılar yüklendi", {
        title: titleSize,
        band: bandSize,
      });
    })
    .catch((err: unknown) => {
      console.error("[Text3D] font yüklenemedi:", err);
    });

  return {
    titleGroup,
    bandNameGroup,
    colliders,
    /**
     * Yazılar compositionGroup ile birlikte döner. Self-rotation yok.
     * Hafif idle breathing — okunurluğu bozmayacak kadar.
     */
    update(time) {
      const breathe = Math.sin(time * 0.22) * 0.012;
      titleGroup.position.y = COMPOSITION.titleExtraY + breathe;
      bandNameGroup.position.y = COMPOSITION.artistExtraY + breathe * 0.6;
    },
  };
}
