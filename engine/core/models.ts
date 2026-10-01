import * as THREE from "three";
import type { Assets } from "./assets";

/**
 * Hazır 3D modeller (Poly Haven, CC0): `public/models/props/<ad>.glb`. Yükleme başarısız olursa
 * `get` null döner; sahneler o zaman kendi elle modellenmiş hâline düşer (evren yine açılır).
 */
export interface Models {
  /** Modelin bağımsız bir kopyası (geometri ve malzeme paylaşılır; değiştirecekseniz malzemeyi klonlayın). */
  get(name: string): THREE.Object3D | null;
}

export async function loadModels(assets: Assets, names: readonly string[]): Promise<Models> {
  const library = new Map<string, THREE.Object3D>();
  await Promise.all(
    [...new Set(names)].map(async (name) => {
      try {
        const gltf = await assets.gltf(`models/props/${name}.glb`);
        gltf.scene.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true;
        });
        library.set(name, gltf.scene);
      } catch (error) {
        console.warn(`Model yüklenemedi: ${name}`, error);
      }
    }),
  );
  return { get: (name) => library.get(name)?.clone(true) ?? null };
}

export interface FitOptions {
  /** Ölçülen kenar: "length" en uzun yatay kenar, "height" yükseklik. */
  by?: "length" | "height";
  /** Modeli Y ekseninde döndür (radyan), ölçmeden önce. */
  turn?: number;
  /** true: modelin kendi y=0'ı korunur (ör. geminin su çizgisi); false: tabanı zemine oturur. */
  keepY?: boolean;
}

/** Modeli bir gruba sarar: istenen boya ölçekler, yatayda ortalar, tabanını (ya da y=0'ını) zemine koyar. */
export function fitModel(object: THREE.Object3D, size: number, options: FitOptions = {}): THREE.Group {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.rotation.y = options.turn ?? 0;
  inner.add(object);
  group.add(inner);
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const dims = box.getSize(new THREE.Vector3());
  const scale = size / Math.max(0.0001, options.by === "height" ? dims.y : Math.max(dims.x, dims.z));
  inner.scale.setScalar(scale);
  inner.position.set(-((box.min.x + box.max.x) / 2) * scale, options.keepY ? 0 : -box.min.y * scale, -((box.min.z + box.max.z) / 2) * scale);
  return group;
}

/** Modeldeki ilk ağ (ör. tek parça kaya); yoksa null. */
export function firstMesh(object: THREE.Object3D | null): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  object?.traverse((child) => {
    if (!found && (child as THREE.Mesh).isMesh) found = child as THREE.Mesh;
  });
  return found;
}
