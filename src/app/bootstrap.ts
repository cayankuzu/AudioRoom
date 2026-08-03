import { renderLibrary } from "../features/library/renderLibrary";
import { bindPagePerformance } from "./pagePerformance";

declare global {
  interface Window {
    __audioroomCleanup?: () => void;
  }
}

export function bootstrapApp(root: HTMLElement): void {
  window.__audioroomCleanup?.();
  root.innerHTML = "";
  const disposePerformance = bindPagePerformance();
  const disposeLibrary = renderLibrary(root);
  window.__audioroomCleanup = () => {
    disposeLibrary();
    disposePerformance();
  };
}
