import { trLibraryLocale } from "./locales/tr";
import type { LibraryLocaleBundle, SupportedLocale } from "./schema";

const LIBRARY_LOCALES: Record<SupportedLocale, LibraryLocaleBundle> = {
  tr: trLibraryLocale,
};

export const DEFAULT_LIBRARY_LOCALE: SupportedLocale = "tr";

export function getLibraryLocale(
  locale: SupportedLocale = DEFAULT_LIBRARY_LOCALE,
): LibraryLocaleBundle {
  return LIBRARY_LOCALES[locale];
}
