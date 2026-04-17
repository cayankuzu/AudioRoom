import { startExperience } from "./gameLoop";

/**
 * Uygulama girişi — doğrudan deneyime gir.
 *
 * Onboarding ve ilk user-gesture artık `startOverlay` üzerinden alınır
 * (tam ekran, Türkçe bilgilendirme + kontroller). Ayrı bir "landing page"
 * katmanı yok: oyuncu sahneye girer, overlay'i okur, tıklar ve başlar.
 */
export function bootstrapApp(root: HTMLElement): void {
  root.innerHTML = "";
  const container = document.createElement("div");
  container.id = "experience";
  root.appendChild(container);
  startExperience(container);
}
