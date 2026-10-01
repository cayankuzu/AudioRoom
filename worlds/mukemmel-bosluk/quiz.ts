import type { Models } from "../../engine/core/models";
import { chooseSpot, createQuizDesk, QUIZ_DESK_EXTRAS, QUIZ_DESK_MODELS, type QuizDesk } from "../../engine/game/quizDesk";
import type { QuizQuestion } from "../../engine/ui/quiz";
import type { WorldContext } from "../../engine/world";
import { craterHeight } from "./terrain";

/** Sınav kürsüsü: kraterin girişinde bir okul sırası, kara tahta ve gaz lambası; yeri her girişte değişir. */
export const QUIZ_MODELS = [...QUIZ_DESK_MODELS, ...QUIZ_DESK_EXTRAS];
const DESK_SPOTS = [{ x: -8, z: 77 }, { x: 18, z: 70 }, { x: -22, z: 60 }];
const START_LOOK = { x: 0, z: 40 };

const TRIVIA: QuizQuestion[] = [
  { prompt: "Mükemmel Boşluk hangi yıl yayımlandı?", choices: ["2014", "2016", "2018", "2012"], answer: 1 },
  { prompt: "Albüm kaç parçadan oluşur?", choices: ["9", "10", "12", "14"], answer: 2 },
  { prompt: "Albümü yayımlayan plak şirketi?", choices: ["Pasaj Müzik", "DMC", "Doublemoon", "Ada Müzik"], answer: 0 },
  { prompt: "Albümün miksini kim yaptı?", choices: ["Evren Göknar", "Mert Medeni", "Doğan Duru", "Berke Özgümüş"], answer: 1 },
  { prompt: "Bu evrende kıyıdaki gemileri ne yaparsın?", choices: ["Batırırsın", "Boyarsın", "Yakarsın", "Sayarsın"], answer: 2 },
  { prompt: "Kapak Noktası'nda ne olur?", choices: ["Sahne kapakla hizalanır", "Gramofon uçar", "Plaklar saklanır", "Krater dolar"], answer: 0 },
  { prompt: "Kraterin ortasındaki kuyuya nasıl inilir?", choices: ["Zıplayarak", "Mumları yakarak", "Kazarak", "Halatla"], answer: 1 },
  { prompt: "Albümün toplam süresi yaklaşık kaç dakika?", choices: ["31", "38", "49", "57"], answer: 2 },
  { prompt: "Kraterin üstünde havada asılı duran nedir?", choices: ["Bir gemi", "Dev bir figür", "Bir ay", "Bir gramofon"], answer: 1 },
  { prompt: "Albümün türü hangisinde doğru verilmiş?", choices: ["Arabesk", "Caz", "Alternatif rock · synth-pop", "Hip hop"], answer: 2 },
  { prompt: "Redd'in kadrosunda kim vardır?", choices: ["Doğan Duru", "Hayko Cepkin", "Henry the Lee", "Teoman"], answer: 0 },
  { prompt: "Albümün mastering'ini kim yaptı?", choices: ["Mert Medeni", "Güneş Duru", "Evren Göknar", "Berke Özgümüş"], answer: 2 },
];

export function chooseDeskSpot(random: () => number): { x: number; z: number } {
  return chooseSpot(DESK_SPOTS, random);
}

export function createQuiz(ctx: WorldContext, models: Models, spot: { x: number; z: number }): QuizDesk {
  return createQuizDesk(ctx, models, { spot, facing: START_LOOK, ground: craterHeight, style: "muted", dim: 0.72, trivia: TRIVIA, board: true, lamp: true });
}
