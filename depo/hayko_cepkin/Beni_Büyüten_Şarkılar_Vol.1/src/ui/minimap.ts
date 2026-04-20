import * as THREE from "three";
import { WORLD } from "../config/config";

/**
 * Sol-alt kuşbakışı radar — Henry the Lee minimap'inin daha sade hâli.
 * Daire sınır + merkez bebek marker'ı + oyuncu yön üçgeni.
 */

export interface MinimapVinylMarker {
  position: THREE.Vector3;
  color: string;
  hidden?: boolean;
}

export interface Minimap {
  update(
    playerPos: THREE.Vector3,
    playerYaw: number,
    gramophonePos?: THREE.Vector3,
    vinyls?: ReadonlyArray<MinimapVinylMarker>,
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
      <span class="minimap__scale" data-scale>0 m</span>
      <button class="minimap__collapse" type="button" aria-label="Haritayı küçült" title="Küçült">−</button>
    </div>
    <canvas class="minimap__canvas" width="220" height="220"></canvas>
    <div class="minimap__legend" aria-hidden="true">
      <span><kbd>M</kbd> Harita</span>
      <span><kbd>K</kbd> Kontroller</span>
    </div>
  `;
  parent.appendChild(shell);

  const collapseBtn = shell.querySelector<HTMLButtonElement>(".minimap__collapse");
  let collapsed = false;

  function applyCollapsed() {
    shell.classList.toggle("is-collapsed", collapsed);
    if (collapseBtn) {
      collapseBtn.textContent = collapsed ? "+" : "−";
      collapseBtn.title = collapsed ? "Büyüt" : "Küçült";
      collapseBtn.setAttribute(
        "aria-label",
        collapsed ? "Haritayı büyüt" : "Haritayı küçült",
      );
    }
  }

  collapseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    collapsed = !collapsed;
    applyCollapsed();
  });

  const canvas = shell.querySelector<HTMLCanvasElement>(".minimap__canvas");
  const scaleEl = shell.querySelector<HTMLSpanElement>("[data-scale]");
  if (!canvas || !scaleEl) throw new Error("Minimap DOM eksik");

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Minimap 2D context alınamadı.");

  const size = 220;
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
    const y = size * 0.5 + dz * scale;
    const visible = x >= 4 && x <= size - 4 && y >= 4 && y <= size - 4;
    return { x, y, visible };
  }

  function draw(
    playerPos: THREE.Vector3,
    playerYaw: number,
    gramophonePos?: THREE.Vector3,
    vinyls?: ReadonlyArray<MinimapVinylMarker>,
  ): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);

    /** Arkaplan — dairesel cam panel. */
    ctx.save();
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.48, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(20, 6, 4, 0.85)";
    ctx.fillRect(0, 0, size, size);

    /** 20m grid. */
    ctx.strokeStyle = "rgba(214, 90, 54, 0.08)";
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

    /** Dairesel sınır — kor turuncu halka (rahim sınırı). */
    const wallScale = (size * 0.5) / viewRadius;
    const cx = (-playerPos.x) * wallScale + size * 0.5;
    const cy = (-playerPos.z) * wallScale + size * 0.5;
    ctx.strokeStyle = "rgba(214, 90, 54, 0.45)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, WORLD.half * wallScale, 0, Math.PI * 2);
    ctx.stroke();

    /** Merkez bebek — sıcak amber pulse. */
    const center = worldToMap(0, 0, playerPos.x, playerPos.z);
    if (center.visible) {
      const t = (performance.now() % 2200) / 2200;
      const pulse = 1 + 0.3 * Math.sin(t * Math.PI * 2);
      ctx.strokeStyle = "rgba(240, 160, 96, 0.6)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(center.x, center.y, 11 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 138, 74, 0.95)";
      ctx.beginPath();
      ctx.arc(center.x, center.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    /** Vinyl markerları (toplanmamış kor turuncu nokta, toplanmış sönük). */
    if (vinyls) {
      for (const v of vinyls) {
        if (v.hidden) continue;
        const m = worldToMap(v.position.x, v.position.z, playerPos.x, playerPos.z);
        if (!m.visible) continue;
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    /** Gramofon — pirinç sarı kare. */
    if (gramophonePos) {
      const g = worldToMap(gramophonePos.x, gramophonePos.z, playerPos.x, playerPos.z);
      if (g.visible) {
        ctx.save();
        ctx.fillStyle = "#f0c47a";
        ctx.strokeStyle = "rgba(20, 6, 4, 0.85)";
        ctx.lineWidth = 1.4;
        ctx.translate(g.x, g.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-4.5, -4.5, 9, 9);
        ctx.strokeRect(-4.5, -4.5, 9, 9);
        ctx.restore();
      }
    }

    /** Oyuncu — merkez, yön üçgeni. */
    ctx.save();
    ctx.translate(size * 0.5, size * 0.5);
    ctx.rotate(-playerYaw);
    ctx.fillStyle = "#fbe4c8";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();

    /** Dış kenarlık. */
    ctx.strokeStyle = "rgba(214, 90, 54, 0.22)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.48, 0, Math.PI * 2);
    ctx.stroke();
  }

  return {
    update(playerPos, playerYaw, gramophonePos, vinyls) {
      const now = performance.now();
      if (now - lastDraw < minFrameMs) return;
      lastDraw = now;
      draw(playerPos, playerYaw, gramophonePos, vinyls);
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
