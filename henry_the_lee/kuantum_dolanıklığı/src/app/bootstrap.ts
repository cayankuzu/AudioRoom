import { startExperience } from "./gameLoop";
import { createHud } from "../ui/hud";
import { createBrandFooter } from "../ui/brandFooter";

/**
 * "Tıkla → kilitlen → gez" akışı. Redd · Mükemmel Boşluk paneli
 * birebir uyumlu — sadece aksan rengi (#f3c012) ve kopya farklı.
 *
 * UI katmanları:
 *  - .start-overlay   → ilk giriş (is-first) + ESC sonrası pause (is-pause)
 *  - .hud             → sol üst kontroller paneli (collapsible)
 *  - .minimap         → sol alt kuşbakışı radar (gameLoop'tan attach)
 *  - .interaction-hint→ alt orta proximity prompt (gameLoop yönetir)
 *  - .measurement-pill→ üst orta KONUM/HIZ snapshot (gameLoop yönetir)
 *  - .brand-footer    → alt orta minimal ©
 *  - .kd-overlay-mount→ kedi nameplate gibi 3D-anchored overlay'ler
 *
 * ESC mantığı (Redd birebir):
 *  - İlk açılış: zengin "intro" kartı, full backdrop, tek tıkla başlar.
 *  - Pointer-lock release (ESC) → "pause" kartı; backdrop SAYDAM ve
 *    overlay `pointer-events: none`, sadece pause kartı tıklanabilir.
 *    Böylece arka plandaki Album/Map/HUD paneller kullanılabilir kalır.
 *  - Pause kartına tıklayınca yeniden lock alınır → overlay gizlenir.
 */
export function bootstrapApp(root: HTMLElement): void {
  root.innerHTML = "";

  const container = document.createElement("div");
  container.id = "experience";
  container.style.position = "fixed";
  container.style.inset = "0";
  root.appendChild(container);

  const exp = startExperience(container);

  /** ── Start overlay (Redd-style: intro + pause iki kart) ───────── */
  const overlay = document.createElement("div");
  overlay.className = "start-overlay is-first";
  overlay.innerHTML = `
    <article class="start-overlay__card start-overlay__card--intro" data-card="intro" role="button" tabindex="0">
      <p class="start-overlay__kicker">Henry the Lee</p>
      <h2>Kuantum Dolanıklık</h2>
      <p class="start-overlay__desc">
        Boşlukta süzülen bir plak. <strong>K</strong> ile konumunu,
        <strong>H</strong> ile hızını ölçebilirsin — fakat asla aynı anda.
        Heisenberg sınırı içinde plağı bulup gramofona yerleştir.
      </p>
      <div class="start-overlay__controls">
        <div class="start-overlay__ctrl"><span>WASD</span><em>Yürü</em></div>
        <div class="start-overlay__ctrl"><span>SHIFT</span><em>Koş</em></div>
        <div class="start-overlay__ctrl"><span>SPACE</span><em>Zıpla</em></div>
        <div class="start-overlay__ctrl"><span>FARE</span><em>Bakış</em></div>
        <div class="start-overlay__ctrl"><span>E</span><em>Al / Yerleştir</em></div>
        <div class="start-overlay__ctrl"><span>Q</span><em>Bırak</em></div>
        <div class="start-overlay__ctrl"><span>K</span><em>Konum ölç</em></div>
        <div class="start-overlay__ctrl"><span>H</span><em>Hız ölç</em></div>
      </div>
      <button type="button" class="start-overlay__cta" data-start>EVRENE GİR</button>
    </article>
    <article class="start-overlay__card start-overlay__card--pause" data-card="pause" role="button" tabindex="0">
      <p class="start-overlay__kicker">Duraklatıldı</p>
      <h2>Devam etmek için tıklayın</h2>
      <p class="start-overlay__desc">
        Albüm panelini, haritayı ve kontrolleri açıkken kullanabilirsiniz.
      </p>
      <button type="button" class="start-overlay__cta" data-start>DEVAM ET</button>
    </article>
  `;
  document.body.appendChild(overlay);
  document.body.classList.add("is-overlay-open");

  let hasStartedOnce = false;

  const requestStart = (): void => {
    exp.requestLock();
  };

  /** Tüm "start" tetikleyicileri: overlay kartlarına tıklama + CTA. */
  overlay.addEventListener("click", (ev) => {
    /** Overlay arka planına tıklamak da başlatır — Redd ile birebir. */
    const target = ev.target as HTMLElement | null;
    if (!target) {
      requestStart();
      return;
    }
    /**
     * Pause modundayken overlay'in kendisi pointer-events: none olduğu için
     * yalnız kartlar event üretir. Card içindeki herhangi tıklama → start.
     * Intro modunda da aynı şekilde her tıklama start tetikler.
     */
    requestStart();
  });

  document.addEventListener("keydown", (e) => {
    if (e.code !== "Enter" && e.code !== "Space") return;
    if (overlay.classList.contains("is-hidden")) return;
    e.preventDefault();
    requestStart();
  });

  exp.onLockChange((locked) => {
    if (locked) {
      overlay.classList.add("is-hidden");
      hasStartedOnce = true;
      document.body.classList.remove("is-overlay-open");
    } else {
      /** Bir kez başlatıldıysa pause kartı, değilse intro kartı. */
      overlay.classList.remove("is-hidden");
      overlay.classList.toggle("is-first", !hasStartedOnce);
      overlay.classList.toggle("is-pause", hasStartedOnce);
      document.body.classList.add("is-overlay-open");
    }
  });

  /** ── HUD (sol üst, kontroller paneli) ─────────────────────────── */
  createHud(document.body, { showLibraryBack: true, libraryHref: "../../" });

  /** ── Brand footer (alt orta) ──────────────────────────────────── */
  createBrandFooter(document.body);
}
