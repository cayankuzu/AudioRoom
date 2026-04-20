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
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);
  return renderer;
}
