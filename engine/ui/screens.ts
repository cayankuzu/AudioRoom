import { assetUrl } from "../core/assets";
import { PHONE_WORLD } from "../core/device";
import type { Track, WorldMeta } from "../world";
import { button, el } from "./dom";

/** Telefonda masaüstü evrenine girilince gösterilen kapı. */
export function showDesktopGate(parent: HTMLElement, meta: WorldMeta, libraryHref: string): void {
  const root = el("main", "ar-gate");
  const card = el("section", "ar-gate__card");
  const home = el("a", "ar-btn ar-btn--primary", "AudioRoom'a dön");
  home.href = libraryHref;
  card.append(
    el("span", "ar-gate__kicker", "Masaüstü deneyimi"),
    el("h1", "ar-gate__title", meta.album),
    el("p", "ar-gate__text", `${meta.artist} evreni klavye ve fare için tasarlandı. Tam deneyim için bu sayfayı bir bilgisayarda aç.`),
    home,
  );
  root.appendChild(card);
  parent.appendChild(root);
}

/** Telefon kapısı: bu sürüm geniş ekran içindir; telefonda yalnızca Mükemmel Boşluk'un Sürüm 1'i açılır. */
export function showPhoneGate(parent: HTMLElement, meta: WorldMeta, libraryHref: string): void {
  const root = el("main", "ar-gate");
  const card = el("section", "ar-gate__card");
  const phoneWorld = el("a", "ar-btn ar-btn--primary", PHONE_WORLD.label);
  phoneWorld.href = assetUrl(PHONE_WORLD.href);
  const home = el("a", "ar-btn", "AudioRoom'a dön");
  home.href = libraryHref;
  const sameWorld = PHONE_WORLD.href.includes(meta.id.replace(/-/g, "_"));
  card.append(
    el("span", "ar-gate__kicker", "Geniş ekran deneyimi"),
    el("h1", "ar-gate__title", meta.album),
    el(
      "p",
      "ar-gate__text",
      sameWorld
        ? "Bu sürüm bilgisayar ve tablet için. Telefonda evrenin ilk sürümü (Sürüm 1) oynanır."
        : `${meta.artist} evreni bilgisayar ve tablet için. Telefonda yalnızca Mükemmel Boşluk'un ilk sürümü açılır.`,
    ),
    phoneWorld,
    home,
  );
  root.appendChild(card);
  parent.appendChild(root);
}

/** Tarayıcı grafik bağlamını kaybettiğinde ya da evren yüklenemediğinde. */
export function showFatal(parent: HTMLElement, title: string, text: string, libraryHref: string): void {
  const root = el("div", "ar-fatal");
  const card = el("section", "ar-gate__card");
  const home = el("a", "ar-btn", "Kütüphaneye dön");
  home.href = libraryHref;
  card.append(
    el("h1", "ar-gate__title", title),
    el("p", "ar-gate__text", text),
    button("ar-btn ar-btn--primary", "Sayfayı yenile", () => window.location.reload()),
    home,
  );
  root.appendChild(card);
  parent.appendChild(root);
}

/** Tüm plaklar dinlendiğinde: jenerik + künye. */
export function showFinale(
  parent: HTMLElement,
  meta: WorldMeta,
  tracks: readonly Track[],
  options: { demo: boolean; libraryHref: string; onStay: () => void },
): void {
  const root = el("div", "ar-finale");
  const card = el("section", "ar-finale__card");
  const list = el("ol", "ar-finale__tracks");
  tracks
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((track) => {
      const item = el("li");
      item.append(el("span", "", track.title));
      if (track.credit) item.append(el("em", "", track.credit));
      list.appendChild(item);
    });
  const credits = el("div", "ar-finale__credits");
  meta.credits.forEach((line) => credits.appendChild(el("p", "", line)));
  const home = el("a", "ar-btn", "Kütüphaneye dön");
  home.href = options.libraryHref;
  const stay = button("ar-btn ar-btn--primary", "Evrende kal", () => {
    root.remove();
    options.onStay();
  });
  card.append(
    el("span", "ar-finale__kicker", options.demo ? "Demo tamamlandı" : "Albüm tamamlandı"),
    el("h1", "ar-finale__title", meta.album),
    el("p", "ar-finale__artist", meta.artist),
    options.demo
      ? el("p", "ar-finale__note", "Evrenin tamamı ve tüm şarkılar bilgisayarda seni bekliyor.")
      : list,
    credits,
  );
  const actions = el("div", "ar-finale__actions");
  actions.append(stay, home);
  card.appendChild(actions);
  root.appendChild(card);
  parent.appendChild(root);
  window.setTimeout(() => stay.focus(), 50);
}
