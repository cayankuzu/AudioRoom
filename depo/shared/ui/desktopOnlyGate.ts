export interface DesktopOnlyGateOptions {
  title: string;
  description?: string;
  libraryHref?: string;
}

export function createDesktopOnlyGate(
  parent: HTMLElement,
  options: DesktopOnlyGateOptions,
): { dispose(): void } {
  const gate = document.createElement("main");
  gate.className = "shared-desktop-gate";
  gate.innerHTML = `
    <div class="shared-desktop-gate__rings" aria-hidden="true"><i></i><i></i><i></i></div>
    <section class="shared-desktop-gate__card">
      <span>MASAÜSTÜ DENEYİMİ</span>
      <h1>${escapeHtml(options.title)}</h1>
      <p>${escapeHtml(options.description ?? "Bu evren klavye, fare ve masaüstü donanımı için hazırlandı.")}</p>
      <strong>Lütfen bilgisayardaki bir web tarayıcısından girin.</strong>
      <a href="${escapeAttribute(options.libraryHref ?? "../../../")}">AudioRoom'a dön</a>
    </section>
  `;
  parent.appendChild(gate);

  return {
    dispose() {
      gate.remove();
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

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
