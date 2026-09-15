import { createBrandFooter } from "../ui/brandFooter";
import { createLoadingOverlay } from "../ui/loadingOverlay";
import { createStartOverlay } from "../ui/startOverlay";
import { bindExperienceGate } from "../../../../shared/app/experienceGate";
import {
  isFullscreen,
  isFullscreenSupported,
  requestFullscreen,
  tryHideMobileAddressBar,
} from "../utils/fullscreen";
import { startExperience } from "./gameLoop";

const APP_VERSION = "v2.4.4";

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

  createBrandFooter(document.body, APP_VERSION);

  const loader = createLoadingOverlay(document.body);
  loader.show();

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const container = document.createElement("div");
      container.id = "experience";
      container.style.position = "fixed";
      container.style.inset = "0";
      root.appendChild(container);
      try {
        const experience = startExperience(container);
        const overlay = createStartOverlay(document.body);

        bindExperienceGate({
          overlay,
          experience,
          fullscreen: {
            isFullscreen,
            isFullscreenSupported,
            requestFullscreen,
            tryHideMobileAddressBar,
          },
        });
      } finally {
        window.requestAnimationFrame(() => {
          window.setTimeout(() => loader.hide(), 200);
        });
      }
    });
  });
}
