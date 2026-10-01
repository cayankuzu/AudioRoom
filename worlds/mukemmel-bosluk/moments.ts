import * as THREE from "three";

/**
 * Her şarkı çaldığında gökyüzünün, ışığın ve havanın dönüştüğü durum. Değerler
 * "hedef"tir; sahne birkaç saniyede bu hedefe süzülür. Şarkıya özel set parçaları
 * ve etkileşimler songs/ altındadır.
 */
export type FigureMode = "float" | "dance" | "freeze";

export interface Moment {
  skyTop: string;
  skyHorizon: string;
  skyIntensity: number;
  fog: string;
  fogDensity: number;
  hemi: number;
  sun: number;
  stars: number;
  moon: number;
  crack: number;
  dust: { color: string; opacity: number; size: number; velocity: [number, number, number]; turbulence: number };
  /** Plak ilerlemesinin verdiği yerçekimine ek çarpan. */
  gravity: number;
  figure: FigureMode;
  saturation: number;
  tint: string;
  /** Gece göğünün canlılığı (samanyolu, bulutsu) ve iki rengi. */
  nebula: number;
  nebulaA: string;
  nebulaB: string;
}

const DAY: Moment = {
  skyTop: "#d9d9db",
  skyHorizon: "#f8f8f7",
  skyIntensity: 1.13,
  // Kapak: bembeyaz gök, simsiyah krater; hava temiz (uzak yamaç da koyu kalır), ışık düşük.
  fog: "#f1f1f0",
  fogDensity: 0.0024,
  hemi: 0.95,
  sun: 1.55,
  stars: 0,
  moon: 0,
  crack: 0,
  dust: { color: "#f2f2f0", opacity: 0.35, size: 0.12, velocity: [0.6, 0.05, 0.2], turbulence: 0.5 },
  gravity: 1,
  figure: "float",
  saturation: 1,
  tint: "#ffffff",
  nebula: 0,
  nebulaA: "#3a4cc8",
  nebulaB: "#c43a8a",
};

const NIGHT: Partial<Moment> = {
  skyTop: "#05070c",
  skyHorizon: "#1b2130",
  skyIntensity: 1,
  fog: "#10131a",
  fogDensity: 0.0036,
  // Ay ışığı: gece bile krater zemini ve siluetler seçilebilir kalır (sinema gecesi: mavi, okunur).
  hemi: 1.9,
  sun: 1.3,
};

const m = (overrides: Partial<Moment>): Moment => ({ ...DAY, ...overrides });

export const BASE_MOMENT = DAY;

