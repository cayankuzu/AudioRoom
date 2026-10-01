import type { PromptLine } from "../game/interaction";
import { el, keycap } from "./dom";

export interface Hud {
  readonly root: HTMLElement;
  setPrompt(lines: PromptLine[] | null): void;
  /** Büyük başlık (ör. parça adı) + kısa alt satır. */
  caption(title: string, line: string, seconds?: number): void;
  /** Üst ortada kısa yönlendirme metni. */
  hint(text: string, seconds?: number): void;
  setProgress(found: number, total: number): void;
  /** Senkron şarkı sözü satırı (lisanslı .lrc varsa); null: söz alanını kapatır. */
  lyric(text: string | null): void;
  /** Gizli keşif kartı (sağ üstte). */
  secret(title: string, text: string, count: number, total: number): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

/**
 * keyNames: dokunmatikte tuş yerine düğme adı göstermek için (ör. E → "Etkileşim").
 */
export function createHud(
  parent: HTMLElement,
  title: { artist: string; album: string },
  keyNames: Record<string, string> = {},
): Hud {
  const root = el("div", "ar-hud");
  const crosshair = el("div", "ar-crosshair");
  const prompt = el("div", "ar-prompt");
  const captionBox = el("div", "ar-caption");
  const captionTitle = el("strong", "ar-caption__title");
  const captionLine = el("span", "ar-caption__line");
  captionBox.append(captionTitle, captionLine);
  const hintBox = el("div", "ar-hint");
  hintBox.setAttribute("role", "status");
  hintBox.setAttribute("aria-live", "polite");

  const chip = el("div", "ar-chip");
  const chipTitle = el("div", "ar-chip__title");
  chipTitle.append(el("span", "ar-chip__artist", title.artist), el("span", "ar-chip__album", title.album));
  const chipProgress = el("div", "ar-chip__progress");
  const chipDots = el("div", "ar-chip__dots");
  const chipCount = el("span", "ar-chip__count");
  chipProgress.append(chipDots, chipCount);
  chip.append(chipTitle, chipProgress);

  const lyricLine = el("p", "ar-lyric");
  const secretCard = el("div", "ar-secret");
  secretCard.setAttribute("role", "status");
  const secretKicker = el("span", "ar-secret__kicker");
  const secretTitle = el("strong", "ar-secret__title");
  const secretText = el("span", "ar-secret__text");
  secretCard.append(secretKicker, secretTitle, secretText);

  root.append(chip, crosshair, prompt, captionBox, hintBox, lyricLine, secretCard);
  parent.appendChild(root);

  let captionTimer = 0;
  let hintTimer = 0;
  let secretTimer = 0;
  let lastPrompt = "";
  // Metindeki tek harfli tuş adları (ör. "E ile") dokunmatikte düğme adına çevrilir.
  const localize = (text: string) =>
    Object.entries(keyNames).reduce((out, [key, name]) => out.replace(new RegExp(String.raw`(^|\s)${key}(?=\s)`, "g"), `$1“${name}”`), text);

  return {
    root,
    setPrompt(lines) {
      const signature = lines ? lines.map((line) => line.key + line.label).join("|") : "";
      if (signature === lastPrompt) return;
      lastPrompt = signature;
      prompt.replaceChildren(
        ...(lines ?? []).map((line) => {
          const row = el("div", "ar-prompt__row");
          if (line.key) row.append(keycap(keyNames[line.key] ?? line.key));
          row.append(el("span", "", line.label));
          return row;
        }),
      );
      prompt.classList.toggle("is-visible", Boolean(lines?.length));
      crosshair.classList.toggle("is-active", Boolean(lines?.length));
    },
    caption(titleText, line, seconds = 6) {
      captionTitle.textContent = titleText;
      captionLine.textContent = line;
      captionBox.classList.remove("is-visible");
      void captionBox.offsetWidth;
      captionBox.classList.add("is-visible");
      window.clearTimeout(captionTimer);
      captionTimer = window.setTimeout(() => captionBox.classList.remove("is-visible"), seconds * 1000);
    },
    hint(text, seconds = 5) {
      window.clearTimeout(hintTimer);
      // Boş metin: mevcut ipucunu hemen kaldırır (ör. plak gramofona takılınca).
      if (!text) return void hintBox.classList.remove("is-visible");
      hintBox.textContent = localize(text);
      hintBox.classList.add("is-visible");
      hintTimer = window.setTimeout(() => hintBox.classList.remove("is-visible"), seconds * 1000);
    },
    secret(title, text, count, total) {
      secretKicker.textContent = `Gizli keşif · ${count} / ${total}`;
      secretTitle.textContent = title;
      secretText.textContent = text;
      secretCard.classList.remove("is-visible");
      void secretCard.offsetWidth;
      secretCard.classList.add("is-visible");
      window.clearTimeout(secretTimer);
      secretTimer = window.setTimeout(() => secretCard.classList.remove("is-visible"), 8000);
    },
    setProgress(found, total) {
      if (chipDots.childElementCount !== total) {
        chipDots.replaceChildren(...Array.from({ length: total }, () => el("i")));
      }
      Array.from(chipDots.children).forEach((dot, index) => dot.classList.toggle("is-on", index < found));
      chipCount.textContent = total === 1 ? (found ? "Dinlendi" : "Tek parça") : `${found} / ${total}`;
    },
    lyric(text) {
      if (text === null) return void lyricLine.classList.remove("is-visible");
      lyricLine.textContent = text;
      lyricLine.classList.toggle("is-visible", text.length > 0);
    },
    setVisible(visible) {
      root.classList.toggle("is-hidden", !visible);
    },
    dispose() {
      window.clearTimeout(captionTimer);
      window.clearTimeout(hintTimer);
      window.clearTimeout(secretTimer);
      root.remove();
    },
  };
}
