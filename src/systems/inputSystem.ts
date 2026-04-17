export interface InputHandle {
  pressed: Set<string>;
  look: { x: number; y: number };
  isLocked(): boolean;
  onLockChange(cb: (locked: boolean) => void): () => void;
  requestLock(): void;
  releaseLock(): void;
  consumeLook(): { x: number; y: number };
  dispose(): void;
}

export function createInput(target: HTMLElement): InputHandle {
  const pressed = new Set<string>();
  const look = { x: 0, y: 0 };
  const lockListeners = new Set<(locked: boolean) => void>();
  let locked = false;

  const onKeyDown = (e: KeyboardEvent) => {
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
    locked = document.pointerLockElement === target;
    lockListeners.forEach((fn) => fn(locked));
    if (!locked) pressed.clear();
  };

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("pointerlockchange", onPointerLockChange);

  return {
    pressed,
    look,
    isLocked: () => locked,
    onLockChange(cb) {
      lockListeners.add(cb);
      return () => lockListeners.delete(cb);
    },
    requestLock() {
      if (document.pointerLockElement !== target) {
        target.requestPointerLock();
      }
    },
    releaseLock() {
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
    dispose() {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
    },
  };
}
