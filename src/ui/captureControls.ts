/**
 * Sağ üst parlaklık panelinin HEMEN ALTINDA duran iki butondan oluşan küçük,
 * minimal bir widget:
 *
 *   [ EKRAN GÖRÜNTÜSÜ ]
 *   [ PAYLAŞ          ]
 *
 * Davranış:
 *  - "Ekran görüntüsü": `captureScreenshot()` callback'i PNG dataURL döndürür.
 *    Tarayıcı yerel indirme diyaloğu açılsın diye geçici bir <a download> link
 *    programatik olarak tıklanır. Aynı zamanda küçük bir ön izleme pop-up
 *    açılır — oyuncu bakıp "KAYDET / KOPYALA / KAPAT" seçebilir.
 *  - "Paylaş": `navigator.share()` destekleniyorsa paylaşım sheet'i açılır
 *    (mobil + bazı masaüstü). Desteklenmiyorsa pano (clipboard) kopyasına
 *    düşer ve küçük bir toast ile bildirir.
 *
 * Tüm metinler Türkçe. Pointer-lock akışını bozmamak için tıklamalar
 * stopPropagation edilir.
 */
export interface CaptureControlsOptions {
  /**
   * Ekran görüntüsü almak için. Implementasyon büyük ihtimalle
   * `renderer.render(scene, camera); renderer.domElement.toDataURL("image/png")`.
   * Senkron çağrılır, bir sonraki frame'den önce.
   */
  captureScreenshot: () => string;
  /** Paylaşılacak tam URL — default olarak `window.location.href`. */
  shareUrl?: string;
  /** Paylaşım sheet başlığı. */
  shareTitle?: string;
  /** Paylaşım sheet açıklaması (paylaşım metni). */
  shareText?: string;
}

export interface CaptureControls {
  dispose(): void;
}

export function createCaptureControls(
  parent: HTMLElement,
  options: CaptureControlsOptions,
): CaptureControls {
  const shareUrl = options.shareUrl ?? window.location.href;
  const shareTitle = options.shareTitle ?? "Redd — Mükemmel Boşluk";
  const shareText =
    options.shareText ??
    "Sessiz bir kraterde plakları topla, gramofona tak ve Redd'in Mükemmel Boşluk albümünü adımla.";

  const root = document.createElement("div");
  root.className = "capture-panel";
  root.innerHTML = `
    <button type="button" class="capture-panel__btn" data-action="shot" title="Ekran görüntüsü al">
      <span class="capture-panel__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 7h3l1.6-2h6.8L17 7h3v12H4z" />
          <circle cx="12" cy="13" r="3.6" />
        </svg>
      </span>
      <span class="capture-panel__label">Ekran görüntüsü</span>
    </button>
    <button type="button" class="capture-panel__btn" data-action="share" title="Bağlantıyı paylaş">
      <span class="capture-panel__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="6" cy="12" r="2.4" />
          <circle cx="17" cy="6" r="2.4" />
          <circle cx="17" cy="18" r="2.4" />
          <path d="M8 11l7-4M8 13l7 4" />
        </svg>
      </span>
      <span class="capture-panel__label">Paylaş</span>
    </button>
    <div class="capture-panel__toast" role="status" aria-live="polite"></div>
  `;
  parent.appendChild(root);

  /** Tıklama pointer-lock'u çalmasın. */
  root.addEventListener("click", (e) => e.stopPropagation());
  root.addEventListener("mousedown", (e) => e.stopPropagation());
  root.addEventListener("pointerdown", (e) => e.stopPropagation());

  const shotBtn = root.querySelector<HTMLButtonElement>('[data-action="shot"]')!;
  const shareBtn = root.querySelector<HTMLButtonElement>('[data-action="share"]')!;
  const toastEl = root.querySelector<HTMLDivElement>(".capture-panel__toast")!;

  let toastTimer: number | null = null;
  function showToast(message: string, kind: "info" | "ok" | "err" = "info"): void {
    toastEl.textContent = message;
    toastEl.classList.remove("is-ok", "is-err");
    if (kind === "ok") toastEl.classList.add("is-ok");
    else if (kind === "err") toastEl.classList.add("is-err");
    toastEl.classList.add("is-visible");
    if (toastTimer !== null) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");
    }, 2200);
  }

  /** --- Ekran görüntüsü --- */
  shotBtn.addEventListener("click", () => {
    try {
      const dataUrl = options.captureScreenshot();
      if (!dataUrl || !dataUrl.startsWith("data:image/")) {
        showToast("Ekran görüntüsü alınamadı.", "err");
        return;
      }
      openScreenshotPreview(dataUrl, showToast);
    } catch (err) {
      console.warn("[Capture] Ekran görüntüsü hatası:", err);
      showToast("Ekran görüntüsü alınamadı.", "err");
    }
  });

  /** --- Paylaş --- */
  shareBtn.addEventListener("click", async () => {
    const payload = { title: shareTitle, text: shareText, url: shareUrl };

    /** 1) Web Share API — mobil + bazı desktop tarayıcılar. */
    const anyNav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
      canShare?: (data: ShareData) => boolean;
    };
    if (typeof anyNav.share === "function") {
      try {
        if (!anyNav.canShare || anyNav.canShare(payload)) {
          await anyNav.share(payload);
          showToast("Paylaşıldı.", "ok");
          return;
        }
      } catch (err) {
        const name = (err as { name?: string })?.name;
        /** AbortError: kullanıcı iptal etti — sessiz geç. */
        if (name === "AbortError") return;
        /** Diğer hatalar — clipboard fallback'e düş. */
      }
    }

    /** 2) Clipboard fallback — URL kopyala. */
    try {
      await navigator.clipboard.writeText(shareUrl);
      showToast("Bağlantı kopyalandı.", "ok");
    } catch {
      /** 3) En son çare: execCommand. */
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        showToast("Bağlantı kopyalandı.", "ok");
      } catch {
        showToast("Bağlantı kopyalanamadı.", "err");
      }
      ta.remove();
    }
  });

  return {
    dispose() {
      if (toastTimer !== null) window.clearTimeout(toastTimer);
      root.remove();
    },
  };
}

