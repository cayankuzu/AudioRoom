export interface RotateHint {
  start(): void;
  stop(): void;
  dispose(): void;
}

export interface RotateHintOptions {
  visibleMs?: number;
  intervalMs?: number;
  initialDelayMs?: number;
}

export function createRotateHint(
  parent: HTMLElement,
  opts: RotateHintOptions = {},
): RotateHint {
  const visibleMs = opts.visibleMs ?? 3000;
  const intervalMs = opts.intervalMs ?? 6000;
  const initialDelayMs = opts.initialDelayMs ?? 2500;

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
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
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

  const onOrientationChange = (): void => {
    if (!isPortrait()) hideNow();
  };
  let mql: MediaQueryList | null = null;

  return {
    start() {
      if (!isTouch) return;
      if (intervalId !== null || initialTimeoutId !== null) return;
      initialTimeoutId = window.setTimeout(() => {
        initialTimeoutId = null;
        show();
        intervalId = window.setInterval(show, intervalMs);
      }, initialDelayMs);

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
