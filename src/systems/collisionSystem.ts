import * as THREE from "three";
import type { SphereCollider } from "../types";
import { WORLD } from "../config/config";

export interface CollisionSystem {
  add(list: SphereCollider[]): void;
  resolveXZ(next: THREE.Vector3, bodyRadius: number): THREE.Vector3;
}

export function createCollisionSystem(): CollisionSystem {
  const colliders: SphereCollider[] = [];

  function push(pos: THREE.Vector3, body: number, c: SphereCollider): boolean {
    const dx = pos.x - c.center.x;
    const dz = pos.z - c.center.z;
    const rr = c.radius + body;
    const distSq = dx * dx + dz * dz;
    if (distSq >= rr * rr || distSq === 0) return false;
    const dist = Math.sqrt(distSq);
    const overlap = rr - dist;
    pos.x += (dx / dist) * overlap;
    pos.z += (dz / dist) * overlap;
    return true;
  }

  return {
    add(list) {
      colliders.push(...list);
    },
    resolveXZ(next, bodyRadius) {
      for (let i = 0; i < colliders.length; i += 1) {
        push(next, bodyRadius, colliders[i]);
      }
      const distFromCenter = Math.hypot(next.x, next.z);
      const boundary = WORLD.boundary - bodyRadius;
      if (distFromCenter > boundary) {
        const k = boundary / distFromCenter;
        next.x *= k;
        next.z *= k;
      }
      return next;
    },
  };
}
