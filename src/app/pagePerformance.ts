type PageGraphicsMode = "auto" | "low" | "medium" | "high" | "ultra";
type PageGraphicsTier = Exclude<PageGraphicsMode, "auto">;

const STORAGE_KEY = "audioroom-hub-graphics-v1";
const MODES: ReadonlyArray<{ mode: PageGraphicsMode; label: string }> = [
  { mode: "auto", label: "Otomatik" },
  { mode: "low", label: "Düşük" },
  { mode: "medium", label: "Orta" },
  { mode: "high", label: "Yüksek" },
  { mode: "ultra", label: "Ultra" },
];

function detectTier(): PageGraphicsTier {
  const memory =
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency || 4;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
  );
  let score = 0;
  score += memory >= 12 ? 3 : memory >= 8 ? 2 : memory >= 4 ? 1 : -2;
  score += cores >= 12 ? 3 : cores >= 8 ? 2 : cores >= 4 ? 1 : -2;
  if (reducedMotion) score -= 2;
  if (saveData) score -= 2;
  if (score >= 6) return "ultra";
  if (score >= 3) return "high";
  if (score >= 0) return "medium";
  return "low";
}

function readMode(): PageGraphicsMode {
  try {
    const mode = localStorage.getItem(STORAGE_KEY);
    if (mode === "low" || mode === "medium" || mode === "high" || mode === "ultra") {
      return mode;
    }
  } catch {
    // Depolama kapalıysa otomatik profil kullanılır.
  }
  return "auto";
}

export function bindPagePerformance(): () => void {
  let mode = readMode();
  let open = false;
  let noticeTimer = 0;
  const root = document.documentElement;

  const launcher = document.createElement("button");
  launcher.className = "page-performance-launcher";
  launcher.type = "button";
  launcher.textContent = "GRAFİK";
  launcher.title = "Görsel ayarlar (F2)";
  document.body.appendChild(launcher);

  const panel = document.createElement("section");
  panel.className = "page-performance-panel";
  panel.setAttribute("aria-label", "Görsel ayarlar");
  panel.innerHTML = `
    <header><div><span>PERFORMANS</span><strong>Görsel ayarlar</strong></div><button type="button" data-close aria-label="Kapat">×</button></header>
    <div class="page-performance-panel__modes">
      ${MODES.map(({ mode: value, label }) => `<button type="button" data-mode="${value}">${label}</button>`).join("")}
    </div>
  `;
  document.body.appendChild(panel);

  const notice = document.createElement("div");
  notice.className = "page-performance-notice";
  notice.setAttribute("role", "status");
  notice.innerHTML = `<strong>Görseller otomatik ayarlandı</strong><span>Değiştirmek için F2'ye basın.</span>`;
  document.body.appendChild(notice);

  const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>("[data-mode]"));
  const applyMode = (nextMode: PageGraphicsMode) => {
    mode = nextMode;
    const tier = mode === "auto" ? detectTier() : mode;
    root.dataset.pageGraphicsMode = mode;
    root.dataset.pageGraphicsTier = tier;
    buttons.forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    try {
      if (mode === "auto") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Görsel profil oturum boyunca uygulanmaya devam eder.
    }
  };

  const setOpen = (nextOpen: boolean) => {
    open = nextOpen;
    panel.classList.toggle("is-open", open);
    launcher.classList.toggle("is-active", open);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code !== "F2" || event.repeat) return;
    event.preventDefault();
    setOpen(!open);
  };
  const onVisibilityChange = () => {
    root.classList.toggle("is-page-hidden", document.visibilityState === "hidden");
  };

  launcher.addEventListener("click", () => setOpen(!open));
  panel.querySelector<HTMLButtonElement>("[data-close]")?.addEventListener("click", () => setOpen(false));
  buttons.forEach((button) => {
    button.addEventListener("click", () => applyMode(button.dataset.mode as PageGraphicsMode));
  });
  window.addEventListener("keydown", onKeyDown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  applyMode(mode);
  onVisibilityChange();

  if (mode === "auto") {
    requestAnimationFrame(() => notice.classList.add("is-visible"));
    noticeTimer = window.setTimeout(() => notice.classList.remove("is-visible"), 5200);
  }

  return () => {
    window.clearTimeout(noticeTimer);
    window.removeEventListener("keydown", onKeyDown);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    launcher.remove();
    panel.remove();
    notice.remove();
    delete root.dataset.pageGraphicsMode;
    delete root.dataset.pageGraphicsTier;
    root.classList.remove("is-page-hidden");
  };
}
