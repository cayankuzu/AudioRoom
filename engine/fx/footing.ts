import * as THREE from "three";
import type { Figure } from "./figure";

/**
 * Zemine oturtma: klibin ayakları, dizleri, kalçası, sırtı ya da başı zeminin altına inmesin. Her karede temas
 * kemiklerinin altındaki zemin okunur; biri gömülüyorsa figür o kadar yükseltilir (eğimde alttaki ayak birkaç santim
 * havada kalır; gömülmekten iyidir). Konumlar figürün ebeveyninin uzayındadır (sayfa dünyasında da çalışır).
 */
/** Temas kemikleri ve kemik merkezinden derinin dışına uzaklık (1,85 m boyda, metre). */
const CONTACTS: ReadonlyArray<readonly [string, number]> = [
  ["ball_l", 0.03],
  ["ball_r", 0.03],
  ["foot_l", 0.065],
  ["foot_r", 0.065],
  ["calf_l", 0.06],
  ["calf_r", 0.06],
  ["hand_l", 0.025],
  ["hand_r", 0.025],
  ["lowerarm_l", 0.035],
  ["lowerarm_r", 0.035],
  ["pelvis", 0.1],
  ["spine_02", 0.11],
  ["spine_03", 0.11],
  ["Head", 0.1],
];

export interface Footing {
  /** Figürü gerekirse yükseltir; yükseltme miktarını (ebeveyn uzayında) döndürür. */
  settle(ground: (x: number, z: number) => number, scale: number): number;
}

export function createFooting(figure: Figure): Footing {
  let bones: Array<readonly [THREE.Object3D, number]> | null = null;
  const p = new THREE.Vector3();
  return {
    settle(ground, scale) {
      const g = figure.group;
      if (!bones) {
        bones = [];
        for (const [name, radius] of CONTACTS) {
          const bone = g.getObjectByName(name);
          if (bone) bones.push([bone, radius]);
        }
      }
      if (!bones.length) return 0;
      g.updateMatrixWorld(true);
      let need = 0;
      for (const [bone, radius] of bones) {
        bone.getWorldPosition(p);
        if (g.parent) g.parent.worldToLocal(p);
        const lack = ground(p.x, p.z) + radius * scale - p.y;
        if (lack > need) need = lack;
      }
      if (need > 0) {
        g.position.y += need;
        g.updateMatrixWorld(true);
      }
      return need;
    },
  };
}
