import * as THREE from "three";

interface ColliderEntry {
  object: THREE.Object3D;
  box: THREE.Box3;
  restitution: number;
  enabled?: () => boolean;
}

export interface ProjectileCollision {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  restitution: number;
  object: THREE.Object3D | null;
}

export interface CollisionWorldHandle {
  addBox(
    object: THREE.Object3D,
    restitution?: number,
    enabled?: () => boolean,
  ): void;
  update(): void;
  resolvePlayer(position: THREE.Vector3, eyeHeight: number, radius?: number): boolean;
  sweepSphere(
    start: THREE.Vector3,
    end: THREE.Vector3,
    radius: number,
    result: ProjectileCollision,
  ): boolean;
  snapshot(): { active: number; total: number };
  dispose(): void;
}

function isWorldVisible(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

function collisionNormalAt(
  point: THREE.Vector3,
  box: THREE.Box3,
  target: THREE.Vector3,
): THREE.Vector3 {
  let distance = Math.abs(point.x - box.min.x);
  target.set(-1, 0, 0);

  const maxX = Math.abs(box.max.x - point.x);
  if (maxX < distance) {
    distance = maxX;
    target.set(1, 0, 0);
  }
  const minY = Math.abs(point.y - box.min.y);
  if (minY < distance) {
    distance = minY;
    target.set(0, -1, 0);
  }
  const maxY = Math.abs(box.max.y - point.y);
  if (maxY < distance) {
    distance = maxY;
    target.set(0, 1, 0);
  }
  const minZ = Math.abs(point.z - box.min.z);
  if (minZ < distance) {
    distance = minZ;
    target.set(0, 0, -1);
  }
  const maxZ = Math.abs(box.max.z - point.z);
  if (maxZ < distance) target.set(0, 0, 1);
  return target;
}

export function createCollisionWorld(): CollisionWorldHandle {
  const entries: ColliderEntry[] = [];
  const ray = new THREE.Ray();
  const direction = new THREE.Vector3();
  const hitPoint = new THREE.Vector3();
  const expandedBox = new THREE.Box3();
  const bestPoint = new THREE.Vector3();
  const bestNormal = new THREE.Vector3();

  const entryIsActive = (entry: ColliderEntry) =>
    isWorldVisible(entry.object) && (!entry.enabled || entry.enabled());

  const updateEntry = (entry: ColliderEntry) => {
    if (!entryIsActive(entry)) {
      entry.box.makeEmpty();
      return;
    }
    entry.object.updateWorldMatrix(true, false);
    entry.box.setFromObject(entry.object);
  };

  return {
    addBox(object, restitution = 0.48, enabled) {
      if (entries.some((entry) => entry.object === object)) return;
      const entry = {
        object,
        box: new THREE.Box3(),
        restitution: THREE.MathUtils.clamp(restitution, 0.12, 0.8),
        enabled,
      };
      entries.push(entry);
      updateEntry(entry);
    },
    update() {
      entries.forEach(updateEntry);
    },
    resolvePlayer(position, eyeHeight, radius = 0.42) {
      const feet = position.y - eyeHeight;
      const head = position.y + 0.12;
      let collided = false;

      // A few passes are enough to resolve corners made from adjacent meshes.
      for (let pass = 0; pass < 4; pass += 1) {
        let resolvedThisPass = false;
        for (const entry of entries) {
          const box = entry.box;
          if (box.isEmpty() || head <= box.min.y || feet >= box.max.y) continue;

          const minX = box.min.x - radius;
          const maxX = box.max.x + radius;
          const minZ = box.min.z - radius;
          const maxZ = box.max.z + radius;
          if (
            position.x <= minX ||
            position.x >= maxX ||
            position.z <= minZ ||
            position.z >= maxZ
          ) {
            continue;
          }

          const toMinX = position.x - minX;
          const toMaxX = maxX - position.x;
          const toMinZ = position.z - minZ;
          const toMaxZ = maxZ - position.z;
          const nearest = Math.min(toMinX, toMaxX, toMinZ, toMaxZ);
          if (nearest === toMinX) position.x = minX - 0.002;
          else if (nearest === toMaxX) position.x = maxX + 0.002;
          else if (nearest === toMinZ) position.z = minZ - 0.002;
          else position.z = maxZ + 0.002;
          collided = true;
          resolvedThisPass = true;
        }
        if (!resolvedThisPass) break;
      }
      return collided;
    },
    sweepSphere(start, end, radius, result) {
      direction.subVectors(end, start);
      const segmentLength = direction.length();
      if (segmentLength < 0.00001) return false;
      direction.multiplyScalar(1 / segmentLength);
      ray.set(start, direction);

      let bestDistance = Number.POSITIVE_INFINITY;
      let bestEntry: ColliderEntry | null = null;
      for (const entry of entries) {
        if (entry.box.isEmpty()) continue;
        expandedBox.copy(entry.box).expandByScalar(radius);
        // A projectile that begins inside a moving collider should be allowed to exit.
        if (expandedBox.containsPoint(start)) continue;
        const hit = ray.intersectBox(expandedBox, hitPoint);
        if (!hit) continue;
        const distance = start.distanceTo(hit);
        if (distance > segmentLength + 0.0001 || distance >= bestDistance) continue;
        bestDistance = distance;
        bestEntry = entry;
        bestPoint.copy(hit);
        collisionNormalAt(hit, expandedBox, bestNormal);
      }

      if (!bestEntry) return false;
      result.point.copy(bestPoint);
      result.normal.copy(bestNormal);
      result.restitution = bestEntry.restitution;
      result.object = bestEntry.object;
      return true;
    },
    snapshot() {
      return {
        active: entries.filter((entry) => !entry.box.isEmpty()).length,
        total: entries.length,
      };
    },
    dispose() {
      entries.length = 0;
    },
  };
}
