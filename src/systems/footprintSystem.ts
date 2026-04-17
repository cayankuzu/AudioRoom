import * as THREE from "three";
import type { PlayerPose } from "../types";
import { FOOTPRINT, PLAYER } from "../config/config";

export interface FootprintSystem {
  object: THREE.Group;
  update(delta: number, pose: PlayerPose, getHeightAt: (x: number, z: number) => number): void;
}

/**
 * Ayak izi dokusu — siyah kum / toz zeminde net görünmesi için AÇIK kum
 * bozunması + belirgin kontrast. Daha önce izler zayıf görünüyordu; bu
 * sürümde opaklık ve kontrast artırıldı ve kenarlar yumuşak tutuldu.
 */
function createFootprintTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }
  ctx.clearRect(0, 0, 192, 192);

  /** Dış halo — açık kum bozunması (izin dış çeperi). */
  const halo = ctx.createRadialGradient(96, 96, 14, 96, 96, 92);
  halo.addColorStop(0, "rgba(228, 218, 196, 0.95)");
  halo.addColorStop(0.45, "rgba(184, 172, 148, 0.78)");
  halo.addColorStop(0.85, "rgba(140, 128, 106, 0.18)");
  halo.addColorStop(1, "rgba(140, 128, 106, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(96, 96, 52, 86, 0, 0, Math.PI * 2);
  ctx.fill();

  /** İç gölge — topuk basıncı (kumda oluşan küçük çukur). */
  const shadow = ctx.createRadialGradient(96, 118, 3, 96, 118, 34);
  shadow.addColorStop(0, "rgba(14, 10, 8, 0.72)");
  shadow.addColorStop(1, "rgba(14, 10, 8, 0)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.ellipse(96, 118, 27, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  const dot = (cx: number, cy: number, r: number, a: number) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(232, 220, 196, ${a})`);
    g.addColorStop(1, "rgba(232, 220, 196, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  /** Parmak uçları — daha belirgin. */
  dot(96, 40, 15, 0.92);
  dot(76, 60, 10, 0.74);
  dot(116, 60, 10, 0.74);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
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
   *  NOT: polygonOffsetFactor pozitif yapıldı — izleri kameraya yaklaştırır,
   *  terrain'in içine kaybolmasını engeller (önceki `-2` değeri bazı
   *  yamaçlarda izin zeminin arkasında kalmasına yol açıyordu).
   */
  function makeMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: FOOTPRINT.opacity,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -6,
      fog: false,
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

      /**
       * Y-ofset'i terrain üstünde güvenli bir miktar yüksek tut — çok küçük
       * mikro yükseklik farkları yüzünden izler kaybolmasın. Doku hafif
       * yukarıda olsa bile polygonOffset sayesinde zemine yapışık görünür.
       */
      mesh.position.set(fx, fy + 0.035, fz);
      mesh.quaternion.copy(quat);
      /** Yaw rotasyonu — izler oyuncunun gittiği yöne baksın. */
      mesh.rotateY(pose.yaw);
      /** Hafif boyut varyasyonu + koşuda biraz daha büyük iz. */
      const sprintBoost = pose.speed > PLAYER.walkSpeed + 0.2 ? 1.08 : 1;
      const scale = (0.95 + Math.random() * 0.12) * sprintBoost;
      mesh.scale.setScalar(scale);
      /** Her zaman terrain'in üzerine çizilsin. */
      mesh.renderOrder = 2;
      mesh.frustumCulled = true;

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
