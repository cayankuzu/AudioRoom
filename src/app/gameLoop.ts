import * as THREE from "three";
import { BRIGHTNESS, COMPOSITION, CONTRAST, PLAYER, ROTATION, WORLD } from "../config/config";

import { createScene } from "../scene/scene";
import { createCamera } from "../scene/camera";
import { createRenderer } from "../scene/renderer";
import { addLights } from "../scene/lights";
import { createSky } from "../scene/sky";
import { createAtmosphere } from "../scene/atmosphere";
import { createPostProcess } from "../scene/postprocess";

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
import { createBrandFooter } from "../ui/brandFooter";
import { createInteractionHint } from "../ui/interactionHint";
import { createMinimap } from "../ui/minimap";
import { createMobileControls } from "../ui/mobileControls";

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

  /**
   * --- Post-process pipeline ---
   * Scene tonemapping + sRGB dönüşümü artık OutputPass tarafında yapılır
   * (EffectComposer içinde). Böylece color grading pass'i linear uzayda
   * çalışır ve son adımda ACES + sRGB uygulanır. `renderer.outputColorSpace`
   * yine sRGB'dir (OutputPass bunu sonuca yazar).
   */
  const post = createPostProcess(renderer, scene, camera);

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

  const hud = createHud(container, { showLibraryBack: true });
  const startOverlay = createStartOverlay(container);
  const albumPanel = createAlbumPlayerPanel(container, inventory, {
    /**
     * Paneldeki ⏏ butonu ile bir plak koleksiyondan çıkarıldığında
     * dünyaya geri düşür. Inventory mutation ve playback pause zaten
     * panel içinde yapılıyor; burada yalnızca plağın dünya mesh'ini
     * yeniden görünür kıl ve gramofonun HEMEN önüne yerleştir ki
     * oyuncu kolayca tekrar alabilsin.
     */
    onEjectRecord(order) {
      const spawn = vinylSystem.getSpawn(order);
      if (!spawn) return;
      const gramPos = new THREE.Vector3();
      gramophone.worldPosition(gramPos);
      /**
       * Gramofonun ön tarafına küçük, belirli bir ofsetle düşür. Kamera
       * yönü belli değilse (panelden çıkarıldığı için), gramofonun yerel
       * forward'ını kullanmak yerine sabit bir dünya ofseti veriyoruz —
       * bu, farklı session'lar arasında tutarlı ve görünür bir konum
       * sağlar. Y, vinylSystem.dropAt içinde terrain'den sample edilir.
       */
      const drop = gramPos.clone().add(new THREE.Vector3(0.7, 0, 0.7));
      vinylSystem.dropAt(order, drop);
      console.log("[Plak]", `Çıkarıldı (panel) → order=${order} "${spawn.title}"`);
    },
  });
  const brightness = createBrightnessControl(container);
  /**
   * Parlaklık panelinin ALTINDA konumlanır (CSS'te `.capture-panel` ile).
   * Ekran görüntüsü almak için önce aktif frame'i taze render ederiz; bu
   * `preserveDrawingBuffer: true` ile birleşince toDataURL'nin kararlı
   * bir PNG döndürmesini garantiler.
   */
  const captureControls = createCaptureControls(container, {
    captureScreenshot: () => {
      /**
       * Post-processed frame'i tazele — yakalamadan önce composer çalıştır
       * ki grading + vignette dahil olsun. preserveDrawingBuffer: true
       * nedeniyle toDataURL stabil sonuç döndürür.
       */
      post.composer.render();
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
   * Alt ortada duran minimal imza: "© 2026 · Powered by MeMoDe". Yalnızca
   * DOM — sahneye hiçbir maliyeti yok, pointer-events: none.
   */
  createBrandFooter(container);

  /**
   * --- Mobil dokunmatik kontrol katmanı ---
   * Yalnızca dokunmatik cihazlarda mount edilir. D-pad (yön okları), aksiyon
   * butonları (E/Q/R/Space) ve ekranın serbest bölgesinde parmak sürükleme
   * ile kamera bakışı sağlar. Masaüstünde hiç eklenmez — klavye/fare akışı
   * etkilenmez.
   *
   * Telefon yatay modunda layout ideal olacak şekilde CSS'te optimize
   * edildi: sol-alt d-pad, sağ-alt aksiyon butonları, sağ-üst minyatür
   * toolbar (fener, harita, albüm, kontroller, parlaklık, duraklat).
   */
  const mobileControls = input.isTouch
    ? createMobileControls(container, input, {
        lookTarget: renderer.domElement,
        onToggleFlashlight: () => flashlight.toggle(),
        onToggleMap: () => minimap.toggle(),
        onTogglePanel: () => albumPanel.toggle(),
        onToggleBrightness: () => brightness.toggle(),
        onPause: () => input.releaseLock(),
      })
    : null;
  /**
   * Mobil iken `<body>`a bir sınıf ekle → CSS, panelleri (HUD, minimap,
   * album panel, bright-panel, capture-panel) yatay telefonda sığacak
   * şekilde kompakt moduna alır.
   */
  if (input.isTouch) {
    document.body.classList.add("is-touch");
    mobileControls?.setVisible(false);
  }

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

  /** --- Interaction: E (al / kullan), Q (elindekini bırak) --- */
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
       * Gramofon + E — iki davranışa dallanır:
       *  1. Elde plak varsa → GRAMOFONA YERLEŞTİR. (İlk yerleşimde
       *     `collected`e eklenir → panel listesinde görünür, müzik başlar.
       *     Eski plak listede KALIR.)
       *  2. El boşsa → gramofonu ELE AL (taşımaya başla). Bu durumda
       *     müziği duraklatma; oyuncu istemiyorsa R ile kapatabilir.
       *
       * Play/pause ARTIK E ile değil, R ile yapılır.
       */
      if (inventory.carriedOrder > 0) {
        const result = inventory.placeCarriedOnGramophone();
        if (!result) return;
        const { placed, previousActive } = result;
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
      gramophone.toggleCarry(camera, terrain.getHeightAt);
      console.log("[Gramofon]", "Taşımaya alındı (E)");
    },
    onGramophoneR() {
      /**
       * R — gramofonda plak takılıysa play/pause toggle. Plak yoksa
       * sessizce no-op.
       */
      if (gramophone.activeOrder <= 0) return;
      albumPanel.togglePlayback();
      console.log("[Gramofon]", "Play/Pause toggle (R)");
    },
    onDropCarried() {
      /**
       * Q — elde/üzerinde tutulanı bırak. Öncelik:
       *  1. Elde plak varsa → plağı oyuncunun önüne düşür.
       *  2. Gramofon taşınıyorsa → gramofonu yere koy (slope sampling).
       *  3. Hiçbiri yoksa sessizce no-op.
       */
      const order = inventory.carriedOrder;
      if (order > 0) {
        const dropSpot = computeDropSpotNearPlayer();
        inventory.dropCarry();
        vinylSystem.dropAt(order, dropSpot);
        const title = vinylSystem.getSpawn(order)?.title ?? "";
        console.log("[Plak]", `Bırakıldı (Q) → order=${order} "${title}"`);
        return;
      }
      if (gramophone.state === "carried") {
        gramophone.toggleCarry(camera, terrain.getHeightAt);
        console.log("[Gramofon]", "Bırakıldı (Q)");
      }
    },
  });

  /**
   * Parlaklık ve kontrast artık DOĞRUDAN post-process grading uniform'larına
   * bağlanır; `renderer.toneMappingExposure` sabit 1.0'da tutulur. Bunun
   * sebebi: figür ve "MÜKEMMEL BOŞLUK / REDD" yazıları alpha=0.25 marker'ı
   * ile render edildiğinde grading shader onları tamamen atlar. Fakat
   * renderer.toneMappingExposure material-level tonemap aşamasında etkili
   * olduğu için slider'ı oraya bağlarsak yine de o pikselleri kaydırırdı.
   *
   * Slider yalnızca `uExposure` uniform'unu hareket ettirir → marker'lı
   * pikseller parlaklık/kontrast slider'larına karşı sabit kalır.
   */
  renderer.toneMappingExposure = 1.0;
  post.grading.exposure.value = brightness.exposure;
  brightness.onChange((exposure) => {
    post.grading.exposure.value = Math.max(BRIGHTNESS.min, Math.min(BRIGHTNESS.max, exposure));
  });
  brightness.onContrastChange((contrast) => {
    post.grading.contrast.value = Math.max(CONTRAST.min, Math.min(CONTRAST.max, contrast));
  });

  /**
   * Global klavye kısayolları (edge-detection):
   *  - F  : fener
   *  - P  : albüm paneli aç/kapa
   *  - M  : harita aç/kapa
   *  - K  : kontroller paneli aç/kapa
   *  - L  : parlaklık + kontrast paneli aç/kapa
   *  - T  : ekran görüntüsü al (preview açılır)
   *
   * Not: E / Q interactionSystem içinde ayrıca dinlenir; burada onlara
   * dokunmuyoruz.
   */
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    /** Bir input veya textarea aktifse kısayolları yut. */
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
      return;
    }
    switch (e.code) {
      case "KeyF":
        flashlight.toggle();
        break;
      case "KeyP":
        albumPanel.toggle();
        break;
      case "KeyM":
        minimap.toggle();
        break;
      case "KeyK":
        hud.toggle();
        break;
      case "KeyL":
        brightness.toggle();
        break;
      case "KeyT":
        /**
         * Ekran görüntüsü kısayolu — buton akışının birebir aynısı:
         * composer taze render → toDataURL → preview modal.
         */
        captureControls.takeScreenshot();
        break;
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
    if (locked) {
      startOverlay.hide();
      mobileControls?.setVisible(true);
    } else {
      startOverlay.show();
      /**
       * Mobilde duraklayınca kontrolleri gizle — pause kartını tıklaması
       * yanlışlıkla D-pad'e değmesin.
       */
      mobileControls?.setVisible(false);
    }
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
    post.resize(window.innerWidth, window.innerHeight);
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
     *  1. Elde plak varsa → "E — plağı tak / ekle"
     *  2. Gramofonda plak + çalıyor → "R — duraklat · E — gramofonu taşı"
     *  3. Gramofonda plak + durmuş → "R — başlat · E — gramofonu taşı"
     *  4. Hiçbir şey yok → "E — gramofonu taşı · önce bir plak bul"
     */
    if (inventory.carriedOrder > 0) {
      if (gramophone.activeOrder > 0) {
        ud.interactable.promptText = "E — plağı ekle (önceki listede kalır)";
      } else {
        ud.interactable.promptText = "E — plağı tak";
      }
    } else if (gramophone.activeOrder > 0) {
      ud.interactable.promptText =
        albumPanel.activeOrder() > 0
          ? "R — duraklat · E — gramofonu taşı"
          : "R — başlat · E — gramofonu taşı";
    } else {
      ud.interactable.promptText = "E — gramofonu taşı · önce bir plak bul";
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
      interactionHint.show("Q", "Gramofonu taşıyorsun · bırakmak için Q");
    } else if (inventory.carriedOrder > 0) {
      /**
       * Herhangi bir hedefe bakmıyoruz ama elde plak var — oyuncuya ne
       * yapabileceğini sessizce hatırlat. Bırakmak için Q.
       */
      const title = vinylSystem.getSpawn(inventory.carriedOrder)?.title ?? "";
      interactionHint.show("Q", `Elinde "${title}" · Q ile bırak, gramofona yaklaş`);
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

    post.tick(time);
    post.composer.render();
    requestAnimationFrame(animate);
  }
  animate();
}
