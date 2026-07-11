export interface InputDeviceProfile {
  hasTouch: boolean;
  hasCoarsePointer: boolean;
  hasFinePointer: boolean;
  hasHover: boolean;
  supportsPrecisionInput: boolean;
  isTouchOnly: boolean;
  usesTouchUi: boolean;
}

export function readInputDeviceProfile(): InputDeviceProfile {
  if (typeof window === "undefined") {
    return {
      hasTouch: false,
      hasCoarsePointer: false,
      hasFinePointer: false,
      hasHover: true,
      supportsPrecisionInput: true,
      isTouchOnly: false,
      usesTouchUi: false,
    };
  }

  const hasCoarsePointer =
    mediaQueryMatches("(any-pointer: coarse)") ||
    mediaQueryMatches("(pointer: coarse)");
  const hasFinePointer =
    mediaQueryMatches("(any-pointer: fine)") ||
    mediaQueryMatches("(pointer: fine)");
  const hasHover =
    mediaQueryMatches("(any-hover: hover)") ||
    mediaQueryMatches("(hover: hover)");
  const hasTouch =
    hasCoarsePointer ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;
  const supportsPrecisionInput = hasFinePointer && hasHover;
  const isTouchOnly = hasTouch && !supportsPrecisionInput;

  return {
    hasTouch,
    hasCoarsePointer,
    hasFinePointer,
    hasHover,
    supportsPrecisionInput,
    isTouchOnly,
    usesTouchUi: isTouchOnly,
  };
}

function mediaQueryMatches(query: string): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches
  );
}
