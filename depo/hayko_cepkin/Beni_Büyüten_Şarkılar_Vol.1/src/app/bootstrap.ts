import { startExperience } from "./gameLoop";
import { createBrandFooter } from "../ui/brandFooter";

/**
 * "Tıkla → kilitlen → gez" akışı. Redd / Henry the Lee paneli ile birebir
 * uyumlu — sadece aksan rengi (ember turuncu) ve kopya farklı.
 *
 * UI katmanları:
 *  - .start-overlay   → ilk giriş (is-first) + ESC sonrası pause (is-pause)
 *  - .hud             → sol üst kontroller (M/K)
 *  - .minimap         → sol alt kuşbakışı radar
 *  - .interaction-hint→ alt orta proximity prompt (rezerv)
 *  - .brand-footer    → alt orta minimal ©
 */
export function bootstrapApp(root: HTMLElement): void {
  root.innerHTML = "";

  const container = document.createElement("div");
  container.id = "experience";
  container.style.position = "fixed";
  container.style.inset = "0";
  root.appendChild(container);

  const exp = startExperience(container);

  /** ── Start overlay (intro + pause iki kart) ─────────────────────── */
  const overlay = document.createElement("div");
  overlay.className = "start-overlay is-first";
  overlay.innerHTML = `
    <article class="start-overlay__card start-overlay__card--intro" data-card="intro" role="button" tabindex="0">
      <p class="start-overlay__kicker">Hayko Cepkin</p>
      <h2>Beni Büyüten Şarkılar Vol.1</h2>
      <p class="start-overlay__desc">
        Kor halka içinde süzülen bir bebek. Etrafında damarlar nabız atıyor;
        rahmin içinde plaklar süzülür. <strong>WASD</strong> ile dolaş,
        <strong>E</strong> ile plak topla, gramofona tak ve
        <strong>Beni Büyüten Şarkılar</strong>'ı dinle.
      </p>
      <div class="start-overlay__controls">
        <div class="start-overlay__ctrl"><span>WASD</span><em>Yürü</em></div>
        <div class="start-overlay__ctrl"><span>SHIFT</span><em>Koş</em></div>
        <div class="start-overlay__ctrl"><span>SPACE</span><em>Zıpla</em></div>
        <div class="start-overlay__ctrl"><span>FARE</span><em>Bakış</em></div>
        <div class="start-overlay__ctrl"><span>E</span><em>Plak al · gramofon</em></div>
        <div class="start-overlay__ctrl"><span>R</span><em>Müzik başlat / dur</em></div>
        <div class="start-overlay__ctrl"><span>Q</span><em>Elindekini bırak</em></div>
        <div class="start-overlay__ctrl"><span>M / P / K</span><em>Harita · Panel · Kontroller</em></div>
      </div>
      <button type="button" class="start-overlay__cta" data-start>EVRENE GİR</button>
    </article>
    <article class="start-overlay__card start-overlay__card--pause" data-card="pause" role="button" tabindex="0">
      <p class="start-overlay__kicker">Duraklatıldı</p>
      <h2>Devam etmek için tıklayın</h2>
      <p class="start-overlay__desc">
        Haritayı ve kontrolleri açıkken kullanabilirsiniz.
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

  overlay.addEventListener("click", () => {
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
      overlay.classList.remove("is-hidden");
      overlay.classList.toggle("is-first", !hasStartedOnce);
      overlay.classList.toggle("is-pause", hasStartedOnce);
      document.body.classList.add("is-overlay-open");
    }
  });

  /** ── Brand footer (alt orta) ─────────────────────────────────────── */
  createBrandFooter(document.body);
}
