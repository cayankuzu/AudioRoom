import {
  createMobileControls as createSharedMobileControls,
  type MobileControls,
} from "../../../../shared/ui/mobileControls";
import type { InputHandle } from "../systems/inputSystem";

export interface MobileControlsOptions {
  container: HTMLElement;
  onToggleFlashlight: () => void;
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
        glyph: "^",
        label: "Zipla",
        ariaLabel: "Zipla",
      },
      {
        slot: "top-middle",
        keyCode: "KeyE",
        glyph: "E",
        label: "Al",
        ariaLabel: "Al veya kullan",
        tone: "primary",
      },
      {
        slot: "top-right",
        keyCode: "KeyR",
        glyph: "R",
        label: "Play",
        ariaLabel: "Cal veya durdur",
        tone: "secondary",
      },
      {
        slot: "bottom-left",
        keyCode: "ShiftLeft",
        glyph: "S",
        label: "Kos",
        ariaLabel: "Kos",
      },
      {
        slot: "bottom-middle",
        keyCode: "KeyQ",
        glyph: "Q",
        label: "Birak",
        ariaLabel: "Birak",
      },
    ],
    tools: [
      {
        id: "back",
        icon: "back",
        ariaLabel: "Kutuphaneye don",
        onPress: options.onGoBack,
      },
      {
        id: "eye",
        icon: "eye",
        ariaLabel: "Arayuzu gizle veya goster",
        special: "eye",
      },
      {
        id: "flashlight",
        icon: "flashlight",
        ariaLabel: "Fener",
        onPress: options.onToggleFlashlight,
      },
      { id: "map", icon: "map", ariaLabel: "Harita", onPress: options.onToggleMap },
      {
        id: "panel",
        icon: "panel",
        ariaLabel: "Album paneli",
        onPress: options.onTogglePanel,
      },
      {
        id: "fullscreen",
        icon: "fullscreen",
        ariaLabel: "Tam ekran",
        onPress: options.onToggleFullscreen,
        special: "fullscreen",
      },
      {
        id: "pause",
        icon: "pause",
        ariaLabel: "Duraklat",
        onPress: options.onPause,
      },
    ],
    lookSkipSelectors: [
      ".bright-panel",
      ".experience-back-nav",
      ".pc-hint-banner",
      ".capture-panel",
    ],
  });
}
