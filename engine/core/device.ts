const matches = (query: string) => window.matchMedia?.(query).matches ?? false;

/**
 * Yalnızca dokunmatik (klavye/fare olmayan) cihaz mı? Dokunmatik dizüstü ve
 * trackpad bağlı tabletler hassas girdiye sahip olduğu için masaüstü sayılır.
 */
export function isTouchOnly(): boolean {
  const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  const hasPrecision = matches("(any-pointer: fine)") && matches("(any-hover: hover)");
  return hasTouch && !hasPrecision;
}

/** Telefonun kısa kenarı (CSS px) bundan küçüktür; tabletler (iPad mini 744) üstündedir. */
const PHONE_SHORT_SIDE = 600;

/**
 * Telefon mu? Yalnızca dokunmatik ve ekranın kısa kenarı dar. Tablet ve bilgisayar "geniş ekran"
 * sayılır. Telefonda yalnızca Mükemmel Boşluk'un Sürüm 1'i açılır (bkz. PHONE_WORLD).
 */
export function isPhone(): boolean {
  if (!isTouchOnly()) return false;
  const shortSide = Math.min(window.screen?.width || window.innerWidth, window.screen?.height || window.innerHeight);
  return shortSide < PHONE_SHORT_SIDE;
}

export type DeviceClass = "desktop" | "tablet" | "phone";

export function deviceClass(): DeviceClass {
  if (!isTouchOnly()) return "desktop";
  return isPhone() ? "phone" : "tablet";
}

/** Telefonda açılabilen tek evren (site köküne göre adres). */
export const PHONE_WORLD = { href: "depo/redd/mukemmel_bosluk/", label: "Mükemmel Boşluk · Sürüm 1" } as const;

export function prefersReducedMotion(): boolean {
  return matches("(prefers-reduced-motion: reduce)");
}

export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}
