import * as THREE from "three";
import { createActor, createFigure, type Actor } from "../../engine/fx/figure";
import type { Shot } from "../../engine/game/director";
import { createTimeline, type Beat, type Timeline } from "../../engine/game/timeline";

/**
 * Filmin insanı: bizim karakter (siyah gömlek). Uçsuz kâğıtta tek başına yürür, kabuğun içine girer;
 * içeride kabuk evi onu devralır (orada oturur, döner, diz çöker, iki büklüm olur). Yalnızca şarkı
 * çalarken görünür. Dışarıdaki figür yalnız "boş" perdesinde ve girişte görünür.
 */
const MOUTH = { x: 0.3, z: 3.4 };
/** Yürüyüş yolu: kâğıdın ucundan kabuğun önüne (0..25 sn), oradan ağza (25..29 sn). Şarkı saniyesine bağlı: ileri sarınca da yerinde. */
const FAR = new THREE.Vector3(-38, 0, 26);
const NEAR = new THREE.Vector3(-1.9, 0, 9.4);
const DOOR = new THREE.Vector3(MOUTH.x, 0, MOUTH.z);
const T_NEAR = 25;
const T_DOOR = 29;

const LINES: readonly Beat[] = [
  { at: 8, id: "h1", line: "Kâğıdın kenarında biri yürüyor: siyah gömlek, aceleci değil. Etrafında istediği kadar yer var." },
  { at: 30, id: "h2", line: "İçeride her şey elinin altında. Fincan, lamba, gitar. Sığıyor." },
  { at: 100, id: "h3", line: "Ayağa kalkıp dönmek istiyor; dönemiyor. Kabuk omzuna değiyor." },
  { at: 147, id: "h4", line: "Kâseye diz çöküyor. Çatal elinde, çorba kâsede; ikisi bir türlü buluşmuyor." },
  { at: 176, id: "h5", line: "Sırtı tavana değiyor. Nefesini tutuyor; sonra bırakıyor. Kabuk da bırakıyor." },
];

export interface Hurried {
  readonly actor: Actor;
  /** Kabuğun içinde (dışarıdaki figür gizli; kabuk evi kendi figürünü oynatır). */
  readonly inShell: boolean;
  update(dt: number, time: number, act: string, playing: boolean, songTime: number): void;
  shots(): Shot[];
}

export function createHurried(scene: THREE.Scene): Hurried {
  const figure = createFigure({ kind: "man", outfit: "man_black", height: 1.8 });
  figure.group.visible = false;
  scene.add(figure.group);
  const actor = createActor(figure, () => 0, { speed: 1.6, runSpeed: 4.4 });
  let timeline: Timeline | null = null;
  let wasPlaying = false;
  let inShell = false;

  const at = new THREE.Vector3();
  /** Şarkı saniyesine göre yol üstündeki yer; ağza varınca (29 sn) içeri girer. */
  const walkTo = (songTime: number) => {
    if (songTime < T_NEAR) at.lerpVectors(FAR, NEAR, THREE.MathUtils.clamp(songTime / T_NEAR, 0, 1));
    else at.lerpVectors(NEAR, DOOR, THREE.MathUtils.clamp((songTime - T_NEAR) / (T_DOOR - T_NEAR), 0, 1));
    const g = figure.group;
    const dx = at.x - g.position.x;
    const dz = at.z - g.position.z;
    if (Math.hypot(dx, dz) > 0.01) g.rotation.y = Math.atan2(dx, dz);
    g.position.copy(at);
    figure.pose = "walk";
    figure.energy = 1;
  };

  return {
    actor,
    get inShell() {
      return inShell;
    },
    update(dt, time, act, playing, songTime) {
      if (!playing) {
        figure.group.visible = false;
        wasPlaying = false;
        inShell = false;
        return;
      }
      if (!wasPlaying) {
        wasPlaying = true;
        timeline = createTimeline(LINES);
        figure.group.position.copy(FAR);
      }
      timeline?.update(songTime);
      // Kabuğa giriş: ağza varınca kaybolur; içerideki adam devralır. Sondaki açılışta da içeride kalır.
      inShell = songTime >= T_DOOR || (act !== "bos" && act !== "ev");
      figure.group.visible = !inShell;
      if (!inShell) {
        walkTo(songTime);
        figure.update(dt, time);
      }
    },
    shots() {
      const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
      const H = (dx: number, dy: number, dz: number) => () => figure.group.position.clone().add(v(dx, dy, dz));
      const fitH = () => ({ center: figure.group.position.clone().add(v(0, 0.95, 0)), radius: 1.15 });
      return [
        // Bol yer: adam küçücük, kâğıt uçsuz; geniş açı, uzak.
        { at: 6, from: H(-9, 5, 14), to: H(-6, 3.2, 9), look: H(0, 1, 0), lookTo: v(0, 4, 0), fov: 66, curve: "linear", grade: "pastel" },
        { at: 14, fit: fitH, from: H(3.5, 1.3, -3.5), to: H(2.8, 1.2, -2.8), look: H(0, 1.0, 0), fov: 50, grade: "pastel" },
        { at: 19, from: H(-2.6, 1.4, 4.2), to: H(-1.4, 1.2, 3.0), look: H(0, 1.1, 0), lookTo: v(0.3, 1.2, 3.4), fov: 54, curve: "linear", grade: "dawn" },
      ];
    },
  };
}
