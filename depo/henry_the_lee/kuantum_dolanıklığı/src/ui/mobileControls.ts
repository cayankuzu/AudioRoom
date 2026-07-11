import {
  createMobileControls as createSharedMobileControls,
  type MobileControls,
} from "../../../../shared/ui/mobileControls";
import type { InputHandle } from "../systems/inputSystem";

export interface MobileControlsOptions {
  onToggleMap: () => void;
  onTogglePanel: () => void;
  onPause: () => void;
  onToggleFullscreen: () => void;
  onGoBack: () => void;
}

export function createMobileControls(
  parent: HTMLElement,
  input: InputHandle,
  options: MobileControlsOptions,
): MobileControls {
  return createSharedMobileControls(parent, input, {
    actions: [
      {
        slot: "top-left",
        keyCode: "Space",
        glyph: "⤒",
        label: "Zıpla",
        ariaLabel: "Zıpla",
      },
      {
        slot: "top-middle",
        keyCode: "KeyG",
        glyph: "G",
        label: "Konum",
        ariaLabel: "Konum ölç",
        tone: "secondary",
      },
      {
        slot: "top-right",
        keyCode: "KeyH",
        glyph: "H",
        label: "Hız",
        ariaLabel: "Hız ölç",
        tone: "secondary",
      },
      {
        slot: "bottom-left",
        keyCode: "ShiftLeft",
        glyph: "⇧",
        label: "Koş",
        ariaLabel: "Koş",
      },
      {
        slot: "bottom-middle",
        keyCode: "KeyQ",
        glyph: "Q",
        label: "Bırak",
        ariaLabel: "Bırak",
      },
      {
        slot: "bottom-right",
        keyCode: "KeyE",
        glyph: "E",
        label: "Al",
        ariaLabel: "Al veya yerleştir",
        tone: "primary",
      },
    ],
    tools: [
      { id: "back", icon: "back", ariaLabel: "Kütüphaneye dön", onPress: options.onGoBack },
      { id: "eye", icon: "eye", ariaLabel: "Arayüzü gizle veya göster", special: "eye" },
      { id: "map", icon: "map", ariaLabel: "Harita", onPress: options.onToggleMap },
      { id: "panel", icon: "panel", ariaLabel: "Albüm paneli", onPress: options.onTogglePanel },
      {
        id: "fullscreen",
        icon: "fullscreen",
        ariaLabel: "Tam ekran",
        onPress: options.onToggleFullscreen,
        special: "fullscreen",
      },
      { id: "pause", icon: "pause", ariaLabel: "Duraklat", onPress: options.onPause },
    ],
    lookSkipSelectors: [".measurement-pill", ".kd-crosshair"],
  });
}
