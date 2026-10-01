import type { Models } from "../../engine/core/models";
import { chooseSpot, createQuizDesk, QUIZ_DESK_MODELS, type QuizDesk } from "../../engine/game/quizDesk";
import type { QuizQuestion } from "../../engine/ui/quiz";
import type { WorldContext } from "../../engine/world";

/** Sınav kürsüsü: ebru kâğıdının üstünde bir okul sırası; yeri her girişte değişir (yuvalardan uzak). */
export const QUIZ_MODELS = [...QUIZ_DESK_MODELS];
const DESK_SPOTS = [{ x: 8, z: 24 }, { x: -12, z: 28 }, { x: 16, z: -8 }];

const TRIVIA: QuizQuestion[] = [
  { prompt: "Klostrofobik Kaplumbağa hangi yıl yayımlandı?", choices: ["2018", "2020", "2022", "2023"], answer: 1 },
  { prompt: "Parçanın süresi?", choices: ["2:50", "3:24", "3:57", "4:12"], answer: 1 },
  { prompt: "Parça hangi gün yayımlandı?", choices: ["13 Ağustos 2020", "1 Şubat 2023", "29 Aralık 2015", "4 Mart 2016"], answer: 0 },
  { prompt: "Kapaktaki kâğıdın tekniği?", choices: ["Ebru", "Sulu boya", "Gravür", "Kolaj"], answer: 0 },
  { prompt: "Plağı kim kaçırır?", choices: ["Kedi", "Beyaz Tavşan", "Kaplumbağa", "Fare"], answer: 1 },
  { prompt: "Tavşanı neyle sersemletirsin?", choices: ["Havuçla", "Taşla", "Suyla", "Işıkla"], answer: 0 },
  { prompt: "Yere boya damlatınca ne olur?", choices: ["Halka halka açılır", "Kurur", "Yok olur", "Kararır"], answer: 0 },
  { prompt: "Kaplumbağa sıkışınca ne yapar?", choices: ["Koşar", "Kabuğuna çekilir", "Uçar", "Kazar"], answer: 1 },
  { prompt: "Klipte evrenin duvarları ne yapar?", choices: ["Yıkılır", "Gitgide daralır", "Uçar", "Boyanır"], answer: 1 },
  { prompt: "Parçanın söz, müzik ve prodüksiyonu kime ait?", choices: ["Henry the Lee", "Redd", "Hayko Cepkin", "Mor ve Ötesi"], answer: 0 },
  { prompt: "Parçanın türü hangisinde doğru verilmiş?", choices: ["Türkçe rock · indie · post-punk", "Arabesk", "Klasik", "Techno"], answer: 0 },
  { prompt: "Bu evrende gökyüzü nedir?", choices: ["Bulutlar", "Akan bir marmorlama", "Yıldızlar", "Boş"], answer: 1 },
];

export function createQuiz(ctx: WorldContext, models: Models): QuizDesk {
  const spot = chooseSpot(DESK_SPOTS, ctx.random);
  return createQuizDesk(ctx, models, { spot, facing: { x: 0, z: 0 }, ground: () => 0, style: "pbr", trivia: TRIVIA, fallbackColor: "#8a6a3a" });
}
