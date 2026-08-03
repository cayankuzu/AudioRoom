export interface InteractionHint {
  show(key: string, text: string): void;
  hide(): void;
  dispose(): void;
}

export function createInteractionHint(parent: HTMLElement): InteractionHint {
  const element = document.createElement("div");
  element.className = "interaction-hint";
  element.setAttribute("role", "status");
  element.setAttribute("aria-live", "polite");
  element.innerHTML = `
    <span class="interaction-hint__key" data-key></span>
    <span class="interaction-hint__text" data-text></span>
  `;
  parent.appendChild(element);

  const key = element.querySelector<HTMLElement>("[data-key]");
  const text = element.querySelector<HTMLElement>("[data-text]");
  let visible = false;

  return {
    show(nextKey, nextText) {
      if (key) key.textContent = nextKey;
      if (text) text.textContent = nextText;
      if (!visible) element.classList.add("is-visible");
      visible = true;
    },
    hide() {
      if (visible) element.classList.remove("is-visible");
      visible = false;
    },
    dispose() {
      element.remove();
    },
  };
}
