import { getLibraryLocale } from "../../i18n";

const libraryLocale = getLibraryLocale();

export function renderLibraryFooter(): string {
  const year = new Date().getFullYear();

  return `
    <footer class="library-footer">
      <span class="library-footer__copyright">${libraryLocale.ui.footerCopyright(year)}</span>
      <span class="library-footer__powered">${libraryLocale.ui.footerPoweredBy}</span>
    </footer>
  `;
}
