export interface LoadingOverlay {
  /** Overlay'i DOM'a ekle ve fade-in animasyonunu başlat. */
  show(): void;
  /** Fade-out ile gizle ve kısa bekleyişten sonra DOM'dan kaldır. */
  hide(): void;
  /** Hemen DOM'dan kaldır (animasyon beklemeden). */
  dispose(): void;
}

export interface LoadingOverlayOptions {
  /** Merkezde görünecek başlık. */
  title?: string;
  /** Başlığın altındaki açıklama. */
  subtitle?: string;
}

/**
 * Tam ekran yükleme perdesi — kullanıcı kütüphaneden bir deneyim
 * seçtikten sonra 3B sahne mount edilene kadar kısa bir süre "donmuş"
 * hissi yaşanır. Bu overlay o süre boyunca:
 *   - Tüm ekranı kapatır (z-index: 9999)
 *   - Merkez spinner + başlık + ince progress bar gösterir
 *   - pointer-events: auto → kazara başka bir şeye tıklanması önlenir
 *
 * CSS tarafında `.loading-overlay` kuralı bulunur; fade-in/out için
 * `.is-visible` sınıfını toggle'lar. Safe-area farkındadır; mobilde
 * notch/home-indicator altında kalmaz.
 */
export function createLoadingOverlay(
  parent: HTMLElement,
  opts: LoadingOverlayOptions = {},
): LoadingOverlay {
  const title = opts.title ?? "Mükemmel Boşluk hazırlanıyor";
  const subtitle = opts.subtitle ?? "Plaklar dünyaya dağıtılıyor…";

  const el = document.createElement("div");
  el.className = "loading-overlay";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.setAttribute("aria-busy", "true");
  el.innerHTML = `
    <div class="loading-overlay__panel">
      <div class="loading-overlay__spinner" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="64" height="64" fill="none">
          <circle cx="32" cy="32" r="26" stroke="rgba(244, 214, 117, 0.15)" stroke-width="3"/>
          <circle class="loading-overlay__spinner-arc" cx="32" cy="32" r="26" stroke="#f4d675" stroke-width="3" stroke-linecap="round" stroke-dasharray="40 140" transform="rotate(-90 32 32)"/>
        </svg>
      </div>
      <h3 class="loading-overlay__title">${escapeHtml(title)}</h3>
      <p class="loading-overlay__subtitle">${escapeHtml(subtitle)}</p>
      <div class="loading-overlay__bar" aria-hidden="true">
        <div class="loading-overlay__bar-fill"></div>
      </div>
    </div>
  `;

  let hideTimeoutId: number | null = null;
  let removed = false;

  function clearHideTimeout(): void {
    if (hideTimeoutId !== null) {
      window.clearTimeout(hideTimeoutId);
      hideTimeoutId = null;
    }
  }

  return {
    show() {
      if (removed) return;
      if (!el.isConnected) parent.appendChild(el);
      /** Bir sonraki frame'de `.is-visible` ekle → CSS transition tetiklensin. */
      window.requestAnimationFrame(() => {
        el.classList.add("is-visible");
      });
    },
    hide() {
      if (removed) return;
      clearHideTimeout();
      el.classList.remove("is-visible");
      /** Fade-out süresinin sonunda DOM'dan kaldır — sahne akışını tıkamasın. */
      hideTimeoutId = window.setTimeout(() => {
        if (el.isConnected) el.remove();
        removed = true;
        hideTimeoutId = null;
      }, 420);
    },
    dispose() {
      clearHideTimeout();
      if (el.isConnected) el.remove();
      removed = true;
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
