import type { InputHandle } from "../systems/inputSystem";

export interface MobileControls {
  /** Root DOM — kendini parent'a bağlar. */
  element: HTMLElement;
  /** Göster / gizle (start overlay sırasında gizlenir, oyun başlayınca açılır). */
  setVisible(v: boolean): void;
  dispose(): void;
}

export interface MobileControlsOptions {
  /**
   * Hangi kanvas elementinin üstünde parmak sürüklerken kamera dönsün?
   * (Genelde renderer.domElement veya onun parent'ı).
   */
  lookTarget: HTMLElement;
  /** Aksiyon callbacks — butonlara basınca tetiklenirler. */
  onToggleFlashlight: () => void;
  onToggleMap: () => void;
  onTogglePanel: () => void;
  onToggleHud: () => void;
  onToggleBrightness: () => void;
  onPause: () => void;
}

/**
 * Dokunmatik cihazlar için yerleşik kontrol overlay'i.
 *
 * Düzen (yatay telefon için optimize):
 *  - SOL ALT: Yön ok pad'i (↑↓←→) — WASD/Arrow tuşlarını simüle eder.
 *  - SAĞ ALT: Aksiyon butonları (E = al/kullan, Q = bırak, R = çal/durdur).
 *  - SAĞ ÜST (küçük): Fener, Harita, Albüm paneli, HUD, Parlaklık, Duraklat.
 *  - SERBEST BÖLGE (kanvas üzerinde): parmak sürükleme → kamera bakışı
 *    (pointer-lock olmadan).
 *
 * Butonlar `inputSystem.setVirtualKey(code, pressed)` ile gerçek klavye
 * tuşuymuş gibi çalışır; bu sayede hareket/etkileşim sistemlerine ek kod
 * gerekmez.
 */
