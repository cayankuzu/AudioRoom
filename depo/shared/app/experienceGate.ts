import {
  type OverlayGateState,
  type OverlayMode,
  type StartOverlay,
} from "../ui/startOverlay";
import { readInputDeviceProfile } from "./inputDeviceProfile";

export interface ExperienceLockHandle {
  requestLock(): void;
  releaseLock(): void;
  onLockChange(cb: (locked: boolean) => void): () => void;
}

export interface ExperienceFullscreenApi {
  isFullscreen(): boolean;
  isFullscreenSupported(): boolean;
  requestFullscreen(element?: HTMLElement): Promise<void>;
  tryHideMobileAddressBar(): void;
}

export interface ExperienceGateOptions {
  overlay: StartOverlay;
  experience: ExperienceLockHandle;
  fullscreen: ExperienceFullscreenApi;
  touchSupport?: "supported" | "precision-input-required";
}

const PORTRAIT_GATE: OverlayGateState = {
  disabled: true,
  title: "Telefonu yan çevirin",
  description:
    "Bu evren telefonda yalnızca yatay ekranda oynanır. Ekranı yataya alınca başlangıç aktif olur.",
  ctaLabel: "Yatay moda geçin",
};

const FULLSCREEN_GATE: OverlayGateState = {
  title: "Tam ekran izni gerekli",
  description:
    "Başlamak için tarayıcının tam ekran isteğini onaylayın ve tekrar deneyin.",
};

const HARDWARE_GATE: OverlayGateState = {
  disabled: true,
  title: "Klavye ve mouse gerekli",
  description:
    "Bu evren dokunmatik kontrol sunmaz. Daha iyi bir deneyim için klavye ve mouse bağlayın veya bu donanıma sahip bir cihaz kullanın.",
  ctaLabel: "Donanım gerekli",
};

export function bindExperienceGate(options: ExperienceGateOptions): () => void {
  const touchSupport = options.touchSupport ?? "supported";
  let hasStarted = false;
  let locked = false;
  let resumeOnLandscape = false;
  let fullscreenRejected = false;

  const resolveMode = (): OverlayMode => (hasStarted ? "pause" : "intro");

  const syncGateState = () => {
    const profile = readInputDeviceProfile();
    const usesTouchUi = profile.usesTouchUi;
    const hardwareBlocked =
      touchSupport === "precision-input-required" && profile.isTouchOnly;
    const portraitBlocked =
      usesTouchUi &&
      typeof window !== "undefined" &&
      window.innerHeight > window.innerWidth;

    if (hardwareBlocked) {
      document.body.classList.remove("is-portrait-locked");
      options.overlay.setGateState(HARDWARE_GATE);
      options.overlay.show(resolveMode());
      return true;
    }

    if (!usesTouchUi) {
      document.body.classList.remove("is-portrait-locked");
      options.overlay.setGateState(null);
      return false;
    }

    options.fullscreen.tryHideMobileAddressBar();
    document.body.classList.toggle("is-portrait-locked", portraitBlocked);

    if (portraitBlocked) {
      options.overlay.setGateState(PORTRAIT_GATE);
      options.overlay.show(resolveMode());
      return true;
    }

    options.overlay.setGateState(fullscreenRejected ? FULLSCREEN_GATE : null);
    return false;
  };

  const tryStart = async () => {
    if (syncGateState()) {
      return;
    }

    if (readInputDeviceProfile().usesTouchUi) {
      if (options.fullscreen.isFullscreenSupported()) {
        if (!options.fullscreen.isFullscreen()) {
          try {
            await options.fullscreen.requestFullscreen(document.documentElement);
          } catch {
            fullscreenRejected = true;
            syncGateState();
            return;
          }

          if (!options.fullscreen.isFullscreen()) {
            fullscreenRejected = true;
            syncGateState();
            return;
          }
        }
      } else {
        options.fullscreen.tryHideMobileAddressBar();
      }
    }

    fullscreenRejected = false;
    options.overlay.setGateState(null);
    options.experience.requestLock();
  };

  options.overlay.onStart(() => {
    void tryStart();
  });

  const offLockChange = options.experience.onLockChange((nextLocked) => {
    locked = nextLocked;

    if (nextLocked) {
      hasStarted = true;
      fullscreenRejected = false;
      resumeOnLandscape = false;
      options.overlay.setGateState(null);
      options.overlay.hide();
      document.body.classList.remove("is-portrait-locked");
      return;
    }

    options.overlay.show(resolveMode());
    syncGateState();
  });

  const onViewportChange = () => {
    const portraitBlocked = syncGateState();
    const usesTouchUi = readInputDeviceProfile().usesTouchUi;

    if (!usesTouchUi) {
      return;
    }

    if (portraitBlocked) {
      if (locked) {
        resumeOnLandscape = true;
        options.experience.releaseLock();
      }
      return;
    }

    if (resumeOnLandscape && hasStarted) {
      resumeOnLandscape = false;
      fullscreenRejected = false;
      options.overlay.setGateState(null);
      options.experience.requestLock();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("orientationchange", onViewportChange);
  }

  syncGateState();

  return () => {
    offLockChange();
    document.body.classList.remove("is-portrait-locked");
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("orientationchange", onViewportChange);
    }
  };
}
