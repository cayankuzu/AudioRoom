export interface RotateHint {
  /** Periyodik görünürlüğü başlat (her `intervalMs` bir fade-in/out). */
  start(): void;
  /** Timer'ı durdur ve banner'ı anında gizle. */
  stop(): void;
  /** Event dinleyicilerini sök ve DOM'dan kaldır. */
  dispose(): void;
}

export interface RotateHintOptions {
  /** Göründüğünde ekranda kaç ms kalsın? (fade'lar hariç) */
  visibleMs?: number;
  /** Gösterimler arası aralık (görünür süre dahil). */
  intervalMs?: number;
  /** İlk gösterim için gecikme. */
  initialDelayMs?: number;
}

/**
 * Mobil/tablet kullanıcılarına "daha iyi deneyim için cihazı yan çevirin"
 * uyarısını veren, üst-orta safe-area farkındalı pulse banner.
 *
 * Davranış:
 *  - Yalnızca dokunmatik cihazlarda çalışır (matchMedia).
 *  - `orientation: portrait` iken periyodik olarak (her `intervalMs`) görünür
 *    olur, `visibleMs` sonra kaybolur. Yatay moda geçilirse anında gizlenir
 *    ve periyodik gösterim tekrar tetiklenmez.
 *  - Kütüphane + deneyim sahnelerinin ikisinde de çalışabilir; pc-hint-banner
 *    ile ÇAKIŞMAMASI için çağıran taraf `initialDelayMs` ile faz farkı
 *    verebilir (örn. pc-hint 0s, rotate 2.5s).
 *  - pointer-events: none → canvas girdi akışını hiç etkilemez.
 */
export function createRotateHint(
  parent: HTMLElement,
  opts: RotateHintOptions = {},
): RotateHint {
  const visibleMs = opts.visibleMs ?? 2400;
  const intervalMs = opts.intervalMs ?? 5000;
  const initialDelayMs = opts.initialDelayMs ?? 2500;

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
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">
        <rect x="4.5" y="2.5" width="8.5" height="15" rx="1.6"/>
        <path d="M13 10.5 L20 10.5 M17 7.5 L20 10.5 L17 13.5"/>
        <circle cx="8.75" cy="14.8" r="0.7" fill="currentColor" stroke="none"/>
      </svg>
    </span>
    <span class="rotate-hint__text">Daha iyi deneyim için <strong>telefonu yan çevirin</strong></span>
  `;
  if (isTouch) parent.appendChild(el);

  let intervalId: number | null = null;
  let hideTimeoutId: number | null = null;
  let initialTimeoutId: number | null = null;

  function isPortrait(): boolean {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function")
      return false;
    return window.matchMedia("(orientation: portrait)").matches;
  }

  function clearHideTimeout(): void {
    if (hideTimeoutId !== null) {
      window.clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
  }

  function hideNow(): void {
    clearHideTimeout();
    el.classList.remove("is-visible");
  }

  function show(): void {
    /** Yatayda hiç gösterme — kullanıcı zaten doğru konumda. */
    if (!isPortrait()) {
      hideNow();
      return;
    }
    clearHideTimeout();
    el.classList.add("is-visible");
    hideTimeoutId = window.setTimeout(() => {
      el.classList.remove("is-visible");
      hideTimeoutId = null;
    }, visibleMs);
  }

  /**
   * Orientation değişiminde anında tepki ver — yatay moda dönülürse
   * banner görünür durumda kalmasın.
   */
  const onOrientationChange = (): void => {
    if (!isPortrait()) hideNow();
  };
  let mql: MediaQueryList | null = null;

  return {
    start() {
      if (!isTouch) return;
      if (intervalId !== null) return;
      initialTimeoutId = window.setTimeout(show, initialDelayMs);
      intervalId = window.setInterval(show, intervalMs);
      /** Orientation değişimlerini dinle — yatay olunca anında gizle. */
      if (typeof window.matchMedia === "function") {
        mql = window.matchMedia("(orientation: portrait)");
        if (typeof mql.addEventListener === "function") {
          mql.addEventListener("change", onOrientationChange);
        } else if (typeof mql.addListener === "function") {
          mql.addListener(onOrientationChange);
        }
      }
    },
    stop() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      if (initialTimeoutId !== null) {
        window.clearTimeout(initialTimeoutId);
        initialTimeoutId = null;
      }
      hideNow();
      if (mql) {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", onOrientationChange);
        } else if (typeof mql.removeListener === "function") {
          mql.removeListener(onOrientationChange);
        }
        mql = null;
      }
    },
    dispose() {
      if (intervalId !== null) window.clearInterval(intervalId);
      if (initialTimeoutId !== null) window.clearTimeout(initialTimeoutId);
      clearHideTimeout();
      if (mql) {
        if (typeof mql.removeEventListener === "function") {
          mql.removeEventListener("change", onOrientationChange);
        } else if (typeof mql.removeListener === "function") {
          mql.removeListener(onOrientationChange);
        }
        mql = null;
      }
      el.remove();
    },
  };
}
