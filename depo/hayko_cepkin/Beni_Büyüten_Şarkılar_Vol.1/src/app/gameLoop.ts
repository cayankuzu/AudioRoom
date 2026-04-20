import * as THREE from "three";
import { createRenderer } from "../scene/renderer";
import { createScene } from "../scene/scene";
import { createCamera } from "../scene/camera";
import { createLights } from "../scene/lights";
import { createInput } from "../systems/inputSystem";
import { createMovementSystem } from "../systems/movementSystem";
import { createDome } from "../world/dome";
import { createFloor } from "../world/floor";
import { createParticles } from "../world/particles";
import { createCells } from "../world/cells";
import { createFootprints } from "../world/footprints";
import { createCenterPiece } from "../world/centerPiece";
import { createGramophone } from "../world/gramophone";
import { createVinylSystem } from "../world/vinylSystem";
import { createCarrySystem } from "../world/carrySystem";
import { createInteractionSystem } from "../systems/interactionSystem";
import { createAudioDistanceSystem } from "../systems/audioDistanceSystem";
import {
  createRng,
  pickGramophoneSpawn,
  resolveSessionSeed,
} from "../systems/spawnSystem";
import { createInventory } from "../state/inventory";
import { createAlbumPlayerPanel, type AlbumPlayerPanel } from "../ui/albumPlayerPanel";
import { createMinimap, type Minimap } from "../ui/minimap";
import { createHud, type Hud } from "../ui/hud";
import { createInteractionHint, type InteractionHint } from "../ui/interactionHint";
import { createMobileControls, type MobileControls } from "../ui/mobileControls";
import { applyWorldScaleForInput, PLAYER, WORLD } from "../config/config";
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
  attachUi(parent: HTMLElement): void;
  dispose(): void;
}

/**
 * Hayko Cepkin · Beni Büyüten Şarkılar Vol.1 evreni.
 *
 * Sistem haritası:
 *   - Dünya: dome (rahim damar shader) + floor (et+damar PBR shader) +
 *     particles (kor bokeh) + centerPiece (bebek + 3D yazılar).
 *   - Hareket: WASD, Shift sprint, Space jump, fare bakışı.
 *   - Plak ekosistemi (redd birebir adapte): vinylSystem (9 plak) +
 *     gramophone + carrySystem + interactionSystem + inventory + audio.
 *   - UI: HUD (sol üst), minimap (sol alt), albumPanel (sağ alt),
 *     interactionHint (alt orta), mobileControls (touch).
 *
 * Klavye kısayolları:
 *   E plak al / gramofona tak / gramofonu taşı
 *   R plak çalıyorken duraklat / başlat
 *   Q elindekini bırak (plak veya gramofon)
 *   M harita · P albüm paneli · K kontroller paneli
 */
