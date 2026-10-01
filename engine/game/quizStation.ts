import * as THREE from "three";
import { loadLyrics, type LyricLine } from "../audio/lyrics";
import { createQuiz, type QuizQuestion } from "../ui/quiz";
import type { Track, WorldContext } from "../world";
import { albumQuestions, lyricQuestions } from "./quizBank";

/**
 * Sınav kürsüsü: E ile 10 soruluk şıklı sınav açılır. Sorular önce sahibin lisanslı .lrc dosyalarından
 * (söz tamamlama; proje söz içermez), yoksa evren/albüm bilgisinden gelir. 8/10 ve üstü sırrı açar.
 */
export interface QuizStationOptions {
  /** Kürsü nesnesi (sahneye evren ekler); etkileşim noktası bundan okunur. */
  object: THREE.Object3D;
  radius?: number;
  tracks: readonly Track[];
  /** Evrene özgü, söz içermeyen sorular. */
  trivia: readonly QuizQuestion[];
  secretId: string;
  passMark?: number;
}

export interface QuizStation {
  readonly open: boolean;
  /** Test ve geliştirme: bir sonraki sınavın sorularını üretir. */
  questions(): QuizQuestion[];
  /** Şu an açık sınavın soruları (test için). */
  readonly current: readonly QuizQuestion[];
  dispose(): void;
}

function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createQuizStation(ctx: WorldContext, options: QuizStationOptions): QuizStation {
  const { interaction, secrets, sfx, hud } = ctx;
  const quiz = createQuiz(hud.root, ctx.input);
  const passMark = options.passMark ?? 8;
  const lyricSets: Array<{ track: Track; lines: LyricLine[] }> = [];
  for (const track of options.tracks) {
    loadLyrics(track.id)
      .then((lines) => {
        if (lines && lines.length >= 6) lyricSets.push({ track, lines });
      })
      .catch(() => undefined);
  }
  const point = new THREE.Vector3();
  let title = "Albüm Sınavı";
  let current: QuizQuestion[] = [];

  const questions = (): QuizQuestion[] => {
    const random = Math.random;
    let list: QuizQuestion[] = [];
    if (lyricSets.length) {
      const set = lyricSets[Math.floor(random() * lyricSets.length)];
      list = lyricQuestions(set.lines, random, 10);
      title = `Söz Sınavı · ${set.track.title}`;
    } else title = "Evren Sınavı";
    if (list.length < 10) {
      const pool = shuffle([...options.trivia, ...albumQuestions(options.tracks, random, 10)]);
      for (const q of pool) {
        if (list.length >= 10) break;
        if (!list.some((x) => x.prompt === q.prompt)) list.push(q);
      }
    }
    return list.slice(0, 10);
  };

  const item = {
    position: (target: THREE.Vector3) => {
      options.object.getWorldPosition(point);
      return target.copy(point).setY(point.y + 0.9);
    },
    radius: options.radius ?? 0.9,
    prompt: () => (quiz.isOpen || ctx.cinema ? null : [{ key: "E", label: secrets.has(options.secretId) ? "Sınavı yeniden çöz" : "Sınava gir" }]),
    use: () => {
      const list = questions();
      if (!list.length) {
        hud.hint("Kürsü boş: bu evren için soru bulunamadı.", 4);
        return;
      }
      sfx.cue("switch");
      current = list;
      quiz.open(title, list, (correct, total) => {
        if (correct >= passMark) {
          if (secrets.reveal(options.secretId)) sfx.cue("chime");
          else hud.hint(`${correct} / ${total} — ezber tam.`, 4);
        } else hud.hint(`${correct} / ${total} — ${passMark} doğru gerek. Biraz daha dinle, yine gel.`, 5);
        hud.hint(`${correct} / ${total} · devam etmek için tıkla`, 4);
      });
    },
  };
  interaction.add(item);

  return {
    get open() {
      return quiz.isOpen;
    },
    questions,
    get current() {
      return current;
    },
    dispose() {
      interaction.remove(item);
      quiz.dispose();
    },
  };
}
