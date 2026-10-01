import * as THREE from "three";
import { fbm, noise2, noiseNormalCanvas, smoothstep } from "../../engine/core/noise";

export const CRATER_RADIUS = 72;
export const RIM_RADIUS = 80;
export const WORLD_RADIUS = 170;

/** Arazi ağı: 560 m kare, her kalitede aynı ızgara (2 m). Yükseklik sorguları bu ağın üçgenlerini okur. */
const TERRAIN_SIZE = 560;
const TERRAIN_GRID = 280;
const CELL = TERRAIN_SIZE / TERRAIN_GRID;
const HALF = TERRAIN_SIZE / 2;
/** Kıyı uçurumu r ≈ 226'dan sonra başlar; ötesinde ağ çekilip indirilir, orada analitik alan kullanılır. */
const EXACT_RADIUS = 220;
const gridHeights = new Float32Array((TERRAIN_GRID + 1) * (TERRAIN_GRID + 1)).fill(Number.NaN);
const gridHeight = (ix: number, iz: number): number => {
  const i = ix + (TERRAIN_GRID + 1) * iz;
  let h = gridHeights[i];
  if (Number.isNaN(h)) {
    h = craterField(ix * CELL - HALF, iz * CELL - HALF);
    gridHeights[i] = h;
  }
  return h;
};

/** Kapaktaki geniş, siyah volkanik krater: yumuşak çanak, belirgin kenar, uzakta sırtlar (sürekli alan). */
function craterField(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const bowl = -13 * (1 - smoothstep(0, CRATER_RADIUS, d)) ** 1.7;
  const rim = 7.5 * Math.exp(-((d - RIM_RADIUS) ** 2) / (2 * 15 * 15));
  // Uzak sırt kapaktaki gibi alçak: başlık figürle ufuk arasında gökte kalır.
  const hills = fbm(x * 0.012, z * 0.012, 4) * 6 * smoothstep(RIM_RADIUS, RIM_RADIUS + 50, d);
  const ridge = smoothstep(WORLD_RADIUS - 10, WORLD_RADIUS + 60, d) * 22;
  const detail = fbm(x * 0.05, z * 0.05, 3) * 1.8 + noise2(x * 0.22, z * 0.22) * 0.3;
  // Kapaktaki kraterin içindeki küçük koni tümsek (REDD'in önünde, sağa yakın).
  const cone = 4.2 * Math.exp(-((x - 7) ** 2 + (z + 17) ** 2) / (2 * 8.5 * 8.5));
  return bowl + rim + hills + ridge + detail + cone - 1.2;
}

/**
 * Görünen zeminin yüksekliği: arazi ağının o noktadaki üçgeni (PlaneGeometry dizilimi; köşegen sol alttan sağ üste).
 * Herkes (oyuncu, figürler, eşyalar) çizilen yüzeye basar; sürekli alanla ağ arasındaki fark (ızgara aralığından
 * küçük tümsekler) ayakları toprağa gömüyordu.
 */
export function craterHeight(x: number, z: number): number {
  const fx = (x + HALF) / CELL;
  const fz = (z + HALF) / CELL;
  if (x * x + z * z > EXACT_RADIUS * EXACT_RADIUS || fx < 0 || fz < 0 || fx >= TERRAIN_GRID || fz >= TERRAIN_GRID) return craterField(x, z);
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const u = fx - ix;
  const v = fz - iz;
  const hb = gridHeight(ix, iz + 1);
  const hd = gridHeight(ix + 1, iz);
  if (u + v <= 1) {
    const ha = gridHeight(ix, iz);
    return ha + (hd - ha) * u + (hb - ha) * v;
  }
  const hc = gridHeight(ix + 1, iz + 1);
  return hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
}

export function createTerrain(): THREE.Mesh {
  // Düz kara parçası: içeriden kenar görünmez (sırt r 230 ufku kapatır); yukarıdan bakınca pürüzlü kıyılı,
  // uçurumlu, yassı bir ada okunur (küre değil). Izgara her kalitede aynıdır (yükseklik sorguları ona bağlı).
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_GRID, TERRAIN_GRID);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(position.count * 3);
  // Kapaktaki gibi kömür siyahı taban, yamaçlarda açık kül çizgileri.
  const deep = new THREE.Color("#101012");
  const ash = new THREE.Color("#262629");
  const rimTone = new THREE.Color("#363639");
  const color = new THREE.Color();
  for (let i = 0; i < position.count; i += 1) {
    let x = position.getX(i);
    let z = position.getZ(i);
    let d = Math.hypot(x, z);
    // Kıyı: açıya göre dalgalı bir sınır; dışındaki köşeler kıyıya çekilir ve 26 m aşağı iner (uçurum).
    const theta = Math.atan2(z, x);
    const coast = 252 + (fbm(Math.cos(theta) * 3 + 9, Math.sin(theta) * 3 + 4, 3) - 0.5) * 52;
    let drop = 0;
    if (d > coast) {
      const k = coast / d;
      x *= k;
      z *= k;
      position.setX(i, x);
      position.setZ(i, z);
      d = coast;
      drop = 26;
    }
    position.setY(i, (drop > 0 ? craterField(x, z) : craterHeight(x, z)) - drop);
    color.copy(deep).lerp(ash, fbm(x * 0.03 + 7, z * 0.03, 3));
    color.lerp(rimTone, Math.exp(-((d - RIM_RADIUS) ** 2) / 400) * 0.6);
    if (drop > 0) color.multiplyScalar(0.55);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const normalMap = new THREE.CanvasTexture(noiseNormalCanvas(256, 0.09, 5));
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(150, 150);
  normalMap.anisotropy = 8;

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.97,
    metalness: 0,
    normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  return mesh;
}

