import { ALBUM } from "../config/config";
import {
  CANONICAL_TRACKS,
  normalizeTitle,
  resolvePlaylistMapping,
} from "../data/trackLibrary";
import type { InventoryState } from "../state/inventory";

const LOG = "[AlbümPaneli]";
const MISSING_TEXT = "Plak bulunamadı";

type YTPlayerState = -1 | 0 | 1 | 2 | 3 | 5;

interface YTPlayerOptions {
  width: string;
  height: string;
  host?: string;
  playerVars: Record<string, number | string>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: YTPlayerState; target: YTPlayer }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YTPlayerCtor {
  new (element: HTMLElement, options: YTPlayerOptions): YTPlayer;
}

interface YTNamespace {
  Player: YTPlayerCtor;
}

interface YTVideoData {
  title?: string;
  video_id?: string;
  author?: string;
}

interface YTPlayer {
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
  getVideoData(): YTVideoData;
  getPlaylist(): string[] | null | undefined;
  getPlaylistIndex(): number;
  getPlayerState(): YTPlayerState;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface AlbumPlayerPanel {
  /** Kullanıcı etkileşimi anında çağır — autoplay'i garantilemek için. */
  startPlayback(): void;
  /** Mesafe bazlı ses kazancı [0..1]. Her frame gameLoop'tan gelir. */
  setDistanceGain(gain: number): void;
  /** Inventory dışarıdan değişince paneli yeniden çiz. */
  refreshInventory(): void;
  /** Dışarıdan (gramofon / interaction) tetiklenir — parçayı çal. */
  playOrder(order: number): void;
  /** Oynatılanı duraklat / duraklatılanı devam ettir. */
  togglePlayback(): void;
  /** Aktif parçayı baştan yeniden çalıştır. */
  restart(): void;
  /** Panel'deki aktif track (canonical order, 0 = yok). */
  activeOrder(): number;
  /** Paneli aç/kapa (klavye kısayolu için). */
  toggle(): void;
  /** Panel açık mı (collapsed değilse true). */
  isOpen(): boolean;
  dispose(): void;
}

/** UI + playback için canonical parça modeli. */
interface DisplayTrack {
  /** 1-temelli canonical albüm sırası. */
  order: number;
  /** Albüm parça adı (UI'da gösterilen). */
  title: string;
  /** YouTube playlist index'i — mapping sonrası atanır, -1 ise eşleşmedi. */
  ytIndex: number;
  /** YouTube'un bu index için verdiği ham başlık (varsa). */
  ytRawTitle: string;
  videoId: string;
}

let apiReadyPromise: Promise<void> | null = null;

function ensureIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
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

/**
 * Sağ alt panel — YouTube IFrame API üzerinden canlı playlist.
 *
 * Canonical sıra:
 * - `CANONICAL_TRACKS` albümün gerçek sırasıdır (1..12).
 * - YouTube playlist IDs alınır, oEmbed ile başlıkları hidrate edilir,
 *   fuzzy match ile canonical sıraya eşlenir (`resolvePlaylistMapping`).
 * - UI daima canonical sırayı (order 1..12) gösterir.
 * - Playback canonical sıra → ytIndex dönüşümü ile `playVideoAt` çağırır.
 *
 * Ses:
 * - Otomatik oynatma için `autoplay=1 + mute=1` kombinasyonu; kullanıcı
 *   ilk etkileşiminde `unMute()` çağrılır.
 * - Panel ses seviyesi (slider) × mesafe kazancı (`setDistanceGain`) =
 *   efektif volume; her ikisi de güncellendiğinde YouTube'a set edilir.
 */
export interface AlbumPlayerPanelOptions {
  /**
   * Bir plak paneldeki "çıkar" butonundan silindiğinde çağrılır. Inventory
   * güncellemesi panel içinde ATOMIK yapılır; callback yalnızca dünya
   * tarafındaki yan-etkiler (mesh'i geri dünyaya düşür, log vb.) içindir.
   */
  onEjectRecord?: (order: number) => void;
}

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

  /** --- State'ler: net ayrılmış. --- */

  /** Playlist state: YouTube'un döndürdüğü ham veriler. */
  const playlistState = {
    ids: [] as string[],
    rawTitles: new Map<string, string>(), // videoId → ham başlık
    resolved: false,
  };

  /** Playback state: hangi canonical track aktif, oynatma durumu. */
  const playbackState = {
    ready: false,
    playing: false,
    muted: true,
    currentCanonical: 0, // 0-temelli canonical index
    userVolume: 70,
    distanceGain: 1,
  };

  /** UI state. */
  const uiState = {
    collapsed: false,
    tracks: [] as DisplayTrack[],
    tracksRendered: false,
  };

