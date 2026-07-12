import {
  createMobileControls as createSharedMobileControls,
  type MobileControls,
} from "../../../../shared/ui/mobileControls";
import type { InputHandle } from "../systems/inputSystem";

export interface MobileControlsOptions {
  onToggleMap: () => void;
  onPause: () => void;
  onToggleFullscreen: () => void;
  onGoBack: () => void;
  onTogglePanel?: () => void;
  onInteract?: () => void;
  onDrop?: () => void;
  onPlayPause?: () => void;
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
        ariaLabel: "Al veya tak",
        tone: "primary",
      },
      {
        slot: "top-right",
        keyCode: "KeyR",
        glyph: "R",
        label: "Play",
        ariaLabel: "Oynat veya duraklat",
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
      { id: "map", icon: "map", ariaLabel: "Harita", onPress: options.onToggleMap },
      {
        id: "panel",
        icon: "panel",
        ariaLabel: "Album paneli",
        onPress: options.onTogglePanel ?? (() => {}),
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
    lookSkipSelectors: [".bbs-crosshair"],
  });
}
