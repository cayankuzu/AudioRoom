import * as THREE from "three";
import type { WindState } from "../systems/windSystem";

export interface AtmosphereHandle {
  object: THREE.Group;
  update(time: number, wind?: WindState): void;
}

interface Layer {
  points: THREE.Points;
  rotationSpeed: number;
  /** Yerel salınım (türbülans) genliği. */
  localAmp: number;
  /** Yerel salınım hızı (rad/sn). */
  localFreq: number;
  /** Rüzgar yönünün bu katmana ne kadar etki edeceği (metre). */
  windDrift: number;
  /** Y-ekseninde hafif iniş çıkış. */
  verticalAmp: number;
  basePositions: Float32Array;
}

/**
 * Zenginleştirilmiş atmosfer — RÜZGAR entegre:
 *  - Her katman WindState üzerinden ortak bir yön alır (tutarlı his).
 *  - Katman başına `windDrift` katsayısı → ince toz çok, yüksek haze az sürüklenir.
 *  - Küçük faz farklılıkları ile aynı hız yerine mini varyasyon (subtle randomness).
 *  - `points.position` düzeyinde toplu drift → her frame attribute yazmadan önce
 *    ucuz shift; gerçek lokal salınım ise attribute düzeyinde (küçük genlik).
 *
 * Katmanlar (küçük → büyük ölçek):
 *  - groundCrawl: yerde sürünen toz
 *  - nearMicro:   göz hizasında ince mikro tane
 *  - midCloud:    orta kalınlık toz bulutu
 *  - highHaze:    uzak hava derinliği
 *  - driftSand:   rüzgarla belirgin sürüklenen daha büyük kum parçaları
 */
/**
 * Yumuşak toz noktası dokusu — PointsMaterial'ın sert kare pikselini
 * ince ve kenarları yumuşak bir "dust mote"'a dönüştürür. Kenarlara doğru
 * hızla şeffaflaşan radial gradient → fotoğraftaki ince toz hissi.
 */
function makeSoftDotTexture(size = 64): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(c);
  const cx = size / 2;
  const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.25, "rgba(255,255,255,0.7)");
  grad.addColorStop(0.55, "rgba(255,255,255,0.25)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createAtmosphere(): AtmosphereHandle {
  const group = new THREE.Group();
  const layers: Layer[] = [];
  const dotTex = makeSoftDotTexture(64);

  function layer(
    count: number,
    radius: number,
    size: number,
    opacity: number,
    color: string,
    yBand: [number, number],
    rotationSpeed: number,
    localAmp: number,
    localFreq: number,
    windDrift: number,
    verticalAmp: number,
  ): void {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const r = Math.sqrt(Math.random()) * radius;
      const t = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(t) * r;
      positions[i * 3 + 1] = yBand[0] + Math.random() * (yBand[1] - yBand[0]);
      positions[i * 3 + 2] = Math.sin(t) * r;
    }
    const base = new Float32Array(positions);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      size,
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      sizeAttenuation: true,
      /**
       * Yumuşak toz dokusu → kenarlar keskin değil, mote gibi. AlphaTest
       * 0'da tutulur ki kenarların tamamı fade olsun; blending Normal kalır
       * (additive değil) — sahneyi parlatmasın, sadece hafif hayalet bir
       * hava katmanı oluştursun.
       */
      map: dotTex,
      alphaTest: 0.001,
    });
    const points = new THREE.Points(geometry, material);
    group.add(points);
    layers.push({
      points,
      rotationSpeed,
      localAmp,
      localFreq,
      windDrift,
      verticalAmp,
      basePositions: base,
    });
  }

  /**
   * Renk paleti monokrom referansa hizalandı: tamamen nötr griler.
   * Boyutlar ve opaklık düşürüldü — daha önce yakında "halo disk" gibi
   * belirgin görünüyorlardı; artık sadece hafif bir sis/toz katmanı
   * hissi veriyorlar. Ground layer yer hizasından biraz yukarı kaldırıldı
   * ki kameraya çarpıp büyük disk olarak ekrana binmesin.
   */
  /** Yerde sürünen ince toz. Çok küçük + düşük opaklık → aura yok. */
  layer(1100, 62, 0.022, 0.14, "#a7a9ac", [0.25, 1.6], 0.01, 0.07, 0.32, 2.6, 0.05);
  /** Yakın mikro tane. */
  layer(1100, 80, 0.032, 0.12, "#9fa1a4", [1.0, 5.0], 0.008, 0.09, 0.24, 1.7, 0.12);
  /** Orta kalınlık toz bulutu. */
  layer(750, 120, 0.06, 0.10, "#898b8e", [3.0, 18], -0.006, 0.14, 0.16, 0.95, 0.25);
  /** Yüksek haze — uzak hava derinliği. Minimal hareket. Ufuk rengiyle eş. */
  layer(480, 170, 0.18, 0.12, "#787a7d", [14, 52], 0.003, 0, 0, 0.15, 0);
  /** Rüzgarla sürüklenen iri tane — midground, minimal görünür. */
  layer(260, 95, 0.08, 0.10, "#b0b2b5", [2.0, 10], -0.015, 0.22, 0.5, 3.4, 0.2);

  return {
    object: group,
    update(time, wind) {
      const windDirX = wind ? wind.direction.x : 1;
      const windDirZ = wind ? wind.direction.y : 0;
      const windStr = wind ? wind.strength : 0.35;
      const turb = wind ? wind.turbulence : 0;

      for (let li = 0; li < layers.length; li += 1) {
        const ld = layers[li];

        /** Ana grup dönüşü — aynı hızda değil, her katman biraz farklı. */
        ld.points.rotation.y = time * ld.rotationSpeed;

        /** Rüzgar drift — tüm katmanı topluca kaydır (ucuz). */
        const drift = ld.windDrift * windStr;
        /** Kapanış değişimi — modulo ile basic wrap: basePositions etrafında salın. */
        const phase = time * 0.35 * (1 + li * 0.07);
        const driftX = Math.sin(phase) * drift + windDirX * drift * 0.5;
        const driftZ = Math.cos(phase * 0.85) * drift + windDirZ * drift * 0.5;

        const attr = ld.points.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        const base = ld.basePositions;

        const amp = ld.localAmp;
        const sp = ld.localFreq;
        const vAmp = ld.verticalAmp;
        const jitter = 1 + turb * 0.12;

        /** Hafif salınım + rüzgar kayması; attribute'a tek yazım. */
        for (let i = 0; i < attr.count; i += 1) {
          const i3 = i * 3;
          const fph = i * 0.17;
          const sx = Math.sin(time * sp * jitter + fph) * amp + driftX;
          const sz = Math.cos(time * sp * 0.85 * jitter + fph * 0.9) * amp + driftZ;
          const sy = Math.sin(time * sp * 0.7 + fph * 1.3) * vAmp;
          attr.array[i3] = base[i3] + sx;
          attr.array[i3 + 1] = base[i3 + 1] + sy;
          attr.array[i3 + 2] = base[i3 + 2] + sz;
        }
        attr.needsUpdate = true;
      }
    },
  };
}
