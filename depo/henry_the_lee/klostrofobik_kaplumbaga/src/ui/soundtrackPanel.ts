import { ALBUM } from "../config";

type YTPlayerState = -1 | 0 | 1 | 2 | 3 | 5;

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setVolume(value: number): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

interface YTNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      width: string;
      height: string;
      videoId: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady: () => void;
        onStateChange: (event: { data: YTPlayerState }) => void;
      };
    },
  ) => YTPlayer;
}

type YTWindow = Window & {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
};

let apiReadyPromise: Promise<void> | null = null;

function ensureIframeApi(): Promise<void> {
  const ytWindow = window as YTWindow;
  if (ytWindow.YT?.Player) return Promise.resolve();
  if (apiReadyPromise) return apiReadyPromise;

  apiReadyPromise = new Promise<void>((resolve) => {
    const previousReady = ytWindow.onYouTubeIframeAPIReady;
    ytWindow.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };
    if (!document.querySelector("script[src='https://www.youtube.com/iframe_api']")) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  });
  return apiReadyPromise;
}

export interface SoundtrackPanel {
  unlock(): void;
  lock(recordState?: string): void;
  setDistanceGain(gain: number): void;
  getDistanceGain(): number;
  togglePlayback(): void;
  togglePanel(): void;
  isOpen(): boolean;
  dispose(): void;
}

export interface SoundtrackPanelOptions {
  onEjectRecord?: () => void;
}

