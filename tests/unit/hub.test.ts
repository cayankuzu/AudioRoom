import { beforeEach, describe, expect, it } from "vitest";
import { ALBUMS, findAlbum, normalize } from "../../src/hub/albums";
import { matches, type HomeState } from "../../src/hub/home";
import { loadProgress, saveProgress, loadSettings, DEFAULT_SETTINGS } from "../../engine/core/storage";

const state = (patch: Partial<HomeState> = {}): HomeState => ({ active: "", query: "", status: "all", artist: null, ...patch });
const search = (query: string) => ALBUMS.filter((album) => matches(album, state({ query }))).map((album) => album.id);

describe("arama", () => {
  it("Türkçe karakterleri sadeleştirir", () => {
    expect(normalize("Kuantum Dolanıklık İŞĞÜÖÇ")).toBe("kuantum dolaniklik isguoc");
  });
  it("albüm, sanatçı ve parça adıyla bulur", () => {
    expect(search("dolaniklik")).toEqual(["kuantum-dolaniklik"]);
    expect(search("Dolanıklığı")).toEqual(["kuantum-dolaniklik"]);
    expect(search("sextronot")).toEqual(["mukemmel-bosluk"]);
    expect(search("hayko")).toEqual(["beni-buyuten-sarkilar-vol-1"]);
    expect(search("olmayan bir şey")).toEqual([]);
  });
  it("durum ve sanatçı filtreleri", () => {
    expect(ALBUMS.filter((album) => matches(album, state({ status: "soon" })))).toHaveLength(2);
    expect(ALBUMS.filter((album) => matches(album, state({ artist: "Henry the Lee" })))).toHaveLength(2);
  });
  it("kimlikle albüm bulur", () => {
    expect(findAlbum("mukemmel-bosluk")?.album).toBe("Mükemmel Boşluk");
    expect(findAlbum("yok")).toBeUndefined();
  });
});

describe("kalıcı depolama", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    Object.assign(globalThis, {
      window: {
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => void store.set(key, value),
          removeItem: (key: string) => void store.delete(key),
        },
      },
    });
  });
  it("ilerlemeyi kaydeder ve okur", () => {
    saveProgress("test", { found: ["a", "b"], completed: false, secrets: ["x"] });
    expect(loadProgress("test")).toEqual({ found: ["a", "b"], completed: false, secrets: ["x"] });
  });
  it("bozuk kayıtta varsayılana döner", () => {
    (globalThis as unknown as { window: { localStorage: Storage } }).window.localStorage.setItem("audioroom.settings.v1", "{bozuk");
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});

describe("sürümler", () => {
  it("oynanabilir her albümün iki sürümü de seçicide ve diskte var", async () => {
    const { versionsOf } = await import("../../src/hub/versions");
    const { existsSync } = await import("node:fs");
    const playable = ALBUMS.filter((album) => album.available && album.path);
    expect(playable.length).toBe(4);
    for (const album of playable) {
      const versions = versionsOf(album.id);
      // Albüm kimliği sürüm listesindeki anahtarla birebir eşleşmeli (yoksa seçici açılmaz, eski sürüme girilemez).
      expect(versions.map((version) => version.number), album.id).toEqual([2, 1]);
      for (const version of versions) {
        expect(existsSync(`${decodeURI(version.href)}index.html`), version.href).toBe(true);
        for (const preview of version.previews) expect(existsSync(`public/${preview}`), preview).toBe(true);
      }
    }
  });
});

describe("telefon erişimi", () => {
  it("telefonda yalnızca Mükemmel Boşluk Sürüm 1 açılır", async () => {
    const { VERSIONS } = await import("../../src/hub/versions");
    const open = Object.entries(VERSIONS).flatMap(([id, versions]) => versions.filter((version) => version.phone !== "none").map((version) => `${id}@${version.number}`));
    expect(open).toEqual(["mukemmel-bosluk@1"]);
  });
});
