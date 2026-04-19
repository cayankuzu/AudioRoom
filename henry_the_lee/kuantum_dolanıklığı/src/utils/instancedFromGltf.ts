import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/** InstancedMesh statik vertex shader kullanır; skinning/morph açık kalırsa bozulur veya siyah ekran olur. */
function sanitizeForInstancing(m: THREE.Material): THREE.Material {
  const mat = m.clone() as THREE.MeshStandardMaterial;
  mat.skinning = false;
  mat.morphTargets = false;
  mat.morphNormals = false;
  /** Bazı Meshy GLB'leri transmission ile gelir; InstancedMesh + bazı sürücülerde shader/context sorunu çıkar. */
  const anyMat = mat as THREE.MeshPhysicalMaterial;
  if (typeof anyMat.transmission === "number" && anyMat.transmission > 0) {
    anyMat.transmission = 0;
  }
  return mat;
}

/** Çoklu materyal için geometry.groups zorunlu; yoksa tek materyale düşer. */
function pickInstancedMaterials(
  baked: THREE.BufferGeometry,
  materials: THREE.Material[],
): THREE.Material | THREE.Material[] {
  if (materials.length <= 1) return materials[0]!;
  const groups = baked.groups;
  const ok =
    groups.length > 0 &&
    groups.every((g) => g.materialIndex >= 0 && g.materialIndex < materials.length);
  return ok ? materials : materials[0]!;
}

export function loadGltfScene(url: string): Promise<THREE.Group> {
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

export interface InstancedPart {
  mesh: THREE.InstancedMesh;
  /** Sahneden kaldırılmadan önce dispose edilecek klon geometri. */
  disposeGeometry: () => void;
}

/**
 * GLB kökü altındaki her `Mesh` için ayrı `InstancedMesh` üretir (malzeme
 * korunur). Geometri, kökün lokal uzayında “fırınlanmış” matrisle klonlanır.
 */
export function buildInstancedParts(
  root: THREE.Object3D,
  instanceCount: number,
): InstancedPart[] {
  root.updateMatrixWorld(true);
  const invRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const tmp = new THREE.Matrix4();
  const parts: InstancedPart[] = [];

  root.traverse((child) => {
    if (!(child as THREE.Mesh).isMesh) return;
    /** SkinnedMesh da `isMesh`; instancing + applyMatrix4 kemikli geometride kırılır. */
    if ((child as THREE.SkinnedMesh).isSkinnedMesh) return;
    const mesh = child as THREE.Mesh;
    const geom = mesh.geometry;
    if (!geom.getAttribute("position")) return;

    tmp.multiplyMatrices(invRoot, mesh.matrixWorld);
    const baked = geom.clone();
    baked.applyMatrix4(tmp);
    if (baked.getAttribute("normal")) baked.computeVertexNormals();

    const mat = mesh.material;
    const srcMats = Array.isArray(mat) ? mat : [mat];
    const materials = srcMats.map((m) => sanitizeForInstancing(m));
    const im = new THREE.InstancedMesh(
      baked,
      pickInstancedMaterials(baked, materials),
      instanceCount,
    );
    im.frustumCulled = false;
    im.castShadow = false;
    im.receiveShadow = false;
    parts.push({
      mesh: im,
      disposeGeometry: () => {
        baked.dispose();
      },
    });
  });

  return parts;
}

/**
 * Kutuya sığdır; `bottomYZero` true ise dünya y=0 tabanına oturtur.
 */
export function fitObjectToBox(
  root: THREE.Object3D,
  targetMaxDim: number,
  bottomYZero: boolean,
): void {
  root.position.set(0, 0, 0);
  root.scale.set(1, 1, 1);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxD = Math.max(size.x, size.y, size.z) || 1;
  const sc = targetMaxDim / maxD;
  root.scale.setScalar(sc);
  root.updateMatrixWorld(true);
  const b2 = new THREE.Box3().setFromObject(root);
  const c = new THREE.Vector3();
  b2.getCenter(c);
  root.position.sub(c);
  root.updateMatrixWorld(true);
  if (bottomYZero) {
    const b3 = new THREE.Box3().setFromObject(root);
    root.position.y -= b3.min.y;
    root.updateMatrixWorld(true);
  }
}
