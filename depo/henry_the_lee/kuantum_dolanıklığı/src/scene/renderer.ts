import * as THREE from "three";

/**
 * Renderer — ACES Filmic + sRGB output. Boşluk teması koyu olduğundan
 * exposure düşük tutulur (0.85), aksi halde ortadaki sarı vurgular klipliyor.
 */
export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
    stencil: false,
  });
  /** Fill-rate ve shader maliyeti: 1.0 DPR zayıf donanımda en güvenli. */
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
  /**
   * `updateStyle=false` — canvas'ın görünen kutu boyutunu CSS yönetsin.
   * Varsayılan `true` ile sabit piksel `style.width/height` yazılırdı ve
   * sonraki resize'lar (updateStyle=false) o satır-içi stili hiç
   * silmediği için fullscreen/döndürme sonrası canvas eski boyutunda
   * kilitli kalıp ekranda ölü siyah alan bırakıyordu.
   */
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  /** Biraz daha canlı kontrast; sarı klipleri önlemek için 1.0 üstüne çıkmıyoruz. */
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);
  return renderer;
}
