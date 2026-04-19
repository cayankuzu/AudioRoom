import * as THREE from "three";
import { WORLD } from "../config/config";

/**
 * Sol-alt kuşbakışı radar — Redd · Mükemmel Boşluk minimap'i ile birebir
 * stil. Buton YOK; ölçüm K/H tuşları ile dünyada tetiklenir.
 *
 * Görünenler:
 *  - Oyuncu (merkez, yön üçgeni)
 *  - Oda sınırı (sarı kare)
 *  - Gramofon (pirinç nokta + halka)
 *  - Kedi (soluk gri nokta) — opsiyonel marker
 *  - K-flash: plak anlık konum snapshot'ı (sönerek kaybolur)
 *
 * Plak gerçek-zamanlı GÖRÜNMEZ — Heisenberg'e sadık. Sadece K basınca
 * 1.6sn süreli "konum tespiti" yanıp söner; arada oyuncudan plağa yön
 * çizgisi çekilir.
 */

export interface MinimapMarker {
  position: THREE.Vector3;
  color: string;
  radius?: number;
  hidden?: boolean;
}

export interface MinimapFlash {
  /** Plak konum snapshot'ı (world). */
  vinylPos: THREE.Vector3;
  /** Snapshot zamanı (performance.now() ms). */
  capturedAt: number;
  /** Toplam görünürlük süresi (ms). */
  ttl: number;
}

export interface Minimap {
  update(
    playerPos: THREE.Vector3,
    playerYaw: number,
    gramPos: THREE.Vector3,
    extraMarkers?: MinimapMarker[],
  ): void;
  /** K basınca plak konumunu kısa süre göster. */
  flashVinyl(vinylPos: THREE.Vector3, ttlMs?: number): void;
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
      <span><kbd>G</kbd> Konum</span>
      <span><kbd>H</kbd> Hız</span>
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
  /**
   * Görüş yarıçapı: 110m → toplam 220m kuşbakışı alan (oda 180m,
   * sınırın hafif dışına da bakar — duvar konumu net görünür).
   * Kullanıcı isteği: "harita alanını biraz daha büyüt 220m yap".
   */
  const viewRadius = 110;
  scaleEl.textContent = `${Math.round(viewRadius * 2)} m`;
  void WORLD.half;

  let lastDraw = 0;
  const minFrameMs = 33;
  let flash: MinimapFlash | null = null;

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
    gramPos: THREE.Vector3,
    markers: MinimapMarker[],
  ): void {
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);

    /** Arkaplan — dairesel cam panel. */
    ctx.save();
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.48, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "rgba(12, 10, 6, 0.82)";
    ctx.fillRect(0, 0, size, size);

    /** 20m grid. */
    ctx.strokeStyle = "rgba(243, 192, 18, 0.06)";
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

    /** Oda sınırı — sarı kare (180m kutu). */
    const wallScale = (size * 0.5) / viewRadius;
    const wxMin = (-WORLD.half - playerPos.x) * wallScale + size * 0.5;
    const wxMax = (WORLD.half - playerPos.x) * wallScale + size * 0.5;
    const wzMin = (-WORLD.half - playerPos.z) * wallScale + size * 0.5;
    const wzMax = (WORLD.half - playerPos.z) * wallScale + size * 0.5;
    ctx.strokeStyle = "rgba(243, 192, 18, 0.42)";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(wxMin, wzMin, wxMax - wxMin, wzMax - wzMin);

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

    /** Ek marker'lar (kedi vs.). */
    for (const m of markers) {
      if (m.hidden) continue;
      const p = worldToMap(m.position.x, m.position.z, playerPos.x, playerPos.z);
      if (!p.visible) continue;
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, m.radius ?? 3, 0, Math.PI * 2);
      ctx.fill();
    }

    /** K-flash: plak konum snapshot + yön çizgisi. */
    if (flash) {
      const elapsed = performance.now() - flash.capturedAt;
      if (elapsed < flash.ttl) {
        const t = elapsed / flash.ttl;
        const alpha = Math.max(0, 1 - t);
        const v = worldToMap(
          flash.vinylPos.x,
          flash.vinylPos.z,
          playerPos.x,
          playerPos.z,
        );

        /** Oyuncudan plağa kesik çizgi. */
        ctx.save();
        ctx.strokeStyle = `rgba(243, 192, 18, ${0.55 * alpha})`;
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(size * 0.5, size * 0.5);
        ctx.lineTo(v.x, v.y);
        ctx.stroke();
        ctx.restore();

        /** Plak işareti — pulsing ring + dot. */
        const pulse = 1 + 0.4 * Math.sin(elapsed * 0.012);
        ctx.strokeStyle = `rgba(243, 192, 18, ${0.85 * alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 9 * pulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(255, 220, 90, ${alpha})`;
        ctx.beginPath();
        ctx.arc(v.x, v.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        flash = null;
      }
    }

    /** Oyuncu — merkez, yön üçgeni. */
    ctx.save();
    ctx.translate(size * 0.5, size * 0.5);
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

    ctx.restore();

    /** Dış kenarlık. */
    ctx.strokeStyle = "rgba(243, 192, 18, 0.18)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(size * 0.5, size * 0.5, size * 0.48, 0, Math.PI * 2);
    ctx.stroke();
  }

  return {
    update(playerPos, playerYaw, gramPos, extraMarkers = []) {
      /** Flash aktifse her frame çiz; aksi halde 30Hz'e düşür. */
      const now = performance.now();
      if (!flash && now - lastDraw < minFrameMs) return;
      lastDraw = now;
      draw(playerPos, playerYaw, gramPos, extraMarkers);
    },
    flashVinyl(vinylPos, ttlMs = 1800) {
      flash = {
        vinylPos: vinylPos.clone(),
        capturedAt: performance.now(),
        ttl: ttlMs,
      };
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
