import type {
  LibraryAvailability,
  LibraryEntryCopy,
  LibraryReleaseType,
} from "../content/library.types";

export type SupportedLocale = "tr";

export interface LibraryUiCopy {
  brandTitle: string;
  brandSubtitle: string;
  brandAriaLabel: string;
  orbitAriaLabel: string;
  profileTitle: string;
  profileStatus: string;
  profilePopover: string;
  searchPlaceholder: string;
  mobileHints: {
    orientationTitle: string;
    orientationDescription: string;
  };
  engagement: {
    title: string;
    likes: string;
    comments: string;
    shares: string;
    rating: string;
  };
  filterButton: string;
  filterPanelEyebrow: string;
  filterPanelTitle: string;
  filterClear: string;
  emptyResultsTitle: string;
  emptyResultsWithFilters: string;
  emptyResultsWithoutFilters: string;
  selectedCount(count: number): string;
  artistSummaryDefault: string;
  albumSummaryDefault: string;
  formatSummaryDefault: string;
  availabilitySummaryDefault: string;
  filterSections: {
    artists: string;
    albums: string;
    formats: string;
    availability: string;
  };
  detailBack: string;
  detailSections: {
    experience: string;
    album: string;
    tracks: string;
  };
  actions: {
    enterWorld: string;
    comingSoon: string;
    addToCart: string;
    randomize: string;
    randomizing: string;
  };
  instagramLabel(artist: string): string;
  trackCountLabel(count: number): string;
  footerCopyright(year: number): string;
  footerPoweredBy: string;
}

export interface LibraryLocaleBundle {
  ui: LibraryUiCopy;
  releaseTypeLabels: Record<LibraryReleaseType, string>;
  availabilityLabels: Record<LibraryAvailability, string>;
  entries: Record<string, LibraryEntryCopy>;
}
