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
  /** İlk kare güvenli DPR ile açılır; ortak performans yöneticisi cihazı ölçüp yükseltir. */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  /**
   * `updateStyle=false` — CSS (`#experience canvas { width:100%; height:100%; }`)
   * canvas'ın GÖRÜNEN kutu boyutunu yönetsin. Varsayılan `true` ile
   * çağrılırsa Three.js `canvas.style.width/height`'ı SABİT piksel
   * değerine yazar (örn. ilk yüklemedeki dar viewport'a göre); sonraki
   * tüm `setSize` çağrıları (adaptivePerformance.ts) zaten `false`
   * geçiyor, ama bu ilk çağrı `true` kalırsa o sabit satır-içi stil hiç
   * silinmiyor — kullanıcı daha sonra tam ekrana geçtiğinde veya
   * döndürdüğünde canvas eski küçük boyutunda kilitli kalıp ekranın
   * geri kalanında ölü siyah alan bırakıyordu.
   */
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = BRIGHTNESS.default;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);
  return renderer;
}
