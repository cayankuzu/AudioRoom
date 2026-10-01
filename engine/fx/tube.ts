import * as THREE from "three";

/**
 * Canlı ince tüp (iplik, halat, akan sıvı): `points` dizisi her karede güncellenir, `build` yüzeyi yeniden kurar.
 * Noktalar tüpün kendi ebeveyninin uzayındadır.
 */
export interface Tube {
  readonly mesh: THREE.Mesh;
  readonly points: THREE.Vector3[];
  readonly segments: number;
  /** radius: sabit ya da uzunluk boyunca (u 0..1); reveal 0..1: baştan itibaren görünen kısım. */
  build(radius: number | ((u: number) => number), reveal?: number): void;
}

export function createTube(material: THREE.Material, segments: number, radial = 6): Tube {
  const count = (segments + 1) * radial;
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const index: number[] = [];
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * radial + j;
      const c = i * radial + ((j + 1) % radial);
      index.push(a, a + radial, c, c, a + radial, c + radial);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(index);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  const points = Array.from({ length: segments + 1 }, () => new THREE.Vector3());
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  return {
    mesh,
    points,
    segments,
    build(radius, reveal = 1) {
      const shown = Math.floor(THREE.MathUtils.clamp(reveal, 0, 1) * segments);
      mesh.visible = shown > 0;
      if (!mesh.visible) return;
      for (let i = 0; i <= segments; i += 1) {
        tangent.copy(points[Math.min(segments, i + 1)]).sub(points[Math.max(0, i - 1)]);
        if (tangent.lengthSq() < 1e-12) tangent.set(0, -1, 0);
        tangent.normalize();
        if (Math.abs(tangent.x) > 0.9) side.set(0, 0, 1);
        else side.set(1, 0, 0);
        side.cross(tangent).normalize();
        up.copy(tangent).cross(side);
        const r = typeof radius === "number" ? radius : radius(i / segments);
        for (let j = 0; j < radial; j += 1) {
          const a = (j / radial) * Math.PI * 2;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const o = (i * radial + j) * 3;
          const nx = side.x * ca + up.x * sa;
          const ny = side.y * ca + up.y * sa;
          const nz = side.z * ca + up.z * sa;
          normals[o] = nx;
          normals[o + 1] = ny;
          normals[o + 2] = nz;
          positions[o] = points[i].x + nx * r;
          positions[o + 1] = points[i].y + ny * r;
          positions[o + 2] = points[i].z + nz * r;
        }
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.normal.needsUpdate = true;
      geometry.setDrawRange(0, shown * radial * 6);
    },
  };
}
