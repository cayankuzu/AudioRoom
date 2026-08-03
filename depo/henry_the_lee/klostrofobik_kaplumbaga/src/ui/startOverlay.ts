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
      kicker: "Henry the Lee · 2020",
      title: "Klostrofobik Kaplumbağa",
      description:
        "Tavşanı üç isabette yavaşlat, üç isabet daha vurarak durdur ve plağı kurtar. Plak alındıktan sonra tavşan gramofona koşar; onu koru veya geri al.",
      desktopShortcuts: [
        { key: "WASD", label: "Yürü" },
        { key: "Fare", label: "Bak ve nişan al" },
        { key: "Shift", label: "3 sn hızlı koş" },
        { key: "C / Ctrl", label: "Çömel" },
        { key: "Sol tık", label: "Havuç at" },
        { key: "Space", label: "Zıpla" },
        { key: "E / Q / R", label: "Al-tak / bırak / oynat" },
      ],
      touchShortcuts: [
        { key: "Oklar", label: "Yürü" },
        { key: "Sürükle", label: "Bak ve nişan al" },
        { key: "Havuç", label: "Ateş et" },
        { key: "Zıpla", label: "Yerden sıçra" },
        { key: "Etkileş", label: "Plağı al / tak" },
      ],
      desktopNotes: [
        "Altıncı isabette tavşan yalnızca 3 saniye durur; plağı veya çaldığı gramofonu bu aralıkta geri alın.",
        "Tavşan önce yalnız plağı taşır; plak kurtarıldıktan sonra gramofona yönelir ve oyuncudan daima uzaklaşır.",
      ],
      touchNotes: ["Nişangâhı tavşanın gövdesine getirip Havuç düğmesine dokunun."],
      pauseDescription: "Takip kaldığı yerden devam edecek.",
    }),
  );
}
