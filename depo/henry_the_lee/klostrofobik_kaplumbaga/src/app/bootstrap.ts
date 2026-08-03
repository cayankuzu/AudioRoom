import { bindExperienceGate } from "../../../../shared/app/experienceGate";
import { createBrandFooter } from "../../../../shared/ui/brandFooter";
import { startExperience } from "./gameLoop";
import { createLoadingOverlay } from "../ui/loadingOverlay";
import { createStartOverlay } from "../ui/startOverlay";
import {
  isFullscreen,
  isFullscreenSupported,
  requestFullscreen,
  tryHideMobileAddressBar,
} from "../utils/fullscreen";
import { isBlockedMobileDevice } from "../systems/performanceManager";

const APP_VERSION = "v1.2.0";

declare global {
  interface Window {
    __audioroomCleanup?: () => void;
  }
}

export function bootstrapApp(root: HTMLElement): void {
  window.__audioroomCleanup?.();
  root.innerHTML = "";

  if (isBlockedMobileDevice()) {
    document.body.classList.add("is-mobile-blocked");
    const blocker = document.createElement("main");
    blocker.className = "desktop-only-gate";
    blocker.innerHTML = `
      <div class="desktop-only-gate__signal" aria-hidden="true"><i></i><i></i><i></i></div>
      <section class="desktop-only-gate__card">
        <span class="desktop-only-gate__eyebrow">MASAÜSTÜ DENEYİMİ</span>
        <h1>Klostrofobik<br />Kaplumbağa</h1>
        <p>Bu oyun klavye, fare ve masaüstü donanımı için hazırlandı.</p>
        <strong>Lütfen bilgisayardaki bir web tarayıcısından girin.</strong>
        <a href="../../../">AudioRoom'a dön</a>
      </section>
    `;
    root.appendChild(blocker);
    window.__audioroomCleanup = () => {
      blocker.remove();
      root.innerHTML = "";
      document.body.classList.remove("is-mobile-blocked");
      delete window.__audioroomCleanup;
    };
    return;
  }

  const container = document.createElement("div");
  container.id = "experience";
  root.appendChild(container);

  const footer = createBrandFooter(document.body, APP_VERSION);
  const loading = createLoadingOverlay(document.body);
  const experience = startExperience(container, {
    onProgress: (value, detail) => loading.setProgress(value, detail),
  });
  const overlay = createStartOverlay(document.body);
  const unbindGate = bindExperienceGate({
    overlay,
    experience,
    fullscreen: {
      isFullscreen,
      isFullscreenSupported,
      requestFullscreen,
      tryHideMobileAddressBar,
    },
  });

  void experience.ready.finally(() => {
    window.setTimeout(() => loading.hide(), 180);

    // Yalnızca Vite geliştirme sunucusunda görsel QA durumları üretir.
    // Üretim derlemesinde bu blok kaldırılır; normal oyuncu akışı değişmez.
    if (import.meta.env.DEV) {
      const qaMode = new URLSearchParams(window.location.search).get("qa");
      if (qaMode) {
        if (qaMode === "pause") {
          overlay.show("pause");
        } else {
          overlay.hide();
        }

        const hitCount =
          qaMode === "walking"
            ? 3
            : qaMode === "stopped" || qaMode === "victory"
              ? 6
              : 0;
        for (let hitIndex = 0; hitIndex < hitCount; hitIndex += 1) {
          window.__klostrofobikDebug?.hitBunny();
        }
        if (qaMode === "victory") {
          window.__klostrofobikDebug?.captureRecord();
          window.__klostrofobikDebug?.insertRecord();
          document.body.classList.add("is-qa-victory");
        }
        if (qaMode === "stolen") {
          window.__klostrofobikDebug?.captureRecord();
          window.__klostrofobikDebug?.stealGramophone();
        }
        if (qaMode === "carrot") {
          window.__klostrofobikDebug?.fire();
        }
        if (qaMode === "burrow") {
          window.__klostrofobikDebug?.triggerBurrow();
        }
        if (
          qaMode === "target" ||
          qaMode === "walking" ||
          qaMode === "stopped" ||
          qaMode === "stolen" ||
          qaMode === "burrow"
        ) {
          window.__klostrofobikDebug?.focusBunny();
        }
        window.setTimeout(() => {
          const snapshot = window.__klostrofobikDebug?.snapshot();
          if (snapshot) {
            document.documentElement.dataset.qaSnapshot = JSON.stringify(snapshot);
          }
        }, 900);
      }
    }
  });

  window.__audioroomCleanup = () => {
    unbindGate();
    overlay.dispose();
    loading.dispose();
    footer.dispose();
    experience.dispose();
    root.innerHTML = "";
    delete window.__audioroomCleanup;
  };
}
