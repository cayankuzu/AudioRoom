import { normalizeSearch } from "../features/library/search";
import { getLibraryLocale } from "../i18n";
import { LIBRARY_ENTRY_METADATA } from "./library.data";
import type {
  LibraryEntryCopy,
  LibraryExperience,
  LibraryTrack,
} from "./library.types";

export type {
  LibraryAvailability,
  LibraryDeviceSupport,
  LibraryEntryCopy,
  LibraryEntryMetadata,
  LibraryExperience,
  LibraryReleaseType,
  LibraryTheme,
  LibraryTrack,
} from "./library.types";

const libraryLocale = getLibraryLocale();

function createSearchIndex(parts: readonly string[]): string {
  return normalizeSearch(parts.join(" "));
}

function createYoutubeSearchUrl(
  artist: string,
  title: string,
  album?: string,
): string {
  const query = [artist, title, album, "youtube"].filter(Boolean).join(" ");

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    query,
  )}`;
}

function createTracks(
  artist: string,
  album: string,
  titles: readonly string[],
  directUrls: Partial<Record<string, string>> = {},
): readonly LibraryTrack[] {
  return titles.map((title) => ({
    title,
    youtubeUrl: directUrls[title] ?? createYoutubeSearchUrl(artist, title, album),
  }));
}

function createSearchPartsFromTracks(
  tracks: readonly LibraryTrack[],
): readonly string[] {
  return tracks.map((track) => track.title);
}

function getEntryCopy(entryId: string): LibraryEntryCopy {
  const entryCopy = libraryLocale.entries[entryId];

  if (!entryCopy) {
    throw new Error(`Missing localized copy for library entry: ${entryId}`);
  }

  return entryCopy;
}

export const LIBRARY_EXPERIENCES: readonly LibraryExperience[] =
  LIBRARY_ENTRY_METADATA.map((entry) => {
    const copy = getEntryCopy(entry.id);
    const tracks = createTracks(
      entry.artist,
      entry.album,
      entry.trackTitles,
      entry.directTrackUrls,
    );

    return {
      id: entry.id,
      artist: entry.artist,
      artistUrl: entry.artistUrl,
      album: entry.album,
      year: entry.year,
      cover: entry.cover,
      path: entry.path,
      releaseType: entry.releaseType,
      availability: entry.availability,
      deviceSupport: entry.deviceSupport,
      worldLabel: copy.worldLabel,
      detailHeadline: copy.detailHeadline,
      albumSummary: copy.albumSummary,
      experienceSummary: copy.experienceSummary,
      detailNarrative: copy.detailNarrative,
      albumFacts: copy.albumFacts,
      tracks,
      trackCount: tracks.length,
      theme: entry.theme,
      searchIndex: createSearchIndex([
        entry.artist,
        entry.album,
        entry.year ?? "",
        entry.releaseType,
        libraryLocale.releaseTypeLabels[entry.releaseType],
        libraryLocale.availabilityLabels[entry.availability],
        libraryLocale.deviceSupportLabels[entry.deviceSupport],
        copy.worldLabel,
        copy.detailHeadline,
        copy.albumSummary,
        copy.experienceSummary,
        copy.detailNarrative,
        ...copy.albumFacts,
        ...createSearchPartsFromTracks(tracks),
        ...(copy.searchTerms ?? []),
      ]),
    };
  });

export const LIBRARY_STATS = {
  artists: new Set(
    LIBRARY_EXPERIENCES.filter(
      (experience) => experience.availability === "available",
    ).map((experience) => experience.artist),
  ).size,
  worlds: LIBRARY_EXPERIENCES.filter(
    (experience) => experience.availability === "available",
  ).length,
  tracks: LIBRARY_EXPERIENCES.reduce(
    (total, experience) => total + experience.trackCount,
    0,
  ),
} as const;

export function getLibraryExperienceById(
  id: string,
): LibraryExperience | undefined {
  return LIBRARY_EXPERIENCES.find((experience) => experience.id === id);
}
