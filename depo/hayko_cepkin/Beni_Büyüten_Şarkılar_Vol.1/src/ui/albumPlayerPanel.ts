import { ALBUM } from "../config/config";
import {
  CANONICAL_TRACKS,
  fillUnmatched,
  normalizeTitle,
  resolvePlaylistMapping,
} from "../data/trackLibrary";
import type { InventoryState } from "../state/inventory";

const LOG = "[AlbümPaneli]";
const MISSING_TEXT = "Plak bulunamadı";

type HBYTPlayerState = -1 | 0 | 1 | 2 | 3 | 5;

interface HBYTPlayerOptions {
  width: string;
  height: string;
  host?: string;
  playerVars: Record<string, number | string>;
  events?: {
    onReady?: (event: { target: HBYTPlayer }) => void;
    onStateChange?: (event: { data: HBYTPlayerState; target: HBYTPlayer }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface HBYTPlayerCtor {
  new (element: HTMLElement, options: HBYTPlayerOptions): HBYTPlayer;
}

interface HBYTNamespace {
  Player: HBYTPlayerCtor;
}

interface HBYTVideoData {
  title?: string;
  video_id?: string;
  author?: string;
}

interface HBYTPlayer {
  loadPlaylist(args: {
    listType: "playlist";
    list: string;
    index?: number;
    startSeconds?: number;
  }): void;
  cuePlaylist(args: { listType: "playlist"; list: string; index?: number }): void;
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
  getVideoData(): HBYTVideoData;
  getPlaylist(): string[] | null | undefined;
  getPlaylistIndex(): number;
  getPlayerState(): HBYTPlayerState;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

/**
 * Window.YT global'i `henry_the_lee/.../albumPanel.ts` tarafından zaten
 * declare ediliyor. TypeScript modüller arasında interface merge yapamadığı
 * için burada yeniden declare etmiyoruz; sadece runtime'da `as` ile
 * cast ederek kendi tip şemamızı kullanıyoruz.
 */
function getYT(): HBYTNamespace | undefined {
  return (window as unknown as { YT?: HBYTNamespace }).YT;
}

export interface AlbumPlayerPanel {
  startPlayback(): void;
  setDistanceGain(gain: number): void;
  refreshInventory(): void;
  playOrder(order: number): void;
  togglePlayback(): void;
  restart(): void;
  activeOrder(): number;
  toggle(): void;
  isOpen(): boolean;
  dispose(): void;
}

interface DisplayTrack {
  order: number;
  title: string;
  ytIndex: number;
  ytRawTitle: string;
  videoId: string;
}

let apiReadyPromise: Promise<void> | null = null;

function ensureIframeApi(): Promise<void> {
  if (getYT()?.Player) return Promise.resolve();
  if (apiReadyPromise) return apiReadyPromise;
  apiReadyPromise = new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.appendChild(script);
  });
  return apiReadyPromise;
}

interface OEmbedResponse {
  title?: string;
  author_name?: string;
}

async function fetchVideoTitle(videoId: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3D${encodeURIComponent(videoId)}&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as OEmbedResponse;
    const t = (json.title ?? "").trim();
    return t.length > 0 ? t : null;
  } catch {
    return null;
  }
}

export interface AlbumPlayerPanelOptions {
  onEjectRecord?: (order: number) => void;
}

/**
 * Sağ alt panel — YouTube IFrame API üzerinden canlı playlist.
 *
 * Hayko BBS için canonical başlıklar referans amaçlı; gerçek başlıklar
 * YouTube oEmbed'den hidrate edilir ve `fillUnmatched` ile her canonical
 * slot'a sıralı YouTube indeksi atanır. Böylece tüm 9 plak çalınabilir.
 */
export function createAlbumPlayerPanel(
  parent: HTMLElement,
  inventory: InventoryState,
  options: AlbumPlayerPanelOptions = {},
): AlbumPlayerPanel {
  const shell = document.createElement("section");
  shell.className = "album-panel";
  shell.innerHTML = `
    <header class="album-panel__head">
      <div class="album-panel__titles">
        <p class="album-panel__kicker">Şimdi Çalıyor</p>
        <h3 class="album-panel__title">Albüm yükleniyor…</h3>
        <p class="album-panel__meta">${ALBUM.artist} · ${ALBUM.title}</p>
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
          <input type="range" min="0" max="100" step="1" value="70" aria-label="Ses düzeyi" />
        </label>
      </div>
      <div class="album-panel__tracks">
        <div class="album-panel__tracks-head">
          <span>Parçalar</span>
          <span class="album-panel__count" aria-live="polite">—</span>
        </div>
        <ol class="album-panel__list" role="listbox" aria-label="Albüm parça listesi">
          <li class="album-panel__empty">Albüm listesi hazırlanıyor…</li>
        </ol>
      </div>
    </div>
  `;
  parent.appendChild(shell);

  const titleEl = shell.querySelector<HTMLHeadingElement>(".album-panel__title");
  const frameHost = shell.querySelector<HTMLDivElement>(".album-panel__frame");
  const toggleBtn = shell.querySelector<HTMLButtonElement>('[data-action="toggle"]');
  const prevBtn = shell.querySelector<HTMLButtonElement>('[data-action="prev"]');
  const nextBtn = shell.querySelector<HTMLButtonElement>('[data-action="next"]');
  const stopBtn = shell.querySelector<HTMLButtonElement>('[data-action="stop"]');
  const restartBtn = shell.querySelector<HTMLButtonElement>('[data-action="restart"]');
  const muteBtn = shell.querySelector<HTMLButtonElement>('[data-action="mute"]');
  const barEl = shell.querySelector<HTMLDivElement>('[data-bar]');
  const barFill = shell.querySelector<HTMLDivElement>('[data-bar-fill]');
  const barHandle = shell.querySelector<HTMLDivElement>('[data-bar-handle]');
  const timeCurrent = shell.querySelector<HTMLSpanElement>('[data-time-current]');
  const timeTotal = shell.querySelector<HTMLSpanElement>('[data-time-total]');
  const volumeInput = shell.querySelector<HTMLInputElement>(".album-panel__volume input");
  const collapseBtn = shell.querySelector<HTMLButtonElement>(".album-panel__collapse");
  const fallback = shell.querySelector<HTMLDivElement>(".album-panel__fallback");
  const fallbackBtn = shell.querySelector<HTMLButtonElement>(".album-panel__fallback-btn");
  const listEl = shell.querySelector<HTMLOListElement>(".album-panel__list");
  const countEl = shell.querySelector<HTMLSpanElement>(".album-panel__count");

  if (
    !titleEl ||
    !frameHost ||
    !toggleBtn ||
    !prevBtn ||
    !nextBtn ||
    !stopBtn ||
    !restartBtn ||
    !muteBtn ||
    !volumeInput ||
    !collapseBtn ||
    !fallback ||
    !fallbackBtn ||
    !listEl ||
    !countEl ||
    !barEl ||
    !barFill ||
    !barHandle ||
    !timeCurrent ||
    !timeTotal
  ) {
    throw new Error("Album panel DOM eksik");
  }

  const playlistState = {
    ids: [] as string[],
    rawTitles: new Map<string, string>(),
    resolved: false,
  };

  const playbackState = {
    ready: false,
    playing: false,
    muted: true,
    currentCanonical: 0,
    userVolume: 70,
    distanceGain: 1,
  };

  const uiState = {
    collapsed: false,
    tracks: [] as DisplayTrack[],
    tracksRendered: false,
  };

  let player: HBYTPlayer | null = null;
  let titleHydrationStarted = false;
  let lastPlayRequestAt = 0;

  function updatePlayingUi(value: boolean): void {
    playbackState.playing = value;
    shell.classList.toggle("is-playing", value);
    toggleBtn!.setAttribute("aria-label", value ? "Duraklat" : "Oynat");
    toggleBtn!.title = value ? "Duraklat" : "Oynat";
  }

  function updateMuteUi(value: boolean): void {
    playbackState.muted = value;
    muteBtn!.setAttribute("aria-label", value ? "Sesi aç" : "Sesi kıs");
    muteBtn!.title = value ? "Sesi aç" : "Sustur";
    const icon = muteBtn!.firstElementChild;
    if (icon) icon.textContent = value ? "🔇" : "🔊";
  }

  function applyEffectiveVolume(): void {
    if (!player || !playbackState.ready) return;
    if (playbackState.muted) return;
    const base = playbackState.userVolume;
    const eff = Math.max(
      0,
      Math.min(100, Math.round(base * playbackState.distanceGain)),
    );
    safeCall(() => player!.setVolume(eff), undefined);
  }

  function initCanonicalDisplay(): void {
    uiState.tracks = CANONICAL_TRACKS.map<DisplayTrack>((ct) => ({
      order: ct.order,
      title: ct.title,
      ytIndex: -1,
      ytRawTitle: "",
      videoId: "",
    }));
    uiState.tracksRendered = false;
    renderTrackList();
  }

  function handleEject(order: number): void {
    const result = inventory.eject(order);
    if (!result) return;
    if (result.wasActive && player && playbackState.ready) {
      safeCall(() => player!.pauseVideo(), undefined);
      safeCall(() => player!.seekTo(0, true), undefined);
      updatePlayingUi(false);
      setProgress(0, getKnownDuration());
    }
    options.onEjectRecord?.(order);
  }

  function renderTrackList(): void {
    listEl!.innerHTML = "";
    if (uiState.tracks.length === 0) {
      const empty = document.createElement("li");
      empty.className = "album-panel__empty";
      empty.textContent = "Albüm listesi yüklenemedi.";
      listEl!.appendChild(empty);
      countEl!.textContent = "—";
      return;
    }
    const collectedCount = inventory.collected.size;
    countEl!.textContent = `${collectedCount} / ${uiState.tracks.length} plak`;
    const frag = document.createDocumentFragment();
    for (const track of uiState.tracks) {
      const li = document.createElement("li");
      li.className = "album-panel__track";
      li.dataset.order = String(track.order);
      li.setAttribute("role", "option");
      const canonicalIndex = track.order - 1;
      const active = canonicalIndex === playbackState.currentCanonical && playbackState.playing;
      const collected = inventory.has(track.order);
      const loaded = inventory.activeOrder === track.order && collected;
      li.setAttribute("aria-selected", active ? "true" : "false");
      if (active) li.classList.add("is-active");
      if (loaded && !active) li.classList.add("is-loaded");
      if (!collected) li.classList.add("is-missing");
      else if (track.ytIndex < 0) li.classList.add("is-pending");

      const titleText = collected ? track.title : MISSING_TEXT;
      const stateIcon = active
        ? "♪"
        : loaded
          ? "◉"
          : !collected
            ? "✕"
            : track.ytIndex < 0
              ? "…"
              : "";
      li.innerHTML = `
        <span class="album-panel__track-index">${String(track.order).padStart(2, "0")}</span>
        <span class="album-panel__track-title">${escapeHtml(titleText)}</span>
        <span class="album-panel__track-state" aria-hidden="true">${stateIcon}</span>
        ${
          collected
            ? `<button class="album-panel__track-eject" type="button" data-eject="${track.order}" aria-label="Plağı çıkar" title="Plağı çıkar">⏏</button>`
            : ""
        }
      `;
      if (collected) {
        li.addEventListener("click", (ev) => {
          const t = ev.target as HTMLElement | null;
          if (t && t.closest("[data-eject]")) return;
          void playCanonical(canonicalIndex);
        });
        const ejectBtn = li.querySelector<HTMLButtonElement>("[data-eject]");
        ejectBtn?.addEventListener("click", (ev) => {
          ev.stopPropagation();
          handleEject(track.order);
        });
      }
      frag.appendChild(li);
    }
    listEl!.appendChild(frag);
    uiState.tracksRendered = true;
  }

  function highlightActive(): void {
    const items = listEl!.querySelectorAll<HTMLLIElement>(".album-panel__track");
    items.forEach((item) => {
      const o = Number(item.dataset.order);
      const active = o - 1 === playbackState.currentCanonical && playbackState.playing;
      const collected = inventory.has(o);
      const loaded = inventory.activeOrder === o && collected;
      item.classList.toggle("is-active", active);
      item.classList.toggle("is-loaded", loaded && !active);
      item.setAttribute("aria-selected", active ? "true" : "false");
      const state = item.querySelector<HTMLSpanElement>(".album-panel__track-state");
      if (state) {
        const t = uiState.tracks.find((tr) => tr.order === o);
        state.textContent = active
          ? "♪"
          : loaded
            ? "◉"
            : !collected
              ? "✕"
              : t && t.ytIndex < 0
                ? "…"
                : "";
      }
    });
    const activeItem = listEl!.querySelector<HTMLLIElement>(
      ".album-panel__track.is-active, .album-panel__track.is-loaded",
    );
    activeItem?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function updateHeaderTitle(): void {
    if (playbackState.playing && playbackState.currentCanonical >= 0) {
      const order = playbackState.currentCanonical + 1;
      if (inventory.has(order)) {
        const t = uiState.tracks.find((tr) => tr.order === order);
        if (t) {
          titleEl!.textContent = t.title;
          return;
        }
      }
    }
    if (inventory.activeOrder > 0) {
      const t = uiState.tracks.find((tr) => tr.order === inventory.activeOrder);
      if (t) {
        titleEl!.textContent = t.title;
        return;
      }
    }
    titleEl!.textContent = "Hiçbir plak takılı değil";
  }

  function hideFallback(): void {
    fallback!.classList.remove("is-visible");
  }

  async function hydrateRawTitles(): Promise<void> {
    if (titleHydrationStarted) return;
    titleHydrationStarted = true;

    const ids = playlistState.ids.slice();
    const limit = 4;
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < ids.length) {
        const mine = cursor;
        cursor += 1;
        const id = ids[mine];
        if (playlistState.rawTitles.has(id)) continue;
        const raw = await fetchVideoTitle(id);
        if (raw) {
          playlistState.rawTitles.set(id, raw);
          if ((playlistState.rawTitles.size & 3) === 0) {
            rebuildCanonicalMapping();
          }
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, ids.length) }, () => worker()));
    rebuildCanonicalMapping();
    console.log(LOG, "Başlıklar hidrate edildi", {
      toplam: ids.length,
      alinan: playlistState.rawTitles.size,
    });
  }

  function rebuildCanonicalMapping(): void {
    const ids = playlistState.ids;
    if (ids.length === 0) return;

    const rawTitlesByIndex = ids.map((id) => playlistState.rawTitles.get(id) ?? "");
    /**
     * Hayko BBS Vol.1 için canonical başlıklar yalnızca referans olduğundan,
     * fuzzy match çoğu zaman zayıf kalır. Bu yüzden `fillUnmatched` ile
     * eşleşmeyen canonical slot'lara YouTube playlist'inin sıradaki
     * indekslerini sıralı şekilde atarız → her plak çalınabilir bir kaynağa
     * bağlanır ve UI'da YouTube'un verdiği gerçek başlık görünür.
     */
    const primary = resolvePlaylistMapping(rawTitlesByIndex);
    const finalized = fillUnmatched(primary, ids.length);

    uiState.tracks = CANONICAL_TRACKS.map<DisplayTrack>((ct) => {
      const ytIndex = finalized[ct.order - 1];
      const rawTitle = ytIndex >= 0 ? rawTitlesByIndex[ytIndex] : "";
      /**
       * UI başlığını öncelikle YouTube'dan al — hidrate olmamışsa canonical
       * referans başlığı kullan. Böylece kullanıcı her zaman bir isim görür.
       */
      const displayTitle =
        rawTitle && rawTitle.length > 0 ? cleanYTTitle(rawTitle) : ct.title;
      return {
        order: ct.order,
        title: displayTitle,
        ytIndex,
        ytRawTitle: rawTitle,
        videoId: ytIndex >= 0 ? ids[ytIndex] : "",
      };
    });
    renderTrackList();

    if (player) {
      const liveYt = safeCall(() => player!.getPlaylistIndex(), -1);
      if (liveYt >= 0) {
        const canonicalMatch = uiState.tracks.findIndex((t) => t.ytIndex === liveYt);
        if (canonicalMatch >= 0) {
          playbackState.currentCanonical = canonicalMatch;
          highlightActive();
          updateHeaderTitle();
        }
      }
    }

    playlistState.resolved = true;
    const matched = uiState.tracks.filter((t) => t.ytIndex >= 0).length;
    console.log(LOG, "Canonical mapping güncellendi", {
      canonical: CANONICAL_TRACKS.length,
      ytToplam: ids.length,
      eslesen: matched,
    });
  }

  function captureYtIdsFromPlayer(): boolean {
    if (!player) return false;
    const ids = safeCall<string[] | null | undefined>(() => player!.getPlaylist(), null);
    if (!Array.isArray(ids) || ids.length === 0) return false;
    if (ids.length === playlistState.ids.length) return true;
    playlistState.ids = ids.slice();
    console.log(LOG, "Playlist ID listesi alındı", { ytToplam: ids.length });

    if (!uiState.tracksRendered) initCanonicalDisplay();
    rebuildCanonicalMapping();
    void hydrateRawTitles();
    return true;
  }

  function beginPollingHydrate(): void {
    let attempts = 0;
    const maxAttempts = 30;
    const tick = (): void => {
      attempts += 1;
      if (captureYtIdsFromPlayer()) return;
      if (attempts >= maxAttempts) {
        console.warn(LOG, "Playlist hidrate edilemedi (timeout).");
        return;
      }
      window.setTimeout(tick, 400);
    };
    window.setTimeout(tick, 450);
  }

  async function playCanonical(canonicalIndex: number): Promise<void> {
    if (!player || !playbackState.ready) return;
    const track = uiState.tracks[canonicalIndex];
    if (!track) return;
    if (!inventory.has(track.order)) return;
    inventory.setActive(track.order);

    hideFallback();
    safeCall(() => player!.unMute(), undefined);
    updateMuteUi(false);

    if (track.ytIndex < 0) {
      window.setTimeout(() => void playCanonical(canonicalIndex), 600);
      return;
    }

    lastPlayRequestAt = performance.now();
    safeCall(() => player!.playVideoAt(track.ytIndex), undefined);
    playbackState.currentCanonical = canonicalIndex;
    highlightActive();
    updateHeaderTitle();
    applyEffectiveVolume();
  }

  function findNextCollected(from: number, step: number): number {
    const n = uiState.tracks.length;
    if (n === 0) return -1;
    for (let i = 1; i <= n; i += 1) {
      const idx = (from + step * i + n * n) % n;
      const t = uiState.tracks[idx];
      if (inventory.has(t.order)) return idx;
    }
    return -1;
  }
  function nextCanonical(): void {
    const next = findNextCollected(playbackState.currentCanonical, 1);
    if (next >= 0) void playCanonical(next);
  }
  function prevCanonical(): void {
    const prev = findNextCollected(playbackState.currentCanonical, -1);
    if (prev >= 0) void playCanonical(prev);
  }

  initCanonicalDisplay();

  void ensureIframeApi().then(() => {
    const yt = getYT();
    if (!yt?.Player) {
      console.error(LOG, "YouTube IFrame API yüklenemedi.");
      return;
    }
    console.log(LOG, "IFrame API hazır — player oluşturuluyor.");

    player = new yt.Player(frameHost!, {
      width: "100%",
      height: "100%",
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
          playbackState.ready = true;
          playbackState.userVolume = Math.max(
            0,
            Math.min(100, Math.round(Number(volumeInput!.value))),
          );
          safeCall(
            () =>
              player!.cuePlaylist({
                listType: "playlist",
                list: ALBUM.playlistId,
              }),
            undefined,
          );
          safeCall(() => player!.mute(), undefined);
          updateMuteUi(true);
          updatePlayingUi(false);
          beginPollingHydrate();
        },
        onStateChange: (event) => {
          const state = event.data;
          captureYtIdsFromPlayer();

          if (state === 1 || state === 3) {
            const liveYt = safeCall(() => player!.getPlaylistIndex(), -1);
            const canonical =
              liveYt >= 0 ? uiState.tracks.findIndex((t) => t.ytIndex === liveYt) : -1;
            const canonicalOrder = canonical >= 0 ? uiState.tracks[canonical].order : -1;
            const hasRecord = canonicalOrder > 0 && inventory.has(canonicalOrder);
            const transitioning = performance.now() - lastPlayRequestAt < 900;

            if (canonical < 0 || !hasRecord) {
              if (transitioning) return;
              const startFrom = canonical >= 0 ? canonical : playbackState.currentCanonical;
              const nxt = findNextCollected(startFrom, 1);
              if (nxt >= 0 && nxt !== startFrom) {
                void playCanonical(nxt);
                return;
              }
              safeCall(() => player!.pauseVideo(), undefined);
              safeCall(() => player!.mute(), undefined);
              updateMuteUi(true);
              updatePlayingUi(false);
              return;
            }
          }

          if (state === 1) {
            hideFallback();
            updatePlayingUi(true);
            const liveYt = safeCall(() => player!.getPlaylistIndex(), -1);
            if (liveYt >= 0) {
              const canonical = uiState.tracks.findIndex((t) => t.ytIndex === liveYt);
              if (canonical >= 0 && canonical !== playbackState.currentCanonical) {
                playbackState.currentCanonical = canonical;
                highlightActive();
                updateHeaderTitle();
              }
            }
            applyEffectiveVolume();
          } else if (state === 2 || state === 0) {
            updatePlayingUi(false);
          } else if (state === 3 || state === 5) {
            const liveYt = safeCall(() => player!.getPlaylistIndex(), -1);
            if (liveYt >= 0) {
              const canonical = uiState.tracks.findIndex((t) => t.ytIndex === liveYt);
              if (canonical >= 0 && canonical !== playbackState.currentCanonical) {
                playbackState.currentCanonical = canonical;
                highlightActive();
                updateHeaderTitle();
              }
            }
          }

          if (state === 0) {
            const cur = playbackState.currentCanonical;
            const nxt = findNextCollected(cur, 1);
            if (nxt >= 0 && nxt !== cur) {
              void playCanonical(nxt);
            } else {
              updatePlayingUi(false);
              safeCall(() => player!.pauseVideo(), undefined);
            }
          }
        },
        onError: (event) => {
          console.warn(LOG, "YouTube hata kodu:", event.data);
        },
      },
    });
  });

  toggleBtn.addEventListener("click", () => {
    if (!player || !playbackState.ready) return;
    hideFallback();
    if (playbackState.playing) {
      player.pauseVideo();
      return;
    }
    const activeOrder = inventory.activeOrder;
    if (activeOrder <= 0) return;
    if (!inventory.has(activeOrder)) return;

    const idx = uiState.tracks.findIndex((t) => t.order === activeOrder);
    if (idx < 0) return;
    safeCall(() => player!.unMute(), undefined);
    updateMuteUi(false);
    applyEffectiveVolume();

    const liveYt = safeCall(() => player!.getPlaylistIndex(), -1);
    const target = uiState.tracks[idx];
    if (target.ytIndex >= 0 && liveYt === target.ytIndex) {
      player.playVideo();
      playbackState.currentCanonical = idx;
      highlightActive();
      updateHeaderTitle();
    } else {
      void playCanonical(idx);
    }
  });

  prevBtn.addEventListener("click", () => {
    hideFallback();
    if (inventory.activeOrder <= 0) return;
    prevCanonical();
  });

  nextBtn.addEventListener("click", () => {
    hideFallback();
    if (inventory.activeOrder <= 0) return;
    nextCanonical();
  });

  const restartCurrent = (): void => {
    if (!player || !playbackState.ready) return;
    hideFallback();

    const activeOrder = inventory.activeOrder;
    if (activeOrder > 0 && inventory.has(activeOrder)) {
      const idx = uiState.tracks.findIndex((t) => t.order === activeOrder);
      if (idx >= 0) {
        const track = uiState.tracks[idx];
        if (track.ytIndex >= 0) {
          const liveYt = safeCall(() => player!.getPlaylistIndex(), -1);
          if (liveYt === track.ytIndex) {
            safeCall(() => player!.unMute(), undefined);
            updateMuteUi(false);
            applyEffectiveVolume();
            safeCall(() => player!.seekTo(0, true), undefined);
            safeCall(() => player!.playVideo(), undefined);
            return;
          }
        }
        void playCanonical(idx);
        return;
      }
    }

    const curCanonical = playbackState.currentCanonical;
    const t = uiState.tracks[curCanonical];
    if (!t) return;
    if (!inventory.has(t.order)) return;
    void playCanonical(curCanonical);
  };

  restartBtn.addEventListener("click", restartCurrent);

  stopBtn.addEventListener("click", () => {
    if (!player || !playbackState.ready) return;
    safeCall(() => player!.pauseVideo(), undefined);
    safeCall(() => player!.seekTo(0, true), undefined);
    updatePlayingUi(false);
    setProgress(0, getKnownDuration());
  });

  let knownDuration = 0;
  function getKnownDuration(): number {
    if (!player || !playbackState.ready) return knownDuration;
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
    barFill!.style.width = `${pct}%`;
    barHandle!.style.left = `${pct}%`;
    barEl!.setAttribute("aria-valuenow", String(Math.round(pct)));
    timeCurrent!.textContent = formatTime(current);
    timeTotal!.textContent = formatTime(duration);
  }

  const progressTimer = window.setInterval(() => {
    if (!player || !playbackState.ready) return;
    const cur = safeCall(() => player!.getCurrentTime(), 0);
    const dur = getKnownDuration();
    setProgress(cur, dur);
  }, 250);

  function seekFromEvent(clientX: number): void {
    if (!player || !playbackState.ready) return;
    const dur = getKnownDuration();
    if (dur <= 0) return;
    const rect = barEl!.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    safeCall(() => player!.seekTo(pct * dur, true), undefined);
    setProgress(pct * dur, dur);
  }
  let scrubbing = false;
  barEl.addEventListener("mousedown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    scrubbing = true;
    seekFromEvent(e.clientX);
  });
  window.addEventListener("mousemove", (e) => {
    if (!scrubbing) return;
    seekFromEvent(e.clientX);
  });
  window.addEventListener("mouseup", () => {
    scrubbing = false;
  });
  barEl.addEventListener("click", (e) => e.stopPropagation());

  muteBtn.addEventListener("click", () => {
    if (!player || !playbackState.ready) return;
    if (playbackState.muted) {
      player.unMute();
      updateMuteUi(false);
      applyEffectiveVolume();
    } else {
      player.mute();
      updateMuteUi(true);
    }
  });

  volumeInput.addEventListener("input", () => {
    playbackState.userVolume = Math.max(0, Math.min(100, Number(volumeInput.value)));
    if (!player || !playbackState.ready) return;
    if (playbackState.userVolume === 0 && !playbackState.muted) updateMuteUi(true);
    else if (playbackState.userVolume > 0 && playbackState.muted) {
      player.unMute();
      updateMuteUi(false);
    }
    applyEffectiveVolume();
  });

  const collapseBtnEl = collapseBtn;
  function applyCollapsedUi() {
    shell.classList.toggle("is-collapsed", uiState.collapsed);
    collapseBtnEl.textContent = uiState.collapsed ? "+" : "—";
    collapseBtnEl.title = uiState.collapsed ? "Büyüt" : "Küçült";
    collapseBtnEl.setAttribute(
      "aria-label",
      uiState.collapsed ? "Paneli büyüt" : "Paneli küçült",
    );
  }

  collapseBtn.addEventListener("click", () => {
    uiState.collapsed = !uiState.collapsed;
    applyCollapsedUi();
  });

  const startPlayback = (): void => {
    if (!player || !playbackState.ready) return;
    hideFallback();

    const targetOrder = inventory.activeOrder;
    if (targetOrder <= 0) return;

    const target = uiState.tracks.find((t) => t.order === targetOrder);
    if (!target || target.ytIndex < 0) return;

    const liveYt = safeCall(() => player!.getPlaylistIndex(), -1);

    if (liveYt !== target.ytIndex) {
      const idx = uiState.tracks.findIndex((t) => t.order === targetOrder);
      if (idx >= 0) void playCanonical(idx);
      return;
    }

    safeCall(() => player!.unMute(), undefined);
    updateMuteUi(false);
    applyEffectiveVolume();
    if (!playbackState.playing) {
      safeCall(() => player!.playVideo(), undefined);
    }
  };

  fallbackBtn.addEventListener("click", () => {
    startPlayback();
  });

  const refreshInventory = (): void => {
    renderTrackList();
    updateHeaderTitle();
  };

  const playOrder = (order: number): void => {
    const idx = uiState.tracks.findIndex((t) => t.order === order);
    if (idx >= 0) void playCanonical(idx);
  };

  const togglePlayback = (): void => {
    if (!player || !playbackState.ready) return;
    if (playbackState.playing) {
      safeCall(() => player!.pauseVideo(), undefined);
    } else {
      safeCall(() => player!.unMute(), undefined);
      updateMuteUi(false);
      applyEffectiveVolume();
      safeCall(() => player!.playVideo(), undefined);
    }
  };

  inventory.onChange((snap) => {
    refreshInventory();
    if (snap.activeOrder === 0 && player && playbackState.ready && playbackState.playing) {
      safeCall(() => player!.pauseVideo(), undefined);
      safeCall(() => player!.mute(), undefined);
      updateMuteUi(true);
      updatePlayingUi(false);
    }
  });

  const setDistanceGain = (gain: number): void => {
    const clamped = Math.max(0, Math.min(1, gain));
    const prev = playbackState.distanceGain;
    playbackState.distanceGain = clamped;
    if (Math.abs(clamped - prev) > 0.003) {
      applyEffectiveVolume();
    }
  };

  void normalizeTitle;

  return {
    startPlayback,
    setDistanceGain,
    refreshInventory,
    playOrder,
    togglePlayback,
    restart: restartCurrent,
    activeOrder: () =>
      playbackState.playing ? playbackState.currentCanonical + 1 : 0,
    toggle() {
      uiState.collapsed = !uiState.collapsed;
      applyCollapsedUi();
    },
    isOpen() {
      return !uiState.collapsed;
    },
    dispose() {
      window.clearInterval(progressTimer);
      player?.destroy();
      shell.remove();
    },
  };
}

/** YouTube başlığını UI için temizle: sanatçı/album ve "(Official)" gibi ekler at. */
function cleanYTTitle(raw: string): string {
  let t = raw.trim();
  /** Tipik "Hayko Cepkin - Beni Büyüten Şarkılar Vol.1 (Official Audio)" → parça adı çıkar. */
  t = t.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s*\[[^\]]*\]\s*/g, " ");
  t = t.replace(/\bofficial( audio| music video| video| lyric video)?\b/gi, " ");
  t = t.replace(/\bhd\b/gi, " ").replace(/\b4k\b/gi, " ");
  /** "Hayko Cepkin - Şarkı" → "Şarkı" */
  const dash = t.indexOf(" - ");
  if (dash > 0) {
    const left = t.slice(0, dash).toLowerCase();
    if (left.includes("hayko") || left.includes("cepkin")) {
      t = t.slice(dash + 3);
    }
  }
  return t.replace(/\s+/g, " ").trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeCall<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}
