/**
 * Sol-üst kontroller paneli — Redd · Mükemmel Boşluk HUD birebir kalıbı.
 * Burada sadece WASD + Map + HUD shortcut'ları listelenir (carry/measurement
 * yok).
 */

export interface HudOptions {
  showLibraryBack?: boolean;
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
  const libraryHref = options.libraryHref ?? "../../../";
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
      <div class="hud__row"><span>Shift / KOŞ</span><em>Koş</em></div>
      <div class="hud__row"><span>Boşluk</span><em>Zıpla</em></div>
      <div class="hud__row"><span>Fare</span><em>Bakış</em></div>
      <div class="hud__divider"></div>
      <div class="hud__row hud__row--hint"><span>E</span><em>Plak al · gramofona tak / taşı</em></div>
      <div class="hud__row hud__row--hint"><span>R</span><em>Müziği başlat / duraklat</em></div>
      <div class="hud__row hud__row--hint"><span>Q</span><em>Elindekini bırak</em></div>
      <div class="hud__divider"></div>
      <div class="hud__row hud__row--hint"><span>M</span><em>Harita aç / kapa</em></div>
      <div class="hud__row hud__row--hint"><span>P</span><em>Albüm paneli aç / kapa</em></div>
      <div class="hud__row hud__row--hint"><span>K</span><em>Kontroller (bu panel)</em></div>
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
