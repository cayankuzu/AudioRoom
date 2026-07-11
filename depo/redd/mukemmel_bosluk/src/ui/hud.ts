import {
  createHud as createSharedHud,
  type Hud,
} from "../../../../shared/ui/hud";

export interface HudOptions {
  showLibraryBack?: boolean;
  libraryHref?: string;
}

const HUD_SECTIONS = [
  [
    { key: "WASD / Oklar", label: "Yürü" },
    { key: "Shift", label: "Koş" },
    { key: "C / Ctrl", label: "Çömel" },
    { key: "Boşluk", label: "Zıpla" },
    { key: "Fare", label: "Bakış" },
    { key: "F", label: "Fener" },
  ],
  [
    { key: "E", label: "Plak veya gramofonu al, plağı tak" },
    { key: "R", label: "Gramofonu başlat veya duraklat" },
    { key: "Q", label: "Elindekini bırak" },
  ],
  [
    { key: "P", label: "Albüm paneli" },
    { key: "M", label: "Harita" },
    { key: "K", label: "Kontroller" },
    { key: "L", label: "Parlaklık ve kontrast" },
    { key: "T", label: "Ekran görüntüsü" },
  ],
  [{ key: "Esc", label: "İmleci serbest bırak", tone: "hint" }],
] as const;

export function createHud(parent: HTMLElement, options: HudOptions = {}): Hud {
  return createSharedHud(parent, {
    title: "Kontroller",
    showLibraryBack: options.showLibraryBack,
    libraryHref: options.libraryHref,
    sections: HUD_SECTIONS,
  });
}
