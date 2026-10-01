import * as THREE from "three";

export interface CircleCollider {
  x: number;
  z: number;
  r: number;
  enabled: boolean;
  /** Dikey kapsam (dünya y); verilirse oyuncu altından geçebilir ya da üstünden atlayabilir. */
  minY?: number;
  maxY?: number;
  /** Verilirse yalnızca bu nesne (ve ataları) görünürken engeller. */
  owner?: THREE.Object3D;
}

export type Bounds =
  | { type: "circle"; cx: number; cz: number; r: number }
  | { type: "box"; halfX: number; halfZ: number };

export interface SolidOptions {
  /** Ayak izine eklenen pay (metre; eksi değer daraltır). */
  pad?: number;
  /** En fazla kaç daire (uzun nesneler boyuna dairelerle örtülür). */
  maxCircles?: number;
  /** Ek koşul: false iken nesne katı değildir (ör. yalnızca belirli bir anda). */
  when?: () => boolean;
  /** "round": ağaç, direk, küre gibi yuvarlak izler; varsayılan kutu (köşeler de örtülür). */
  shape?: "box" | "round";
}

/** Bir 3B nesnenin ayak izini izleyen çarpışma dairesi grubu. */
export interface Solid {
  readonly circles: readonly CircleCollider[];
  /** Nesne sahneden kalktıysa ya da artık katı olmamalıysa. */
  remove(): void;
}

/** Oyuncuyu engellerden ve dünya sınırından dışarı iten basit 2B (XZ) çarpışma. */
export interface Colliders {
  addCircle(x: number, z: number, r: number, owner?: THREE.Object3D): CircleCollider;
  /**
   * Nesneyi katı yapar: yerel sınır kutusundan ayak izi daireleri çıkarılır ve her
   * karede nesnenin dünya dönüşümüyle taşınır. Nesne (ya da bir atası) görünmezken
   * çarpışma kapalıdır; hareket eden, dönen, büyüyen, beliren nesneler de katıdır.
   */
  solid(object: THREE.Object3D, options?: SolidOptions): Solid;
  setBounds(bounds: Bounds): void;
  resolve(position: THREE.Vector3, radius: number): void;
  /** Bir noktanın engellerden ve sınırdan uzak olup olmadığı (yerleşim için). */
  isFree(x: number, z: number, clearance: number): boolean;
  /** Test ve denetim için: etkin çarpışma daireleri; katı nesnelerinkiler nesnesiyle (iç içe girme taraması). */
  list(): Array<{ circle: CircleCollider; object: THREE.Object3D | null }>;
}

/** Oyuncunun boyu: tavanı bundan yüksek nesnelerin altından geçilebilir. */
const PLAYER_HEIGHT = 1.8;

interface SolidEntry {
  object: THREE.Object3D;
  circles: CircleCollider[];
  /** Nesne uzayında daire merkezleri ve yarıçapları. */
  local: { x: number; z: number; r: number }[];
  box: THREE.Box3;
  when?: () => boolean;
}

const corner = new THREE.Vector3();
const inverse = new THREE.Matrix4();
const relative = new THREE.Matrix4();
const column = new THREE.Vector3();

function localBox(object: THREE.Object3D): THREE.Box3 {
  object.updateWorldMatrix(true, true);
  inverse.copy(object.matrixWorld).invert();
  const box = new THREE.Box3();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    if (bb.isEmpty()) return;
    relative.multiplyMatrices(inverse, mesh.matrixWorld);
    for (let i = 0; i < 8; i += 1) {
      corner.set(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(relative);
      box.expandByPoint(corner);
    }
  });
  return box;
}

