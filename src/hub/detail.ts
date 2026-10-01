import { setAccentVars } from "../../engine/core/color";
import { loadProgress } from "../../engine/core/storage";
import { button, el } from "../../engine/ui/dom";
import { actionButtons, badges } from "./home";
import { playableHere, readProgress, resetProgress, type HubAlbum } from "./albums";
import { COPY } from "./copy";
import { isPhone } from "../../engine/core/device";
import { reachableHere } from "./versions";
import { siteFooter } from "./pages";

const youtube = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
const RESET_FLAG = "audioroom.hub.reset";

function externalLink(className: string, label: string, href: string): HTMLAnchorElement {
  const link = el("a", className, label);
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

/** Albüm sayfası: evren bilgisi, albüm künyesi ve YouTube'a bağlı parça listesi. */
export function renderDetail(root: HTMLElement, album: HubAlbum, onChange: () => void): () => void {
  const page = el("main", "album");
  setAccentVars(page, "", album.accent, album.accentInk);
  const backdrop = el("div", "hub__backdrop");
  backdrop.style.backgroundImage = `url("${album.cover}")`;

  const back = el("a", "album__back", COPY.back);
  back.href = "#/";

  const cover = el("img", "album__cover");
  cover.src = album.cover;
  cover.alt = `${album.artist} — ${album.album} kapağı`;
  const figure = el("figure", "album__figure");
  figure.append(cover);

  const title = el("h1", "album__title", album.album);
  title.style.fontFamily = album.displayFont;
  title.tabIndex = -1;
  const actions = el("div", "hub__actions");
  actions.append(...actionButtons(album, () => cover));
  if (album.listenUrl) actions.append(externalLink("hub-btn", COPY.listen, album.listenUrl));
  if (album.artistUrl) actions.append(externalLink("hub-btn hub-btn--ghost", COPY.artist, album.artistUrl));

  const mode = playableHere(album);
  const note =
    mode === "desktop-only"
      ? reachableHere(album.id)
        ? COPY.oldVersionHere(isPhone())
        : COPY.desktopOnlyNote(isPhone())
      : mode === "demo"
        ? COPY.demoNote
        : mode === "soon"
          ? COPY.soonNote
          : "";
  const intro = el("div", "album__intro");
  intro.append(el("p", "hub__kicker", `${album.artist} · ${album.year} · ${COPY.releaseType[album.releaseType]}`), title, badges(album));
  if (album.pitch) intro.append(el("p", "album__pitch", album.pitch));
  intro.append(actions);
  if (note) intro.append(el("p", "album__note", note));
  const progress = readProgress(album);
  const found = new Set(loadProgress(mode === "demo" ? `${album.id}-demo` : album.id).found);
  const secretIds = new Set(progress?.secrets ?? []);
  // Sıfırlama sayfanın içinde onaylanır (uygulama içi tarayıcılar window.confirm'i engelleyebilir).
  const status = el("p", "album__status");
  status.setAttribute("role", "status");
  if (found.size || secretIds.size || progress?.completed) {
    const reset = el("div", "album__reset-row");
    const ask = button("album__reset", COPY.resetProgress, () => {
      const confirm = el("div", "album__confirm");
      const yes = button("hub-btn hub-btn--danger", COPY.resetYes, () => {
        resetProgress(album);
        try {
          sessionStorage.setItem(RESET_FLAG, album.id);
        } catch {
          // Bildirim gösterilemese de sıfırlama yapıldı.
        }
        onChange();
      });
      const no = button("hub-btn hub-btn--ghost", COPY.resetNo, () => {
        reset.replaceChildren(ask);
        ask.focus();
      });
      confirm.append(el("p", "", COPY.resetConfirm), yes, no);
      reset.replaceChildren(confirm);
      no.focus();
    });
    reset.append(ask);
    intro.append(reset);
  }
  try {
    if (sessionStorage.getItem(RESET_FLAG) === album.id) {
      sessionStorage.removeItem(RESET_FLAG);
      status.textContent = COPY.resetDone;
    }
  } catch {
    // Depolama kapalı: bildirim yok.
  }
  intro.append(status);

  const hero = el("section", "album__hero");
  hero.append(figure, intro);

  const panels = el("section", "album__panels");
  if (album.world) {
    const world = el("article", "album__panel album__panel--world");
    const mechanic = el("div", "album__mechanic");
    mechanic.append(el("span", "", COPY.mechanicLabel), el("strong", "", album.world.mechanic.name), el("p", "", album.world.mechanic.text));
    const list = el("ul", "album__highlights");
    album.world.highlights.forEach((line) => list.append(el("li", "", line)));
    world.append(el("h2", "", COPY.worldTitle(album.world.name)), mechanic, list, el("p", "album__meta", album.world.duration));
    panels.append(world);
  }

  const about = el("article", "album__panel");
  const facts = el("dl", "album__facts");
  for (const [label, value] of album.facts) facts.append(el("dt", "", label), el("dd", "", value));
  about.append(el("h2", "", COPY.albumTitle), el("p", "", album.summary), facts);
  panels.append(about);

  const tracks = el("article", "album__panel album__panel--tracks");
  const list = el("ol", "album__tracks");
  for (const track of album.tracks) {
    const item = el("li", track.id && found.has(track.id) ? "is-found" : "");
    const text = el("span", "album__track");
    text.append(el("b", "", String(track.order).padStart(2, "0")), el("span", "", track.title));
    if (track.credit) text.append(el("em", "", track.credit));
    item.append(text);
    if (track.id && found.has(track.id)) item.append(el("span", "album__found", `✓ ${COPY.listened}`));
    if (track.videoId) {
      const link = externalLink("album__yt", "YouTube ↗", youtube(track.videoId));
      link.setAttribute("aria-label", `${track.title} — YouTube'da aç`);
      item.append(link);
    }
    list.append(item);
  }
  tracks.append(el("h2", "", COPY.tracksTitle), list);
  // Gizli keşifler: bulunanların başlığı ve notu; bulunmayanlar yalnızca sayı olarak (sürprizi bozmadan).
  const secrets = album.secrets ?? [];
  if (secrets.length && progress) {
    const box = el("div", "album__secrets");
    box.append(el("h2", "", COPY.secretsTitle(secretIds.size, secrets.length)));
    const known = secrets.filter((secret) => secretIds.has(secret.id));
    if (known.length) {
      const items = el("ul", "album__secret-list");
      for (const secret of known) {
        const item = el("li");
        item.append(el("strong", "", secret.title), el("span", "", secret.text));
        items.append(item);
      }
      box.append(items, el("p", "album__meta", COPY.secretsLeft(secrets.length - known.length)));
    } else {
      box.append(el("p", "album__meta", COPY.secretsNone(secrets.length)));
    }
    tracks.append(box);
  }
  panels.append(tracks);

  page.append(backdrop, back, hero, panels, siteFooter());
  root.replaceChildren(page);
  window.scrollTo(0, 0);
  document.title = `${album.artist} — ${album.album} · AudioRoom`;
  // Sayfa değişimini ekran okuyuculara bildirmek için odak başlığa taşınır.
  title.focus({ preventScroll: true });
  return () => {
    document.title = "AudioRoom — Albüm Evrenleri";
  };
}
