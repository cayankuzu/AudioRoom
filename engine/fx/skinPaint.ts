import * as THREE from "three";

/**
 * Dokulu insan figürünün kıyafetine boyama: figürün kendi doku kopyasına (tuval) çizilir; leke kumaşın üstünde
 * durur, gövdeyle birlikte eğilir ve her açıdan doğru görünür (sprite ya da yüzen küre değil).
 *
 * Gövde noktaları bağlama duruşunda (T duruşu) bulunur: boy kesri → ön yüzdeki en yakın köşeler → doku pikseli.
 * Doku adalarının yönü modele göre değiştiğinden UV'de kaydırma yapılmaz; her nokta ayrı örneklenir.
 */
export interface SkinSample {
  /** Doku pikseli. */
  x: number;
  y: number;
  /** En yakın gövde köşesi (o anki duruşta dünya konumu `vertexWorld` ile okunur). */
  vertex: number;
}

export interface SkinPainter {
  /** Gövde ağı ve dokusu bulundu mu (figürün kıyafeti yüklenince true olur). */
  readonly ready: boolean;
  /** Gövde malzemesi (figüre özel kopya): rengi/saydamlığı figür başına ayarlanabilir. */
  readonly material: THREE.MeshStandardMaterial | null;
  /** Malzemenin ilk rengi. */
  readonly baseColor: THREE.Color;
  /** Gövdenin önünde bir metrenin doku pikseli karşılığı. */
  readonly metre: number;
  /** Hazır değilse bağlanmayı dener; hazırsa true. */
  prepare(): boolean;
  /** Gövdenin ön yüzünde nokta: fx figürün soluna doğru (boyun kesri), fy yerden yukarı (boyun kesri, 0.47–0.86). */
  sample(fx: number, fy: number): SkinSample | null;
  /** Dokuyu yeniden boyar: önce temiz kıyafet, sonra `draw`. null: temiz kıyafete döner. */
  paint(draw: ((g: CanvasRenderingContext2D, width: number, height: number) => void) | null): void;
  /** Köşenin o anki duruştaki dünya konumu. */
  vertexWorld(vertex: number, out: THREE.Vector3): THREE.Vector3;
}

export function createSkinPainter(group: THREE.Object3D): SkinPainter {
  let mesh: THREE.SkinnedMesh | null = null;
  let material: THREE.MeshStandardMaterial | null = null;
  let original: THREE.Texture | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let context: CanvasRenderingContext2D | null = null;
  let texture: THREE.CanvasTexture | null = null;
  let front: number[] = [];
  let unit = 1;
  let minY = 0;
  let metre = 600;
  const baseColor = new THREE.Color(1, 1, 1);

  const painter: SkinPainter = {
    get ready() {
      return mesh !== null;
    },
    get material() {
      return material;
    },
    baseColor,
    get metre() {
      return metre;
    },
    prepare() {
      if (mesh) return true;
      let found: THREE.SkinnedMesh | null = null;
      group.traverse((child) => {
        const m = child as THREE.SkinnedMesh;
        if (m.isSkinnedMesh && !Array.isArray(m.material) && /Superhero/.test((m.material as THREE.Material).name ?? "")) found = m;
      });
      const body = found as THREE.SkinnedMesh | null;
      if (!body) return false;
      const bodyMaterial = body.material as THREE.MeshStandardMaterial;
      const image = bodyMaterial.map?.image as (HTMLImageElement & { complete?: boolean }) | undefined;
      const pos = body.geometry.attributes.position as THREE.BufferAttribute | undefined;
      if (!bodyMaterial.map || !image || !image.width || image.complete === false || !pos || !body.geometry.attributes.uv) return false;
      if (!body.geometry.boundingBox) body.geometry.computeBoundingBox();
      const box = body.geometry.boundingBox!;
      unit = box.max.y - box.min.y;
      minY = box.min.y;
      // T duruşunda kollar yanda: göğüs–karın önü engelsiz. Ön yüz +z.
      front = [];
      for (let i = 0; i < pos.count; i += 1) {
        if (pos.getZ(i) <= 0) continue;
        const fy = (pos.getY(i) - minY) / unit;
        if (fy < 0.47 || fy > 0.86 || Math.abs(pos.getX(i)) / unit > 0.13) continue;
        front.push(i);
      }
      if (front.length < 12) return false;
      canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      context = canvas.getContext("2d");
      if (!context) return false;
      texture = new THREE.CanvasTexture(canvas);
      texture.flipY = false;
      texture.colorSpace = bodyMaterial.map.colorSpace;
      texture.wrapS = bodyMaterial.map.wrapS;
      texture.wrapT = bodyMaterial.map.wrapT;
      texture.anisotropy = 4;
      mesh = body;
      material = bodyMaterial;
      original = bodyMaterial.map;
      baseColor.copy(bodyMaterial.color);
      // Doku ölçeği: boyun %5'i kaç piksel (model boyu 1,85 m).
      const a = painter.sample(0, 0.7);
      const b = painter.sample(0, 0.65);
      if (a && b) metre = Math.max(200, Math.hypot(a.x - b.x, a.y - b.y) / 0.05) / 1.85;
      return true;
    },
    sample(fx, fy) {
      if (!mesh || !canvas) return null;
      const pos = mesh.geometry.attributes.position as THREE.BufferAttribute;
      const uv = mesh.geometry.attributes.uv as THREE.BufferAttribute;
      const best = [-1, -1, -1];
      const dist = [1e9, 1e9, 1e9];
      for (const i of front) {
        const dx = pos.getX(i) / unit - fx;
        const dy = (pos.getY(i) - minY) / unit - fy;
        const d = dx * dx + dy * dy;
        if (d < dist[0]) {
          best[2] = best[1];
          dist[2] = dist[1];
          best[1] = best[0];
          dist[1] = dist[0];
          best[0] = i;
          dist[0] = d;
        } else if (d < dist[1]) {
          best[2] = best[1];
          dist[2] = dist[1];
          best[1] = i;
          dist[1] = d;
        } else if (d < dist[2]) {
          best[2] = i;
          dist[2] = d;
        }
      }
      const u0 = uv.getX(best[0]);
      const v0 = uv.getY(best[0]);
      let u = 0;
      let v = 0;
      let w = 0;
      for (let k = 0; k < 3; k += 1) {
        if (best[k] < 0) continue;
        const ui = uv.getX(best[k]);
        const vi = uv.getY(best[k]);
        // Başka bir doku adasına düşen köşe karışmaz.
        if (Math.hypot(ui - u0, vi - v0) > 0.04) continue;
        const wk = 1 / (Math.sqrt(dist[k]) + 1e-4);
        u += ui * wk;
        v += vi * wk;
        w += wk;
      }
      return { x: (u / w) * canvas.width, y: (v / w) * canvas.height, vertex: best[0] };
    },
    paint(draw) {
      if (!material || !original || !texture || !context || !canvas) return;
      if (!draw) {
        if (material.map !== original) material.map = original;
        return;
      }
      if (material.map !== texture) material.map = texture;
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
      context.drawImage(original.image as CanvasImageSource, 0, 0);
      draw(context, canvas.width, canvas.height);
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
      texture.needsUpdate = true;
    },
    vertexWorld(vertex, out) {
      if (!mesh) return group.getWorldPosition(out);
      group.updateMatrixWorld(true);
      mesh.getVertexPosition(vertex, out);
      return mesh.localToWorld(out);
    },
  };
  return painter;
}
