import * as THREE from "three";

/**
 * Renderer — ACES Filmic + sRGB. Sıcak kor sahne; exposure'ı biraz daha
 * canlı tutuyoruz (1.05) ki kor turuncu vurgular doygun görünsün.
 */
export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: "high-performance",
    stencil: false,
  });
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
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);
  return renderer;
}
