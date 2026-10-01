import * as THREE from "three";

/** Yumuşak kenarlı ışık lekesi dokusu (sprite ve parçacıklar için). */
let glowTexture: THREE.CanvasTexture | null = null;
export function softGlow(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

/** Işık sprite'ı: ateş, mum ve yıldız halesi. */
export function glowSprite(color: THREE.ColorRepresentation, size: number): THREE.Sprite {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: softGlow(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  sprite.scale.setScalar(size);
  return sprite;
}