export function startExperience(container: HTMLElement): ExperienceHandle {
  const sessionSeed = resolveSessionSeed();
  console.log("[Hayko BBS]", "Session seed:", sessionSeed);

  const renderer = createRenderer(container);
  const scene = createScene();
  const camera = createCamera();
  scene.add(camera);
  const worldLights = createLights(scene);

  const input = createInput(renderer.domElement);
  applyWorldScaleForInput(input.isTouch);

  /** ── Dünya ─────────────────────────────────────────────────────── */
  const dome = createDome(scene);
  const floor = createFloor(scene);
  const particles = createParticles(scene);
  const cells = createCells(scene);
  const footprints = createFootprints(scene);
  const center = createCenterPiece(scene);
  void center.ready;

  /** ── Sistemler ─────────────────────────────────────────────────── */
  const movement = createMovementSystem(camera, input);
  const inventory = createInventory();
  const audioDistance = createAudioDistanceSystem();

  /** ── Gramofon: oyuncu önünde, merkezi ezmeyen seedli yer. ───────── */
  const gramRng = createRng(sessionSeed ^ 0x9e3779b1);
  const gramPosInit = pickGramophoneSpawn({
    rand: gramRng,
    playerStart: { x: PLAYER.startPosition.x, z: PLAYER.startPosition.z },
    getHeightAt: floor.getHeightAt,
    minFromPlayer: 6,
    maxFromPlayer: 14,
    minFromCenter: 14,
    maxSlope: 0.65,
  });
  const gramophone = createGramophone(scene, camera, gramPosInit);

  /** ── Plaklar: random 9 — bebek/oyuncu/gramofon avoid. ─────────── */
  const vinylSystem = createVinylSystem(floor.getHeightAt, inventory, {
    seed: sessionSeed,
    avoid: [
      { x: gramPosInit.x, z: gramPosInit.z, radius: 4 },
      { x: PLAYER.startPosition.x, z: PLAYER.startPosition.z, radius: 6 },
      { x: WORLD.centerPiece.x, z: WORLD.centerPiece.z, radius: 8 },
    ],
  });
  scene.add(vinylSystem.root);

  const carrySystem = createCarrySystem({ camera });

  /** ── UI ────────────────────────────────────────────────────────── */
  let hud: Hud | null = null;
  let minimap: Minimap | null = null;
  let hint: InteractionHint | null = null;
  let albumPanel: AlbumPlayerPanel | null = null;
  let uiMounted = false;

  const offKeys: Array<() => void> = [];

  const attachUi = (parent: HTMLElement) => {
    if (uiMounted) return;
    uiMounted = true;
    hud = createHud(parent, { showLibraryBack: true, libraryHref: "../../../" });
    minimap = createMinimap(parent);
    hint = createInteractionHint(parent);
    albumPanel = createAlbumPlayerPanel(parent, inventory, {
      onEjectRecord(order) {
        const spawn = vinylSystem.getSpawn(order);
        if (!spawn) return;
        const gramPos = new THREE.Vector3();
        gramophone.worldPosition(gramPos);
        const drop = gramPos.clone().add(new THREE.Vector3(0.7, 0, 0.7));
        vinylSystem.dropAt(order, drop);
        console.log("[Plak]", `Çıkarıldı (panel) → order=${order}`);
      },
    });

    const cross = document.createElement("div");
    cross.className = "bbs-crosshair";
    parent.appendChild(cross);
  };

  attachUi(document.body);
  const uiHud = hud!;
  const uiMinimap = minimap!;
  const uiHint = hint!;
  const uiAlbum = albumPanel!;

  /** ── Drop pozisyonu — oyuncunun ayağına. ──────────────────────── */
  const dropVec = new THREE.Vector3();
  const dropForward = new THREE.Vector3();
  function computeDropSpotNearPlayer(): THREE.Vector3 {
    camera.getWorldDirection(dropForward);
    dropForward.y = 0;
    if (dropForward.lengthSq() < 1e-4) dropForward.set(0, 0, -1);
    dropForward.normalize();
    dropVec
      .copy(camera.position)
      .addScaledVector(dropForward, 0.9)
      .add(new THREE.Vector3(0, -PLAYER.eyeHeight * 0.9, 0));
    return dropVec;
  }

  /** ── Interaction (E/Q/R) ───────────────────────────────────────── */
  const interaction = createInteractionSystem({
    onCollectVinyl(order) {
      const targetSpawn = vinylSystem.getSpawn(order);
      if (!targetSpawn || !targetSpawn.group.visible) return;
      if (inventory.isCarrying(order)) return;

      const dropSpot = computeDropSpotNearPlayer();
      const dropped = inventory.pickUp(order);
      if (dropped > 0) {
        vinylSystem.dropAt(dropped, dropSpot);
      }
      vinylSystem.pickUp(order);
      carrySystem.setCarried(order);
      console.log("[Plak]", `El alındı → order=${order} "${targetSpawn.title}"`);
    },
    onGramophoneE() {
      if (inventory.carriedOrder > 0) {
        const result = inventory.placeCarriedOnGramophone();
        if (!result) return;
        uiAlbum.playOrder(result.placed);
        console.log("[Plak]", `Gramofona yerleşti → order=${result.placed}`);
        return;
      }
      gramophone.toggleCarry(camera, floor.getHeightAt);
      console.log("[Gramofon]", "Taşıma toggle (E)");
    },
    onGramophoneR() {
      if (gramophone.activeOrder <= 0) return;
      uiAlbum.togglePlayback();
    },
    onDropCarried() {
      const order = inventory.carriedOrder;
      if (order > 0) {
        const dropSpot = computeDropSpotNearPlayer();
        inventory.dropCarry();
        vinylSystem.dropAt(order, dropSpot);
        return;
      }
      if (gramophone.state === "carried") {
        gramophone.toggleCarry(camera, floor.getHeightAt);
      }
    },
  });

  /** ── Inventory ↔ gramophone/carry senkron. ────────────────────── */
  inventory.onChange((snap) => {
    if (gramophone.activeOrder !== snap.activeOrder) {
      gramophone.setActive(snap.activeOrder);
    }
    if (carrySystem.currentOrder !== snap.carriedOrder) {
      if (snap.carriedOrder > 0) carrySystem.setCarried(snap.carriedOrder);
      else carrySystem.clear();
    }
  });

  /** ── UI shortcut tuşları ──────────────────────────────────────── */
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
        uiAlbum.toggle();
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

  const mobileControls: MobileControls | null = input.isTouch
    ? createMobileControls(document.body, input, {
        onToggleMap: () => uiMinimap.toggle(),
        onTogglePanel: () => uiAlbum.toggle(),
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
            window.location.href = "../../../";
          }
        },
        onInteract: () => simulateKey("KeyE"),
        onDrop: () => simulateKey("KeyQ"),
        onPlayPause: () => simulateKey("KeyR"),
      })
    : null;

  function simulateKey(code: string): void {
    document.dispatchEvent(new KeyboardEvent("keydown", { code, key: code }));
    setTimeout(() => {
      document.dispatchEvent(new KeyboardEvent("keyup", { code, key: code }));
    }, 30);
  }

  document.body.classList.add("is-in-experience");

  let unwatchFullscreen: (() => void) | null = null;
  const onOrientHideBar = () => tryHideMobileAddressBar();

  if (input.isTouch) {
    document.body.classList.add("is-touch");
    mobileControls?.setVisible(false);
    if (uiMinimap.isOpen()) uiMinimap.toggle();
    if (uiAlbum.isOpen()) uiAlbum.toggle();
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

  const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", onResize);

  /** ── RAF döngüsü ──────────────────────────────────────────────── */
  const clock = new THREE.Clock();
  let raf = 0;
  const gramPos = new THREE.Vector3();

  function collectInteractables(): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];
    for (const s of vinylSystem.spawns) {
      if (s.group.visible) list.push(s.group);
    }
    if (gramophone.state === "placed") list.push(gramophone.interactTarget);
    return list;
  }

  /**
   * Çarpışma listesi — silindirik kaba bounding shapelar.
   *  - Gramofon "placed" iken yarıçap 0.85m
   *  - Merkez bebek/yazı sütunu yarıçap 1.5m (oyuncu içinden geçemesin)
   *  - Görünür plaklar yarıçap 0.55m
   * Hareket sistemi her frame `getColliders()`'i okuyup pozisyonu push out eder.
   */
  const colliderBuf: Array<{ x: number; z: number; radius: number }> = [];
  function collectColliders(): readonly { x: number; z: number; radius: number }[] {
    colliderBuf.length = 0;
    if (gramophone.state === "placed") {
      const p = gramophone.root.position;
      colliderBuf.push({ x: p.x, z: p.z, radius: 0.85 });
    }
    colliderBuf.push({
      x: WORLD.centerPiece.x,
      z: WORLD.centerPiece.z,
      radius: 1.5,
    });
    for (const s of vinylSystem.spawns) {
      if (!s.group.visible) continue;
      colliderBuf.push({
        x: s.group.position.x,
        z: s.group.position.z,
        radius: 0.55,
      });
    }
    return colliderBuf;
  }

  function refreshGramophonePrompt(): void {
    const ud = gramophone.interactTarget.userData as {
      interactable?: { promptKey: string; promptText: string };
    };
    if (!ud.interactable) return;
    if (inventory.carriedOrder > 0) {
      ud.interactable.promptText =
        gramophone.activeOrder > 0
          ? "E — plağı ekle (önceki listede kalır)"
          : "E — plağı tak";
    } else if (gramophone.activeOrder > 0) {
      ud.interactable.promptText =
        uiAlbum.activeOrder() > 0
          ? "R — duraklat · E — gramofonu taşı"
          : "R — başlat · E — gramofonu taşı";
    } else {
      ud.interactable.promptText = "E — gramofonu taşı · önce bir plak bul";
    }
  }

  const tick = () => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    floor.update(time);
    movement.update(
      delta,
      floor.getHeightAt,
      (sx, sz) => {
        floor.addRipple(sx, sz, time);
        /**
         * Adım yönü — oyuncu yaw'ından türetilen ileri vektör (XZ).
         * footprints sistemi L/R alternasyonu ve yan ofseti kendi
         * tutar; biz sadece konum + yön veriyoruz.
         */
        const fx = -Math.sin(movement.pose.yaw);
        const fz = -Math.cos(movement.pose.yaw);
        footprints.drop(sx, sz, fx, fz);
      },
      collectColliders,
    );
    footprints.update(time, floor.getHeightAt);

    particles.update(time, delta);
    cells.update(time, delta, camera.position);
    worldLights.update(time);
    dome.update(time);
    center.update(time, delta);

    vinylSystem.update(time);
    carrySystem.update(time, { speed: movement.pose.speed });
    gramophone.update(
      time,
      delta,
      { speed: movement.pose.speed, position: movement.pose.position },
      floor.getHeightAt,
    );

    refreshGramophonePrompt();
    interaction.setTargets(collectInteractables());
    const target = interaction.update(camera);
    if (target) {
      if (target.descriptor.kind === "vinyl" && target.descriptor.vinylOrder) {
        const order = target.descriptor.vinylOrder;
        const spawn = vinylSystem.getSpawn(order);
        const title = spawn?.title ?? "";
        if (inventory.carriedOrder > 0 && inventory.carriedOrder !== order) {
          target.descriptor.promptText = `E — elindekini bırak, "${title}" plağını al`;
        } else {
          target.descriptor.promptText = `E — plağı al · "${title}"`;
        }
      }
      uiHint.show(target.descriptor.promptKey, target.descriptor.promptText);
    } else if (gramophone.state === "carried") {
      uiHint.show("Q", "Gramofonu taşıyorsun · bırakmak için Q");
    } else if (inventory.carriedOrder > 0) {
      const title = vinylSystem.getSpawn(inventory.carriedOrder)?.title ?? "";
      uiHint.show("Q", `Elinde "${title}" · Q ile bırak, gramofona yaklaş`);
    } else {
      uiHint.hide();
    }

    camera.updateMatrixWorld(true);

    /** Mesafe-bazlı ses → albumPanel'e gain. */
    gramophone.worldPosition(gramPos);
    const gain = audioDistance.update(delta, camera.position, gramPos);
    uiAlbum.setDistanceGain(gain);

    if (uiMinimap) {
      uiMinimap.update(
        movement.pose.position,
        movement.pose.yaw,
        gramPos,
        vinylSystem.spawns.map((s) => ({
          position: s.group.position,
          color: inventory.has(s.order) ? "#7a3a2a" : "#ff7a3a",
          hidden: !s.group.visible,
        })),
      );
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

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
      interaction.dispose();
      input.dispose();
      hud?.dispose();
      minimap?.dispose();
      hint?.dispose();
      albumPanel?.dispose();
      scene.remove(particles.group);
      renderer.dispose();
      renderer.domElement.parentElement?.removeChild(renderer.domElement);
    },
  };
}