export const MOMENTS: Record<string, Moment> = {
  // Akşam mavisi: okunur, soğuk-nötr; turuncu yalnız yanan gemilerden gelir.
  "kalpsiz-romantik": m({
    skyTop: "#3d4860",
    skyHorizon: "#a7a9b6",
    skyIntensity: 0.85,
    fog: "#7f8594",
    fogDensity: 0.0042,
    hemi: 3.3,
    sun: 2.5,
    stars: 0.5,
    moon: 0.8,
    nebula: 0.2,
    nebulaA: "#2a4a9a",
    nebulaB: "#6a4a7a",
    dust: { color: "#ffb070", opacity: 0.14, size: 0.12, velocity: [0.4, 0.6, 0], turbulence: 0.6 },
  }),
  kaniyorduk: m({
    ...NIGHT,
    stars: 1,
    moon: 1,
    nebula: 1,
    nebulaA: "#2f5bd8",
    nebulaB: "#b8409a",
    // Okunur gece: ay ışığı ve ortam ışığı yüksek; figürler sahnede aynı oranda kısılır (beyazlar patlamaz).
    hemi: 2.8,
    sun: 2.0,
    fogDensity: 0.0022,
    dust: { color: "#8d93a0", opacity: 0.08, size: 0.08, velocity: [0, 0.03, 0], turbulence: 0.2 },
  }),
  "ask-virus": m({
    skyTop: "#cfc9c9",
    skyHorizon: "#f3ecec",
    tint: "#fff1f1",
    dust: { color: "#c80d18", opacity: 1, size: 0.34, velocity: [0.3, 0.25, 0.1], turbulence: 1.8 },
  }),
  "onlar-bile-uzulurler": m({
    skyTop: "#8e8f91",
    skyHorizon: "#b9b7b4",
    skyIntensity: 0.8,
    fog: "#9d9c9a",
    fogDensity: 0.0065,
    hemi: 1,
    dust: { color: "#cfcfcf", opacity: 0.3, size: 0.1, velocity: [0, -0.2, 0], turbulence: 0.3 },
  }),
  "bugun-herkes-olsun-istedim": m({
    skyTop: "#7c7c7e",
    skyHorizon: "#c9c6c3",
    skyIntensity: 0.85,
    crack: 1,
    saturation: 0.6,
    figure: "freeze",
    dust: { color: "#e8e8e8", opacity: 0.5, size: 0.13, velocity: [0, 0, 0], turbulence: 0 },
  }),
  "senden-vazgeceli-cok-oldu": m({
    skyTop: "#6b6664",
    skyHorizon: "#a79d94",
    skyIntensity: 0.75,
    fog: "#8a817a",
    fogDensity: 0.006,
    hemi: 0.9,
    dust: { color: "#bdb5ad", opacity: 0.9, size: 0.18, velocity: [0.3, -0.9, 0.1], turbulence: 0.7 },
  }),
  kafakafka: m({
    skyTop: "#c9c8c4",
    skyHorizon: "#efece6",
    dust: { color: "#fffbe8", opacity: 0.4, size: 0.1, velocity: [0, 0.15, 0], turbulence: 0.8 },
  }),
  "tam-bi-delilik": m({
    ...NIGHT,
    skyTop: "#141a2a",
    skyHorizon: "#4a3434",
    fog: "#1c1a22",
    fogDensity: 0.0032,
    stars: 0.3,
    nebula: 0.45,
    nebulaA: "#c8702a",
    nebulaB: "#8a1a2a",
    dust: { color: "#ffd9a0", opacity: 0.3, size: 0.1, velocity: [0.2, 0.1, 0], turbulence: 0.4 },
  }),
  sextronot: m({
    ...NIGHT,
    skyTop: "#020205",
    skyHorizon: "#0b0c16",
    stars: 1.4,
    nebula: 1.1,
    nebulaA: "#1f9fb4",
    nebulaB: "#6a3ac8",
    gravity: 0.45,
    dust: { color: "#b9d4ff", opacity: 0.5, size: 0.09, velocity: [0, 0.3, 0], turbulence: 0.2 },
  }),
  itiraf: m({
    ...NIGHT,
    skyTop: "#120b0a",
    skyHorizon: "#3c1a10",
    hemi: 2.3,
    nebula: 0.55,
    nebulaA: "#b8401a",
    nebulaB: "#40101a",
    dust: { color: "#ff7a2a", opacity: 0.7, size: 0.14, velocity: [0, 1.2, 0], turbulence: 0.9 },
  }),
  "boslukta-dans": m({
    skyTop: "#e4e4e6",
    skyHorizon: "#ffffff",
    skyIntensity: 1.27,
    gravity: 0.3,
    figure: "dance",
    dust: { color: "#ffffff", opacity: 0.6, size: 0.12, velocity: [0, 0.5, 0], turbulence: 1.2 },
  }),
  "hala-seni-cok-ozluyorum": m({
    skyTop: "#e8e6e3",
    skyHorizon: "#fffaf3",
    skyIntensity: 1.32,
    fogDensity: 0.0045,
    tint: "#fff6ee",
    dust: { color: "#ffffff", opacity: 0.7, size: 0.13, velocity: [0, 0.4, 0], turbulence: 0.5 },
  }),
};

const NUMBERS = ["skyIntensity", "fogDensity", "hemi", "sun", "stars", "moon", "crack", "gravity", "saturation", "nebula"] as const;

/** Mevcut durumu hedef ana doğru kare hızından bağımsız biçimde yumuşakça taşır. */
export class MomentBlender {
  target: Moment = DAY;
  readonly colors = {
    skyTop: new THREE.Color(DAY.skyTop),
    skyHorizon: new THREE.Color(DAY.skyHorizon),
    fog: new THREE.Color(DAY.fog),
    tint: new THREE.Color(DAY.tint),
    dust: new THREE.Color(DAY.dust.color),
    nebulaA: new THREE.Color(DAY.nebulaA),
    nebulaB: new THREE.Color(DAY.nebulaB),
  };
  readonly values: Record<(typeof NUMBERS)[number], number> = Object.fromEntries(NUMBERS.map((key) => [key, DAY[key]])) as never;
  readonly dust = { opacity: DAY.dust.opacity, size: DAY.dust.size, turbulence: DAY.dust.turbulence, velocity: new THREE.Vector3(...DAY.dust.velocity) };
  private readonly scratch = new THREE.Color();
  private readonly vector = new THREE.Vector3();

  update(dt: number): void {
    const k = 1 - Math.exp(-0.7 * dt);
    const t = this.target;
    this.colors.skyTop.lerp(this.scratch.set(t.skyTop), k);
    this.colors.skyHorizon.lerp(this.scratch.set(t.skyHorizon), k);
    this.colors.fog.lerp(this.scratch.set(t.fog), k);
    this.colors.tint.lerp(this.scratch.set(t.tint), k);
    this.colors.dust.lerp(this.scratch.set(t.dust.color), k);
    this.colors.nebulaA.lerp(this.scratch.set(t.nebulaA), k);
    this.colors.nebulaB.lerp(this.scratch.set(t.nebulaB), k);
    for (const key of NUMBERS) this.values[key] += (t[key] - this.values[key]) * k;
    this.dust.opacity += (t.dust.opacity - this.dust.opacity) * k;
    this.dust.size += (t.dust.size - this.dust.size) * k;
    this.dust.turbulence += (t.dust.turbulence - this.dust.turbulence) * k;
    this.dust.velocity.lerp(this.vector.set(...t.dust.velocity), k);
  }
}
