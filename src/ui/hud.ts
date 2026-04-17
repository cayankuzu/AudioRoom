export interface Hud {
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
      <div class="hud__row"><span>E</span><em>Plağı al / Gramofon</em></div>
      <div class="hud__row"><span>G</span><em>Eldeki plağı bırak</em></div>
      <div class="hud__row"><span>Y</span><em>Gramofonu taşı / bırak</em></div>
      <div class="hud__divider"></div>
      <div class="hud__row hud__row--hint"><span>ESC</span><em>İmleci serbest bırak</em></div>
    </div>
  `;
  parent.appendChild(hud);

  const collapseBtn = hud.querySelector<HTMLButtonElement>(".hud__collapse");
  let collapsed = false;
  collapseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    collapsed = !collapsed;
    hud.classList.toggle("is-collapsed", collapsed);
    if (collapseBtn) {
      collapseBtn.textContent = collapsed ? "+" : "−";
      collapseBtn.title = collapsed ? "Büyüt" : "Küçült";
      collapseBtn.setAttribute(
        "aria-label",
        collapsed ? "Paneli büyüt" : "Paneli küçült",
      );
    }
  });

  return {
    dispose() {
      hud.remove();
    },
  };
}
