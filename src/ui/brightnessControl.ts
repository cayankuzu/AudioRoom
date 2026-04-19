import { BRIGHTNESS, CONTRAST } from "../config/config";

export interface BrightnessControl {
  /** 0..1 normalize edilmiş slider değeri (min..max arasında exposure'a mapping için). */
  value: number;
  /** Doğrudan exposure değeri — renderer.toneMappingExposure buna set edilebilir. */
  exposure: number;
  /** Kontrast slider'ının anlık değeri (grading uContrast için). */
  contrast: number;
  /** Parlaklık değişikliklerine abonelik. */
  onChange(cb: (exposure: number) => void): () => void;
  /** Kontrast değişikliklerine abonelik. */
  onContrastChange(cb: (contrast: number) => void): () => void;
  /**
   * Paneli aç/kapat. Kullanıcı UI'dan tıklasa da, global bir kısayol (L)
   * tetiklese de aynı kod yoluyla çalışır.
   */
  toggle(): void;
  /** Panelin anlık açık/kapalı durumu. */
  readonly collapsed: boolean;
  dispose(): void;
}

/**
 * NOT: Default'lar parlaklık = 0.61, kontrast = 1.01 olarak belirlendi.
 * Önceki kayıtlı değerleri geçersiz kılmak için storage key'lerini v4'e
 * bump ettik — sayfa açılışında kullanıcı temiz default'ları görüyor,
 * slider'ı kaydırdıktan sonra tercihi v4 anahtarında kalıcı oluyor.
 */
const STORAGE_KEY = "redd:brightness:v4";
const CONTRAST_KEY = "redd:contrast:v4";
const COLLAPSE_KEY = "redd:brightness:collapsed";

/**
 * İki slider'ın tam tolerans eşiği — slider step'leri düşünüldüğünde
 * bu aralık içinde kalan değerler "default" sayılır, reset butonu
 * görünmez. Parlaklık step 0.02 → 0.01 tolerans; kontrast step 0.01 →
 * 0.005 tolerans.
 */
const EPS_BRIGHT = BRIGHTNESS.step * 0.5;
const EPS_CONTRAST = CONTRAST.step * 0.5;

function readNumber(key: string, min: number, max: number): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= min - 0.001 && n <= max + 0.001) return n;
  } catch {
    /* localStorage yoksa sessizce geç */
  }
  return null;
}

function writeNumber(key: string, v: number): void {
  try {
    window.localStorage.setItem(key, String(v));
  } catch {
    /* yok say */
  }
}

/**
 * Sağ üst köşede minimal Türkçe kontrol paneli.
 *
 * İki slider içerir:
 *   1. Parlaklık (tone mapping exposure)
 *   2. Kontrast (post-process color grading)
 *
 * Her iki değer de localStorage'da saklanır; sayfa açılışında geri yüklenir.
 * Panel, küçük başlık butonuna tıklanarak VEYA dışarıdan `toggle()`
 * çağrılarak (ör. L kısayolu) açılıp kapanabilir.
 */
