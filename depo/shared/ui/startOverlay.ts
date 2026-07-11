import { readInputDeviceProfile } from "../app/inputDeviceProfile";

export type OverlayMode = "intro" | "pause";

export interface OverlayGateState {
  title: string;
  description: string;
  ctaLabel?: string;
  disabled?: boolean;
}

export interface StartOverlay {
  element: HTMLElement;
  show(mode?: OverlayMode): void;
  hide(): void;
  onStart(cb: () => void): void;
  isVisible(): boolean;
  setGateState(state: OverlayGateState | null): void;
  dispose(): void;
}

export interface OverlayShortcut {
  key: string;
  label: string;
}

export interface OverlayConfig {
  intro: {
    kicker: string;
    title: string;
    description: string;
    desktopShortcuts: readonly OverlayShortcut[];
    touchShortcuts?: readonly OverlayShortcut[];
    desktopNotes?: readonly string[];
    touchNotes?: readonly string[];
    ctaLabel?: string;
    touchCtaLabel?: string;
  };
  pause?: {
    kicker?: string;
    description?: string;
    ctaLabel?: string;
  };
}

export function createStartOverlay(
  parent: HTMLElement,
  config: OverlayConfig,
): StartOverlay {
  const element = document.createElement("div");
  element.className = "start-overlay is-first";

  const isTouch = readInputDeviceProfile().usesTouchUi;
  const startVerb = isTouch ? "dokunun" : "tıklayın";
  const introShortcuts = isTouch
    ? config.intro.touchShortcuts ?? config.intro.desktopShortcuts
    : config.intro.desktopShortcuts;
  const introNotes = isTouch
    ? config.intro.touchNotes ?? config.intro.desktopNotes
    : config.intro.desktopNotes;

  const introCta =
    (isTouch ? config.intro.touchCtaLabel : undefined) ??
    config.intro.ctaLabel ??
    "Evrene gir";
  const pauseCta = config.pause?.ctaLabel ?? "Devam et";
  const pauseKicker = config.pause?.kicker ?? "Duraklatıldı";
  const pauseDescription =
    config.pause?.description ?? "Deneyime kaldığınız yerden geri dönebilirsiniz.";

  const shortcutHtml = introShortcuts
    .map(
      (shortcut) => `
        <div class="start-overlay__ctrl">
          <span>${escapeHtml(shortcut.key)}</span>
          <em>${escapeHtml(shortcut.label)}</em>
        </div>
      `,
    )
    .join("");

  const notesHtml = (introNotes ?? [])
    .map((note) => `<p class="start-overlay__note">${escapeHtml(note)}</p>`)
    .join("");

  element.innerHTML = `
    <div class="start-overlay__card start-overlay__card--intro" data-card="intro">
      <p class="start-overlay__kicker">${escapeHtml(config.intro.kicker)}</p>
      <h2>${escapeHtml(config.intro.title)}</h2>
      <p class="start-overlay__desc">${escapeHtml(config.intro.description)}</p>
      <div class="start-overlay__controls" role="group" aria-label="Kontroller">
        ${shortcutHtml}
      </div>
      <div class="start-overlay__gate" data-gate hidden>
        <strong data-gate-title></strong>
        <p data-gate-description></p>
      </div>
      <button type="button" class="start-overlay__cta" data-start="intro">${escapeHtml(introCta)}</button>
      ${notesHtml}
    </div>
    <div class="start-overlay__card start-overlay__card--pause" data-card="pause">
      <p class="start-overlay__kicker">${escapeHtml(pauseKicker)}</p>
      <h2>Devam etmek için ${escapeHtml(startVerb)}</h2>
      <p class="start-overlay__desc">${escapeHtml(pauseDescription)}</p>
      <div class="start-overlay__gate" data-gate hidden>
        <strong data-gate-title></strong>
        <p data-gate-description></p>
      </div>
      <button type="button" class="start-overlay__cta" data-start="pause">${escapeHtml(pauseCta)}</button>
    </div>
  `;

  parent.appendChild(element);

  const introButton = element.querySelector<HTMLButtonElement>('[data-start="intro"]');
  const pauseButton = element.querySelector<HTMLButtonElement>('[data-start="pause"]');
  const gateBlocks = element.querySelectorAll<HTMLElement>("[data-gate]");

  let handler: (() => void) | null = null;
  let started = false;
  let visible = true;
  let mode: OverlayMode = "intro";
  let gateState: OverlayGateState | null = null;

  const applyMode = () => {
    element.classList.toggle("is-first", mode === "intro");
    element.classList.toggle("is-pause", mode === "pause");
  };

  const applyGateState = () => {
    const disabled = gateState?.disabled ?? false;
    const introLabel = gateState?.ctaLabel ?? introCta;
    const pauseLabel = gateState?.ctaLabel ?? pauseCta;

    if (introButton) {
      introButton.disabled = disabled;
      introButton.textContent = introLabel;
    }

    if (pauseButton) {
      pauseButton.disabled = disabled;
      pauseButton.textContent = pauseLabel;
    }

    gateBlocks.forEach((block) => {
      const title = block.querySelector<HTMLElement>("[data-gate-title]");
      const description = block.querySelector<HTMLElement>("[data-gate-description]");

      if (!gateState) {
        block.hidden = true;
        if (title) title.textContent = "";
        if (description) description.textContent = "";
        return;
      }

      block.hidden = false;
      if (title) title.textContent = gateState.title;
      if (description) description.textContent = gateState.description;
    });
  };

  const requestStart = (event?: Event) => {
    event?.stopPropagation();
    if (!visible || gateState?.disabled) {
      return;
    }
    handler?.();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!visible || gateState?.disabled) {
      return;
    }

    if (event.code === "Enter" || event.code === "Space") {
      event.preventDefault();
      handler?.();
    }
  };

  element.addEventListener("click", requestStart);
  document.addEventListener("keydown", onKeyDown);

  applyMode();
  applyGateState();
  document.body.classList.add("is-overlay-open");

  return {
    element,
    show(nextMode = started ? "pause" : "intro") {
      mode = nextMode;
      visible = true;
      element.classList.remove("is-hidden");
      applyMode();
      applyGateState();
      document.body.classList.add("is-overlay-open");
    },
    hide() {
      started = true;
      visible = false;
      element.classList.add("is-hidden");
      document.body.classList.remove("is-overlay-open");
    },
    onStart(cb) {
      handler = cb;
    },
    isVisible() {
      return visible;
    },
    setGateState(state) {
      gateState = state;
      applyGateState();
    },
    dispose() {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("is-overlay-open");
      element.remove();
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
