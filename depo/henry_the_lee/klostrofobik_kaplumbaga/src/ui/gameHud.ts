export interface GameHud {
  element: HTMLElement;
  setSprint(value: number, sprinting: boolean, exhausted: boolean): void;
  setHitStreak(hits: number, remaining: number, duration: number): void;
  flash(message: string, tone?: "default" | "hit" | "success"): void;
  dispose(): void;
}

export function createGameHud(parent: HTMLElement): GameHud {
  const element = document.createElement("div");
  element.className = "game-ui";
  element.innerHTML = `
    <div class="crosshair" aria-hidden="true">
      <span></span><span></span><i></i>
    </div>
    <div class="hit-streak" data-hit-streak aria-live="polite">
      <div class="hit-streak__head">
        <span>İSABET ZİNCİRİ</span>
        <strong data-hit-count>1 / 6</strong>
        <em data-hit-time>6.0 sn</em>
      </div>
      <div class="hit-streak__track"><i data-hit-fill></i></div>
    </div>
    <div class="sprint-meter" data-sprint aria-label="Koşu enerjisi">
      <div class="sprint-meter__head"><span>HIZLI KOŞU</span><em data-sprint-label>3.0 sn</em></div>
      <div class="sprint-meter__track"><i data-sprint-fill></i></div>
    </div>
    <div class="game-toast" data-toast role="status" aria-live="polite">
      <span data-toast-index>01</span>
      <strong data-toast-message>Hazır</strong>
    </div>
  `;
  parent.appendChild(element);

  const toast = element.querySelector<HTMLElement>("[data-toast]");
  const index = element.querySelector<HTMLElement>("[data-toast-index]");
  const message = element.querySelector<HTMLElement>("[data-toast-message]");
  const sprint = element.querySelector<HTMLElement>("[data-sprint]");
  const sprintFill = element.querySelector<HTMLElement>("[data-sprint-fill]");
  const sprintLabel = element.querySelector<HTMLElement>("[data-sprint-label]");
  const hitStreak = element.querySelector<HTMLElement>("[data-hit-streak]");
  const hitCount = element.querySelector<HTMLElement>("[data-hit-count]");
  const hitTime = element.querySelector<HTMLElement>("[data-hit-time]");
  const hitFill = element.querySelector<HTMLElement>("[data-hit-fill]");
  let timer = 0;
  let count = 0;

  return {
    element,
    setSprint(value, sprinting, exhausted) {
      const clamped = Math.max(0, Math.min(1, value));
      if (sprintFill) sprintFill.style.width = `${clamped * 100}%`;
      if (sprintLabel) {
        sprintLabel.textContent = exhausted
          ? "YENİLENİYOR"
          : sprinting
            ? "KOŞUYOR"
            : `${(clamped * 3).toFixed(1)} sn`;
      }
      sprint?.classList.toggle("is-active", sprinting);
      sprint?.classList.toggle("is-exhausted", exhausted);
    },
    setHitStreak(hits, remaining, duration) {
      const visible = hits > 0 && hits < 6 && remaining > 0;
      hitStreak?.classList.toggle("is-visible", visible);
      hitStreak?.classList.toggle("is-urgent", visible && remaining <= 2);
      if (hitCount) hitCount.textContent = `${hits} / 6`;
      if (hitTime) hitTime.textContent = `${Math.max(0, remaining).toFixed(1)} sn`;
      if (hitFill) {
        hitFill.style.width = `${Math.max(0, Math.min(1, remaining / duration)) * 100}%`;
      }
    },
    flash(nextMessage, tone = "default") {
      count += 1;
      if (index) index.textContent = String(count).padStart(2, "0");
      if (message) message.textContent = nextMessage;
      if (!toast) return;
      toast.dataset.tone = tone;
      toast.classList.remove("is-visible");
      window.clearTimeout(timer);
      window.requestAnimationFrame(() => toast.classList.add("is-visible"));
      timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2100);
    },
    dispose() {
      window.clearTimeout(timer);
      element.remove();
    },
  };
}