  let player: YTPlayer | null = null;
  let titleHydrationStarted = false;
  /**
   * Son açıkça talep edilen parça değişimi (`playCanonical`) zamanı.
   * YouTube index raporlaması parça geçişlerinde kısa süreli kararsız
   * olabiliyor — bu pencere içinde (örn. 900ms) canonical guard sessiz
   * kalır, böylece auto-advance hedefi doğru yüklendikten sonra karar verir.
   */
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
    if (playbackState.muted) return; // mute durumunda volume set etme
    const base = playbackState.userVolume;
    const eff = Math.max(
      0,
      Math.min(100, Math.round(base * playbackState.distanceGain)),
    );
    safeCall(() => player!.setVolume(eff), undefined);
  }

  /** Canonical tracks'i UI'a yaz — hiç YouTube yüklenmeden önce bile dolu görünsün. */
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

  /**
   * Paneldeki bir parçanın "çıkar" butonuyla inventoryden silinmesini yönetir.
   *
   *  - Eğer çıkarılan plak şu an ÇALIYORSA, playback anında pause edilir
   *    (onStateChange guard'ı da tekrar kontrol edecek, ama oyuncuya
   *    anlık geri bildirim vermek için burada erken pauselüyoruz).
   *  - Inventory.eject çağrısı ile `collected` setinden çıkar ve (aktifse)
   *    `activeOrder` sıfırlanır. `onChange` listener panelin re-render'ını
   *    ve gramofon mesh'ini senkronize eder.
   *  - Son olarak `onEjectRecord` callback'i tetiklenir — dünya tarafındaki
   *    yan etkiler (plağı yere bırak) için.
   */
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
          /** Eject butonuna tıklandıysa track çalınmasın. */
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
    /**
     * Öncelik: (1) canlı çalan parça, (2) gramofonda takılı plak,
     * (3) "Hiçbir plak takılı değil".
     */
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

  /** YouTube başlıklarını oEmbed ile doldur → mapping güncelle. */
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
          /** Her 4 başlıktan sonra mapping'i güncelle. */
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
     * SADECE fuzzy match ile eşleşmiş olanları kullan. `fillUnmatched`
     * canonical sıralamaya ait OLMAYAN YouTube videolarını rastgele
     * canonical slot'lara atayabiliyor (albüm dışı parçalar, remix'ler,
     * röportajlar…) — bu da "listede olmayan şarkılar çalıyor"
     * sorununa yol açar. Bu yüzden dolguyu KALDIRIYORUZ: eşleşmeyen
     * canonical'ın `ytIndex` değeri -1 kalır ve hiç çalınmaz.
     *
     * Ayrıca: tüm başlıklar daha hidrate olmadan (rawTitles az) EARLY
     * ÇAĞRI'da yanlış eşleşmeleri önlemek için eşik (`MIN_TITLES_FOR_FINALIZE`)
     * geçilene kadar "geçici" olarak bırakırız.
     */
    const primaryMapping = resolvePlaylistMapping(rawTitlesByIndex);

    uiState.tracks = CANONICAL_TRACKS.map<DisplayTrack>((ct) => {
      const ytIndex = primaryMapping[ct.order - 1];
      return {
        order: ct.order,
        title: ct.title,
        ytIndex,
        ytRawTitle: ytIndex >= 0 ? rawTitlesByIndex[ytIndex] : "",
        videoId: ytIndex >= 0 ? ids[ytIndex] : "",
      };
    });
    renderTrackList();

    /** YouTube şu an hangi canonical parçada? */
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
      debug: uiState.tracks.map((t) => ({
        order: t.order,
        title: t.title,
        ytIdx: t.ytIndex,
        ytTitle: t.ytRawTitle,
      })),
    });
  }

  function captureYtIdsFromPlayer(): boolean {
    if (!player) return false;
    const ids = safeCall<string[] | null | undefined>(() => player!.getPlaylist(), null);
    if (!Array.isArray(ids) || ids.length === 0) return false;
    if (ids.length === playlistState.ids.length) return true; // zaten var
    playlistState.ids = ids.slice();
    console.log(LOG, "Playlist ID listesi alındı", { ytToplam: ids.length });

    /** İlk kez: canonical display'i hemen yaz (hazır görünsün), sonra başlıkları hidrate et. */
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
    if (!player || !playbackState.ready) {
      console.log(LOG, "playCanonical — player henüz hazır değil.");
      return;
    }
    const track = uiState.tracks[canonicalIndex];
    if (!track) return;

    /** Envanter kontrolü — elinde plak yoksa çalma. */
    if (!inventory.has(track.order)) {
      console.log(LOG, "playCanonical reddedildi — plak envanterde yok.", track.order);
      return;
    }
    inventory.setActive(track.order);

    hideFallback();
    safeCall(() => player!.unMute(), undefined);
    updateMuteUi(false);

    if (track.ytIndex < 0) {
      console.warn(LOG, "Bu parça henüz eşlenmedi (ytIndex < 0). Kısa beklemeden sonra denenecek.", {
        order: track.order,
        title: track.title,
      });
      window.setTimeout(() => void playCanonical(canonicalIndex), 600);
      return;
    }

    console.log(LOG, "playCanonical", {
      order: track.order,
      title: track.title,
      ytIdx: track.ytIndex,
      videoId: track.videoId,
    });
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
    if (!window.YT?.Player) {
      console.error(LOG, "YouTube IFrame API yüklenemedi.");
      return;
    }
    console.log(LOG, "IFrame API hazır — player oluşturuluyor.");

    player = new window.YT.Player(frameHost!, {
      width: "100%",
      height: "100%",
      /**
       * KRİTİK KURAL: Müzik ASLA plak takılmadan başlamaz.
       * - `autoplay: 0` → iframe kendi başına oynatmaya kalkmasın.
       * - Player hazır olunca `cuePlaylist` ile yalnız LİSTE yüklenir; oynatma başlamaz.
       * - `getPlaylist()` cue sonrası çalışır, başlıklar hidrate edilebilir.
       * - Gerçek `playVideoAt` ancak oyuncu gramofona plak taktığında tetiklenir.
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
          playbackState.ready = true;
          playbackState.userVolume = Math.max(
            0,
            Math.min(100, Math.round(Number(volumeInput!.value))),
          );
          console.log(LOG, "Player HAZIR — playlist cue'lanıyor, plak bekleniyor.");
          /**
           * Sadece cue et, oynatma! Böylece hem `getPlaylist()` çalışır
           * hem de ses kesinlikle çıkmaz. Mute güvence katmanı.
           */
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
          console.log(LOG, "Durum değişti", { state });
          captureYtIdsFromPlayer();

          /**
           * KRİTİK GUARD + AUTO-ADVANCE — Her çalma/buffer durumu değişiminde:
           *
           * YouTube'un yüklü olduğu video canonical listeye dahil mi VE
           * oyuncunun plağı var mı?
           *
           *  - Değilse: PAUSE DEĞİL, sıradaki TOPLANMIŞ canonical parçaya atla.
           *    Böylece bir parça bittiğinde YT kendiliğinden albüm dışı bir
           *    videoya atlasa veya plağı olmayan bir parçaya geçse bile
           *    sistem otomatik olarak oyuncunun sıradaki plağını çalar.
           *
           *  - Hiç toplanmış sıradaki parça kalmadıysa: tamamen dur.
           */
          if (state === 1 || state === 3) {
            const liveYt = safeCall(() => player!.getPlaylistIndex(), -1);
            const canonical =
              liveYt >= 0 ? uiState.tracks.findIndex((t) => t.ytIndex === liveYt) : -1;
            const canonicalOrder = canonical >= 0 ? uiState.tracks[canonical].order : -1;
            const hasRecord = canonicalOrder > 0 && inventory.has(canonicalOrder);
            const transitioning = performance.now() - lastPlayRequestAt < 900;

            if (canonical < 0 || !hasRecord) {
              if (transitioning) {
                /** YT henüz talep ettiğimiz parçayı yüklememiş olabilir — karar verme, sadece pause olmasın. */
                return;
              }
              const startFrom = canonical >= 0 ? canonical : playbackState.currentCanonical;
              const nxt = findNextCollected(startFrom, 1);
              if (nxt >= 0 && nxt !== startFrom) {
                console.log(LOG, "Geçersiz/plağı olmayan parça — sıradaki toplanmışa atla.", {
                  liveYt,
                  canonical,
                  canonicalOrder,
                  nxt,
                });
                void playCanonical(nxt);
                return;
              }
              console.log(LOG, "Geçersiz parça + sıradaki plak yok — dur.");
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

          /**
           * Bir parça bittiğinde:
           * - envanterde SIRADAKİ toplanmış parça varsa otomatik ona geç,
           * - yoksa TAMAMEN DUR (pause + playing=false).
           */
          if (state === 0) {
            const cur = playbackState.currentCanonical;
            const nxt = findNextCollected(cur, 1);
            if (nxt >= 0 && nxt !== cur) {
              console.log(LOG, "Parça bitti — canonical next", { from: cur, to: nxt });
              void playCanonical(nxt);
            } else {
              console.log(LOG, "Parça bitti — başka plak yok, oynatma durdu.");
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
    /**
     * KURAL: Gramofona plak TAKILI değilse panel düğmesi de oynatmaz.
     * Böylece kullanıcı paneli "oynat" olarak kullanarak kuralı bypass edemez.
     */
    const activeOrder = inventory.activeOrder;
    if (activeOrder <= 0) return;
    if (!inventory.has(activeOrder)) return;

    const idx = uiState.tracks.findIndex((t) => t.order === activeOrder);
    if (idx < 0) return;
    safeCall(() => player!.unMute(), undefined);
    updateMuteUi(false);
    applyEffectiveVolume();

    /** Aynı parça yüklüyse sadece resume; farklıysa yeni parçayı aç. */
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

  /**
   * Yeniden oynat — mevcut parçayı 0'dan başlatır.
   * Eğer hiçbir parça aktif değilse (plak takılı değil) hiçbir şey yapmaz.
   */
  const restartCurrent = (): void => {
    if (!player || !playbackState.ready) return;
    hideFallback();

    /** Önce envanterde takılı plak varsa onu tercih et. */
    const activeOrder = inventory.activeOrder;
    if (activeOrder > 0 && inventory.has(activeOrder)) {
      const idx = uiState.tracks.findIndex((t) => t.order === activeOrder);
      if (idx >= 0) {
        const track = uiState.tracks[idx];
        if (track.ytIndex >= 0) {
          const liveYt = safeCall(() => player!.getPlaylistIndex(), -1);
          if (liveYt === track.ytIndex) {
            console.log(LOG, "Restart — seekTo(0)", { order: track.order });
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

    /** Envanterde aktif plak yoksa — panelde son oynatılan canonical parçayı baştan aç. */
    const curCanonical = playbackState.currentCanonical;
    const t = uiState.tracks[curCanonical];
    if (!t) return;
    if (!inventory.has(t.order)) {
      console.log(LOG, "Restart reddedildi — bu parçanın plağı envanterde yok.");
      return;
    }
    void playCanonical(curCanonical);
  };

  restartBtn.addEventListener("click", restartCurrent);

  /** --- Stop butonu: oynatmayı tamamen durdur ve baştan al. --- */
  stopBtn.addEventListener("click", () => {
    if (!player || !playbackState.ready) return;
    safeCall(() => player!.pauseVideo(), undefined);
    safeCall(() => player!.seekTo(0, true), undefined);
    updatePlayingUi(false);
    setProgress(0, getKnownDuration());
  });

  /** --- İlerleme çubuğu --- */
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

  /** 4Hz poll — YouTube iframe için yeterli ve ucuz. */
  const progressTimer = window.setInterval(() => {
    if (!player || !playbackState.ready) return;
    const cur = safeCall(() => player!.getCurrentTime(), 0);
    const dur = getKnownDuration();
    setProgress(cur, dur);
  }, 250);

  /** Barı tıklanabilir / sürüklenebilir yap. */
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
  /** Pointer-lock'u çalmasın. */
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

  /**
   * User-gesture sinyali.
   *
   * KURAL: Bu fonksiyon PANELİ oynatmaya zorlamaz. Sadece aşağıdaki
   * durumda çalar:
   *  - Gramofona plak TAKILI ise (inventory.activeOrder > 0)
   *
   * Plak takılı değilse sessiz kalır. Böylece tarayıcı veya pointer-lock
   * tıklaması yanlışlıkla müzik tetiklemez.
   */
  const startPlayback = (): void => {
    if (!player || !playbackState.ready) return;
    hideFallback();

    const targetOrder = inventory.activeOrder;
    /** Plak takılı değil — müzik başlamaz. */
    if (targetOrder <= 0) return;

    const target = uiState.tracks.find((t) => t.order === targetOrder);
    if (!target || target.ytIndex < 0) return;

    const liveYt = safeCall(() => player!.getPlaylistIndex(), -1);

    if (liveYt !== target.ytIndex) {
      const idx = uiState.tracks.findIndex((t) => t.order === targetOrder);
      if (idx >= 0) void playCanonical(idx);
      return;
    }

    /** Doğru parça yüklü — kaldığı yerden devam. */
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
    /**
     * Gramofondan plak çıkarıldı (activeOrder → 0) → müzik durur.
     * Bu kural plaksız oynatımın her yolunu kapatır.
     */
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
    /** Hafif bir değişiklik varsa YouTube'a uygula; spam etme. */
    if (Math.abs(clamped - prev) > 0.003) {
      applyEffectiveVolume();
    }
  };

  /** Normalize fonksiyonunu debug amaçlı pencereden erişilebilir bırakma — fazla olur. */
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
