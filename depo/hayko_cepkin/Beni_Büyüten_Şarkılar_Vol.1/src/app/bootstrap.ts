import { startExperience } from "./gameLoop";
import { createBrandFooter } from "../ui/brandFooter";
import { createStartOverlay } from "../ui/startOverlay";
import { bindExperienceGate } from "../../../../shared/app/experienceGate";
import {
  isFullscreen,
  isFullscreenSupported,
  requestFullscreen,
  tryHideMobileAddressBar,
} from "../utils/fullscreen";

export function bootstrapApp(root: HTMLElement): void {
  root.innerHTML = "";

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

  createBrandFooter(document.body);
}
