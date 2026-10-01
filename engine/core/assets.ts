import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

/**
 * `public/` altındaki bir dosyanın adresi. Evren sayfaları `/worlds/<ad>/`
 * altında yaşar; site bir alt yolda (ör. GitHub Pages) yayınlansa da kök doğru bulunur.
 */
export function assetUrl(path: string): string {
  const { pathname } = window.location;
  const index = pathname.indexOf("/worlds/");
  const root = index >= 0 ? pathname.slice(0, index + 1) : pathname.replace(/[^/]*$/, "");
  return root + path;
}

export interface Assets {
  readonly manager: THREE.LoadingManager;
  gltf(path: string): Promise<GLTF>;
  texture(path: string, srgb?: boolean): Promise<THREE.Texture>;
  stl(path: string): Promise<THREE.BufferGeometry>;
}

export function createAssets(onProgress: (ratio: number) => void): Assets {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => onProgress(total ? loaded / total : 1);
  const gltfLoader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
  const textureLoader = new THREE.TextureLoader(manager);
  const stlLoader = new STLLoader(manager);

  return {
    manager,
    gltf: (path) => gltfLoader.loadAsync(assetUrl(path)),
    async texture(path, srgb = true) {
      const texture = await textureLoader.loadAsync(assetUrl(path));
      if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 8;
      return texture;
    },
    stl: (path) => stlLoader.loadAsync(assetUrl(path)),
  };
}
