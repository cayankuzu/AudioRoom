import * as THREE from "three";
import { BRIGHTNESS, COMPOSITION, PLAYER, ROTATION, WORLD } from "../config/config";

import { createScene } from "../scene/scene";
import { createCamera } from "../scene/camera";
import { createRenderer } from "../scene/renderer";
import { addLights } from "../scene/lights";
import { createSky } from "../scene/sky";
import { createAtmosphere } from "../scene/atmosphere";

import { createTerrain } from "../world/terrain";
import { createRocks } from "../world/rocks";
import { createFigure } from "../world/figure";
import { createText3D } from "../world/text3d";
import { createGramophone } from "../world/gramophone";
import { createVinylSystem } from "../world/vinylSystem";

import { createInput } from "../systems/inputSystem";
import { createCollisionSystem } from "../systems/collisionSystem";
import { createMovementSystem } from "../systems/movementSystem";
import { createCameraMotion } from "../systems/cameraMotion";
import { createFootprintSystem } from "../systems/footprintSystem";
import { createFlashlightSystem } from "../systems/flashlightSystem";
import { createAudioDistanceSystem } from "../systems/audioDistanceSystem";
import { createInteractionSystem } from "../systems/interactionSystem";
import { createWindSystem } from "../systems/windSystem";
import { bucketInstancedMeshes } from "../systems/worldStreaming";
import {
  createRng,
  pickGramophoneSpawn,
  resolveSessionSeed,
} from "../systems/spawnSystem";

import { createAmbientAudio } from "../audio/ambientAudio";
import { createInventory } from "../state/inventory";

import { createStartOverlay } from "../ui/startOverlay";
import { createHud } from "../ui/hud";
import { createAlbumPlayerPanel } from "../ui/albumPlayerPanel";
import { createBrightnessControl } from "../ui/brightnessControl";
import { createInteractionHint } from "../ui/interactionHint";
import { createMinimap } from "../ui/minimap";

