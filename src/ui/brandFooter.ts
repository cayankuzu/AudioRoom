/**
 * Alt ortada duran minimal imza:
 *
 *   © 2026 · Powered by MeMoDe
 *
 * Sahneye müdahale etmez; düşük opaklık, küçük punto, pointer-events
 * kapalı (oyun etkileşimini engellemez). Mobilde de görünür ama biraz
 * daha sıkışık bir hizada kalır (CSS ile kontrol edilir).
 */
export interface BrandFooter {
  dispose(): void;
}

export function createBrandFooter(parent: HTMLElement): BrandFooter {
  const el = document.createElement("div");
  el.className = "brand-footer";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `
    <span class="brand-footer__copy">© 2026</span>
    <span class="brand-footer__sep" aria-hidden="true">·</span>
    <span class="brand-footer__by">Powered by <strong>MeMoDe</strong></span>
  `;
  parent.appendChild(el);

  return {
    dispose() {
      el.remove();
    },
  };
}
