export interface PcHintBanner {
  /** Periyodik görünürlüğü başlat (her 10 sn'de bir fade-in/out). */
  start(): void;
  /** Timer'ı durdur ve banner'ı anında gizle. */
  stop(): void;
  /** Root'u DOM'dan kaldır ve tüm timer'ları temizle. */
  dispose(): void;
}

export interface PcHintBannerOptions {
  /** Göründüğünde ekranda kaç ms kalsın? (fade'lar hariç) */
  visibleMs?: number;
  /** Gösterimler arası aralık (görünür süre dahil). */
  intervalMs?: number;
}

/**
 * Mobilde "Daha iyi deneyim için bilgisayardan girin" pulse banner.
 * Üst orta, safe-area farkında; her `intervalMs` bir görünür olur, kısa
 * süre sonra tekrar kaybolur. Canvas + input akışını etkilemez
 * (pointer-events: none).
 */
export function createPcHintBanner(
  parent: HTMLElement,
  opts: PcHintBannerOptions = {},
): PcHintBanner {
  const visibleMs = opts.visibleMs ?? 3200;
  const intervalMs = opts.intervalMs ?? 10000;

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
      if (intervalId !== null) return;
      /** İlk gösterim biraz gecikmeli — oyun başlar başlamaz rahatsız etmesin. */
      window.setTimeout(show, 1800);
      intervalId = window.setInterval(show, intervalMs);
    },
    stop() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
      clearHideTimeout();
      el.classList.remove("is-visible");
    },
    dispose() {
      if (intervalId !== null) window.clearInterval(intervalId);
      clearHideTimeout();
      el.remove();
    },
  };
}
