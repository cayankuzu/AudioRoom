/**
 * Çapraz tarayıcı fullscreen wrapper (Redd ile aynı).
 */

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  webkitRequestFullScreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type FsDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
  mozFullScreenEnabled?: boolean;
};

export function isFullscreenSupported(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as FsDocument;
  return Boolean(
    document.fullscreenEnabled ||
      d.webkitFullscreenEnabled ||
      d.mozFullScreenEnabled,
  );
}

export function isFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as FsDocument;
  return Boolean(
    document.fullscreenElement ||
      d.webkitFullscreenElement ||
      d.mozFullScreenElement ||
      d.msFullscreenElement,
  );
}

export async function requestFullscreen(
  element: HTMLElement = document.documentElement,
): Promise<void> {
  const el = element as FsElement;
  if (el.requestFullscreen) {
    await el.requestFullscreen();
    return;
  }
  if (el.webkitRequestFullscreen) {
    await Promise.resolve(el.webkitRequestFullscreen());
    return;
  }
  if (el.webkitRequestFullScreen) {
    await Promise.resolve(el.webkitRequestFullScreen());
    return;
  }
  if (el.mozRequestFullScreen) {
    await Promise.resolve(el.mozRequestFullScreen());
    return;
  }
  if (el.msRequestFullscreen) {
    await Promise.resolve(el.msRequestFullscreen());
    return;
  }
  throw new Error("Fullscreen API desteklenmiyor");
}

export async function exitFullscreen(): Promise<void> {
  if (typeof document === "undefined") return;
  const d = document as FsDocument;
  if (document.exitFullscreen) {
    await document.exitFullscreen();
    return;
  }
  if (d.webkitExitFullscreen) {
    await Promise.resolve(d.webkitExitFullscreen());
    return;
  }
  if (d.mozCancelFullScreen) {
    await Promise.resolve(d.mozCancelFullScreen());
    return;
  }
  if (d.msExitFullscreen) {
    await Promise.resolve(d.msExitFullscreen());
    return;
  }
}

export function onFullscreenChange(cb: () => void): () => void {
  const events = [
    "fullscreenchange",
    "webkitfullscreenchange",
    "mozfullscreenchange",
    "MSFullscreenChange",
  ];
  events.forEach((e) => document.addEventListener(e, cb));
  return () => events.forEach((e) => document.removeEventListener(e, cb));
}

export function tryHideMobileAddressBar(): void {
  if (typeof window === "undefined") return;
  const hide = () => {
    try {
      window.scrollTo(0, 1);
    } catch {
      /* yok say */
    }
  };
  window.setTimeout(hide, 50);
  window.setTimeout(hide, 300);
  window.setTimeout(hide, 1000);
}
