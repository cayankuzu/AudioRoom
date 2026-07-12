export interface PcHintBanner {
  start(): void;
  stop(): void;
  dispose(): void;
}

export interface PcHintBannerOptions {
  visibleMs?: number;
  intervalMs?: number;
}

export function createPcHintBanner(
  parent: HTMLElement,
  opts: PcHintBannerOptions = {},
): PcHintBanner {
  const visibleMs = opts.visibleMs ?? 3000;
  const intervalMs = opts.intervalMs ?? 6000;

  const el = document.createElement("div");
  el.className = "pc-hint-banner";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `
    <span class="pc-hint-banner__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
        <rect x="2.5" y="4" width="19" height="12" rx="1.5"/>
        <path d="M8 20h8M10 17l-0.5 3M14 17l0.5 3"/>
      </svg>
    </span>
    <span class="pc-hint-banner__text">Daha iyi deneyim için <strong>bilgisayardan</strong> girin</span>
  `;
  parent.appendChild(el);

  let intervalId: number | null = null;
  let hideTimeoutId: number | null = null;
  let initialTimeoutId: number | null = null;

  function clearHideTimeout(): void {
    if (hideTimeoutId !== null) {
      window.clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
  }

  function show(): void {
    clearHideTimeout();
    el.classList.add("is-visible");
    hideTimeoutId = window.setTimeout(() => {
      el.classList.remove("is-visible");
      hideTimeoutId = null;
    }, visibleMs);
  }

  return {
    start() {
      if (intervalId !== null || initialTimeoutId !== null) return;
      initialTimeoutId = window.setTimeout(() => {
        initialTimeoutId = null;
        show();
        intervalId = window.setInterval(show, intervalMs);
      }, 1200);
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
      clearHideTimeout();
      el.classList.remove("is-visible");
    },
    dispose() {
      if (intervalId !== null) window.clearInterval(intervalId);
      if (initialTimeoutId !== null) window.clearTimeout(initialTimeoutId);
      clearHideTimeout();
      el.remove();
    },
  };
}
