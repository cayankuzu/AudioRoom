import * as THREE from "three";
import { PALETTE, WORLD } from "../config/config";

/**
 * Atmosferik toz — iki katman:
 *   - İnce amber parçacıklar (yüksek sayı, küçük boy) → “kuantum alanı” hissi.
 *   - Büyük, yavaş süt parçacıklar → derinlik ve hacim.
 *
 * Tüm partiküller `WORLD.half` ile ölçeklenir; geniş odada da ufukta doluluk.
 */
export interface ParticlesHandle {
  /** Sahneye eklenen grup (isteğe bağlı dispose için). */
  group: THREE.Group;
  update(time: number, delta: number): void;
}

function makeLayer(
  count: number,
  radius: number,
  ceil: number,
  color: THREE.ColorRepresentation,
  size: number,
  opacity: number,
  speedMin: number,
  speedMax: number,
): { points: THREE.Points; speeds: Float32Array; phases: Float32Array } {
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = Math.sqrt(Math.random()) * radius;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.random() * ceil;
    positions[i * 3 + 2] = Math.sin(a) * r;
    phases[i] = Math.random() * Math.PI * 2;
    speeds[i] = speedMin + Math.random() * (speedMax - speedMin);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: new THREE.Color(color),
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, speeds, phases };
}

export function createParticles(
  scene: THREE.Scene,
  options: { count?: number; radius?: number; ceil?: number } = {},
): ParticlesHandle {
  const half = WORLD.half;
  const countFine = options.count ?? 160;
  const radius = options.radius ?? Math.min(half * 0.88, 155);
  const ceil = options.ceil ?? Math.min(WORLD.ceilingHeight * 0.82, 34);

  const group = new THREE.Group();
  group.name = "kd-atmosphere-particles";

  const fine = makeLayer(
    countFine,
    radius,
    ceil,
    PALETTE.amberWarm,
    0.042,
    0.48,
    0.14,
    0.52,
  );
  const coarse = makeLayer(
    Math.max(80, Math.floor(countFine * 0.18)),
    radius * 1.02,
    ceil * 1.05,
    "#fff4dc",
    0.11,
    0.22,
    0.05,
    0.12,
  );

  group.add(fine.points);
  group.add(coarse.points);
  scene.add(group);

  const posA = fine.points.geometry.getAttribute("position") as THREE.BufferAttribute;
  const posB = coarse.points.geometry.getAttribute("position") as THREE.BufferAttribute;

  return {
    group,
    update(time, delta) {
      for (let i = 0; i < countFine; i++) {
        let y = posA.getY(i) + fine.speeds[i] * delta * 0.62;
        if (y > ceil) y = 0.05 + Math.random() * 0.45;
        posA.setY(i, y);
        const baseX = posA.getX(i);
        const baseZ = posA.getZ(i);
        const w = Math.sin(time * 0.38 + fine.phases[i]) * 0.0022;
        posA.setX(i, baseX + w);
        posA.setZ(i, baseZ + Math.cos(time * 0.31 + fine.phases[i]) * 0.0022);
      }
      posA.needsUpdate = true;

      const nB = coarse.speeds.length;
      for (let i = 0; i < nB; i++) {
        let y = posB.getY(i) + coarse.speeds[i] * delta * 0.38;
        if (y > ceil * 1.02) y = 0.1 + Math.random() * 0.5;
        posB.setY(i, y);
        const baseX = posB.getX(i);
        const baseZ = posB.getZ(i);
        const w = Math.sin(time * 0.22 + coarse.phases[i]) * 0.004;
        posB.setX(i, baseX + w);
        posB.setZ(i, baseZ + Math.cos(time * 0.19 + coarse.phases[i]) * 0.004);
      }
      posB.needsUpdate = true;
    },
  };
}
