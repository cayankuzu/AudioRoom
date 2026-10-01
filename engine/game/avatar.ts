import * as THREE from "three";
import type { Player } from "../core/player";
import { createFigure, type Figure } from "../fx/figure";
import type { CharacterKind, Outfit } from "../fx/character";

/**
 * Oyuncunun karakteri: üçüncü kişi görünümde kameranın önünde yürüyen, koşan, zıplayan, duran figür.
 * Klip ve kapak kadrajında gizlenir (klibin kendi oyuncuları vardır); kabuk/tünel gibi göz hizasının
 * düştüğü anlarda da gizlenir. Aynı model kliplerde "biz"i oynar: beyaz gömlek, beyaz pantolon.
 */
export interface Avatar {
  readonly figure: Figure;
  readonly group: THREE.Group;
  /** Evrenin isteğiyle gizleme (tünel, kabuk). */
  hidden: boolean;
  /** Sağ elin dünya konumu (eldeki plak için). */
  readonly hand: THREE.Object3D;
  update(dt: number, time: number, player: Player, show: boolean): void;
}

export function createAvatar(scene: THREE.Scene, options: { kind?: CharacterKind; outfit?: Outfit; height?: number } = {}): Avatar {
  const figure = createFigure({ kind: options.kind ?? "man", outfit: options.outfit ?? "man_white", height: options.height ?? 1.8 });
  const group = figure.group;
  group.visible = false;
  scene.add(group);
  const hand = new THREE.Object3D();
  figure.hold(hand);
  let air = 0;
  const avatar: Avatar = {
    figure,
    group,
    hidden: false,
    hand,
    update(dt, time, player, show) {
      group.visible = show && !avatar.hidden && player.options.eyeHeight > 1.2;
      group.position.copy(player.position);
      // Kamera −z'ye bakar; figürün önü +z'dir: yürüme yönü kameranın önü.
      group.rotation.y = player.yaw + Math.PI;
      const speed = player.speed();
      air = player.onGround ? Math.max(0, air - dt * 4) : Math.min(1, air + dt * 6);
      if (!player.onGround && air > 0.5) figure.pose = "jump";
      else if (speed > 5.6) figure.pose = "sprint";
      else if (speed > 3.2) figure.pose = "run";
      else if (speed > 0.35) figure.pose = "walk";
      else figure.pose = "still";
      figure.energy = figure.pose === "walk" ? THREE.MathUtils.clamp(speed / 3.6, 0.5, 1.2) : 1;
      if (group.visible) figure.update(dt, time);
    },
  };
  return avatar;
}
