import { prefersReducedMotion } from "../../engine/core/device";

/**
 * Kapağın içine giriş: kapak görseli ekranı doldurana kadar büyür, sonra evren
 * sayfası açılır. Hareket azaltma tercihinde doğrudan geçilir.
 */
export function enterWorld(href: string, source: HTMLImageElement | null): void {
  if (!source || prefersReducedMotion()) {
    window.location.href = href;
    return;
  }
  const rect = source.getBoundingClientRect();
  const layer = document.createElement("div");
  layer.className = "hub-portal";
  const image = source.cloneNode() as HTMLImageElement;
  image.className = "hub-portal__cover";
  Object.assign(image.style, {
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  layer.appendChild(image);
  document.body.appendChild(layer);
  const scale = (Math.max(window.innerWidth, window.innerHeight) / Math.min(rect.width, rect.height)) * 1.4;
  const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
  const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
  requestAnimationFrame(() => {
    image.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    layer.classList.add("is-active");
  });
  window.setTimeout(() => {
    window.location.href = href;
  }, 700);
  // Geri tuşuyla sayfaya dönülürse katman kalmasın.
  window.addEventListener("pageshow", () => layer.remove(), { once: true });
}
