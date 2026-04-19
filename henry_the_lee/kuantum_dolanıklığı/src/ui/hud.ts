/**
 * Sol-üst kontroller paneli — Redd · Mükemmel Boşluk HUD birebir kopyası.
 * Sadece kuantum'a özel kısayolları (K = Konum, H = Hız) listeler.
 *
 * Davranış:
 *  - Collapsible: sağdaki "−" butonu paneli daraltır, "+" yapar.
 *  - "Kütüphane" butonu üst sol köşede — geri dönüş.
 *  - HUD'un kendisi pointer-events: auto, parent layer pointer-events: none.
 */

export interface HudOptions {
  /** "Kütüphane" geri dönüş butonu görünsün mü. */
  showLibraryBack?: boolean;
  /** Buton tıklandığında nereye yönlensin. Default: "../../" */
  libraryHref?: string;
}

export interface Hud {
  toggle(): void;
  isOpen(): boolean;
  dispose(): void;
}

export function createHud(parent: HTMLElement, options: HudOptions = {}): Hud {
  const hud = document.createElement("div");
  hud.className = "hud";
  const libraryHref = options.libraryHref ?? "../../";
  const libraryBtn = options.showLibraryBack
    ? `<button type="button" class="hud__library-btn" aria-label="Kütüphaneye dön" title="Kütüphaneye dön">
        <span class="hud__library-icon" aria-hidden="true">‹</span>
        <span class="hud__library-text">Kütüphane</span>
       </button>`
    : "";
  hud.innerHTML = `
    <header class="hud__head">
      ${libraryBtn}
      <div class="hud__head-text">
        <p class="hud__kicker">Kontroller</p>
      </div>
      <button class="hud__collapse" type="button" aria-label="Paneli küçült" title="Küçült">−</button>
    </header>
    <div class="hud__body">
      <div class="hud__row"><span>WASD / Oklar</span><em>Yürü</em></div>
      <div class="hud__row"><span>Shift</span><em>Koş</em></div>
      <div class="hud__row"><span>Boşluk</span><em>Zıpla</em></div>
      <div class="hud__row"><span>Fare</span><em>Bakış</em></div>
      <div class="hud__divider"></div>
      <div class="hud__row"><span>E</span><em>Plak / gramofonu al · plağı tak</em></div>
      <div class="hud__row"><span>Q</span><em>Elindekini bırak</em></div>
      <div class="hud__divider"></div>
      <div class="hud__row hud__row--hint"><span>K</span><em>Konum ölç</em></div>
      <div class="hud__row hud__row--hint"><span>H</span><em>Hız ölç</em></div>
      <div class="hud__divider"></div>
      <div class="hud__row hud__row--hint"><span>ESC</span><em>İmleci serbest bırak</em></div>
    </div>
  `;
  parent.appendChild(hud);

  const libBtn = hud.querySelector<HTMLButtonElement>(".hud__library-btn");
  const onLibraryClick = (e: MouseEvent) => {
    e.stopPropagation();
    document.exitPointerLock();
    window.location.href = libraryHref;
  };
  libBtn?.addEventListener("click", onLibraryClick);

  const collapseBtn = hud.querySelector<HTMLButtonElement>(".hud__collapse");
  let collapsed = false;

  const applyCollapsed = () => {
    hud.classList.toggle("is-collapsed", collapsed);
    if (collapseBtn) {
      collapseBtn.textContent = collapsed ? "+" : "−";
      collapseBtn.title = collapsed ? "Büyüt" : "Küçült";
      collapseBtn.setAttribute(
        "aria-label",
        collapsed ? "Paneli büyüt" : "Paneli küçült",
      );
    }
  };

  collapseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    collapsed = !collapsed;
    applyCollapsed();
  });

  return {
    toggle() {
      collapsed = !collapsed;
      applyCollapsed();
    },
    isOpen() {
      return !collapsed;
    },
    dispose() {
      libBtn?.removeEventListener("click", onLibraryClick);
      hud.remove();
    },
  };
}
