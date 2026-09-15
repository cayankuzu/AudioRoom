import { startExperience } from "./gameLoop";
import { createBrandFooter } from "../ui/brandFooter";
import { createStartOverlay } from "../ui/startOverlay";
import { bindExperienceGate } from "../../../../shared/app/experienceGate";
import { readInputDeviceProfile } from "../../../../shared/app/inputDeviceProfile";
import { createDesktopOnlyGate } from "../../../../shared/ui/desktopOnlyGate";
import {
  isFullscreen,
  isFullscreenSupported,
  requestFullscreen,
  tryHideMobileAddressBar,
} from "../utils/fullscreen";

const APP_VERSION = "v1.4.2";

export function bootstrapApp(root: HTMLElement): void {
  root.innerHTML = "";

  if (readInputDeviceProfile().isTouchOnly) {
    createDesktopOnlyGate(root, {
      title: "Kuantum Dolanıklığı",
      description: "Ölçüm ve hareket sistemi hassas klavye-fare kontrolü gerektirir.",
    });
    return;
  }

  const container = document.createElement("div");
  container.id = "experience";
  container.style.position = "fixed";
  container.style.inset = "0";
  root.appendChild(container);

  const experience = startExperience(container);
  const overlay = createStartOverlay(document.body);

  bindExperienceGate({
    overlay,
    experience,
    touchSupport: "precision-input-required",
    fullscreen: {
      isFullscreen,
      isFullscreenSupported,
      requestFullscreen,
      tryHideMobileAddressBar,
    },
  });

  createBrandFooter(document.body, APP_VERSION);
}
