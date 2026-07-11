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
      kicker: "Henry the Lee · Kuantum Dolanıklık",
      title: "Kuantum Dolanıklık Deneyimi",
      description:
        "Boşlukta süzülen plağın izini sürün; G ile konumu, H ile hızını ölçün ve Heisenberg sınırı içinde gramofona yerleştirin.",
      desktopShortcuts: [
        { key: "WASD", label: "Yürü" },
        { key: "Shift", label: "Koş" },
        { key: "Boşluk", label: "Zıpla" },
        { key: "Fare", label: "Bak" },
        { key: "E / Q", label: "Al · bırak" },
        { key: "G / H", label: "Konum · hız ölç" },
      ],
      desktopNotes: [
        "Bu evren ince ölçüm ve yerleştirme akışını klavye ve mouse ile daha doğru çalıştırır.",
      ],
      pauseDescription:
        "Albüm panelini, haritayı ve ölçüm katmanlarını açıp kapatarak devam edebilirsiniz.",
    }),
  );
}
