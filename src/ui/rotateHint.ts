export interface RotateHint {
  /** Ekran dikey olduğunda banner'ı göster; yatay olduğunda gizle.
   *  Orientation değişimini dinler ve otomatik olarak güncellenir. */
  attach(): void;
  /** Event dinleyicilerini sök ve DOM'dan kaldır. */
  dispose(): void;
}

export interface RotateHintOptions {
  /** Kullanıcı "x" ile kapattığında bu oturum boyunca tekrar gösterme. */
  dismissible?: boolean;
}

/**
 * Mobil/tablet kullanıcılarına "daha iyi deneyim için cihazı yan çevirin"
 * uyarısını veren, üst-ortada safe-area farkındalı kalıcı pill.
 *
 * - Yalnızca dokunmatik cihazlarda çalışır (`matchMedia`).
 * - `orientation: portrait` iken görünür, yatay çevrildiğinde otomatik kaybolur.
 * - Kullanıcı tarafından kapatılabilir; kapatılınca bu sekme oturumunda
 *   tekrar gösterilmez (sessionStorage).
 * - `pointer-events` açık (kapatma X'i için), ancak banner canvas'ın üstündeki
 *   girdi akışını bloklamaz çünkü dar bir pill olarak konumlanır.
 */
export function createRotateHint(
  parent: HTMLElement,
  opts: RotateHintOptions = {},
): RotateHint {
  const dismissible = opts.dismissible ?? true;

  /**
   * Dokunmatik olmayan cihazlarda (bilgisayar) hiç mount edilmez — gereksiz
   * DOM yaratmıyoruz. Bu sayede PC kullanıcıları etkilenmez.
   */
  const isTouch =
    typeof window !== "undefined" &&
    ((typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: none) and (pointer: coarse)").matches) ||
      "ontouchstart" in window ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0));

  const el = document.createElement("div");
  el.className = "rotate-hint";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `
    <span class="rotate-hint__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
        <rect x="4" y="2.5" width="9" height="15" rx="1.6"/>
        <path d="M13 10.5 L20 10.5 M17 7.5 L20 10.5 L17 13.5"/>
        <circle cx="8.5" cy="14.8" r="0.7" fill="currentColor" stroke="none"/>
      </svg>
    </span>
    <span class="rotate-hint__text">Daha iyi deneyim için <strong>telefonu yan çevirin</strong></span>
    ${
      dismissible
        ? `<button type="button" class="rotate-hint__close" aria-label="Uyarıyı kapat">×</button>`
        : ""
    }
  `;

  /**
   * sessionStorage'da kapatma durumu saklanır — kütüphaneden deneyime
   * geçişte uyarı yeniden fırlayıp kullanıcıyı rahatsız etmesin.
   */
  const STORAGE_KEY = "audioroom:rotate-hint-dismissed";
  let dismissed = false;
  try {
    dismissed = window.sessionStorage?.getItem(STORAGE_KEY) === "1";
  } catch {
    /* private modda sessionStorage throw edebilir — sessizce yoksay. */
  }

  let mql: MediaQueryList | null = null;
  let onChange: (() => void) | null = null;

  function update(): void {
    const isPortrait =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(orientation: portrait)").matches;
    const shouldShow = isTouch && isPortrait && !dismissed;
    el.classList.toggle("is-visible", shouldShow);
    /** Yatayken pointer-events'i kapat — kazara tıklanma olmasın. */
    el.style.pointerEvents = shouldShow ? "auto" : "none";
  }

  const closeBtn = el.querySelector<HTMLButtonElement>(".rotate-hint__close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dismissed = true;
      try {
        window.sessionStorage?.setItem(STORAGE_KEY, "1");
      } catch {
        /* noop */
      }
      update();
    });
  }

  return {
    attach() {
      if (!isTouch) return;
      if (!el.isConnected) parent.appendChild(el);
      /**
       * Orientation değişimini dinle. matchMedia daha güvenilir; iOS Safari
       * klasik `orientationchange`'i geç yangılar. İkisini de dinliyoruz.
       */
      if (typeof window.matchMedia === "function") {
        mql = window.matchMedia("(orientation: portrait)");
        onChange = () => update();
        if (typeof mql.addEventListener === "function") {
          mql.addEventListener("change", onChange);
        } else if (typeof mql.addListener === "function") {
          mql.addListener(onChange);
        }
      }
      window.addEventListener("resize", update, { passive: true });
      window.addEventListener("orientationchange", update, { passive: true });
      update();
    },
    dispose() {
      if (mql && onChange) {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", onChange);
        } else if (typeof mql.removeListener === "function") {
          mql.removeListener(onChange);
        }
      }
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      el.remove();
    },
  };
}
