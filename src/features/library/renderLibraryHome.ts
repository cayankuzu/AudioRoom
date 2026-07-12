import {
  LIBRARY_EXPERIENCES,
  type LibraryAvailability,
  type LibraryReleaseType,
} from "../../content/library";
import { getLibraryLocale } from "../../i18n";
import {
  createEmptyLibraryFilters,
  filterLibraryExperiences,
  getAlbumFilterOptions,
  getArtistFilterOptions,
  getAvailabilityLabel,
  getReleaseTypeLabel,
  hasActiveLibraryFilters,
  toggleFilterValue,
  type LibraryFilters,
} from "./catalog";
import { renderLibraryEngagementBar } from "./renderLibraryEngagementBar";
import { renderLibraryFooter } from "./renderLibraryFooter";
import { createAlbumHref } from "./router";

const libraryLocale = getLibraryLocale();

export type FilterSectionKey =
  | "artists"
  | "albums"
  | "formats"
  | "availability";

export interface LibraryHomeState {
  query: string;
  rotation: number;
  selectedId: string | null;
  filters: LibraryFilters;
  filterPanelOpen: boolean;
  openFilterSection: FilterSectionKey | null;
}

interface RenderLibraryHomeOptions {
  onQueryChange(query: string): void;
  onFiltersChange(filters: LibraryFilters): void;
  onFilterPanelToggle(open: boolean): void;
  onFilterSectionToggle(section: FilterSectionKey | null): void;
}

const DRAG_ROTATION_FACTOR = 0.22;
const WHEEL_ROTATION_FACTOR = 0.08;
const DRAG_THRESHOLD = 8;
const PROFILE_POPOVER_TIMEOUT_MS = 2200;
const PORTRAIT_HINT_INTERVAL_MS = 6000;
const PORTRAIT_HINT_VISIBLE_MS = 3000;
const RELEASE_TYPES: readonly LibraryReleaseType[] = ["album", "single", "ep"];
const AVAILABILITY_OPTIONS: readonly LibraryAvailability[] = [
  "available",
  "soon",
];

