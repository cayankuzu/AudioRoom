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

import { createInventory } from "../state/inventory";

import { createStartOverlay } from "../ui/startOverlay";
import { createHud } from "../ui/hud";
import { createAlbumPlayerPanel } from "../ui/albumPlayerPanel";
import { createBrightnessControl } from "../ui/brightnessControl";
import { createInteractionHint } from "../ui/interactionHint";
import { createMinimap } from "../ui/minimap";

export function startExperience(container: HTMLElement): void {
  const scene = createScene();
  const camera = createCamera();
  const renderer = createRenderer(container);
  /** Kameraya bağlı fener/child objelerin sahneye dahil olabilmesi için. */
  scene.add(camera);
  const lights = addLights(scene);
  scene.add(createSky());

  const terrain = createTerrain();
  scene.add(terrain.mesh);

  const rocks = createRocks(terrain.getHeightAt);
  scene.add(rocks.group);

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

  /** --- İnventory ve plak sistemi --- */
  const inventory = createInventory();

  const viewer = new THREE.Vector2(
    -PLAYER.startPosition.x,
    -PLAYER.startPosition.z,
  ).normalize();

  const vinylSystem = createVinylSystem(terrain.getHeightAt, inventory, viewer);
  scene.add(vinylSystem.root);

  /**
   * Gramofonu oyuncu başlangıcının biraz ilerisine yerleştir — oyuncu sahneye
   * uyanır uyanmaz onu görür. Y koordinatı gramofon modülünün içinde doğru
   * ground padding ile yeniden hesaplanır; buradaki +0.05 sadece placeholder.
   */
  const gramInit = new THREE.Vector3(
    PLAYER.startPosition.x * 0.72,
    0,
    PLAYER.startPosition.z * 0.72,
  );
  gramInit.y = terrain.getHeightAt(gramInit.x, gramInit.z) + 0.05;
  const gramophone = createGramophone(scene, camera, gramInit);

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
       * Burada otomatik oynatma YOK — sadece envanter güncelleniyor.
       * Oyuncu gramofona gidip E'ye basınca çalmaya başlar.
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
        if (first === undefined) {
          /** Envanterde de plak yok — hiçbir şey olmaz. */
          return;
        }
        gramophone.setActive(first);
        albumPanel.playOrder(first);
      } else {
        /** Plak zaten takılı → toggle play/pause. */
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

  /**
   * Envanter aktif plağı değiştiğinde gramofonun görsel plak slot'unu senkronize et.
   * Böylece panelden seçim de gramofona yansır (tek doğruluk kaynağı = inventory).
   */
  inventory.onChange((snap) => {
    if (gramophone.activeOrder !== snap.activeOrder) {
      gramophone.setActive(snap.activeOrder);
    }
  });

  startOverlay.onStart(() => {
    /**
     * İlk user-gesture — sadece pointer-lock. Müzik başlatma KESİNLİKLE yok.
     * Oyuncu plak bulup gramofona takmadıkça ses çıkmaz.
     */
    input.requestLock();
  });
  input.onLockChange((locked) => {
    if (locked) startOverlay.hide();
    else startOverlay.show();
  });

  /**
   * Canvas tıklaması — overlay açıkken zaten overlay yutar; değilse yalnızca
   * pointer-lock'u tekrar talep eder. Ses hiçbir koşulda burada başlamaz.
   */
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

  /** Interaction hedef listesi — vinyl gruplar + gramofon hit küresi. */
  function collectInteractables(): THREE.Object3D[] {
    const list: THREE.Object3D[] = [];
    for (const s of vinylSystem.spawns) {
      if (s.group.visible) list.push(s.group);
    }
    /** Taşınırken gramofon kendi hit-küresine etkileşim algılatmaz. */
    if (gramophone.state === "placed") list.push(gramophone.interactTarget);
    return list;
  }

  /** Gramofon prompt'unu mevcut duruma göre her frame güncelle. */
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

    const pose = movement.update(delta, terrain.getHeightAt);
    cameraMotion.apply(camera, pose, time, delta);

    footprints.update(delta, pose, terrain.getHeightAt);
    atmosphere.update(time);

    /** TEK rotasyon kaynağı. */
    compositionGroup.rotation.y += ROTATION.composition * delta;

    figure.update(time, delta);
    text3d.update(time, delta);

    vinylSystem.update(time);
    gramophone.update(time, delta, { speed: pose.speed, position: pose.position });

    /** Etkileşim hedefini her frame güncelle. */
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

    /** Mesafe-bazlı ses — REFERANS: GRAMOFON konumu (taşınıyor olsa bile). */
    gramophone.worldPosition(gramPos);
    const gain = audioDistance.update(delta, camera.position, gramPos);
    albumPanel.setDistanceGain(gain);

    /** Minimap. */
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
