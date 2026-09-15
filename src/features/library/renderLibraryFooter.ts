import { getLibraryLocale } from "../../i18n";

const libraryLocale = getLibraryLocale();
const HUB_VERSION = "v2.5.3";

export function renderLibraryFooter(): string {
  const year = new Date().getFullYear();

  return `
    <footer class="library-footer" aria-hidden="true">
      <span class="library-footer__copyright">${libraryLocale.ui.footerCopyright(year)}</span>
      <span class="library-footer__sep library-footer__sep--powered" aria-hidden="true">·</span>
      <span class="library-footer__powered">${libraryLocale.ui.footerPoweredBy}</span>
      <span class="library-footer__sep" aria-hidden="true">·</span>
      <span class="library-footer__version">${HUB_VERSION}</span>
    </footer>
  `;
}