export function startExperience(container: HTMLElement): void {
  /** --- Oturum bazlı seed: her yüklemede dünya farklı ama mantıklı dizilir. --- */
  const sessionSeed = resolveSessionSeed();
  console.log("[Session]", "seed =", sessionSeed);

  const scene = createScene();
  const camera = createCamera();
  const renderer = createRenderer(container);
  scene.add(camera);
  const lights = addLights(scene);
  scene.add(createSky());

  const terrain = createTerrain();
  scene.add(terrain.mesh);

  const rocks = createRocks(terrain.getHeightAt);
  scene.add(rocks.group);

  /**
   * --- World streaming / LOD ---
   * Büyük InstancedMesh'leri uzaysal hücrelere böler; Three.js frustum
   * culling artık gerçekten çalışır. Ayrıca uzak küçük kategoriler
   * otomatik olarak gölge pass'inden düşer.
   */
  const worldStreaming = bucketInstancedMeshes(rocks.group, {
    cellSize: 40,
    smallShadowCullDistance: 55,
  });
  console.log(
    "[Streaming]",
    `bucketed ${worldStreaming.bucketedMeshCount} meshes → ${worldStreaming.bucketCount} cells`,
  );

  const atmosphere = createAtmosphere();
  scene.add(atmosphere.object);

  /** TEK kompozisyon grubu — figür + title + bandName + lightRig aynı eksende döner. */
  const craterFloorY = terrain.getHeightAt(WORLD.craterCenter.x, WORLD.craterCenter.z);
  const compositionBaseY = craterFloorY + COMPOSITION.baseLift;
  const compositionGroup = new THREE.Group();
  compositionGroup.name = "compositionGroup";
  compositionGroup.position.set(WORLD.craterCenter.x, compositionBaseY, WORLD.craterCenter.z);
  scene.add(compositionGroup);

  const figure = createFigure(scene, compositionGroup, terrain.getHeightAt, lights);
  const text3d = createText3D(compositionGroup, terrain.getHeightAt);

  /** --- İnventory ve rüzgar sistemleri --- */
  const inventory = createInventory();
  const wind = createWindSystem();
  const ambient = createAmbientAudio();

  /**
   * --- Gramofon için seeded random konum ---
   * Oyuncu başlangıç pozisyonuna göre anlamlı ön planda, dik yamaçta değil,
   * krater merkezine dalmayacak şekilde seçilir.
   */
  const gramRng = createRng(sessionSeed ^ 0x9e3779b1);
  const gramPosInit = pickGramophoneSpawn({
    rand: gramRng,
    playerStart: { x: PLAYER.startPosition.x, z: PLAYER.startPosition.z },
    getHeightAt: terrain.getHeightAt,
    minFromPlayer: 10,
    maxFromPlayer: 26,
    minFromCenter: WORLD.craterRimRadius - 12,
    maxSlope: 0.55,
  });
  const gramophone = createGramophone(scene, camera, gramPosInit);

  /**
   * --- Plak yerleşimi ---
   * Gramofon ve oyuncu başlangıcı avoid bölgesi olarak verilir;
   * böylece plaklar onların üstüne denk gelmez.
   */
  const vinylSystem = createVinylSystem(terrain.getHeightAt, inventory, {
    seed: sessionSeed,
    avoid: [
      { x: gramPosInit.x, z: gramPosInit.z, radius: 5 },
      { x: PLAYER.startPosition.x, z: PLAYER.startPosition.z, radius: 8 },
      { x: WORLD.craterCenter.x, z: WORLD.craterCenter.z, radius: 7 },
    ],
  });
  scene.add(vinylSystem.root);

  const collisions = createCollisionSystem();
  collisions.add(rocks.colliders);
  collisions.add(text3d.colliders);

  const input = createInput(renderer.domElement);
  const movement = createMovementSystem(camera, input, collisions);
  {
    const sx = PLAYER.startPosition.x;
    const sz = PLAYER.startPosition.z;
    const sy = terrain.getHeightAt(sx, sz) + PLAYER.eyeHeight;
    movement.setPosition(sx, sy, sz);
    movement.pose.yaw = Math.atan2(sx, sz);
    movement.pose.pitch = -0.05;
  }

  const cameraMotion = createCameraMotion();
  cameraMotion.setWind(wind.state);

  const footprints = createFootprintSystem();
  scene.add(footprints.object);

  const flashlight = createFlashlightSystem(camera);
  const audioDistance = createAudioDistanceSystem();

  createHud(container);
  const startOverlay = createStartOverlay(container);
  const albumPanel = createAlbumPlayerPanel(container, inventory);
  const brightness = createBrightnessControl(container);
  const interactionHint = createInteractionHint(container);
  const minimap = createMinimap(container);

  /** --- Interaction: E (topla / kullan), Y (gramofon taşı) --- */
  const interaction = createInteractionSystem({
    onCollectVinyl(order) {
      const spawn = vinylSystem.spawns.find((s) => s.order === order);
      if (!spawn) return;
      const ok = vinylSystem.collect(order);
      if (!ok) return;
      console.log("[Plak]", `Toplandı → order=${order} "${spawn.title}"`);
      /**
       * KURAL: Müzik SADECE plak gramofona TAKILDIĞINDA başlar.
       */
      albumPanel.refreshInventory();
    },
    onGramophoneE() {
      /**
       * Gramofon ile etkileşim:
       *  1. Takılı plak yoksa → envanterdeki ilk plağı tak ve çal.
       *  2. Takılı plak varsa → çalıyorsa duraklat; duraklatıldıysa devam ettir.
       */
      if (gramophone.activeOrder === 0) {
        const first = Array.from(inventory.collected).sort((a, b) => a - b)[0];
        if (first === undefined) return;
        gramophone.setActive(first);
        albumPanel.playOrder(first);
      } else {
        albumPanel.togglePlayback();
      }
    },
    onGramophoneY() {
      gramophone.toggleCarry(camera, terrain.getHeightAt);
    },
  });

  /** Parlaklık değişimini doğrudan renderer exposure'a uygula. */
  renderer.toneMappingExposure = brightness.exposure;
  brightness.onChange((exposure) => {
    renderer.toneMappingExposure = Math.max(BRIGHTNESS.min, Math.min(BRIGHTNESS.max, exposure));
  });

  /** F tuşu — her basımda tek toggle (edge-detection). */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyF" && !e.repeat) {
      flashlight.toggle();
    }
  };
  document.addEventListener("keydown", onKeyDown);

  inventory.onChange((snap) => {
    if (gramophone.activeOrder !== snap.activeOrder) {
      gramophone.setActive(snap.activeOrder);
    }
  });

  startOverlay.onStart(() => {
    input.requestLock();
    /**
     * İlk user-gesture — WebAudio AudioContext'i ayağa kaldırılabilir.
     * Müzik değil, yalnızca ortam rüzgarı. Çok düşük seviye.
     */
    ambient.start();
  });
  input.onLockChange((locked) => {
    if (locked) startOverlay.hide();
    else startOverlay.show();
  });

  renderer.domElement.addEventListener("click", () => {
    if (!startOverlay.isVisible()) {
      input.requestLock();
    }
  });

  const resize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  const gramPos = new THREE.Vector3();

  function collectInteractables(): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];
    for (const s of vinylSystem.spawns) {
      if (s.group.visible) list.push(s.group);
    }
    if (gramophone.state === "placed") list.push(gramophone.interactTarget);
    return list;
  }

  function refreshGramophonePrompt(): void {
    const ud = gramophone.interactTarget.userData as {
      interactable?: { promptKey: string; promptText: string };
    };
    if (!ud.interactable) return;
    if (gramophone.activeOrder > 0) {
      ud.interactable.promptText =
        albumPanel.activeOrder() > 0
          ? "E — duraklat · Y — taşı"
          : "E — müziği devam ettir · Y — taşı";
    } else if (inventory.collected.size > 0) {
      ud.interactable.promptText = "E — plak tak · Y — taşı";
    } else {
      ud.interactable.promptText = "Önce bir plak bul · Y — taşı";
    }
  }

  function animate() {
    const delta = Math.min(clock.getDelta(), 0.033);
    const time = clock.elapsedTime;

    /** Rüzgar her zaman güncellenir — atmosfer, kamera ve ambient bundan besleniyor. */
    wind.update(time, delta);

    const pose = movement.update(delta, terrain.getHeightAt);
    cameraMotion.apply(camera, pose, time, delta);

    footprints.update(delta, pose, terrain.getHeightAt);
    atmosphere.update(time, wind.state);
    ambient.update(wind.state, delta);

    /** TEK rotasyon kaynağı. */
    compositionGroup.rotation.y += ROTATION.composition * delta;

    figure.update(time, delta);
    text3d.update(time, delta);

    vinylSystem.update(time);
    gramophone.update(time, delta, { speed: pose.speed, position: pose.position });

    refreshGramophonePrompt();
    interaction.setTargets(collectInteractables());
    const target = interaction.update(camera);
    if (target) {
      interactionHint.show(target.descriptor.promptKey, target.descriptor.promptText);
    } else if (gramophone.state === "carried") {
      interactionHint.show("Y", "Gramofonu taşıyorsun · bırakmak için Y");
    } else {
      interactionHint.hide();
    }

    /** World streaming — düşük frekanslı LOD / shadow culling. */
    worldStreaming.update(camera.position);

    /** Mesafe-bazlı ses — REFERANS: GRAMOFON konumu (taşınıyor olsa bile). */
    gramophone.worldPosition(gramPos);
    const gain = audioDistance.update(delta, camera.position, gramPos);
    albumPanel.setDistanceGain(gain);
    /** Uzaklaşma rüzgar sesini hafifçe öne çıkarsın — müziği bastırmadan. */
    ambient.setMasterVolume(0.55 + audioDistance.muffle * 0.45);

    minimap.update(
      pose.position,
      pose.yaw,
      gramPos,
      vinylSystem.spawns.map((s) => ({
        position: s.group.position,
        color: inventory.has(s.order) ? "#7a7a7a" : "#ff3b45",
        hidden: !s.group.visible,
      })),
    );

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}
