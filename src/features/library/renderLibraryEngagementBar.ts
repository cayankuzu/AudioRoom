import { getLibraryLocale } from "../../i18n";

const libraryLocale = getLibraryLocale();

type EngagementMetricKey = "likes" | "comments" | "shares" | "rating";
type EngagementBarVariant = "card" | "detail";

const METRICS: readonly EngagementMetricKey[] = [
  "likes",
  "comments",
  "shares",
  "rating",
];
const METRIC_VALUES: Record<EngagementMetricKey, string> = {
  likes: "0",
  comments: "0",
  shares: "0",
  rating: "0/5",
};

export function renderLibraryEngagementBar(
  variant: EngagementBarVariant = "detail",
): string {
  const ui = libraryLocale.ui;
  const isCompact = variant === "card";

  return `
    <section class="library-engagement-bar library-engagement-bar--${variant}">
      <div class="library-engagement-bar__head">
        ${
          isCompact
            ? ""
            : `<p class="library-engagement-bar__title">${escapeHtml(ui.engagement.title)}</p>`
        }
        <span class="orbit-type-badge orbit-type-badge--soon">
          ${escapeHtml(ui.actions.comingSoon)}
        </span>
      </div>
      <div class="library-engagement-bar__grid">
        ${METRICS.map((metric) => {
          const label = ui.engagement[metric];
          const value = METRIC_VALUES[metric];

          return `
            <article
              class="library-engagement-bar__item"
              aria-label="${escapeHtml(`${label}: ${value}`)}"
            >
              <div class="library-engagement-bar__item-top">
                <span class="library-engagement-bar__icon" aria-hidden="true">
                  ${renderEngagementIcon(metric)}
                </span>
                <strong>${escapeHtml(value)}</strong>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderEngagementIcon(metric: EngagementMetricKey): string {
  switch (metric) {
    case "likes":
      return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 20.4L10.55 19.08C5.4 14.42 2 11.35 2 7.6C2 4.53 4.42 2.2 7.5 2.2C9.24 2.2 10.91 3.01 12 4.28C13.09 3.01 14.76 2.2 16.5 2.2C19.58 2.2 22 4.53 22 7.6C22 11.35 18.6 14.42 13.45 19.09L12 20.4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
        </svg>
      `;
    case "comments":
      return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 18.5L5.8 15.7C4.67 14.57 4 13.12 4 11.5C4 7.63 7.58 4.5 12 4.5C16.42 4.5 20 7.63 20 11.5C20 15.37 16.42 18.5 12 18.5H5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
        </svg>
      `;
    case "shares":
      return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14 5L19 5L19 10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M10 14L19 5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M19 14V17.5C19 18.88 17.88 20 16.5 20H6.5C5.12 20 4 18.88 4 17.5V7.5C4 6.12 5.12 5 6.5 5H10" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
      `;
    default:
      return `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3.6L14.63 8.93L20.5 9.78L16.25 13.92L17.25 19.75L12 16.99L6.75 19.75L7.75 13.92L3.5 9.78L9.37 8.93L12 3.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
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
