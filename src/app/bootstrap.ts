import { EXPERIENCE_CATALOG } from "../config/experienceCatalog";
import { createBrandFooter } from "../ui/brandFooter";
import { createEntryHub } from "../ui/entryHub";
import { createLoadingOverlay } from "../ui/loadingOverlay";
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
    /**
     * Loading overlay — 3B sahnenin kurulumu (shader compile, geometry,
     * texture vs.) telefonlarda 0.5-1.5 sn sürebilir. Bu süre boyunca
     * kullanıcı beyaz/sabit bir ekran görür ve "tıklandı mı?" hissi
     * yaşar. Loading perdesi hemen görünür, sahne mount olup ilk frame
     * render edildikten sonra fade-out ile kaybolur.
     *
     * Akış:
     *  1. Overlay DOM'a eklenir ve bir sonraki frame'de fade-in başlar.
     *  2. İki RAF sonrası (tarayıcı paint garantisi) ağır iş başlar:
     *     hub.dispose() + container.append() + startExperience().
     *  3. startExperience senkron döner; bir RAF daha bekleyip sahnenin
     *     ilk kare render etmesine fırsat veririz, sonra overlay'i
     *     kısa bir kibar gecikmeyle (200 ms) gizleriz.
     */
    const loader = createLoadingOverlay(document.body);
    loader.show();

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        hub.dispose();
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
  });
}