function visibleInWorld(object: THREE.Object3D): boolean {
  for (let node: THREE.Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
}

export function createColliders(): Colliders {
  const circles: CircleCollider[] = [];
  const solids: SolidEntry[] = [];
  let bounds: Bounds | null = null;

  const insideBounds = (x: number, z: number, margin: number) => {
    if (!bounds) return true;
    if (bounds.type === "circle") return Math.hypot(x - bounds.cx, z - bounds.cz) <= bounds.r - margin;
    return Math.abs(x) <= bounds.halfX - margin && Math.abs(z) <= bounds.halfZ - margin;
  };

  const syncSolids = () => {
    for (const solid of solids) {
      const on = (solid.when?.() ?? true) && visibleInWorld(solid.object);
      if (!on) {
        for (const c of solid.circles) c.enabled = false;
        continue;
      }
      const m = solid.object.matrixWorld;
      // Yatay ölçek (x ve z sütunlarının boyu); yarıçap onunla büyür.
      const scale = Math.max(column.setFromMatrixColumn(m, 0).length(), column.setFromMatrixColumn(m, 2).length());
      let minY = Infinity;
      let maxY = -Infinity;
      const b = solid.box;
      for (let i = 0; i < 8; i += 1) {
        corner.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(m);
        minY = Math.min(minY, corner.y);
        maxY = Math.max(maxY, corner.y);
      }
      solid.local.forEach((spot, i) => {
        corner.set(spot.x, 0, spot.z).applyMatrix4(m);
        const c = solid.circles[i];
        c.x = corner.x;
        c.z = corner.z;
        c.r = spot.r * scale;
        c.minY = minY;
        c.maxY = maxY;
        c.enabled = true;
      });
    }
  };

  return {
    addCircle(x, z, r, owner) {
      const collider: CircleCollider = { x, z, r, enabled: true, owner };
      circles.push(collider);
      return collider;
    },
    solid(object, options = {}) {
      const box = localBox(object);
      const local: SolidEntry["local"] = [];
      if (!box.isEmpty()) {
        const ex = box.max.x - box.min.x;
        const ez = box.max.z - box.min.z;
        const long = Math.max(ex, ez);
        const short = Math.max(0.05, Math.min(ex, ez));
        const alongX = ex >= ez;
        const cx = (box.min.x + box.max.x) / 2;
        const cz = (box.min.z + box.max.z) / 2;
        const pad = options.pad ?? 0;
        // Uzatılmış nesneler (masa, kayık, tabela) boyuna dizili dairelerle örtülür.
        const count = Math.min(options.maxCircles ?? 8, Math.max(1, Math.round(long / short)));
        const r = (count === 1 && options.shape === "round" ? long / 2 : short / 2) + pad;
        for (let i = 0; i < count; i += 1) {
          const t = count === 1 ? 0 : (i / (count - 1) - 0.5) * (long - short);
          local.push({ x: alongX ? cx + t : cx, z: alongX ? cz : cz + t, r: Math.max(0.05, r) });
        }
        // Kutu izlerinde köşeler: daireler köşeye ulaşmaz, dört küçük daire eklenir.
        if (options.shape !== "round" && long > 0.6) {
          const rc = short * 0.22;
          for (const sx of [-1, 1]) {
            for (const sz of [-1, 1]) local.push({ x: cx + sx * (ex / 2 - rc), z: cz + sz * (ez / 2 - rc), r: Math.max(0.05, rc + pad) });
          }
        }
      }
      const entry: SolidEntry = {
        object,
        box,
        local,
        circles: local.map((spot) => ({ x: spot.x, z: spot.z, r: spot.r, enabled: false })),
        when: options.when,
      };
      solids.push(entry);
      return {
        circles: entry.circles,
        remove() {
          const index = solids.indexOf(entry);
          if (index >= 0) solids.splice(index, 1);
        },
      };
    },
    setBounds(next) {
      bounds = next;
    },
    list() {
      syncSolids();
      return [
        ...circles.filter((c) => c.enabled && (!c.owner || visibleInWorld(c.owner))).map((circle) => ({ circle, object: circle.owner ?? null })),
        ...solids.flatMap((entry) => entry.circles.filter((c) => c.enabled).map((circle) => ({ circle, object: entry.object }))),
      ];
    },
    resolve(position, radius) {
      syncSolids();
      const push = (c: CircleCollider) => {
        if (!c.enabled) return;
        if (c.owner && !visibleInWorld(c.owner)) return;
        // Altından (baş hizasının üstünde) ya da üstünden (atlarken) geçilebilir.
        if (c.minY !== undefined && position.y + PLAYER_HEIGHT < c.minY) return;
        if (c.maxY !== undefined && position.y > c.maxY) return;
        const dx = position.x - c.x;
        const dz = position.z - c.z;
        const min = c.r + radius;
        const distSq = dx * dx + dz * dz;
        if (distSq >= min * min || distSq === 0) return;
        const dist = Math.sqrt(distSq);
        position.x = c.x + (dx / dist) * min;
        position.z = c.z + (dz / dist) * min;
      };
      for (const c of circles) push(c);
      for (const solid of solids) for (const c of solid.circles) push(c);
      if (!bounds) return;
      if (bounds.type === "circle") {
        const dx = position.x - bounds.cx;
        const dz = position.z - bounds.cz;
        const dist = Math.hypot(dx, dz);
        const max = bounds.r - radius;
        if (dist > max) {
          position.x = bounds.cx + (dx / dist) * max;
          position.z = bounds.cz + (dz / dist) * max;
        }
      } else {
        position.x = Math.max(-bounds.halfX + radius, Math.min(bounds.halfX - radius, position.x));
        position.z = Math.max(-bounds.halfZ + radius, Math.min(bounds.halfZ - radius, position.z));
      }
    },
    isFree(x, z, clearance) {
      if (!insideBounds(x, z, clearance)) return false;
      const clear = (c: CircleCollider) => !c.enabled || (c.owner !== undefined && !visibleInWorld(c.owner)) || Math.hypot(x - c.x, z - c.z) > c.r + clearance;
      return circles.every(clear) && solids.every((solid) => solid.circles.every(clear));
    },
  };
}
