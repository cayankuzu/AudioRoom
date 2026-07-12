import { type LibraryExperience } from "../../content/library";
import { getLibraryLocale } from "../../i18n";
import {
  getAvailabilityLabel,
  getReleaseTypeLabel,
} from "./catalog";
import { renderLibraryEngagementBar } from "./renderLibraryEngagementBar";
import { renderLibraryFooter } from "./renderLibraryFooter";
import { createHomeHref } from "./router";

const libraryLocale = getLibraryLocale();

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
        <a class="detail-hero__cta detail-hero__cta--primary" href="${escapeAttribute(experience.path ?? "")}">
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
        </div>
      </section>

      <section class="detail-stage">
        <div class="detail-stage__art">
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
  `;

  root.appendChild(shell);
  return () => undefined;
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
