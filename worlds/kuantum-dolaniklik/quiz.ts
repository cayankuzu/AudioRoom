import type { Models } from "../../engine/core/models";
import { chooseSpot, createQuizDesk, QUIZ_DESK_MODELS, type QuizDesk } from "../../engine/game/quizDesk";
import type { QuizQuestion } from "../../engine/ui/quiz";
import type { WorldContext } from "../../engine/world";
import { toonGradient } from "./room";

/** Sınav kürsüsü: mürekkep çizgili bir okul sırası; yeri her girişte değişir (kapak kadrajının dışında). */
export const QUIZ_MODELS = [...QUIZ_DESK_MODELS];
const DESK_SPOTS = [{ x: 17, z: 15 }, { x: -17, z: -15 }, { x: 20, z: -20 }];

const TRIVIA: QuizQuestion[] = [
  { prompt: "Kuantum Dolanıklık hangi yıl yayımlandı?", choices: ["2020", "2021", "2023", "2024"], answer: 2 },
  { prompt: "Parçanın süresi?", choices: ["2:58", "3:24", "3:57", "4:31"], answer: 2 },
  { prompt: "Parçanın sözü ve müziği kime ait?", choices: ["Henry the Lee", "Redd", "Hayko Cepkin", "Kalben"], answer: 0 },
  { prompt: "Parçanın türü hangisinde doğru verilmiş?", choices: ["Arabesk", "Türkçe rock · post-punk", "Caz", "Trap"], answer: 1 },
  { prompt: "Parça hangi gün yayımlandı?", choices: ["1 Şubat 2023", "13 Ağustos 2020", "4 Mart 2016", "29 Aralık 2015"], answer: 0 },
  { prompt: "Kapaktaki kutunun rengi?", choices: ["Mavi", "Sarı", "Kırmızı", "Beyaz"], answer: 1 },
  { prompt: "Plak kimin elindedir?", choices: ["Kedinin", "Mürekkep ikizinin", "Tavşanın", "Gramofonun"], answer: 1 },
  { prompt: "Duvardaki gülümseme neyden yapılmıştır?", choices: ["Halattan", "Boyadan", "Işıktan", "Kâğıttan"], answer: 0 },
  { prompt: "Şarkı sırasında tavandan ne iner?", choices: ["Yağmur", "Ay", "Bir kafes", "Kar"], answer: 1 },
  { prompt: "Çift yarık deneyinde yarıklara bakınca ne olur?", choices: ["Desen kaybolur", "Dalga deseni iki banda çöker", "Ekran kararır", "Hiçbir şey"], answer: 1 },
  { prompt: "Odada seni kim ayna gibi taklit eder?", choices: ["Kedi", "Mürekkep ikizin", "Bir kukla", "Ay"], answer: 1 },
  { prompt: "Kedi ne zaman yürür?", choices: ["Hep", "Yalnızca ona bakılmazken", "Yalnızca gece", "Hiç"], answer: 1 },
];

export function createQuiz(ctx: WorldContext, models: Models): QuizDesk {
  const spot = chooseSpot(DESK_SPOTS, ctx.random);
  return createQuizDesk(ctx, models, { spot, facing: { x: 0, z: 0 }, ground: () => 0, style: "ink", gradient: toonGradient(), trivia: TRIVIA, fallbackColor: "#141008" });
}
