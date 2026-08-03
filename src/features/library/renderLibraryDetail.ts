import { type LibraryExperience } from "../../content/library";
import { getLibraryLocale } from "../../i18n";
import {
  getAvailabilityLabel,
  getDeviceSupportLabel,
  getReleaseTypeLabel,
} from "./catalog";
import { renderLibraryEngagementBar } from "./renderLibraryEngagementBar";
import { renderLibraryFooter } from "./renderLibraryFooter";
import { createHomeHref } from "./router";

const libraryLocale = getLibraryLocale();
const DETAIL_PORTRAIT_HINT_INTERVAL_MS = 6000;
const DETAIL_PORTRAIT_HINT_VISIBLE_MS = 3000;

export function renderLibraryDetail(
  root: HTMLElement,
  experience: LibraryExperience,
): () => void {
  root.innerHTML = "";

  const ui = libraryLocale.ui;
  const shell = document.createElement("main");
  shell.className = "library-detail";
  shell.style.setProperty("--detail-accent", experience.theme.accent);
  shell.style.setProperty("--detail-aura", experience.theme.aura);
  shell.style.setProperty("--detail-foil", experience.theme.foil);
  shell.style.setProperty(
    "--detail-top-right",
    experience.theme.glowTopRight,
  );
  shell.style.setProperty(
    "--detail-bottom-left",
    experience.theme.glowBottomLeft,
  );

  const albumFacts = experience.albumFacts
    .map((fact) => `<li>${escapeHtml(fact)}</li>`)
    .join("");
  const trackList = experience.tracks
    .map(
      (track) => `
        <li>
          <a
            class="detail-tracklink"
            href="${escapeAttribute(track.youtubeUrl)}"
            target="_blank"
            rel="noreferrer"
          >
            ${escapeHtml(track.title)}
          </a>
        </li>
      `,
    )
    .join("");

  const artistHref = experience.artistUrl?.trim();
  const hasArtistLink = Boolean(artistHref);
  const isLiveWorld = experience.availability === "available";
  const hasLiveWorld = Boolean(isLiveWorld && experience.path);
  const worldAction = hasLiveWorld
    ? `
        <a class="detail-hero__cta detail-hero__cta--primary" data-world-launch href="${escapeAttribute(experience.path ?? "")}">
          ${escapeHtml(ui.actions.enterWorld)}
        </a>
      `
    : `
        <button class="detail-hero__cta detail-hero__cta--primary detail-hero__cta--disabled" type="button" disabled>
          ${escapeHtml(ui.actions.comingSoon)}
        </button>
      `;
  const cartAction = `
    <button
      class="detail-hero__cta detail-hero__cta--secondary detail-hero__cta--cart detail-hero__cta--disabled"
      type="button"
      disabled
    >
      <span>${escapeHtml(ui.actions.addToCart)}</span>
      <span class="orbit-type-badge orbit-type-badge--soon">
        ${escapeHtml(ui.actions.comingSoon)}
      </span>
    </button>
  `;
  const artistAction = hasArtistLink
    ? `
        <a
          class="detail-hero__cta detail-hero__cta--secondary"
          href="${escapeAttribute(artistHref ?? "")}"
          target="_blank"
          rel="noreferrer"
        >
          ${escapeHtml(ui.instagramLabel(experience.artist))}
        </a>
      `
    : `
        <button class="detail-hero__cta detail-hero__cta--secondary detail-hero__cta--disabled" type="button" disabled>
          ${escapeHtml(ui.instagramLabel(experience.artist))}
        </button>
      `;

  shell.innerHTML = `
    <div class="library-detail__halo library-detail__halo--top-left" aria-hidden="true"></div>
    <div class="library-detail__halo library-detail__halo--top-right" aria-hidden="true"></div>
    <div class="library-detail__halo library-detail__halo--bottom-left" aria-hidden="true"></div>
    <div class="library-detail__halo library-detail__halo--bottom-right" aria-hidden="true"></div>

    <div class="library-detail__grid">
      <header class="detail-topbar">
        <a class="detail-topbar__back" href="${createHomeHref()}">${escapeHtml(ui.detailBack)}</a>
      </header>

      <section class="detail-header">
        <div class="detail-header__copy">
          <p class="detail-panel__eyebrow">${escapeHtml(experience.artist)}</p>
          <h1 class="detail-header__title">${escapeHtml(experience.album)}</h1>
          <p class="detail-header__meta">
            ${experience.year ? `${escapeHtml(experience.year)} · ` : ""}${escapeHtml(
              ui.trackCountLabel(experience.trackCount),
            )}
          </p>
        </div>
        <div class="detail-header__chips">
          <span class="orbit-type-badge orbit-type-badge--${experience.releaseType}">
            ${escapeHtml(getReleaseTypeLabel(experience.releaseType))}
          </span>
          <span class="orbit-type-badge orbit-type-badge--${experience.availability}">
            ${escapeHtml(getAvailabilityLabel(experience.availability))}
          </span>
          <span class="orbit-type-badge orbit-type-badge--device-${experience.deviceSupport}">
            ${escapeHtml(getDeviceSupportLabel(experience.deviceSupport))}
          </span>
        </div>
      </section>

      <section class="detail-stage">
        <div class="detail-stage__art">
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
          <div class="detail-stage__art-stack">
            <div class="detail-stage__card">
              <img
                src="${escapeAttribute(experience.cover)}"
                alt="${escapeAttribute(`${experience.artist} - ${experience.album}`)}"
                loading="eager"
                decoding="async"
              />
            </div>
            ${renderLibraryEngagementBar("detail")}
          </div>
          <div class="detail-stage__orbit detail-stage__orbit--outer" aria-hidden="true"></div>
          <div class="detail-stage__orbit detail-stage__orbit--inner" aria-hidden="true"></div>
        </div>

        <article class="detail-panel detail-panel--experience-hero">
          <p class="detail-panel__eyebrow">${escapeHtml(ui.detailSections.experience)}</p>
          ${
            isLiveWorld
              ? `<h2 class="detail-stage__title">${escapeHtml(experience.worldLabel)}</h2>`
              : ""
          }
          ${
            isLiveWorld && experience.detailHeadline
              ? `<p class="detail-stage__lead">${escapeHtml(experience.detailHeadline)}</p>`
              : ""
          }
          ${
            isLiveWorld && experience.experienceSummary
              ? `<p class="detail-panel__text">${escapeHtml(experience.experienceSummary)}</p>`
              : ""
          }

          <div class="detail-stage__actions">
            ${worldAction}
            ${cartAction}
            ${artistAction}
          </div>
        </article>
      </section>

      <section class="detail-panels detail-panels--library">
        <article class="detail-panel">
          <p class="detail-panel__eyebrow">${escapeHtml(ui.detailSections.album)}</p>
          <p class="detail-panel__text">${escapeHtml(experience.albumSummary)}</p>
          <ul class="detail-panel__list detail-panel__list--facts">${albumFacts}</ul>
        </article>

        <article class="detail-panel detail-panel--tracks">
          <p class="detail-panel__eyebrow">${escapeHtml(ui.detailSections.tracks)}</p>
          <ol class="detail-panel__tracks">${trackList}</ol>
        </article>
      </section>

      ${renderLibraryFooter()}
    </div>

    <div class="mobile-world-gate" data-mobile-world-gate hidden>
      <button class="mobile-world-gate__backdrop" type="button" data-mobile-world-gate-dismiss aria-label="${escapeAttribute(ui.mobileWorldGate.dismiss)}"></button>
      <section
        class="mobile-world-gate__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-world-gate-title"
        aria-describedby="mobile-world-gate-description"
      >
        <p class="mobile-world-gate__eyebrow">${escapeHtml(ui.mobileWorldGate.eyebrow)}</p>
        <h2 id="mobile-world-gate-title">${escapeHtml(ui.mobileWorldGate.title)}</h2>
        <p id="mobile-world-gate-description">${escapeHtml(ui.mobileWorldGate.description)}</p>
        <button class="mobile-world-gate__dismiss" type="button" data-mobile-world-gate-dismiss>
          ${escapeHtml(ui.mobileWorldGate.dismiss)}
        </button>
      </section>
    </div>
  `;

  root.appendChild(shell);

  const portraitToast =
    shell.querySelector<HTMLElement>("[data-portrait-toast]");
  const worldLaunch =
    shell.querySelector<HTMLAnchorElement>("[data-world-launch]");
  const mobileWorldGate =
    shell.querySelector<HTMLElement>("[data-mobile-world-gate]");
  const mobileWorldGateDismissButtons =
    shell.querySelectorAll<HTMLButtonElement>("[data-mobile-world-gate-dismiss]");
  const mobileWorldGateFocusTarget =
    shell.querySelector<HTMLButtonElement>(".mobile-world-gate__dismiss");
  let portraitToastInterval = 0;
  let portraitToastHideTimeout = 0;
  let bodyOverflowBeforeGate = "";

  const isMobileWorldDevice = () => {
    const hasCoarsePointer =
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(any-pointer: coarse)").matches;

    return hasCoarsePointer || (navigator.maxTouchPoints > 0 && window.innerWidth <= 1180);
  };

  const setMobileWorldGateVisible = (visible: boolean) => {
    if (!mobileWorldGate) {
      return;
    }

    mobileWorldGate.hidden = !visible;
    mobileWorldGate.setAttribute("aria-hidden", visible ? "false" : "true");
    if (visible) {
      bodyOverflowBeforeGate = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.requestAnimationFrame(() => mobileWorldGateFocusTarget?.focus());
      return;
    }

    document.body.style.overflow = bodyOverflowBeforeGate;
    worldLaunch?.focus();
  };

  const onWorldLaunch = (event: MouseEvent) => {
    if (experience.deviceSupport !== "desktop" || !isMobileWorldDevice()) {
      return;
    }

    event.preventDefault();
    setMobileWorldGateVisible(true);
  };

  const onMobileWorldGateDismiss = () => {
    setMobileWorldGateVisible(false);
  };

  const onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && mobileWorldGate && !mobileWorldGate.hidden) {
      event.preventDefault();
      setMobileWorldGateVisible(false);
    }
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
    }, DETAIL_PORTRAIT_HINT_VISIBLE_MS);
  };

  const syncPortraitToastLoop = () => {
    stopPortraitToastLoop();

    if (!shouldShowPortraitToast()) {
      return;
    }

    flashPortraitToast();
    portraitToastInterval = window.setInterval(
      flashPortraitToast,
      DETAIL_PORTRAIT_HINT_INTERVAL_MS,
    );
  };

  const onResize = () => {
    syncPortraitToastLoop();
  };

  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
  worldLaunch?.addEventListener("click", onWorldLaunch);
  mobileWorldGateDismissButtons.forEach((button) => {
    button.addEventListener("click", onMobileWorldGateDismiss);
  });
  document.addEventListener("keydown", onDocumentKeyDown);
  syncPortraitToastLoop();

  return () => {
    stopPortraitToastLoop();
    if (mobileWorldGate && !mobileWorldGate.hidden) {
      document.body.style.overflow = bodyOverflowBeforeGate;
    }
    window.removeEventListener("resize", onResize);
    window.removeEventListener("orientationchange", onResize);
    worldLaunch?.removeEventListener("click", onWorldLaunch);
    mobileWorldGateDismissButtons.forEach((button) => {
      button.removeEventListener("click", onMobileWorldGateDismiss);
    });
    document.removeEventListener("keydown", onDocumentKeyDown);
  };
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
