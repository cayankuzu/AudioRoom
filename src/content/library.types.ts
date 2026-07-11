export type LibraryReleaseType = "album" | "single" | "ep";

export type LibraryAvailability = "available" | "soon";

export interface LibraryTheme {
  accent: string;
  aura: string;
  foil: string;
  glowTopRight: string;
  glowBottomLeft: string;
}

export interface LibraryTrack {
  title: string;
  youtubeUrl: string;
}

export interface LibraryExperience {
  id: string;
  artist: string;
  artistUrl?: string;
  album: string;
  year?: string;
  cover: string;
  path?: string;
  releaseType: LibraryReleaseType;
  availability: LibraryAvailability;
  worldLabel: string;
  detailHeadline: string;
  albumSummary: string;
  experienceSummary: string;
  detailNarrative: string;
  albumFacts: readonly string[];
  tracks: readonly LibraryTrack[];
  trackCount: number;
  theme: LibraryTheme;
  searchIndex: string;
}

export interface LibraryEntryMetadata {
  id: string;
  artist: string;
  artistUrl?: string;
  album: string;
  year?: string;
  cover: string;
  path?: string;
  releaseType: LibraryReleaseType;
  availability: LibraryAvailability;
  theme: LibraryTheme;
  trackTitles: readonly string[];
  directTrackUrls?: Partial<Record<string, string>>;
}

export interface LibraryEntryCopy {
  worldLabel: string;
  detailHeadline: string;
  albumSummary: string;
  experienceSummary: string;
  detailNarrative: string;
  albumFacts: readonly string[];
  searchTerms?: readonly string[];
}
