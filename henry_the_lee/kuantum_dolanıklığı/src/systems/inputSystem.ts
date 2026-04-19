/**
 * Klavye + fare + dokunmatik (Redd ile uyumlu sanal tuş / bakış enjeksiyonu).
 */
export interface InputHandle {
  pressed: Set<string>;
  look: { x: number; y: number };
  consumeLook(): { x: number; y: number };
  isLocked(): boolean;
  onLockChange(cb: (locked: boolean) => void): () => void;
  onKeyPress(codes: string, cb: (code: string) => void): () => void;
  requestLock(): void;
  releaseLock(): void;
  readonly isTouch: boolean;
  injectLook(dx: number, dy: number): void;
  setVirtualKey(code: string, pressed: boolean): void;
  dispose(): void;
}

function detectTouch(): boolean {
  if (typeof window === "undefined") return false;
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  return coarse || hasTouch;
}

export function createInput(target: HTMLElement): InputHandle {
  const pressed = new Set<string>();
  const look = { x: 0, y: 0 };
  const lockListeners = new Set<(locked: boolean) => void>();
  /** code → edge-triggered listeners. */
  const pressListeners = new Map<string, Set<(code: string) => void>>();
  let locked = false;
  const isTouch = detectTouch();

  const onKeyDown = (e: KeyboardEvent) => {
    if (!e.repeat) {
      const set = pressListeners.get(e.code);
      if (set) set.forEach((fn) => fn(e.code));
    }
    pressed.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    pressed.delete(e.code);
  };
  const onBlur = () => pressed.clear();

  const onMouseMove = (e: MouseEvent) => {
    if (!locked) return;
    look.x -= e.movementX * 0.0022;
    look.y -= e.movementY * 0.0018;
  };

  const onPointerLockChange = () => {
    if (isTouch) return;
    locked = document.pointerLockElement === target;
    lockListeners.forEach((fn) => fn(locked));
    if (!locked) pressed.clear();
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onPointerLockChange);

  function setLocked(next: boolean): void {
    if (locked === next) return;
    locked = next;
    lockListeners.forEach((fn) => fn(locked));
    if (!locked) pressed.clear();
  }

  return {
    pressed,
    look,
    isTouch,
    isLocked: () => locked,
    onLockChange(cb) {
      lockListeners.add(cb);
      return () => lockListeners.delete(cb);
    },
    onKeyPress(codes, cb) {
      const list = codes.split(",").map((s) => s.trim()).filter(Boolean);
      for (const code of list) {
        let set = pressListeners.get(code);
        if (!set) {
          set = new Set();
          pressListeners.set(code, set);
        }
        set.add(cb);
      }
      return () => {
        for (const code of list) {
          pressListeners.get(code)?.delete(cb);
        }
      };
    },
    requestLock() {
      if (isTouch) {
        setLocked(true);
        return;
      }
      if (document.pointerLockElement !== target) {
        try {
          target.requestPointerLock();
        } catch {
          /* yok say */
        }
      }
    },
    releaseLock() {
      if (isTouch) {
        setLocked(false);
        return;
      }
      if (document.pointerLockElement === target) {
        document.exitPointerLock();
      }
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
    setVirtualKey(code, isPressed) {
      if (isPressed) {
        if (pressed.has(code)) return;
        pressed.add(code);
        try {
          document.dispatchEvent(
            new KeyboardEvent("keydown", { code, key: code, bubbles: true, repeat: false }),
          );
        } catch {
          /* yok say */
        }
      } else {
        if (!pressed.has(code)) return;
        pressed.delete(code);
        try {
          document.dispatchEvent(
            new KeyboardEvent("keyup", { code, key: code, bubbles: true }),
          );
        } catch {
          /* yok say */
        }
      }
    },
    dispose() {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
    },
  };
}
