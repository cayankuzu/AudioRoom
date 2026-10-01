import { findAlbum, rememberActive, rememberedActive } from "./albums";
import { renderDetail } from "./detail";
import { renderHome, type HomeState } from "./home";
import { renderNotFound, renderPrivacy } from "./pages";

/** Hash yönlendirme: "#/" kütüphane, "#/album/<id>" albüm sayfası, "#/gizlilik"; gerisi "bulunamadı". */
export function bootHub(root: HTMLElement): void {
  const state: HomeState = { active: rememberedActive(), query: "", status: "all", artist: null };
  let cleanup: (() => void) | null = null;

  const render = () => {
    cleanup?.();
    const [, section, id] = window.location.hash.replace(/^#\/?/, "#/").split("/");
    const album = section === "album" && id ? findAlbum(decodeURIComponent(id)) : undefined;
    if (album) {
      state.active = album.id;
      rememberActive(album.id);
      cleanup = renderDetail(root, album, render);
    } else if (section === "gizlilik") {
      cleanup = renderPrivacy(root);
    } else if (section) {
      cleanup = renderNotFound(root);
    } else {
      cleanup = renderHome(root, state, render);
    }
  };

  window.addEventListener("hashchange", render);
  window.addEventListener("pageshow", (event) => {
    // Evrenden geri dönüldüğünde ilerleme rozetleri güncel olsun.
    if (event.persisted) render();
  });
  render();
}