export function renderLibraryHome(
  root: HTMLElement,
  state: LibraryHomeState,
  options: RenderLibraryHomeOptions,
): () => void {
  root.innerHTML = "";

  const ui = libraryLocale.ui;
  const experiences = filterLibraryExperiences(state.query, state.filters);
  const artistOptions = getArtistFilterOptions(LIBRARY_EXPERIENCES);
  const albumOptions = getAlbumFilterOptions(LIBRARY_EXPERIENCES);
  const activeFilterCount = getActiveFilterCount(state.filters);
  const hasFilters = hasActiveLibraryFilters(state.filters);
  const emptyFilters = createEmptyLibraryFilters();

  const shell = document.createElement("main");
  shell.className = "library-orbit";
  shell.innerHTML = `
    <div class="library-orbit__halo library-orbit__halo--top-left" aria-hidden="true"></div>
    <div class="library-orbit__halo library-orbit__halo--top-right" aria-hidden="true"></div>
    <div class="library-orbit__halo library-orbit__halo--bottom-left" aria-hidden="true"></div>
    <div class="library-orbit__halo library-orbit__halo--bottom-right" aria-hidden="true"></div>

    <div class="showcase-shell showcase-shell--orbit-minimal">
      <header class="showcase-topbar">
        <a class="orbit-brand" href="#/" aria-label="${escapeAttribute(
          ui.brandAriaLabel,
        )}">
          <span class="orbit-brand__mark" aria-hidden="true">
            <img class="orbit-brand__mark-image" src="./favicon.svg" alt="" />
          </span>
          <span class="orbit-brand__copy">
            <strong>${escapeHtml(ui.brandTitle)}</strong>
            <span>${escapeHtml(ui.brandSubtitle)}</span>
          </span>
        </a>

        <div class="showcase-profilebox" data-profile-box>
          <button
            class="showcase-profile"
            type="button"
            data-profile-button
            aria-expanded="false"
            aria-haspopup="dialog"
          >
            <span class="showcase-profile__avatar" aria-hidden="true">AR</span>
            <span class="showcase-profile__copy">
              <strong>${escapeHtml(ui.profileTitle)}</strong>
              <small>${escapeHtml(ui.profileStatus)}</small>
            </span>
          </button>
          <div class="showcase-profile__popover" data-profile-popover hidden>
            ${escapeHtml(ui.profilePopover)}
          </div>
        </div>
      </header>

      <section class="showcase-searchpanel">
        <div class="showcase-searchrow">
          <label class="showcase-search" for="library-search-input">
            <span class="showcase-search__icon" aria-hidden="true">${renderIcon("search")}</span>
            <input
              id="library-search-input"
              class="showcase-search__input"
              type="search"
              placeholder="${escapeAttribute(ui.searchPlaceholder)}"
              autocomplete="off"
              spellcheck="false"
            />
          </label>

          <div class="showcase-filterbox" data-filter-box>
            <button
              class="showcase-filter"
              type="button"
              data-filter-button
              aria-expanded="${state.filterPanelOpen ? "true" : "false"}"
              aria-haspopup="dialog"
            >
              <span class="showcase-filter__icon" aria-hidden="true">${renderIcon("filter")}</span>
              <span>${escapeHtml(ui.filterButton)}</span>
              ${
                activeFilterCount > 0
                  ? `<span class="showcase-filter__count">${activeFilterCount}</span>`
                  : ""
              }
            </button>

            <div
              class="showcase-filterpanel"
              data-filter-panel
              ${state.filterPanelOpen ? "" : "hidden"}
            >
              <div class="showcase-filterpanel__head">
                <div>
                  <p class="showcase-filterpanel__eyebrow">${escapeHtml(ui.filterPanelEyebrow)}</p>
                  <h2 class="showcase-filterpanel__title">${escapeHtml(ui.filterPanelTitle)}</h2>
                </div>
                <button
                  class="showcase-filterpanel__clear"
                  type="button"
                  data-clear-filters
                  ${hasFilters ? "" : "disabled"}
                >
                  ${escapeHtml(ui.filterClear)}
                </button>
              </div>

              <div class="showcase-filteraccordion">
                ${renderFilterSection({
                  section: "artists",
                  title: ui.filterSections.artists,
                  summary: getArtistSummary(state.filters, ui.artistSummaryDefault),
                  count: artistOptions.length,
                  open: state.openFilterSection === "artists",
                  content: `
                    <div class="showcase-filtergrid showcase-filtergrid--artists">
                      ${artistOptions
                        .map((option) => {
                          const active = state.filters.artists.includes(option.artist);
                          return `
                            <button
                              class="showcase-filteroption ${active ? "is-active" : ""}"
                              type="button"
                              data-filter-artist="${escapeAttribute(option.artist)}"
                              aria-pressed="${active ? "true" : "false"}"
                              title="${escapeAttribute(option.summary)}"
                            >
                              <span class="showcase-filteroption__title">${escapeHtml(option.artist)}</span>
                              <span class="showcase-filteroption__meta">${escapeHtml(option.summary)}</span>
                            </button>
                          `;
                        })
                        .join("")}
                    </div>
                  `,
                })}

                ${renderFilterSection({
                  section: "albums",
                  title: ui.filterSections.albums,
                  summary: getAlbumSummary(state.filters, ui.albumSummaryDefault),
                  count: albumOptions.length,
                  open: state.openFilterSection === "albums",
                  content: `
                    <div class="showcase-filtergrid showcase-filtergrid--albums">
                      ${albumOptions
                        .map((option) => {
                          const active = state.filters.albums.includes(option.id);
                          return `
                            <button
                              class="showcase-filteroption ${active ? "is-active" : ""}"
                              type="button"
                              data-filter-album="${escapeAttribute(option.id)}"
                              aria-pressed="${active ? "true" : "false"}"
                              title="${escapeAttribute(`${option.album} · ${option.artist}`)}"
                            >
                              <span class="showcase-filteroption__title">
                                <span>${escapeHtml(option.album)}</span>
                                <span class="orbit-type-badge orbit-type-badge--${option.releaseType}">
                                  ${escapeHtml(getReleaseTypeLabel(option.releaseType))}
                                </span>
                              </span>
                              <span class="showcase-filteroption__meta">${escapeHtml(option.artist)}</span>
                            </button>
                          `;
                        })
                        .join("")}
                    </div>
                  `,
                })}

                ${renderFilterSection({
                  section: "formats",
                  title: ui.filterSections.formats,
                  summary: getFormatSummary(state.filters, ui.formatSummaryDefault),
                  count: RELEASE_TYPES.length,
                  open: state.openFilterSection === "formats",
                  content: `
                    <div class="showcase-filterchips">
                      ${RELEASE_TYPES.map((releaseType) => {
                        const active =
                          state.filters.releaseTypes.includes(releaseType);
                        return `
                          <button
                            class="showcase-filterchip showcase-filterchip--${releaseType} ${active ? "is-active" : ""}"
                            type="button"
                            data-filter-release-type="${releaseType}"
                            aria-pressed="${active ? "true" : "false"}"
                          >
                            ${escapeHtml(getReleaseTypeLabel(releaseType))}
                          </button>
                        `;
                      }).join("")}
                    </div>
                  `,
                })}

                ${renderFilterSection({
                  section: "availability",
                  title: ui.filterSections.availability,
                  summary: getAvailabilitySummary(
                    state.filters,
                    ui.availabilitySummaryDefault,
                  ),
                  count: AVAILABILITY_OPTIONS.length,
                  open: state.openFilterSection === "availability",
                  content: `
                    <div class="showcase-filterchips showcase-filterchips--availability">
                      ${AVAILABILITY_OPTIONS.map((availability) => {
                        const active =
                          state.filters.availability.includes(availability);
                        return `
                          <button
                            class="showcase-filterchip showcase-filterchip--availability showcase-filterchip--availability-${availability} ${active ? "is-active" : ""}"
                            type="button"
                            data-filter-availability="${availability}"
                            aria-pressed="${active ? "true" : "false"}"
                          >
                            ${escapeHtml(getAvailabilityLabel(availability))}
                          </button>
                        `;
                      }).join("")}
                    </div>
                  `,
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="orbit-minimal-panel">
        ${
          experiences.length
            ? `
              <div
                class="orbit-minimal-viewport"
                data-orbit-viewport
                tabindex="0"
                aria-label="${escapeAttribute(ui.orbitAriaLabel)}"
              >
                <div class="orbit-minimal-viewport__glow" aria-hidden="true"></div>
                <div class="orbit-minimal-ring" data-orbit-ring></div>
              </div>
              <div class="orbit-minimal-actions">
                <button class="orbit-randomize" type="button" data-randomize-button>
                  ${escapeHtml(ui.actions.randomize)}
                </button>
              </div>
              <aside
                class="orbit-mobile-toast"
                data-portrait-toast
                aria-live="polite"
                aria-hidden="true"
                hidden
              >
                <strong>${escapeHtml(ui.mobileHints.orientationTitle)}</strong>
                <span>${escapeHtml(ui.mobileHints.orientationDescription)}</span>
              </aside>
            `
            : `
              <article class="showcase-empty">
                <p class="showcase-empty__title">${escapeHtml(ui.emptyResultsTitle)}</p>
                <p class="showcase-empty__text">
                  ${escapeHtml(
                    hasFilters
                      ? ui.emptyResultsWithFilters
                      : ui.emptyResultsWithoutFilters,
                  )}
                </p>
              </article>
            `
        }
      </section>

      ${renderLibraryFooter()}
    </div>
  `;

  root.appendChild(shell);

  const input = shell.querySelector<HTMLInputElement>("#library-search-input");
  const profileBox = shell.querySelector<HTMLElement>("[data-profile-box]");
  const profileButton =
    shell.querySelector<HTMLButtonElement>("[data-profile-button]");
  const profilePopover =
    shell.querySelector<HTMLElement>("[data-profile-popover]");
  const filterBox = shell.querySelector<HTMLElement>("[data-filter-box]");
  const filterButton =
    shell.querySelector<HTMLButtonElement>("[data-filter-button]");
  const filterPanel = shell.querySelector<HTMLElement>("[data-filter-panel]");
  const viewport = shell.querySelector<HTMLElement>("[data-orbit-viewport]");
  const ring = shell.querySelector<HTMLElement>("[data-orbit-ring]");
  const randomizeButton =
    shell.querySelector<HTMLButtonElement>("[data-randomize-button]");
  const portraitToast =
    shell.querySelector<HTMLElement>("[data-portrait-toast]");

  let profileTimeout = 0;
  let portraitToastInterval = 0;
  let portraitToastHideTimeout = 0;
  let resizeAnimationFrame = 0;

  if (input) {
    input.value = state.query;
    input.addEventListener("input", () => {
      options.onQueryChange(input.value);
    });
  }

  const setProfilePopoverVisible = (visible: boolean) => {
    if (!profileButton || !profilePopover) {
      return;
    }

    profileButton.setAttribute("aria-expanded", visible ? "true" : "false");
    profilePopover.hidden = !visible;
  };

  const onProfileClick = () => {
    setProfilePopoverVisible(true);
    window.clearTimeout(profileTimeout);
    profileTimeout = window.setTimeout(() => {
      setProfilePopoverVisible(false);
    }, PROFILE_POPOVER_TIMEOUT_MS);
  };

  const onFilterButtonClick = () => {
    options.onFilterPanelToggle(!state.filterPanelOpen);
  };

  const onFilterPanelClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }

    const clearButton = target.closest<HTMLButtonElement>("[data-clear-filters]");
    if (clearButton) {
      options.onFiltersChange(emptyFilters);
      return;
    }

    const sectionButton =
      target.closest<HTMLButtonElement>("[data-filter-section]");
    if (sectionButton) {
      const section = sectionButton.dataset.filterSection as
        | FilterSectionKey
        | undefined;
      if (!section) {
        return;
      }

      options.onFilterSectionToggle(
        state.openFilterSection === section ? null : section,
      );
      return;
    }

    const artistButton = target.closest<HTMLButtonElement>("[data-filter-artist]");
    if (artistButton) {
      const artist = artistButton.dataset.filterArtist;
      if (!artist) {
        return;
      }

      options.onFiltersChange({
        ...state.filters,
        artists: toggleFilterValue(state.filters.artists, artist),
      });
      return;
    }

    const albumButton = target.closest<HTMLButtonElement>("[data-filter-album]");
    if (albumButton) {
      const albumId = albumButton.dataset.filterAlbum;
      if (!albumId) {
        return;
      }

      options.onFiltersChange({
        ...state.filters,
        albums: toggleFilterValue(state.filters.albums, albumId),
      });
      return;
    }

    const releaseTypeButton = target.closest<HTMLButtonElement>(
      "[data-filter-release-type]",
    );
    if (releaseTypeButton) {
      const releaseType = releaseTypeButton.dataset.filterReleaseType as
        | LibraryReleaseType
        | undefined;
      if (!releaseType) {
        return;
      }

      options.onFiltersChange({
        ...state.filters,
        releaseTypes: toggleFilterValue(
          state.filters.releaseTypes,
          releaseType,
        ),
      });
      return;
    }

    const availabilityButton = target.closest<HTMLButtonElement>(
      "[data-filter-availability]",
    );
    if (availabilityButton) {
      const availability = availabilityButton.dataset.filterAvailability as
        | LibraryAvailability
        | undefined;
      if (!availability) {
        return;
      }

      options.onFiltersChange({
        ...state.filters,
        availability: toggleFilterValue(
          state.filters.availability,
          availability,
        ),
      });
    }
  };

  const onDocumentPointerDown = (event: PointerEvent) => {
    if (!profileBox?.contains(event.target as Node)) {
      setProfilePopoverVisible(false);
    }

    if (!filterBox?.contains(event.target as Node) && state.filterPanelOpen) {
      options.onFilterPanelToggle(false);
    }
  };

  profileButton?.addEventListener("click", onProfileClick);
  filterButton?.addEventListener("click", onFilterButtonClick);
  filterPanel?.addEventListener("click", onFilterPanelClick);
  document.addEventListener("pointerdown", onDocumentPointerDown);

  if (!viewport || !ring || !randomizeButton || experiences.length === 0) {
    return () => {
      window.clearTimeout(profileTimeout);
      profileButton?.removeEventListener("click", onProfileClick);
      filterButton?.removeEventListener("click", onFilterButtonClick);
      filterPanel?.removeEventListener("click", onFilterPanelClick);
      document.removeEventListener("pointerdown", onDocumentPointerDown);
    };
  }

  const cardElements = experiences.map((experience) => {
    const link = document.createElement("a");
    link.className = "orbit-album-card";
    link.href = createAlbumHref(experience.id);
    link.dataset.albumLink = experience.id;
    link.style.setProperty("--card-accent", experience.theme.accent);
    link.style.setProperty("--card-aura", experience.theme.aura);
    link.style.setProperty("--card-foil", experience.theme.foil);
    link.style.setProperty(
      "--card-glow-top-right",
      experience.theme.glowTopRight,
    );
    link.style.setProperty(
      "--card-glow-bottom-left",
      experience.theme.glowBottomLeft,
    );
    link.innerHTML = `
      <div class="orbit-album-card__coverwrap">
        <img
          class="orbit-album-card__cover"
          src="${escapeAttribute(experience.cover)}"
          alt="${escapeAttribute(`${experience.artist} - ${experience.album}`)}"
          loading="eager"
          decoding="async"
          draggable="false"
        />
      </div>
      <div class="orbit-album-card__body">
        <div class="orbit-album-card__line">
          <p class="orbit-album-card__artist">${escapeHtml(experience.artist)}</p>
          <div class="orbit-album-card__badges">
            <span class="orbit-type-badge orbit-type-badge--${experience.releaseType}">
              ${escapeHtml(getReleaseTypeLabel(experience.releaseType))}
            </span>
            <span class="orbit-type-badge orbit-type-badge--${experience.availability}">
              ${escapeHtml(getAvailabilityLabel(experience.availability))}
            </span>
          </div>
        </div>
        <h2 class="orbit-album-card__title">${escapeHtml(experience.album)}</h2>
        <p class="orbit-album-card__meta">
          ${experience.year ? `${escapeHtml(experience.year)} · ` : ""}${escapeHtml(
            ui.trackCountLabel(experience.trackCount),
          )}
        </p>
        ${renderLibraryEngagementBar("card")}
      </div>
    `;
    ring.appendChild(link);
    return link;
  });

  let rotation = state.rotation;
  let animationFrame = 0;
  let activePointerId: number | null = null;
  let isAutoSpinning = false;
  let lastX = 0;
  let pressX = 0;
  let pressY = 0;
  let gestureAxis: "pending" | "x" | "y" = "pending";
  let didDrag = false;
  let suppressClickUntil = 0;

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const stopAnimation = () => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  };

  const syncOrbit = () => {
    const count = experiences.length;
    const step = 360 / count;
    const viewportWidth = viewport.clientWidth;
    const isPhoneViewport = viewportWidth <= 520;
    const isCompactViewport = viewportWidth <= 620;
    const isTabletViewport = viewportWidth <= 900;
    const sampleCardWidth =
      cardElements[0]?.offsetWidth ||
      clamp(viewportWidth * (isPhoneViewport ? 0.31 : 0.26), 112, 238);
    const availableRadius = Math.max(
      isPhoneViewport ? 112 : 128,
      (viewportWidth -
        sampleCardWidth * (isPhoneViewport ? 0.74 : isCompactViewport ? 0.88 : 0.94)) /
        2,
    );
    const preferredRadius =
      viewportWidth *
      (isPhoneViewport ? 0.36 : isCompactViewport ? 0.34 : isTabletViewport ? 0.36 : 0.38);
    const radius = clamp(
      preferredRadius,
      isPhoneViewport ? 112 : 128,
      availableRadius,
    );
    const depth = clamp(
      radius * (isPhoneViewport ? 0.72 : isCompactViewport ? 0.78 : 0.9),
      isPhoneViewport ? 114 : 132,
      310,
    );

    let activeCard = experiences[0];
    let smallestDistance = Number.POSITIVE_INFINITY;

    experiences.forEach((experience, index) => {
      const card = cardElements[index];
      const angle = normalizeAngle(rotation + index * step);
      const distance = Math.abs(angle);
      const rad = (angle * Math.PI) / 180;
      const z = Math.cos(rad) * depth;
      const depthFactor = clamp((z + depth) / (depth * 2), 0, 1);
      const lateralSpread =
        (isPhoneViewport ? 1.08 : 1.04) +
        (1 - depthFactor) * (isPhoneViewport ? 0.68 : isCompactViewport ? 0.54 : 0.4) +
        Math.abs(Math.sin(rad)) * 0.08;
      const x = Math.sin(rad) * radius * lateralSpread;
      const y =
        Math.cos(rad) * (isPhoneViewport ? -8 : isCompactViewport ? -16 : -20) +
        (1 - depthFactor) * (isPhoneViewport ? 40 : isCompactViewport ? 56 : 48);
      const scale = isPhoneViewport
        ? 0.42 + Math.pow(depthFactor, 0.9) * 0.58
        : 0.36 + Math.pow(depthFactor, 0.88) * 0.64;
      const opacity = isPhoneViewport
        ? 0.1 + Math.pow(depthFactor, 1.55) * 0.9
        : 0.04 + Math.pow(depthFactor, isCompactViewport ? 1.9 : 1.65) * 0.96;
      const tilt = clamp(Math.sin(rad) * -18, -22, 22);

      card.style.transform = `
        translate3d(-50%, -50%, 0)
        translate3d(${x}px, ${y}px, 0)
        rotateY(${tilt}deg)
        scale(${scale})
      `;
      card.style.opacity = opacity.toFixed(3);
      card.style.filter = "none";
      card.style.zIndex = String(Math.round(1200 + z * 10 - distance));
      card.style.pointerEvents = depthFactor > 0.52 ? "auto" : "none";
      card.classList.toggle("is-front", distance < step * 0.55);
      card.classList.toggle("is-side", distance >= step * 0.55 && depthFactor > 0.42);
      card.classList.toggle("is-rear", depthFactor <= 0.42);

      if (distance < smallestDistance) {
        smallestDistance = distance;
        activeCard = experience;
      }
    });

    state.rotation = rotation;
    state.selectedId = activeCard.id;
    shell.style.setProperty("--orbit-accent", activeCard.theme.accent);
    shell.style.setProperty("--orbit-aura", activeCard.theme.aura);
    shell.style.setProperty("--orbit-foil", activeCard.theme.foil);
    shell.style.setProperty(
      "--orbit-top-right",
      activeCard.theme.glowTopRight,
    );
    shell.style.setProperty(
      "--orbit-bottom-left",
      activeCard.theme.glowBottomLeft,
    );
  };

  const setPortraitToastVisible = (visible: boolean) => {
    if (!portraitToast) {
      return;
    }

    portraitToast.hidden = !visible;
    portraitToast.setAttribute("aria-hidden", visible ? "false" : "true");
    portraitToast.classList.toggle("is-visible", visible);
  };

  const stopPortraitToastLoop = () => {
    window.clearInterval(portraitToastInterval);
    window.clearTimeout(portraitToastHideTimeout);
    portraitToastInterval = 0;
    portraitToastHideTimeout = 0;
    setPortraitToastVisible(false);
  };

  const shouldShowPortraitToast = () => {
    const hasCoarsePointer =
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(any-pointer: coarse)").matches;

    return hasCoarsePointer && window.innerHeight > window.innerWidth;
  };

  const flashPortraitToast = () => {
    if (!shouldShowPortraitToast()) {
      stopPortraitToastLoop();
      return;
    }

    setPortraitToastVisible(true);
    window.clearTimeout(portraitToastHideTimeout);
    portraitToastHideTimeout = window.setTimeout(() => {
      setPortraitToastVisible(false);
    }, PORTRAIT_HINT_VISIBLE_MS);
  };

  const syncPortraitToastLoop = () => {
    stopPortraitToastLoop();

    if (!shouldShowPortraitToast()) {
      return;
    }

    flashPortraitToast();
    portraitToastInterval = window.setInterval(
      flashPortraitToast,
      PORTRAIT_HINT_INTERVAL_MS,
    );
  };

  const onResize = () => {
    if (resizeAnimationFrame) {
      cancelAnimationFrame(resizeAnimationFrame);
    }

    resizeAnimationFrame = requestAnimationFrame(() => {
      resizeAnimationFrame = 0;
      syncOrbit();
      syncPortraitToastLoop();
    });
  };

  const getCardTargetHref = (clientX: number, clientY: number): string | null => {
    const hit = document.elementFromPoint(clientX, clientY);
    const link =
      hit instanceof HTMLElement
        ? hit.closest<HTMLAnchorElement>("[data-album-link]")
        : null;
    return link?.getAttribute("href") ?? null;
  };

  const releasePointer = (event?: PointerEvent) => {
    if (activePointerId === null) {
      return;
    }

    if (event && viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }

    viewport.classList.remove("is-dragging");

    if (!didDrag && event) {
      const href = getCardTargetHref(event.clientX, event.clientY);
      if (href) {
        suppressClickUntil = performance.now() + 180;
        activePointerId = null;
        gestureAxis = "pending";
        window.location.hash = href.replace(/^#/, "");
        return;
      }
    }

    if (didDrag) {
      suppressClickUntil = performance.now() + 180;
    }

    activePointerId = null;
    gestureAxis = "pending";
    didDrag = false;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (isAutoSpinning) {
      return;
    }

    activePointerId = event.pointerId;
    lastX = event.clientX;
    pressX = event.clientX;
    pressY = event.clientY;
    gestureAxis = "pending";
    didDrag = false;

    if (event.pointerType === "mouse") {
      viewport.setPointerCapture(event.pointerId);
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== activePointerId || isAutoSpinning) {
      return;
    }

    const totalDeltaX = event.clientX - pressX;
    const totalDeltaY = event.clientY - pressY;

    if (gestureAxis === "pending") {
      if (
        Math.abs(totalDeltaX) < DRAG_THRESHOLD &&
        Math.abs(totalDeltaY) < DRAG_THRESHOLD
      ) {
        return;
      }

      gestureAxis =
        Math.abs(totalDeltaX) > Math.abs(totalDeltaY) ? "x" : "y";

      if (gestureAxis === "y" && event.pointerType !== "mouse") {
        releasePointer();
        return;
      }

      if (gestureAxis === "x") {
        viewport.classList.add("is-dragging");
      }
    }

    if (gestureAxis !== "x") {
      return;
    }

    const deltaX = event.clientX - lastX;
    lastX = event.clientX;
    didDrag = true;
    rotation += deltaX * DRAG_ROTATION_FACTOR;
    syncOrbit();
  };

  const onPointerUp = (event: PointerEvent) => {
    releasePointer(event);
  };

  const onPointerCancel = () => {
    releasePointer();
  };

  const onWheel = (event: WheelEvent) => {
    if (isAutoSpinning) {
      return;
    }

    event.preventDefault();
    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
    rotation += delta * -WHEEL_ROTATION_FACTOR;
    syncOrbit();
  };

  const onClickCapture = (event: MouseEvent) => {
    if (performance.now() <= suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (isAutoSpinning) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      rotation -= 360 / experiences.length;
      syncOrbit();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      rotation += 360 / experiences.length;
      syncOrbit();
    }
  };

  const spinToRandomAlbum = () => {
    if (isAutoSpinning || experiences.length === 0) {
      return;
    }

    const step = 360 / experiences.length;
    const currentIndex = Math.max(
      0,
      experiences.findIndex((experience) => experience.id === state.selectedId),
    );
    const candidateIndexes = experiences
      .map((_, index) => index)
      .filter((index) => experiences.length === 1 || index !== currentIndex);
    const targetIndex =
      candidateIndexes[Math.floor(Math.random() * candidateIndexes.length)] ?? 0;
    const currentNormalized = ((rotation % 360) + 360) % 360;
    const desiredNormalized = ((-targetIndex * step) % 360 + 360) % 360;
    const direction = Math.random() < 0.5 ? -1 : 1;
    const extraTurns = 4 + Math.floor(Math.random() * 3);
    const startRotation = rotation;
    let targetRotation = rotation;

    if (direction > 0) {
      let clockwiseDelta = desiredNormalized - currentNormalized;
      if (clockwiseDelta < 0) {
        clockwiseDelta += 360;
      }
      targetRotation += clockwiseDelta + extraTurns * 360;
    } else {
      let counterClockwiseDelta = currentNormalized - desiredNormalized;
      if (counterClockwiseDelta < 0) {
        counterClockwiseDelta += 360;
      }
      targetRotation -= counterClockwiseDelta + extraTurns * 360;
    }

    const duration = 1900;
    let startTime = 0;

    isAutoSpinning = true;
    randomizeButton.disabled = true;
    randomizeButton.textContent = ui.actions.randomizing;
    stopAnimation();

    const tick = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = Math.min(1, (timestamp - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      rotation = startRotation + (targetRotation - startRotation) * eased;
      syncOrbit();

      if (progress < 1) {
        animationFrame = requestAnimationFrame(tick);
        return;
      }

      isAutoSpinning = false;
      randomizeButton.disabled = false;
      randomizeButton.textContent = ui.actions.randomize;
      animationFrame = 0;
    };

    animationFrame = requestAnimationFrame(tick);
  };

  randomizeButton.addEventListener("click", spinToRandomAlbum);
  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerCancel);
  viewport.addEventListener("lostpointercapture", onPointerCancel);
  viewport.addEventListener("wheel", onWheel, { passive: false });
  viewport.addEventListener("click", onClickCapture, true);
  viewport.addEventListener("keydown", onKeyDown);
  window.addEventListener("resize", onResize);

  syncOrbit();
  syncPortraitToastLoop();

  return () => {
    stopAnimation();
    stopPortraitToastLoop();
    window.clearTimeout(profileTimeout);
    if (resizeAnimationFrame) {
      cancelAnimationFrame(resizeAnimationFrame);
    }
    profileButton?.removeEventListener("click", onProfileClick);
    filterButton?.removeEventListener("click", onFilterButtonClick);
    filterPanel?.removeEventListener("click", onFilterPanelClick);
    document.removeEventListener("pointerdown", onDocumentPointerDown);
    randomizeButton.removeEventListener("click", spinToRandomAlbum);
    viewport.removeEventListener("pointerdown", onPointerDown);
    viewport.removeEventListener("pointermove", onPointerMove);
    viewport.removeEventListener("pointerup", onPointerUp);
    viewport.removeEventListener("pointercancel", onPointerCancel);
    viewport.removeEventListener("lostpointercapture", onPointerCancel);
    viewport.removeEventListener("wheel", onWheel);
    viewport.removeEventListener("click", onClickCapture, true);
    viewport.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("resize", onResize);
  };
}

