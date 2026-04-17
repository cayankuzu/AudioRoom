import * as THREE from "three";

export interface AtmosphereHandle {
  object: THREE.Group;
  update(t: number): void;
}

interface Layer {
  points: THREE.Points;
  rotationSpeed: number;
  driftAmp: number;
  driftSpeed: number;
  basePositions: Float32Array;
}

/**
 * Zenginleştirilmiş atmosfer:
 * - ground: yerde sürünen ince toz, çok alçak, çok yumuşak
 * - near:   oyuncuya yakın 1-5 m çapında küçük taneler
 * - mid:    2-20 m arası kalın toz bulutu
 * - high:   uzak haze / hava derinliği — puslu ufuk hissini besler
 * - dust:   hafif rüzgarla sürüklenen kum parçaları (yatay drift)
 *
 * Her katmanın kendi dönüş hızı + Y-ekseni dalgalanması vardır; birlikte
 * çalıştığında sahne “yaşıyor” hissi verir ama oyun efekti gibi durmaz.
 */
export function createAtmosphere(): AtmosphereHandle {
  const group = new THREE.Group();
  const layers: Layer[] = [];

  function layer(
    count: number,
    radius: number,
    size: number,
    opacity: number,
    color: string,
    yBand: [number, number],
    rotationSpeed: number,
    driftAmp: number,
    driftSpeed: number,
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
    });
    const points = new THREE.Points(geometry, material);
    group.add(points);
    layers.push({ points, rotationSpeed, driftAmp, driftSpeed, basePositions: base });
  }

  /** Yerde sürünen ince toz — 0..1.2 m, oyuncuya en yakın. */
  layer(1800, 60, 0.055, 0.28, "#b7b8b9", [0.05, 1.3], 0.018, 0.12, 0.35);
  /** Yakın mikro tane — göz hizası civarı. */
  layer(1600, 80, 0.075, 0.26, "#a8aaad", [0.6, 4.8], 0.014, 0.18, 0.26);
  /** Orta kalınlık toz bulutu. */
  layer(1100, 120, 0.12, 0.18, "#8b8e93", [2.5, 18], -0.009, 0.35, 0.18);
  /** Yüksek haze — uzak hava derinliği. */
  layer(620, 160, 0.24, 0.13, "#7b8088", [14, 48], 0.004, 0.0, 0.0);
  /** Rüzgarla sürüklenen kum parçaları — daha büyük boy, az sayı. */
  layer(420, 95, 0.19, 0.16, "#c1bdae", [1.2, 9], -0.022, 0.9, 0.55);

  const tmp = new Float32Array(3);
  void tmp;

  return {
    object: group,
    update(t: number) {
      for (let li = 0; li < layers.length; li += 1) {
        const layerData = layers[li];
        layerData.points.rotation.y = t * layerData.rotationSpeed;

        if (layerData.driftAmp <= 0) continue;
        const attr = layerData.points.geometry.getAttribute(
          "position",
        ) as THREE.BufferAttribute;
        const base = layerData.basePositions;
        const amp = layerData.driftAmp;
        const sp = layerData.driftSpeed;
        for (let i = 0; i < attr.count; i += 1) {
          const i3 = i * 3;
          const phase = i * 0.17;
          const sx = Math.sin(t * sp + phase) * amp;
          const sy = Math.sin(t * sp * 0.7 + phase * 1.3) * amp * 0.3;
          const sz = Math.cos(t * sp * 0.85 + phase * 0.9) * amp;
          attr.array[i3] = base[i3] + sx;
          attr.array[i3 + 1] = base[i3 + 1] + sy;
          attr.array[i3 + 2] = base[i3 + 2] + sz;
        }
        attr.needsUpdate = true;
      }
    },
  };
}
