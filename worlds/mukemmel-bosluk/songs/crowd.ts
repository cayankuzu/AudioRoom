import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { CircleCollider, Colliders } from "../../../engine/core/colliders";
import { ground } from "./kit";

/**
 * Yüzsüz insan siluetleri (tek çizim çağrısı). Kıyıda bekleyenler, yok olan
 * kalabalık, içinden geçen bin insan… Her birinin varlığı 0..1: 0'da yere gömülüp kaybolur.
 */
export interface Crowd {
  readonly mesh: THREE.InstancedMesh;
  readonly count: number;
  /** i. kişiyi (x, z) noktasına yerleştirir. */
  place(i: number, x: number, z: number, yaw: number, height?: number): void;
  /** 0..1 varlık (0: yok). */
  presence: Float32Array;
  /** Kişileri bulundukları yerde kaydırır (yürüyen kalabalık). */
  offset(i: number, dx: number, dz: number): void;
  position(i: number, target: THREE.Vector3): THREE.Vector3;
  update(time: number): void;
  /** Siluetleri katı yapar: yarıdan fazla var olan her beden bir engeldir (hayaletler hariç tutulur). */
  solidify(colliders: Colliders): void;
}

/** İnsan silueti (ayak tabanı 0, boy ~1.78 m): ayrı bacaklar, kalça, daralan gövde, omuzlar, sarkan kollar, boyun, baş. */
function personGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (geometry: THREE.BufferGeometry) => parts.push(geometry.toNonIndexed());
  for (const side of [-1, 1]) {
    const leg = new THREE.CapsuleGeometry(0.075, 0.74, 4, 10);
    leg.rotateZ(side * 0.03);
    leg.translate(side * 0.1, 0.45, 0);
    add(leg);
    const foot = new THREE.CapsuleGeometry(0.05, 0.14, 3, 8);
    foot.rotateX(Math.PI / 2);
    foot.translate(side * 0.1, 0.05, 0.05);
    add(foot);
    const arm = new THREE.CapsuleGeometry(0.055, 0.56, 4, 8);
    arm.rotateZ(side * 0.1);
    arm.translate(side * 0.27, 1.12, 0);
    add(arm);
    const hand = new THREE.SphereGeometry(0.055, 8, 6);
    hand.translate(side * 0.3, 0.8, 0);
    add(hand);
  }
  const hips = new THREE.CapsuleGeometry(0.12, 0.16, 4, 10);
  hips.rotateZ(Math.PI / 2);
  hips.translate(0, 0.86, 0);
  add(hips);
  const torso = new THREE.CylinderGeometry(0.2, 0.15, 0.58, 14);
  torso.scale(1, 1, 0.62);
  torso.translate(0, 1.16, 0);
  add(torso);
  const shoulders = new THREE.CapsuleGeometry(0.085, 0.36, 4, 10);
  shoulders.rotateZ(Math.PI / 2);
  shoulders.translate(0, 1.42, 0);
  add(shoulders);
  const neck = new THREE.CylinderGeometry(0.05, 0.055, 0.12, 8);
  neck.translate(0, 1.53, 0);
  add(neck);
  const head = new THREE.SphereGeometry(0.105, 16, 12);
  head.scale(0.92, 1.12, 1);
  head.translate(0, 1.66, 0.01);
  add(head);
  const merged = mergeGeometries(parts);
  merged.computeVertexNormals();
  return merged;
}

/** floor: kişilerin durduğu yüzey (varsayılan krater zemini; ör. deniz yüzeyi verilebilir). */
export function createCrowd(count: number, material: THREE.Material, floor: (x: number, z: number) => number = ground): Crowd {
  const mesh = new THREE.InstancedMesh(personGeometry(), material, count);
  mesh.frustumCulled = false;
  mesh.castShadow = true;
  const spots = Array.from({ length: count }, () => ({ x: 0, z: 0, yaw: 0, height: 1 }));
  const presence = new Float32Array(count);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  let bodies: CircleCollider[] = [];

  const crowd: Crowd = {
    mesh,
    count,
    presence,
    place(i, x, z, yaw, height = 1) {
      spots[i] = { x, z, yaw, height };
    },
    offset(i, dx, dz) {
      spots[i].x += dx;
      spots[i].z += dz;
    },
    position(i, target) {
      return target.set(spots[i].x, floor(spots[i].x, spots[i].z) + 1, spots[i].z);
    },
    update(time) {
      for (let i = 0; i < count; i += 1) {
        const s = spots[i];
        const p = presence[i];
        // Varlık azaldıkça siluet yere gömülür ve incelir.
        position.set(s.x, floor(s.x, s.z) - (1 - p) * 1.9 * s.height, s.z);
        quaternion.setFromAxisAngle(up, s.yaw + Math.sin(time * 0.6 + i) * 0.04);
        scale.set(s.height * (0.6 + p * 0.4), s.height * Math.max(p, 0.001), s.height * (0.6 + p * 0.4));
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);
        const body = bodies[i];
        if (body) {
          body.x = s.x;
          body.z = s.z;
          body.r = 0.3 * s.height;
          body.minY = position.y;
          body.maxY = position.y + 1.75 * s.height * p;
          body.enabled = p > 0.5;
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    solidify(colliders) {
      bodies = spots.map((s) => {
        const body = colliders.addCircle(s.x, s.z, 0.3, mesh);
        body.enabled = false;
        return body;
      });
    },
  };
  return crowd;
}
