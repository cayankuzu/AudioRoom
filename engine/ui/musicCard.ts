import type { Music, MusicState } from "../audio/music";
import { youtubeUrl } from "../audio/music";
import type { Track } from "../world";
import { button, el } from "./dom";

export interface MusicCard {
  /** YouTube oynatıcısının yerleştiği kutu. */
  readonly videoHost: HTMLElement;
  bind(music: Music): void;
  setCollection(tracks: readonly Track[], found: ReadonlySet<string>): void;
  onReplay(fn: (track: Track) => void): void;
  /** Klip düğmeleri: klip açık mı, sinema kamerası açık mı, bu şarkının klibi var mı. */
  setClip(state: { on: boolean; cinema: boolean; available: boolean }): void;
  onClip(fn: (action: "toggle" | "cinema") => void): void;
  dispose(): void;
}

const STATE_LABEL: Record<MusicState, string> = {
  idle: "",
  loading: "Yükleniyor…",
  playing: "Çalıyor",
  paused: "Duraklatıldı",
  ended: "Plak bitti · R ile yeniden çal",
  blocked: "Tarayıcı sesi bekletti · R veya ▶",
  error: "Bu video burada oynatılamıyor",
};

export function createMusicCard(parent: HTMLElement, totalTracks: number): MusicCard {
  const root = el("section", "ar-music");
  root.setAttribute("aria-label", "Gramofon — şimdi çalan");
  const head = el("header", "ar-music__head");
  const kicker = el("span", "ar-music__kicker", "Gramofonda");
  const title = el("strong", "ar-music__title");
  const status = el("span", "ar-music__status");
  head.append(kicker, title, status);

  const videoHost = el("div", "ar-music__video");
  const playOverlay = button("ar-music__overlay", "▶ Çal", () => music?.resume());
  videoHost.appendChild(playOverlay);

  const controls = el("div", "ar-music__controls");
  const toggle = button("ar-music__btn", "❚❚", () => music?.toggle());
  toggle.setAttribute("aria-label", "Çal / duraklat (R)");
  const link = el("a", "ar-music__link", "YouTube'da aç ↗");
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const collectionToggle = button("ar-music__btn ar-music__btn--text", "Koleksiyon", () => {
    list.hidden = !list.hidden;
    collectionToggle.setAttribute("aria-expanded", String(!list.hidden));
  });
  collectionToggle.setAttribute("aria-expanded", "false");
  controls.append(toggle, link, collectionToggle);
  const list = el("ol", "ar-music__list");
  list.hidden = true;

  // Klip: şarkının sinematik sahnesi. "Klibi izle" sinema kamerasını açar; "Klibi kapat" evreni kapağa döndürür.
  let clipHandler: ((action: "toggle" | "cinema") => void) | null = null;
  const clipRow = el("div", "ar-music__clip");
  const watch = button("ar-music__chip", "", () => clipHandler?.("cinema"));
  const clipToggle = button("ar-music__chip", "", () => clipHandler?.("toggle"));
  clipRow.append(watch, clipToggle);

  root.append(head, videoHost, controls, clipRow, list);
  parent.appendChild(root);

  let music: Music | null = null;
  let replay: ((track: Track) => void) | null = null;

  const render = (state: MusicState, track: Track | null) => {
    root.classList.toggle("is-visible", Boolean(track));
    if (!track) return;
    title.textContent = track.title;
    kicker.textContent = totalTracks > 1 ? `Gramofonda · ${String(track.order).padStart(2, "0")}` : "Gramofonda";
    status.textContent = STATE_LABEL[state];
    toggle.textContent = state === "playing" || state === "loading" ? "❚❚" : "▶";
    link.href = youtubeUrl(track.videoId);
    playOverlay.hidden = state !== "blocked";
    root.dataset.state = state;
  };

  return {
    videoHost,
    bind(next) {
      music = next;
      next.onChange(render);
    },
    setCollection(tracks, found) {
      list.replaceChildren(
        ...tracks
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((track) => {
            const item = el("li", "ar-music__item");
            if (found.has(track.id)) {
              item.appendChild(
                button("ar-music__replay", `${String(track.order).padStart(2, "0")}  ${track.title}`, () => replay?.(track)),
              );
            } else {
              item.classList.add("is-locked");
              item.textContent = `${String(track.order).padStart(2, "0")}  Henüz bulunmadı`;
            }
            return item;
          }),
      );
    },
    setClip(state) {
      clipRow.hidden = !state.available;
      watch.hidden = !state.on;
      watch.replaceChildren(el("kbd", "ar-key", "V"), el("span", "", state.cinema ? "Serbest dolaş" : "Klibi izle"));
      watch.setAttribute("aria-pressed", String(state.cinema));
      clipToggle.replaceChildren(el("kbd", "ar-key", "K"), el("span", "", state.on ? "Klibi kapat" : "Klibi aç"));
      clipToggle.setAttribute("aria-pressed", String(!state.on));
    },
    onClip(fn) {
      clipHandler = fn;
    },
    onReplay(fn) {
      replay = fn;
    },
    dispose() {
      root.remove();
    },
  };
}
