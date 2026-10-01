import * as THREE from "three";

/** Bir grubun tüm malzemelerini birlikte saydamlaştırır/gösterir (0..1). */
export function setGroupFade(group: THREE.Object3D, value: number): void {
  group.visible = value > 0.01;
  if (!group.visible) return;
  group.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const data = material.userData as { baseOpacity?: number };
      data.baseOpacity ??= material.opacity;
      const next = data.baseOpacity * value;
      const needsTransparency = value < 0.999 || data.baseOpacity < 1;
      if (material.transparent !== needsTransparency) {
        material.transparent = needsTransparency;
        material.needsUpdate = true;
      }
      material.opacity = next;
    }
  });
}

/** Üstel yaklaşma: kare hızından bağımsız yumuşak geçiş. */
export function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}
