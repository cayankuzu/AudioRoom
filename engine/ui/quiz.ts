import type { Input } from "../core/input";
import { el } from "./dom";

/**
 * Küçük şıklı yarışma paneli: bir soru, dört şık (1–4 tuşları ya da tıklama), ilerleme. Kapanınca sonucu
 * bildirir. Oyun girdisi paneldeyken kapalıdır; kapanınca oyuncu tıklayıp devam eder.
 */
export interface QuizQuestion {
  prompt: string;
  choices: string[];
  answer: number;
}

export interface Quiz {
  readonly isOpen: boolean;
  open(title: string, questions: QuizQuestion[], onDone: (correct: number, total: number) => void): void;
  dispose(): void;
}

export function createQuiz(parent: HTMLElement, input: Input): Quiz {
  const root = el("div", "ar-quiz");
  const card = el("div", "ar-quiz__card");
  const kicker = el("p", "ar-quiz__kicker");
  const progress = el("p", "ar-quiz__progress");
  const prompt = el("p", "ar-quiz__prompt");
  const choices = el("div", "ar-quiz__choices");
  const foot = el("p", "ar-quiz__foot", "1–4 ile seç · Esc ile bırak");
  const leave = el("button", "ar-quiz__leave", "Bırak");
  leave.type = "button";
  card.append(kicker, progress, prompt, choices, foot, leave);
  root.appendChild(card);
  parent.appendChild(root);

  let open = false;
  let queue: QuizQuestion[] = [];
  let index = 0;
  let correct = 0;
  let done: ((correct: number, total: number) => void) | null = null;
  let locked = false;
  let title = "";

  const close = () => {
    open = false;
    root.classList.remove("is-open");
    input.active = true;
    const fn = done;
    done = null;
    fn?.(correct, queue.length);
  };
  const show = () => {
    const q = queue[index];
    kicker.textContent = title;
    progress.textContent = `${index + 1} / ${queue.length} · doğru ${correct}`;
    prompt.textContent = q.prompt;
    choices.replaceChildren(
      ...q.choices.map((text, i) => {
        const button = el("button", "ar-quiz__choice", `${i + 1}  ${text}`);
        button.type = "button";
        button.addEventListener("click", () => pick(i));
        return button;
      }),
    );
    locked = false;
  };
  const pick = (i: number) => {
    if (locked) return;
    locked = true;
    const q = queue[index];
    const buttons = [...choices.children] as HTMLButtonElement[];
    buttons[i]?.classList.add(i === q.answer ? "is-right" : "is-wrong");
    buttons[q.answer]?.classList.add("is-right");
    if (i === q.answer) correct += 1;
    window.setTimeout(() => {
      index += 1;
      if (index >= queue.length) close();
      else show();
    }, 650);
  };
  const onKey = (event: KeyboardEvent) => {
    if (!open) return;
    if (event.code === "Escape") {
      event.stopImmediatePropagation();
      event.preventDefault();
      close();
      return;
    }
    const digit = ["Digit1", "Digit2", "Digit3", "Digit4"].indexOf(event.code);
    if (digit >= 0) {
      event.stopImmediatePropagation();
      event.preventDefault();
      pick(digit);
    }
  };
  document.addEventListener("keydown", onKey, true);
  leave.addEventListener("click", () => {
    if (open) close();
  });

  return {
    get isOpen() {
      return open;
    },
    open(heading, questions, onDone) {
      if (open || !questions.length) return;
      open = true;
      queue = questions;
      index = 0;
      correct = 0;
      done = onDone;
      title = heading;
      input.active = false;
      input.releaseLock();
      root.classList.add("is-open");
      show();
    },
    dispose() {
      document.removeEventListener("keydown", onKey, true);
      root.remove();
    },
  };
}
