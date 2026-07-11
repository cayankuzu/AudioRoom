export type LibraryRoute =
  | { kind: "home" }
  | { kind: "album"; albumId: string };

export function getLibraryRoute(): LibraryRoute {
  if (typeof window === "undefined") {
    return { kind: "home" };
  }

  const hash = window.location.hash.trim();

  if (!hash || hash === "#" || hash === "#/") {
    return { kind: "home" };
  }

  const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
  const parts = normalized.split("/").filter(Boolean);

  if (parts[0] === "album" && parts[1]) {
    return { kind: "album", albumId: decodeURIComponent(parts[1]) };
  }

  return { kind: "home" };
}

export function createAlbumHref(albumId: string): string {
  return `#/album/${encodeURIComponent(albumId)}`;
}

export function createHomeHref(): string {
  return "#/";
}
