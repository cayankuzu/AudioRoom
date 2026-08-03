type LegacyFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type LegacyFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};

export function isFullscreenSupported(): boolean {
  const legacy = document as LegacyFullscreenDocument;
  return Boolean(document.fullscreenEnabled || legacy.webkitFullscreenEnabled);
}

export function isFullscreen(): boolean {
  const legacy = document as LegacyFullscreenDocument;
  return Boolean(document.fullscreenElement || legacy.webkitFullscreenElement);
}

export async function requestFullscreen(
  element: HTMLElement = document.documentElement,
): Promise<void> {
  const legacy = element as LegacyFullscreenElement;
  if (element.requestFullscreen) {
    await element.requestFullscreen();
    return;
  }
  if (legacy.webkitRequestFullscreen) {
    await Promise.resolve(legacy.webkitRequestFullscreen());
    return;
  }
  throw new Error("Fullscreen API desteklenmiyor");
}

export async function exitFullscreen(): Promise<void> {
  const legacy = document as LegacyFullscreenDocument;
  if (document.exitFullscreen) await document.exitFullscreen();
  else if (legacy.webkitExitFullscreen) {
    await Promise.resolve(legacy.webkitExitFullscreen());
  }
}

export function onFullscreenChange(cb: () => void): () => void {
  document.addEventListener("fullscreenchange", cb);
  document.addEventListener("webkitfullscreenchange", cb);
  return () => {
    document.removeEventListener("fullscreenchange", cb);
    document.removeEventListener("webkitfullscreenchange", cb);
  };
}

export function tryHideMobileAddressBar(): void {
  const hide = () => {
    try {
      window.scrollTo(0, 1);
    } catch {
      // iOS adres çubuğu gizlenemiyorsa güvenle devam edilir.
    }
  };
  window.setTimeout(hide, 50);
  window.setTimeout(hide, 320);
}
