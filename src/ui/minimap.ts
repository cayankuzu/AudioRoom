import * as THREE from "three";
import { WORLD } from "../config/config";

export interface MinimapMarker {
  position: THREE.Vector3;
  color: string;
  radius?: number;
  hidden?: boolean;
}

export interface Minimap {
  /** Her frame güncelle — yalnızca 30Hz'de yeniden boyanır. */
  update(
    playerPos: THREE.Vector3,
    playerYaw: number,
    gramPos: THREE.Vector3,
    vinyls: MinimapMarker[],
  ): void;
  dispose(): void;
}

/**
 * Sağ altta küçük kuşbakışı radar.
 *  - Merkez: oyuncu (daima ortada)
 *  - Krater çemberi gri halka olarak çizilir
 *  - Gramofon: pirinç noktalı
 *  - Plaklar: kırmızı nokta (toplanmamış olanlar)
 *  - Oyuncu yönü küçük beyaz üçgen
 *
 * Canvas tabanlı; 200x200 piksel; her 33ms'de bir redraw.
 */
export function createMinimap(parent: HTMLElement): Minimap {
  const shell = document.createElement("div");
  shell.className = "minimap";
  shell.innerHTML = `
    <div class="minimap__head">
      <span>Harita</span>
      <span class="minimap__scale" data-scale>0 m</span>
      <button class="minimap__collapse" type="button" aria-label="Haritayı küçült" title="Küçült">−</button>
    </div>
    <canvas class="minimap__canvas" width="220" height="220"></canvas>
  `;
  parent.appendChild(shell);

  const collapseBtn = shell.querySelector<HTMLButtonElement>(".minimap__collapse");
  let collapsed = false;
  collapseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    collapsed = !collapsed;
    shell.classList.toggle("is-collapsed", collapsed);
    if (collapseBtn) {
      collapseBtn.textContent = collapsed ? "+" : "−";
      collapseBtn.title = collapsed ? "Büyüt" : "Küçült";
      collapseBtn.setAttribute(
        "aria-label",
        collapsed ? "Haritayı büyüt" : "Haritayı küçült",
      );
    }
  });

  const canvas = shell.querySelector<HTMLCanvasElement>(".minimap__canvas");
  const scaleEl = shell.querySelector<HTMLSpanElement>("[data-scale]");
  if (!canvas || !scaleEl) throw new Error("Minimap DOM eksik");

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Minimap 2D context alınamadı.");

  const size = 220;
  /** Harita yarıçapı (dünya metre). Bu kadar dünya, canvas'a sığacak. */
  const viewRadius = 90;
  scaleEl.textContent = `${Math.round(viewRadius * 2)} m`;

  let lastDraw = 0;
  const minFrameMs = 33;

  function worldToMap(
    wx: number,
    wz: number,
    playerX: number,
    playerZ: number,
  ): { x: number; y: number; visible: boolean } {
    const dx = wx - playerX;
    const dz = wz - playerZ;
    const scale = (size * 0.5) / viewRadius;
    const x = size * 0.5 + dx * scale;
    /** Canvas y → world z pozitifi aşağıya düşsün: haritada "ileri" üstte. */
    const y = size * 0.5 + dz * scale;
    const visible =
      x >= 4 && x <= size - 4 && y >= 4 && y <= size - 4;
    return { x, y, visible };
  }

  function draw(
    playerPos: THREE.Vector3,
    playerYaw: number,
    gramPos: THREE.Vector3,
    vinyls: MinimapMarker[],
  ): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);

    /** Arkaplan — hafif dairesel. */
    ctx.save();
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.48, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(12, 12, 14, 0.82)";
    ctx.fillRect(0, 0, size, size);

    /** Kare grid çizgileri — 20 metre aralıklı. */
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const step = ((size * 0.5) / viewRadius) * 20;
    const offsetX = ((-playerPos.x) * ((size * 0.5) / viewRadius)) % step;
    const offsetY = ((-playerPos.z) * ((size * 0.5) / viewRadius)) % step;
    for (let x = offsetX; x < size; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = offsetY; y < size; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    /** Krater çemberi. */
    const crater = worldToMap(
      WORLD.craterCenter.x,
      WORLD.craterCenter.z,
      playerPos.x,
      playerPos.z,
    );
    const craterR = WORLD.craterRimRadius * ((size * 0.5) / viewRadius);
    ctx.strokeStyle = "rgba(220, 200, 180, 0.25)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(crater.x, crater.y, craterR, 0, Math.PI * 2);
    ctx.stroke();

    /** Gramofon — pirinç nokta + halka. */
    const g = worldToMap(gramPos.x, gramPos.z, playerPos.x, playerPos.z);
    if (g.visible) {
      ctx.fillStyle = "rgba(197, 144, 68, 0.95)";
      ctx.beginPath();
      ctx.arc(g.x, g.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(197, 144, 68, 0.35)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    /** Plaklar — kırmızı nokta. */
    for (const v of vinyls) {
      if (v.hidden) continue;
      const p = worldToMap(v.position.x, v.position.z, playerPos.x, playerPos.z);
      if (!p.visible) continue;
      ctx.fillStyle = v.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, v.radius ?? 3, 0, Math.PI * 2);
      ctx.fill();
    }

    /** Oyuncu — merkez, yön göstergeli üçgen. */
    ctx.save();
    ctx.translate(size * 0.5, size * 0.5);
    /** Yaw: atan2(x, z) → oyuncunun baktığı yön. Canvas Y aşağı. */
    ctx.rotate(-playerYaw);
    ctx.fillStyle = "#f3efe6";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /** Dış kenarlık. */
    ctx.restore();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.48, 0, Math.PI * 2);
    ctx.stroke();
  }

  return {
    update(playerPos, playerYaw, gramPos, vinyls) {
      const now = performance.now();
      if (now - lastDraw < minFrameMs) return;
      lastDraw = now;
      draw(playerPos, playerYaw, gramPos, vinyls);
    },
    dispose() {
      shell.remove();
    },
  };
}
