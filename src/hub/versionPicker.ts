import { isPhone } from "../../engine/core/device";
import { setAccentVars } from "../../engine/core/color";
import { button, el } from "../../engine/ui/dom";
import type { HubAlbum } from "./albums";
import { COPY } from "./copy";
import { enterWorld } from "./portal";
import { accessOf, lastVersion, rememberVersion, versionsOf } from "./versions";

/**
 * "Evrene gir" seçicisi: albümün bütün sürümleri önizlemeleriyle yan yana durur;
 * oyuncu istediği sürümle girer. Esc, dışarı tıklama ya da × ile kapanır.
 */
export function openVersionPicker(album: HubAlbum, cover: () => HTMLImageElement | null): void {
  const versions = versionsOf(album.id);
  const last = lastVersion(album.id);
  const opener = document.activeElement as HTMLElement | null;

  const layer = el("div", "hub-versions");
  setAccentVars(layer, "", album.accent, album.accentInk);
  const panel = el("section", "hub-versions__panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "hub-versions-title");
  const head = el("header", "hub-versions__head");
  const heading = el("div");
  const title = el("h2", "hub-versions__title", COPY.versionsTitle);
  title.id = "hub-versions-title";
  heading.append(el("p", "hub__kicker", `${album.artist} · ${album.album}`), title, el("p", "hub-versions__lead", COPY.versionsLead));
  const close = button("hub-versions__close", "×", () => dismiss());
  close.setAttribute("aria-label", COPY.versionsClose);
  head.append(heading, close);

  const list = el("div", "hub-versions__list");
  let firstAction: HTMLElement | null = null;
  // Bu cihazda açılabilen sürümler önce (telefonda Sürüm 1 en üstte; kilitliler altta kalır).
  const ordered = [...versions].sort((a, b) => Number(accessOf(a) === "none") - Number(accessOf(b) === "none"));
  for (const version of ordered) {
    const mode = accessOf(version);
    const card = el("article", `hub-version${version.number === versions[0].number ? " is-latest" : ""}`);
    // Önizleme: büyük kare + küçük kareler (tıklanınca büyür).
    const media = el("div", "hub-version__media");
    const main = el("img", "hub-version__preview");
    main.src = version.previews[0];
    main.alt = `${album.album} · Sürüm ${version.number} önizlemesi`;
    main.loading = "lazy";
    media.append(main);
    if (version.previews.length > 1) {
      const thumbs = el("div", "hub-version__thumbs");
      version.previews.forEach((src, i) => {
        const thumb = el("button", `hub-version__thumb${i === 0 ? " is-active" : ""}`);
        thumb.type = "button";
        thumb.setAttribute("aria-label", `Önizleme ${i + 1}`);
        const image = el("img");
        image.src = src;
        image.alt = "";
        image.loading = "lazy";
        thumb.append(image);
        thumb.addEventListener("click", () => {
          main.src = src;
          thumbs.querySelectorAll(".is-active").forEach((node) => node.classList.remove("is-active"));
          thumb.classList.add("is-active");
        });
        thumbs.append(thumb);
      });
      media.append(thumbs);
    }

    const body = el("div", "hub-version__body");
    const tagRow = el("p", "hub-version__tag");
    tagRow.append(el("strong", "", `Sürüm ${version.number}`), el("span", "", `${version.tag} · ${version.date}`));
    if (last === version.number) tagRow.append(el("span", "hub-version__last", COPY.versionsLast));
    const features = el("ul", "hub-version__features");
    version.features.forEach((line) => features.append(el("li", "", line)));
    body.append(tagRow, el("h3", "hub-version__name", version.title), el("p", "hub-version__summary", version.summary), features);

    if (mode === "none") {
      const blocked = el("button", "hub-btn", COPY.desktopOnly(isPhone()));
      blocked.disabled = true;
      body.append(blocked, el("p", "hub-version__note", COPY.versionsNone(isPhone())));
    } else {
      const enter = el("a", `hub-btn ${version.number === versions[0].number ? "hub-btn--primary" : ""}`, COPY.versionsEnter(version.number, mode === "demo"));
      enter.href = version.href;
      enter.addEventListener("click", (event) => {
        event.preventDefault();
        rememberVersion(album.id, version.number);
        dismiss(false);
        enterWorld(version.href, cover());
      });
      body.append(enter);
      if (mode === "demo") body.append(el("p", "hub-version__note", COPY.demoNote));
      firstAction ??= enter;
    }
    card.append(media, body);
    list.append(card);
  }
  panel.append(head, list);
  layer.append(panel);

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") dismiss();
    // Odak pencerenin içinde kalır.
    if (event.key === "Tab") {
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const lastItem = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        first.focus();
      }
    }
  };
  // Adres değişirse (geri tuşu, başka bir albüm sayfası) seçici yeni sayfanın üstünde açık kalmasın.
  const onNavigate = () => dismiss(false);
  function dismiss(restoreFocus = true) {
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("hashchange", onNavigate);
    window.removeEventListener("popstate", onNavigate);
    layer.classList.remove("is-open");
    document.body.classList.remove("hub-modal-open");
    window.setTimeout(() => layer.remove(), 200);
    if (restoreFocus) opener?.focus();
  }
  layer.addEventListener("click", (event) => {
    if (event.target === layer) dismiss();
  });
  document.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", onNavigate);
  window.addEventListener("popstate", onNavigate);
  document.body.append(layer);
  document.body.classList.add("hub-modal-open");
  requestAnimationFrame(() => {
    layer.classList.add("is-open");
    (firstAction ?? close).focus({ preventScroll: true });
  });
}
