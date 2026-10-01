import type * as THREE from "three";
import type { CircleCollider } from "../core/colliders";
import { approach } from "../fx/fade";
import type { Shot } from "./director";
import type { Hud } from "../ui/hud";
import type { Interactable, Interaction, PromptLine } from "./interaction";
import { createTimeline, type Beat, type Timeline } from "./timeline";

/**
 * Bir şarkıya özel sahne: şarkı çalarken dünyada beliren set parçası, şarkının
 * zaman çizelgesine bağlı hikâye (vuruşlar) ve oyuncunun şarkının anlamıyla
 * yaptığı etkileşimler.
 */
export interface SongScene {
  readonly root: THREE.Object3D;
  /** Şarkı başlayınca üstte beliren kısa görev (ör. "Gemilere bak ve E ile ateşe ver"). */
  readonly hint: string;
  readonly interactables: Interactable[];
  /** Bir nesneye bakmadan yapılan eylem (ör. ismi haykırmak): bakılan bir şey yokken E tetikler; boş etiket = kapalı. */
  readonly action?: { label: string; use(): void };
  /** Şarkının hikâyesi: sözlerin zaman damgalarına bağlı vuruşlar. */
  readonly beats?: readonly Beat[];
  /** Klibin çekim listesi: sinema kamerası şarkının anlarını bu çekimlerle anlatır. */
  readonly shots?: readonly Shot[];
  /** Sahne nesnelerinin çarpışma alanları; yalnızca sahne açıkken etkindir. */
  readonly colliders?: readonly CircleCollider[];
  /** Bir vuruş geçildiğinde (şarkı ilerledikçe sırayla). */
  onBeat?(id: string, songTime: number): void;
  /** level: 0..1 sahnenin görünürlüğü; songTime: şarkının saniyesi. */
  update(dt: number, time: number, level: number, songTime: number): void;
  /** Şarkı her başladığında sahne ilk hâline döner. */
  reset(): void;
}

export interface SongStage {
  readonly active: SongScene | null;
  /** Çalan parçayı bildirir (null: gramofon sustu). */
  play(id: string | null): void;
  update(dt: number, time: number, songTime: number): void;
  /** Aktif sahnenin genel eylemi için istem (bakılan nesne yokken). */
  prompt(): PromptLine[] | null;
  /** Genel eylemi çalıştırır; eylem yoksa false. */
  use(): boolean;
  /** Tüm sahnelerin shader'larını yüklemede derler: şarkı başlarken takılma olmaz. */
  warmup(precompile: () => Promise<void>): Promise<void>;
}

/** Sahnelerin görünürlüğünü yönetir; etkileşimler yalnızca kendi şarkısı çalarken açıktır. */
export function createSongStage(
  scene: THREE.Scene,
  interaction: Interaction,
  hud: Hud,
  scenes: Record<string, SongScene>,
): SongStage {
  const levels = new Map<SongScene, number>();
  const timelines = new Map<SongScene, Timeline>();
  let active: SongScene | null = null;

  for (const song of Object.values(scenes)) {
    levels.set(song, 0);
    timelines.set(song, createTimeline(song.beats ?? []));
    song.root.visible = false;
    song.colliders?.forEach((collider) => (collider.enabled = false));
    scene.add(song.root);
    for (const item of song.interactables) {
      interaction.add({
        position: item.position,
        radius: item.radius,
        reach: item.reach,
        always: item.always,
        prompt: () => (active === song && (levels.get(song) ?? 0) > 0.6 ? item.prompt() : null),
        use: item.use,
      });
    }
  }

  // Etiketi boş olan eylem o an kapalıdır (ör. şarkının o anında yapılacak bir şey yoksa).
  const action = () => (active && (levels.get(active) ?? 0) > 0.6 && active.action?.label ? active.action : undefined);

  return {
    get active() {
      return active;
    },
    play(id) {
      const next = (id && scenes[id]) || null;
      if (next === active) return;
      active = next;
      if (next) {
        timelines.get(next)!.reset();
        next.reset();
        hud.hint(next.hint, 9);
      }
    },
    async warmup(precompile) {
      const roots = Object.values(scenes).map((song) => song.root);
      // Kök ve tüm alt nesneler görünür olmalı (bazı sahneler parçaları kendi gizler).
      const hidden: THREE.Object3D[] = [];
      for (const root of roots) {
        root.visible = true;
        root.traverse((child) => {
          if (!child.visible) {
            hidden.push(child);
            child.visible = true;
          }
        });
      }
      try {
        await precompile();
      } finally {
        hidden.forEach((child) => (child.visible = false));
        roots.forEach((root) => (root.visible = false));
      }
    },
    prompt() {
      const current = action();
      return current ? [{ key: "E", label: current.label }] : null;
    },
    use() {
      const current = action();
      current?.use();
      return Boolean(current);
    },
    update(dt, time, songTime) {
      for (const [song, level] of levels) {
        const target = song === active ? 1 : 0;
        const value = approach(level, target, target ? 0.9 : 1.4, dt);
        levels.set(song, value < 0.002 && !target ? 0 : value);
        song.root.visible = value > 0.002;
        song.colliders?.forEach((collider) => (collider.enabled = song === active && value > 0.5));
        if (song === active) {
          for (const beat of timelines.get(song)!.update(songTime)) song.onBeat?.(beat.id, songTime);
        }
        if (song.root.visible) song.update(dt, time, value, songTime);
      }
    },
  };
}