export function createBrightnessControl(parent: HTMLElement): BrightnessControl {
  const root = document.createElement("div");
  root.className = "bright-panel";

  const initialBrightness = readNumber(STORAGE_KEY, BRIGHTNESS.min, BRIGHTNESS.max) ?? BRIGHTNESS.default;
  const initialContrast = readNumber(CONTRAST_KEY, CONTRAST.min, CONTRAST.max) ?? CONTRAST.default;

  const collapsedInitial = (() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  })();
  if (collapsedInitial) root.classList.add("bright-panel--collapsed");

  root.innerHTML = `
    <div class="bright-panel__head">
      <button type="button" class="bright-panel__toggle" aria-label="Parlaklık / Kontrast panelini aç/kapat" title="Parlaklık & Kontrast (L)">
        <span class="bright-panel__toggle-dot" aria-hidden="true"></span>
        <span class="bright-panel__toggle-label">Parlaklık · Kontrast</span>
      </button>
      <button type="button" class="bright-panel__reset" data-reset title="Varsayılana döndür" aria-label="Varsayılana döndür" hidden>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
        <span class="bright-panel__reset-label">Varsayılan</span>
      </button>
    </div>
    <div class="bright-panel__body">
      <label class="bright-panel__label">
        <span class="bright-panel__kicker">Parlaklık</span>
        <input
          type="range"
          class="bright-panel__slider bright-panel__slider--brightness"
          min="${BRIGHTNESS.min}"
          max="${BRIGHTNESS.max}"
          step="${BRIGHTNESS.step}"
          value="${initialBrightness}"
          aria-label="Sahne parlaklığı"
        />
        <span class="bright-panel__value bright-panel__value--brightness" aria-live="polite">${initialBrightness.toFixed(2)}×</span>
      </label>
      <label class="bright-panel__label">
        <span class="bright-panel__kicker">Kontrast</span>
        <input
          type="range"
          class="bright-panel__slider bright-panel__slider--contrast"
          min="${CONTRAST.min}"
          max="${CONTRAST.max}"
          step="${CONTRAST.step}"
          value="${initialContrast}"
          aria-label="Sahne kontrastı"
        />
        <span class="bright-panel__value bright-panel__value--contrast" aria-live="polite">${initialContrast.toFixed(2)}</span>
      </label>
    </div>
  `;
  parent.appendChild(root);

  const brSlider = root.querySelector<HTMLInputElement>(".bright-panel__slider--brightness");
  const brValueEl = root.querySelector<HTMLSpanElement>(".bright-panel__value--brightness");
  const ctSlider = root.querySelector<HTMLInputElement>(".bright-panel__slider--contrast");
  const ctValueEl = root.querySelector<HTMLSpanElement>(".bright-panel__value--contrast");
  const toggleBtn = root.querySelector<HTMLButtonElement>(".bright-panel__toggle");
  const resetBtn = root.querySelector<HTMLButtonElement>(".bright-panel__reset");
  if (!brSlider || !brValueEl || !ctSlider || !ctValueEl || !toggleBtn || !resetBtn) {
    throw new Error("Parlaklık / Kontrast kontrolü DOM eksik");
  }

  const brightnessListeners = new Set<(exposure: number) => void>();
  const contrastListeners = new Set<(contrast: number) => void>();

  const state = {
    exposure: initialBrightness,
    value: (initialBrightness - BRIGHTNESS.min) / (BRIGHTNESS.max - BRIGHTNESS.min),
    contrast: initialContrast,
    collapsed: collapsedInitial,
  };

  function applyCollapsed(nowCollapsed: boolean): void {
    state.collapsed = nowCollapsed;
    root.classList.toggle("bright-panel--collapsed", nowCollapsed);
    try {
      window.localStorage.setItem(COLLAPSE_KEY, nowCollapsed ? "1" : "0");
    } catch {
      /* yok say */
    }
  }

  function toggle(): void {
    applyCollapsed(!state.collapsed);
  }

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  /**
   * Reset butonu, iki slider'dan en az biri default'tan sapmışsa
   * görünür. Değerler default'a yakınsa (EPS tolerans içinde) gizlenir.
   */
  function refreshResetVisibility(): void {
    const brDrift = Math.abs(state.exposure - BRIGHTNESS.default) > EPS_BRIGHT;
    const ctDrift = Math.abs(state.contrast - CONTRAST.default) > EPS_CONTRAST;
    const show = brDrift || ctDrift;
    resetBtn!.hidden = !show;
    root.classList.toggle("bright-panel--dirty", show);
  }

  function emitBrightness(): void {
    brValueEl!.textContent = `${state.exposure.toFixed(2)}×`;
    brightnessListeners.forEach((cb) => cb(state.exposure));
    refreshResetVisibility();
  }

  function emitContrast(): void {
    ctValueEl!.textContent = state.contrast.toFixed(2);
    contrastListeners.forEach((cb) => cb(state.contrast));
    refreshResetVisibility();
  }

  brSlider.addEventListener("input", () => {
    const raw = Number(brSlider.value);
    const exp = Math.max(BRIGHTNESS.min, Math.min(BRIGHTNESS.max, raw));
    state.exposure = exp;
    state.value = (exp - BRIGHTNESS.min) / (BRIGHTNESS.max - BRIGHTNESS.min);
    writeNumber(STORAGE_KEY, exp);
    emitBrightness();
  });

  ctSlider.addEventListener("input", () => {
    const raw = Number(ctSlider.value);
    const c = Math.max(CONTRAST.min, Math.min(CONTRAST.max, raw));
    state.contrast = c;
    writeNumber(CONTRAST_KEY, c);
    emitContrast();
  });

  /**
   * Reset → her iki slider'ı fabrika default'una çeker, localStorage'a
   * yazar, dinleyicileri tetikler. Panel kapalıyken de çalışır; dirty
   * state panel header'ında görsel işaret olarak zaten gözükür.
   */
  resetBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    state.exposure = BRIGHTNESS.default;
    state.value = (BRIGHTNESS.default - BRIGHTNESS.min) / (BRIGHTNESS.max - BRIGHTNESS.min);
    state.contrast = CONTRAST.default;
    brSlider!.value = String(BRIGHTNESS.default);
    ctSlider!.value = String(CONTRAST.default);
    writeNumber(STORAGE_KEY, BRIGHTNESS.default);
    writeNumber(CONTRAST_KEY, CONTRAST.default);
    emitBrightness();
    emitContrast();
  });

  /** İlk durum — kayıtlı localStorage değerine göre buton görünüp görünmez. */
  refreshResetVisibility();

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
    get contrast() {
      return state.contrast;
    },
    get collapsed() {
      return state.collapsed;
    },
    onChange(cb) {
      brightnessListeners.add(cb);
      /** Mevcut değeri hemen ver — tüketici ilk değeri uygulayabilsin. */
      cb(state.exposure);
      return () => {
        brightnessListeners.delete(cb);
      };
    },
    onContrastChange(cb) {
      contrastListeners.add(cb);
      cb(state.contrast);
      return () => {
        contrastListeners.delete(cb);
      };
    },
    toggle,
    dispose() {
      brightnessListeners.clear();
      contrastListeners.clear();
      root.remove();
    },
  };
}
