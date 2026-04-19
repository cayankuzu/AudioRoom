import { ALBUM } from "../config/config";

/**
 * ALBUM PANEL — Redd · Mükemmel Boşluk ile birebir UI/UX, Henry the Lee için
 * tek-parça versiyona uyarlandı.
 *
 * Davranış:
 *  - YouTube IFrame API ile playlist (RDqcOZtrA6eEk = ana parça radyo mix'i).
 *  - Plak gramofona TAKILMADIKÇA müzik başlamaz.
 *    `setActive(true)` çağrısı ile çalmaya hazır olur.
 *    `setActive(false)` plak çıkarıldığında müziği durdurur (pause, başa sar,
 *    mute); oynatıcı duraklatılmış olsa bile sıfırlanır.
 *  - Mesafe-bazlı ses: `setDistanceGain(0..1)` her frame gameLoop'tan çağrılır;
 *    efektif volume = userVolume * distanceGain.
 *  - Sağ alt köşede sticky panel; collapse/expand butonu var.
 *  - Plak listesinde TEK parça: ana track. Aktif ise "♪", takılı değilse "✕".
 */

const LOG = "[AlbumPanel]";

type YTPlayerState = -1 | 0 | 1 | 2 | 3 | 5;
interface YTPlayerOptions {
  width: string;
  height: string;
  playerVars: Record<string, number | string>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: YTPlayerState; target: YTPlayer }) => void;
    onError?: (event: { data: number }) => void;
  };
}
interface YTPlayer {
  loadPlaylist(args: { listType: "playlist"; list: string; index?: number; startSeconds?: number }): void;
  cuePlaylist(args: { listType: "playlist"; list: string; index?: number }): void;
  loadVideoById(args: { videoId: string; startSeconds?: number }): void;
  cueVideoById(args: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  playVideoAt(index: number): void;
  setVolume(v: number): void;
  getVolume(): number;
  mute(): void;
  unMute(): void;
  isMuted(): boolean;
  getPlayerState(): YTPlayerState;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}
interface YTNamespace { Player: new (el: HTMLElement, opts: YTPlayerOptions) => YTPlayer; }
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiReadyPromise: Promise<void> | null = null;
function ensureIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiReadyPromise) return apiReadyPromise;
  apiReadyPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return apiReadyPromise;
}

export interface AlbumPanelOptions {
  /**
   * Playlist'teki "⏏ Çıkar" butonuna basıldığında tetiklenir. Dünya katmanı
   * (gameLoop) bu callback'le plağı tabladan kaldırır → free moda alır.
   * Redd · Mükemmel Boşluk birebir mantık.
   */
  onEjectRecord?: () => void;
}

export interface AlbumPanel {
  /** Plak gramofona takıldı/çıkarıldı bilgisi. */
  setActive(active: boolean): void;
  /** Mesafe-bazlı ses kazancı (0..1). */
  setDistanceGain(gain: number): void;
  /** Kullanıcı etkileşimi anında çağır — autoplay kilidini açar. */
  startPlayback(): void;
  toggle(): void;
  isOpen(): boolean;
  dispose(): void;
}

