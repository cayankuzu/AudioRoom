import { el } from "../../engine/ui/dom";
import { COPY } from "./copy";

/** Tüm hub sayfalarının altbilgisi: sürüm + gizlilik bağlantısı. */
export function siteFooter(): HTMLElement {
  const footer = el("footer", "hub__footer");
  const link = el("a", "hub__footer-link", COPY.privacyLink);
  link.href = "#/gizlilik";
  footer.append(el("span", "", COPY.footer(new Date().getFullYear())), link);
  return footer;
}

/** Başlık + içerikten oluşan sade metin sayfası (gizlilik, bulunamadı). */
function textPage(root: HTMLElement, titleText: string, children: HTMLElement[]): () => void {
  const page = el("main", "album text-page");
  const back = el("a", "album__back", COPY.back);
  back.href = "#/";
  const title = el("h1", "album__title", titleText);
  title.tabIndex = -1;
  const body = el("div", "text-page__body");
  body.append(...children);
  page.append(back, title, body, siteFooter());
  root.replaceChildren(page);
  window.scrollTo(0, 0);
  document.title = `${titleText} · AudioRoom`;
  // Sayfa değişimini ekran okuyuculara bildirmek için odak başlığa taşınır.
  title.focus({ preventScroll: true });
  return () => {
    document.title = "AudioRoom — Albüm Evrenleri";
  };
}

/** Gizlilik: sitenin gerçekte ne sakladığını ve kime neyin gittiğini düz dille anlatır. */
export function renderPrivacy(root: HTMLElement): () => void {
  const policy = el("a", "", COPY.privacyYoutube);
  policy.href = "https://policies.google.com/privacy";
  policy.target = "_blank";
  policy.rel = "noopener noreferrer";
  const sections = COPY.privacy.flatMap(([heading, text]) => [el("h2", "", heading), el("p", "", text)]);
  return textPage(root, COPY.privacyTitle, [...sections, policy]);
}

/** Bilinmeyen albüm ya da adres: sessizce ana sayfaya düşmek yerine açıkça söyler. */
export function renderNotFound(root: HTMLElement): () => void {
  const home = el("a", "hub-btn hub-btn--primary", COPY.notFoundAction);
  home.href = "#/";
  return textPage(root, COPY.notFoundTitle, [el("p", "", COPY.notFoundText), home]);
}
