import { defaultSettings, type Settings } from "../core/storage";
import type { WorldMeta } from "../world";
import { button, el, keycap } from "./dom";

export interface Menu {
  showIntro(): void;
  showPause(): void;
  hide(): void;
  readonly open: boolean;
  setStartEnabled(enabled: boolean, label?: string): void;
  dispose(): void;
}

export interface MenuHandlers {
  onStart(): void;
  onSettings(settings: Settings): void;
  /** Evreni sıfırla: ilerleme, final ve gizli keşifler silinir, evren baştan yüklenir. */
  onReset(): void;
  /** Duraklatma ekranındaki durum satırı (ör. "Plaklar 3/12 · Gizli keşifler 1/8"). */
  status(): string;
  libraryHref: string;
  demo: boolean;
}

type SliderKey = "brightness" | "fov" | "sensitivity" | "musicVolume" | "sfxVolume";

const SLIDERS: Array<{ key: SliderKey; label: string; min: number; max: number; step: number; format: (v: number) => string }> = [
  { key: "brightness", label: "Parlaklık", min: 0.7, max: 1.3, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
  { key: "fov", label: "Görüş alanı", min: 60, max: 95, step: 1, format: (v) => `${v}°` },
  { key: "sensitivity", label: "Bakış hassasiyeti", min: 0.3, max: 2.5, step: 0.05, format: (v) => `${v.toFixed(2)}×` },
  { key: "musicVolume", label: "Müzik", min: 0, max: 1, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
  { key: "sfxVolume", label: "Efekt ve ortam", min: 0, max: 1, step: 0.01, format: (v) => `${Math.round(v * 100)}%` },
];

export function createMenu(parent: HTMLElement, meta: WorldMeta, settings: Settings, handlers: MenuHandlers): Menu {
  const root = el("div", "ar-menu");
  const card = el("div", "ar-menu__card");
  root.appendChild(card);
  parent.appendChild(root);

  const library = el("a", "ar-menu__library", "‹ Kütüphane");
  library.href = handlers.libraryHref;

  const kicker = el("span", "ar-menu__kicker");
  const title = el("h1", "ar-menu__title", meta.album);
  const body = el("div", "ar-menu__body");
  card.append(library, kicker, title, body);

  let open = true;
  let startEnabled = true;
  let startLabel = handlers.demo ? "Demoyu başlat" : "Evrene gir";

  const controlsGrid = () => {
    const grid = el("div", "ar-controls");
    for (const hint of meta.controls) {
      const row = el("div", "ar-controls__row");
      const keys = el("span", "ar-controls__keys");
      hint.keys.split(" ").forEach((key) => keys.appendChild(keycap(key)));
      row.append(keys, el("span", "ar-controls__label", hint.label));
      grid.appendChild(row);
    }
    return grid;
  };

  const startButton = () => {
    const cta = button("ar-btn ar-btn--primary", startLabel, () => {
      if (startEnabled) handlers.onStart();
    });
    cta.disabled = !startEnabled;
    cta.dataset.start = "";
    return cta;
  };

  const renderIntro = () => {
    kicker.textContent = `${meta.artist} · ${meta.year}`;
    const description = el("p", "ar-menu__desc", meta.description);
    const mechanic = el("div", "ar-mechanic");
    mechanic.append(
      el("span", "ar-mechanic__label", "Bu evrenin mekaniği"),
      el("strong", "ar-mechanic__name", meta.mechanic.name),
      el("p", "ar-mechanic__text", meta.mechanic.text),
    );
    const note = el(
      "p",
      "ar-menu__note",
      handlers.demo
        ? "Mobil demo: sade grafik ve kısa bir bölüm. Evrenin tamamı bilgisayarda açılır."
        : "Başlayınca fare kilitlenir · ESC ile menü · Şarkılar YouTube üzerinden çalar.",
    );
    body.replaceChildren(description, mechanic, controlsGrid(), startButton(), note);
  };

  const renderPause = () => {
    kicker.textContent = "Duraklatıldı";
    const actions = el("div", "ar-menu__actions");
    actions.append(
      startButton(),
      button("ar-btn", "Ayarlar", renderSettings),
      button("ar-btn", "Kontroller", () => {
        body.replaceChildren(controlsGrid(), button("ar-btn", "‹ Geri", renderPause));
      }),
      button("ar-btn ar-btn--ghost", "Evreni sıfırla", renderReset),
    );
    body.replaceChildren(
      el("p", "ar-menu__status", handlers.status()),
      actions,
      el("p", "ar-menu__note", `AudioRoom v${__APP_VERSION__}`),
    );
  };

  // Sayfa içi onay: tarayıcının confirm() penceresi uygulama içi tarayıcılarda engellenebiliyor.
  const renderReset = () => {
    kicker.textContent = "Evreni sıfırla";
    const confirm = button("ar-btn ar-btn--danger", "Evet, her şeyi sıfırla", () => handlers.onReset());
    confirm.dataset.reset = "";
    body.replaceChildren(
      el("p", "ar-menu__desc", "Dinlediğin plaklar, final ve bulduğun gizli keşifler silinir; evren ilk hâline döner."),
      confirm,
      button("ar-btn", "‹ Vazgeç", renderPause),
    );
    confirm.focus();
  };

  const renderSettings = () => {
    kicker.textContent = "Ayarlar";
    const form = el("div", "ar-settings");
    if (!handlers.demo) {
      const quality = el("div", "ar-settings__row");
      quality.appendChild(el("span", "ar-settings__label", "Grafik kalitesi"));
      const segment = el("div", "ar-segment");
      const options: Array<[Settings["quality"], string]> = [
        ["auto", "Otomatik"],
        ["low", "Düşük"],
        ["medium", "Orta"],
        ["high", "Yüksek"],
      ];
      for (const [value, label] of options) {
        const option = button("ar-segment__option", label, () => {
          settings.quality = value;
          handlers.onSettings(settings);
          renderSettings();
        });
        option.setAttribute("aria-pressed", String(settings.quality === value));
        segment.appendChild(option);
      }
      quality.appendChild(segment);
      form.appendChild(quality);
    }
    for (const slider of SLIDERS) {
      const row = el("label", "ar-settings__row");
      const value = el("span", "ar-settings__value", slider.format(settings[slider.key]));
      const input = el("input", "ar-range");
      input.type = "range";
      input.min = String(slider.min);
      input.max = String(slider.max);
      input.step = String(slider.step);
      input.value = String(settings[slider.key]);
      input.addEventListener("input", () => {
        settings[slider.key] = Number(input.value);
        value.textContent = slider.format(settings[slider.key]);
        handlers.onSettings(settings);
      });
      row.append(el("span", "ar-settings__label", slider.label), input, value);
      form.appendChild(row);
    }
    for (const [key, label] of [
      ["clips", "Şarkı klipleri (kapalıyken evren kapaktaki hâlinde kalır)"],
      ["cinema", "Şarkı başlayınca klibi sinema kamerasıyla izle"],
      ["thirdPerson", "Üçüncü kişi görünüm: karakterin görünür (T)"],
      ["headBob", "Yürürken kamera salınımı"],
      ["invertY", "Dikey bakışı ters çevir"],
    ] as const) {
      const row = el("label", "ar-settings__row ar-settings__row--toggle");
      const input = el("input", "ar-toggle");
      input.type = "checkbox";
      input.checked = settings[key];
      input.addEventListener("change", () => {
        settings[key] = input.checked;
        handlers.onSettings(settings);
      });
      row.append(el("span", "ar-settings__label", label), input);
      form.appendChild(row);
    }
    // Ayarları sıfırla: bütün ayarlar varsayılana döner, hemen uygulanır (evren ilerlemesine dokunmaz).
    const reset = button("ar-btn ar-btn--ghost", "Ayarları sıfırla", () => {
      const fresh = defaultSettings();
      if (handlers.demo) fresh.quality = settings.quality;
      Object.assign(settings, fresh);
      handlers.onSettings(settings);
      renderSettings();
    });
    reset.dataset.resetSettings = "";
    body.replaceChildren(form, reset, button("ar-btn", "‹ Geri", renderPause));
  };

  const setOpen = (next: boolean) => {
    open = next;
    root.classList.toggle("is-open", next);
    document.body.classList.toggle("ar-menu-open", next);
  };

  renderIntro();
  setOpen(true);

  const onKey = (event: KeyboardEvent) => {
    if (open && startEnabled && event.code === "Enter") handlers.onStart();
  };
  window.addEventListener("keydown", onKey);

  return {
    showIntro() {
      renderIntro();
      setOpen(true);
    },
    showPause() {
      startLabel = "Devam et";
      renderPause();
      setOpen(true);
    },
    hide() {
      setOpen(false);
    },
    get open() {
      return open;
    },
    setStartEnabled(enabled, label) {
      startEnabled = enabled;
      if (label) startLabel = label;
      card.querySelectorAll<HTMLButtonElement>("[data-start]").forEach((cta) => {
        cta.disabled = !enabled;
        cta.textContent = startLabel;
      });
    },
    dispose() {
      window.removeEventListener("keydown", onKey);
      root.remove();
    },
  };
}
