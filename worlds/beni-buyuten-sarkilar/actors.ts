import * as THREE from "three";
import { createActor, createFigure, type Actor, type FigurePose } from "../../engine/fx/figure";
import type { Shot } from "../../engine/game/director";
import { SHADOW_AZIMUTH, wombGround } from "./womb";

/**
 * Şarkı oyuncusu: gölge oyununun önünde, zeminde duran tek bir silüet figür. Her şarkıda perdelerin
 * kahramanıdır (yalnız adam, mahkûm, çeşme başındaki yaşlı, âşık…); perde değiştikçe yürür, oturur,
 * yumruk sallar, iple çekilir. Yalnızca şarkı çalarken görünür. Klip onu yakın plandan izler.
 */
interface Cue {
  /** Sahne konumu: perdeye göre açı ofseti ve merkezden uzaklık. */
  to?: [number, number];
  run?: boolean;
  pose?: FigurePose;
  energy?: number;
  /** Yerden yükseklik (ip, kaldırılma). */
  lift?: number;
}

const CUES: Record<string, Record<string, Cue>> = {
  "ben-insan-degil-miyim": {
    yalniz: { to: [-0.2, 16], pose: "sit" },
    soru: { pose: "still" },
    atilmis: { pose: "tired" },
    mutlu: { to: [0.12, 15.4], pose: "still" },
    gulmek: { pose: "dance", energy: 0.4 },
    alindi: { to: [-0.2, 16], pose: "sit" },
    kukla: { pose: "still", lift: 1.2 },
    yeniden: { pose: "still", lift: 0.5 },
    vur: { pose: "fight", lift: 0 },
    isyan: { pose: "dance", energy: 1.3 },
    son: { pose: "kneel" },
  },
  "aldirma-gonul": {
    duvar: { to: [0.02, 16.4], pose: "sit" },
    bas: { pose: "kneel" },
    dalga: { pose: "still" },
    kalk: { to: [0, 17.6], pose: "fight" },
    yuksel: { pose: "still", lift: 0.3 },
    gunler: { pose: "dance", energy: 0.3, lift: 0 },
    son: { pose: "still" },
  },
  "o-cesme": {
    kuru: { to: [0.05, 15], pose: "still" },
    damla: { to: [-0.1, 16.4], pose: "dance", energy: 0.5 },
    kuru2: { pose: "still" },
    yillar: { to: [0.25, 17.4], pose: "tired" },
    damla2: { pose: "kneel" },
    kuru3: { pose: "still" },
    son: { pose: "sit" },
  },
  "itirazim-var": {
    bekleyis: { to: [0, 15.6], pose: "still" },
    itiraz: { pose: "fight" },
    yarim: { pose: "fight", energy: 1.3 },
    kaybeden: { pose: "tired" },
    yaka: { pose: "still", lift: 1.0 },
    cehennem: { pose: "kneel", lift: 0 },
    buyuk: { pose: "dance", energy: 1 },
    yuzler: { pose: "still" },
    cehennem2: { pose: "fight" },
    son: { pose: "still" },
  },
  "agla-sevdam": {
    kule: { to: [-0.1, 16], pose: "still" },
    yemin: { pose: "dance", energy: 0.3 },
    sar: { pose: "still" },
    kuslar: { pose: "still" },
    yangin: { pose: "tired" },
    yola: { to: [0.28, 17], pose: "still" },
    dar: { pose: "tired" },
    bos: { pose: "kneel" },
    son: { pose: "sit" },
  },
  "issizligin-ortasinda": {
    duz: { to: [-0.2, 15.6], pose: "still" },
    dus: { pose: "sit" },
    uyku: { pose: "kneel" },
    ates: { pose: "tired" },
    sazlar: { pose: "tired" },
    ayakta: { pose: "still" },
    issiz: { pose: "sit" },
    ates2: { pose: "tired" },
    issiz2: { pose: "sit" },
    son: { pose: "still" },
  },
  "neydi-gunahim": {
    spot: { to: [-0.12, 15.6], pose: "still" },
    gidis: { pose: "dance", energy: 0.25 },
    ekilen: { pose: "still" },
    kalles: { pose: "fight" },
    soru: { pose: "tired" },
    kerem: { pose: "dance", energy: 1.0 },
    haydi: { pose: "dance", energy: 0.6 },
    hirsiz: { to: [0.3, 16], run: true, pose: "still" },
    felek: { pose: "kneel" },
    son: { pose: "sit" },
  },
  "yuh-yuh": {
    saz: { to: [0.1, 15.8], pose: "sit" },
    yuh: { pose: "still" },
    muska: { pose: "tired" },
    bey: { pose: "still" },
    asalet: { pose: "fight" },
    koro: { pose: "dance", energy: 1.0 },
    son: { pose: "sit" },
  },
  "nem-kaldi": {
    tarla: { to: [-0.28, 16.4], pose: "still" },
    parsel: { pose: "still" },
    tas: { pose: "kneel" },
    kapilar: { pose: "tired" },
    namert: { to: [0.1, 15.4], pose: "still" },
    dusman: { pose: "still" },
    arsiz: { pose: "fight" },
    ac: { pose: "kneel" },
    sermaye: { pose: "sit" },
    son: { pose: "sit" },
  },
};

