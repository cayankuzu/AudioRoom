import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALBUM as HAYKO } from "../../worlds/beni-buyuten-sarkilar/album";
import { ALBUM as KLOSTRO } from "../../worlds/klostrofobik-kaplumbaga/album";
import { ALBUM as KUANTUM } from "../../worlds/kuantum-dolaniklik/album";
import { ALBUM as REDD } from "../../worlds/mukemmel-bosluk/album";
import { ALBUMS } from "../../src/hub/albums";

const WORLDS = [REDD, HAYKO, KUANTUM, KLOSTRO];

describe("albüm verisi", () => {
  it.each(WORLDS.map((album) => [album.meta.album, album] as const))("%s tutarlı", (_name, album) => {
    const ids = album.tracks.map((track) => track.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(album.tracks.map((track) => track.order)).toEqual(album.tracks.map((_, i) => i + 1));
    for (const track of album.tracks) {
      expect(track.videoId).toMatch(/^[\w-]{11}$/);
      expect(track.mood.length).toBeGreaterThan(10);
    }
    for (const id of album.demoTracks ?? []) expect(ids).toContain(id);
    expect(existsSync(`public/${album.meta.cover}`)).toBe(true);
    expect(existsSync(`public/fonts/${album.meta.font3d}.typeface.json`)).toBe(true);
    expect(existsSync(`${album.hub.path}index.html`)).toBe(true);
  });

  it("aynı YouTube videosu iki parçaya atanmamış", () => {
    const videos = WORLDS.flatMap((album) => album.tracks.map((track) => track.videoId));
    expect(new Set(videos).size).toBe(videos.length);
  });

  it("yalnızca Mükemmel Boşluk telefonda açılır", () => {
    expect(WORLDS.filter((album) => album.device === "mobile-demo").map((album) => album.meta.id)).toEqual(["mukemmel-bosluk"]);
  });

  it("hub rafında 4 yayında + 2 yakında albüm var", () => {
    expect(ALBUMS.filter((album) => album.available)).toHaveLength(4);
    expect(ALBUMS.filter((album) => !album.available)).toHaveLength(2);
    for (const album of ALBUMS) expect(existsSync(`public/${album.cover}`)).toBe(true);
  });
});
