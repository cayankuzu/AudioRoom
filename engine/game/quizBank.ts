import type { LyricLine } from "../audio/lyrics";
import type { QuizQuestion } from "../ui/quiz";
import type { Track } from "../world";

/** Diziden `count` farklı öğe seçer (deterministik `random`). */
function sample<T>(items: readonly T[], count: number, random: () => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length && out.length < count) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return out;
}

function shuffleChoices(correctText: string, distractors: string[], random: () => number): { choices: string[]; answer: number } {
  const choices = sample([...new Set(distractors.filter((d) => d !== correctText))], 3, random);
  const answer = Math.floor(random() * (choices.length + 1));
  choices.splice(answer, 0, correctText);
  return { choices, answer };
}

/**
 * Söz tamamlama: sahibin lisanslı .lrc dosyasındaki satırlardan son kelime silinir, üç yanlış kelime eklenir.
 * Proje kendisi söz içermez; dosya yoksa soru da yoktur.
 */
export function lyricQuestions(lines: readonly LyricLine[], random: () => number, count = 10): QuizQuestion[] {
  const usable = lines.map((l) => l.text.trim().split(/\s+/)).filter((words) => words.length >= 4 && words[words.length - 1].length >= 3);
  if (usable.length < 6) return [];
  const lastWords = usable.map((w) => w[w.length - 1].replace(/[.,!?;:]+$/, ""));
  return sample(usable, count, random).map((words) => {
    const last = words[words.length - 1].replace(/[.,!?;:]+$/, "");
    const { choices, answer } = shuffleChoices(last, lastWords, random);
    return { prompt: `${words.slice(0, -1).join(" ")} ____`, choices, answer };
  });
}

/** Albüm bilgisi: sıra, parça adı, künye (yalnızca albüm künyesinden; söz içermez). */
export function albumQuestions(tracks: readonly Track[], random: () => number, count = 10): QuizQuestion[] {
  if (tracks.length < 4) return [];
  const titles = tracks.map((t) => t.title);
  const out: QuizQuestion[] = [];
  for (const t of sample(tracks, count, random)) {
    const kind = Math.floor(random() * (t.credit ? 3 : 2));
    if (kind === 0) {
      const { choices, answer } = shuffleChoices(t.title, titles, random);
      out.push({ prompt: `Albümün ${t.order}. parçası hangisi?`, choices, answer });
    } else if (kind === 1) {
      const nums = tracks.map((x) => String(x.order));
      const { choices, answer } = shuffleChoices(String(t.order), nums, random);
      out.push({ prompt: `"${t.title}" albümde kaçıncı sırada?`, choices: choices.map((c) => `${c}. parça`), answer });
    } else {
      const credits = tracks.map((x) => x.credit ?? "").filter(Boolean);
      const { choices, answer } = shuffleChoices(t.credit ?? "", credits, random);
      out.push({ prompt: `"${t.title}" parçasının künyesi?`, choices, answer });
    }
  }
  return out;
}
