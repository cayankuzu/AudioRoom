import { BRIGHTNESS } from "../config/config";

export interface BrightnessControl {
  /** 0..1 normalize edilmiş slider değeri (min..max arasında exposure'a mapping için). */
  value: number;
  /** Doğrudan exposure değeri — renderer.toneMappingExposure buna set edilebilir. */
  exposure: number;
  onChange(cb: (exposure: number) => void): () => void;
  dispose(): void;
}

const STORAGE_KEY = "redd:brightness";
const COLLAPSE_KEY = "redd:brightness:collapsed";

function readStored(): number | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= BRIGHTNESS.min - 0.001 && n <= BRIGHTNESS.max + 0.001) {
      return n;
    }
  } catch {
    /* localStorage yoksa sessizce geç */
  }
  return null;
}

function writeStored(v: number): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(v));
  } catch {
    /* yok say */
  }
}

/**
 * Sağ üst köşede minimal Türkçe kontrol paneli.
 * Kullanıcı bir slider ile genel parlaklığı (tone mapping exposure) ayarlar.
 * Değer localStorage'da saklanır; sayfa açılışında geri yüklenir.
 */
export function createBrightnessControl(parent: HTMLElement): BrightnessControl {
  const root = document.createElement("div");
  root.className = "bright-panel";
  const initial = readStored() ?? BRIGHTNESS.default;
  const collapsedInitial = (() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  })();
  if (collapsedInitial) root.classList.add("bright-panel--collapsed");
  root.innerHTML = `
    <button type="button" class="bright-panel__toggle" aria-label="Parlaklık panelini aç/kapat" title="Parlaklık">
      <span class="bright-panel__toggle-dot" aria-hidden="true"></span>
      <span class="bright-panel__toggle-label">Parlaklık</span>
    </button>
    <div class="bright-panel__body">
      <label class="bright-panel__label">
        <input
          type="range"
          class="bright-panel__slider"
          min="${BRIGHTNESS.min}"
          max="${BRIGHTNESS.max}"
          step="${BRIGHTNESS.step}"
          value="${initial}"
          aria-label="Sahne parlaklığı"
        />
        <span class="bright-panel__value" aria-live="polite">${initial.toFixed(2)}×</span>
      </label>
    </div>
  `;
  parent.appendChild(root);

  const slider = root.querySelector<HTMLInputElement>(".bright-panel__slider");
  const valueEl = root.querySelector<HTMLSpanElement>(".bright-panel__value");
  const toggleBtn = root.querySelector<HTMLButtonElement>(".bright-panel__toggle");
  if (!slider || !valueEl || !toggleBtn) {
    throw new Error("Parlaklık kontrolü DOM eksik");
  }

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const nowCollapsed = !root.classList.contains("bright-panel--collapsed");
    root.classList.toggle("bright-panel--collapsed", nowCollapsed);
    try {
      window.localStorage.setItem(COLLAPSE_KEY, nowCollapsed ? "1" : "0");
    } catch {
      /* yok say */
    }
  });

  const listeners = new Set<(exposure: number) => void>();
  const state = {
    exposure: initial,
    value: (initial - BRIGHTNESS.min) / (BRIGHTNESS.max - BRIGHTNESS.min),
  };

  function emit(): void {
    valueEl!.textContent = `${state.exposure.toFixed(2)}×`;
    listeners.forEach((cb) => cb(state.exposure));
  }

  slider.addEventListener("input", () => {
    const raw = Number(slider.value);
    const exp = Math.max(BRIGHTNESS.min, Math.min(BRIGHTNESS.max, raw));
    state.exposure = exp;
    state.value = (exp - BRIGHTNESS.min) / (BRIGHTNESS.max - BRIGHTNESS.min);
    writeStored(exp);
    emit();
  });

  /** Tıklama pointer-lock'u çalmasın. */
  root.addEventListener("click", (e) => e.stopPropagation());
  root.addEventListener("mousedown", (e) => e.stopPropagation());
  root.addEventListener("pointerdown", (e) => e.stopPropagation());

  return {
    get value() {
      return state.value;
    },
    get exposure() {
      return state.exposure;
    },
    onChange(cb) {
      listeners.add(cb);
      /** Mevcut değeri hemen ver — tüketici ilk değeri uygulayabilsin. */
      cb(state.exposure);
      return () => {
        listeners.delete(cb);
      };
    },
    dispose() {
      listeners.clear();
      root.remove();
    },
  };
}