/** Şarkının bu perdesinde oyuncuya bir hareket verilmiş mi? */
export function hasCue(trackId: string, beatId: string): boolean {
  return Boolean(CUES[trackId]?.[beatId]);
}

/** Sahne noktası: perdenin önünde, zeminde. */
export function stage(da: number, r: number): THREE.Vector3 {
  const a = SHADOW_AZIMUTH + da;
  const x = Math.sin(a) * r;
  const z = -Math.cos(a) * r;
  return new THREE.Vector3(x, wombGround(x, z), z);
}

/** Oyuncunun anlık yeri: klip çekimleri modül yüklenirken bu çapaya bağlanır. */
export const ACTOR_ANCHOR = new THREE.Object3D();

/** Oyuncuya bağlı çekim noktası (dünya ekseninde ofset). */
export const actorAt = (dx: number, dy: number, dz: number) => () => ACTOR_ANCHOR.position.clone().add(new THREE.Vector3(dx, dy, dz));

/** Perde başına oyuncu çekimi: dört kalıp dönüşümlü (yakın, alçak, omuz üstü perdeye, geniş). */
const fitActor = () => ({ center: ACTOR_ANCHOR.position.clone().add(new THREE.Vector3(0, 0.95, 0)), radius: 1.15 });

export function actorShot(index: number, wall: THREE.Vector3): Omit<Shot, "at"> {
  switch (index % 4) {
    case 0:
      return { from: actorAt(2.6, 1.5, 2.6), to: actorAt(2.1, 1.3, 2.1), look: actorAt(0, 1.0, 0), fov: 42, fit: fitActor };
    case 1:
      return { from: actorAt(-2.8, 0.4, 2.8), to: actorAt(-2.3, 0.5, 2.3), look: actorAt(0, 0.9, 0), fov: 46, fit: fitActor };
    case 2:
      return { from: actorAt(-0.8, 1.9, 2.4), to: actorAt(-0.6, 1.8, 1.8), look: actorAt(0, 1.2, 0), lookTo: wall, fov: 50, fit: fitActor };
    default:
      return { from: actorAt(0, 1.4, 6), to: actorAt(0, 1.2, 4), look: actorAt(0, 1, 0), fov: 48, fit: fitActor };
  }
}

export interface SongActor {
  readonly actor: Actor;
  update(dt: number, time: number, trackId: string, act: string, playing: boolean): void;
}

export function createSongActor(scene: THREE.Scene, material: THREE.Material): SongActor {
  const figure = createFigure({ material, height: 1.8 });
  figure.group.visible = false;
  scene.add(figure.group);
  const actor = createActor(figure, wombGround, { speed: 1.4, runSpeed: 3.6 });
  let lastTrack = "";
  let lastAct = "";
  let pending: FigurePose | null = null;
  let liftTarget = 0;

  const apply = (trackId: string, act: string) => {
    const cue = CUES[trackId]?.[act];
    if (!cue) return;
    if (cue.to) {
      const p = stage(cue.to[0], cue.to[1]);
      // Perdeye doğru dönük dursun: perde merkezi yönü.
      const face = Math.atan2(p.x, p.z) + Math.PI;
      actor.goTo(p.x, p.z, cue.run ?? false, face);
      pending = cue.pose ?? "still";
    } else {
      actor.rest(cue.pose ?? "still");
      pending = null;
    }
    figure.energy = cue.energy ?? 1;
    if (cue.lift !== undefined) liftTarget = cue.lift;
  };

  return {
    actor,
    update(dt, time, trackId, act, playing) {
      if (!playing || !CUES[trackId]) {
        figure.group.visible = false;
        lastTrack = "";
        lastAct = "";
        return;
      }
      if (trackId !== lastTrack) {
        lastTrack = trackId;
        lastAct = "";
        liftTarget = 0;
        actor.lift = 0;
        // Şarkının ilk perdesine ışınla: yürüyerek gelmesin.
        const first = Object.values(CUES[trackId]).find((c) => c.to);
        if (first?.to) {
          const p = stage(first.to[0], first.to[1]);
          figure.group.position.set(p.x, p.y, p.z);
          figure.group.rotation.y = Math.atan2(p.x, p.z) + Math.PI;
        }
      }
      figure.group.visible = true;
      if (act !== lastAct) {
        lastAct = act;
        apply(trackId, act);
      }
      if (pending && actor.arrived) {
        actor.rest(pending);
        pending = null;
      }
      actor.lift += (liftTarget - actor.lift) * Math.min(1, dt * 1.5);
      actor.update(dt, time);
      ACTOR_ANCHOR.position.copy(figure.group.position);
    },
  };
}
