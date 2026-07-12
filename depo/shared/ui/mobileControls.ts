export interface MobileControls {
  element: HTMLElement;
  setVisible(visible: boolean): void;
  setFullscreenActive(active: boolean): void;
  dispose(): void;
}

export interface MobileActionDefinition {
  slot:
    | "top-left"
    | "top-middle"
    | "top-right"
    | "bottom-left"
    | "bottom-middle"
    | "bottom-right";
  keyCode: string;
  glyph: string;
  label: string;
  ariaLabel: string;
  tone?: "default" | "primary" | "secondary";
}

export interface MobileToolDefinition {
  id: string;
  icon:
    | "back"
    | "eye"
    | "flashlight"
    | "map"
    | "panel"
    | "fullscreen"
    | "pause";
  ariaLabel: string;
  onPress?: () => void;
  special?: "eye" | "fullscreen";
}

export interface MobileInputHandle {
  injectLook(dx: number, dy: number): void;
  setVirtualKey(code: string, pressed: boolean): void;
}

export interface MobileControlsOptions {
  actions: readonly MobileActionDefinition[];
  tools: readonly MobileToolDefinition[];
  lookSkipSelectors?: readonly string[];
}

export function createMobileControls(
  parent: HTMLElement,
  input: MobileInputHandle,
  options: MobileControlsOptions,
): MobileControls {
  const root = document.createElement("div");
  root.className = "mobile-controls";
  root.setAttribute("aria-hidden", "false");

  const actionsHtml = options.actions
    .map(
      (action) => `
        <button
          type="button"
          class="mobile-controls__action mobile-controls__action--${action.tone ?? "default"}"
          data-key="${escapeHtml(action.keyCode)}"
          data-slot="${action.slot}"
          aria-label="${escapeHtml(action.ariaLabel)}"
        >
          <span class="mobile-controls__action-glyph">${escapeHtml(action.glyph)}</span>
          <span class="mobile-controls__action-label">${escapeHtml(action.label)}</span>
        </button>
      `,
    )
    .join("");

  const toolsHtml = options.tools
    .map((tool) => {
      const special = tool.special ? ` data-special="${tool.special}"` : "";
      const pressed =
        tool.special === "eye" || tool.special === "fullscreen"
          ? 'aria-pressed="false"'
          : "";
      return `
        <button
          type="button"
          class="mobile-controls__tool mobile-controls__tool--${tool.id}"
          data-tool="${tool.id}"
          ${special}
          ${pressed}
          aria-label="${escapeHtml(tool.ariaLabel)}"
        >
          ${renderToolIcon(tool.icon)}
        </button>
      `;
    })
    .join("");

  root.innerHTML = `
    <div class="mobile-controls__dpad" data-dpad>
      <button type="button" class="mobile-controls__pad mobile-controls__pad--up" data-key="ArrowUp" aria-label="İleri">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5l7 8H5z" fill="currentColor"/></svg>
      </button>
      <button type="button" class="mobile-controls__pad mobile-controls__pad--left" data-key="ArrowLeft" aria-label="Sola adım">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l8-7v14z" fill="currentColor"/></svg>
      </button>
      <button type="button" class="mobile-controls__pad mobile-controls__pad--right" data-key="ArrowRight" aria-label="Sağa adım">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12l-8 7V5z" fill="currentColor"/></svg>
      </button>
      <button type="button" class="mobile-controls__pad mobile-controls__pad--down" data-key="ArrowDown" aria-label="Geri">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19l-7-8h14z" fill="currentColor"/></svg>
      </button>
    </div>

    <div class="mobile-controls__actions" data-actions>
      ${actionsHtml}
    </div>

    <div class="mobile-controls__toolbar" data-toolbar>
      ${toolsHtml}
    </div>
  `;

  parent.appendChild(root);

  const bindings = Array.from(
    root.querySelectorAll<HTMLButtonElement>("[data-key]"),
  ).map((button) => ({
    button,
    keyCode: button.dataset.key ?? "",
  }));

  const press = (keyCode: string) => {
    input.setVirtualKey(keyCode, true);
  };

  const release = (keyCode: string) => {
    input.setVirtualKey(keyCode, false);
  };

  const activeControlPointers = new Set<number>();
  const trackControlPointer = (pointerId: number) => {
    activeControlPointers.add(pointerId);
  };
  const releaseControlPointer = (pointerId: number) => {
    activeControlPointers.delete(pointerId);
  };

  bindings.forEach(({ button, keyCode }) => {
    const onPointerDown = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      trackControlPointer(event.pointerId);
      try {
        button.setPointerCapture(event.pointerId);
      } catch {
        /* no-op */
      }
      button.classList.add("is-pressed");
      press(keyCode);
    };

    const onPointerEnd = (event: PointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
      releaseControlPointer(event.pointerId);
      button.classList.remove("is-pressed");
      release(keyCode);
    };

    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointerup", onPointerEnd);
    button.addEventListener("pointercancel", onPointerEnd);
    button.addEventListener("lostpointercapture", onPointerEnd);
  });

  const toolMap = new Map(options.tools.map((tool) => [tool.id, tool]));
  let uiHidden = false;
  const fullscreenButton = root.querySelector<HTMLButtonElement>(
    '[data-special="fullscreen"]',
  );
  const eyeButton = root.querySelector<HTMLButtonElement>('[data-special="eye"]');

  root.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((button) => {
    const tool = toolMap.get(button.dataset.tool ?? "");
    if (!tool) {
      return;
    }

    const clear = () => {
      button.classList.remove("is-pressed");
    };

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (tool.special === "eye") {
        uiHidden = !uiHidden;
        document.body.classList.toggle("is-ui-hidden", uiHidden);
        eyeButton?.setAttribute("aria-pressed", String(uiHidden));
        return;
      }

      tool.onPress?.();
    });

    button.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      trackControlPointer(event.pointerId);
      button.classList.add("is-pressed");
    });
    button.addEventListener("pointerup", (event) => {
      releaseControlPointer(event.pointerId);
      clear();
    });
    button.addEventListener("pointercancel", (event) => {
      releaseControlPointer(event.pointerId);
      clear();
    });
    button.addEventListener("pointerleave", clear);
  });

  const skipSelectors = [
    ".mobile-controls__pad",
    ".mobile-controls__action",
    ".mobile-controls__tool",
    ".mobile-controls__toolbar",
    ".album-panel",
    ".minimap",
    ".start-overlay",
    ".hud",
    ".brand-footer",
    ".interaction-hint",
    "button",
    "input",
    "a",
    "iframe",
    "[role='slider']",
    ...(options.lookSkipSelectors ?? []),
  ].join(", ");

  let activeLookPointer: number | null = null;
  let lastX = 0;
  let lastY = 0;

  const onDocumentPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") {
      return;
    }

    if (activeControlPointers.has(event.pointerId)) {
      return;
    }

    if (activeLookPointer !== null) {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (target?.closest(skipSelectors)) {
      return;
    }

    activeLookPointer = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
  };

  const onDocumentPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== activeLookPointer) {
      return;
    }

    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;

    lastX = event.clientX;
    lastY = event.clientY;
    input.injectLook(-dx * 0.0042, -dy * 0.0034);
  };

  const onDocumentPointerEnd = (event: PointerEvent) => {
    releaseControlPointer(event.pointerId);

    if (event.pointerId !== activeLookPointer) {
      return;
    }

    activeLookPointer = null;
  };

  const onGestureStart = (event: Event) => {
    event.preventDefault();
  };

  document.addEventListener("pointerdown", onDocumentPointerDown, {
    passive: true,
  });
  document.addEventListener("pointermove", onDocumentPointerMove, {
    passive: true,
  });
  document.addEventListener("pointerup", onDocumentPointerEnd, {
    passive: true,
  });
  document.addEventListener("pointercancel", onDocumentPointerEnd, {
    passive: true,
  });
  document.addEventListener("gesturestart", onGestureStart);

  let visible = true;

  return {
    element: root,
    setVisible(nextVisible) {
      if (visible === nextVisible) {
        return;
      }
      visible = nextVisible;
      root.classList.toggle("is-hidden", !nextVisible);
    },
    setFullscreenActive(active) {
      fullscreenButton?.setAttribute("aria-pressed", String(active));
    },
    dispose() {
      document.removeEventListener("pointerdown", onDocumentPointerDown);
      document.removeEventListener("pointermove", onDocumentPointerMove);
      document.removeEventListener("pointerup", onDocumentPointerEnd);
      document.removeEventListener("pointercancel", onDocumentPointerEnd);
      document.removeEventListener("gesturestart", onGestureStart);
      document.body.classList.remove("is-ui-hidden");
      root.remove();
    },
  };
}

function renderToolIcon(icon: MobileToolDefinition["icon"]): string {
  switch (icon) {
    case "back":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case "eye":
      return `
        <svg class="mobile-controls__tool-eye-open" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
        <svg class="mobile-controls__tool-eye-closed" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      `;
    case "flashlight":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12l-2 5H8zM8 9h8v4l-1 9h-6l-1-9z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
    case "map":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v16M15 6v16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
    case "panel":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14M5 12h14M5 18h10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
    case "fullscreen":
      return `
        <svg class="mobile-controls__tool-fs-enter" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <svg class="mobile-controls__tool-fs-exit" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      `;
    case "pause":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
