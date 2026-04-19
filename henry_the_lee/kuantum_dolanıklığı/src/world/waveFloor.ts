import * as THREE from "three";
import { FLOOR, PALETTE, WORLD } from "../config/config";
import {
  bumpHeightAt,
  rippleHeightAt,
  sinWavesHeightAt,
  type TerrainRipple,
} from "./waveTerrainMath";

export type Ripple = TerrainRipple;

/**
 * Düzleştirilmiş yükseklik alanından normal — `computeVertexNormals()` yerine.
 */
function updateHeightfieldNormals(
  posAttr: THREE.BufferAttribute,
  normalAttr: THREE.BufferAttribute,
  seg: number,
): void {
  const row = seg + 1;
  const n = posAttr.count;
  for (let idx = 0; idx < n; idx++) {
    const j = (idx / row) | 0;
    const i = idx % row;
    const idxL = j * row + (i > 0 ? i - 1 : i);
    const idxR = j * row + (i < seg ? i + 1 : i);
    const idxU = (j > 0 ? j - 1 : j) * row + i;
    const idxD = (j < seg ? j + 1 : j) * row + i;
    const yL = posAttr.getY(idxL);
    const yR = posAttr.getY(idxR);
    const yU = posAttr.getY(idxU);
    const yD = posAttr.getY(idxD);
    const xL = posAttr.getX(idxL);
    const xR = posAttr.getX(idxR);
    const zU = posAttr.getZ(idxU);
    const zD = posAttr.getZ(idxD);
    const dx = xR - xL;
    const dz = zD - zU;
    const dhdx = Math.abs(dx) > 1e-8 ? (yR - yL) / dx : 0;
    const dhdz = Math.abs(dz) > 1e-8 ? (yD - yU) / dz : 0;
    const nx = -dhdx;
    const ny = 1;
    const nz = -dhdz;
    const inv = 1 / Math.hypot(nx, ny, nz);
    normalAttr.setXYZ(idx, nx * inv, ny * inv, nz * inv);
  }
  normalAttr.needsUpdate = true;
}

export interface WaveFloorHandle {
  mesh: THREE.Mesh;
  update(time: number): void;
  getHeightAt(x: number, z: number): number;
  /**
   * Sabit (x,z) için önceden hesaplanmış bump ile yükseklik — papatya
   * tarlasında `bumpHeightAt` tekrarını atlar.
   */
  getHeightQuick(x: number, z: number, time: number, bumpFixed: number): number;
  addRipple(x: number, z: number, time: number, amplitude?: number): void;
}

export function createWaveFloor(scene: THREE.Scene): WaveFloorHandle {
  const half = WORLD.half;
  const seg = FLOOR.segments;

  const geo = new THREE.PlaneGeometry(half * 2, half * 2, seg, seg);
  geo.rotateX(-Math.PI / 2);

  /** Lambert — MeshStandard’a göre daha ucuz; emissive ile sarı ton korunur. */
  const mat = new THREE.MeshLambertMaterial({
    color: PALETTE.coverYellowSoft,
    emissive: new THREE.Color(PALETTE.coverYellow).multiplyScalar(0.28),
    emissiveIntensity: 1.0,
    flatShading: true,
    fog: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = FLOOR.baseY;
  scene.add(mesh);

  const ripples: Ripple[] = [];
  const maxRipples = FLOOR.step.maxAlive;

  const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
  const normalAttr = geo.getAttribute("normal") as THREE.BufferAttribute;
  const baseXZ: { x: number; z: number }[] = [];
  for (let i = 0; i < posAttr.count; i++) {
    baseXZ.push({ x: posAttr.getX(i), z: posAttr.getZ(i) });
  }

  /** Köşe başına bir kez Gauss bump — her karede 17×exp tekrarı yok. */
  const vertexBump = new Float32Array(posAttr.count);
  for (let i = 0; i < posAttr.count; i++) {
    const { x, z } = baseXZ[i]!;
    vertexBump[i] = bumpHeightAt(x, z);
  }

  let lastTime = 0;
  let normalTick = 0;

  const getHeightAt = (x: number, z: number): number =>
    bumpHeightAt(x, z) +
    sinWavesHeightAt(x, z, lastTime) +
    rippleHeightAt(x, z, lastTime, ripples);

  const getHeightQuick = (
    x: number,
    z: number,
    time: number,
    bumpFixed: number,
  ): number =>
    bumpFixed +
    sinWavesHeightAt(x, z, time) +
    rippleHeightAt(x, z, time, ripples);

  const update = (time: number): void => {
    lastTime = time;

    for (let i = ripples.length - 1; i >= 0; i--) {
      if (time - ripples[i]!.birth > FLOOR.step.decay * 4.5) {
        ripples.splice(i, 1);
      }
    }

    for (let i = 0; i < posAttr.count; i++) {
      const { x, z } = baseXZ[i]!;
      const h =
        vertexBump[i]! +
        sinWavesHeightAt(x, z, time) +
        rippleHeightAt(x, z, time, ripples);
      posAttr.setY(i, h);
    }
    posAttr.needsUpdate = true;

    normalTick++;
    if (normalTick >= 2) {
      normalTick = 0;
      updateHeightfieldNormals(posAttr, normalAttr, seg);
    }
  };

  const addRipple = (x: number, z: number, time: number, amplitude?: number) => {
    if (ripples.length >= maxRipples) {
      ripples.shift();
    }
    ripples.push({
      x,
      z,
      birth: time,
      amplitude: amplitude ?? FLOOR.step.amplitude,
    });
  };

  return { mesh, update, getHeightAt, getHeightQuick, addRipple };
}
