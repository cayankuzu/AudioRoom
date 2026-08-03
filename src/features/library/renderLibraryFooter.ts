import { getLibraryLocale } from "../../i18n";

const libraryLocale = getLibraryLocale();
const HUB_VERSION = "v2.5.1";

export function renderLibraryFooter(): string {
  const year = new Date().getFullYear();

  return `
    <footer class="library-footer">
      <span class="library-footer__copyright">${libraryLocale.ui.footerCopyright(year)}</span>
      <span class="library-footer__powered">${libraryLocale.ui.footerPoweredBy}<strong>· ${HUB_VERSION}</strong></span>
    </footer>
  `;
}
