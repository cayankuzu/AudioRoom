/**
 * Klavye + fare + dokunmatik girdisi.
 * - Fare kilidi (pointer lock) varsa onu kullanır; yoksa veya reddedilirse
 *   "sürükle-bak" yedeğine düşer, oyun yine oynanır.
 * - Tuşlar fiziksel konuma göre (`event.code`) okunur; Türkçe F/Q klavyede WASD aynı yerde kalır.
 */
export type LookMode = "lock" | "drag" | "touch";

export interface Input {
  readonly mode: LookMode;
  active: boolean;
  sensitivity: number;
  invertY: boolean;
  isDown(code: string): boolean;
  /** Tek seferlik eylem (tekrarsız keydown veya "Mouse0" tıklaması). */
  onAction(code: string, fn: () => void): void;
  /** Hareket ekseni: x sağ(+)/sol(-), y ileri(+)/geri(-) — [-1, 1] */
  moveAxis(): { x: number; y: number };
  /** Birikmiş bakış hareketi (radyan) — okununca sıfırlanır. */
  consumeLook(): { yaw: number; pitch: number };
  requestLock(): Promise<void>;
  releaseLock(): void;
  onPauseRequest(fn: () => void): void;
  // Dokunmatik arayüzün kullandığı girişler:
  setTouchAxis(x: number, y: number): void;
  addTouchLook(dx: number, dy: number): void;
  press(code: string): void;
  setHeld(code: string, held: boolean): void;
  dispose(): void;
}

const MOUSE_SCALE = 0.0022;
const TOUCH_SCALE = 0.0052;

export function createInput(canvas: HTMLCanvasElement, touch: boolean): Input {
  const down = new Set<string>();
  const actions = new Map<string, Array<() => void>>();
  const pauseListeners: Array<() => void> = [];
  let mode: LookMode = touch ? "touch" : "lock";
  let lookYaw = 0;
  let lookPitch = 0;
  let touchX = 0;
  let touchY = 0;
  let dragging = false;

  const fire = (code: string) => {
    if (!input.active) return;
    actions.get(code)?.forEach((fn) => fn());
  };

  const isTyping = (target: EventTarget | null) =>
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);

  const onKeyDown = (event: KeyboardEvent) => {
    if (isTyping(event.target)) return;
    if (event.code === "Escape" && mode === "drag" && input.active) {
      pauseListeners.forEach((fn) => fn());
      return;
    }
    if (input.active && ["Space", "ArrowUp", "ArrowDown", "Tab"].includes(event.code)) {
      event.preventDefault();
    }
    down.add(event.code);
    if (!event.repeat) fire(event.code);
  };
  const onKeyUp = (event: KeyboardEvent) => down.delete(event.code);
  const onBlur = () => down.clear();

  const addLook = (dx: number, dy: number, scale: number) => {
    if (!input.active) return;
    lookYaw -= dx * scale * input.sensitivity;
    lookPitch -= dy * scale * input.sensitivity * (input.invertY ? -1 : 1);
  };

  const onMouseMove = (event: MouseEvent) => {
    if (mode === "lock" && document.pointerLockElement === canvas) {
      addLook(event.movementX, event.movementY, MOUSE_SCALE);
    } else if (mode === "drag" && dragging) {
      addLook(event.movementX, event.movementY, MOUSE_SCALE * 1.6);
    }
  };
  const onMouseDown = (event: MouseEvent) => {
    if (event.target !== canvas || !input.active) return;
    if (mode === "drag") dragging = true;
    // Sürükle-bak modunda sol tık bakış içindir; eylem yalnızca fare kilitliyken.
    if (event.button === 0 && mode === "lock") fire("Mouse0");
  };
  const onMouseUp = () => {
    dragging = false;
  };
  const onLockChange = () => {
    if (mode === "lock" && document.pointerLockElement !== canvas && input.active) {
      pauseListeners.forEach((fn) => fn());
    }
  };
  const onLockError = () => {
    if (mode === "lock") mode = "drag";
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("pointerlockchange", onLockChange);
  document.addEventListener("pointerlockerror", onLockError);

  const input: Input = {
    get mode() {
      return mode;
    },
    active: false,
    sensitivity: 1,
    invertY: false,
    isDown: (code) => down.has(code),
    onAction(code, fn) {
      const list = actions.get(code) ?? [];
      list.push(fn);
      actions.set(code, list);
    },
    moveAxis() {
      if (mode === "touch") return { x: touchX, y: touchY };
      const x = (down.has("KeyD") || down.has("ArrowRight") ? 1 : 0) - (down.has("KeyA") || down.has("ArrowLeft") ? 1 : 0);
      const y = (down.has("KeyW") || down.has("ArrowUp") ? 1 : 0) - (down.has("KeyS") || down.has("ArrowDown") ? 1 : 0);
      const length = Math.hypot(x, y) || 1;
      return { x: x / length, y: y / length };
    },
    consumeLook() {
      const value = { yaw: lookYaw, pitch: lookPitch };
      lookYaw = 0;
      lookPitch = 0;
      return value;
    },
    async requestLock() {
      if (mode === "touch") return;
      if (!("requestPointerLock" in canvas)) {
        mode = "drag";
        return;
      }
      mode = "lock";
      try {
        type LockOptions = { unadjustedMovement?: boolean };
        const request = canvas.requestPointerLock as (options?: LockOptions) => Promise<void> | void;
        try {
          await request.call(canvas, { unadjustedMovement: true });
        } catch {
          await request.call(canvas);
        }
        mode = "lock";
      } catch {
        mode = "drag";
      }
    },
    releaseLock() {
      dragging = false;
      down.clear();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    onPauseRequest(fn) {
      pauseListeners.push(fn);
    },
    setTouchAxis(x, y) {
      touchX = x;
      touchY = y;
    },
    addTouchLook(dx, dy) {
      addLook(dx, dy, TOUCH_SCALE);
    },
    press(code) {
      fire(code);
    },
    setHeld(code, held) {
      if (held) down.add(code);
      else down.delete(code);
    },
    dispose() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
    },
  };
  return input;
}
