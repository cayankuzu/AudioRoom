import * as THREE from "three";

/**
 * Ayak izi sistemi — oyuncu yürürken zemine bir sağ bir sol ayak izi
 * bırakır. Et dokulu zeminde koyu, hafif ıslak görünümlü iz; zaman
 * içinde solar (kan damarları yeniler).
 *
 * Implementation:
 *   - Sınırlı havuz (default 40 iz) — InstancedMesh kullanmak yerine
 *     basit Mesh dizisi (fade için per-instance opacity gerekiyor;
 *     InstancedMesh ile shader override gerekirdi).
 *   - Her iz: küçük plane, ayak izi şeklinde texture (canvas üretimli).
 *   - Sol/sağ izler simetrik — texture aynı, scale.x işareti farklı.
 *   - Spawn yönü `forwardDir` parametresinden alınır; iz aynı yöne
 *     bakar (rotation.y = -atan2(dirX, dirZ) + π).
 *   - Y konumu her frame yenilenir — zemin deforme olduğu için iz
 *     de altta yüzer/iner.
 */

export interface FootprintsHandle {
  group: THREE.Group;
  /**
   * Yürüyüş adımında çağrılır. Sistem L/R alternasyonunu kendi
   * tutar; spawn yönü için `dirX`, `dirZ` (normalize edilmiş ileri
   * vektör) verilmesi yeterlidir.
   */
  drop(x: number, z: number, dirX: number, dirZ: number): void;
  /** Zemin deformasyonuna uydurur ve yaşayan izlerin opacity'sini düşürür. */
  update(time: number, getHeightAt: (x: number, z: number) => number): void;
}

interface Footprint {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  birth: number;
  /** Zemin üstündeki ofset (yumuşak vurgulu kalkık) */
  yOffset: number;
}

function makeFootprintTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size * 1.6;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /** Ayak ana topuğu — büyük oval. */
  const heelGrad = ctx.createRadialGradient(
    size * 0.5,
    size * 1.25,
    1,
    size * 0.5,
    size * 1.25,
    size * 0.45,
  );
  heelGrad.addColorStop(0, "rgba(20,4,2,0.95)");
  heelGrad.addColorStop(0.7, "rgba(20,4,2,0.55)");
  heelGrad.addColorStop(1, "rgba(20,4,2,0)");
  ctx.fillStyle = heelGrad;
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 1.25, size * 0.34, size * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  /** Ön taban (ball of foot) — orta oval. */
  const ballGrad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.55,
    1,
    size * 0.5,
    size * 0.55,
    size * 0.42,
  );
  ballGrad.addColorStop(0, "rgba(20,4,2,0.95)");
  ballGrad.addColorStop(0.7, "rgba(20,4,2,0.5)");
  ballGrad.addColorStop(1, "rgba(20,4,2,0)");
  ctx.fillStyle = ballGrad;
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.55, size * 0.36, size * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();

  /** Köprü — topuk ile ön taban arasında ince bağlantı. */
  ctx.fillStyle = "rgba(20,4,2,0.55)";
  ctx.beginPath();
  ctx.moveTo(size * 0.36, size * 0.65);
  ctx.lineTo(size * 0.64, size * 0.65);
  ctx.lineTo(size * 0.62, size * 1.10);
  ctx.lineTo(size * 0.38, size * 1.10);
  ctx.closePath();
  ctx.fill();

  /** Beş parmak izleri. */
  const toes: Array<[number, number, number]> = [
    [0.50, 0.18, 0.085], // baş parmak
    [0.34, 0.20, 0.062],
    [0.22, 0.27, 0.052],
    [0.13, 0.35, 0.044],
    [0.06, 0.44, 0.036],
  ];
  for (const [tx, ty, tr] of toes) {
    /** Sol ayak için x sağa, simetri ile sağ ayakta texture x-flip. */
    const xPos = size * (0.5 + (tx - 0.5));
    const yPos = size * ty;
    const grad = ctx.createRadialGradient(xPos, yPos, 0, xPos, yPos, size * tr);
    grad.addColorStop(0, "rgba(20,4,2,0.92)");
    grad.addColorStop(1, "rgba(20,4,2,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(xPos, yPos, size * tr, 0, Math.PI * 2);
    ctx.fill();
  }

  /** İslak kor parlama — kan damarına basıldığında hafif sıcak hâle. */
  const wet = ctx.createRadialGradient(
    size * 0.5,
    size * 0.95,
    size * 0.05,
    size * 0.5,
    size * 0.95,
    size * 0.5,
  );
  wet.addColorStop(0, "rgba(214,90,54,0.18)");
  wet.addColorStop(1, "rgba(214,90,54,0)");
  ctx.fillStyle = wet;
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.95, size * 0.5, size * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

const POOL_SIZE = 40;
const FOOT_LIFE = 14; // saniye
const FOOT_SIZE = 0.42; // metre genişlik
const FOOT_LENGTH = 0.68; // metre uzunluk
const STANCE_OFFSET = 0.22; // sol/sağ omurga ekseni dışı

export function createFootprints(scene: THREE.Scene): FootprintsHandle {
  const group = new THREE.Group();
  group.name = "footprints";
  scene.add(group);

  const tex = makeFootprintTexture();
  const baseGeo = new THREE.PlaneGeometry(FOOT_SIZE, FOOT_LENGTH, 1, 1);
  baseGeo.rotateX(-Math.PI / 2); // yere yatır

  const pool: Footprint[] = [];
  for (let i = 0; i < POOL_SIZE; i += 1) {
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      fog: true,
    });
    const mesh = new THREE.Mesh(baseGeo, mat);
    mesh.visible = false;
    mesh.renderOrder = 2;
    group.add(mesh);
    pool.push({ mesh, birth: -9999, yOffset: 0.04 });
  }

  /** Round-robin pool index. */
  let nextIdx = 0;
  /** L/R alternation — ilk adım sağ. */
  let stepIsLeft = false;
  /** Spawn time references */
  let lastNow = 0;

  return {
    group,
    drop(x, z, dirX, dirZ) {
      stepIsLeft = !stepIsLeft;
      const slot = pool[nextIdx]!;
      nextIdx = (nextIdx + 1) % POOL_SIZE;

      /** İleri vektör. dirX/dirZ normalize varsayımı; değilse normalize et. */
      let fx = dirX;
      let fz = dirZ;
      const fl = Math.hypot(fx, fz);
      if (fl < 1e-4) {
        fx = 0;
        fz = 1;
      } else {
        fx /= fl;
        fz /= fl;
      }
      /** Sağ vektör — XZ düzleminde 90° saat yönü. */
      const rx = -fz;
      const rz = fx;
      /** Sol ayak için sol tarafa, sağ ayak için sağ tarafa ofset. */
      const sign = stepIsLeft ? -1 : 1;
      const ox = x + rx * STANCE_OFFSET * sign;
      const oz = z + rz * STANCE_OFFSET * sign;

      slot.mesh.position.set(ox, 0, oz);
      /** Mesh +Z ekseni (uzunluk yönü) ileri vektörle hizalanmalı. */
      const yaw = Math.atan2(fx, fz);
      slot.mesh.rotation.set(0, yaw, 0);
      /** Sol ayakta x-mirror — texture simetrik baş parmak yönü için. */
      slot.mesh.scale.set(sign, 1, 1);
      slot.mesh.material.opacity = 0.0;
      slot.mesh.visible = true;
      slot.birth = lastNow;
    },
    update(time, getHeightAt) {
      lastNow = time;
      for (const fp of pool) {
        if (!fp.mesh.visible) continue;
        const age = time - fp.birth;
        if (age >= FOOT_LIFE) {
          fp.mesh.visible = false;
          fp.mesh.material.opacity = 0;
          continue;
        }
        /** Hızlı fade-in (0..0.25 s) ardından yavaş fade-out. */
        let a: number;
        if (age < 0.25) {
          a = (age / 0.25) * 0.85;
        } else {
          const t = (age - 0.25) / (FOOT_LIFE - 0.25);
          a = 0.85 * (1 - t) * (1 - t);
        }
        fp.mesh.material.opacity = a;

        /** Zemin deformasyonuna uy — y konumunu her frame ayarla. */
        const gx = fp.mesh.position.x;
        const gz = fp.mesh.position.z;
        const gy = getHeightAt(gx, gz);
        fp.mesh.position.y = gy + fp.yOffset;
      }
    },
  };
}