function renderFilterSection({
  section,
  title,
  summary,
  count,
  open,
  content,
}: {
  section: FilterSectionKey;
  title: string;
  summary: string;
  count: number;
  open: boolean;
  content: string;
}): string {
  return `
    <section class="showcase-filtergroup ${open ? "is-open" : ""}">
      <button
        class="showcase-filtergroup__toggle"
        type="button"
        data-filter-section="${section}"
        aria-expanded="${open ? "true" : "false"}"
      >
        <span class="showcase-filtergroup__copy">
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(summary)}</small>
        </span>
        <span class="showcase-filtergroup__meta">
          <span class="showcase-filtergroup__count">${count}</span>
          <span class="showcase-filtergroup__chevron" aria-hidden="true">${renderIcon(
            "chevron",
          )}</span>
        </span>
      </button>
      <div class="showcase-filtergroup__panel" ${open ? "" : "hidden"}>
        ${content}
      </div>
    </section>
  `;
}

function getArtistSummary(filters: LibraryFilters, fallback: string): string {
  return filters.artists.length > 0
    ? libraryLocale.ui.selectedCount(filters.artists.length)
    : fallback;
}

function getAlbumSummary(filters: LibraryFilters, fallback: string): string {
  return filters.albums.length > 0
    ? libraryLocale.ui.selectedCount(filters.albums.length)
    : fallback;
}

function getFormatSummary(filters: LibraryFilters, fallback: string): string {
  return filters.releaseTypes.length > 0
    ? filters.releaseTypes.map(getReleaseTypeLabel).join(" · ")
    : fallback;
}

function getAvailabilitySummary(
  filters: LibraryFilters,
  fallback: string,
): string {
  return filters.availability.length > 0
    ? filters.availability.map(getAvailabilityLabel).join(" · ")
    : fallback;
}

function getActiveFilterCount(filters: LibraryFilters): number {
  return (
    filters.artists.length +
    filters.albums.length +
    filters.releaseTypes.length +
    filters.availability.length
  );
}

function normalizeAngle(value: number): number {
  let angle = value % 360;
  if (angle > 180) {
    angle -= 360;
  }
  if (angle < -180) {
    angle += 360;
  }
  return angle;
}

function renderIcon(kind: "search" | "filter" | "chevron"): string {
  switch (kind) {
    case "filter":
      return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7H20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M7 12H17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M10 17H14" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
      `;
    case "chevron":
      return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
    default:
      return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/>
          <path d="M16 16L20 20" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
      `;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
