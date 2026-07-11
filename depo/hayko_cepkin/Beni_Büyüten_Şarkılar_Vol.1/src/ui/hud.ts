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
    { key: "Boşluk", label: "Zıpla" },
    { key: "Fare", label: "Bakış" },
  ],
  [
    { key: "E", label: "Plak al, gramofona tak veya gramofonu taşı", tone: "hint" },
    { key: "R", label: "Müziği başlat veya duraklat", tone: "hint" },
    { key: "Q", label: "Elindekini bırak", tone: "hint" },
  ],
  [
    { key: "M", label: "Harita", tone: "hint" },
    { key: "P", label: "Albüm paneli", tone: "hint" },
    { key: "K", label: "Kontroller", tone: "hint" },
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
