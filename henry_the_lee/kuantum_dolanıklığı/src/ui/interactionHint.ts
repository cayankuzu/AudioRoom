/**
 * Ekran merkezinde, alttan bir tık yukarıda belirir küçük etkileşim ipucu.
 * Redd · Mükemmel Boşluk versiyonu birebir.
 *
 * Sadece içerik değiştiğinde DOM güncellenir (ucuz frame-time).
 */
export interface InteractionHint {
  show(key: string, text: string): void;
  hide(): void;
  dispose(): void;
}

export function createInteractionHint(parent: HTMLElement): InteractionHint {
  const el = document.createElement("div");
  el.className = "interaction-hint";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `
    <span class="interaction-hint__key" data-key></span>
    <span class="interaction-hint__text" data-text></span>
  `;
  parent.appendChild(el);

  const keyEl = el.querySelector<HTMLSpanElement>("[data-key]");
  const textEl = el.querySelector<HTMLSpanElement>("[data-text]");
  if (!keyEl || !textEl) throw new Error("InteractionHint DOM eksik");

  let currentKey = "";
  let currentText = "";
  let visible = false;

  return {
    show(key, text) {
      if (key !== currentKey) {
        keyEl.textContent = key;
        currentKey = key;
      }
      if (text !== currentText) {
        textEl.textContent = text;
        currentText = text;
      }
      if (!visible) {
        el.classList.add("is-visible");
        visible = true;
      }
    },
    hide() {
      if (!visible) return;
      el.classList.remove("is-visible");
      visible = false;
    },
    dispose() {
      el.remove();
    },
  };
}
