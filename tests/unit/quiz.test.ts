import { describe, expect, it } from "vitest";
import { albumQuestions, lyricQuestions } from "../../engine/game/quizBank";
import type { Track } from "../../engine/world";

function seeded(seed = 3): () => number {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Sınama satırları: uydurma, hiçbir şarkıya ait olmayan cümleler (.lrc dosyası sahibin lisanslı dosyasıdır).
const LINES = [
  "kırmızı bir kapı açıldı sessizce",
  "masanın üstünde soğuk bir çaydanlık",
  "sabah erkenden çıktık yola birlikte",
  "pencereden bakan kedi uyuyakaldı",
  "eski bir harita katlandı cebimde",
  "yağmur durunca sokak yeniden parladı",
  "bisiklet zinciri paslanmış duruyordu",
  "kâğıt gemi havuzda dönüp durdu",
].map((text, i) => ({ at: i * 4, text }));

const TRACKS: Track[] = [
  { id: "a", order: 1, title: "Birinci", videoId: "x", mood: "", credit: "Kaynak A" },
  { id: "b", order: 2, title: "İkinci", videoId: "x", mood: "", credit: "Kaynak B" },
  { id: "c", order: 3, title: "Üçüncü", videoId: "x", mood: "", credit: "Kaynak C" },
  { id: "d", order: 4, title: "Dördüncü", videoId: "x", mood: "", credit: "Kaynak D" },
  { id: "e", order: 5, title: "Beşinci", videoId: "x", mood: "" },
];

describe("sınav soruları", () => {
  it("söz tamamlama: son kelime gizlenir, doğru şık satırı tamamlar, şıklar farklıdır", () => {
    const questions = lyricQuestions(LINES, seeded(), 6);
    expect(questions).toHaveLength(6);
    for (const q of questions) {
      expect(q.prompt.endsWith(" ____")).toBe(true);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      const full = `${q.prompt.slice(0, -5)} ${q.choices[q.answer]}`;
      expect(LINES.some((l) => l.text === full)).toBe(true);
    }
    // Aynı satır iki kez sorulmaz.
    expect(new Set(questions.map((q) => q.prompt)).size).toBe(6);
  });

  it("çok kısa söz dosyasından soru üretilmez", () => {
    expect(lyricQuestions(LINES.slice(0, 3), seeded(), 10)).toEqual([]);
  });

  it("albüm bilgisi: sıra/ad/künye soruları; tek parçalık albümde soru yoktur", () => {
    const questions = albumQuestions(TRACKS, seeded(5), 10);
    expect(questions.length).toBe(5);
    for (const q of questions) {
      expect(q.choices.length).toBeGreaterThanOrEqual(2);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(q.choices.length);
      expect(new Set(q.choices).size).toBe(q.choices.length);
    }
    expect(albumQuestions(TRACKS.slice(0, 1), seeded(), 10)).toEqual([]);
  });
});
