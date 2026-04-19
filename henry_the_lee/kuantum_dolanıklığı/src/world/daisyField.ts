import * as THREE from "three";
import { WORLD } from "../config/config";
import { bumpHeightAt } from "./waveTerrainMath";
import type { WaveFloorHandle } from "./waveFloor";
import {
  buildInstancedParts,
  fitObjectToBox,
  loadGltfScene,
  type InstancedPart,
} from "../utils/instancedFromGltf";

const DAISY_GLB = "../../henry_the_lee/kuantum_dolaniklik/models/meshy_daisy.glb";

export interface DaisyFieldHandle {
  group: THREE.Group;
  ready: Promise<void>;
  update(time: number): void;
  dispose(): void;
}

export function createDaisyField(
  scene: THREE.Scene,
  wave: WaveFloorHandle,
  options?: { enabled?: boolean },
): DaisyFieldHandle {
  /** Dokunmatik: GLB yüklenmez, sahneye eklenmez — performans. */
  if (options?.enabled === false) {
    const group = new THREE.Group();
    group.name = "kd-daisy-field";
    return {
      group,
      ready: Promise.resolve(),
      update() {},
      dispose() {},
    };
  }

  const half = WORLD.half;
  const innerClear = 8;
  /** Seyrek papatya — daha az örnek, daha hafif sahne. */
  const target = Math.min(120, Math.max(36, Math.floor(((half * 2 - 4) ** 2) / 900)));

  const xs: number[] = [];
  const zs: number[] = [];
  const scales: number[] = [];
  const rotY: number[] = [];

  let tries = 0;
  while (xs.length < target && tries < target * 14) {
    tries++;
    const x = (Math.random() * 2 - 1) * (half - 2);
    const z = (Math.random() * 2 - 1) * (half - 2);
    const r2 = x * x + z * z;
    if (r2 < innerClear * innerClear) continue;
    xs.push(x);
    zs.push(z);
    scales.push(0.48 + Math.random() * 1.05);
    rotY.push(Math.random() * Math.PI * 2);
  }

  const n = xs.length;
  const bumpPre = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    bumpPre[i] = bumpHeightAt(xs[i]!, zs[i]!);
  }

  const group = new THREE.Group();
  group.name = "kd-daisy-field";
  scene.add(group);

  let disposed = false;
  let parts: InstancedPart[] = [];
  const dummy = new THREE.Object3D();
  const yLift = 0.012;

  const ready = loadGltfScene(DAISY_GLB)
    .then((root) => {
      if (disposed) {
        root.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = c as THREE.Mesh;
            m.geometry?.dispose();
            const mat = m.material;
            if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
            else mat?.dispose();
          }
        });
        return;
      }
      fitObjectToBox(root, 0.46, true);
      parts = buildInstancedParts(root, n);
      if (parts.length === 0) {
        throw new Error("Papatya GLB içinde mesh bulunamadı.");
      }
      const id = new THREE.Matrix4();
      for (const p of parts) {
        group.add(p.mesh);
        for (let i = 0; i < n; i++) {
          p.mesh.setMatrixAt(i, id);
        }
        p.mesh.instanceMatrix.needsUpdate = true;
      }
      root.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          m.geometry?.dispose();
        }
      });
    })
    .catch((e) => {
      console.warn("[kd-daisyField] GLB yüklenemedi:", e);
      return undefined;
    });

  function layout(time: number) {
    if (parts.length === 0) return;
    for (let i = 0; i < n; i++) {
      const x = xs[i]!;
      const z = zs[i]!;
      const base = wave.getHeightQuick(x, z, time, bumpPre[i]!);
      const s = scales[i]!;
      dummy.position.set(x, base + yLift, z);
      dummy.rotation.set(0, rotY[i]!, 0);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      for (const p of parts) {
        p.mesh.setMatrixAt(i, dummy.matrix);
      }
    }
    for (const p of parts) {
      p.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  void ready.then(() => {
    if (!disposed && parts.length > 0) layout(0);
  });

  return {
    group,
    ready,
    update(time: number) {
      layout(time);
    },
    dispose() {
      disposed = true;
      scene.remove(group);
      for (const p of parts) {
        p.disposeGeometry();
        group.remove(p.mesh);
        const mats = p.mesh.material;
        if (Array.isArray(mats)) mats.forEach((m) => m.dispose());
        else mats.dispose();
      }
      parts = [];
    },
  };
}
