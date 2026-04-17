import * as THREE from "three";
import { BRIGHTNESS } from "../config/config";

/**
 * Renderer kurulumu — ACES Filmic tone mapping + sRGB output + yumuşak PCF
 * gölgeler. Parlaklık (exposure) runtime'da kullanıcı slider'ı ile değişir.
 */
export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
    stencil: false,
    /**
     * Ekran görüntüsü özelliği için şart — aksi halde bir sonraki frame'den
     * önce canvas buffer'ı temizlenebilir ve `toDataURL()` boş/siyah bir
     * görüntü döner. Modern GPU'larda performans etkisi ihmal edilebilir.
     */
    preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.85));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = BRIGHTNESS.default;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
}
