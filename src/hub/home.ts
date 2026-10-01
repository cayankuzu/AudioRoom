import { setAccentVars } from "../../engine/core/color";
import { button, el } from "../../engine/ui/dom";
import { ALBUMS, normalize, playableHere, readProgress, rememberActive, searchText, type HubAlbum } from "./albums";
import { COPY } from "./copy";
import { enterWorld } from "./portal";
import { openVersionPicker } from "./versionPicker";
import { isPhone } from "../../engine/core/device";
import { reachableHere, versionsOf } from "./versions";
import { siteFooter } from "./pages";

export interface HomeState {
  active: string;
  query: string;
  status: "all" | "available" | "soon";
  artist: string | null;
}

const ARTISTS = [...new Set(ALBUMS.map((album) => album.artist))];

export function matches(album: HubAlbum, state: HomeState): boolean {
  if (state.status === "available" && !album.available) return false;
  if (state.status === "soon" && album.available) return false;
  if (state.artist && album.artist !== state.artist) return false;
  const tokens = normalize(state.query).split(" ").filter(Boolean);
  const text = searchText(album);
  // Türkçe ek değişimlerine tolerans: "dolanıklığı" → "dolanıkl…" kökü yeterli.
  return tokens.every((token) => text.includes(token) || (token.length >= 6 && text.includes(token.slice(0, token.length - 3))));
}

export function actionButtons(album: HubAlbum, cover: () => HTMLImageElement | null): HTMLElement[] {
  const mode = playableHere(album);
  if (mode === "soon") {
    const soon = el("button", "hub-btn", COPY.soon);
    soon.disabled = true;
    return [soon];
  }
  const versions = versionsOf(album.id);
  // Telefonda ve tablette Sürüm 2 açılmasa da eski bir sürüm oynanabiliyorsa seçici açılır.
  if (mode === "desktop-only" && !reachableHere(album.id)) {
    const note = el("button", "hub-btn", COPY.desktopOnly(isPhone()));
    note.disabled = true;
    note.title = COPY.desktopOnlyNote(isPhone());
    return [note];
  }
  const enter = el("a", "hub-btn hub-btn--primary", versions.length > 1 || mode !== "demo" ? COPY.enter : COPY.enterDemo);
  enter.href = album.path!;
  enter.setAttribute("aria-haspopup", versions.length > 1 ? "dialog" : "false");
  enter.addEventListener("click", (event) => {
    event.preventDefault();
    if (versions.length > 1) openVersionPicker(album, cover);
    else enterWorld(album.path!, cover());
  });
  return [enter];
}

export function badges(album: HubAlbum): HTMLElement {
  const row = el("div", "hub-badges");
  row.append(
    el("span", `hub-badge ${album.available ? "hub-badge--live" : "hub-badge--soon"}`, album.available ? COPY.status.available : COPY.status.soon),
    el("span", "hub-badge", COPY.releaseType[album.releaseType]),
  );
  if (album.device) row.append(el("span", "hub-badge", COPY.device[album.device]));
  const versionCount = versionsOf(album.id).length;
  if (versionCount > 1) row.append(el("span", "hub-badge", COPY.versionsBadge(versionCount)));
  const progress = readProgress(album);
  if (progress?.completed) row.append(el("span", "hub-badge hub-badge--done", `✓ ${COPY.completed}`));
  else if (progress && progress.found > 0) row.append(el("span", "hub-badge hub-badge--progress", COPY.progress(progress.found, progress.total)));
  if (progress && progress.secrets.length > 0) row.append(el("span", "hub-badge hub-badge--progress", COPY.secretsBadge(progress.secrets.length, progress.secretTotal)));
  return row;
}

