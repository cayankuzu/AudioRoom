import * as THREE from "three";

/**
 * Kayalar için prosedürel normal + roughness dokuları.
 *
 * Amaç: ucuz InstancedMesh geometrilerini ("Ico/Dodeca") keskin çatlak,
 * mikro gözenek ve büyük-ölçekli yüzey varyasyonu sahibi "gerçek" bir
 * volkanik kayaya dönüştürmek. Tek doku, tüm kaya katmanlarıyla paylaşılır.
 */

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise(x: number, y: number, freq: number): number {
  const fx = x * freq;
  const fy = y * freq;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  const rx = fx - ix;
  const ry = fy - iy;
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  const u = rx * rx * (3 - 2 * rx);
  const v = ry * ry * (3 - 2 * ry);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/**
 * Keskin kırık hissi için "worley-benzeri" mesafe noise — jitterli bir
 * Voronoi'nin en yakın nokta mesafesi. Sonuç, kayanın küçük çatlak
 * paternleri ve keskin kenar yüzeylerini taklit eder.
 */
function worley(x: number, y: number, freq: number): number {
  const fx = x * freq;
  const fy = y * freq;
  const ix = Math.floor(fx);
  const iy = Math.floor(fy);
  let minD = 1.0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const cx = ix + dx;
      const cy = iy + dy;
      const jx = cx + hash2(cx, cy);
      const jy = cy + hash2(cx + 31, cy + 17);
      const ddx = fx - jx;
      const ddy = fy - jy;
      const d = Math.sqrt(ddx * ddx + ddy * ddy);
      if (d < minD) minD = d;
    }
  }
  return Math.min(1, minD);
}

export interface RockMaps {
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * Tek seferlik üretim — tüm kaya materyalleri aynı doku setini paylaşır.
 * Farklı katmanlar için `repeat` ayarı materyal düzeyinde yapılır.
 */
let cached: RockMaps | null = null;

export function createRockMaps(size = 512): RockMaps {
  if (cached) return cached;

  const nCanvas = document.createElement("canvas");
  nCanvas.width = size;
  nCanvas.height = size;
  const nctx = nCanvas.getContext("2d");
  if (!nctx) throw new Error("2D context yok");
  const nImg = nctx.createImageData(size, size);
  const nData = nImg.data;

  const rCanvas = document.createElement("canvas");
  rCanvas.width = size;
  rCanvas.height = size;
  const rctx = rCanvas.getContext("2d");
  if (!rctx) throw new Error("2D context yok");
  const rImg = rctx.createImageData(size, size);
  const rData = rImg.data;

  function heightAt(fx: number, fy: number): number {
    /**
     * Multi-ölçek karışım:
     *  - worley: keskin kırık / çatlak kenarları (en güçlü sinyal)
     *  - mid fbm: ana kütle dalgalılığı
     *  - micro: yüzey granülü / mikro gözenek
     */
    const crack = 1 - worley(fx, fy, 14);
    const sharpCrack = Math.pow(crack, 2.4) * 0.55;
    const blockCrack = Math.pow(1 - worley(fx * 0.5, fy * 0.5, 7), 2) * 0.28;
    const mid =
      vnoise(fx, fy, 8) * 0.3 +
      vnoise(fx, fy, 22) * 0.22 +
      vnoise(fx, fy, 55) * 0.12;
    const micro = vnoise(fx, fy, 180) * 0.18 + vnoise(fx, fy, 420) * 0.1;
    return sharpCrack + blockCrack + mid + micro;
  }

  const step = 1 / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const fx = x / size;
      const fy = y / size;

      const h = heightAt(fx, fy);
      const dx = h - heightAt(fx + step, fy);
      const dy = h - heightAt(fx, fy + step);
      /** Güçlü tangent-space eğim — kayalarda detay belirgin görünsün. */
      const nx = THREE.MathUtils.clamp(128 + dx * 3400, 0, 255);
      const ny = THREE.MathUtils.clamp(128 + dy * 3400, 0, 255);
      nData[i] = nx;
      nData[i + 1] = ny;
      nData[i + 2] = 255;
      nData[i + 3] = 255;

      /**
       * Roughness — yüksek crack alanları ve mikro çatlaklar hafif daha mat,
       * düz yüzey parçaları ise belirgin şekilde daha parlak (belirgin bir
       * "polished" spot oluşur). Bu varyasyon ışığı yakaladıkça kayaya
       * hayat verir.
       */
      const crack = 1 - worley(fx, fy, 14);
      const polish = vnoise(fx, fy, 3) * 0.55 + vnoise(fx, fy, 10) * 0.35;
      const r = THREE.MathUtils.clamp(
        0.62 + crack * 0.22 - polish * 0.32,
        0.32,
        1,
      );
      const v = Math.floor(r * 255);
      rData[i] = v;
      rData[i + 1] = v;
      rData[i + 2] = v;
      rData[i + 3] = 255;
    }
  }
  nctx.putImageData(nImg, 0, 0);
  rctx.putImageData(rImg, 0, 0);

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.anisotropy = 8;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.anisotropy = 8;

  cached = { normalMap, roughnessMap };
  return cached;
}

/**
 * Bir ico/dodeca benzeri geometriyi, gerçek volkanik parçalara benzesin
 * diye vertex düzeyinde keskin şekilde deforme eder.
 *
 * Girdi geometriyi KLONLAR; orijinal dokunulmaz (InstancedMesh paylaşımı
 * bozulmaz). Her çağrı, farklı bir seed ile farklı bir "parça" üretir.
 */
export function shatterGeometry(
  source: THREE.BufferGeometry,
  seed: number,
  strength: number,
  cuts = 2,
): THREE.BufferGeometry {
  const geo = source.clone();
  const pos = geo.attributes.position as THREE.BufferAttribute;

  /** Seedlenmiş rastgele (mulberry32 benzeri, lokalleştirilmiş). */
  let t = (seed | 0) >>> 0;
  const rnd = () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };

  /** Bir kaç rastgele düzlem — vertexleri o yöne "kırp" (keskin facet). */
  interface Plane {
    nx: number;
    ny: number;
    nz: number;
    d: number;
    shove: number;
  }
  const planes: Plane[] = [];
  for (let i = 0; i < cuts; i += 1) {
    const a = rnd() * Math.PI * 2;
    const b = Math.acos(rnd() * 2 - 1);
    const nx = Math.sin(b) * Math.cos(a);
    const ny = Math.cos(b);
    const nz = Math.sin(b) * Math.sin(a);
    planes.push({
      nx,
      ny,
      nz,
      d: (rnd() - 0.5) * 0.35,
      shove: (0.08 + rnd() * 0.22) * strength,
    });
  }

  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    v.fromBufferAttribute(pos, i);

    /** Vertex bazlı mikro jitter — her kaya farklı pürüzlü görünsün. */
    const jx = (rnd() - 0.5) * 0.08 * strength;
    const jy = (rnd() - 0.5) * 0.08 * strength;
    const jz = (rnd() - 0.5) * 0.08 * strength;
    v.x += jx;
    v.y += jy;
    v.z += jz;

    /** Düzlemlerin artı tarafındaki vertexleri biraz içe/dışa iter — keskin facet etkisi. */
    for (const p of planes) {
      const side = v.x * p.nx + v.y * p.ny + v.z * p.nz - p.d;
      if (side > 0) {
        v.x -= p.nx * p.shove;
        v.y -= p.ny * p.shove;
        v.z -= p.nz * p.shove;
      }
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}
