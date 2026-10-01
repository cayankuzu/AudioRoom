import * as THREE from "three";
import { createHud } from "../../../../shared/ui/hud";
import { createMobileControls, type MobileControls } from "../../../../shared/ui/mobileControls";
import { createCaptureControls } from "../../../../redd/mukemmel_bosluk/src/ui/captureControls";
import { ASSETS, BUNNY, PLAYER, WORLD } from "../config";
import { createInput } from "../systems/inputSystem";
import {
  createPerformanceManager,
  getInitialGraphicsProfile,
  getStoredGraphicsMode,
  type GraphicsProfile,
} from "../systems/performanceManager";
import { createGameHud } from "../ui/gameHud";
import { createGraphicsSettings } from "../ui/graphicsSettings";
import { createInteractionHint } from "../ui/interactionHint";
import { createMinimap } from "../ui/minimap";
import { createSoundtrackPanel } from "../ui/soundtrackPanel";
import {
  exitFullscreen,
  isFullscreen,
  onFullscreenChange,
  requestFullscreen,
} from "../utils/fullscreen";
import { createArena } from "../world/arena";
import { createBunny, type BunnyStage } from "../world/bunny";
import { createBurrowSystem } from "../world/burrows";
import { createCarrotBlaster } from "../world/carrotBlaster";
import { createCenterPiece } from "../world/centerPiece";
import { createCollisionWorld } from "../world/collisionWorld";
import { createFlashlight } from "../world/flashlight";
import { createGramophone } from "../world/gramophone";
import { createPlayerRecord } from "../world/playerRecord";

export interface KlostrofobikExperience {
  readonly ready: Promise<void>;
  requestLock(): void;
  /** Fare kilidi alınamazsa sürükle-bak ile başlat. */
  forceStart?(): void;
  releaseLock(): void;
  onLockChange(cb: (locked: boolean) => void): () => void;
  dispose(): void;
}

export interface ExperienceOptions {
  onProgress?: (value: number, detail?: string) => void;
}

interface DebugSnapshot {
  ready: boolean;
  stage: string;
  objective: string;
  burrowPhase: string;
  hits: number;
  hitWindowRemaining: number;
  player: [number, number, number];
  playerYaw: number;
  bunny: [number, number, number];
  gramophone: [number, number, number];
  playerRecord: [number, number, number];
  gramophoneStolen: boolean;
  gramophonePlayerCarried: boolean;
  gramophonePlaced: boolean;
  gramophoneHasRecord: boolean;
  musicGain: number;
  shotsFired: number;
  carrots: ReturnType<ReturnType<typeof createCarrotBlaster>["snapshot"]>;
  colliders: { active: number; total: number };
  recordCaptured: boolean;
  recordInserted: boolean;
  playerRecordState: string;
  burrows: ReturnType<ReturnType<typeof createBurrowSystem>["snapshot"]>;
  errors: string[];
  performance: ReturnType<ReturnType<typeof createPerformanceManager>["snapshot"]>;
}

