/** Küçük DOM yardımcıları — framework yok, kaçışlı metin varsayılan. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function button(className: string, label: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", className, label);
  node.type = "button";
  node.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick();
  });
  return node;
}

/** Tuş simgesi: <kbd>E</kbd> */
export function keycap(key: string): HTMLElement {
  return el("kbd", "ar-key", key);
}
