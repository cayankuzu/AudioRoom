import * as THREE from "three";
import { el } from "./dom";

export interface Marker {
  /** Hedefi ekranda gösterir; target null ise gizler. label verilirse işaretin adı değişir. */
  update(target: THREE.Vector3 | null, camera: THREE.PerspectiveCamera, label?: string): void;
  dispose(): void;
}

const EDGE = 56;

/**
 * Hedef işareti (AAA oyunlardaki görev imleci): hedef görüş alanındaysa üstünde
 * durur, değilse ekran kenarına yapışıp ona doğru bir ok gösterir. Mesafe metreyle yazılır.
 */
export function createMarker(parent: HTMLElement, label: string): Marker {
  const root = el("div", "ar-marker");
  const icon = el("div", "ar-marker__icon");
  const arrow = el("div", "ar-marker__arrow");
  const text = el("div", "ar-marker__text");
  const name = el("span", "ar-marker__label", label);
  const distance = el("span", "ar-marker__distance");
  text.append(name, distance);
  root.append(arrow, icon, text);
  parent.appendChild(root);

  const projected = new THREE.Vector3();
  const local = new THREE.Vector3();
  let lastMeters = -1;

  return {
    update(target, camera, text) {
      if (!target) {
        root.classList.remove("is-visible");
        return;
      }
      if (text && name.textContent !== text) name.textContent = text;
      root.classList.add("is-visible");
      const width = window.innerWidth;
      const height = window.innerHeight;
      local.copy(target).applyMatrix4(camera.matrixWorldInverse);
      const behind = local.z > 0;
      projected.copy(target).project(camera);
      let x = (projected.x * 0.5 + 0.5) * width;
      let y = (-projected.y * 0.5 + 0.5) * height;
      if (behind) {
        // Arkadaki hedef: yansıyan noktayı ekranın alt kenarına it.
        x = width - x;
        y = height;
      }
      const inside = !behind && x > EDGE && x < width - EDGE && y > EDGE && y < height - EDGE;
      const cx = width / 2;
      const cy = height / 2;
      if (!inside) {
        const dx = x - cx;
        const dy = y - cy;
        const scale = Math.min((cx - EDGE) / Math.max(Math.abs(dx), 1e-3), (cy - EDGE) / Math.max(Math.abs(dy), 1e-3));
        x = cx + dx * scale;
        y = cy + dy * scale;
        arrow.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
      }
      root.classList.toggle("is-edge", !inside);
      root.style.transform = `translate(${x}px, ${y}px)`;
      const meters = Math.round(target.distanceTo(camera.position));
      if (meters !== lastMeters) {
        lastMeters = meters;
        distance.textContent = `${meters} m`;
      }
    },
    dispose() {
      root.remove();
    },
  };
}
