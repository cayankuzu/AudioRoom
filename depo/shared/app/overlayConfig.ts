import { type OverlayConfig, type OverlayShortcut } from "../ui/startOverlay";

export interface WorldOverlayOptions {
  kicker: string;
  title: string;
  description: string;
  desktopShortcuts: readonly OverlayShortcut[];
  touchShortcuts?: readonly OverlayShortcut[];
  desktopNotes?: readonly string[];
  touchNotes?: readonly string[];
  pauseDescription?: string;
}

const SHARED_TOUCH_NOTES = [
  "Daha iyi deneyim için mümkünse bilgisayardan girin.",
  "Telefonu dikey tuttuğunuzda deneyim kilitlenir; oynatmak için yatay moda geçin.",
  "Başlangıçta tarayıcı tam ekran isteyecektir.",
];

export function createWorldOverlayConfig(
  options: WorldOverlayOptions,
): OverlayConfig {
  const hasTouchVariant =
    (options.touchShortcuts?.length ?? 0) > 0 ||
    (options.touchNotes?.length ?? 0) > 0;

  return {
    intro: {
      kicker: options.kicker,
      title: options.title,
      description: options.description,
      desktopShortcuts: options.desktopShortcuts,
      touchShortcuts: hasTouchVariant ? options.touchShortcuts : undefined,
      desktopNotes: options.desktopNotes,
      touchNotes: hasTouchVariant
        ? [...(options.touchNotes ?? []), ...SHARED_TOUCH_NOTES]
        : undefined,
      ctaLabel: "Evrene gir",
      touchCtaLabel: hasTouchVariant ? "Tam ekrana geç ve başla" : undefined,
    },
    pause: {
      description:
        options.pauseDescription ??
        "Deneyime kaldığınız yerden geri dönebilirsiniz.",
      ctaLabel: "Devam et",
    },
  };
}