declare global {
  interface Window {
    __klostrofobikDebug?: {
      snapshot(): DebugSnapshot;
      hitBunny(): string;
      captureRecord(): boolean;
      insertRecord(): boolean;
      stealGramophone(): boolean;
      reset(): void;
      fire(): boolean;
      triggerBurrow(): void;
      enterTunnel(): boolean;
      approachBunnyInTunnel(): boolean;
      focusBunny(): void;
      setPlayer(x: number, z: number, yaw?: number): void;
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function horizontalDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function turtleLodForTier(tier: GraphicsProfile["tier"]): keyof typeof ASSETS.turtleModels {
  if (tier === "low") return "performance";
  if (tier === "ultra") return "quality";
  return "balanced";
}

export function startExperience(
  container: HTMLElement,
  options: ExperienceOptions = {},
): KlostrofobikExperience {
  document.body.classList.add("is-in-experience");

  const initialGraphicsMode = getStoredGraphicsMode();
  const initialGraphicsProfile = getInitialGraphicsProfile(initialGraphicsMode);
  const renderer = new THREE.WebGLRenderer({
    antialias: initialGraphicsProfile.tier !== "low",
    powerPreference: "high-performance",
    stencil: false,
    preserveDrawingBuffer: false,
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  // Renderer tarafÄ±ndaki shadow pipeline oturum boyunca aÃ§Ä±k kalÄ±r. DÃ¼ÅŸÃ¼k
  // profilde maliyeti, gÃ¶lge Ã¼reten Ä±ÅŸÄ±ÄŸÄ± kapatarak sÄ±fÄ±rlÄ±yoruz; global
  // pipeline'Ä± kapatÄ±p aÃ§mak GLTF shader programlarÄ±nÄ± geÃ§ersizleÅŸtiriyordu.
  renderer.shadowMap.enabled = true;
  // Three r184'te PCFShadowMap bazÄ± GLTF dokularÄ±yla karÅŸÄ±laÅŸtÄ±rmalÄ±
  // sampler uyuÅŸmazlÄ±ÄŸÄ± Ã¼retebiliyor. GÃ¶lge algoritmasÄ±nÄ± profil geÃ§iÅŸinde
  // deÄŸiÅŸtirmemek, shader ve shadow texture biÃ§imini oturum boyunca tutarlÄ± tutar.
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const performanceManager = createPerformanceManager(renderer, initialGraphicsMode);
  renderer.domElement.dataset.testid = "klostrofobik-canvas";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(69, window.innerWidth / window.innerHeight, 0.08, 260);
  scene.add(camera);

  scene.add(new THREE.HemisphereLight("#f0d9a3", "#25291a", 2.25));
  const keyLight = new THREE.DirectionalLight("#ffe0a2", 3.25);
  keyLight.position.set(-18, 34, 22);
  keyLight.castShadow = initialGraphicsProfile.shadows;
  // Shadow render target boyutunu Ã§alÄ±ÅŸma anÄ±nda deÄŸiÅŸtirmek GPU dokusunu
  // yeniden yaratÄ±p bazÄ± sÃ¼rÃ¼cÃ¼lerde boÅŸ kare Ã¼retiyor. Sabit 1024 tampon;
  // profiller arasÄ±ndaki kaliteyi gÃ¼ncelleme sÄ±klÄ±ÄŸÄ±yla ayÄ±rÄ±yoruz.
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -45;
  keyLight.shadow.camera.right = 45;
  keyLight.shadow.camera.top = 45;
  keyLight.shadow.camera.bottom = -45;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 90;
  scene.add(keyLight);
  // autoUpdate kapalÄ±yken ilk ana render'dan Ã¶nce geÃ§erli bir depth texture
  // Ã¼retmek zorundayÄ±z. Aksi halde Orta/YÃ¼ksek profilleri ilk 1-2 karede
  // karÅŸÄ±laÅŸtÄ±rma sampler'Ä±na boÅŸ renk dokusu baÄŸlayÄ±p sahneyi Ã§izemiyor.
  renderer.shadowMap.needsUpdate = initialGraphicsProfile.shadows;
  const centerGlow = new THREE.PointLight("#db6132", 18, 34, 2);
  centerGlow.position.set(0, 8, 0);
  scene.add(centerGlow);

  let reportedProgress = 0;
  const reportProgress = (value: number, detail: string) => {
    reportedProgress = Math.max(reportedProgress, Math.min(99, value));
    options.onProgress?.(reportedProgress, detail);
  };
  const manager = new THREE.LoadingManager();
  manager.onStart = () => reportProgress(4, "Dünya açılıyor…");
  manager.onProgress = (_url, loaded, total) => {
    reportProgress(12 + (loaded / Math.max(1, total)) * 76, "Varlıklar sahneye yerleştiriliyor…");
  };
  manager.onError = (url) => console.warn("[Klostrofobik] Varlık yüklenemedi:", url);

  const arena = createArena(scene, manager);
  const burrows = createBurrowSystem(
    scene,
    arena.getHeightAt,
    initialGraphicsProfile.tunnelDetail,
  );
  const centerPiece = createCenterPiece(scene, manager, camera, (value) => {
    reportProgress(7 + value * 70, "Kaplumbağa merkezde uyanıyor…");
  }, ASSETS.turtleModels[turtleLodForTier(initialGraphicsProfile.tier)]);
  const bunny = createBunny(scene, manager, arena.getHeightAt, (value) => {
    reportProgress(76 + value * 16, "Tavşan koşuya hazırlanıyor…");
  });
  const gramophone = createGramophone(scene, camera, arena.getHeightAt, [
    bunny.position,
    PLAYER.start,
  ]);
  const playerRecord = createPlayerRecord(scene, camera, manager, arena.getHeightAt);
  const collisionWorld = createCollisionWorld();
  arena.colliders.forEach((object) => collisionWorld.addBox(object));
  void centerPiece.ready.then(() => {
    centerPiece.colliders.forEach((object) => collisionWorld.addBox(object, 0.43));
  });
  const blaster = createCarrotBlaster(
    scene,
    camera,
    manager,
    arena.getHeightAt,
    collisionWorld,
    burrows,
  );
  const flashlight = createFlashlight(camera);
  const input = createInput(renderer.domElement);
  document.body.classList.toggle("is-touch", input.isTouch);

  const gameHud = createGameHud(document.body);
  const interactionHint = createInteractionHint(document.body);
  const minimap = createMinimap(document.body);
  let collisionUpdateStride = initialGraphicsProfile.tier === "low" ? 6 : 3;
  let shadowUpdateStride = initialGraphicsProfile.tier === "ultra" ? 1 : 3;
  const applyGraphicsProfile = (profile: GraphicsProfile) => {
    const shadowsWereEnabled = keyLight.castShadow;
    keyLight.castShadow = profile.shadows;
    if (profile.shadows && !shadowsWereEnabled) {
      renderer.shadowMap.needsUpdate = true;
    }
    collisionUpdateStride = profile.tier === "low" ? 6 : profile.tier === "medium" ? 4 : profile.tier === "high" ? 3 : 2;
    shadowUpdateStride = profile.tier === "ultra" ? 1 : profile.tier === "high" ? 2 : 3;
    burrows.setDetail(profile.tunnelDetail);
    blaster.setBudgets(profile.activeProjectileBudget, profile.particleBudget);
  };
  const graphicsSettings = createGraphicsSettings(
    document.body,
    performanceManager,
    applyGraphicsProfile,
  );
  const dropPosition = new THREE.Vector3();
  const dropForward = new THREE.Vector3();
  const computeDropPosition = () => {
    camera.getWorldDirection(dropForward);
    dropForward.y = 0;
    if (dropForward.lengthSq() < 0.001) dropForward.set(0, 0, -1);
    dropForward.normalize();
    return dropPosition.copy(playerPosition).addScaledVector(dropForward, 1.15);
  };
  let soundtrack: ReturnType<typeof createSoundtrackPanel>;
  soundtrack = createSoundtrackPanel(document.body, {
    onEjectRecord: () => {
      if (!gramophone.removeRecord()) return;
      soundtrack.lock("Plak yerde");
      recordInserted = false;
      const gramPosition = gramophone.position;
      const underground = burrows.isUndergroundPosition(gramPosition);
      playerRecord.dropAt(
        dropPosition.set(
          gramPosition.x + 0.9,
          underground ? gramPosition.y + 0.08 : gramPosition.y,
          gramPosition.z + 0.75,
        ),
        underground,
      );
      gameHud.flash("Plak gramofondan çıkarıldı", "hit");
    },
  });
  const captureControls = createCaptureControls(document.body, {
    captureScreenshot: () => {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    },
    shareUrl: window.location.href,
    shareTitle: "Henry the Lee — Klostrofobik Kaplumbağa",
    shareText: "Tavşanın peşinden koş, plağı kurtar ve gramofonda çal.",
  });
  const controlsHud = createHud(document.body, {
    title: "Kontroller",
    showLibraryBack: true,
    libraryHref: "../../../",
    sections: [
      [
        { key: "WASD / Oklar", label: "Yürü" },
        { key: "Shift", label: "Koş · 3 sn sınır" },
        { key: "C / Ctrl", label: "Çömel · tünele gir" },
        { key: "Boşluk", label: "Zıpla" },
        { key: "Fare", label: "Bakış" },
        { key: "F", label: "Fener" },
      ],
      [
        { key: "Sol tık", label: "Havuç at" },
        { key: "E", label: "Plağı tak veya gramofonu al" },
        { key: "R", label: "Gramofonu başlat veya duraklat" },
        { key: "Q", label: "Elindekini bırak" },
      ],
      [
        { key: "P", label: "Albüm paneli · plağı çıkar" },
        { key: "M", label: "Harita" },
        { key: "K", label: "Kontroller" },
        { key: "F2", label: "Grafik ayarları" },
        { key: "T", label: "Ekran görüntüsü" },
      ],
      [{ key: "Esc", label: "İmleci serbest bırak", tone: "hint" }],
    ],
  });

  let mobileControls: MobileControls | null = null;
  if (input.isTouch) {
    mobileControls = createMobileControls(document.body, input, {
      actions: [
        {
          slot: "top-right",
          keyCode: "KeyX",
          glyph: "🥕",
          label: "HAVUÇ",
          ariaLabel: "Havuç at",
          tone: "primary",
        },
        {
          slot: "top-middle",
          keyCode: "KeyR",
          glyph: "R",
          label: "ÇAL",
          ariaLabel: "Gramofonu oynat veya duraklat",
          tone: "secondary",
        },
        {
          slot: "top-left",
          keyCode: "KeyQ",
          glyph: "Q",
          label: "BIRAK",
          ariaLabel: "Eldekini bırak",
          tone: "secondary",
        },
        {
          slot: "bottom-middle",
          keyCode: "Space",
          glyph: "↑",
          label: "ZIPLA",
          ariaLabel: "Zıpla",
          tone: "secondary",
        },
        {
          slot: "bottom-right",
          keyCode: "KeyE",
          glyph: "E",
          label: "ETKİLEŞ",
          ariaLabel: "Plağı veya gramofonu kullan",
          tone: "secondary",
        },
      ],
      tools: [
        {
          id: "back",
          icon: "back",
          ariaLabel: "Kütüphaneye dön",
          onPress: () => {
            input.releaseLock();
            window.location.href = "../../../";
          },
        },
        { id: "eye", icon: "eye", ariaLabel: "Arayüzü gizle", special: "eye" },
        {
          id: "panel",
          icon: "panel",
          ariaLabel: "Kontrolleri aç veya kapat",
          onPress: () => controlsHud.toggle(),
        },
        {
          id: "fullscreen",
          icon: "fullscreen",
          ariaLabel: "Tam ekran",
          special: "fullscreen",
          onPress: () => {
            if (isFullscreen()) void exitFullscreen();
            else void requestFullscreen().catch(() => undefined);
          },
        },
        {
          id: "pause",
          icon: "pause",
          ariaLabel: "Duraklat",
          onPress: () => input.releaseLock(),
        },
      ],
      lookSkipSelectors: [".album-panel", ".minimap", ".interaction-hint", ".capture-panel", ".shot-preview"],
    });
    mobileControls.setVisible(false);
  }

  const offFullscreen = onFullscreenChange(() => {
    const active = isFullscreen();
    document.body.classList.toggle("is-fullscreen", active);
    mobileControls?.setFullscreenActive(active);
  });

  const playerPosition = new THREE.Vector3(
    PLAYER.start.x,
    arena.getHeightAt(PLAYER.start.x, PLAYER.start.z) + PLAYER.eyeHeight,
    PLAYER.start.z,
  );
  const velocity = new THREE.Vector3();
  const wish = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const nextPosition = new THREE.Vector3();
  let yaw = 0;
  let pitch = -0.04;
  let verticalVelocity = 0;
  let currentEyeHeight: number = PLAYER.eyeHeight;
  let grounded = true;
  let jumpQueued = false;
  let sprintEnergy: number = PLAYER.sprintDuration;
  let sprintExhausted = false;
  let sprintingNow = false;
  let readyState = false;
  let recordCaptured = false;
  let recordInserted = false;
  let shotsFired = 0;
  let fireHeldLastFrame = false;
  let victoryPulse = 0;
  let disposed = false;
  let previousBunnyStage: BunnyStage = bunny.stage;
  const runtimeErrors: string[] = [];

  const onRuntimeError = (event: ErrorEvent) => runtimeErrors.push(event.message || "Bilinmeyen hata");
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    runtimeErrors.push(event.reason instanceof Error ? event.reason.message : String(event.reason));
  };
  window.addEventListener("error", onRuntimeError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  const nearStoppedBunny = () =>
    bunny.stage === "stopped" &&
    bunny.position.distanceTo(playerPosition) <= BUNNY.collectRadius;

  const handleBunnyHit = () => {
    const nextStage = bunny.hit();
    const hits = bunny.hits;
    if (hits > 0 && hits < 3) {
      gameHud.flash(`İsabet ${hits}/3 · Tavşan yön değiştirdi`, "hit");
    } else if (hits === 3 && nextStage === "walking") {
      gameHud.flash("3 isabet · Tavşan yavaşladı", "hit");
    } else if (hits > 3 && hits < 6) {
      gameHud.flash(`İsabet ${hits}/6 · ${6 - hits} isabet kaldı`, "hit");
    } else if (nextStage === "stopped") {
      gameHud.flash("6 isabet · Tavşan 3 saniye durdu", "success");
    }
  };

  const tryInteract = (): boolean => {
    if (!readyState) return false;

    if (nearStoppedBunny() && bunny.hasRecord) {
      if (gramophone.isPlayerCarried) {
        gameHud.flash("Önce gramofonu Q ile bırak", "hit");
        return false;
      }
      if (!bunny.collect()) return false;
      recordCaptured = true;
      playerRecord.carry();
      soundtrack.lock("Plak oyuncuda");
      victoryPulse = 0.45;
      gameHud.flash("Plak alındı · Şimdi gramofona götür", "success");
      return true;
    }

    if (nearStoppedBunny() && gramophone.isStolen) {
      gramophone.recoverNear(playerPosition, burrows.isPlayerInside);
      gameHud.flash("Gramofon tavşandan geri alındı", "success");
      return true;
    }

    if (playerRecord.canPickUp(playerPosition)) {
      if (gramophone.isPlayerCarried) {
        gameHud.flash("Önce gramofonu Q ile bırak", "hit");
        return false;
      }
      playerRecord.carry();
      soundtrack.lock("Plak oyuncuda");
      gameHud.flash("Plak ele alındı", "success");
      return true;
    }

    if (gramophone.canInteract(playerPosition)) {
      if (playerRecord.isCarried) {
        if (!gramophone.insertRecord()) return false;
        playerRecord.hide();
        recordInserted = true;
        victoryPulse = 1;
        soundtrack.unlock();
        gameHud.flash("Plak gramofona takıldı · Müzik başladı", "success");
        return true;
      }
      if (gramophone.playerPickUp()) {
        gameHud.flash(
          gramophone.hasRecord
            ? "Plaklı gramofon ele alındı · Q ile bırak"
            : "Gramofon ele alındı · Q ile bırak",
        );
        return true;
      }
    }
    return false;
  };

  const dropCarried = (): boolean => {
    if (playerRecord.isCarried) {
      const position = computeDropPosition();
      const tunnelFloor = burrows.getActiveFloorHeight();
      if (tunnelFloor !== null) position.y = tunnelFloor + 0.08;
      playerRecord.dropAt(position, tunnelFloor !== null);
      soundtrack.lock("Plak yerde");
      gameHud.flash("Plak yere bırakıldı");
      return true;
    }
    const tunnelFloor = burrows.getActiveFloorHeight();
    const gramophoneDrop = tunnelFloor === null
      ? undefined
      : computeDropPosition().setY(tunnelFloor + 0.025);
    if (gramophone.playerDrop(gramophoneDrop)) {
      gameHud.flash("Gramofon yere bırakıldı");
      return true;
    }
    return false;
  };

  const resetChase = () => {
    bunny.reset();
    gramophone.reset([bunny.position, playerPosition]);
    playerRecord.hide();
    soundtrack.lock();
    recordCaptured = false;
    recordInserted = false;
    victoryPulse = 0;
    interactionHint.hide();
    gameHud.flash("Takip yeniden başladı");
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.repeat) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (input.isLocked() && readyState) jumpQueued = true;
    } else if (event.code === "KeyE") tryInteract();
    else if (event.code === "KeyQ") dropCarried();
    else if (event.code === "KeyR" && gramophone.hasRecord) soundtrack.togglePlayback();
    else if (event.code === "KeyF") flashlight.toggle();
    else if (event.code === "KeyK") controlsHud.toggle();
    else if (event.code === "KeyP") soundtrack.togglePanel();
    else if (event.code === "KeyM") minimap.toggle();
    else if (event.code === "F2") graphicsSettings.toggle();
    else if (event.code === "KeyT") captureControls.takeScreenshot();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !input.isLocked() || input.isTouch || !readyState) return;
    if (blaster.fire()) shotsFired += 1;
  };
  document.addEventListener("keydown", onKeyDown);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);

  const offMobileLock = input.onLockChange((locked) => {
    mobileControls?.setVisible(locked);
    if (locked) return;
    document.body.classList.remove("is-ui-hidden");
    if (!controlsHud.isOpen()) controlsHud.toggle();
    if (!minimap.isOpen()) minimap.toggle();
    if (!soundtrack.isOpen()) soundtrack.togglePanel();
  });

  const ready = Promise.all([
    arena.ready,
    centerPiece.ready,
    bunny.ready,
    playerRecord.ready,
    blaster.ready,
  ]).then(() => {
    readyState = true;
    previousBunnyStage = bunny.stage;
    options.onProgress?.(100, "Takip hazır.");
    container.dataset.ready = "true";
    window.setTimeout(() => graphicsSettings.showOptimizedNotice(), 1500);
  });

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    performanceManager.resize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();
  let raf = 0;
  let frameIndex = 0;
  const tick = () => {
    if (disposed) return;
    const rawDelta = clock.getDelta();
    const delta = Math.min(rawDelta, 1 / 30);
    const sprintDelta = input.isLocked() && readyState ? Math.min(rawDelta, 0.25) : 0;
    const time = clock.elapsedTime;
    const gameDelta = input.isLocked() && readyState ? delta : 0;
    const bunnyDelta = gameDelta;
    frameIndex += 1;
    if (input.isLocked() && readyState) performanceManager.sample(rawDelta);

    arena.update(time, delta);
    centerPiece.update(time, delta);
    burrows.update(time, delta);
    if (frameIndex % collisionUpdateStride === 0) collisionWorld.update();

    if (input.isLocked()) {
      const look = input.consumeLook();
      yaw += look.x;
      pitch = clamp(pitch + look.y, -1.16, 1.08);

      const forwardAxis =
        Number(input.pressed.has("KeyW") || input.pressed.has("ArrowUp")) -
        Number(input.pressed.has("KeyS") || input.pressed.has("ArrowDown"));
      const sideAxis =
        Number(input.pressed.has("KeyD") || input.pressed.has("ArrowRight")) -
        Number(input.pressed.has("KeyA") || input.pressed.has("ArrowLeft"));
      forward.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      wish.set(0, 0, 0).addScaledVector(forward, forwardAxis).addScaledVector(right, sideAxis);
      if (wish.lengthSq() > 1) wish.normalize();
      const moving = wish.lengthSq() > 0.001;
      const wantsCrouch =
        input.pressed.has("KeyC") ||
        input.pressed.has("ControlLeft") ||
        input.pressed.has("ControlRight");
      const insideTunnel = burrows.isPlayerInside;
      const crouching = wantsCrouch || insideTunnel;
      const wantsSprint =
        moving &&
        !crouching &&
        !insideTunnel &&
        (input.pressed.has("ShiftLeft") || input.pressed.has("ShiftRight"));
      sprintingNow = wantsSprint && !sprintExhausted && sprintEnergy > 0;
      if (sprintingNow) {
        sprintEnergy = Math.max(0, sprintEnergy - sprintDelta);
        if (sprintEnergy <= 0) {
          sprintExhausted = true;
          sprintingNow = false;
          gameHud.flash("Hızlı koşu tükendi · 6 saniyede yenilenir", "hit");
        }
      } else {
        sprintEnergy = Math.min(
          PLAYER.sprintDuration,
          sprintEnergy + sprintDelta * (PLAYER.sprintDuration / PLAYER.sprintRecharge),
        );
        if (sprintExhausted && sprintEnergy >= PLAYER.sprintDuration) {
          sprintExhausted = false;
          gameHud.flash("Hızlı koşu yeniden hazır", "success");
        }
      }
      const targetEyeHeight = crouching ? PLAYER.crouchEyeHeight : PLAYER.eyeHeight;
      currentEyeHeight +=
        (targetEyeHeight - currentEyeHeight) * (1 - Math.exp(-12 * delta));
      const targetSpeed = crouching
        ? PLAYER.crouchSpeed
        : sprintingNow
          ? PLAYER.sprintSpeed
          : PLAYER.walkSpeed;
      const smoothing = 1 - Math.exp(-PLAYER.acceleration * delta);
      velocity.x += (wish.x * targetSpeed - velocity.x) * smoothing;
      velocity.z += (wish.z * targetSpeed - velocity.z) * smoothing;
      nextPosition.copy(playerPosition).addScaledVector(velocity, delta);

      if (insideTunnel) {
        jumpQueued = false;
        verticalVelocity = 0;
        grounded = true;
        const tunnelState = burrows.resolvePlayer(
          nextPosition,
          currentEyeHeight,
          forwardAxis,
        );
        if (tunnelState === "exited") {
          velocity.multiplyScalar(0.35);
          gameHud.flash("Tünelden yeniden yeryüzüne çıktın", "success");
        }
      } else {
        const radial = Math.hypot(nextPosition.x, nextPosition.z);
        const worldLimit = WORLD.radius - 4;
        if (radial > worldLimit) {
          nextPosition.x *= worldLimit / radial;
          nextPosition.z *= worldLimit / radial;
        }
        if (jumpQueued && grounded) {
          verticalVelocity = PLAYER.jumpSpeed;
          grounded = false;
        }
        jumpQueued = false;
        verticalVelocity -= PLAYER.gravity * delta;
        nextPosition.y = playerPosition.y + verticalVelocity * delta;
        const floor = arena.getHeightAt(nextPosition.x, nextPosition.z) + currentEyeHeight;
        if (nextPosition.y <= floor) {
          nextPosition.y = floor;
          verticalVelocity = 0;
          grounded = true;
        }
        collisionWorld.resolvePlayer(nextPosition, currentEyeHeight);
        const resolvedFloor =
          arena.getHeightAt(nextPosition.x, nextPosition.z) + currentEyeHeight;
        if (grounded || nextPosition.y <= resolvedFloor) {
          nextPosition.y = resolvedFloor;
          verticalVelocity = 0;
          grounded = true;
        }
      }
      playerPosition.copy(nextPosition);
      if (
        !insideTunnel &&
        burrows.tryEnter(playerPosition, wantsCrouch, PLAYER.crouchEyeHeight)
      ) {
        currentEyeHeight = PLAYER.crouchEyeHeight;
        verticalVelocity = 0;
        velocity.multiplyScalar(0.42);
        grounded = true;
        gameHud.flash("Tünele girdin · çömelerek ilerle", "hit");
      }

      const firing = input.pressed.has("KeyX");
      if (firing && (!fireHeldLastFrame || input.isTouch) && readyState && blaster.fire()) {
        shotsFired += 1;
      }
      fireHeldLastFrame = firing;
    } else {
      velocity.multiplyScalar(Math.exp(-8 * delta));
      sprintingNow = false;
      fireHeldLastFrame = false;
      jumpQueued = false;
    }

    const horizontalSpeed = Math.hypot(velocity.x, velocity.z);
    gameHud.setSprint(
      sprintEnergy / PLAYER.sprintDuration,
      sprintingNow,
      sprintExhausted,
    );
    gameHud.setTunnel(burrows.isPlayerInside);
    const bob = input.isLocked() && grounded
      ? Math.sin(time * (6.5 + horizontalSpeed * 0.55)) * Math.min(0.035, horizontalSpeed * 0.004)
      : 0;
    camera.position.copy(playerPosition);
    camera.position.y += bob;
    camera.rotation.set(pitch, yaw, 0, "YXZ");

    const gramophonePosition = gramophone.position;
    const playerUnderground = burrows.isPlayerInside;
    const gramophoneUnderground = burrows.isUndergroundPosition(gramophonePosition);
    const gramophoneGuarded =
      playerUnderground === gramophoneUnderground &&
      horizontalDistance(playerPosition, gramophonePosition) <= BUNNY.guardRadius;
    const visibleDroppedRecordPosition =
      playerRecord.state === "dropped" ? playerRecord.position : null;
    const droppedRecordPosition =
      visibleDroppedRecordPosition && !burrows.isUndergroundPosition(visibleDroppedRecordPosition)
        ? visibleDroppedRecordPosition
        : null;
    bunny.update(time, bunnyDelta, {
      playerPosition,
      gramophonePosition,
      gramophoneStolen: gramophone.isStolen,
      gramophoneGuarded,
      gramophoneAvailable:
        gramophone.isPlaced && !bunny.hasRecord && !gramophoneUnderground,
      droppedRecordPosition,
      onStealGramophone: () => {
        if (
          horizontalDistance(playerPosition, gramophone.position) <=
          BUNNY.guardRadius
        ) {
          return false;
        }
        const stolen = gramophone.steal();
        if (stolen) gameHud.flash("Tavşan gramofonu kaptı!", "hit");
        return stolen;
      },
      onStealRecord: () => {
        if (playerRecord.state !== "dropped") return false;
        playerRecord.hide();
        recordCaptured = false;
        recordInserted = false;
        soundtrack.lock();
        gameHud.flash("Tavşan yerdeki plağı çaldı!", "hit");
        return true;
      },
      onOpenBurrow: (start, end) => {
        const plan = burrows.openTunnel(start, end);
        gameHud.flash("Tavşan yere bir tünel kazıyor!", "hit");
        return plan;
      },
      onFindExistingBurrow: (position) => {
        const plan = burrows.findExistingTunnel(position);
        if (plan) gameHud.flash("Tavşan eski bir deliğe kaçıyor!", "hit");
        return plan;
      },
      onRevealBurrowExit: (tunnelId, position) => {
        burrows.revealExit(tunnelId, position);
        gameHud.flash("Tavşan tünelin çıkışını yeryüzüne açtı!", "hit");
      },
      onHitStreakExpired: () => {
        gameHud.flash("3 saniye doldu · İsabet zinciri sıfırlandı", "hit");
      },
    });
    gameHud.setHitStreak(
      bunny.hits,
      bunny.hitWindowRemaining,
      BUNNY.hitWindow,
    );
    gramophone.update(time, gameDelta, bunny.position, bunny.group.rotation.y);
    playerRecord.update(time, horizontalSpeed);

    if (previousBunnyStage === "stopped" && bunny.stage === "running") {
      gameHud.flash("3 saniye doldu · Tavşan yeniden koşuyor", "hit");
    }
    previousBunnyStage = bunny.stage;

    blaster.update(
      time,
      gameDelta,
      bunny.position,
      (bunny.stage === "running" ||
        bunny.stage === "walking" ||
        bunny.stage === "hiding") &&
        (bunny.burrowPhase === "surface" || bunny.burrowPhase === "underground"),
      handleBunnyHit,
    );

    if (nearStoppedBunny() && bunny.hasRecord) {
      interactionHint.show("E", "Plağı tavşandan al");
    } else if (nearStoppedBunny() && gramophone.isStolen) {
      interactionHint.show("E", "Gramofonu tavşandan geri al");
    } else if (playerRecord.canPickUp(playerPosition)) {
      interactionHint.show("E", "Yerdeki plağı al");
    } else if (gramophone.canInteract(playerPosition) && playerRecord.isCarried) {
      interactionHint.show("E", "Plağı gramofona tak");
    } else if (gramophone.canInteract(playerPosition) && gramophone.hasRecord) {
      interactionHint.show("E / R", "Gramofonu al · oynat / duraklat · plağı panelden çıkar");
    } else if (gramophone.canInteract(playerPosition)) {
      interactionHint.show("E", "Gramofonu al · Q ile bırak");
    } else if (gramophone.isPlayerCarried) {
      interactionHint.show("Q", "Gramofonu yere bırak");
    } else if (burrows.isPlayerInside) {
      interactionHint.show("C / CTRL", "Çömelerek tünelin diğer çıkışına ilerle");
    } else if (burrows.isNearEntrance(playerPosition)) {
      interactionHint.show("C / CTRL", "Çömel ve tavşan tüneline gir");
    } else {
      interactionHint.hide();
    }

    minimap.update(
      playerPosition,
      yaw,
      gramophone.position,
      bunny.position,
      bunny.hasRecord,
      playerRecord.state === "dropped" ? playerRecord.position : null,
      burrows.entrances,
    );
    const musicDistance = playerPosition.distanceTo(gramophone.position);
    const normalizedMusicDistance = clamp((musicDistance - 2.5) / 48, 0, 1);
    soundtrack.setDistanceGain((1 - normalizedMusicDistance) ** 1.45);
    victoryPulse = Math.max(0, victoryPulse - delta * 0.2);
    centerGlow.intensity = 18 + victoryPulse * 34 + Math.sin(time * 0.72) * 1.4;

    if (keyLight.castShadow && frameIndex % shadowUpdateStride === 0) {
      renderer.shadowMap.needsUpdate = true;
    }
    renderer.render(scene, camera);
    raf = window.requestAnimationFrame(tick);
  };
  raf = window.requestAnimationFrame(tick);

  window.__klostrofobikDebug = {
    snapshot: () => ({
      ready: readyState,
      stage: bunny.stage,
      objective: bunny.objective,
      burrowPhase: bunny.burrowPhase,
      hits: bunny.hits,
      hitWindowRemaining: bunny.hitWindowRemaining,
      player: [playerPosition.x, playerPosition.y, playerPosition.z],
      playerYaw: yaw,
      bunny: [bunny.position.x, bunny.position.y, bunny.position.z],
      bunnyYaw: bunny.group.rotation.y,
      gramophone: [gramophone.position.x, gramophone.position.y, gramophone.position.z],
      playerRecord: [
        playerRecord.position.x,
        playerRecord.position.y,
        playerRecord.position.z,
      ],
      gramophoneStolen: gramophone.isStolen,
      gramophonePlayerCarried: gramophone.isPlayerCarried,
      gramophonePlaced: gramophone.isPlaced,
      gramophoneHasRecord: gramophone.hasRecord,
      musicGain: soundtrack.getDistanceGain(),
      shotsFired,
      carrots: blaster.snapshot(),
      colliders: collisionWorld.snapshot(),
      recordCaptured,
      recordInserted,
      playerRecordState: playerRecord.state,
      burrows: burrows.snapshot(),
      errors: [...runtimeErrors],
      performance: performanceManager.snapshot(),
    }),
    hitBunny: () => {
      if (readyState) handleBunnyHit();
      return bunny.stage;
    },
    captureRecord: () => {
      if (!bunny.hasRecord) return recordCaptured;
      if (bunny.stage !== "stopped") {
        for (let hit = bunny.hits; hit < 6; hit += 1) handleBunnyHit();
      }
      playerPosition.copy(bunny.position);
      playerPosition.y = arena.getHeightAt(playerPosition.x, playerPosition.z) + PLAYER.eyeHeight;
      return tryInteract();
    },
    insertRecord: () => {
      if (!recordCaptured) window.__klostrofobikDebug?.captureRecord();
      if (gramophone.isStolen) {
        gramophone.recoverNear(playerPosition, burrows.isPlayerInside);
      }
      playerPosition.copy(gramophone.position);
      playerPosition.y = arena.getHeightAt(playerPosition.x, playerPosition.z) + PLAYER.eyeHeight;
      return tryInteract();
    },
    stealGramophone: () => gramophone.steal(),
    reset: resetChase,
    fire: () => {
      const fired = readyState && blaster.fire();
      if (fired) shotsFired += 1;
      return fired;
    },
    triggerBurrow: () => bunny.triggerBurrow(),
    enterTunnel: () => {
      const entrance = burrows.entrances[0];
      if (!entrance) return false;
      currentEyeHeight = PLAYER.crouchEyeHeight;
      playerPosition.set(
        entrance.x,
        entrance.y + PLAYER.crouchEyeHeight,
        entrance.z,
      );
      velocity.set(0, 0, 0);
      verticalVelocity = 0;
      grounded = true;
      return burrows.tryEnter(playerPosition, true, PLAYER.crouchEyeHeight);
    },
    approachBunnyInTunnel: () => {
      currentEyeHeight = PLAYER.crouchEyeHeight;
      velocity.set(0, 0, 0);
      verticalVelocity = 0;
      grounded = true;
      return burrows.debugPlacePlayerNear(
        bunny.position,
        playerPosition,
        PLAYER.crouchEyeHeight,
      );
    },
    focusBunny: () => {
      const away = new THREE.Vector3(
        playerPosition.x - bunny.position.x,
        0,
        playerPosition.z - bunny.position.z,
      );
      if (away.lengthSq() < 0.01) away.set(0, 0, 1);
      away.normalize();
      playerPosition.x = bunny.position.x + away.x * 7.2;
      playerPosition.z = bunny.position.z + away.z * 7.2;
      playerPosition.y = arena.getHeightAt(playerPosition.x, playerPosition.z) + PLAYER.eyeHeight;
      const dx = bunny.position.x - playerPosition.x;
      const dz = bunny.position.z - playerPosition.z;
      const dy = bunny.getHitPoint().y - playerPosition.y;
      yaw = Math.atan2(-dx, -dz);
      pitch = Math.atan2(dy, Math.max(0.001, Math.hypot(dx, dz)));
    },
    setPlayer: (x, z, nextYaw = yaw) => {
      const radial = Math.hypot(x, z);
      const limit = WORLD.radius - 4;
      const scale = radial > limit ? limit / radial : 1;
      playerPosition.set(
        x * scale,
        arena.getHeightAt(x * scale, z * scale) + PLAYER.eyeHeight,
        z * scale,
      );
      velocity.set(0, 0, 0);
      verticalVelocity = 0;
      grounded = true;
      yaw = nextYaw;
    },
  };

  return {
    ready,
    requestLock: () => input.requestLock(),
    forceStart: () => input.forceStart(),
    releaseLock: () => input.releaseLock(),
    onLockChange: (callback) => input.onLockChange(callback),
    dispose() {
      disposed = true;
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("error", onRuntimeError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      document.removeEventListener("keydown", onKeyDown);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      offMobileLock();
      offFullscreen();
      mobileControls?.dispose();
      captureControls.dispose();
      graphicsSettings.dispose();
      performanceManager.dispose();
      controlsHud.dispose();
      interactionHint.dispose();
      minimap.dispose();
      gameHud.dispose();
      soundtrack.dispose();
      flashlight.dispose();
      blaster.dispose();
      collisionWorld.dispose();
      playerRecord.dispose();
      gramophone.dispose();
      bunny.dispose();
      burrows.dispose();
      centerPiece.dispose();
      arena.dispose();
      input.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.clear();
      delete window.__klostrofobikDebug;
      document.body.classList.remove("is-in-experience", "is-touch", "is-fullscreen", "is-ui-hidden");
    },
  };
}
