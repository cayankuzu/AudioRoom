import type { Models } from "../../engine/core/models";
import { chooseSpot, createQuizDesk, QUIZ_DESK_MODELS, type QuizDesk } from "../../engine/game/quizDesk";
import type { QuizQuestion } from "../../engine/ui/quiz";
import type { WorldContext } from "../../engine/world";
import { wombGround } from "./womb";

/** Sınav kürsüsü: rahmin kenarında bir okul sırası; yeri her girişte değişir (gölge perdesinden ve girişten uzak). */
export const QUIZ_MODELS = [...QUIZ_DESK_MODELS];
const DESK_SPOTS = [{ x: -5.5, z: 13 }, { x: 8, z: 16 }, { x: -9, z: 4 }];

const TRIVIA: QuizQuestion[] = [
  { prompt: "Beni Büyüten Şarkılar Vol.1 hangi yıl yayımlandı?", choices: ["2013", "2015", "2017", "2019"], answer: 1 },
  { prompt: "Albümü yayımlayan plak şirketi?", choices: ["DMC", "Pasaj Müzik", "Sony Müzik", "Kalan"], answer: 0 },
  { prompt: "Albüm kaç parçadan oluşur?", choices: ["7", "9", "11", "12"], answer: 1 },
  { prompt: "Albümün türü hangisinde doğru verilmiş?", choices: ["Rock · cover albüm", "Caz", "Elektronik", "Halk müziği"], answer: 0 },
  { prompt: "Bu evrende neyin içindesin?", choices: ["Bir kasetin", "Anne karnının", "Bir mağaranın", "Bir denizin"], answer: 1 },
  { prompt: "Plaklar nerede saklıdır?", choices: ["Kabarcıklarda", "Kayalarda", "Tavanda", "Kutularda"], answer: 0 },
  { prompt: "Her şarkı bebek için neye karşılık gelir?", choices: ["Bir güne", "Bir aya", "Bir yıla", "Bir saate"], answer: 1 },
  { prompt: "Gölge oyunu nereye düşer?", choices: ["Zara", "Zemine", "Bebeğe", "Gramofona"], answer: 0 },
  { prompt: "Albümün toplam süresi yaklaşık kaç dakika?", choices: ["24", "31", "45", "52"], answer: 1 },
  { prompt: "Albümün kaynakları arasında hangisi vardır?", choices: ["Arabesk", "Hip hop", "Reggae", "Opera"], answer: 0 },
  { prompt: "Şarkılar ilerledikçe kalp atışı ne yapar?", choices: ["Yavaşlar", "Hızlanır", "Durur", "Değişmez"], answer: 1 },
];

export function createQuiz(ctx: WorldContext, models: Models): QuizDesk {
  const spot = chooseSpot(DESK_SPOTS, ctx.random);
  return createQuizDesk(ctx, models, { spot, facing: { x: 0, z: 17 }, ground: wombGround, style: "muted", dim: 0.55, trivia: TRIVIA, fallbackColor: "#2a0806" });
}
