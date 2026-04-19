/**
 * Geçici ölçüm okuma kapsülü — ekran üst-merkezde görünür, fade-out'la kaybolur.
 * Heisenberg ilkesini görselleştirir: tek seferlik bir snapshot.
 *
 *  K → "Konum"  : "Plak X.X m uzakta · (x, z)" + minimap'te dot
 *  H → "Hız"    : "Plak X.XX m/s"
 */

export type MeasurementKind = "position" | "velocity";

export interface MeasurementPill {
  /** position: distance + (x, z), velocity: speed (m/s). */
  show(kind: MeasurementKind, payload: { distance?: number; x?: number; z?: number; speed?: number }, ttl?: number): void;
  hide(): void;
  dispose(): void;
}

export function createMeasurementPill(parent: HTMLElement): MeasurementPill {
  const el = document.createElement("div");
  el.className = "measurement-pill";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  el.innerHTML = `
    <span class="measurement-pill__label" data-label></span>
    <span class="measurement-pill__value" data-value></span>
    <span class="measurement-pill__sub" data-sub></span>
  `;
  parent.appendChild(el);

  const labelEl = el.querySelector<HTMLSpanElement>("[data-label]")!;
  const valueEl = el.querySelector<HTMLSpanElement>("[data-value]")!;
  const subEl = el.querySelector<HTMLSpanElement>("[data-sub]")!;

  let hideTimer: number | null = null;

  const fmt = (n: number, d = 2) => n.toFixed(d).replace(".", ",");

  return {
    show(kind, payload, ttl = 2400) {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      el.classList.remove("is-position", "is-velocity");
      if (kind === "position") {
        el.classList.add("is-position");
        labelEl.textContent = "KONUM";
        valueEl.textContent = `${fmt(payload.distance ?? 0, 1)} m uzakta`;
        subEl.textContent = `x ${fmt(payload.x ?? 0, 1)} · z ${fmt(payload.z ?? 0, 1)}`;
      } else {
        el.classList.add("is-velocity");
        labelEl.textContent = "HIZ";
        valueEl.textContent = `${fmt(payload.speed ?? 0, 2)} m/s`;
        subEl.textContent = "anlık skaler hız";
      }
      el.classList.add("is-visible");
      hideTimer = window.setTimeout(() => {
        el.classList.remove("is-visible");
        hideTimer = null;
      }, ttl);
    },
    hide() {
      if (hideTimer !== null) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      el.classList.remove("is-visible");
    },
    dispose() {
      if (hideTimer !== null) window.clearTimeout(hideTimer);
      el.remove();
    },
  };
}
