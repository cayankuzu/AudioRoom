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
      kicker: "Hayko Cepkin · Beni Büyüten Şarkılar Vol.1",
      title: "Beni Büyüten Şarkılar Deneyimi",
      description:
        "Kor halkasının içindeki biyolojik sahnede dolaşın, plakları toplayın ve gramofona takarak albümü parça parça açın.",
      desktopShortcuts: [
        { key: "WASD", label: "Yürü" },
        { key: "Shift", label: "Koş" },
        { key: "Boşluk", label: "Zıpla" },
        { key: "Fare", label: "Bak" },
        { key: "E / Q / R", label: "Al · bırak · oynat" },
        { key: "M / P / K", label: "Harita · panel · HUD" },
      ],
      desktopNotes: [
        "Bu sahnede rota, panel ve etkileşimler klavye ile mouse kullanıldığında tam doğrulukla çalışır.",
      ],
      pauseDescription:
        "Haritayı, kontrolleri ve albüm panelini açıp kapatarak devam edebilirsiniz.",
    }),
  );
}