export function createMobileControls(
  parent: HTMLElement,
  input: InputHandle,
  opts: MobileControlsOptions,
): MobileControls {
  const root = document.createElement("div");
  root.className = "mobile-controls";
  root.setAttribute("aria-hidden", "false");

  root.innerHTML = `
    <div class="mobile-controls__dpad" data-dpad>
      <button type="button" class="mobile-controls__pad mobile-controls__pad--up" data-key="ArrowUp" aria-label="İleri">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 8H5z" fill="currentColor"/></svg>
      </button>
      <button type="button" class="mobile-controls__pad mobile-controls__pad--left" data-key="ArrowLeft" aria-label="Sola adım">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l8-7v14z" fill="currentColor"/></svg>
      </button>
      <button type="button" class="mobile-controls__pad mobile-controls__pad--right" data-key="ArrowRight" aria-label="Sağa adım">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12l-8 7V5z" fill="currentColor"/></svg>
      </button>
      <button type="button" class="mobile-controls__pad mobile-controls__pad--down" data-key="ArrowDown" aria-label="Geri">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19l-7-8h14z" fill="currentColor"/></svg>
      </button>
      <button type="button" class="mobile-controls__pad mobile-controls__pad--run" data-key="ShiftLeft" aria-label="Koş">
        <span>KOŞ</span>
      </button>
    </div>

    <div class="mobile-controls__actions" data-actions>
      <button type="button" class="mobile-controls__action mobile-controls__action--primary" data-key="KeyE" aria-label="Al / Kullan">
        <span class="mobile-controls__action-glyph">E</span>
        <span class="mobile-controls__action-label">AL</span>
      </button>
      <button type="button" class="mobile-controls__action" data-key="KeyQ" aria-label="Bırak">
        <span class="mobile-controls__action-glyph">Q</span>
        <span class="mobile-controls__action-label">BIRAK</span>
      </button>
      <button type="button" class="mobile-controls__action mobile-controls__action--secondary" data-key="KeyR" aria-label="Çal / Durdur">
        <span class="mobile-controls__action-glyph">R</span>
        <span class="mobile-controls__action-label">PLAY</span>
      </button>
      <button type="button" class="mobile-controls__action mobile-controls__action--jump" data-key="Space" aria-label="Zıpla">
        <span class="mobile-controls__action-glyph">⤒</span>
        <span class="mobile-controls__action-label">ZIPLA</span>
      </button>
    </div>

    <div class="mobile-controls__toolbar" data-toolbar>
      <button type="button" class="mobile-controls__tool" data-tool="flashlight" aria-label="Fener">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l-2 5H8zM8 9h8v4l-1 9h-6l-1-9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
      </button>
      <button type="button" class="mobile-controls__tool" data-tool="map" aria-label="Harita">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>
      </button>
      <button type="button" class="mobile-controls__tool" data-tool="panel" aria-label="Albüm paneli">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>
      </button>
      <button type="button" class="mobile-controls__tool" data-tool="hud" aria-label="Kontroller listesi">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
      <button type="button" class="mobile-controls__tool" data-tool="brightness" aria-label="Parlaklık">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
      <button type="button" class="mobile-controls__tool mobile-controls__tool--pause" data-tool="pause" aria-label="Duraklat">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>
      </button>
    </div>
  `;

  parent.appendChild(root);

  /**
   * Buton → sanal tuş basılı-tutma bağlama. pointerdown/pointerup +
   * pointercancel kullanıyoruz; touchstart/touchend eşdeğeri ama mouse
   * ile de çalışır (tablet hybrid, desktop touchscreen senaryoları).
   *
   * `setPointerCapture` — parmak butondan kayarsa bile release eventi
   * garanti gelir.
   */
  const bindings: Array<{ btn: HTMLElement; code: string; releaseOnUp: boolean }> = [];

  const keyButtons = root.querySelectorAll<HTMLButtonElement>("[data-key]");
  keyButtons.forEach((btn) => {
    const code = btn.dataset.key as string;
    bindings.push({ btn, code, releaseOnUp: true });
  });

  function press(code: string): void {
    input.setVirtualKey(code, true);
  }
  function release(code: string): void {
    input.setVirtualKey(code, false);
  }

  const pressHandlers = new Map<HTMLElement, (e: PointerEvent) => void>();
  const releaseHandlers = new Map<HTMLElement, (e: PointerEvent) => void>();

  bindings.forEach(({ btn, code }) => {
    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        btn.setPointerCapture(e.pointerId);
      } catch {
        /* yok say */
      }
      btn.classList.add("is-pressed");
      press(code);
    };
    const onUp = (e: PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.remove("is-pressed");
      release(code);
    };
    btn.addEventListener("pointerdown", onDown);
    btn.addEventListener("pointerup", onUp);
    btn.addEventListener("pointercancel", onUp);
    /**
     * `pointerleave` KULLANILMIYOR — pointer capture aktifken finger butonun
     * fiziksel sınırından çıksa bile event fire eder ve tuş erken bırakılır.
     * Bunun yerine `lostpointercapture` + `pointerup` + `pointercancel`
     * kombinasyonuyla güvenli release garantisi.
     */
    btn.addEventListener("lostpointercapture", onUp);
    /** Sayfa focus kaybederse butonu bırak. */
    pressHandlers.set(btn, onDown);
    releaseHandlers.set(btn, onUp);
  });

  /** Toolbar tek-dokunuşluk butonları (toggle) — tap with click. */
  const toolMap: Record<string, () => void> = {
    flashlight: opts.onToggleFlashlight,
    map: opts.onToggleMap,
    panel: opts.onTogglePanel,
    hud: opts.onToggleHud,
    brightness: opts.onToggleBrightness,
    pause: opts.onPause,
  };
  const toolBtns = root.querySelectorAll<HTMLButtonElement>("[data-tool]");
  toolBtns.forEach((btn) => {
    const name = btn.dataset.tool as string;
    const fn = toolMap[name];
    if (!fn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
    /** Tap feedback — pointerdown'da fade */
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      btn.classList.add("is-pressed");
    });
    const clear = () => btn.classList.remove("is-pressed");
    btn.addEventListener("pointerup", clear);
    btn.addEventListener("pointercancel", clear);
    btn.addEventListener("pointerleave", clear);
  });

  /** ===============================
   *  LOOK DRAG — kanvas üstünde sürükle, kamerayı döndür.
   *  =============================== */
  const lookTarget = opts.lookTarget;
  /** Aktif look parmağı id → önceki pozisyonu. */
  let lookPointerId: number | null = null;
  let lastX = 0;
  let lastY = 0;

  /**
   * `target` elementine gelen pointer eventleri (mouse dahil) değil, yalnızca
   * touch-type pointer'larla tetiklenmeli — yoksa masaüstünde mobile-controls
   * hiç mount edilmediği için bu zaten tetiklenmez, ama yine de guard.
   */
  const onCanvasPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    /** Kontrol butonunun üstüne iniyorsa look için kullanma. */
    const t = e.target as HTMLElement | null;
    if (t && t.closest(".mobile-controls")) return;
    if (lookPointerId !== null) return;
    lookPointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    try {
      lookTarget.setPointerCapture(e.pointerId);
    } catch {
      /* yok say */
    }
  };

  const onCanvasPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== lookPointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    /**
     * Hassasiyet: mouse ile 0.0022/0.0018, dokunmatikte biraz daha yumuşak
     * ama hızlı pan için yeterli. Pozitif X mouseda sağa → yaw azalır
     * (look.x -= dx). Aynı davranışı burada da kuruyoruz.
     */
    input.injectLook(-dx * 0.0042, -dy * 0.0034);
  };

  const onCanvasPointerEnd = (e: PointerEvent) => {
    if (e.pointerId !== lookPointerId) return;
    lookPointerId = null;
    try {
      lookTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* yok say */
    }
  };

  lookTarget.addEventListener("pointerdown", onCanvasPointerDown);
  lookTarget.addEventListener("pointermove", onCanvasPointerMove);
  lookTarget.addEventListener("pointerup", onCanvasPointerEnd);
  lookTarget.addEventListener("pointercancel", onCanvasPointerEnd);

  /**
   * iOS Safari default olarak two-finger pinch-zoom ve double-tap zoom
   * yapar — oyun içinde istemeyiz. `touch-action: none` style.css'te
   * verildi; ek güvenlik için gesturestart'ı yut.
   */
  const onGestureStart = (e: Event) => e.preventDefault();
  document.addEventListener("gesturestart", onGestureStart);

  let visible = true;

  return {
    element: root,
    setVisible(v) {
      if (visible === v) return;
      visible = v;
      root.classList.toggle("is-hidden", !v);
    },
    dispose() {
      lookTarget.removeEventListener("pointerdown", onCanvasPointerDown);
      lookTarget.removeEventListener("pointermove", onCanvasPointerMove);
      lookTarget.removeEventListener("pointerup", onCanvasPointerEnd);
      lookTarget.removeEventListener("pointercancel", onCanvasPointerEnd);
      document.removeEventListener("gesturestart", onGestureStart);
      root.remove();
    },
  };
}