export function createAlbumPanel(
  parent: HTMLElement,
  options: AlbumPanelOptions = {},
): AlbumPanel {
  const shell = document.createElement("section");
  shell.className = "album-panel";
  shell.innerHTML = `
    <header class="album-panel__head">
      <div class="album-panel__titles">
        <p class="album-panel__kicker">Şimdi Çalıyor</p>
        <h3 class="album-panel__title">Hiçbir plak takılı değil</h3>
        <p class="album-panel__meta">${escapeHtml(ALBUM.artist)} · ${escapeHtml(ALBUM.title)}</p>
      </div>
      <button class="album-panel__collapse" type="button" aria-label="Paneli küçült" title="Küçült">—</button>
    </header>
    <div class="album-panel__body">
      <div class="album-panel__frame-wrap" aria-hidden="true">
        <div class="album-panel__frame"></div>
        <div class="album-panel__blocker"></div>
        <div class="album-panel__fallback">
          <p>Ses başlatmak için dokunun.</p>
          <button type="button" class="album-panel__fallback-btn">Oynatmayı başlat</button>
          <a href="${ALBUM.playlistUrl}" target="_blank" rel="noopener">YouTube'da aç</a>
        </div>
      </div>
      <div class="album-panel__progress" data-progress>
        <div class="album-panel__progress-times">
          <span class="album-panel__time" data-time-current>0:00</span>
          <span class="album-panel__time album-panel__time--total" data-time-total>0:00</span>
        </div>
        <div class="album-panel__bar" data-bar role="slider"
             aria-label="Parça ilerlemesi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="album-panel__bar-track"></div>
          <div class="album-panel__bar-fill" data-bar-fill></div>
          <div class="album-panel__bar-handle" data-bar-handle></div>
        </div>
      </div>
      <div class="album-panel__controls">
        <button class="album-panel__btn" data-action="prev" type="button" aria-label="Önceki parça" title="Önceki">
          <span aria-hidden="true">⏮</span>
        </button>
        <button class="album-panel__btn album-panel__btn--primary" data-action="toggle" type="button" aria-label="Oynat / Duraklat" title="Oynat">
          <span class="album-panel__play" aria-hidden="true">▶</span>
          <span class="album-panel__pause" aria-hidden="true">⏸</span>
        </button>
        <button class="album-panel__btn" data-action="next" type="button" aria-label="Sonraki parça" title="Sonraki">
          <span aria-hidden="true">⏭</span>
        </button>
        <button class="album-panel__btn" data-action="stop" type="button" aria-label="Durdur" title="Durdur">
          <span aria-hidden="true">■</span>
        </button>
        <button class="album-panel__btn" data-action="restart" type="button" aria-label="Baştan çal" title="Baştan çal">
          <span aria-hidden="true">↺</span>
        </button>
        <button class="album-panel__btn" data-action="mute" type="button" aria-label="Sesi aç / kıs" title="Sustur">
          <span aria-hidden="true">🔊</span>
        </button>
        <label class="album-panel__volume" title="Ses düzeyi">
          <span class="visually-hidden">Ses</span>
          <input type="range" min="0" max="100" step="1" value="80" aria-label="Ses düzeyi" />
        </label>
      </div>
      <div class="album-panel__tracks">
        <div class="album-panel__tracks-head">
          <span>Oynatma Listesi</span>
          <span class="album-panel__count" aria-live="polite">0 / 1 plak</span>
        </div>
        <ol class="album-panel__list" role="listbox" aria-label="Parça listesi">
          <li class="album-panel__track is-missing" data-order="1" role="option">
            <span class="album-panel__track-index">01</span>
            <span class="album-panel__track-title">${escapeHtml(ALBUM.trackTitle)}</span>
            <span class="album-panel__track-state" aria-hidden="true">✕</span>
            <button class="album-panel__track-eject" type="button" data-eject aria-label="Plağı çıkar" title="Plağı çıkar">⏏</button>
          </li>
        </ol>
      </div>
    </div>
  `;
  parent.appendChild(shell);

  const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
    shell.querySelector(sel) as T;
  const titleEl = $<HTMLHeadingElement>(".album-panel__title");
  const frameHost = $<HTMLDivElement>(".album-panel__frame");
  const toggleBtn = $<HTMLButtonElement>('[data-action="toggle"]');
  const prevBtn = $<HTMLButtonElement>('[data-action="prev"]');
  const nextBtn = $<HTMLButtonElement>('[data-action="next"]');
  const stopBtn = $<HTMLButtonElement>('[data-action="stop"]');
  const restartBtn = $<HTMLButtonElement>('[data-action="restart"]');
  const muteBtn = $<HTMLButtonElement>('[data-action="mute"]');
  const barEl = $<HTMLDivElement>("[data-bar]");
  const barFill = $<HTMLDivElement>("[data-bar-fill]");
  const barHandle = $<HTMLDivElement>("[data-bar-handle]");
  const timeCurrent = $<HTMLSpanElement>("[data-time-current]");
  const timeTotal = $<HTMLSpanElement>("[data-time-total]");
  const volumeInput = $<HTMLInputElement>(".album-panel__volume input");
  const collapseBtn = $<HTMLButtonElement>(".album-panel__collapse");
  const fallback = $<HTMLDivElement>(".album-panel__fallback");
  const fallbackBtn = $<HTMLButtonElement>(".album-panel__fallback-btn");
  const trackItem = $<HTMLLIElement>(".album-panel__track");
  const trackState = $<HTMLSpanElement>(".album-panel__track-state");
  const trackEject = $<HTMLButtonElement>(".album-panel__track-eject");
  const countEl = $<HTMLSpanElement>(".album-panel__count");

  const state = {
    ready: false,
    playing: false,
    muted: true,
    active: false, /** plak gramofonda mı */
    userVolume: 80,
    distanceGain: 1,
    collapsed: false,
  };

  let player: YTPlayer | null = null;
  let knownDuration = 0;

  function safeCall<T>(fn: () => T, fb: T): T {
    try { return fn(); } catch { return fb; }
  }

  function applyEffectiveVolume(): void {
    if (!player || !state.ready || state.muted) return;
    const eff = Math.max(0, Math.min(100, Math.round(state.userVolume * state.distanceGain)));
    safeCall(() => player!.setVolume(eff), undefined);
  }

  function updatePlayingUi(playing: boolean): void {
    state.playing = playing;
    shell.classList.toggle("is-playing", playing);
    toggleBtn.setAttribute("aria-label", playing ? "Duraklat" : "Oynat");
    toggleBtn.title = playing ? "Duraklat" : "Oynat";
    refreshTrackUi();
  }

  function updateMuteUi(muted: boolean): void {
    state.muted = muted;
    muteBtn.setAttribute("aria-label", muted ? "Sesi aç" : "Sesi kıs");
    muteBtn.title = muted ? "Sesi aç" : "Sustur";
    const icon = muteBtn.firstElementChild;
    if (icon) icon.textContent = muted ? "🔇" : "🔊";
  }

  function refreshTrackUi(): void {
    trackItem.classList.toggle("is-active", state.playing && state.active);
    trackItem.classList.toggle("is-loaded", state.active && !state.playing);
    trackItem.classList.toggle("is-missing", !state.active);
    trackItem.setAttribute("aria-selected", state.playing ? "true" : "false");
    trackState.textContent = state.playing && state.active
      ? "♪"
      : state.active
        ? "◉"
        : "✕";
    countEl.textContent = state.active ? "1 / 1 plak" : "0 / 1 plak";
    titleEl.textContent = state.active ? ALBUM.trackTitle : "Hiçbir plak takılı değil";
  }

  function hideFallback(): void { fallback.classList.remove("is-visible"); }

  function getKnownDuration(): number {
    if (!player || !state.ready) return knownDuration;
    const d = safeCall(() => player!.getDuration(), 0);
    if (d && Number.isFinite(d) && d > 0) knownDuration = d;
    return knownDuration;
  }

  function formatTime(s: number): string {
    if (!Number.isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  function setProgress(current: number, duration: number): void {
    const pct = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    barFill.style.width = `${pct}%`;
    barHandle.style.left = `${pct}%`;
    barEl.setAttribute("aria-valuenow", String(Math.round(pct)));
    timeCurrent.textContent = formatTime(current);
    timeTotal.textContent = formatTime(duration);
  }

  /** YouTube IFrame init. */
  void ensureIframeApi().then(() => {
    if (!window.YT?.Player) {
      console.error(LOG, "YouTube IFrame API yüklenemedi.");
      return;
    }
    player = new window.YT.Player(frameHost, {
      width: "100%",
      height: "100%",
      /**
       * KURAL: Müzik plak takılmadan başlamaz.
       * - autoplay 0 + muted: liste sadece "cue" edilir.
       * - Plak gramofona girince setActive(true) → playVideo()
       */
      playerVars: {
        listType: "playlist",
        list: ALBUM.playlistId,
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
      },
      events: {
        onReady: () => {
          state.ready = true;
          state.userVolume = Math.max(0, Math.min(100, Number(volumeInput.value)));
          safeCall(() => player!.cuePlaylist({ listType: "playlist", list: ALBUM.playlistId }), undefined);
          safeCall(() => player!.mute(), undefined);
          updateMuteUi(true);
          updatePlayingUi(false);
          console.log(LOG, "Player hazır — plak bekleniyor.");
        },
        onStateChange: (event) => {
          const s = event.data;
          if (s === 1) { hideFallback(); updatePlayingUi(true); applyEffectiveVolume(); }
          else if (s === 2 || s === 0) updatePlayingUi(false);
        },
        onError: (event) => console.warn(LOG, "YT hata kodu:", event.data),
      },
    });
  });

  /** ── Buton wiring ────────────────────────────────────────────── */
  const playIfActive = (): void => {
    if (!player || !state.ready) return;
    if (!state.active) return; /** Plak takılı değilse asla çalma. */
    hideFallback();
    safeCall(() => player!.unMute(), undefined);
    updateMuteUi(false);
    applyEffectiveVolume();
    safeCall(() => player!.playVideo(), undefined);
  };

  toggleBtn.addEventListener("click", () => {
    if (!player || !state.ready) return;
    if (state.playing) safeCall(() => player!.pauseVideo(), undefined);
    else playIfActive();
  });
  prevBtn.addEventListener("click", () => {
    if (!player || !state.ready || !state.active) return;
    safeCall(() => player!.previousVideo(), undefined);
  });
  nextBtn.addEventListener("click", () => {
    if (!player || !state.ready || !state.active) return;
    safeCall(() => player!.nextVideo(), undefined);
  });
  stopBtn.addEventListener("click", () => {
    if (!player || !state.ready) return;
    safeCall(() => player!.pauseVideo(), undefined);
    safeCall(() => player!.seekTo(0, true), undefined);
    updatePlayingUi(false);
    setProgress(0, getKnownDuration());
  });
  restartBtn.addEventListener("click", () => {
    if (!player || !state.ready || !state.active) return;
    safeCall(() => player!.seekTo(0, true), undefined);
    safeCall(() => player!.unMute(), undefined);
    updateMuteUi(false);
    applyEffectiveVolume();
    safeCall(() => player!.playVideo(), undefined);
  });
  muteBtn.addEventListener("click", () => {
    if (!player || !state.ready) return;
    if (state.muted) { player.unMute(); updateMuteUi(false); applyEffectiveVolume(); }
    else { player.mute(); updateMuteUi(true); }
  });
  volumeInput.addEventListener("input", () => {
    state.userVolume = Math.max(0, Math.min(100, Number(volumeInput.value)));
    if (!player || !state.ready) return;
    if (state.userVolume === 0 && !state.muted) updateMuteUi(true);
    else if (state.userVolume > 0 && state.muted) {
      player.unMute();
      updateMuteUi(false);
    }
    applyEffectiveVolume();
  });

  /** Bar tıklama / sürükleme. */
  function seekFromEvent(clientX: number): void {
    if (!player || !state.ready) return;
    const dur = getKnownDuration();
    if (dur <= 0) return;
    const rect = barEl.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    safeCall(() => player!.seekTo(pct * dur, true), undefined);
    setProgress(pct * dur, dur);
  }
  let scrubbing = false;
  barEl.addEventListener("mousedown", (e) => {
    e.preventDefault(); e.stopPropagation();
    scrubbing = true; seekFromEvent(e.clientX);
  });
  window.addEventListener("mousemove", (e) => { if (scrubbing) seekFromEvent(e.clientX); });
  window.addEventListener("mouseup", () => { scrubbing = false; });
  barEl.addEventListener("click", (e) => e.stopPropagation());

  /** Kontrolleri pointer-lock'tan koru. */
  for (const el of [toggleBtn, prevBtn, nextBtn, stopBtn, restartBtn, muteBtn, volumeInput, collapseBtn, fallbackBtn]) {
    el.addEventListener("click", (e) => e.stopPropagation());
    el.addEventListener("mousedown", (e) => e.stopPropagation());
  }

  fallbackBtn.addEventListener("click", () => playIfActive());

  function applyCollapsedUi(): void {
    shell.classList.toggle("is-collapsed", state.collapsed);
    collapseBtn.textContent = state.collapsed ? "+" : "—";
    collapseBtn.title = state.collapsed ? "Büyüt" : "Küçült";
    collapseBtn.setAttribute("aria-label", state.collapsed ? "Paneli büyüt" : "Paneli küçült");
  }
  collapseBtn.addEventListener("click", () => {
    state.collapsed = !state.collapsed;
    applyCollapsedUi();
  });

  trackItem.addEventListener("click", (ev) => {
    /** Eject butonuna tıklandıysa playback tetiklenmesin. */
    const t = ev.target as HTMLElement | null;
    if (t && t.closest("[data-eject]")) return;
    if (!state.active) return;
    playIfActive();
  });

  /**
   * ⏏ Çıkar — playlist üzerinden plağı tabladan kaldırma. Redd birebir:
   *  1) Çalıyorsa anında pause + seek 0 (anlık geri bildirim).
   *  2) `onEjectRecord` callback dünya katmanına haber verir → vinyl free.
   *  3) `onEjectRecord` → gameLoop plağı serbest bırakır; `setActive(false)`
   *     müziği tamamen durdurur.
   *  Ayrıca pointer-lock'tan korumak için `stopPropagation`.
   */
  trackEject.addEventListener("click", (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    if (!state.active) return;
    if (player && state.ready && state.playing) {
      safeCall(() => player!.pauseVideo(), undefined);
      safeCall(() => player!.seekTo(0, true), undefined);
      updatePlayingUi(false);
      setProgress(0, getKnownDuration());
    }
    options.onEjectRecord?.();
  });
  trackEject.addEventListener("mousedown", (ev) => ev.stopPropagation());

  /** 4Hz progress poll — Redd ile aynı. */
  const progressTimer = window.setInterval(() => {
    if (!player || !state.ready) return;
    const cur = safeCall(() => player!.getCurrentTime(), 0);
    const dur = getKnownDuration();
    setProgress(cur, dur);
  }, 250);

  refreshTrackUi();

  return {
    setActive(active: boolean) {
      if (state.active === active) return;
      state.active = active;
      refreshTrackUi();
      /**
       * Plak tabladan ayrılınca müzik kesin dursun: önceden yalnızca
       * `state.playing` iken pause ediliyordu; kullanıcı duraklatmış olsa
       * bile seek/mute atlanabiliyordu. Her pasifleştirmede pause + 0 +
       * mute + progress sıfırla.
       */
      if (!active && player && state.ready) {
        safeCall(() => player!.pauseVideo(), undefined);
        safeCall(() => player!.seekTo(0, true), undefined);
        safeCall(() => player!.mute(), undefined);
        updateMuteUi(true);
        updatePlayingUi(false);
        setProgress(0, getKnownDuration());
      }
      if (active) playIfActive();
    },
    setDistanceGain(gain: number) {
      const clamped = Math.max(0, Math.min(1, gain));
      const prev = state.distanceGain;
      state.distanceGain = clamped;
      if (Math.abs(clamped - prev) > 0.003) applyEffectiveVolume();
    },
    startPlayback() { playIfActive(); },
    toggle() { state.collapsed = !state.collapsed; applyCollapsedUi(); },
    isOpen() { return !state.collapsed; },
    dispose() {
      window.clearInterval(progressTimer);
      player?.destroy();
      shell.remove();
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
