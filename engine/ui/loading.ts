import type { WorldMeta } from "../world";
import { el } from "./dom";

export interface Loading {
  progress(ratio: number): void;
  done(): void;
}

export function createLoading(parent: HTMLElement, meta: WorldMeta, coverUrl: string): Loading {
  const root = el("div", "ar-loading");
  root.style.setProperty("--ar-cover", `url("${coverUrl}")`);
  const card = el("div", "ar-loading__card");
  const artist = el("span", "ar-loading__artist", meta.artist);
  const album = el("strong", "ar-loading__album", meta.album);
  const bar = el("div", "ar-loading__bar");
  const fill = el("i");
  bar.appendChild(fill);
  const note = el("span", "ar-loading__note", "Evren hazırlanıyor");
  card.append(artist, album, bar, note);
  root.appendChild(card);
  root.setAttribute("role", "progressbar");
  root.setAttribute("aria-label", `${meta.album} yükleniyor`);
  parent.appendChild(root);

  let shown = 0;
  return {
    progress(ratio) {
      shown = Math.max(shown, Math.min(1, ratio));
      fill.style.transform = `scaleX(${shown})`;
      root.setAttribute("aria-valuenow", String(Math.round(shown * 100)));
    },
    done() {
      fill.style.transform = "scaleX(1)";
      root.classList.add("is-done");
      window.setTimeout(() => root.remove(), 900);
    },
  };
}