export function renderHome(root: HTMLElement, state: HomeState, onChange: () => void): () => void {
  const list = ALBUMS.filter((album) => matches(album, state));
  let index = Math.max(0, list.findIndex((album) => album.id === state.active));

  const page = el("main", "hub");
  const backdrop = el("div", "hub__backdrop");
  const top = el("header", "hub__top");
  const brand = el("a", "hub__brand");
  brand.href = "#/";
  const logo = el("img");
  logo.src = "./favicon.svg";
  logo.alt = "";
  const brandText = el("span");
  brandText.append(el("strong", "", COPY.brand), el("small", "", COPY.tagline));
  brand.append(logo, brandText);
  const search = el("label", "hub__search");
  const input = el("input");
  input.type = "search";
  input.placeholder = COPY.searchPlaceholder;
  input.setAttribute("aria-label", COPY.searchLabel);
  input.value = state.query;
  search.append(el("span", "hub__search-icon", "⌕"), input);
  top.append(brand, search);

  const chips = el("nav", "hub__chips");
  chips.setAttribute("aria-label", "Filtreler");
  const chip = (label: string, active: boolean, onClick: () => void) => {
    const node = button(`hub-chip${active ? " is-active" : ""}`, label, onClick);
    node.setAttribute("aria-pressed", String(active));
    return node;
  };
  const setFilter = (patch: Partial<HomeState>) => {
    Object.assign(state, patch);
    onChange();
  };
  chips.append(
    chip(COPY.filterAll, state.status === "all" && !state.artist, () => setFilter({ status: "all", artist: null })),
    chip(COPY.filterAvailable, state.status === "available", () => setFilter({ status: "available" })),
    chip(COPY.filterSoon, state.status === "soon", () => setFilter({ status: "soon" })),
    el("span", "hub__chips-sep"),
    ...ARTISTS.map((artist) => chip(artist, state.artist === artist, () => setFilter({ artist: state.artist === artist ? null : artist }))),
  );

  const stage = el("section", "hub__stage");
  stage.setAttribute("aria-label", COPY.shelfLabel);
  stage.setAttribute("aria-roledescription", "carousel");
  const ring = el("div", "hub__ring");
  const covers = list.map((album, i) => {
    const item = button("hub__cover", "", () => (i === index ? (window.location.hash = `#/album/${album.id}`) : select(i)));
    item.setAttribute("aria-label", `${album.artist} — ${album.album}`);
    const image = el("img");
    image.src = album.cover;
    image.alt = "";
    image.decoding = "async";
    image.width = image.height = 600;
    // Açılışta öndeki kapak sayfanın en büyük görseli (LCP); diğerleri beklesin.
    image.fetchPriority = i === index ? "high" : "low";
    image.draggable = false;
    item.append(image);
    if (!album.available) item.append(el("span", "hub__cover-tag", COPY.soon));
    ring.append(item);
    return item;
  });
  const prev = button("hub__nav hub__nav--prev", "‹", () => select(index - 1));
  prev.setAttribute("aria-label", COPY.previous);
  const next = button("hub__nav hub__nav--next", "›", () => select(index + 1));
  next.setAttribute("aria-label", COPY.next);
  stage.append(prev, ring, next);

  const info = el("section", "hub__info");
  info.setAttribute("aria-live", "polite");

  if (list.length === 0) {
    const empty = el("div", "hub__empty");
    empty.append(
      el("strong", "", COPY.emptyTitle),
      el("p", "", COPY.emptyText),
      button("hub-btn", COPY.clearFilters, () => setFilter({ query: "", status: "all", artist: null })),
    );
    stage.replaceChildren(empty);
  }

  page.append(backdrop, top, chips, stage, info, siteFooter());
  root.replaceChildren(page);

  function renderInfo(album: HubAlbum) {
    setAccentVars(page, "", album.accent, album.accentInk);
    backdrop.style.backgroundImage = `url("${album.cover}")`;
    const title = el("h1", "hub__title", album.album);
    title.style.fontFamily = album.displayFont;
    const pageLink = el("a", "hub-btn", COPY.albumPage);
    pageLink.href = `#/album/${album.id}`;
    const actions = el("div", "hub__actions");
    actions.append(...actionButtons(album, () => covers[index]?.querySelector("img") ?? null), pageLink);
    const random = button("hub-btn hub-btn--ghost", `⤨ ${COPY.random}`, spin);
    random.disabled = spinning;
    actions.append(random);
    info.replaceChildren(
      el("p", "hub__kicker", `${album.artist} · ${album.year} · ${COPY.releaseType[album.releaseType]}`),
      title,
      badges(album),
      el("p", "hub__pitch", album.pitch ?? album.summary),
      actions,
    );
  }

  function layout() {
    covers.forEach((item, i) => {
      let offset = i - index;
      const half = list.length / 2;
      if (offset > half) offset -= list.length;
      if (offset < -half) offset += list.length;
      const distance = Math.abs(offset);
      item.style.setProperty("--offset", String(offset));
      item.style.setProperty("--distance", String(distance));
      item.classList.toggle("is-active", offset === 0);
      item.style.zIndex = String(100 - distance);
      item.tabIndex = offset === 0 ? 0 : -1;
      item.style.visibility = distance > 3 ? "hidden" : "visible";
    });
  }

  function select(next: number, quiet = false) {
    if (!list.length) return;
    index = (next + list.length) % list.length;
    state.active = list[index].id;
    rememberActive(state.active);
    layout();
    if (!quiet) renderInfo(list[index]);
  }

  // Rastgele: çark rastgele bir yöne hızla döner, yavaşlayarak bir kapakta durur.
  let spinning = false;
  let spinTimer = 0;
  function spin() {
    if (spinning || list.length < 2) return;
    spinning = true;
    const direction = Math.random() < 0.5 ? -1 : 1;
    const steps = list.length + 5 + Math.floor(Math.random() * list.length);
    ring.classList.add("is-spinning");
    renderInfo(list[index]);
    let done = 0;
    const step = () => {
      done += 1;
      const last = done >= steps;
      select(index + direction, !last);
      if (last) {
        spinning = false;
        ring.classList.remove("is-spinning");
        renderInfo(list[index]);
        return;
      }
      const remaining = steps - done;
      const delay = remaining > 6 ? 75 : 75 + (7 - remaining) * 70;
      spinTimer = window.setTimeout(step, delay);
    };
    step();
  }

  // Sürükleme / kaydırma / klavye.
  let dragX: number | null = null;
  const onPointerDown = (event: PointerEvent) => {
    dragX = event.clientX;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (dragX === null) return;
    const delta = event.clientX - dragX;
    dragX = null;
    if (Math.abs(delta) > 50) select(index + (delta < 0 ? 1 : -1));
  };
  let wheelLock = 0;
  const onWheel = (event: WheelEvent) => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 12 || performance.now() < wheelLock) return;
    event.preventDefault();
    wheelLock = performance.now() + 380;
    select(index + (delta > 0 ? 1 : -1));
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.target === input) return;
    if (event.key === "ArrowRight") select(index + 1);
    else if (event.key === "ArrowLeft") select(index - 1);
    else if (event.key === "Enter" && document.activeElement === document.body) window.location.hash = `#/album/${list[index].id}`;
  };
  let searchTimer = 0;
  input.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.query = input.value;
      onChange();
    }, 180);
  });
  ring.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);

  if (list.length) select(index);
  if (state.query) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  return () => {
    window.clearTimeout(searchTimer);
    window.clearTimeout(spinTimer);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("keydown", onKey);
  };
}