/**
 * Ekran görüntüsü ön izleme modal'ı. İçinde:
 *  - Görüntünün önizlemesi,
 *  - "Kaydet" butonu (dataURL'i indirir),
 *  - "Kopyala" butonu (mümkünse panoya resim olarak kopyalar),
 *  - "Kapat" butonu.
 */
function openScreenshotPreview(
  dataUrl: string,
  showToast: (msg: string, kind?: "info" | "ok" | "err") => void,
): void {
  const overlay = document.createElement("div");
  overlay.className = "shot-preview";
  overlay.innerHTML = `
    <div class="shot-preview__card" role="dialog" aria-label="Ekran görüntüsü ön izleme">
      <div class="shot-preview__header">
        <span class="shot-preview__title">Ekran görüntüsü</span>
        <button type="button" class="shot-preview__close" aria-label="Kapat">✕</button>
      </div>
      <div class="shot-preview__image-wrap">
        <img class="shot-preview__image" alt="Ekran görüntüsü ön izleme" />
      </div>
      <div class="shot-preview__actions">
        <button type="button" class="shot-preview__btn shot-preview__btn--primary" data-action="save">Kaydet (PNG)</button>
        <button type="button" class="shot-preview__btn" data-action="copy">Panoya kopyala</button>
        <button type="button" class="shot-preview__btn" data-action="dismiss">Kapat</button>
      </div>
      <p class="shot-preview__hint">Görüntü cihazınıza PNG olarak indirilir; panoya kopyalama bazı tarayıcılarda desteklenmez.</p>
    </div>
  `;
  document.body.appendChild(overlay);

  /** Pointer-lock'u bozma — overlay tıklamaları dışarı kaçmasın. */
  overlay.addEventListener("click", (e) => e.stopPropagation());
  overlay.addEventListener("mousedown", (e) => e.stopPropagation());
  overlay.addEventListener("pointerdown", (e) => e.stopPropagation());

  const img = overlay.querySelector<HTMLImageElement>(".shot-preview__image")!;
  img.src = dataUrl;

  const saveBtn = overlay.querySelector<HTMLButtonElement>('[data-action="save"]')!;
  const copyBtn = overlay.querySelector<HTMLButtonElement>('[data-action="copy"]')!;
  const dismissBtn = overlay.querySelector<HTMLButtonElement>('[data-action="dismiss"]')!;
  const closeBtn = overlay.querySelector<HTMLButtonElement>(".shot-preview__close")!;

  const filename = buildFilename();

  saveBtn.addEventListener("click", () => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("İndirildi: " + filename, "ok");
  });

  copyBtn.addEventListener("click", async () => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      /** Clipboard.write yalnızca secure context + desteklenen tarayıcılarda. */
      const anyNav = navigator as Navigator & {
        clipboard?: Clipboard & { write?: (data: ClipboardItem[]) => Promise<void> };
      };
      if (!anyNav.clipboard?.write || typeof ClipboardItem === "undefined") {
        showToast("Bu tarayıcı panoya resim kopyalamıyor.", "err");
        return;
      }
      await anyNav.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showToast("Görsel panoya kopyalandı.", "ok");
    } catch (err) {
      console.warn("[Capture] Panoya kopyalama hatası:", err);
      showToast("Panoya kopyalanamadı.", "err");
    }
  });

  function dismiss(): void {
    overlay.classList.add("is-closing");
    window.setTimeout(() => overlay.remove(), 180);
    document.removeEventListener("keydown", onKey);
  }

  dismissBtn.addEventListener("click", dismiss);
  closeBtn.addEventListener("click", dismiss);
  /** Backdrop'a (kart dışı alana) tıklarsa kapat. */
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) dismiss();
  });

  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") dismiss();
  };
  document.addEventListener("keydown", onKey);

  /** Görünürlük animasyonu için rAF. */
  requestAnimationFrame(() => overlay.classList.add("is-visible"));
}

function buildFilename(): string {
  const now = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `mukemmel-bosluk-${stamp}.png`;
}
