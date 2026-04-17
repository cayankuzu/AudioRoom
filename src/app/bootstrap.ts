import { EXPERIENCE_CATALOG } from "../config/experienceCatalog";
import { createBrandFooter } from "../ui/brandFooter";
import { createEntryHub } from "../ui/entryHub";
import { createRotateHint } from "../ui/rotateHint";
import { startExperience } from "./gameLoop";

/** Kütüphane → seçilen içerik → 3B deneyim (`startOverlay` + geri: sayfa yenileme). */
export function bootstrapApp(root: HTMLElement): void {
  root.innerHTML = "";
  /**
   * Rotate hint — uygulamanın tamamında (kütüphane + deneyim) ortak
   * periyodik banner olarak `document.body` seviyesinde mount edilir.
   *  - Her 5 sn bir portrait modda fade-in/out gösterilir.
   *  - Yatay çevrildiğinde anında gizlenir, tekrar çıkmaz.
   *  - pc-hint-banner ile zaman çakışması olmasın diye 2.5 sn faz farkı
   *    verilir (initialDelayMs). Böylece üst-orta pill'ler ardışık çıkar.
   *  - PC'de hiç oluşturulmaz (modül içinden bail-out).
   */
  const rotateHint = createRotateHint(document.body, {
    initialDelayMs: 2500,
    intervalMs: 5000,
    visibleMs: 2400,
  });
  rotateHint.start();

  /**
   * Brand footer — tüm uygulama (library + experience) boyunca alt-orta
   * kalıcı imza. `document.body`'ye bağlanır → sayfa yenilenmeden hub'dan
   * deneyime geçiş sırasında da görünür kalır.
   *
   * - Desktop'ta tam görünür.
   * - Mobilde kütüphane + start-overlay anlarında görünür; deneyim aktifken
   *   (d-pad/aksiyon bar alt köşeleri dolduruyor) CSS ile gizlenir.
   */
  createBrandFooter(document.body);

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
