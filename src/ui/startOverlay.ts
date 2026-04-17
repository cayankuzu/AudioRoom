export interface StartOverlay {
  element: HTMLElement;
  show(): void;
  hide(): void;
  onStart(cb: () => void): void;
  /** Overlay şu an ekranda mı? */
  isVisible(): boolean;
  dispose(): void;
}

/**
 * İki modlu başlangıç / duraklama ekranı:
 *  - İlk açılış: zengin onboarding — başlık, kural, kontroller, CTA
 *  - ESC sonrası: sade "devam et" kartı
 *
 * İlk tıklama:
 *  - pointer-lock için user-gesture sağlar
 *  - audio politikalarını açar (ancak müzik yalnız plak takıldığında başlar)
 *  - deneyimi başlatır
 */
export function createStartOverlay(parent: HTMLElement): StartOverlay {
  const el = document.createElement("div");
  el.className = "start-overlay is-first";
  el.innerHTML = `
    <div class="start-overlay__card start-overlay__card--intro" data-card="intro">
      <p class="start-overlay__kicker">REDD · MÜKEMMEL BOŞLUK</p>
      <h2>Mükemmel Boşluk Deneyimi</h2>
      <p class="start-overlay__desc">
        Plaklar dünyaya dağılmış durumda.<br/>
        Onları bulup gramofona takarak dinleyebilirsiniz.<br/>
        Tüm plakları toplayarak albümü tamamlayabilirsiniz.
      </p>
      <div class="start-overlay__controls" role="group" aria-label="Kontroller">
        <div class="start-overlay__ctrl"><span>WASD</span><em>Yürü</em></div>
        <div class="start-overlay__ctrl"><span>Fare</span><em>Bak</em></div>
        <div class="start-overlay__ctrl"><span>E</span><em>Etkileşim</em></div>
        <div class="start-overlay__ctrl"><span>F</span><em>Fener</em></div>
        <div class="start-overlay__ctrl"><span>Y</span><em>Gramofonu Taşı</em></div>
        <div class="start-overlay__ctrl"><span>Shift</span><em>Koş</em></div>
      </div>
      <button type="button" class="start-overlay__cta" data-start>Başlamak için tıklayın</button>
      <p class="start-overlay__note">Gramofona plak takılmadan müzik başlamaz.</p>
    </div>
    <div class="start-overlay__card start-overlay__card--pause" data-card="pause">
      <p class="start-overlay__kicker">Duraklatıldı</p>
      <h2>Devam etmek için tıklayın</h2>
      <p class="start-overlay__desc">
        Deneyime kaldığınız yerden geri dönebilirsiniz.
      </p>
      <button type="button" class="start-overlay__cta" data-start>Devam Et</button>
    </div>
  `;
  parent.appendChild(el);

  let handler: (() => void) | null = null;
  let hasStartedOnce = false;
  let visible = true;

  /**
   * Overlay üzerindeki HER tıklama start'ı tetikler — kullanıcıya maksimum
   * tolerans. Ancak CTA butonu odakta kalsın ve klavye (Enter) çalışsın diye
   * butona ayrı dinleyici de verilir.
   */
  const onClick = (e: Event): void => {
    e.stopPropagation();
    if (!visible) return;
    handler?.();
  };
  el.addEventListener("click", onClick);

  /** Enter / Space — klavyeyle de başlat. */
  const onKey = (e: KeyboardEvent): void => {
    if (!visible) return;
    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      handler?.();
    }
  };
  document.addEventListener("keydown", onKey);

  return {
    element: el,
    isVisible: () => visible,
    show() {
      if (hasStartedOnce) {
        el.classList.remove("is-first");
        el.classList.add("is-pause");
      } else {
        el.classList.add("is-first");
        el.classList.remove("is-pause");
      }
      el.classList.remove("is-hidden");
      visible = true;
    },
    hide() {
      if (!hasStartedOnce) hasStartedOnce = true;
      el.classList.add("is-hidden");
      visible = false;
    },
    onStart(cb) {
      handler = cb;
    },
    dispose() {
      document.removeEventListener("keydown", onKey);
      el.remove();
    },
  };
}