/** Yumuşak köşeli volkanik taş geometrisi (gürültüyle bozulmuş ikosahedron). */
function rockGeometry(seed: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, 2);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    v.fromBufferAttribute(position, i);
    const n = fbm(v.x * 1.4 + seed * 9, v.z * 1.4 + v.y * 1.1 + seed * 3, 3);
    v.multiplyScalar(0.75 + n * 0.55);
    v.y *= 0.62;
    position.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export interface RockField {
  group: THREE.Group;
  /** Çarpışma için büyük kayalar (x, z, yarıçap). */
  boulders: Array<{ x: number; z: number; r: number }>;
}

/** Ön planda çakıllar, krater boyunca kayalar — kapaktaki taşlı ön plan. */
/** avoid: kayaların girmeyeceği açık alanlar (başlangıç, kapak noktası, gramofon). */
export function createRocks(
  random: () => number,
  detail: number,
  avoid: ReadonlyArray<{ x: number; z: number; r: number }>,
  boulderMeshes: readonly THREE.Mesh[] = [],
): RockField {
  const group = new THREE.Group();
  const boulders: RockField["boulders"] = [];
  const material = new THREE.MeshStandardMaterial({ color: "#2b2b2e", roughness: 0.92, metalness: 0, flatShading: true });
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const pos = new THREE.Vector3();

  // Büyük kayalar: taranmış ay kayaları (birim yarıçapa ölçeklenir, dörtte biri toprağa gömülü; volkanik
  // siyaha boyanır). Model yoksa gürültülü taş kalır.
  const scanned = boulderMeshes.map((source) => {
    source.updateWorldMatrix(true, false);
    const geometry = source.geometry.clone().applyMatrix4(source.matrixWorld);
    geometry.computeBoundingBox();
    const b = geometry.boundingBox!;
    const half = Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2;
    geometry.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    geometry.scale(1 / half, 1 / half, 1 / half);
    geometry.translate(0, -0.22, 0);
    const scannedMaterial = (source.material as THREE.MeshStandardMaterial).clone();
    scannedMaterial.color.setRGB(0.13, 0.13, 0.14);
    return { geometry, material: scannedMaterial, matrices: [] as THREE.Matrix4[] };
  });
  const variants = [0, 1, 2, 3].map((seed) => rockGeometry(seed));
  const perVariant = Math.round((260 + 520 * detail) / variants.length);
  variants.forEach((geometry, v) => {
    const mesh = new THREE.InstancedMesh(geometry, material, perVariant);
    for (let i = 0; i < perVariant; i += 1) {
      const angle = random() * Math.PI * 2;
      // Çoğu taş oyuncunun dolaştığı kenar ve iç yamaçta yoğunlaşır.
      const radius = 12 + random() ** 0.8 * 130;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Büyük kayalar iç havzada (r < 44) yok: Kalpsiz Romantik'in gemileri orada yüzer ve kıyıya oturur.
      const big = random() < 0.08 && radius >= 48;
      const blocked = avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r * (big ? 1.6 : 1));
      if (blocked) {
        mesh.setMatrixAt(i, matrix.makeScale(0, 0, 0));
        continue;
      }
      const size = big ? 1.2 + random() * 2.4 : 0.12 + random() ** 2 * 0.7;
      pos.set(x, craterHeight(x, z) + size * 0.12, z);
      euler.set(random() * 0.6, random() * Math.PI * 2, random() * 0.6);
      quaternion.setFromEuler(euler);
      scale.set(size * (0.8 + random() * 0.5), size, size * (0.8 + random() * 0.5));
      matrix.compose(pos, quaternion, scale);
      if (big && scanned.length) {
        scanned[(i + v) % scanned.length].matrices.push(matrix.clone());
        mesh.setMatrixAt(i, matrix.makeScale(0, 0, 0));
        boulders.push({ x, z, r: size * 0.95 });
        continue;
      }
      mesh.setMatrixAt(i, matrix);
      if (big) boulders.push({ x, z, r: size * 0.95 });
      mesh.setColorAt(i, new THREE.Color().setScalar(0.75 + random() * 0.5));
    }
    mesh.castShadow = v < 2;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  for (const rock of scanned) {
    if (!rock.matrices.length) continue;
    const mesh = new THREE.InstancedMesh(rock.geometry, rock.material, rock.matrices.length);
    rock.matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  return { group, boulders };
}
