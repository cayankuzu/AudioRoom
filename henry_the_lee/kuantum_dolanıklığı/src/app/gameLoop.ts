import * as THREE from "three";
import { createRenderer } from "../scene/renderer";
import { createScene } from "../scene/scene";
import { createCamera } from "../scene/camera";
import { createLights } from "../scene/lights";
import { createInput } from "../systems/inputSystem";
import { createMovementSystem } from "../systems/movementSystem";
import { createMeasurementSystem } from "../systems/measurementSystem";
import { createRoom } from "../world/room";
import { createWaveFloor } from "../world/waveFloor";
import { createParticles } from "../world/particles";
import { createCenterPiece } from "../world/centerPiece";
import { createGramophone } from "../world/gramophone";
import { createVinylDisk } from "../world/vinylDisk";
import { createCat } from "../world/cat";
import { createMinimap } from "../ui/minimap";
import { createHud } from "../ui/hud";
import { createInteractionHint } from "../ui/interactionHint";
import { createMeasurementPill } from "../ui/measurementPill";
import { createAlbumPanel, type AlbumPanel } from "../ui/albumPanel";
import { createMobileControls } from "../ui/mobileControls";
import { createAudioDistanceSystem } from "../systems/audioDistanceSystem";
import { createCarryState, type CarryHolding } from "../state/carry";
import { applyWorldScaleForInput, CARRY } from "../config/config";
import { pickSpawn, randomYaw, type SpawnPoint } from "../utils/spawn";
import {
  exitFullscreen,
  isFullscreen,
  isFullscreenSupported,
  onFullscreenChange,
  requestFullscreen,
  tryHideMobileAddressBar,
} from "../utils/fullscreen";

export interface ExperienceHandle {
  requestLock(): void;
  releaseLock(): void;
  onLockChange(cb: (locked: boolean) => void): () => void;
  /**
   * UI katmanını mount et: minimap, interaction-hint, measurement-pill ve
   * 3D-anchored overlay'ler (kedi nameplate) hepsi tek seferde bağlanır.
   */
  attachUi(parent: HTMLElement): void;
  dispose(): void;
}

/**
 * Sahneyi kurar, sistemleri bağlar, RAF döngüsünü başlatır.
 *
 * Etkileşim modeli:
 *  - WASD/Shift/Space → hareket
 *  - G → KONUM ölç (Heisenberg), H → HIZ ölç; M/K/P Redd ile aynı: harita,
 *    kontroller (HUD), albüm paneli
 *  - E → yakın objeyi al / plağı gramofon tablasına yerleştir
 *  - Q → eldekini bırak
 *
 * Cooldown: G/H ölçümleri aynı anda olamaz; MEASUREMENT.cooldown sistemde.
 */
