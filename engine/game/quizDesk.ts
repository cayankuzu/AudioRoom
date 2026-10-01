import * as THREE from "three";
import { fitModel, type Models } from "../core/models";
import { styleModel, type DressStyle } from "../core/dressing";
import type { QuizQuestion } from "../ui/quiz";
import type { WorldContext } from "../world";
import { createQuizStation, type QuizStation } from "./quizStation";

/**
 * Sınav kürsüsü: bir okul sırası ve sandalye (isteğe bağlı kara tahta ve gaz lambası). Sıraya bakıp E:
 * 10 soruluk şıklı sınav. Yeri her girişte adaylar arasından seçilir; kürsü evrende kapak, kitaplık,
 * gramofon ve klip nesneleri dışında kalan tek sabit eşyadır.
 */
export const QUIZ_DESK_MODELS = ["schooldesk_01", "schoolchair_01"];
export const QUIZ_DESK_EXTRAS = ["standing_chalkboard_01", "vintage_oil_lamp"];

export interface QuizDeskOptions {
  /** Kürsünün yeri (aday listesinden seçilmiş). */
  spot: { x: number; z: number };
  /** Sıranın önü buraya bakar. */
  facing: { x: number; z: number };
  ground: (x: number, z: number) => number;
  style: DressStyle;
  dim?: number;
  gradient?: THREE.Texture;
  trivia: readonly QuizQuestion[];
  /** Arkada kara tahta ve sıranın üstünde gaz lambası (gece evrenleri için). */
  board?: boolean;
  lamp?: boolean;
  /** Model yüklenemezse çizilen sıranın rengi. */
  fallbackColor?: string;
}

export interface QuizDesk {
  readonly station: QuizStation;
  readonly spot: { x: number; z: number };
  /** Sıranın önündeki nokta ve ona bakış (testler ve ışınlama için). */
  readonly deskSpot: { x: number; z: number; yaw: number };
  update(dt: number, time: number): void;
}

export function chooseSpot<T>(spots: readonly T[], random: () => number): T {
  return spots[Math.floor(random() * spots.length)];
}

export function createQuizDesk(ctx: WorldContext, models: Models, options: QuizDeskOptions): QuizDesk {
  const { scene, colliders, tracks } = ctx;
  const { spot, ground } = options;
  const place = (name: string, x: number, z: number, size: number, yaw = 0, by?: "height" | "length") => {
    const object = models.get(name);
    if (!object) return null;
    const item = fitModel(object, size, { by });
    styleModel(item, options.style, { dim: options.dim, gradient: options.gradient });
    item.position.set(x, ground(x, z), z);
    item.rotation.y = yaw;
    scene.add(item);
    return item;
  };
  const yaw = Math.atan2(options.facing.x - spot.x, options.facing.z - spot.z);
  const desk =
    place("schooldesk_01", spot.x, spot.z, 1.3, yaw) ??
    (() => {
      const group = new THREE.Group();
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.7), new THREE.MeshStandardMaterial({ color: options.fallbackColor ?? "#3a2a1e", roughness: 0.8 }));
      top.position.y = 0.76;
      group.add(top);
      group.position.set(spot.x, ground(spot.x, spot.z), spot.z);
      group.rotation.y = yaw;
      scene.add(group);
      return group;
    })();
  colliders.solid(desk, { pad: 0.05 });
  const chair = place("schoolchair_01", spot.x - Math.sin(yaw) * 0.9, spot.z - Math.cos(yaw) * 0.9, 0.9, yaw, "height");
  if (chair) colliders.solid(chair, { pad: 0.02, shape: "round" });
  if (options.board) {
    const board = place("standing_chalkboard_01", spot.x - Math.sin(yaw) * 2.2, spot.z - Math.cos(yaw) * 2.2, 1.9, yaw, "height");
    if (board) colliders.solid(board, { pad: 0.05 });
  }
  let lampLight: THREE.PointLight | null = null;
  if (options.lamp) {
    const lamp = place("vintage_oil_lamp", spot.x + Math.cos(yaw) * 0.45, spot.z - Math.sin(yaw) * 0.45, 0.42, yaw, "height");
    if (lamp) lamp.position.y += 0.76;
    lampLight = new THREE.PointLight("#ffb56a", 2.4, 9, 1.6);
    lampLight.position.set(spot.x, ground(spot.x, spot.z) + 1.4, spot.z);
    scene.add(lampLight);
  }
  const station = createQuizStation(ctx, { object: desk, radius: 1.1, tracks, trivia: options.trivia, secretId: "soz-sinavi" });
  return {
    station,
    spot,
    // Sıranın önündeki nokta; oyuncunun bakış açısı sıraya dönük (oyuncu ileri yönü −(sin yaw, cos yaw)).
    deskSpot: { x: spot.x + Math.sin(yaw) * 1.6, z: spot.z + Math.cos(yaw) * 1.6, yaw },
    update(_dt, time) {
      if (lampLight) lampLight.intensity = 2.2 + Math.sin(time * 7.3) * 0.15 + Math.sin(time * 2.1) * 0.1;
    },
  };
}
