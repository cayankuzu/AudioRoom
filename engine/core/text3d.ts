import * as THREE from "three";
import { FontLoader, type Font } from "three/addons/loaders/FontLoader.js";
import { assetUrl } from "./assets";

/**
 * Hacimli (ekstrüde) 3D yazı: her açıdan katı bir nesne olarak görünür, arkadan
 * bakınca kaybolmaz. Yazı tipleri derlemede typeface JSON'a çevrilir
 * (scripts/build-fonts.mjs); Türkçe glifler içerir.
 */
export interface Text3DOptions {
  /** public/fonts altındaki ad (ör. "cinzel-400"). */
  font: string;
  size: number;
  /** Harf kalınlığı (metre). Varsayılan: boyutun %12'si. */
  depth?: number;
  color?: THREE.ColorRepresentation;
  /** Yan yüz rengi; verilmezse ana rengin koyusu. */
  sideColor?: THREE.ColorRepresentation;
  emissive?: number;
  /** Harf arası, boyuta oranla (0.5 = yarım harf). */
  letterSpacing?: number;
  lineHeight?: number;
  align?: "left" | "center";
  anchorY?: "top" | "middle" | "bottom";
  bevel?: boolean;
  roughness?: number;
  metalness?: number;
  fog?: boolean;
}

const fonts = new Map<string, Promise<Font>>();

export function loadFont(name: string): Promise<Font> {
  let font = fonts.get(name);
  if (!font) {
    font = new FontLoader().loadAsync(assetUrl(`fonts/${name}.typeface.json`));
    fonts.set(name, font);
  }
  return font;
}

/** Tek bir satırı harf harf dizer: harf aralığını ve Türkçe glifleri doğru hesaplar. */
function lineShapes(font: Font, text: string, size: number, spacing: number): { shapes: THREE.Shape[]; width: number } {
  const data = font.data as unknown as { resolution: number; glyphs: Record<string, { ha: number }> };
  const scale = size / data.resolution;
  const shapes: THREE.Shape[] = [];
  let x = 0;
  const chars = [...text];
  chars.forEach((char, i) => {
    const glyph = data.glyphs[char] ?? data.glyphs["?"];
    if (char !== " ") {
      for (const shape of font.generateShapes(char, size)) {
        // Bazı yazı tiplerinde boş ya da alansız delikler var; üçgenlemeyi çökertir.
        shape.holes = shape.holes.filter(usable);
        if (!usable(shape)) continue;
        // Harfi satırdaki yerine kaydır (eğri noktaları harfe özeldir, paylaşılmaz).
        for (const curve of shape.curves) translateCurve(curve, x, 0);
        for (const hole of shape.holes) for (const curve of hole.curves) translateCurve(curve, x, 0);
        shapes.push(shape);
      }
    }
    x += (glyph ? glyph.ha * scale : size * 0.5) + (i < chars.length - 1 ? spacing * size : 0);
  });
  return { shapes, width: x };
}

function usable(path: THREE.Path): boolean {
  const points = path.getPoints(2);
  return points.length >= 3 && Math.abs(THREE.ShapeUtils.area(points)) > 1e-6;
}

function translateCurve(curve: THREE.Curve<THREE.Vector2>, dx: number, dy: number): void {
  const points = Object.values(curve).filter((value): value is THREE.Vector2 => value instanceof THREE.Vector2);
  for (const point of points) {
    point.x += dx;
    point.y += dy;
  }
}

export async function createText3D(text: string, options: Text3DOptions): Promise<THREE.Mesh> {
  const font = await loadFont(options.font);
  const size = options.size;
  const spacing = options.letterSpacing ?? 0;
  const lineHeight = (options.lineHeight ?? 1.15) * size;
  const lines = text.split("\n");
  const all: THREE.Shape[] = [];
  lines.forEach((line, row) => {
    const { shapes, width } = lineShapes(font, line, size, spacing);
    const offsetX = options.align === "left" ? 0 : -width / 2;
    const offsetY = -row * lineHeight;
    for (const shape of shapes) {
      for (const curve of shape.curves) translateCurve(curve, offsetX, offsetY);
      for (const hole of shape.holes) for (const curve of hole.curves) translateCurve(curve, offsetX, offsetY);
      all.push(shape);
    }
  });

  const depth = options.depth ?? size * 0.12;
  const bevel = options.bevel ?? true;
  const geometry = new THREE.ExtrudeGeometry(all, {
    depth,
    curveSegments: 5,
    bevelEnabled: bevel,
    bevelThickness: depth * 0.18,
    bevelSize: size * 0.012,
    bevelSegments: 2,
  });
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const y = options.anchorY === "bottom" ? -box.min.y : options.anchorY === "top" ? -box.max.y : -(box.min.y + box.max.y) / 2;
  geometry.translate(0, y, -(box.min.z + box.max.z) / 2);
  sanitizeNormals(geometry);

  const color = new THREE.Color(options.color ?? "#ffffff");
  const face = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.55,
    metalness: options.metalness ?? 0,
    emissive: color,
    emissiveIntensity: options.emissive ?? 0,
    fog: options.fog ?? true,
  });
  const side = face.clone();
  side.color = new THREE.Color(options.sideColor ?? color.clone().multiplyScalar(0.55));
  side.emissiveIntensity = (options.emissive ?? 0) * 0.35;
  const mesh = new THREE.Mesh(geometry, [face, side]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Ekstrüzyon, harf kıvrımlarında sıfır alanlı üçgenler üretebilir; normalleri (0,0,0)
 * olur ve shader'da normalize edilince NaN'a döner. Tek bir NaN piksel bile parlama
 * efektiyle bütün ekranı karartır. Bu yüzden boş normaller güvenli bir yöne çevrilir.
 */
export function sanitizeNormals(geometry: THREE.BufferGeometry): void {
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;
  if (!normals) return;
  for (let i = 0; i < normals.count; i += 1) {
    const x = normals.getX(i);
    const y = normals.getY(i);
    const z = normals.getZ(i);
    const length = Math.hypot(x, y, z);
    if (!(length > 1e-6) || !Number.isFinite(length)) normals.setXYZ(i, 0, 0, 1);
    else if (Math.abs(length - 1) > 1e-3) normals.setXYZ(i, x / length, y / length, z / length);
  }
  normals.needsUpdate = true;
}
