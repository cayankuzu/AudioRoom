/**
 * Alt-orta minimal imza — Redd / Henry the Lee birebir.
 *
 *   © 2026 · Powered by MeMoDe
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
  return { dispose() { el.remove(); } };
}
