import {
  createStartOverlay as createSharedStartOverlay,
  type StartOverlay,
} from "../../../../shared/ui/startOverlay";
import { createWorldOverlayConfig } from "../../../../shared/app/overlayConfig";

export type { StartOverlay };

export function createStartOverlay(parent: HTMLElement): StartOverlay {
  return createSharedStartOverlay(
    parent,
    createWorldOverlayConfig({
      kicker: "Redd · Mükemmel Boşluk",
      title: "Mükemmel Boşluk Deneyimi",
      description:
        "Sessiz kraterde dağılmış plakları bulun, gramofona takın ve albümü parça parça gece yürüyüşünün içine açın.",
      desktopShortcuts: [
        { key: "WASD", label: "Yürü" },
        { key: "Fare", label: "Bak" },
        { key: "Shift", label: "Koş" },
        { key: "Boşluk", label: "Zıpla" },
        { key: "E / Q / R", label: "Al · bırak · oynat" },
        { key: "F", label: "Fener" },
      ],
      touchShortcuts: [
        { key: "Oklar", label: "Yürü" },
        { key: "Sürükle", label: "Bak" },
        { key: "Koş", label: "Hızlı ilerle" },
        { key: "Zıpla", label: "Dikey hareket" },
        { key: "Al / Bırak", label: "Plak ve gramofon" },
        { key: "Play", label: "Gramofon" },
      ],
      desktopNotes: ["Gramofona plak takılmadan müzik başlamaz."],
      touchNotes: ["Krater ve gramofon aksı yatay modda daha temiz okunur."],
      pauseDescription: "Kraterde kaldığınız yerden devam edebilirsiniz.",
    }),
  );
}
