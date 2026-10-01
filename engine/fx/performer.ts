import * as THREE from "three";
import { createArmIk, type ArmIk } from "./armIk";
import { createFooting } from "./footing";
import type { Figure, FigurePose } from "./figure";

/**
 * Oyuncu (performer): figürün yeri, duruşu ve bakışı şarkının saniyesinin işlevidir. İleri ve geri sarma aynı
 * kareyi verir; kimse belirmez, kaybolmaz ya da ışınlanmaz (anahtarlar arasında yürür).
 *
 * - keys: [saniye, x, z, yükseklik?, geçiş?] — iki anahtar arasında yürür/kayar. Geçiş bu anahtardan sonrakine:
 *   "l" düz, "o" yavaşlayarak (savrulma), "i" hızlanarak, "s" yumuşak, "a<h>" h metre yay (sıçrama, fırlatılma).
 * - poses: [saniye, duruş] — "move": yürürken hıza göre yürüyüş/koşu, dururken ayakta.
 * - looks: [saniye, hedef] — sayı (mutlak yön), nokta, başka oyuncu, işlev ya da "path" (gidiş yönü).
 * - rates: [saniye, hız] — animasyon hızı çarpanı (ağır çekim, çöküp kalma).
 * Konumlar figürün ebeveyninin uzayındadır (dünya ya da sayfa dünyası); ground aynı uzayda zemin yüksekliği.
 */
export type PerfPose = FigurePose | "move";
export type PerfEase = "l" | "o" | "i" | "s" | `a${number}`;
export type PerfKey = [number, number, number, number?, PerfEase?];
export type PerfLook = number | THREE.Vector3 | Performer | (() => THREE.Vector3) | "path";

export interface Performer {
  readonly figure: Figure;
  readonly g: THREE.Group;
  readonly ik: ArmIk;
  keys: PerfKey[];
  poses: [number, PerfPose][];
  looks: [number, PerfLook][];
  rates: [number, number][];
  /** Zemine oturtma açık mı (varsayılan): temas kemikleri zeminin altına inmez. */
  grounded: boolean;
  /** Anlık yürüme hızı (m/sn) ve zeminden yükseklik. */
  readonly speed: number;
  readonly lift: number;
  /** Figürün temel ölçeği (boy/1,85): nefes gibi ölçek oynamaları bununla çarpılır. */
  readonly baseScale: number;
  /** t anındaki konum (duruş ve bakış hariç). */
  positionAt(t: number, out: THREE.Vector3): THREE.Vector3;
  /** Figürü t anına getirir ve animasyonunu ilerletir. */
  place(t: number, dt: number, time: number): void;
  /** Konumu dışarıdan yazıldıysa: temas kemikleri zeminin altındaysa figürü yükseltir. */
  settle(): number;
}

const entryAt = <T extends [number, ...unknown[]]>(table: T[], t: number): T | null => {
  let found: T | null = null;
  for (const entry of table) {
    if (entry[0] > t) break;
    found = entry;
  }
  return found;
};

const shape = (ease: PerfEase | undefined, u: number) => {
  if (!ease || ease === "l" || ease[0] === "a") return u;
  if (ease === "o") return 1 - (1 - u) * (1 - u);
  if (ease === "i") return u * u;
  return u * u * (3 - 2 * u);
};

