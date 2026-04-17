import { EXPERIENCE_CATALOG } from "../config/experienceCatalog";
import { createEntryHub } from "../ui/entryHub";
import { startExperience } from "./gameLoop";

/** Kütüphane → seçilen içerik → 3B deneyim (`startOverlay` + geri: sayfa yenileme). */
export function bootstrapApp(root: HTMLElement): void {
  root.innerHTML = "";
  const hub = createEntryHub(root, EXPERIENCE_CATALOG);
  hub.onLaunch((id) => {
    if (id !== "mukemmel-bosluk") return;
    hub.dispose();
    const container = document.createElement("div");
    container.id = "experience";
    root.appendChild(container);
    startExperience(container);
  });
}
