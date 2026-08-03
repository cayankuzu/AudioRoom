import type {
  GraphicsMode,
  GraphicsProfile,
  PerformanceManager,
  PerformanceSnapshot,
} from "../systems/performanceManager";

export interface GraphicsSettingsHandle {
  showOptimizedNotice(): void;
  toggle(): void;
  isOpen(): boolean;
  dispose(): void;
}

const OPTIONS: Array<{ mode: GraphicsMode; label: string; detail: string }> = [
  { mode: "auto", label: "Otomatik", detail: "Cihaza ve FPS'e göre canlı ayarlar" },
  { mode: "performance", label: "Akıcı", detail: "En yüksek kararlılık" },
  { mode: "balanced", label: "Dengeli", detail: "Netlik ve hız dengesi" },
  { mode: "quality", label: "Sinematik", detail: "Güçlü cihazlar için" },
];

export function createGraphicsSettings(
  parent: HTMLElement,
  manager: PerformanceManager,
  onProfileChange: (profile: GraphicsProfile) => void,
): GraphicsSettingsHandle {
  const panel = document.createElement("section");
  panel.className = "graphics-settings";
  panel.setAttribute("aria-label", "Grafik ayarları");
  panel.innerHTML = `
    <div class="graphics-settings__head">
      <div>
        <span>PERFORMANS</span>
        <strong>Grafik ayarları</strong>
      </div>
      <button type="button" aria-label="Grafik ayarlarını kapat">−</button>
    </div>
    <div class="graphics-settings__modes">
      ${OPTIONS.map(
        (option) => `
          <button type="button" data-graphics-mode="${option.mode}">
            <strong>${option.label}</strong>
            <span>${option.detail}</span>
          </button>`,
      ).join("")}
    </div>
    <div class="graphics-settings__telemetry" aria-live="polite">
      <span data-graphics-tier>—</span>
      <span data-graphics-fps>— FPS</span>
      <span data-graphics-scale>—%</span>
    </div>
  `;
  parent.appendChild(panel);

  const notice = document.createElement("div");
  notice.className = "graphics-auto-notice";
  notice.setAttribute("role", "status");
  notice.innerHTML = `
    <span class="graphics-auto-notice__mark">✓</span>
    <span><strong>Grafikler otomatik ayarlandı</strong>Cihazınız için en optimize profil seçildi. Değiştirmek için G tuşuna basın.</span>
    <button type="button" aria-label="Bildirimi kapat">×</button>
  `;
  parent.appendChild(notice);

  const close = panel.querySelector<HTMLButtonElement>(".graphics-settings__head button");
  const tier = panel.querySelector<HTMLElement>("[data-graphics-tier]");
  const fps = panel.querySelector<HTMLElement>("[data-graphics-fps]");
  const scale = panel.querySelector<HTMLElement>("[data-graphics-scale]");
  const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>("[data-graphics-mode]"));
  let open = false;
  let noticeTimer = 0;

  const render = (profile: GraphicsProfile, snapshot: PerformanceSnapshot) => {
    buttons.forEach((button) => {
      const selected = button.dataset.graphicsMode === snapshot.mode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (tier) tier.textContent = profile.label;
    if (fps) fps.textContent = `${snapshot.fps} FPS`;
    if (scale) scale.textContent = `${Math.round(snapshot.pixelRatio * 100)}% çözünürlük`;
    onProfileChange(profile);
  };

  const offChange = manager.onChange(render);
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      manager.setMode(button.dataset.graphicsMode as GraphicsMode);
    });
  });
  close?.addEventListener("click", () => {
    open = false;
    panel.classList.remove("is-open");
  });
  notice.querySelector("button")?.addEventListener("click", () => {
    notice.classList.remove("is-visible");
  });

  return {
    showOptimizedNotice() {
      window.clearTimeout(noticeTimer);
      notice.classList.add("is-visible");
      noticeTimer = window.setTimeout(() => notice.classList.remove("is-visible"), 7200);
    },
    toggle() {
      open = !open;
      panel.classList.toggle("is-open", open);
    },
    isOpen() {
      return open;
    },
    dispose() {
      window.clearTimeout(noticeTimer);
      offChange();
      panel.remove();
      notice.remove();
    },
  };
}