export function startExperience(container: HTMLElement): ExperienceHandle {
  const renderer = createRenderer(container);
  const scene = createScene();
  const camera = createCamera();
  /**
   * KRİTİK: Kamerayı sahne grafiğine ekliyoruz. Aksi takdirde
   * `camera.add(obj)` ile parent'lanan objeler (taşınan plak/gramofon)
   * RENDER EDİLMEZ — three.js sadece scene altındaki düğümleri çizer.
   * Redd · Mükemmel Boşluk projesinde de aynı kalıp uygulanır.
   */
  scene.add(camera);
  const worldLights = createLights(scene);

  /** Dokunmatikte 180 m kutu — `createRoom` / spawn öncesi `WORLD.half` ayarlanır. */
  const input = createInput(renderer.domElement);
  applyWorldScaleForInput(input.isTouch);

  /** ── Dünya ───────────────────────────────────────────────────── */
  createRoom(scene);
  const waveFloor = createWaveFloor(scene);
  /** İki katmanlı atmosfer tozu — `WORLD.half` ile ölçeklenir. */
  const particles = createParticles(scene);
  const center = createCenterPiece(scene);
  void center.ready;

  /**
   * Spawn — her açılışta gramofon, plak, kedi rastgele konumlarda doğsun.
   * Sıra: gramofon → plak → kedi (büyükten küçüğe).
   */
  const taken: SpawnPoint[] = [];
  const gramSpawn = pickSpawn(taken);
  taken.push(gramSpawn);
  const vinylSpawn = pickSpawn(taken);
  taken.push(vinylSpawn);
  const catSpawn = pickSpawn(taken);
  taken.push(catSpawn);

  const gramophone = createGramophone({
    scene,
    position: gramSpawn,
    yaw: randomYaw(),
  });
  const vinyl = createVinylDisk(scene, { startPosition: vinylSpawn });
  const cat = createCat(scene, { startPosition: catSpawn });

  /** ── Sistemler ───────────────────────────────────────────────── */
  const movement = createMovementSystem(camera, input);
  const measurement = createMeasurementSystem();
  const carry = createCarryState();
  const audioDist = createAudioDistanceSystem();

  /** ── UI handles (attachUi'de doldurulur) ─────────────────────── */
  let hud: ReturnType<typeof createHud> | null = null;
  let minimap: ReturnType<typeof createMinimap> | null = null;
  let hint: ReturnType<typeof createInteractionHint> | null = null;
  let pill: ReturnType<typeof createMeasurementPill> | null = null;
  let albumPanel: AlbumPanel | null = null;
  let nameplateContainer: HTMLElement = document.body;
  let uiMounted = false;

  /** Edge-triggered key listeners — pointer-lock'tan bağımsız çalışır;
   *  measurement / carry yalnızca lock aktifken etkinleşir. */
  const offKeys: Array<() => void> = [];

  const tryMeasurePosition = () => {
    if (!input.isLocked()) return;
    if (!measurement.isReady()) return;
    /** Plak taşınıyor veya tablada → "kuantum"u bozuk; ölçüm anlamsız. */
    if (vinyl.mode !== "free") return;
    const ok = measurement.measurePosition(vinyl.position, performance.now() / 1000);
    if (!ok) return;
    const dx = vinyl.position.x - movement.pose.position.x;
    const dz = vinyl.position.z - movement.pose.position.z;
    const dist = Math.hypot(dx, dz);
    pill?.show("position", { distance: dist, x: vinyl.position.x, z: vinyl.position.z });
    minimap?.flashVinyl(vinyl.position, 1800);
  };

  const tryMeasureVelocity = () => {
    if (!input.isLocked()) return;
    if (!measurement.isReady()) return;
    if (vinyl.mode !== "free") return;
    const ok = measurement.measureVelocity(vinyl.velocity, performance.now() / 1000);
    if (!ok) return;
    pill?.show("velocity", { speed: Math.hypot(vinyl.velocity.x, vinyl.velocity.z) });
  };

  /** Mesafe yardımcıları. */
  const distXZ = (a: { x: number; z: number }, b: { x: number; z: number }) =>
    Math.hypot(a.x - b.x, a.z - b.z);

  const tryPickupOrPlace = () => {
    if (!input.isLocked()) return;
    const px = movement.pose.position.x;
    const pz = movement.pose.position.z;

    /** ─ Eli boşsa: yakın objeyi al ──────────────────────────────
     *  Öncelik: plak (kaçtığı için yakalandıysa kaybetme) → kedi
     *  (kaçar ama dramatik yakalama) → gramofon (sabit, en az öncelik). */
    if (carry.holding === "none") {
      const dV = vinyl.mode === "free" ? distXZ({ x: px, z: pz }, vinyl.position) : Infinity;
      const dC = cat.mode === "free" ? distXZ({ x: px, z: pz }, cat.position) : Infinity;
      const dG = distXZ({ x: px, z: pz }, gramophone.position);
      /** En yakın etkileşilebilir objeyi seç. */
      const candidates: Array<[number, () => void]> = [];
      if (dV <= CARRY.pickupRange) {
        candidates.push([dV, () => {
          carry.holding = "vinyl";
          vinyl.setMode("carried", camera);
        }]);
      }
      if (dC <= CARRY.pickupRange) {
        candidates.push([dC, () => {
          carry.holding = "cat";
          cat.setCarried(true, camera);
        }]);
      }
      if (dG <= CARRY.pickupRange) {
        candidates.push([dG, () => {
          carry.holding = "gramophone";
          gramophone.setCarried(true, camera, waveFloor.getHeightAt);
        }]);
      }
      if (candidates.length === 0) return;
      candidates.sort((a, b) => a[0] - b[0]);
      candidates[0][1]();
      return;
    }

    /** ─ Plak elde + gramofona yakın → tablaya yerleştir ──────── */
    if (carry.holding === "vinyl") {
      const dG = distXZ({ x: px, z: pz }, gramophone.position);
      if (dG <= CARRY.placeRange && !carry.vinylOnPlatter) {
        carry.holding = "none";
        carry.vinylOnPlatter = true;
        vinyl.setMode("onPlatter", camera);
        gramophone.setActive(true);
        albumPanel?.setActive(true);
      }
    }
  };

  /**
   * Plağı tabladan çıkar — yalnızca oynatma listesindeki ⏏ butonundan.
   * Q tuşu tabladan çıkarmaz (kullanıcı talebi).
   */
  const ejectFromPlatter = () => {
    if (!carry.vinylOnPlatter) return;
    carry.vinylOnPlatter = false;
    vinyl.setMode("free", camera);
    gramophone.setActive(false);
    albumPanel?.setActive(false);
  };

  const tryDrop = () => {
    if (!input.isLocked()) return;
    if (carry.holding === "vinyl") {
      carry.holding = "none";
      vinyl.setMode("free", camera);
    } else if (carry.holding === "gramophone") {
      carry.holding = "none";
      gramophone.setCarried(false, camera, waveFloor.getHeightAt);
    } else if (carry.holding === "cat") {
      carry.holding = "none";
      cat.setCarried(false, camera);
    }
  };

  offKeys.push(input.onKeyPress("KeyG", tryMeasurePosition));
  offKeys.push(input.onKeyPress("KeyH", tryMeasureVelocity));
  offKeys.push(input.onKeyPress("KeyE", tryPickupOrPlace));
  offKeys.push(input.onKeyPress("KeyQ", tryDrop));

  const attachUi = (parent: HTMLElement) => {
    if (uiMounted) return;
    uiMounted = true;
    hud = createHud(parent, { showLibraryBack: true, libraryHref: "../../" });
    minimap = createMinimap(parent);
    hint = createInteractionHint(parent);
    pill = createMeasurementPill(parent);
    albumPanel = createAlbumPanel(parent, {
      onEjectRecord: () => ejectFromPlatter(),
    });
    /** Kedi nameplate gibi 3D-anchored DOM overlay'ler için ayrı katman. */
    const overlayMount = document.createElement("div");
    overlayMount.className = "kd-overlay-mount";
    parent.appendChild(overlayMount);
    nameplateContainer = overlayMount;

    /** İmleç noktası — minimal merkez işaret. */
    const cross = document.createElement("div");
    cross.className = "kd-crosshair";
    parent.appendChild(cross);
  };

  attachUi(document.body);
  /** attachUi içinde atanıyor; closure atamaları TS daraltmasına girmez. */
  const uiHud = hud!;
  const uiMinimap = minimap!;
  const uiAlbumPanel = albumPanel!;

  /**
   * Redd · Mükemmel Boşluk ile aynı kısayollar (edge, form alanında yutulur):
   * M harita, K kontroller (HUD), P albüm / oynatıcı paneli.
   */
  const onUiShortcutKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
      return;
    }
    switch (e.code) {
      case "KeyM":
        uiMinimap.toggle();
        e.preventDefault();
        break;
      case "KeyK":
        uiHud.toggle();
        e.preventDefault();
        break;
      case "KeyP":
        uiAlbumPanel.toggle();
        e.preventDefault();
        break;
      default:
        break;
    }
  };
  document.addEventListener("keydown", onUiShortcutKeyDown);
  offKeys.push(() => document.removeEventListener("keydown", onUiShortcutKeyDown));

  async function toggleFullscreen(): Promise<void> {
    try {
      if (isFullscreen()) await exitFullscreen();
      else if (isFullscreenSupported()) {
        await requestFullscreen(document.documentElement);
      }
    } catch {
      /* iOS / reddedildi */
    }
    tryHideMobileAddressBar();
  }

  const mobileControls = input.isTouch
    ? createMobileControls(document.body, input, {
        onToggleMap: () => uiMinimap.toggle(),
        onTogglePanel: () => uiAlbumPanel.toggle(),
        onPause: () => input.releaseLock(),
        onToggleFullscreen: () => {
          void toggleFullscreen();
        },
        onGoBack: () => {
          if (
            window.confirm(
              "Kütüphaneye dönmek istediğinize emin misiniz? Mevcut oturum sonlanır.",
            )
          ) {
            window.location.href = "../../";
          }
        },
      })
    : null;

  document.body.classList.add("is-in-experience");

  let unwatchFullscreen: (() => void) | null = null;
  const onOrientHideBar = () => tryHideMobileAddressBar();

  if (input.isTouch) {
    document.body.classList.add("is-touch");
    mobileControls?.setVisible(false);
    if (uiMinimap.isOpen()) uiMinimap.toggle();
    if (uiAlbumPanel.isOpen()) uiAlbumPanel.toggle();
    tryHideMobileAddressBar();
    window.addEventListener("orientationchange", onOrientHideBar);
    unwatchFullscreen = onFullscreenChange(() => {
      const active = isFullscreen();
      mobileControls?.setFullscreenActive(active);
      document.body.classList.toggle("is-fullscreen", active);
      tryHideMobileAddressBar();
    });
    mobileControls?.setFullscreenActive(isFullscreen());
    document.body.classList.toggle("is-fullscreen", isFullscreen());
  }

  const offMobileLock = input.onLockChange((locked) => {
    if (!input.isTouch) return;
    mobileControls?.setVisible(locked);
  });

  /** ── Resize ───────────────────────────────────────────────────── */
  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  /** ── RAF döngüsü ──────────────────────────────────────────────── */
  const clock = new THREE.Clock();
  let raf = 0;
  const tmpPlatter = new THREE.Vector3();
  const tmpGramWorld = new THREE.Vector3();
  const tmpCatMarker = { position: new THREE.Vector3(), color: "rgba(220,220,220,0.85)", radius: 3 };

  const tick = () => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    /** Önce zemini güncelle ki diğer sistemler doğru getHeightAt() okusun. */
    waveFloor.update(time);
    movement.update(delta, waveFloor.getHeightAt, (sx, sz) => {
      waveFloor.addRipple(sx, sz, time);
    });

    particles.update(time, delta);
    worldLights.update(time);
    center.update(time, delta);
    gramophone.update(time, delta, waveFloor.getHeightAt);

    /**
     * Kamera matris güncellemesi — gramofon + vinyl carried/onPlatter
     * world pozisyonlarının doğru hesaplanması için RAF'tan ÖNCE.
     */
    camera.updateMatrixWorld(true);

    /** Plağın platter pozisyonunu hesapla — onPlatter modunda gerekli. */
    const platterPos = carry.vinylOnPlatter
      ? gramophone.platterWorld(tmpPlatter)
      : null;

    vinyl.update(
      time,
      delta,
      waveFloor.getHeightAt,
      movement.pose.position,
      platterPos,
    );

    /**
     * Mesafe-bazlı ses kazancı — gramofona uzaklığa göre.
     * Carried iken gramofon kameraya bağlı → world pos = kamera ~ player;
     * yani uzaklık ~0, ses tam seviyede (gramofon "elinde", net duyulur).
     * Placed iken oda içi gerçek mesafe → smoothstep ile kısılır.
     */
    if (gramophone.state === "carried") {
      audioDist.update(delta, movement.pose.position, movement.pose.position);
    } else {
      tmpGramWorld.set(gramophone.position.x, 0, gramophone.position.z);
      const playerXZ = new THREE.Vector3(
        movement.pose.position.x, 0, movement.pose.position.z,
      );
      audioDist.update(delta, playerXZ, tmpGramWorld);
    }
    albumPanel?.setDistanceGain(audioDist.gain);

    cat.update(
      time,
      delta,
      waveFloor.getHeightAt,
      camera,
      movement.pose.position,
      nameplateContainer,
    );
    measurement.update(time);

    /** ── UI: minimap (kedi marker'ı dahil) ────────────────────── */
    if (minimap) {
      tmpCatMarker.position.copy(cat.position);
      minimap.update(
        movement.pose.position,
        movement.pose.yaw,
        new THREE.Vector3(gramophone.position.x, 0, gramophone.position.z),
        [tmpCatMarker],
      );
    }

    /** ── UI: proximity interaction hint ─────────────────────────
     *  Kurallar:
     *   - Eli boş + yakın obje varsa "E al" (plak / kedi / gramofon).
     *   - Plak elde + gramofon menzilde + boş tablada → "E yerleştir".
     *   - Plak/Gramofon/Kedi elde → "Q bırak".
     *   - "Plağı tabladan çıkar" yalnızca playlist ⏏ ile; Q tabladan çıkarmaz. */
    if (hint) {
      const px = movement.pose.position.x;
      const pz = movement.pose.position.z;
      const gramPlaced = gramophone.state !== "carried";
      let shown = false;
      if (carry.holding === "vinyl") {
        const dG = gramPlaced ? distXZ({ x: px, z: pz }, gramophone.position) : Infinity;
        if (dG <= CARRY.placeRange && !carry.vinylOnPlatter) {
          hint.show("E", "Plağı gramofona yerleştir");
        } else {
          hint.show("Q", "Plağı bırak");
        }
        shown = true;
      } else if (carry.holding === "gramophone") {
        hint.show("Q", "Gramofonu bırak");
        shown = true;
      } else if (carry.holding === "cat") {
        hint.show("Q", "Kediyi yere bırak");
        shown = true;
      } else {
        const dV =
          vinyl.mode === "free" ? distXZ({ x: px, z: pz }, vinyl.position) : Infinity;
        const dC = cat.mode === "free" ? distXZ({ x: px, z: pz }, cat.position) : Infinity;
        const dG = gramPlaced ? distXZ({ x: px, z: pz }, gramophone.position) : Infinity;
        /** En yakını seç (pickup için). */
        let best: "vinyl" | "cat" | "gramophone" | null = null;
        let bestDist = Infinity;
        if (dV <= CARRY.pickupRange && dV < bestDist) { best = "vinyl"; bestDist = dV; }
        if (dC <= CARRY.pickupRange && dC < bestDist) { best = "cat"; bestDist = dC; }
        if (dG <= CARRY.pickupRange && dG < bestDist) { best = "gramophone"; bestDist = dG; }
        if (best === "vinyl") { hint.show("E", "Plağı al"); shown = true; }
        else if (best === "cat") { hint.show("E", "Kediyi kucağa al"); shown = true; }
        else if (best === "gramophone") { hint.show("E", "Gramofonu al"); shown = true; }
      }
      if (!shown) hint.hide();
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  /** Yardımcı: holding tipini güvenli karşılaştırma için. */
  void (null as CarryHolding | null);

  return {
    requestLock: () => input.requestLock(),
    releaseLock: () => input.releaseLock(),
    onLockChange: (cb) => input.onLockChange(cb),
    attachUi,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      offMobileLock();
      unwatchFullscreen?.();
      window.removeEventListener("orientationchange", onOrientHideBar);
      mobileControls?.dispose();
      document.body.classList.remove(
        "is-in-experience",
        "is-touch",
        "is-fullscreen",
        "is-overlay-open",
        "is-ui-hidden",
      );
      offKeys.forEach((off) => off());
      input.dispose();
      hud?.dispose();
      minimap?.dispose();
      hint?.dispose();
      pill?.dispose();
      albumPanel?.dispose();
      cat.dispose();
      scene.remove(particles.group);
      renderer.dispose();
      renderer.domElement.parentElement?.removeChild(renderer.domElement);
    },
  };
}
