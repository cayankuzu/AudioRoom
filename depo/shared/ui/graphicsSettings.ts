import type {
  AdaptiveGraphicsProfile,
  AdaptivePerformanceManager,
  AdaptivePerformanceSnapshot,
  GraphicsMode,
} from "../systems/adaptivePerformance";

export interface GraphicsSettingsHandle {
  showOptimizedNotice(): void;
  toggle(): void;
  isOpen(): boolean;
  dispose(): void;
}

const OPTIONS: ReadonlyArray<{
  mode: GraphicsMode;
  label: string;
  detail: string;
}> = [
  { mode: "auto", label: "Otomatik", detail: "Cihaza ve FPS'e göre ayarlanır" },
  { mode: "low", label: "Düşük", detail: "En yüksek kararlılık" },
  { mode: "medium", label: "Orta", detail: "Hız ve netlik dengesi" },
  { mode: "high", label: "Yüksek", detail: "Daha net görüntü" },
  { mode: "ultra", label: "Ultra", detail: "Güçlü cihazlar için" },
];

export function createGraphicsSettings(
  parent: HTMLElement,
  manager: AdaptivePerformanceManager,
  onProfileChange?: (profile: AdaptiveGraphicsProfile) => void,
  /**
   * Panel her açılıp kapandığında çağrılır. Çağıran taraf bunu genelde
   * oyunun kendi kilit/pause mekanizmasına (`input.releaseLock()`) bağlar
   * — `document.exitPointerLock()` tek başına bazı tarayıcı/klavye
   * kombinasyonlarında güvenilir tetiklenmeyebiliyor; oyunun KENDİ
   * kanıtlanmış pause yoluyla (Pause butonuyla aynı) çağrılması daha
   * sağlam.
   */
  onOpenChange?: (open: boolean) => void,
): GraphicsSettingsHandle {
  const launcher = document.createElement("button");
  launcher.className = "adaptive-graphics-launcher";
  launcher.type = "button";
  launcher.title = "Grafik ayarları (F2)";
  launcher.setAttribute("aria-label", "Grafik ayarlarını aç");
  launcher.innerHTML = `<span aria-hidden="true">◫</span><strong>GRAFİK</strong>`;
  parent.appendChild(launcher);

  const panel = document.createElement("section");
  panel.className = "adaptive-graphics";
  panel.setAttribute("aria-label", "Grafik ayarları");
  panel.innerHTML = `
    <div class="adaptive-graphics__head">
      <div><span>PERFORMANS</span><strong>Grafik ayarları</strong></div>
      <button type="button" data-graphics-close aria-label="Grafik ayarlarını kapat">×</button>
    </div>
    <div class="adaptive-graphics__modes">
      ${OPTIONS.map(
        (option) => `
          <button type="button" data-graphics-mode="${option.mode}">
            <strong>${option.label}</strong><span>${option.detail}</span>
          </button>`,
      ).join("")}
    </div>
    <div class="adaptive-graphics__telemetry" aria-live="polite">
      <span data-graphics-tier>—</span>
      <span data-graphics-fps>— FPS</span>
      <span data-graphics-scale>—%</span>
    </div>
  `;
  parent.appendChild(panel);

  const notice = document.createElement("div");
  notice.className = "adaptive-graphics-notice";
  notice.setAttribute("role", "status");
  notice.innerHTML = `
    <span class="adaptive-graphics-notice__mark">✓</span>
    <span><strong>Grafikler otomatik ayarlandı</strong>Cihazınız için en optimize profil seçildi. Değiştirmek için F2'ye basın.</span>
    <button type="button" aria-label="Bildirimi kapat">×</button>
  `;
  parent.appendChild(notice);

  const close = panel.querySelector<HTMLButtonElement>("[data-graphics-close]");
  const tier = panel.querySelector<HTMLElement>("[data-graphics-tier]");
  const fps = panel.querySelector<HTMLElement>("[data-graphics-fps]");
  const scale = panel.querySelector<HTMLElement>("[data-graphics-scale]");
  const buttons = Array.from(
    panel.querySelectorAll<HTMLButtonElement>("[data-graphics-mode]"),
  );
  let open = false;
  let noticeTimer = 0;

  const setOpen = (nextOpen: boolean) => {
    open = nextOpen;
    panel.classList.toggle("is-open", open);
    launcher.classList.toggle("is-active", open);
    launcher.setAttribute("aria-expanded", String(open));
    /**
     * Masaüstünde oyun sırasında imleç pointer-lock ile gizli/kilitli olur
     * (FPS bakış kontrolü). Paneli F2 ile açarken kilidi bırakmazsak fare
     * hareket etmiyormuş gibi görünür ve kullanıcı hiçbir butona
     * tıklayamaz. Panel her açıldığında kilidi bırak ki imleç normal
     * şekilde görünüp hareket etsin.
     */
    if (open && document.pointerLockElement) {
      document.exitPointerLock();
    }
    onOpenChange?.(open);
  };

  const render = (
    profile: AdaptiveGraphicsProfile,
    snapshot: AdaptivePerformanceSnapshot,
  ) => {
    buttons.forEach((button) => {
      const selected = button.dataset.graphicsMode === snapshot.mode;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (tier) tier.textContent = profile.label;
    if (fps) fps.textContent = `${snapshot.fps} FPS`;
    if (scale) scale.textContent = `${Math.round(snapshot.pixelRatio * 100)}% çözünürlük`;
    onProfileChange?.(profile);
  };

  const offChange = manager.onChange(render);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code !== "F2" || event.repeat) return;
    event.preventDefault();
    setOpen(!open);
  };
  window.addEventListener("keydown", onKeyDown);
  launcher.addEventListener("click", () => setOpen(!open));
  close?.addEventListener("click", () => setOpen(false));
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      manager.setMode(button.dataset.graphicsMode as GraphicsMode);
    });
  });
  notice.querySelector("button")?.addEventListener("click", () => {
    notice.classList.remove("is-visible");
  });

  return {
    showOptimizedNotice() {
      if (manager.mode !== "auto") return;
      window.clearTimeout(noticeTimer);
      notice.classList.add("is-visible");
      noticeTimer = window.setTimeout(
        () => notice.classList.remove("is-visible"),
        14000,
      );
    },
    toggle() {
      setOpen(!open);
    },
    isOpen() {
      return open;
    },
    dispose() {
      window.clearTimeout(noticeTimer);
      window.removeEventListener("keydown", onKeyDown);
      offChange();
      launcher.remove();
      panel.remove();
      notice.remove();
    },
  };
}
