import * as THREE from "three";
import { WORLD } from "../config";

export interface Minimap {
  update(
    player: THREE.Vector3,
    yaw: number,
    gramophone: THREE.Vector3,
    bunny: THREE.Vector3,
    recordOnBunny: boolean,
    droppedRecord: THREE.Vector3 | null,
    burrowEntrances: readonly THREE.Vector3[],
  ): void;
  toggle(): void;
  isOpen(): boolean;
  dispose(): void;
}

export function createMinimap(parent: HTMLElement): Minimap {
  const shell = document.createElement("div");
  shell.className = "minimap";
  shell.innerHTML = `
    <div class="minimap__head">
      <span>Harita</span>
      <span class="minimap__scale">${WORLD.radius * 2} m</span>
      <button class="minimap__collapse" type="button" aria-label="Haritayı küçült" title="Küçült">−</button>
    </div>
    <canvas class="minimap__canvas" width="220" height="220"></canvas>
  `;
  parent.appendChild(shell);

  const canvas = shell.querySelector<HTMLCanvasElement>("canvas");
  const button = shell.querySelector<HTMLButtonElement>("button");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) throw new Error("Minimap oluşturulamadı.");

  let collapsed = false;
  let lastDraw = 0;
  const size = 220;
  const viewRadius = WORLD.radius;
  const scale = (size * 0.5) / viewRadius;

  const applyCollapsed = () => {
    shell.classList.toggle("is-collapsed", collapsed);
    if (button) button.textContent = collapsed ? "+" : "−";
  };
  button?.addEventListener("click", (event) => {
    event.stopPropagation();
    collapsed = !collapsed;
    applyCollapsed();
  });

  const point = (world: THREE.Vector3, player: THREE.Vector3) => ({
    x: size * 0.5 + (world.x - player.x) * scale,
    y: size * 0.5 + (world.z - player.z) * scale,
  });

  const drawMarker = (x: number, y: number, color: string, radius: number, ring = false) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (ring) {
      ctx.strokeStyle = color.replace("0.95", "0.34");
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  return {
    update(player, yaw, gramophone, bunny, recordOnBunny, droppedRecord, burrowEntrances) {
      const now = performance.now();
      if (now - lastDraw < 33) return;
      lastDraw = now;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "rgba(12, 12, 14, 0.82)";
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = "rgba(255,255,255,.045)";
      ctx.lineWidth = 1;
      const grid = scale * 20;
      const offsetX = (-player.x * scale) % grid;
      const offsetY = (-player.z * scale) % grid;
      for (let x = offsetX; x < size; x += grid) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, size); ctx.stroke();
      }
      for (let y = offsetY; y < size; y += grid) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
      }

      const center = point(new THREE.Vector3(), player);
      ctx.strokeStyle = "rgba(220,200,180,.25)";
      ctx.beginPath();
      ctx.arc(center.x, center.y, 8.5 * scale, 0, Math.PI * 2);
      ctx.stroke();

      const gram = point(gramophone, player);
      drawMarker(gram.x, gram.y, "rgba(197,144,68,0.95)", 4.5, true);
      const target = point(bunny, player);
      drawMarker(target.x, target.y, recordOnBunny ? "#d85d35" : "#efbc62", 3.8, true);
      if (droppedRecord) {
        const vinyl = point(droppedRecord, player);
        drawMarker(vinyl.x, vinyl.y, "#d13c47", 3.2, true);
      }
      for (const entrance of burrowEntrances) {
        const hole = point(entrance, player);
        ctx.strokeStyle = "rgba(222, 105, 49, .72)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(hole.x, hole.y, 3.6, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate(-yaw);
      ctx.fillStyle = "#f3efe6";
      ctx.beginPath();
      ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,.1)";
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.48, 0, Math.PI * 2);
      ctx.stroke();
    },
    toggle() {
      collapsed = !collapsed;
      applyCollapsed();
    },
    isOpen() {
      return !collapsed;
    },
    dispose() {
      shell.remove();
    },
  };
}
