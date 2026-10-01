import type { Input } from "../core/input";
import { el } from "./dom";

export interface TouchAction {
  code: string;
  label: string;
  /** Basılı tutulan eylem mi (zıplama/koşma), yoksa tek dokunuş mu? */
  hold?: boolean;
}

/**
 * Mobil demo kontrolleri: sol başparmakla sanal joystick, ekranın geri kalanında
 * sürükleyerek bakış, sağ altta büyük eylem düğmeleri.
 */
export function createTouchControls(parent: HTMLElement, input: Input, actions: TouchAction[], onPause: () => void) {
  const root = el("div", "ar-touch");
  const look = el("div", "ar-touch__look");
  const stick = el("div", "ar-touch__stick");
  const knob = el("div", "ar-touch__knob");
  stick.appendChild(knob);
  const buttons = el("div", "ar-touch__buttons");
  const pause = el("button", "ar-touch__pause", "❚❚");
  pause.type = "button";
  pause.setAttribute("aria-label", "Duraklat");
  pause.addEventListener("click", onPause);
  root.append(look, stick, buttons, pause);
  parent.appendChild(root);

  for (const action of actions) {
    const btn = el("button", "ar-touch__btn", action.label);
    btn.type = "button";
    btn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      btn.classList.add("is-pressed");
      if (action.hold) input.setHeld(action.code, true);
      input.press(action.code);
    });
    const release = () => {
      btn.classList.remove("is-pressed");
      if (action.hold) input.setHeld(action.code, false);
    };
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
    buttons.appendChild(btn);
  }

  const RADIUS = 52;
  let stickId: number | null = null;
  let stickX = 0;
  let stickY = 0;
  stick.addEventListener("pointerdown", (event) => {
    stickId = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    const rect = stick.getBoundingClientRect();
    stickX = rect.left + rect.width / 2;
    stickY = rect.top + rect.height / 2;
  });
  stick.addEventListener("pointermove", (event) => {
    if (event.pointerId !== stickId) return;
    const dx = event.clientX - stickX;
    const dy = event.clientY - stickY;
    const length = Math.min(RADIUS, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const x = Math.cos(angle) * length;
    const y = Math.sin(angle) * length;
    knob.style.transform = `translate(${x}px, ${y}px)`;
    input.setTouchAxis(x / RADIUS, -y / RADIUS);
  });
  const endStick = () => {
    stickId = null;
    knob.style.transform = "";
    input.setTouchAxis(0, 0);
  };
  stick.addEventListener("pointerup", endStick);
  stick.addEventListener("pointercancel", endStick);

  const lookPointers = new Map<number, { x: number; y: number }>();
  look.addEventListener("pointerdown", (event) => {
    look.setPointerCapture(event.pointerId);
    lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  });
  look.addEventListener("pointermove", (event) => {
    const last = lookPointers.get(event.pointerId);
    if (!last) return;
    input.addTouchLook(event.clientX - last.x, event.clientY - last.y);
    lookPointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  });
  const endLook = (event: PointerEvent) => lookPointers.delete(event.pointerId);
  look.addEventListener("pointerup", endLook);
  look.addEventListener("pointercancel", endLook);

  return {
    setVisible(visible: boolean) {
      root.classList.toggle("is-hidden", !visible);
    },
    dispose() {
      root.remove();
    },
  };
}
