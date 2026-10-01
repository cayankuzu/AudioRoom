import type { Track } from "../world";

/**
 * YouTube IFrame oynatıcısı. Şarkılar yalnızca resmi YouTube videolarından çalar;
 * oynatıcı müzik kartında görünür kalır (YouTube API politikası gereği).
 */
export type MusicState = "idle" | "loading" | "playing" | "paused" | "ended" | "blocked" | "error";

export interface Music {
  readonly track: Track | null;
  readonly state: MusicState;
  play(track: Track): void;
  resume(): void;
  pause(): void;
  toggle(): void;
  /** Plak gramofondan kalkınca: çalma durur, kart gizlenir. */
  stop(): void;
  setVolume(volume: number): void;
  setGain(gain: number): void;
  progress(): { time: number; duration: number };
  onChange(fn: (state: MusicState, track: Track | null) => void): void;
  dispose(): void;
}

interface YTPlayer {
  loadVideoById(id: string): void;
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  setVolume(volume: number): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        options: {
          host?: string;
          videoId?: string;
          width?: string;
          height?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: () => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  apiPromise ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = () => resolve();
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => reject(new Error("YouTube yüklenemedi"));
    document.head.appendChild(script);
  });
  return apiPromise;
}

export function createMusic(host: HTMLElement): Music {
  const listeners: Array<(state: MusicState, track: Track | null) => void> = [];
  let player: YTPlayer | null = null;
  let ready: Promise<YTPlayer> | null = null;
  let track: Track | null = null;
  let state: MusicState = "idle";
  let volume = 0.85;
  let gain = 1;
  let blockTimer = 0;
  // Pürüzsüz şarkı saati: YouTube'un getCurrentTime'ı kaba adımlarla (≈4 Hz) ilerler ve arada geri sıçrar;
  // klip kamerası buna doğrudan bağlanınca çekimler takılır, kesme anlarında geçişler yeniden tetiklenir.
  // Yerel saat gerçek zamanla akar, YouTube'a yumuşakça hizalanır; büyük fark (arama) anında yakalanır.
  let clockTime = 0;
  let clockRaw = -1;
  let clockAt = 0;

  const set = (next: MusicState) => {
    state = next;
    listeners.forEach((fn) => fn(state, track));
  };

  const applyVolume = () => player?.setVolume(Math.round(volume * gain * 100));

  const ensurePlayer = (videoId: string): Promise<YTPlayer> => {
    ready ??= loadApi().then(
      () =>
        new Promise<YTPlayer>((resolve) => {
          const mount = document.createElement("div");
          host.appendChild(mount);
          const instance = new window.YT!.Player(mount, {
            host: "https://www.youtube-nocookie.com",
            videoId,
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: 1,
              controls: 0,
              rel: 0,
              playsinline: 1,
              iv_load_policy: 3,
              disablekb: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                player = instance;
                instance.unMute();
                applyVolume();
                instance.playVideo();
                watchForBlock();
                resolve(instance);
              },
              onStateChange: ({ data }) => {
                if (data === 1) {
                  window.clearTimeout(blockTimer);
                  set("playing");
                } else if (data === 2 && state !== "loading") set("paused");
                else if (data === 0) set("ended");
              },
              onError: () => set("error"),
            },
          });
        }),
    );
    return ready;
  };

  // Oynatıcı hazır olduktan sonra 6 sn içinde çalmaya başlamadıysa tarayıcı sesi bekletmiştir.
  const watchForBlock = () => {
    window.clearTimeout(blockTimer);
    blockTimer = window.setTimeout(() => {
      if (state === "loading") set("blocked");
    }, 6000);
  };

  const music: Music = {
    get track() {
      return track;
    },
    get state() {
      return state;
    },
    play(next) {
      track = next;
      set("loading");
      if (player) {
        player.loadVideoById(next.videoId);
        player.unMute();
        applyVolume();
        player.playVideo();
        watchForBlock();
      } else {
        ensurePlayer(next.videoId).catch(() => set("error"));
      }
    },
    resume() {
      if (!player || !track) return;
      player.unMute();
      applyVolume();
      player.playVideo();
    },
    pause() {
      player?.pauseVideo();
    },
    stop() {
      window.clearTimeout(blockTimer);
      player?.stopVideo();
      track = null;
      set("idle");
    },
    toggle() {
      if (!track) return;
      if (state === "playing" || state === "loading") music.pause();
      else if (state === "ended") music.play(track);
      else music.resume();
    },
    setVolume(next) {
      volume = next;
      applyVolume();
    },
    setGain(next) {
      if (Math.abs(next - gain) < 0.01) return;
      gain = next;
      applyVolume();
    },
    progress() {
      if (!player) return { time: 0, duration: 0 };
      const raw = player.getCurrentTime() || 0;
      const now = performance.now();
      const dt = clockAt ? Math.min(0.25, (now - clockAt) / 1000) : 0;
      clockAt = now;
      if (state !== "playing") {
        clockTime = raw;
      } else if (Math.abs(raw - clockTime) > 1.2 || clockRaw < 0) {
        clockTime = raw; // arama ya da yeni parça
      } else {
        clockTime += dt;
        if (raw !== clockRaw) clockTime += (raw - clockTime) * 0.15; // yeni bir ölçüm geldi: nazikçe hizala
      }
      clockRaw = raw;
      return { time: clockTime, duration: player.getDuration() || 0 };
    },
    onChange(fn) {
      listeners.push(fn);
    },
    dispose() {
      window.clearTimeout(blockTimer);
      player?.destroy();
    },
  };
  return music;
}

export function youtubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
