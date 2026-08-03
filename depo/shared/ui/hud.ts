export interface HudOptions {
  title?: string;
  showLibraryBack?: boolean;
  libraryHref?: string;
  sections: readonly (readonly HudRow[])[];
}

export interface HudRow {
  key: string;
  label: string;
  tone?: "default" | "hint";
}

export interface Hud {
  toggle(): void;
  isOpen(): boolean;
  dispose(): void;
}

export function createHud(parent: HTMLElement, options: HudOptions): Hud {
  const hud = document.createElement("div");
  hud.className = "hud";

  const libraryHref = options.libraryHref ?? "../../../";
  const title = options.title ?? "Kontroller";
  const libraryButton = options.showLibraryBack
    ? `
      <button type="button" class="hud__library-btn" aria-label="Kütüphaneye dön" title="Kütüphaneye dön">
        <span class="hud__library-icon" aria-hidden="true">‹</span>
        <span class="hud__library-text">Kütüphane</span>
      </button>
    `
    : "";

  const rowsHtml = options.sections
    .map((section, sectionIndex) => {
      const sectionRows = section
        .map((row) => {
          const rowClass = row.tone === "hint" ? "hud__row hud__row--hint" : "hud__row";
          return `
            <div class="${rowClass}">
              <span>${escapeHtml(row.key)}</span>
              <em>${escapeHtml(row.label)}</em>
            </div>
          `;
        })
        .join("");

      const divider =
        sectionIndex < options.sections.length - 1
          ? `<div class="hud__divider" aria-hidden="true"></div>`
          : "";

      return `${sectionRows}${divider}`;
    })
    .join("");

  hud.innerHTML = `
    <header class="hud__head">
      ${libraryButton}
      <div class="hud__head-text">
        <p class="hud__kicker">${escapeHtml(title)}</p>
      </div>
      <button class="hud__collapse" type="button" aria-label="Paneli küçült" title="Küçült">−</button>
    </header>
    <div class="hud__body">
      ${rowsHtml}
    </div>
  `;

  parent.appendChild(hud);

  const libraryBtn = hud.querySelector<HTMLButtonElement>(".hud__library-btn");
  const collapseBtn = hud.querySelector<HTMLButtonElement>(".hud__collapse");
  let collapsed = false;

  const onLibraryClick = (event: MouseEvent) => {
    event.stopPropagation();
    document.exitPointerLock();
    window.location.href = libraryHref;
  };

  const applyCollapsed = () => {
    hud.classList.toggle("is-collapsed", collapsed);
    if (!collapseBtn) {
      return;
    }

    collapseBtn.textContent = collapsed ? "+" : "−";
    collapseBtn.title = collapsed ? "Büyüt" : "Küçült";
    collapseBtn.setAttribute(
      "aria-label",
      collapsed ? "Paneli büyüt" : "Paneli küçült",
    );
  };

  libraryBtn?.addEventListener("click", onLibraryClick);
  collapseBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
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
      libraryBtn?.removeEventListener("click", onLibraryClick);
      hud.remove();
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
