import * as THREE from "three";

/**
 * İskeletli insan figürü için iki kemikli kol IK'si ve baş eğimi: hazır animasyon kliplerinin üstüne, figürün
 * `update`inden SONRA her karede çağrılır (klip kemikleri her karede yeniden yazar; düzeltme birikmez).
 * El gerçekten bir yere dokunsun diye: göğse konan el, sarılan kollar, uzanan el, ipliği çeken parmaklar.
 */
export interface ArmIk {
  /**
   * El (bilek) dünya uzayındaki hedefe uzanır. weight 0..1: klip duruşu ile hedef arasında harman.
   * pole: dirseğin yöneldiği dünya yönü (verilmezse aşağı).
   */
  reach(side: "l" | "r", target: THREE.Vector3, weight: number, pole?: THREE.Vector3): void;
  /** Bir kemiği (ör. "Head", "neck_01", "spine_03") dünya ekseni çevresinde döndürür (radyan). */
  tilt(bone: string, axis: THREE.Vector3, angle: number): void;
  /** Bileğin dünya konumu. */
  hand(side: "l" | "r", out: THREE.Vector3): THREE.Vector3;
  /**
   * Önceki karede düzeltilen kemikleri düzeltme öncesi hâline döndürür. Figürün `update`inden ÖNCE çağrılır: klibin
   * canlandırmadığı kemiklerde (ör. bazı kliplerde baş) eğim her karede üst üste binmez.
   */
  restore(): void;
}

export function createArmIk(group: THREE.Object3D): ArmIk {
  const cache = new Map<string, THREE.Object3D | null>();
  const bone = (name: string) => {
    let found = cache.get(name);
    if (found === undefined || found === null) {
      found = group.getObjectByName(name) ?? null;
      cache.set(name, found);
    }
    return found;
  };
  const s = new THREE.Vector3();
  const e = new THREE.Vector3();
  const w = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const poleV = new THREE.Vector3();
  const elbow = new THREE.Vector3();
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();
  const qDelta = new THREE.Quaternion();
  const qWorld = new THREE.Quaternion();
  const qParent = new THREE.Quaternion();
  /** Bu karede düzeltilen kemiklerin düzeltme öncesi yönelimleri. */
  const saved = new Map<THREE.Object3D, THREE.Quaternion>();
  /** Kemiği dünya uzayında qDelta kadar döndürür (weight ile harmanlı). */
  const turn = (target: THREE.Object3D, weight: number) => {
    if (!saved.has(target)) saved.set(target, target.quaternion.clone());
    target.getWorldQuaternion(qWorld).premultiply(qDelta);
    target.parent!.getWorldQuaternion(qParent).invert();
    qParent.multiply(qWorld);
    target.quaternion.slerp(qParent, weight);
  };
  const aim = (target: THREE.Object3D, current: THREE.Vector3, desired: THREE.Vector3, weight: number) => {
    if (current.lengthSq() < 1e-10 || desired.lengthSq() < 1e-10) return;
    qDelta.setFromUnitVectors(current.normalize(), desired.normalize());
    turn(target, weight);
  };
  return {
    reach(side, target, weight, pole) {
      if (weight <= 0.001) return;
      const upper = bone(`upperarm_${side}`);
      const lower = bone(`lowerarm_${side}`);
      const wrist = bone(`hand_${side}`);
      if (!upper || !lower || !wrist || !upper.parent) return;
      upper.getWorldPosition(s);
      lower.getWorldPosition(e);
      wrist.getWorldPosition(w);
      const la = s.distanceTo(e);
      const lb = e.distanceTo(w);
      dir.copy(target).sub(s);
      const d = THREE.MathUtils.clamp(dir.length(), Math.abs(la - lb) + 0.01, la + lb - 0.004);
      dir.normalize();
      const along = (la * la - lb * lb + d * d) / (2 * d);
      const height = Math.sqrt(Math.max(0, la * la - along * along));
      if (pole) poleV.copy(pole);
      else poleV.set(0, -1, 0);
      poleV.addScaledVector(dir, -poleV.dot(dir));
      if (poleV.lengthSq() < 1e-6) poleV.set(dir.z, 0, -dir.x);
      poleV.normalize();
      elbow.copy(s).addScaledVector(dir, along).addScaledVector(poleV, height);
      aim(upper, from.copy(e).sub(s), to.copy(elbow).sub(s), weight);
      lower.getWorldPosition(e);
      wrist.getWorldPosition(w);
      aim(lower, from.copy(w).sub(e), to.copy(s).addScaledVector(dir, d).sub(e), weight);
    },
    tilt(name, axis, angle) {
      const target = bone(name);
      if (!target || !target.parent || Math.abs(angle) < 1e-4) return;
      qDelta.setFromAxisAngle(from.copy(axis).normalize(), angle);
      turn(target, 1);
    },
    hand(side, out) {
      const wrist = bone(`hand_${side}`);
      return wrist ? wrist.getWorldPosition(out) : group.getWorldPosition(out);
    },
    restore() {
      for (const [target, quaternion] of saved) target.quaternion.copy(quaternion);
      saved.clear();
    },
  };
}