export function createPerformer(figure: Figure, ground: (x: number, z: number) => number, height: number): Performer {
  const g = figure.group;
  const ik = createArmIk(g);
  const tmp = new THREE.Vector3();
  const tmp2 = new THREE.Vector3();
  let lastT = -1e9;
  let poseEntry: [number, PerfPose] | null = null;
  /** rates tablosuna göre a..b arasında geçen klip süresi (geri sarınca klip doğru karesinden başlasın). */
  const clipTime = (a: number, b: number) => {
    let total = 0;
    let at = a;
    while (at < b - 1e-4) {
      const entry = entryAt(perf.rates, at);
      const next = perf.rates.find((r) => r[0] > at + 1e-6);
      const until = Math.min(b, next ? next[0] : b);
      total += (until - at) * (entry?.[1] ?? 1);
      at = until;
    }
    return total;
  };
  const footing = createFooting(figure);
  const perf: Performer & { speed: number; lift: number } = {
    figure,
    g,
    ik,
    keys: [],
    poses: [],
    looks: [],
    rates: [],
    grounded: true,
    speed: 0,
    lift: 0,
    baseScale: height / 1.85,
    positionAt(t, out) {
      const keys = perf.keys;
      if (!keys.length) return out.copy(g.position);
      let i = 0;
      while (i < keys.length - 1 && keys[i + 1][0] <= t) i += 1;
      const a = keys[i];
      const b = keys[Math.min(i + 1, keys.length - 1)];
      const raw = b[0] > a[0] ? THREE.MathUtils.clamp((t - a[0]) / (b[0] - a[0]), 0, 1) : 0;
      const u = shape(a[4], raw);
      const x = a[1] + (b[1] - a[1]) * u;
      const z = a[2] + (b[2] - a[2]) * u;
      let y = (a[3] ?? 0) + ((b[3] ?? 0) - (a[3] ?? 0)) * u;
      if (a[4] && a[4][0] === "a") y += Number(a[4].slice(1)) * Math.sin(Math.PI * raw);
      return out.set(x, ground(x, z) + y, z);
    },
    place(t, dt, time) {
      const keys = perf.keys;
      const jumped = Math.abs(t - lastT) > 0.5;
      lastT = t;
      let moving = false;
      let from: PerfKey | null = null;
      let to: PerfKey | null = null;
      if (keys.length) {
        let i = 0;
        while (i < keys.length - 1 && keys[i + 1][0] <= t) i += 1;
        from = keys[i];
        to = keys[Math.min(i + 1, keys.length - 1)];
        moving = t >= from[0] && t < to[0] && (from[1] !== to[1] || from[2] !== to[2]);
        perf.speed = moving ? Math.hypot(to[1] - from[1], to[2] - from[2]) / (to[0] - from[0]) : 0;
        perf.positionAt(t, g.position);
        perf.lift = g.position.y - ground(g.position.x, g.position.z);
      }
      const entry = entryAt(perf.poses, t);
      const pose = entry?.[1] ?? "still";
      figure.pose = pose === "move" ? (perf.speed > 3.6 ? "sprint" : perf.speed > 2.3 ? "run" : perf.speed > 0.1 ? "walk" : "still") : pose;
      // Adım hızı yürüme hızına uyar (ayak kaymaz); boy ölçeği adım boyunu da ölçekler.
      const stride = perf.speed / perf.baseScale;
      const natural = figure.pose === "sprint" ? 4.6 : figure.pose === "run" ? 3 : figure.pose === "walk" ? 1.55 : 0;
      figure.energy = natural > 0 ? (stride / natural - 0.7) / 0.35 : 0.3;
      const look = entryAt(perf.looks, t);
      let yaw: number | null = null;
      const target = look?.[1];
      if (moving && from && to && (target === undefined || target === "path")) {
        yaw = Math.atan2(to[1] - from[1], to[2] - from[2]);
      } else if (typeof target === "number") yaw = target;
      else if (target !== undefined && target !== "path") {
        const q = typeof target === "function" ? target() : target instanceof THREE.Vector3 ? target : (target as Performer).g.getWorldPosition(tmp2);
        // Hedef dünyadaysa ebeveynin uzayına çevrilir.
        const local = g.parent && !(target instanceof THREE.Vector3) && typeof target !== "function" ? g.parent.worldToLocal(tmp.copy(q)) : tmp.copy(q);
        if (Math.hypot(local.x - g.position.x, local.z - g.position.z) > 0.2) yaw = Math.atan2(local.x - g.position.x, local.z - g.position.z);
      }
      if (yaw !== null) {
        const delta = Math.atan2(Math.sin(yaw - g.rotation.y), Math.cos(yaw - g.rotation.y));
        g.rotation.y += delta * (jumped || dt > 0.4 ? 1 : Math.min(1, dt * 6));
      }
      const rate = entryAt(perf.rates, t)?.[1] ?? 1;
      // Önceki karenin IK düzeltmeleri geri alınır (klip yazmayan kemiklerde birikmesin).
      ik.restore();
      // Duruş değişti ve şarkı o duruşun başından çok ilerideyse (sarma): klip aradaki süre kadar ileri alınır.
      let caughtUp = false;
      if (entry !== poseEntry) {
        poseEntry = entry;
        const behind = entry ? t - entry[0] : 0;
        if (behind > 0.12) {
          figure.update(0, time);
          figure.update(Math.min(8, clipTime(entry![0], t)), time);
          caughtUp = true;
        }
      }
      if (!caughtUp) figure.update(dt * rate, time);
      // Ayaklar, dizler, sırt ve baş zeminin altına inmez.
      if (perf.grounded) perf.settle();
    },
    settle() {
      const raised = footing.settle(ground, perf.baseScale);
      perf.lift += raised;
      return raised;
    },
  };
  return perf;
}
