import type { ExperienceCatalogItem } from "../config/experienceCatalog";
import { fetchPlaylistThumbnailUrl } from "../lib/youtubePlaylistCover";

export interface EntryHub {
  element: HTMLElement;
  onLaunch(cb: (id: string) => void): void;
  dispose(): void;
}

/**
 * Kütüphane kartı `<div>` ile kurulur: `<button>` içinde `<div>` olması
 * geçersiz HTML'dir ve tarayıcı DOM'u bölerek "kapak içinde kapak" hatasına yol açar.
 */
export function createEntryHub(
  parent: HTMLElement,
  catalog: ExperienceCatalogItem[],
): EntryHub {
  const root = document.createElement("div");
  root.className = "entry-hub";
  root.setAttribute("role", "application");
  root.setAttribute("aria-label", "Kütüphane");

  const aura = document.createElement("div");
  aura.className = "entry-hub__aura";
  aura.setAttribute("aria-hidden", "true");

  const blobs = document.createElement("div");
  blobs.className = "entry-hub__blobs";
  blobs.setAttribute("aria-hidden", "true");
  blobs.innerHTML = "<span></span><span></span><span></span>";

  const main = document.createElement("div");
  main.className = "entry-hub__main";

  const library = document.createElement("section");
  library.className = "entry-hub__library";
  library.innerHTML = `
    <header class="entry-hub__header">
      <div class="entry-hub__logo-wrap">
        <span class="entry-hub__logo" aria-hidden="true"></span>
        <span class="entry-hub__logo-ring" aria-hidden="true"></span>
      </div>
      <div class="entry-hub__header-copy">
        <p class="entry-hub__eyebrow">AudioRoom</p>
        <h1 class="entry-hub__title">Bugün ne deneyimleyeceksin?</h1>
        <p class="entry-hub__subtitle">Kapaklara dokun — dünyanın içine gir.</p>
      </div>
    </header>
    <div class="entry-hub__shelf" data-shelf></div>
  `;

  const shelf = library.querySelector("[data-shelf]") as HTMLElement;

  for (const item of catalog) {
    const card = document.createElement("div");
    card.className = "entry-hub__card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.dataset.experienceId = item.id;
    const coverAlt = `${item.artist} — ${item.title} albüm kapağı`;
    card.setAttribute("aria-label", `${item.title} deneyimini aç`);
    card.innerHTML = `
      <div class="entry-hub__card-glow" aria-hidden="true"></div>
      <div class="entry-hub__cover-wrap">
        <img
          class="entry-hub__cover-img"
          src="${escapeAttr(item.coverImage)}"
          alt="${escapeAttr(coverAlt)}"
          width="800"
          height="800"
          loading="eager"
          decoding="async"
          fetchpriority="high"
        />
        <div class="entry-hub__cover-shine" aria-hidden="true"></div>
      </div>
      <div class="entry-hub__card-body">
        <p class="entry-hub__card-artist">${escapeHtml(item.artist)}</p>
        <h2 class="entry-hub__card-title">${escapeHtml(item.title)}</h2>
        <p class="entry-hub__card-tagline">${escapeHtml(item.tagline)}</p>
        <p class="entry-hub__card-desc">${escapeHtml(item.description)}</p>
        <span class="entry-hub__card-cta">
          <span class="entry-hub__card-cta-dot" aria-hidden="true"></span>
          Başlat
        </span>
      </div>
    `;
    const img = card.querySelector<HTMLImageElement>(".entry-hub__cover-img");
    if (img) {
      let fallbackTried = false;
      img.addEventListener("error", () => {
        if (fallbackTried) return;
        fallbackTried = true;
        img.src = item.coverImage;
      });
    }

    shelf.appendChild(card);
  }

  void hydratePlaylistThumbnails(root, catalog);

  root.appendChild(aura);
  root.appendChild(blobs);
  main.appendChild(library);
  root.appendChild(main);
  parent.appendChild(root);

  let launchHandler: ((id: string) => void) | null = null;
  let launching = false;

  /**
   * Kart aktivasyonu — anlık görsel feedback + kısa gecikme ile launch.
   *
   * Mobilde 3B sahnenin boot-up'ı 0.5-1 sn sürebilir; kullanıcı "bastım mı?"
   * diye şüphe etmesin diye karta `is-launching` ekliyoruz. CSS bu sınıfla
   * anında küçülme + parlama + altın çerçeve animasyonunu oynatır. 160ms
   * sonra gerçek `launchHandler` (dispose + experience mount) tetiklenir.
   */
  const activate = (el: HTMLElement | null) => {
    const id = el?.dataset.experienceId;
    if (!id || !el || launching) return;
    launching = true;
    el.classList.add("is-launching");
    window.requestAnimationFrame(() => {
      window.setTimeout(() => launchHandler?.(id), 160);
    });
  };

  const onShelfClick = (e: MouseEvent) => {
    activate((e.target as HTMLElement).closest("[data-experience-id]") as HTMLElement | null);
  };

  /**
   * `pointerdown` — tıklama hissi ANINDA verilir. :active pseudo-class
   * zaten CSS tarafında feedback sağlar ama pointerdown ile card'ın
   * tamamına extra vurgu (is-pressing) eklenebilir; şimdilik CSS :active
   * yeterli. Ayrıca pointerdown'ı yutarak 300ms click-delay riski
   * olabilen ender senaryoları önle.
   */
  const onShelfPointerDown = (e: PointerEvent) => {
    const card = (e.target as HTMLElement).closest(
      "[data-experience-id]",
    ) as HTMLElement | null;
    if (card) card.classList.add("is-pressing");
  };
  const onShelfPointerEnd = (e: PointerEvent) => {
    const card = (e.target as HTMLElement).closest(
      "[data-experience-id]",
    ) as HTMLElement | null;
    if (card) card.classList.remove("is-pressing");
  };

  const onShelfKey = (e: KeyboardEvent) => {
    if (e.code !== "Enter" && e.code !== "Space") return;
    const card = (e.target as HTMLElement).closest("[data-experience-id]") as HTMLElement | null;
    if (!card || !shelf.contains(card)) return;
    e.preventDefault();
    activate(card);
  };

  shelf.addEventListener("click", onShelfClick);
  shelf.addEventListener("keydown", onShelfKey);
  shelf.addEventListener("pointerdown", onShelfPointerDown);
  shelf.addEventListener("pointerup", onShelfPointerEnd);
  shelf.addEventListener("pointercancel", onShelfPointerEnd);
  shelf.addEventListener("pointerleave", onShelfPointerEnd);

  return {
    element: root,
    onLaunch(cb) {
      launchHandler = cb;
    },
    dispose() {
      shelf.removeEventListener("click", onShelfClick);
      shelf.removeEventListener("keydown", onShelfKey);
      shelf.removeEventListener("pointerdown", onShelfPointerDown);
      shelf.removeEventListener("pointerup", onShelfPointerEnd);
      shelf.removeEventListener("pointercancel", onShelfPointerEnd);
      shelf.removeEventListener("pointerleave", onShelfPointerEnd);
      root.remove();
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

/** Panelde kullanılan YouTube playlist ile aynı kapak (oEmbed `thumbnail_url`). */
async function hydratePlaylistThumbnails(
  hubRoot: HTMLElement,
  items: ExperienceCatalogItem[],
): Promise<void> {
  for (const item of items) {
    if (!item.playlistUrl) continue;
    const thumb = await fetchPlaylistThumbnailUrl(item.playlistUrl);
    if (!thumb) continue;
    const card = hubRoot.querySelector(`[data-experience-id="${CSS.escape(item.id)}"]`);
    const img = card?.querySelector<HTMLImageElement>(".entry-hub__cover-img");
    if (!img) continue;
    img.src = thumb;
  }
}
