import { ARTISTS, type AlbumEntry } from "../registry/albums";

/**
 * Hub ekranı — kök seviyede tüm sanatçı/albüm kartlarını listeler.
 * Karta tıklandığında ilgili albümün alt klasöründeki index.html'e yönlendirir.
 */
export function renderHub(root: HTMLElement): void {
  root.innerHTML = "";

  const hub = document.createElement("div");
  hub.className = "hub";

  /** Top bar */
  const top = document.createElement("div");
  top.className = "hub__top";
  top.innerHTML = `
    <div class="hub__brand">
      <div class="hub__brand-mark"></div>
      <div class="hub__brand-text">
        <span class="hub__brand-name">AudioRoom</span>
        <span class="hub__brand-sub">Albüm Evrenleri · v0.1</span>
      </div>
    </div>
    <div class="hub__meta">
      <div><strong>${countAvailable()}</strong> evren · <strong>${ARTISTS.length}</strong> sanatçı</div>
      <div>Tarayıcıda 3B · klavye + dokunmatik</div>
    </div>
  `;
  hub.appendChild(top);

  /** Hero */
  const hero = document.createElement("div");
  hero.className = "hub__hero";
  hero.innerHTML = `
    <p class="hub__hero-eyebrow">Bugün hangi dünya?</p>
    <h1 class="hub__hero-title">Bir kapağa dokun, içine gir.</h1>
    <p class="hub__hero-sub">
      Her albüm, atmosferi, mekanikleri ve sözleriyle gezilebilir bir 3B oda.
      Yürü, dinle, etkileşime geç. Kulaklıkla daha iyi.
    </p>
  `;
  hub.appendChild(hero);

  /** Artist sections */
  const artistsWrap = document.createElement("div");
  artistsWrap.className = "hub__artists";

  for (const artist of ARTISTS) {
    const section = document.createElement("section");
    section.className = "artist";

    const head = document.createElement("div");
    head.className = "artist__head";
    head.innerHTML = `
      <h2 class="artist__name">${escapeHtml(artist.name)}</h2>
      <span class="artist__count">${artist.albums.length} ALBÜM</span>
    `;
    section.appendChild(head);

    const shelf = document.createElement("div");
    shelf.className = "artist__shelf";

    for (const album of artist.albums) {
      shelf.appendChild(renderAlbumCard(album));
    }

    section.appendChild(shelf);
    artistsWrap.appendChild(section);
  }

  hub.appendChild(artistsWrap);

  /** Footer */
  const footer = document.createElement("div");
  footer.className = "hub__footer";
  footer.innerHTML = `
    <div class="hub__footer-row hub__footer-row--meta">
      <span>© AudioRoom</span>
      <span>BUILT WITH THREE.JS · VITE · TYPESCRIPT</span>
    </div>
    <div class="hub__footer-row hub__footer-row--powered">Powered by <strong>MeMoDe</strong></div>
  `;
  hub.appendChild(footer);

  root.appendChild(hub);
}

function renderAlbumCard(album: AlbumEntry): HTMLElement {
  const el = document.createElement(album.available ? "a" : "div");
  el.className = "album-card" + (album.available ? "" : " placeholder");
  if (el instanceof HTMLAnchorElement && album.available) {
    el.href = album.path;
  }
  el.innerHTML = `
    <div class="album-card__cover">
      ${album.available
        ? `<img src="${escapeAttr(album.cover)}" alt="${escapeAttr(album.artist + " — " + album.title)}" loading="eager" decoding="async" />`
        : ""}
    </div>
    <div class="album-card__body">
      <p class="album-card__tag">${escapeHtml(album.artist)}${album.year ? " · " + escapeHtml(album.year) : ""}</p>
      <h3 class="album-card__title">${escapeHtml(album.title)}</h3>
      <p class="album-card__tag" style="opacity: .7">${escapeHtml(album.tagline)}</p>
      <span class="album-card__cta">${album.available ? "EVRENE GİR" : "YAKINDA"}</span>
    </div>
  `;
  return el;
}

function countAvailable(): number {
  return ARTISTS.reduce(
    (acc, a) => acc + a.albums.filter((b) => b.available).length,
    0
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
