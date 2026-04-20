import type { InputHandle } from "../systems/inputSystem";

export interface MobileControls {
  element: HTMLElement;
  setVisible(v: boolean): void;
  setFullscreenActive(active: boolean): void;
  dispose(): void;
}

export interface MobileControlsOptions {
  onToggleMap: () => void;
  onPause: () => void;
  onToggleFullscreen: () => void;
  onGoBack: () => void;
  onTogglePanel?: () => void;
  onInteract?: () => void;
  onDrop?: () => void;
  onPlayPause?: () => void;
}

/**
 * Dokunmatik: sol alt D-pad, sağ alt zıpla butonu, üst toolbar.
 * Henry the Lee düzeninden carry/measurement aksiyonları çıkarıldı —
 * burada sadece dolaşım ve UI shortcut'ları var.
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

    <div class="mobile-controls__actions mobile-controls__actions--simple" data-actions>
      <button type="button" class="mobile-controls__action mobile-controls__action--e" data-tap="interact" aria-label="Etkileşim">
        <span class="mobile-controls__action-glyph">E</span>
        <span class="mobile-controls__action-label">AL/TAK</span>
      </button>
      <button type="button" class="mobile-controls__action mobile-controls__action--r" data-tap="play" aria-label="Oynat / Duraklat">
        <span class="mobile-controls__action-glyph">R</span>
        <span class="mobile-controls__action-label">PLAY</span>
      </button>
      <button type="button" class="mobile-controls__action mobile-controls__action--q" data-tap="drop" aria-label="Bırak">
        <span class="mobile-controls__action-glyph">Q</span>
        <span class="mobile-controls__action-label">BIRAK</span>
      </button>
      <button type="button" class="mobile-controls__action mobile-controls__action--primary" data-key="Space" aria-label="Zıpla">
        <span class="mobile-controls__action-glyph">⤒</span>
        <span class="mobile-controls__action-label">ZIPLA</span>
      </button>
    </div>

    <div class="mobile-controls__toolbar" data-toolbar>
      <button type="button" class="mobile-controls__tool mobile-controls__tool--back" data-tool="back" aria-label="Kütüphaneye dön">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="mobile-controls__tool-sep" aria-hidden="true"></span>
      <button type="button" class="mobile-controls__tool mobile-controls__tool--eye" data-tool="eye" aria-label="Arayüzü gizle / göster" aria-pressed="false">
        <svg class="mobile-controls__tool-eye-open" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
        <svg class="mobile-controls__tool-eye-closed" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </button>
      <button type="button" class="mobile-controls__tool" data-tool="map" aria-label="Harita">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>
      </button>
      <button type="button" class="mobile-controls__tool" data-tool="panel" aria-label="Albüm paneli">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>
      </button>
      <button type="button" class="mobile-controls__tool mobile-controls__tool--fs" data-tool="fullscreen" aria-label="Tam ekran" aria-pressed="false">
        <svg class="mobile-controls__tool-fs-enter" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <svg class="mobile-controls__tool-fs-exit" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <button type="button" class="mobile-controls__tool mobile-controls__tool--pause" data-tool="pause" aria-label="Duraklat">
        <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>
      </button>
    </div>
  `;

  parent.appendChild(root);

  const bindings: Array<{ btn: HTMLElement; code: string }> = [];
  root.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((btn) => {
    const code = btn.dataset.key as string;
    bindings.push({ btn, code });
  });

  function press(code: string): void {
    input.setVirtualKey(code, true);
  }
  function release(code: string): void {
    input.setVirtualKey(code, false);
  }

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
    btn.addEventListener("lostpointercapture", onUp);
  });

  let uiHidden = false;
  function toggleEye(): void {
    uiHidden = !uiHidden;
    document.body.classList.toggle("is-ui-hidden", uiHidden);
    const eyeBtn = root.querySelector<HTMLButtonElement>('[data-tool="eye"]');
    if (eyeBtn) eyeBtn.setAttribute("aria-pressed", String(uiHidden));
  }

  const toolMap: Record<string, () => void> = {
    back: opts.onGoBack,
    map: opts.onToggleMap,
    panel: opts.onTogglePanel ?? (() => {}),
    pause: opts.onPause,
    fullscreen: opts.onToggleFullscreen,
    eye: toggleEye,
  };

  /** Tap aksiyonları (E/Q/R) — keyboard'u taklit etmek yerine doğrudan callback. */
  const tapMap: Record<string, (() => void) | undefined> = {
    interact: opts.onInteract,
    drop: opts.onDrop,
    play: opts.onPlayPause,
  };
  root.querySelectorAll<HTMLButtonElement>("[data-tap]").forEach((btn) => {
    const name = btn.dataset.tap as string;
    const fn = tapMap[name];
    if (!fn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      btn.classList.add("is-pressed");
    });
    const clear = () => btn.classList.remove("is-pressed");
    btn.addEventListener("pointerup", clear);
    btn.addEventListener("pointercancel", clear);
    btn.addEventListener("pointerleave", clear);
  });
  root.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((btn) => {
    const name = btn.dataset.tool as string;
    const fn = toolMap[name];
    if (!fn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      btn.classList.add("is-pressed");
    });
    const clear = () => btn.classList.remove("is-pressed");
    btn.addEventListener("pointerup", clear);
    btn.addEventListener("pointercancel", clear);
    btn.addEventListener("pointerleave", clear);
  });

  const lookSkipSelector = [
    ".mobile-controls__pad",
    ".mobile-controls__action",
    ".mobile-controls__tool",
    ".mobile-controls__dpad",
    ".mobile-controls__actions",
    ".mobile-controls__toolbar",
    ".minimap",
    ".start-overlay",
    ".hud",
    ".bbs-crosshair",
    "button",
    "input",
    "a",
  ].join(", ");

  let lookPointerId: number | null = null;
  let lastX = 0;
  let lastY = 0;

  const onDocPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    if (lookPointerId !== null) return;
    const t = e.target as HTMLElement | null;
    if (t && t.closest(lookSkipSelector)) return;
    lookPointerId = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onDocPointerMove = (e: PointerEvent) => {
    if (e.pointerId !== lookPointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    input.injectLook(-dx * 0.0042, -dy * 0.0034);
  };

  const onDocPointerEnd = (e: PointerEvent) => {
    if (e.pointerId !== lookPointerId) return;
    lookPointerId = null;
  };

  document.addEventListener("pointerdown", onDocPointerDown, { passive: true });
  document.addEventListener("pointermove", onDocPointerMove, { passive: true });
  document.addEventListener("pointerup", onDocPointerEnd, { passive: true });
  document.addEventListener("pointercancel", onDocPointerEnd, { passive: true });

  const onGestureStart = (e: Event) => e.preventDefault();
  document.addEventListener("gesturestart", onGestureStart);

  let visible = true;
  const fsBtn = root.querySelector<HTMLButtonElement>('[data-tool="fullscreen"]');

  return {
    element: root,
    setVisible(v) {
      if (visible === v) return;
      visible = v;
      root.classList.toggle("is-hidden", !v);
    },
    setFullscreenActive(active) {
      if (!fsBtn) return;
      fsBtn.setAttribute("aria-pressed", String(active));
    },
    dispose() {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("pointermove", onDocPointerMove);
      document.removeEventListener("pointerup", onDocPointerEnd);
      document.removeEventListener("pointercancel", onDocPointerEnd);
      document.removeEventListener("gesturestart", onGestureStart);
      document.body.classList.remove("is-ui-hidden");
      root.remove();
    },
  };
}
