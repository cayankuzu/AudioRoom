import { readInputDeviceProfile } from "../../../../shared/app/inputDeviceProfile";

export interface InputHandle {
  readonly pressed: Set<string>;
  readonly isTouch: boolean;
  isLocked(): boolean;
  requestLock(): void;
  /** Fare kilidi alınamazsa (tarayıcı reddetti, Esc sonrası bekleme, iframe) oyunu yine de başlatır: sürükle-bak. */
  forceStart(): void;
  releaseLock(): void;
  onLockChange(cb: (locked: boolean) => void): () => void;
  consumeLook(): { x: number; y: number };
  injectLook(dx: number, dy: number): void;
  setVirtualKey(code: string, pressed: boolean): void;
  dispose(): void;
}

export function createInput(target: HTMLElement): InputHandle {
  const pressed = new Set<string>();
  const look = { x: 0, y: 0 };
  const listeners = new Set<(locked: boolean) => void>();
  const isTouch = readInputDeviceProfile().usesTouchUi;
  let locked = false;
  /** Sanal kilit: gerçek fare kilidi yokken oyun sürer; bakış sol tuş basılıyken sürüklenerek döner. */
  let virtual = false;

  const emitLock = (next: boolean) => {
    if (locked === next) return;
    locked = next;
    if (!locked) pressed.clear();
    listeners.forEach((listener) => listener(locked));
  };

  const onKeyDown = (event: KeyboardEvent) => pressed.add(event.code);
  const onKeyUp = (event: KeyboardEvent) => pressed.delete(event.code);
  const onBlur = () => pressed.clear();
  const onMouseMove = (event: MouseEvent) => {
    if (!locked || isTouch) return;
    if (virtual && !(event.buttons & 1)) return;
    look.x -= event.movementX * 0.00215;
    look.y -= event.movementY * 0.00175;
  };
  const onPointerLockChange = () => {
    if (isTouch) return;
    if (document.pointerLockElement === target) virtual = false;
    else if (virtual) return;
    emitLock(document.pointerLockElement === target);
  };
  const onPointerLockError = () => {
    if (!isTouch && !locked) forceStart();
  };
  const onVirtualKey = (event: KeyboardEvent) => {
    if (virtual && event.code === "Escape") {
      virtual = false;
      emitLock(false);
    }
  };
  const tryRealLock = () => {
    if (virtual && document.pointerLockElement !== target) {
      try {
        target.requestPointerLock();
      } catch {
        /* sanal kilitle sürer */
      }
    }
  };
  const forceStart = () => {
    if (locked || isTouch) return;
    virtual = true;
    emitLock(true);
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  document.addEventListener("pointerlockerror", onPointerLockError);
  document.addEventListener("keydown", onVirtualKey);
  target.addEventListener("mousedown", tryRealLock);
  window.addEventListener("blur", onBlur);

  return {
    pressed,
    isTouch,
    isLocked: () => locked,
    requestLock() {
      if (isTouch) {
        emitLock(true);
        return;
      }
      if (document.pointerLockElement !== target) {
        try {
          target.requestPointerLock();
        } catch {
          // Pointer lock başarısız olursa giriş perdesi açık kalır.
        }
      }
    },
    forceStart,
    releaseLock() {
      if (virtual) {
        virtual = false;
        emitLock(false);
      } else if (isTouch) {
        emitLock(false);
      } else if (document.pointerLockElement === target) {
        void document.exitPointerLock();
      }
    },
    onLockChange(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    consumeLook() {
      const value = { x: look.x, y: look.y };
      look.x = 0;
      look.y = 0;
      return value;
    },
    injectLook(dx, dy) {
      look.x += dx;
      look.y += dy;
    },
    setVirtualKey(code, nextPressed) {
      if (nextPressed) {
        if (pressed.has(code)) return;
        pressed.add(code);
        document.dispatchEvent(
          new KeyboardEvent("keydown", { code, key: code, bubbles: true }),
        );
      } else {
        if (!pressed.has(code)) return;
        pressed.delete(code);
        document.dispatchEvent(
          new KeyboardEvent("keyup", { code, key: code, bubbles: true }),
        );
      }
    },
    dispose() {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      document.removeEventListener("keydown", onVirtualKey);
      target.removeEventListener("mousedown", tryRealLock);
      window.removeEventListener("blur", onBlur);
      listeners.clear();
    },
  };
}
