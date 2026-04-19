import * as THREE from "three";
import { FLOOR, PALETTE, WORLD } from "../config/config";

/**
 * Kuantum dalgalı zemin — sürekli sinüs katmanları + adım ripple'ları.
 *
 * Mimari:
 *  - Yatay PlaneGeometry, `FLOOR.segments × FLOOR.segments` çözünürlükte.
 *  - Her frame CPU'da köşelerin Y değeri yeniden hesaplanır:
 *      h(x,z,t) = Σ wave_i + Σ ripple_j
 *  - Aynı denklem `getHeightAt(x, z)` ile sahnede yaşayan objelere (oyuncu,
 *    plak, gramofon, kompozisyon) servis edilir → her şey "jöle yüzeyi"
 *    üstünde tutarlı şekilde dalgalanır.
 *
 * Adım ripple'ı:
 *  - `addRipple(x, z, time)` çağrısı yeni damla ekler (FIFO ring buffer).
 *  - Her damla: orijin (x,z), birthTime, amplitude. Halka şeklinde dışa
 *    yayılır ve eksponansiyel söner (decay).
 *
 * Görünüm:
 *  - Materyal: hafif metalik, sıcak siyah-koyu kahverengi taban; ışık
 *    altında dalga sırtları parlar, çukurlar koyulaşır → "uzay sıvısı"
 *    hissi. Sarı kutu içinde okunaklı kontrast.
 */

export interface Ripple {
  x: number;
  z: number;
  birth: number;
  amplitude: number;
}

export interface WaveFloorHandle {
  mesh: THREE.Mesh;
  /** Her frame çağrılır — köşeleri günceller. */
  update(time: number): void;
  /** Dünya (x,z) noktasındaki anlık yüzey yüksekliği (Y). */
  getHeightAt(x: number, z: number): number;
  /** Yeni adım ripple'ı ekle. */
  addRipple(x: number, z: number, time: number, amplitude?: number): void;
}

/**
 * Statik gauss tepe/çukur katkısı — sahne sabit topografyası. Zaman
 * bağımlı değil. Bumps konfigürasyonundan toplanır.
 */
function bumpHeight(x: number, z: number): number {
  let h = 0;
  for (const b of FLOOR.bumps) {
    const dx = x - b.cx;
    const dz = z - b.cz;
    const d2 = dx * dx + dz * dz;
    const sigma2 = b.sigma * b.sigma;
    h += b.amp * Math.exp(-d2 / (2 * sigma2));
  }
  return h;
}

/**
 * Saf sürekli dalga toplamı — bump (statik) + sinüs (zaman bağımlı).
 * Ripple içermez. Sahne objelerinin Y yerleşiminde bu fonksiyon kullanılır.
 */
function continuousHeight(x: number, z: number, time: number): number {
  let h = bumpHeight(x, z);
  for (const w of FLOOR.waves) {
    const cosA = Math.cos(w.angle);
    const sinA = Math.sin(w.angle);
    /** Yön bileşeni → projeksiyon → düz dalga formu. */
    const proj = x * cosA + z * sinA;
    h += Math.sin(proj * w.k + time * w.speed) * w.amp;
  }
  return h;
}

function rippleHeight(
  x: number,
  z: number,
  time: number,
  ripples: Ripple[],
): number {
  let h = 0;
  const speed = FLOOR.step.speed;
  const decay = FLOOR.step.decay;
  for (const r of ripples) {
    const age = time - r.birth;
    if (age < 0) continue;
    const env = Math.exp(-age / decay);
    if (env < 0.02) continue;
    const dx = x - r.x;
    const dz = z - r.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    /** Dalga sırtı bu frame'de bu yarıçapta. */
    const front = age * speed;
    const delta = dist - front;
    /** Dar bantta (±2 m) belirgin sinüs damlası. */
    const sigma = 1.6;
    const radial = Math.exp(-(delta * delta) / (2 * sigma * sigma));
    /** Faz: dışa yayılan dalga deseni — kullanıcı net bir halka görür. */
    const phase = Math.cos(delta * 1.6);
    h += r.amplitude * env * radial * phase;
  }
  return h;
}

export function createWaveFloor(scene: THREE.Scene): WaveFloorHandle {
  const half = WORLD.half;
  const seg = FLOOR.segments;

  /** Plane XY düzleminde gelir; biz -90° X ile XZ'ye yatırıyoruz. */
  const geo = new THREE.PlaneGeometry(half * 2, half * 2, seg, seg);
  geo.rotateX(-Math.PI / 2);

  /**
   * Zemin mat sarı (duvar/tavanla aynı dil) ama biraz daha koyu ton +
   * **flatShading: true** — kuantum alan oszilasyonu için kritik.
   * Düz shading her üçgeni ayrı bir normal ile renklendirir → dalga
   * sırtları/yamaçları net facet'ler gibi görünür, alan kabarması
   * gözden kaçmaz. Smooth shading sarı zeminde dalgayı silikleştiriyor
   * — kullanıcı feedback'i: "dalgalanmalar gözükmüyor".
   *
   * Roughness 1.0, metalness 0 → tamamen mat. Düşük emissive ile karanlık
   * delik kalmaz, ton kaymaz.
   */
  const mat = new THREE.MeshStandardMaterial({
    color: PALETTE.coverYellowSoft,
    roughness: 1.0,
    metalness: 0,
    /** Sis içinde zeminin “kaybolmaması” için hafif sıcak self-ışıma. */
    emissive: new THREE.Color(PALETTE.coverYellow).multiplyScalar(0.24),
    emissiveIntensity: 1.0,
    flatShading: true,
    fog: true,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = FLOOR.baseY;
  scene.add(mesh);

  /**
   * Önceki versiyonda burada 180×180 wireframe overlay vardı — kullanıcı
   * "akışkan jöle gibi" geri bildirimi verdi: hem dalga genlikleri hem
   * dağınık alan grid'i zemini sıvılaştırıyordu. Wireframe kaldırıldı,
   * yalnızca düz mat sarı zemin + statik bumps + ufak hum kaldı →
   * kararlı, profesyonel manzara.
   */

  /** ── Ripple ring buffer ──────────────────────────────────────── */
  const ripples: Ripple[] = [];
  const maxRipples = FLOOR.step.maxAlive;

  /** ── Köşe pozisyonları + cache ───────────────────────────────── */
  const posAttr = geo.getAttribute("position") as THREE.BufferAttribute;
  const baseXZ: { x: number; z: number }[] = [];
  for (let i = 0; i < posAttr.count; i++) {
    baseXZ.push({ x: posAttr.getX(i), z: posAttr.getZ(i) });
  }

  let lastTime = 0;

  const update = (time: number): void => {
    lastTime = time;

    /** Süresi dolmuş ripple'ları temizle (in-place). */
    for (let i = ripples.length - 1; i >= 0; i--) {
      if (time - ripples[i].birth > FLOOR.step.decay * 4.5) {
        ripples.splice(i, 1);
      }
    }

    /** Her köşeyi yeniden hesapla. */
    for (let i = 0; i < posAttr.count; i++) {
      const { x, z } = baseXZ[i];
      const h = continuousHeight(x, z, time) + rippleHeight(x, z, time, ripples);
      posAttr.setY(i, h);
    }
    posAttr.needsUpdate = true;
    geo.computeVertexNormals();
  };

  const getHeightAt = (x: number, z: number): number => {
    return continuousHeight(x, z, lastTime) + rippleHeight(x, z, lastTime, ripples);
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

  return { mesh, update, getHeightAt, addRipple };
}
