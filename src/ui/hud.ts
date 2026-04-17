export interface HudOptions {
  /** Sol üst kontrol panelinde "Kütüphane" dönüş butonunu göster. */
  showLibraryBack?: boolean;
}

export interface Hud {
  /** Paneli aç/kapa (klavye kısayolu ile tetikleme için). */
  toggle(): void;
  /** Açık mı? */
  isOpen(): boolean;
  dispose(): void;
}

export function createHud(parent: HTMLElement, options: HudOptions = {}): Hud {
  const hud = document.createElement("div");
  hud.className = "hud";
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
      <div class="hud__row"><span>C / Ctrl</span><em>Çömel</em></div>
      <div class="hud__row"><span>Boşluk</span><em>Zıpla</em></div>
      <div class="hud__row"><span>Fare</span><em>Bakış</em></div>
      <div class="hud__row"><span>F</span><em>Fener</em></div>
      <div class="hud__divider"></div>
      <div class="hud__row"><span>E</span><em>Plak / Gramofonu al · plağı tak</em></div>
      <div class="hud__row"><span>R</span><em>Gramofon · başlat / duraklat</em></div>
      <div class="hud__row"><span>Q</span><em>Elindekini bırak</em></div>
      <div class="hud__divider"></div>
      <div class="hud__row"><span>P</span><em>Albüm paneli</em></div>
      <div class="hud__row"><span>M</span><em>Harita</em></div>
      <div class="hud__row"><span>K</span><em>Kontroller</em></div>
      <div class="hud__row"><span>L</span><em>Parlaklık · Kontrast</em></div>
      <div class="hud__row"><span>T</span><em>Ekran görüntüsü</em></div>
      <div class="hud__divider"></div>
      <div class="hud__row hud__row--hint"><span>ESC</span><em>İmleci serbest bırak</em></div>
    </div>
  `;
  parent.appendChild(hud);

  const libBtn = hud.querySelector<HTMLButtonElement>(".hud__library-btn");
  const onLibraryClick = (e: MouseEvent) => {
    e.stopPropagation();
    document.exitPointerLock();
    window.location.reload();
  };
  libBtn?.addEventListener("click", onLibraryClick);

  const collapseBtn = hud.querySelector<HTMLButtonElement>(".hud__collapse");
  let collapsed = false;

  function applyCollapsed() {
    hud.classList.toggle("is-collapsed", collapsed);
    if (collapseBtn) {
      collapseBtn.textContent = collapsed ? "+" : "−";
      collapseBtn.title = collapsed ? "Büyüt" : "Küçült";
      collapseBtn.setAttribute(
        "aria-label",
        collapsed ? "Paneli büyüt" : "Paneli küçült",
      );
    }
  }

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
