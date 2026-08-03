export interface LoadingOverlay {
  setProgress(value: number, detail?: string): void;
  hide(): void;
  dispose(): void;
}

export function createLoadingOverlay(parent: HTMLElement): LoadingOverlay {
  const element = document.createElement("div");
  element.className = "kk-loading is-visible";
  element.setAttribute("role", "status");
  element.setAttribute("aria-live", "polite");
  element.innerHTML = `
    <div class="kk-loading__grain" aria-hidden="true"></div>
    <div class="kk-loading__content">
      <p class="kk-loading__eyebrow">AUDIOROOM / DÜNYA 04</p>
      <div class="kk-loading__record" aria-hidden="true">
        <i></i><span></span>
      </div>
      <h1>Klostrofobik<br />Kaplumbağa</h1>
      <p class="kk-loading__detail" data-loading-detail>Atmosfer kuruluyor…</p>
      <div class="kk-loading__track" aria-hidden="true">
        <span data-loading-bar></span>
      </div>
      <div class="kk-loading__meta">
        <span>HENRY THE LEE</span>
        <strong data-loading-value>0%</strong>
      </div>
    </div>
  `;
  parent.appendChild(element);

  const bar = element.querySelector<HTMLElement>("[data-loading-bar]");
  const value = element.querySelector<HTMLElement>("[data-loading-value]");
  const detail = element.querySelector<HTMLElement>("[data-loading-detail]");
  let removed = false;

  return {
    setProgress(next, nextDetail) {
      const clamped = Math.round(Math.max(0, Math.min(100, next)));
      if (bar) bar.style.width = `${clamped}%`;
      if (value) value.textContent = `${clamped}%`;
      if (detail && nextDetail) detail.textContent = nextDetail;
    },
    hide() {
      if (removed) return;
      element.classList.remove("is-visible");
      element.classList.add("is-done");
      window.setTimeout(() => {
        element.remove();
        removed = true;
      }, 700);
    },
    dispose() {
      element.remove();
      removed = true;
    },
  };
}
