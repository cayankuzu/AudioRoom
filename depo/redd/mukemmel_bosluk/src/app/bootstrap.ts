import { createBrandFooter } from "../ui/brandFooter";
import { createLoadingOverlay } from "../ui/loadingOverlay";
import { createRotateHint } from "../ui/rotateHint";
import { startExperience } from "./gameLoop";

/**
 * AudioRoom kök hub'ından bu sayfaya gelindiğinde **ara kütüphane yok**:
 * doğrudan 3B deneyim kurulur (içerideki `startOverlay` hâlâ pointer-lock +
 * ilk ses için bir kullanıcı tıklaması ister — tarayıcı politikası).
 *
 * Önceki akış: entryHub → kart seç → deneyim. Şimdi: yükleme perdesi →
 * `startExperience` aynı anda hub'daki albüm tıklamasıyla.
 */
export function bootstrapApp(root: HTMLElement): void {
  root.innerHTML = "";

  const rotateHint = createRotateHint(document.body, {
    initialDelayMs: 2500,
    intervalMs: 5000,
    visibleMs: 2400,
  });
  rotateHint.start();

  createBrandFooter(document.body);

  const loader = createLoadingOverlay(document.body);
  loader.show();

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const container = document.createElement("div");
      container.id = "experience";
      root.appendChild(container);
      try {
        startExperience(container);
      } finally {
        window.requestAnimationFrame(() => {
          window.setTimeout(() => loader.hide(), 200);
        });
      }
    });
  });
}
