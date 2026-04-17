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
import { createCarrySystem } from "../world/carrySystem";

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
import { createCaptureControls } from "../ui/captureControls";
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

  /**
   * --- Carry system ---
   * Oyuncunun elinde gösterilen plak. Kameraya bağlı; tek seferde en fazla
   * bir plak tutulur. Envanter `carriedOrder`'a ayna olarak güncellenir.
   */
  const carrySystem = createCarrySystem({ camera });

  const footprints = createFootprintSystem();
  scene.add(footprints.object);

  const flashlight = createFlashlightSystem(camera);
  const audioDistance = createAudioDistanceSystem();

  createHud(container);
  const startOverlay = createStartOverlay(container);
  const albumPanel = createAlbumPlayerPanel(container, inventory);
  const brightness = createBrightnessControl(container);
  /**
   * Parlaklık panelinin ALTINDA konumlanır (CSS'te `.capture-panel` ile).
   * Ekran görüntüsü almak için önce aktif frame'i taze render ederiz; bu
   * `preserveDrawingBuffer: true` ile birleşince toDataURL'nin kararlı
   * bir PNG döndürmesini garantiler.
   */
  createCaptureControls(container, {
    captureScreenshot: () => {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL("image/png");
    },
    shareUrl: window.location.href,
    shareTitle: "Redd — Mükemmel Boşluk",
    shareText:
      "Sessiz bir kraterde plakları topla, gramofona tak ve Redd'in Mükemmel Boşluk albümünü adımla.",
  });
  const interactionHint = createInteractionHint(container);
  const minimap = createMinimap(container);

  /**
   * Plağın "yere düşme" konumunu oyuncunun önünde-ayağında hesaplar.
   * Krater/engel kontrolü yapmaz — dropAt içeriden yBase ile zemine oturtur.
   */
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

  /** --- Interaction: E (topla / kullan), Y (gramofon taşı) --- */
  const interaction = createInteractionSystem({
    onCollectVinyl(order) {
      /**
       * KLASİK PICKUP/DROP:
       *  - Eğer elde bir plak varsa, önce o plağı oyuncunun ayağına düşür.
       *  - Sonra yeni plağı eline al ve dünya sahnesinden gizle.
       *  - Envantere EKLEME YOK — bir plak ancak gramofona YERLEŞTİRİLDİĞİNDE
       *    `collected` setine girer (panel listesi bundan beslenir).
       */
      const targetSpawn = vinylSystem.getSpawn(order);
      if (!targetSpawn) return;
      if (!targetSpawn.group.visible) return;

      /** Aynı plağı zaten elinde tutuyorsan tekrar alınmaz. */
      if (inventory.isCarrying(order)) return;

      const dropSpot = computeDropSpotNearPlayer();
      const dropped = inventory.pickUp(order);
      if (dropped > 0) {
        /** Eski elindeki plağı dünyaya düşür — ayağının yanına. */
        vinylSystem.dropAt(dropped, dropSpot);
        console.log("[Plak]", `El bırakıldı → order=${dropped}`);
      }
      /** Yeni plağı world mesh'inden kaldır. */
      vinylSystem.pickUp(order);
      /** Elde görseli güncelle. */
      carrySystem.setCarried(order);
      console.log("[Plak]", `El alındı → order=${order} "${targetSpawn.title}"`);
    },
    onGramophoneE() {
      /**
       * Gramofon ile etkileşim:
       *  1. Elde plak varsa → GRAMOFONA YERLEŞTİR. Gramofonda eski plak varsa
       *     swap edilir (eski plak ele döner). İlk kez yerleştirilen plak
       *     `collected` setine eklenir → panel listesinde görünür → müzik başlar.
       *  2. Elde plak YOKSA ve gramofonda takılı plak varsa → play/pause toggle.
       *  3. Elde de gramofonda da hiçbir şey yoksa → sessiz no-op (prompt zaten bilgilendiriyor).
       */
      if (inventory.carriedOrder > 0) {
        const result = inventory.placeCarriedOnGramophone();
        if (!result) return;
        const { placed, previousActive } = result;
        /**
         * Gramofon mesh state'i ve carry görseli `inventory.onChange` üzerinden
         * atomik olarak güncellenir (tek emit). Burada yalnızca müziği başlat.
         * Eski plak (varsa) panel listesinde KALIR — oyuncu ordan tekrar çalabilir.
         */
        albumPanel.playOrder(placed);
        if (previousActive > 0 && previousActive !== placed) {
          console.log(
            "[Plak]",
            `Gramofona eklendi → aktif=${placed}, önceki aktif listede: ${previousActive}`,
          );
        } else {
          console.log("[Plak]", `Gramofona yerleştirildi → order=${placed}`);
        }
        return;
      }
      if (gramophone.activeOrder > 0) {
        albumPanel.togglePlayback();
      }
    },
    onGramophoneY() {
      gramophone.toggleCarry(camera, terrain.getHeightAt);
    },
    onDropCarried() {
      /**
       * G — elde tutulan plağı oyuncunun ayağına bırak.
       * Envanterden carry düşer, dünya mesh'i geri görünür.
       */
      const order = inventory.carriedOrder;
      if (order <= 0) return;
      const dropSpot = computeDropSpotNearPlayer();
      inventory.dropCarry();
      vinylSystem.dropAt(order, dropSpot);
      const title = vinylSystem.getSpawn(order)?.title ?? "";
      console.log("[Plak]", `Bırakıldı (G) → order=${order} "${title}"`);
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
    /** Gramofon mesh state envanterle birebir. */
    if (gramophone.activeOrder !== snap.activeOrder) {
      gramophone.setActive(snap.activeOrder);
    }
    /** Elde tutulan plak değiştiyse carry görseli senkronize olsun. */
    if (carrySystem.currentOrder !== snap.carriedOrder) {
      if (snap.carriedOrder > 0) carrySystem.setCarried(snap.carriedOrder);
      else carrySystem.clear();
    }
    /** Panel listesi `collected`e bakıyor — yeni plak eklendiyse refresh. */
    albumPanel.refreshInventory();
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
    /**
     * Prompt öncelik:
     *  1. Elde plak varsa → "E — plağı tak (swap varsa bildir)"
     *  2. Gramofonda plak + çalıyor → "E — duraklat"
     *  3. Gramofonda plak + durmuş → "E — devam et"
     *  4. Hiçbir şey yok → "Önce plağını bul"
     */
    if (inventory.carriedOrder > 0) {
      if (gramophone.activeOrder > 0) {
        ud.interactable.promptText = "E — plağı ekle (önceki listede kalır) · Y — taşı";
      } else {
        ud.interactable.promptText = "E — plağı tak · Y — taşı";
      }
    } else if (gramophone.activeOrder > 0) {
      ud.interactable.promptText =
        albumPanel.activeOrder() > 0
          ? "E — duraklat · Y — taşı"
          : "E — müziği devam ettir · Y — taşı";
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
    carrySystem.update(time, { speed: pose.speed });
    gramophone.update(time, delta, { speed: pose.speed, position: pose.position });

    refreshGramophonePrompt();
    interaction.setTargets(collectInteractables());
    const target = interaction.update(camera);
    if (target) {
      /**
       * Vinyl hedefi için prompt'u dinamik ayarla:
       *  - El boşsa → "E — plağı al"
       *  - Elde farklı plak varsa → "E — elindekini bırak, bunu al" (klasik swap hissi)
       *  - Aynı plağa bakıyorsa (teorik) → sessizce sadece "plağı al"
       */
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
      interactionHint.show(target.descriptor.promptKey, target.descriptor.promptText);
    } else if (gramophone.state === "carried") {
      interactionHint.show("Y", "Gramofonu taşıyorsun · bırakmak için Y");
    } else if (inventory.carriedOrder > 0) {
      /**
       * Herhangi bir hedefe bakmıyoruz ama elde plak var — oyuncuya ne
       * yapabileceğini sessizce hatırlat. Bırakmak için G.
       */
      const title = vinylSystem.getSpawn(inventory.carriedOrder)?.title ?? "";
      interactionHint.show("G", `Elinde "${title}" · G ile bırak, gramofona yaklaş`);
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
