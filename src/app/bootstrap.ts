import { EXPERIENCE_CATALOG } from "../config/experienceCatalog";
import { createEntryHub } from "../ui/entryHub";
import { createRotateHint } from "../ui/rotateHint";
import { startExperience } from "./gameLoop";

/** Kütüphane → seçilen içerik → 3B deneyim (`startOverlay` + geri: sayfa yenileme). */
export function bootstrapApp(root: HTMLElement): void {
  root.innerHTML = "";
  /**
   * Rotate hint — uygulamanın tamamında (kütüphane + deneyim) ortak
   * üst banner olarak `document.body` seviyesinde mount edilir. Dokunmatik
   * dikey modda görünür, yatay çevrilince otomatik gizlenir. PC'de hiç
   * oluşturulmaz (modül içinden bail-out).
   */
  const rotateHint = createRotateHint(document.body);
  rotateHint.attach();

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
