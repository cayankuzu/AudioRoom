export interface BrandFooter {
  dispose(): void;
}

export function createBrandFooter(parent: HTMLElement): BrandFooter {
  const element = document.createElement("div");
  element.className = "brand-footer";
  element.setAttribute("aria-hidden", "true");
  element.innerHTML = `
    <span class="brand-footer__copy">© 2026</span>
    <span class="brand-footer__sep" aria-hidden="true">·</span>
    <span class="brand-footer__by">Powered by <strong>MeMoDe</strong></span>
  `;

  parent.appendChild(element);

  return {
    dispose() {
      element.remove();
    },
  };
}
