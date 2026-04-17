import * as THREE from "three";
import type { PlayerPose } from "../types";
import { FOOTPRINT, PLAYER } from "../config/config";

export interface FootprintSystem {
  object: THREE.Group;
  update(delta: number, pose: PlayerPose, getHeightAt: (x: number, z: number) => number): void;
}

/**
 * Ayak izi dokusu — koyu siyah arazide görünmesi için AÇIK renk (toz
 * bozunması) katmanlar.
 *
 *  - Dış oval: açık bej yığıntı hissi (sürtünen kum).
 *  - Orta: hafif daha koyu gölge (topuk basıncı).
 *  - Parmak uçları: küçük açık noktalar.
 */
function createFootprintTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  ctx.clearRect(0, 0, 128, 128);

  /** Dış halo — açık kum bozunması. */
  const halo = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  halo.addColorStop(0, "rgba(210, 198, 174, 0.88)");
  halo.addColorStop(0.55, "rgba(160, 149, 128, 0.58)");
  halo.addColorStop(1, "rgba(140, 128, 106, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(64, 64, 34, 56, 0, 0, Math.PI * 2);
  ctx.fill();

  /** İç gölge — topuk basıncı. */
  const shadow = ctx.createRadialGradient(64, 78, 2, 64, 78, 22);
  shadow.addColorStop(0, "rgba(20, 16, 12, 0.55)");
  shadow.addColorStop(1, "rgba(20, 16, 12, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(64, 78, 18, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  const dot = (cx: number, cy: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(220, 208, 184, ${a})`);
    g.addColorStop(1, "rgba(220, 208, 184, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  dot(64, 28, 10, 0.78);
  dot(52, 42, 6.5, 0.58);
  dot(76, 42, 6.5, 0.58);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

interface Print {
  mesh: THREE.Mesh;
  age: number;
}

/**
 * Ayak izi sistemi — düzeltildi:
 *  - lastPos oyuncunun gerçek başlangıç pozisyonundan okur (ilk iz zıplamaz)
 *  - kumda net görünürlük için opaklık ve boyut artırıldı
 *  - doku kümesi paylaşımlı (tek texture + tek material) → daha az GC baskısı
 *  - izler zemin normaline yaklaşık hizalanır (sağlam surface alignment)
 *  - koşu modunda adım daha sık → dinamik hissi
 *  - oyuncu durduğunda iz üretimi durur
 */
export function createFootprintSystem(): FootprintSystem {
  const object = new THREE.Group();
  const tex = createFootprintTexture();

  const geometry = new THREE.PlaneGeometry(FOOTPRINT.size.w, FOOTPRINT.size.l);
  geometry.rotateX(-Math.PI / 2);

  /** Shared material — instance başına clone edilir (opacity bağımsız fade için).
   *  `toneMapped: false` → tone mapping izini koyulaştırmasın, görünür kalsın.
   *  `depthWrite: false` + polygonOffset → z-fight/gömülme olmaz.
   */
  function makeMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: FOOTPRINT.opacity,
      depthWrite: false,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  }

  const prints: Print[] = [];
  const lastPos = new THREE.Vector3();
  let lastInitialized = false;
  let lastStep = 0;
  let stride = 1;

  const sampleA = new THREE.Vector3();
  const sampleB = new THREE.Vector3();
  const sampleC = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const quat = new THREE.Quaternion();

  return {
    object,
    update(delta, pose, getHeightAt) {
      /** Opaklık fade + yaş kontrolü. */
      for (let i = prints.length - 1; i >= 0; i -= 1) {
        const p = prints[i];
        p.age += delta;
        const t = p.age / FOOTPRINT.lifetime;
        if (t >= 1) {
          object.remove(p.mesh);
          (p.mesh.material as THREE.Material).dispose();
          prints.splice(i, 1);
          continue;
        }
        const m = p.mesh.material as THREE.MeshBasicMaterial;
        /** İlk %35'te hafif koyulaşma sonra yumuşak fade. */
        const fade = t < 0.1 ? 1 : Math.pow(1 - (t - 0.1) / 0.9, 1.1);
        m.opacity = FOOTPRINT.opacity * fade;
      }

      if (!lastInitialized) {
        lastPos.copy(pose.position);
        lastInitialized = true;
        return;
      }

      if (!pose.grounded || pose.speed < 0.35) {
        lastPos.copy(pose.position);
        return;
      }

      const dx = pose.position.x - lastPos.x;
      const dz = pose.position.z - lastPos.z;
      const moved = Math.hypot(dx, dz);
      lastStep += moved;
      lastPos.copy(pose.position);

      /** Koşuda adım aralığı daralır, yürüyüşte standart. */
      const dynamicStep =
        pose.speed > PLAYER.walkSpeed + 0.2
          ? FOOTPRINT.stepDistance * 0.78
          : FOOTPRINT.stepDistance;

      if (lastStep < dynamicStep) return;
      lastStep = 0;
      stride *= -1;

      const material = makeMaterial();
      const mesh = new THREE.Mesh(geometry, material);

      /** Yanal kayma (sol/sağ ayak). */
      const side = stride * FOOTPRINT.sideOffset;
      const perpX = Math.cos(pose.yaw) * side;
      const perpZ = -Math.sin(pose.yaw) * side;
      const fx = pose.position.x + perpX;
      const fz = pose.position.z + perpZ;
      const fy = getHeightAt(fx, fz);

      /** Basit 3-noktalı normal tahmini → yamaçta doğru hizalama. */
      const eps = 0.35;
      sampleA.set(fx, getHeightAt(fx, fz), fz);
      sampleB.set(fx + eps, getHeightAt(fx + eps, fz), fz);
      sampleC.set(fx, getHeightAt(fx, fz + eps), fz + eps);
      sampleB.sub(sampleA);
      sampleC.sub(sampleA);
      normal.crossVectors(sampleC, sampleB).normalize();
      if (normal.y < 0) normal.multiplyScalar(-1);

      quat.setFromUnitVectors(up, normal);

      mesh.position.set(fx, fy + 0.08, fz);
      mesh.quaternion.copy(quat);
      /** Yaw rotasyonu — izler oyuncunun gittiği yöne baksın. */
      mesh.rotateY(pose.yaw);
      /** Hafif boyut varyasyonu — robotik görünmesin. */
      const scale = 0.92 + Math.random() * 0.14;
      mesh.scale.setScalar(scale);
      /** Her zaman terrain'in üzerine çizilsin. */
      mesh.renderOrder = 1;

      object.add(mesh);
      prints.push({ mesh, age: 0 });

      while (prints.length > FOOTPRINT.maxCount) {
        const old = prints.shift();
        if (old) {
          object.remove(old.mesh);
          (old.mesh.material as THREE.Material).dispose();
        }
      }
    },
  };
}
