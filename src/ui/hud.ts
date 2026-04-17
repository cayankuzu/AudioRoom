export interface Hud {
  /** Paneli aç/kapa (klavye kısayolu ile tetikleme için). */
  toggle(): void;
  /** Açık mı? */
  isOpen(): boolean;
  dispose(): void;
}

export function createHud(parent: HTMLElement): Hud {
  const hud = document.createElement("div");
  hud.className = "hud";
  hud.innerHTML = `
    <header class="hud__head">
      <p class="hud__kicker">Kontroller</p>
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
      hud.remove();
    },
  };
}
