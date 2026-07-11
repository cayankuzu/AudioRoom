import {
  LIBRARY_EXPERIENCES,
  type LibraryAvailability,
  type LibraryExperience,
  type LibraryReleaseType,
} from "../../content/library";
import { getLibraryLocale } from "../../i18n";
import { normalizeSearch } from "./search";

const libraryLocale = getLibraryLocale();

export interface LibraryFilters {
  artists: string[];
  albums: string[];
  releaseTypes: LibraryReleaseType[];
  availability: LibraryAvailability[];
}

export interface ArtistFilterOption {
  artist: string;
  albums: string[];
  summary: string;
}

export interface AlbumFilterOption {
  id: string;
  album: string;
  artist: string;
  releaseType: LibraryReleaseType;
}

export function createEmptyLibraryFilters(): LibraryFilters {
  return {
    artists: [],
    albums: [],
    releaseTypes: [],
    availability: [],
  };
}

export function hasActiveLibraryFilters(filters: LibraryFilters): boolean {
  return (
    filters.artists.length > 0 ||
    filters.albums.length > 0 ||
    filters.releaseTypes.length > 0 ||
    filters.availability.length > 0
  );
}

export function getReleaseTypeLabel(type: LibraryReleaseType): string {
  return libraryLocale.releaseTypeLabels[type];
}

export function getAvailabilityLabel(status: LibraryAvailability): string {
  return libraryLocale.availabilityLabels[status];
}

export function sortLibraryExperiences(
  experiences: readonly LibraryExperience[] = LIBRARY_EXPERIENCES,
): LibraryExperience[] {
  return [...experiences].sort((left, right) => {
    const artistOrder = left.artist.localeCompare(right.artist, "tr", {
      sensitivity: "base",
    });

    if (artistOrder !== 0) {
      return artistOrder;
    }

    return left.album.localeCompare(right.album, "tr", {
      sensitivity: "base",
    });
  });
}

export function filterLibraryExperiences(
  query: string,
  filters: LibraryFilters,
  experiences: readonly LibraryExperience[] = LIBRARY_EXPERIENCES,
): LibraryExperience[] {
  const sorted = sortLibraryExperiences(experiences);
  const cleanQuery = query.trim();
  const needle = cleanQuery ? normalizeSearch(cleanQuery) : "";

  return sorted.filter((experience) => {
    if (needle && !experience.searchIndex.includes(needle)) {
      return false;
    }

    if (
      filters.artists.length > 0 &&
      !filters.artists.includes(experience.artist)
    ) {
      return false;
    }

    if (filters.albums.length > 0 && !filters.albums.includes(experience.id)) {
      return false;
    }

    if (
      filters.releaseTypes.length > 0 &&
      !filters.releaseTypes.includes(experience.releaseType)
    ) {
      return false;
    }

    if (
      filters.availability.length > 0 &&
      !filters.availability.includes(experience.availability)
    ) {
      return false;
    }

    return true;
  });
}

export function getArtistFilterOptions(
  experiences: readonly LibraryExperience[] = LIBRARY_EXPERIENCES,
): ArtistFilterOption[] {
  const grouped = new Map<string, string[]>();

  sortLibraryExperiences(experiences).forEach((experience) => {
    const existing = grouped.get(experience.artist) ?? [];
    existing.push(experience.album);
    grouped.set(experience.artist, existing);
  });

  return [...grouped.entries()]
    .map(([artist, albums]) => {
      const sortedAlbums = [...albums].sort((left, right) =>
        left.localeCompare(right, "tr", { sensitivity: "base" }),
      );

      return {
        artist,
        albums: sortedAlbums,
        summary: sortedAlbums.join(", "),
      };
    })
    .sort((left, right) =>
      left.artist.localeCompare(right.artist, "tr", { sensitivity: "base" }),
    );
}

export function getAlbumFilterOptions(
  experiences: readonly LibraryExperience[] = LIBRARY_EXPERIENCES,
): AlbumFilterOption[] {
  return [...experiences]
    .map((experience) => ({
      id: experience.id,
      album: experience.album,
      artist: experience.artist,
      releaseType: experience.releaseType,
    }))
    .sort((left, right) => {
      const albumOrder = left.album.localeCompare(right.album, "tr", {
        sensitivity: "base",
      });

      if (albumOrder !== 0) {
        return albumOrder;
      }

      return left.artist.localeCompare(right.artist, "tr", {
        sensitivity: "base",
      });
    });
}

export function toggleFilterValue<T extends string>(
  values: readonly T[],
  value: T,
): T[] {
  if (values.includes(value)) {
    return values.filter((entry) => entry !== value);
  }

  return [...values, value];
}
