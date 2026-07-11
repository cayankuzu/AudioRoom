import { renderLibrary } from "../features/library/renderLibrary";

declare global {
  interface Window {
    __audioroomCleanup?: () => void;
  }
}

export function bootstrapApp(root: HTMLElement): void {
  window.__audioroomCleanup?.();
  root.innerHTML = "";
  window.__audioroomCleanup = renderLibrary(root);
}