function formatTime(value: number): string {
  const seconds = Number.isFinite(value) ? Math.max(0, value) : 0;
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function createSoundtrackPanel(
  parent: HTMLElement,
  options: SoundtrackPanelOptions = {},
): SoundtrackPanel {
  const element = document.createElement("section");
  element.className = "album-panel is-locked";
  element.innerHTML = `
    <header class="album-panel__head">
      <div class="album-panel__titles">
        <p class="album-panel__kicker" data-state>Plak bekleniyor</p>
        <h3 class="album-panel__title">${ALBUM.title}</h3>
        <p class="album-panel__meta">${ALBUM.artist} · Gramofon</p>
      </div>
      <button class="album-panel__collapse" type="button" aria-label="Paneli küçült" title="Küçült">—</button>
    </header>
    <div class="album-panel__body">
      <div class="album-panel__frame-wrap" aria-hidden="true">
        <div class="album-panel__frame">
          <div data-player-host title="${ALBUM.title} oynatıcısı"></div>
        </div>
        <div class="album-panel__blocker"></div>
        <div class="album-panel__fallback is-visible" data-lock-message>
          <p>Plağı gramofona tak.</p>
          <a href="${ALBUM.url}" target="_blank" rel="noopener">YouTube'da aç</a>
        </div>
      </div>
      <div class="album-panel__progress">
        <div class="album-panel__progress-times">
          <span class="album-panel__time" data-current>0:00</span>
          <span class="album-panel__time album-panel__time--total" data-total>0:00</span>
        </div>
        <div class="album-panel__bar" role="progressbar" aria-label="Parça ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="album-panel__bar-track"></div>
          <div class="album-panel__bar-fill" data-fill></div>
          <div class="album-panel__bar-handle" data-handle></div>
        </div>
      </div>
      <div class="album-panel__controls">
        <button class="album-panel__btn" type="button" disabled aria-label="Önceki parça">⏮</button>
        <button class="album-panel__btn album-panel__btn--primary" data-toggle type="button" disabled aria-label="Oynat / Duraklat">
          <span class="album-panel__play" aria-hidden="true">▶</span>
          <span class="album-panel__pause" aria-hidden="true">⏸</span>
        </button>
        <button class="album-panel__btn" type="button" disabled aria-label="Sonraki parça">⏭</button>
        <button class="album-panel__btn" data-stop type="button" disabled aria-label="Durdur">■</button>
        <button class="album-panel__btn" data-restart type="button" disabled aria-label="Baştan çal">↻</button>
        <button class="album-panel__btn" data-mute type="button" disabled aria-label="Sesi aç / kıs">🔊</button>
        <label class="album-panel__volume" title="Ses düzeyi">
          <span class="visually-hidden">Ses</span>
          <input type="range" min="0" max="100" step="1" value="76" disabled aria-label="Ses düzeyi" />
        </label>
      </div>
      <div class="album-panel__tracks">
        <div class="album-panel__tracks-head"><span>Parçalar</span><span class="album-panel__count">1 parça</span></div>
        <ol class="album-panel__list" role="listbox">
          <li class="album-panel__track is-missing" data-track>
            <span class="album-panel__track-index">01</span>
            <span class="album-panel__track-title">${ALBUM.title}</span>
            <span class="album-panel__track-state">Plak tavşanda</span>
            <button class="album-panel__track-eject" data-eject type="button" aria-label="Plağı çıkar" title="Plağı çıkar">×</button>
          </li>
        </ol>
      </div>
    </div>
  `;
  parent.appendChild(element);

  const frameHost = element.querySelector<HTMLElement>("[data-player-host]");
  const state = element.querySelector<HTMLElement>("[data-state]");
  const lockMessage = element.querySelector<HTMLElement>("[data-lock-message]");
  const track = element.querySelector<HTMLElement>("[data-track]");
  const trackState = element.querySelector<HTMLElement>(".album-panel__track-state");
  const eject = element.querySelector<HTMLButtonElement>("[data-eject]");
  const toggle = element.querySelector<HTMLButtonElement>("[data-toggle]");
  const stop = element.querySelector<HTMLButtonElement>("[data-stop]");
  const restart = element.querySelector<HTMLButtonElement>("[data-restart]");
  const mute = element.querySelector<HTMLButtonElement>("[data-mute]");
  const volume = element.querySelector<HTMLInputElement>("input[type='range']");
  const collapse = element.querySelector<HTMLButtonElement>(".album-panel__collapse");
  const fill = element.querySelector<HTMLElement>("[data-fill]");
  const handle = element.querySelector<HTMLElement>("[data-handle]");
  const current = element.querySelector<HTMLElement>("[data-current]");
  const total = element.querySelector<HTMLElement>("[data-total]");
  const progress = element.querySelector<HTMLElement>("[role='progressbar']");

  let unlocked = false;
  let playing = false;
  let muted = false;
  let collapsed = false;
  let distanceGain = 1;
  let player: YTPlayer | null = null;
  let playerReady = false;
  let disposed = false;

  const applyVolume = () => {
    const userVolume = Number(volume?.value ?? 76);
    if (playerReady) player?.setVolume(Math.round(userVolume * distanceGain));
  };

  const setPlaying = (next: boolean) => {
    if (!unlocked || !playerReady || !player) return;
    playing = next;
    element.classList.toggle("is-playing", playing);
    if (playing) player.playVideo();
    else player.pauseVideo();
  };

  const enableControls = (enabled: boolean) => {
    [toggle, stop, restart, mute].forEach((button) => {
      if (button) button.disabled = !enabled;
    });
    if (volume) volume.disabled = !enabled;
  };

  void ensureIframeApi().then(() => {
    const ytWindow = window as YTWindow;
    if (disposed || !frameHost || !ytWindow.YT?.Player) return;
    player = new ytWindow.YT.Player(frameHost, {
      width: "100%",
      height: "100%",
      videoId: ALBUM.videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          if (!player || disposed) return;
          playerReady = true;
          element.dataset.playerReady = "true";
          player.mute();
          player.pauseVideo();
          applyVolume();
          if (unlocked) {
            player.unMute();
            setPlaying(true);
          }
        },
        onStateChange: ({ data }) => {
          if (!player) return;
          element.dataset.playerState = String(data);
          if (!unlocked && (data === 1 || data === 3)) {
            player.mute();
            player.pauseVideo();
            playing = false;
          } else {
            playing = data === 1;
          }
          element.classList.toggle("is-playing", playing);
        },
      },
    });
  });

  const progressTimer = window.setInterval(() => {
    if (!playerReady || !player) return;
    const now = Number(player.getCurrentTime() || 0);
    const duration = Number(player.getDuration() || 0);
    const percentage = duration > 0 ? Math.min(100, (now / duration) * 100) : 0;
    if (current) current.textContent = formatTime(now);
    if (total) total.textContent = formatTime(duration);
    if (fill) fill.style.width = `${percentage}%`;
    if (handle) handle.style.left = `${percentage}%`;
    progress?.setAttribute("aria-valuenow", String(Math.round(percentage)));
  }, 300);

  toggle?.addEventListener("click", () => setPlaying(!playing));
  stop?.addEventListener("click", () => {
    player?.pauseVideo();
    player?.seekTo(0, true);
    playing = false;
    element.classList.remove("is-playing");
  });
  restart?.addEventListener("click", () => {
    player?.seekTo(0, true);
    setPlaying(true);
  });
  mute?.addEventListener("click", () => {
    muted = !muted;
    if (muted) player?.mute();
    else player?.unMute();
    mute.textContent = muted ? "🔇" : "🔊";
  });
  volume?.addEventListener("input", applyVolume);
  collapse?.addEventListener("click", () => {
    collapsed = !collapsed;
    element.classList.toggle("is-collapsed", collapsed);
    collapse.textContent = collapsed ? "+" : "—";
  });
  eject?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!unlocked) return;
    options.onEjectRecord?.();
  });

  return {
    unlock() {
      if (unlocked) return;
      unlocked = true;
      element.classList.remove("is-locked");
      lockMessage?.classList.remove("is-visible");
      track?.classList.remove("is-missing");
      track?.classList.add("is-loaded", "is-active");
      if (trackState) trackState.textContent = "Gramofonda";
      if (state) state.textContent = "Şimdi çalıyor";
      enableControls(true);
      if (playerReady && player) {
        player.unMute();
        applyVolume();
        setPlaying(true);
      }
    },
    lock(recordState = "Plak tavşanda") {
      unlocked = false;
      playing = false;
      element.classList.add("is-locked");
      element.classList.remove("is-playing");
      lockMessage?.classList.add("is-visible");
      track?.classList.add("is-missing");
      track?.classList.remove("is-loaded", "is-active");
      if (trackState) trackState.textContent = recordState;
      if (state) state.textContent = "Plak bekleniyor";
      enableControls(false);
      player?.mute();
      player?.pauseVideo();
      player?.seekTo(0, true);
    },
    setDistanceGain(gain) {
      distanceGain = Math.max(0, Math.min(1, gain));
      if (unlocked) applyVolume();
    },
    getDistanceGain() {
      return distanceGain;
    },
    togglePlayback() {
      setPlaying(!playing);
    },
    togglePanel() {
      collapsed = !collapsed;
      element.classList.toggle("is-collapsed", collapsed);
      if (collapse) collapse.textContent = collapsed ? "+" : "—";
    },
    isOpen() {
      return !collapsed;
    },
    dispose() {
      disposed = true;
      window.clearInterval(progressTimer);
      player?.stopVideo();
      player?.destroy();
      element.remove();
    },
  };
}
