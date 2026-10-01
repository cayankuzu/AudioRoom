import { allRecordsShelved } from "./devFlags";
import * as THREE from "three";
import "./styles/engine.css";
import { assetUrl, createAssets } from "./core/assets";
import { createColliders } from "./core/colliders";
import { setAccentVars } from "./core/color";
import { isPhone, isTouchOnly } from "./core/device";
import { createInput } from "./core/input";
import { createPlayer, yawTowards } from "./core/player";
import { createRng, sessionSeed } from "./core/rng";
import { createRuntime, type Runtime } from "./core/runtime";
import { clearProgress, loadProgress, loadSettings, saveProgress, saveSettings, type Settings } from "./core/storage";
import { createCoverPoint, type CoverPointController } from "./game/coverPoint";
import { createAvatar, type Avatar } from "./game/avatar";
import { loadLyrics, lyricAt, type LyricLine } from "./audio/lyrics";
import { createFrame, frameAt } from "./game/director";
import { createFlashlight } from "./game/flashlight";
import { createGramophone } from "./game/gramophone";
import { createInteraction, type PromptLine } from "./game/interaction";
import { createRecords, type GameRecord } from "./game/records";
import { SLEEVE_SIZE } from "./game/vinyl";
import { createSecrets } from "./game/secrets";
import { createMusic } from "./audio/music";
import { createSfx } from "./audio/sfx";
import { el } from "./ui/dom";
import { createHud } from "./ui/hud";
import { createLoading } from "./ui/loading";
import { createMarker } from "./ui/marker";
import { createMenu } from "./ui/menu";
import { createMusicCard } from "./ui/musicCard";
import { showDesktopGate, showFatal, showFinale, showPhoneGate } from "./ui/screens";
import { createTouchControls } from "./ui/touch";
import type { WorldContext, WorldDefinition, WorldLogic } from "./world";

/** Müziğin gramofon mesafesine göre kısılması: yakında tam, uzakta hafif fısıltı. */
function distanceGain(distance: number): number {
  const near = 5;
  const far = 55;
  if (distance <= near) return 1;
  const t = Math.min(1, (distance - near) / (far - near));
  return 1 - t * t * (3 - 2 * t) * 0.9;
}

export async function bootWorld(def: WorldDefinition): Promise<void> {
  const app = document.getElementById("app") ?? document.body;
  const { meta } = def;
  const libraryHref = `${assetUrl("")}#/album/${meta.id}`;
  const root = document.documentElement;
  setAccentVars(root, "ar-", meta.accent, meta.accentInk);
  root.style.setProperty("--ar-display", meta.displayFont);
  document.title = `${meta.artist} — ${meta.album} · AudioRoom`;

  // Telefonda Sürüm 2 evrenlerine erişim yok: kapı, telefonda açılan tek evrene (Mükemmel Boşluk · Sürüm 1) yönlendirir.
  if (isPhone()) {
    showPhoneGate(app, meta, libraryHref);
    return;
  }
  const touch = isTouchOnly();
  if (touch && def.device === "desktop") {
    showDesktopGate(app, meta, libraryHref);
    return;
  }
  const demo = touch && def.device === "mobile-demo";
  document.body.classList.toggle("ar-demo", demo);

  const settings: Settings = loadSettings();
  if (demo) settings.quality = "low";
  const coverUrl = assetUrl(meta.cover);
  const loading = createLoading(app, meta, coverUrl);

  const stage = el("div", "ar-stage");
  app.appendChild(stage);
  let runtime: Runtime;
  try {
    runtime = createRuntime(stage, settings.quality, () =>
      showFatal(app, "Grafik bağlantısı kesildi", "Tarayıcı 3D görüntüyü durdurdu. Sayfayı yenileyerek kaldığın yerden devam edebilirsin.", libraryHref),
    );
  } catch {
    loading.done();
    showFatal(app, "3D desteklenmiyor", "Bu tarayıcı WebGL 2 desteklemiyor. Güncel Chrome, Edge, Firefox veya Safari ile tekrar dene.", libraryHref);
    return;
  }
  const { scene, camera } = runtime;

  const assets = createAssets((ratio) => loading.progress(0.1 + ratio * 0.85));
  await Promise.race([document.fonts.load("700 20px Manrope"), new Promise((r) => setTimeout(r, 1500))]);

  const tracks = demo ? def.tracks.filter((track) => def.demoTracks?.includes(track.id)) : def.tracks;
  const progressId = demo ? `${meta.id}-demo` : meta.id;
  const progress = loadProgress(progressId);
  const found = new Set(progress.found.filter((id) => tracks.some((track) => track.id === id)));
  // Geçici test kipi: bütün plaklar baştan kitaplıkta (ilerleme kaydı değişmez).
  const shelvedAtStart: ReadonlySet<string> = allRecordsShelved() ? new Set(tracks.map((track) => track.id)) : found;

  const input = createInput(runtime.renderer.domElement, touch);
  const player = createPlayer(def.player);
  // Yalnızca geliştirme: kapak/klip kadrajı ayarlarken kamerayı elle kurmak için (window.__audioroom.devCamera.frame).
  const devCamera: { frame: { position: THREE.Vector3; target: THREE.Vector3; fov: number; roll?: number } | null } = { frame: null };
  const colliders = createColliders();
  const interaction = createInteraction();
  const sfx = createSfx();
  // Dokunmatikte ipuçları klavye tuşu yerine ekrandaki düğmenin adını kullanır.
  const keyNames: Record<string, string> = demo ? { E: "Etkileşim", R: "Çal / Durdur", F: "Fener" } : {};
  const key = (name: string) => keyNames[name] ?? name;
  const hud = createHud(app, { artist: meta.artist, album: meta.album }, keyNames);
  const marker = createMarker(app, "Gramofon");
  const card = createMusicCard(app, tracks.length);
  const music = createMusic(card.videoHost);
  card.bind(music);
  const records = await createRecords(scene, camera, tracks, coverUrl, meta.accent);
  const gramophone = createGramophone(def.plinth ?? "wood", def.dais !== false);
  scene.add(gramophone.root, gramophone.loose);
  /**
   * Plak kitaplığını gramofon sehpasının yanına koyar: oyuncunun başladığı yerden bakınca yanda,
   * yüzü oyuncuya dönük. Yer doluysa öbür yana, sonra biraz geriye dener; katıdır.
   */
  function placeShelf() {
    const base = gramophone.root.position;
    const start = def.player.start;
    const toStart = new THREE.Vector3(start.x - base.x, 0, start.z - base.z);
    if (toStart.lengthSq() < 0.01) toStart.set(0, 0, 1);
    toStart.normalize();
    const side = new THREE.Vector3(toStart.z, 0, -toStart.x);
    const candidates = [
      side.clone().multiplyScalar(2.4),
      side.clone().multiplyScalar(-2.4),
      side.clone().multiplyScalar(2.8).addScaledVector(toStart, -0.9),
      side.clone().multiplyScalar(-2.8).addScaledVector(toStart, -0.9),
      toStart.clone().multiplyScalar(-2.4),
    ];
    const spot = candidates.map((offset) => offset.add(base)).find((p) => colliders.isFree(p.x, p.z, 1.15)) ?? candidates[0];
    const shelf = records.shelf.root;
    shelf.position.set(spot.x, logic?.ground(spot.x, spot.z) ?? 0, spot.z);
    shelf.rotation.y = Math.atan2(start.x - spot.x, start.z - spot.z);
    const scale = def.shelfScale ?? 1;
    shelf.scale.setScalar(scale);
    colliders.solid(shelf, { pad: 0.05 });
  }
  // Yere konan (sehpasından uzakta) gramofonun çarpışması; sehpanın kendisi dünyanın çarpışmasıdır.
  const looseCollider = colliders.addCircle(0, 0, 0.5);
  looseCollider.enabled = false;

  let active: GameRecord | null = null;
  let logic: WorldLogic | null = null;
  let finaleShown = progress.completed;
  let finalePending = false;

  const secretIds = new Set(def.secrets.map((secret) => secret.id));
  const secretsFound = new Set(progress.secrets.filter((id) => secretIds.has(id)));
  const persist = () => saveProgress(progressId, { found: [...found], completed: finaleShown, secrets: [...secretsFound] });
  const secrets = createSecrets(def.secrets, secretsFound, (secret, count, total) => {
    hud.secret(secret.title, secret.text, count, total);
    sfx.cue("chime");
    persist();
  });

  // İsteğe bağlı senkron sözler: public/lyrics/<kimlik>.lrc (lisanslı dosya varsa).
  let lyrics: LyricLine[] | null = null;
  let lyricShown = "";
  const startTrack = (record: GameRecord) => {
    lyrics = null;
    lyricShown = "";
    hud.lyric(null);
    void loadLyrics(record.track.id).then((lines) => {
      if (active === record) lyrics = lines;
    });
    const first = !found.has(record.track.id);
    found.add(record.track.id);
    persist();
    music.play(record.track);
    hud.caption(record.track.title, record.track.mood, 7);
    logic?.onTrack?.(clipsOn ? record.track : null);
    syncClip();
    if (clipsOn && settings.cinema && !demo) setCinema(true, true);
    hud.setProgress(found.size, tracks.length);
    card.setCollection(tracks, found);
    if (first) {
      sfx.cue("moment");
      logic?.onFound?.(found.size, tracks.length);
      // Son plak: kapanış, şarkı bittiğinde başlar (şarkının doruğu evrenin finali olur).
      if (found.size === tracks.length && !finaleShown) {
        finalePending = true;
        hud.hint("Son plak çalıyor — şarkı bittiğinde evren kapanışını yapacak", 8);
      }
    }
  };

  const placeOnGramophone = (record: GameRecord) => {
    if (active && active !== record) records.collect(active);
    gramophone.setRecord(records.release(record));
    active = record;
    sfx.cue("place");
    hud.hint("");
    startTrack(record);
  };

  /** Plağı gramofondan alıp oyuncunun eline verir; çalma durur ve evren sükûnete döner. */
  const removeFromGramophone = () => {
    const record = active;
    if (!record) return;
    active = null;
    lyrics = null;
    hud.lyric(null);
    gramophone.setRecord(null);
    music.stop();
    records.hold(record);
    sfx.cue("pickup");
    logic?.onTrack?.(null);
    setCinema(false);
    syncClip();
    finalePending = false;
    hud.hint(`Plak elinde · başka bir plağı takabilir ya da ${key("Q")} ile bırakabilirsin`, 5);
  };

  let worldPickup: ((record: GameRecord) => void) | undefined;
  const pickUp = (record: GameRecord) => {
    const previous = records.held;
    if (previous) {
      // Değiştirilen plak: kitaplığın yanındaysa rafına, değilse alınanın yerine ya da öne bırakılır.
      if (nearShelf()) records.collect(previous);
      else if (record.state === "world") records.drop(previous, record.group.position.x, record.group.position.y, record.group.position.z);
      else dropAhead(previous);
    }
    records.hold(record);
    sfx.cue("pickup");
    worldPickup?.(record);
    // Gramofon kucaktayken plak doğrudan tablaya konur: müzik yürüdüğün yerde başlar.
    if (gramophone.spot === "carried") {
      placeOnGramophone(record);
      return;
    }
    if (!active && found.size === 0) hud.hint(`Gramofonu bul ve plağı ${key("E")} ile tak`, 6);
  };

  // --- Taşınabilir gramofon --------------------------------------------------
  /** Kucaktaki gramofonun yönü: boru ileri-sola bakar, tabla ve plak görünür. */
  const CARRY_YAW = Math.PI - 0.35;
  const carryPoint = new THREE.Vector3();
  const carryForward = new THREE.Vector3();
  let carryBob = 0;
  /** Oyuncunun önündeki boş zemin (gramofonu koymak için); yer yoksa null. */
  const setDownSpot = () => {
    for (const reach of [1.3, 1.0, 1.7]) {
      const x = player.position.x - Math.sin(player.yaw) * reach;
      const z = player.position.z - Math.cos(player.yaw) * reach;
      if (colliders.isFree(x, z, 0.45)) return { x, z };
    }
    return null;
  };
  const toggleCarry = () => {
    if (cover?.active || menu.open) return;
    if (gramophone.spot === "carried") {
      const spot = setDownSpot();
      if (!spot) {
        hud.hint("Buraya sığmıyor · biraz daha açık bir yer bul", 3);
        return;
      }
      const home = gramophone.setDown(spot.x, world.ground(spot.x, spot.z), spot.z, player.yaw);
      sfx.cue("place");
      hud.hint(home ? "Gramofon sehpasına döndü" : "Gramofonu buraya koydun · istediğin an yine G ile alabilirsin", 4);
      logic?.onGramophoneMoved?.(gramophone.spot);
      return;
    }
    gramophone.worldPosition(gramPosition);
    // Uzaklık oyuncunun gözünden ölçülür: üçüncü kişide kamera üç adım geridedir.
    if (gramPosition.distanceTo(settings.thirdPerson ? eyePoint : camera.position) > 3.2) return;
    if (records.held) {
      hud.hint(`Elin dolu · önce plağı ${key("E")} ile tak ya da ${key("Q")} ile bırak`, 4);
      return;
    }
    gramophone.carry();
    sfx.cue("pickup");
    hud.hint("Gramofon kucağında · müzik seninle geliyor", 4);
    logic?.onGramophoneMoved?.(gramophone.spot);
  };

  // --- Klip ve sinema kamerası --------------------------------------------------
  // Klip: şarkı çalarken evrenin o şarkıyı anlatan sahnesi. Kapalıyken müzik sürer, evren kapakta kalır.
  // Sinema: klibin çekim listesiyle kamerayı yönetmen sürer; yürüyünce ya da E ile serbest kalınır.
  let clipsOn = settings.clips;
  let cinema = false;
  let cinemaBlend = 0;
  let cinemaFramed = false;
  const cinemaFrame = createFrame();
  const cinemaQuat = new THREE.Quaternion();
  const cinemaMatrix = new THREE.Matrix4();
  const cinemaRoll = new THREE.Quaternion();
  const playerPose = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), fov: 70 };
  const zAxis = new THREE.Vector3(0, 0, 1);
  const cinemaBars = el("div", "ar-cinema-bars");
  // Sinema modunun kontrolleri müzik kartındaki iki düğmededir (V, K); ekranda ikinci bir not yok.
  app.append(cinemaBars);
  // Kameraya bağlı nesneler (eldeki plak, eldeki çiçek…) kapak ve sinema kadrajında gizlenir;
  // geri gelirken yalnızca gizlenmeden önce görünür olanlar geri açılır.
  let cameraHides = 0;
  const hiddenChildren: THREE.Object3D[] = [];
  function hideCameraChildren(hide: boolean) {
    if (hide) {
      if (cameraHides++ > 0) return;
      for (const child of camera.children) {
        if (!child.visible) continue;
        hiddenChildren.push(child);
        child.visible = false;
      }
    } else if (cameraHides > 0 && --cameraHides === 0) {
      hiddenChildren.forEach((child) => (child.visible = true));
      hiddenChildren.length = 0;
    }
  }
  /** Klibin renk katmanı (çekimin paleti, lensi, geçişi); sinemadan çıkarken söner. */
  const applyClipGrade = (weight: number) => {
    const g = runtime.grade;
    g.uClip.value = weight;
    if (weight <= 0) {
      g.uClipFlash.value = 0;
      return;
    }
    const look = cinemaFrame.grade;
    g.uClipExposure.value = look.exposure;
    g.uClipContrast.value = look.contrast;
    g.uClipSaturation.value = look.saturation;
    g.uClipTint.value.copy(look.tint);
    g.uClipLift.value.copy(look.lift);
    g.uClipVignette.value = look.vignette;
    g.uClipAberration.value = look.aberration;
    g.uClipGlitch.value = look.glitch;
    g.uClipSoft.value = look.soft;
    g.uClipLens.value = cinemaFrame.lens;
    g.uClipLensAmount.value = cinemaFrame.lensAmount;
    g.uClipFlash.value = cinemaFrame.flash;
    g.uClipFlashColor.value.copy(cinemaFrame.flashColor);
  };
  /**
   * Göz uyumu: klipte kare fazla karanlıksa (ölçülen ortalama parlaklık hedefin altındaysa) gölgeler
   * yavaşça açılır; parlak karede etkisizdir. Hedef orta tonlu bir sinema karesi (0.3).
   */
  let clipGamma = 1;
  const EYE_TARGET = 0.3;
  const adaptEye = (dt: number, on: boolean) => {
    runtime.meter(on);
    const lum = Math.max(0.02, runtime.luminance());
    const want = on && lum < EYE_TARGET ? THREE.MathUtils.clamp(Math.log(lum) / Math.log(EYE_TARGET), 1, 2.8) : 1;
    // Karanlığa alışma yavaş, aydınlığa dönüş hızlı: kesmede parlak sahne bir an fazla açık kalmasın.
    clipGamma += (want - clipGamma) * Math.min(1, dt * (want < clipGamma ? 7 : 1.6));
    runtime.grade.uClipGamma.value = clipGamma;
  };
  // Film kartları: klibin başında şarkının adı, sonunda kapanış; ikisi de yavaşça belirip söner.
  const filmCard = el("div", "ar-film");
  const filmKicker = el("p", "ar-film__kicker");
  const filmTitle = el("h2", "ar-film__title");
  const filmCredit = el("p", "ar-film__credit");
  filmCard.append(filmKicker, filmTitle, filmCredit);
  app.append(filmCard);
  let filmShown = "";
  const updateFilmCard = () => {
    if (!cinema || !active) {
      filmCard.classList.remove("is-visible");
      filmShown = "";
      return;
    }
    const { time, duration } = music.progress();
    const opening = time > 1.2 && time < 7.5;
    const closing = duration > 40 && time > duration - 8 && time < duration - 0.8;
    const allowed = world.filmCard?.(active.track.id) ?? true;
    const want = !allowed ? "" : opening ? `open:${active.track.id}` : closing ? `close:${active.track.id}` : "";
    if (want === filmShown) return;
    filmShown = want;
    if (!want) {
      filmCard.classList.remove("is-visible");
      return;
    }
    filmCard.classList.toggle("is-closing", closing);
    filmKicker.textContent = opening ? `${meta.artist} · ${meta.album}` : "Son";
    filmTitle.textContent = active.track.title;
    filmCredit.textContent = opening ? active.track.credit ?? "" : `${meta.artist} · AudioRoom`;
    filmCard.style.setProperty("--ar-film-font", meta.displayFont);
    filmCard.classList.add("is-visible");
  };
  const clipShots = () => (active && clipsOn ? (world.shots?.(active.track.id) ?? null) : null);
  const syncClip = () => {
    card.setClip({ on: clipsOn, cinema, available: Boolean(active) && !demo });
    document.body.classList.toggle("ar-cinema", cinema);
    if (cover) cover.marker.visible = !cinema;
  };
  function setCinema(next: boolean, auto = false) {
    if (next && (!clipShots()?.length || cover?.active)) {
      if (!auto && next) hud.hint(clipsOn ? "Bu şarkının klip kamerası yok" : `Önce klibi aç · ${key("K")}`, 3);
      return;
    }
    if (cinema === next) return;
    cinema = next;
    player.frozen = next;
    hideCameraChildren(next);
    syncClip();
  }
  const setClips = (next: boolean) => {
    if (clipsOn === next) return;
    clipsOn = next;
    settings.clips = next;
    saveSettings(settings);
    if (active) logic?.onTrack?.(next ? active.track : null);
    if (!next) setCinema(false);
    hud.hint(next ? "Klip açık · şarkı evrende yeniden canlanıyor" : "Klip kapalı · müzik çalıyor, evren kapaktaki hâline döndü", 5);
    syncClip();
  };
  card.onClip((action) => {
    if (action === "toggle") setClips(!clipsOn);
    else setCinema(!cinema);
  });

  const ctx: WorldContext = {
    runtime,
    scene,
    camera,
    assets,
    input,
    player,
    colliders,
    records,
    gramophone,
    interaction,
    music,
    sfx,
    hud,
    tracks,
    demo,
    random: createRng(sessionSeed()),
    found,
    startShelved: shelvedAtStart,
    placeOnGramophone,
    pickUp,
    secrets,
    songTime: () => (!clipsOn ? -1 : music.track ? music.progress().time : 0),
    get cinema() {
      return cinema;
    },
  };

  try {
    logic = await def.build(ctx);
    placeShelf();
  } catch (error) {
    console.error(error);
    loading.done();
    showFatal(app, "Evren yüklenemedi", "Bir dosya indirilemedi. İnternet bağlantını kontrol edip sayfayı yenile.", libraryHref);
    return;
  }
  const world = logic;
  // El feneri (F): karanlık evrenlerde; ışık baştan sahnededir, kapalıyken şiddeti sıfır.
  const flashlight = def.flashlight ? createFlashlight(scene) : null;
  /** Üçüncü kişide fenerin yandığı yer: karakterin göğsü. */
  const chestPoint = new THREE.Vector3();
  // Oyuncunun karakteri (üçüncü kişi görünümde görünür; kliplerde gizli).
  const avatar: Avatar = createAvatar(scene);
  const eyePoint = new THREE.Vector3();
  const applyView = () => {
    // Üçüncü kişide kameraya bağlı el nesneleri gizlenir; plak karakterin eline geçer.
    // Sıra önemli: tutucu kameranın çocuğuyken gizlenirse elde de gizli kalırdı; önce ele geçer, sonra kamera
    // çocukları gizlenir. Kapsül rigin de eli vardır: karakter dokusu henüz yüklenmemişken de elde görünür.
    if (settings.thirdPerson) {
      records.setHand(avatar.hand);
      hideCameraChildren(true);
    } else {
      hideCameraChildren(false);
      records.setHand(null);
    }
  };
  applyView();
  const baseExposure = runtime.renderer.toneMappingExposure;
  player.teleport(
    def.player.start.x,
    def.player.start.z,
    yawTowards(def.player.start.x, def.player.start.z, def.player.lookAt.x, def.player.lookAt.z),
    world.ground,
  );

  // --- Plak ve gramofon etkileşimleri -----------------------------------
  worldPickup = world.onPickup;

  for (const record of records.list) {
    interaction.add({
      radius: 0.6,
      position: (target) => record.vinyl.getWorldPosition(target),
      prompt: () =>
        record.state === "world" && record.pickable
          ? [{ key: "E", label: `${records.held ? "Değiştir" : "Plağı al"} · ${record.track.title}` }]
          : null,
      use: () => pickUp(record),
    });
  }

  // Plak kitaplığı: çalınmış plaklar raftaki yuvalarında; istediğini alıp gramofona takarsın.
  for (const record of records.list) {
    interaction.add({
      radius: 0.2,
      reach: 4.5,
      position: (target) => record.display.localToWorld(target.set(0, SLEEVE_SIZE * 0.55, 0)),
      prompt: () => (record.state === "collected" && !records.held ? [{ key: "E", label: `Raftan al · ${record.track.title}` }] : null),
      use: () => pickUp(record),
    });
  }
  // Kitaplığın kendisi: elde plak varken yanındaysan E plağı yuvasına koyar (rafa tam bakmak gerekmez;
  // gramofona bakıyorsan gramofon önceliklidir).
  interaction.add({
    radius: 1.1,
    reach: 2.4,
    always: true,
    position: (target) => records.shelf.root.getWorldPosition(target).add(SHELF_AIM),
    prompt: () => (records.held && nearShelf() ? [{ key: "E", label: `Rafa koy · ${records.held.track.title}` }, { key: "Q", label: "Rafa koy" }] : null),
    use: () => shelveHeld(),
  });

  interaction.add({
    radius: 1,
    position: (target) => gramophone.worldPosition(target),
    prompt: (): PromptLine[] => {
      if (records.held) return [{ key: "E", label: `Gramofona tak · ${records.held.track.title}` }];
      const carried = gramophone.spot === "carried";
      const move = { key: "G", label: carried ? "Yere koy" : "Kucağına al" };
      if (active) {
        const playing = music.state === "playing" || music.state === "loading";
        return [
          { key: "R", label: `${playing ? "Duraklat" : "Çal"} · ${active.track.title}` },
          { key: "E", label: "Plağı çıkar" },
          move,
        ];
      }
      return [{ key: "", label: carried ? "Gramofon kucağında — bir plağa E ile dokun" : "Gramofon boş — bir plak bul ve buraya getir" }, move];
    },
    use: () => {
      if (records.held) placeOnGramophone(records.held);
      else if (active) removeFromGramophone();
    },
  });

  /** Kitaplığın yanında mı? Plak yalnızca buradayken rafına konur; uzaktaysa olduğu yere bırakılır. */
  const shelfSpot = new THREE.Vector3();
  const SHELF_AIM = new THREE.Vector3(0, 1, 0);
  const nearShelf = () => {
    records.shelf.root.getWorldPosition(shelfSpot);
    return Math.hypot(shelfSpot.x - player.position.x, shelfSpot.z - player.position.z) < 4;
  };
  /** Oyuncunun önüne bırakır. */
  function dropAhead(record: GameRecord) {
    const x = player.position.x - Math.sin(player.yaw) * 1.1;
    const z = player.position.z - Math.cos(player.yaw) * 1.1;
    records.drop(record, x, world.ground(x, z), z);
  }
  /** Eldeki plağı kitaplıktaki kendi yuvasına koyar. */
  const shelveHeld = () => {
    const record = records.held;
    if (!record) return;
    records.collect(record);
    sfx.cue("place");
    hud.hint(`${record.track.title} rafına kondu`, 3);
  };
  const dropHeld = () => {
    const record = records.held;
    if (!record) return;
    // Kitaplığın yanında bırakılan plak (çalınmış olsun olmasın) yuvasına konur; uzakta bırakılırsa olduğu
    // yere düşer. Çalınmış plak yeniden girişte yine rafındadır.
    if (nearShelf()) {
      shelveHeld();
      return;
    }
    dropAhead(record);
    sfx.cue("drop");
  };

  card.onReplay((track) => {
    const record = records.byTrack(track.id);
    if (!record || record === active) {
      music.toggle();
      return;
    }
    placeOnGramophone(record);
  });

  // --- Kapak Noktası -----------------------------------------------------
  let cover: CoverPointController | null = null;
  const beaconsDefault = records.beacons;
  const photobar = el("div", "ar-photobar");
  if (world.coverPoint && !demo) {
    const point = world.coverPoint;
    cover = createCoverPoint(point, world.ground(point.stand.x, point.stand.z), meta.accent, coverUrl, {
      onEnter: () => {
        setCinema(false);
        // Kapak kadrajı kucaktaki gramofonu göstermesin: sehpasına geri konur.
        if (gramophone.spot === "carried") {
          gramophone.setDown(gramophone.root.position.x, gramophone.root.position.y, gramophone.root.position.z, 0);
          logic?.onGramophoneMoved?.(gramophone.spot);
        }
        point.onEnter?.();
        player.frozen = true;
        hud.setVisible(false);
        records.beacons = false;
        hideCameraChildren(true);
        document.body.classList.add("ar-photo");
      },
      onExit: () => {
        point.onExit?.();
        player.frozen = false;
        hud.setVisible(true);
        records.beacons = beaconsDefault;
        hideCameraChildren(false);
        document.body.classList.remove("ar-photo");
      },
    });
    scene.add(cover.marker);
    colliders.solid(cover.easel);
    interaction.add(cover.interactable);
    // Fotoğraf modu çubuğu HUD'dan bağımsızdır: HUD gizliyken de çıkış yolu görünür.
    const shoot = el("button", "ar-photobar__item");
    shoot.type = "button";
    shoot.append(el("kbd", "ar-key", "F"), el("span", "", "Fotoğraf çek"));
    shoot.addEventListener("click", (event) => {
      event.stopPropagation();
      takePhoto();
    });
    const leave = el("button", "ar-photobar__item");
    leave.type = "button";
    leave.append(el("kbd", "ar-key", "E"), el("span", "", "Çık · ESC ya da yürü"));
    leave.addEventListener("click", (event) => {
      event.stopPropagation();
      cover?.exit();
    });
    photobar.append(shoot, leave);
    app.appendChild(photobar);
    // Hareket tuşları da fotoğraf modundan çıkarır.
    for (const code of ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]) {
      input.onAction(code, () => {
        if (cover?.active) cover.exit();
      });
    }
  }

  const takePhoto = () => {
    const link = document.createElement("a");
    link.href = runtime.capture();
    link.download = `audioroom-${meta.id}-kapak.jpg`;
    link.click();
    sfx.cue("ui");
    // Deklanşör: kısa bir beyaz parlama.
    const flash = el("div", "ar-flash");
    app.appendChild(flash);
    window.setTimeout(() => flash.remove(), 600);
  };

  input.onAction("KeyE", () => {
    if (cinema) setCinema(false);
    else if (cover?.active) cover.exit();
    else if (!interaction.use()) world.use?.();
  });
  input.onAction("KeyQ", dropHeld);
  input.onAction("KeyG", toggleCarry);
  // V: klibe dön / serbest dolaş. Klip kapalıysa önce açılır; plak yoksa ne yapılacağı söylenir.
  input.onAction("KeyV", () => {
    if (cover?.active || demo) return;
    if (!active) {
      hud.hint(`Klip için önce bir plağı gramofona tak`, 3);
      return;
    }
    if (!clipsOn) setClips(true);
    setCinema(!cinema);
  });
  input.onAction("KeyK", () => {
    if (!demo) setClips(!clipsOn);
  });
  // T: birinci / üçüncü kişi görünüm.
  input.onAction("KeyT", () => {
    settings.thirdPerson = !settings.thirdPerson;
    saveSettings(settings);
    applyView();
    hud.hint(settings.thirdPerson ? "Üçüncü kişi görünüm · karakterin görünür" : "Birinci kişi görünüm", 3);
  });
  // Yürümek sinemadan çıkarır: klip sürer, kamera oyuncuya döner.
  for (const code of ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"]) {
    input.onAction(code, () => {
      if (cinema) setCinema(false);
    });
  }
  input.onAction("KeyR", () => {
    if (!active) return;
    if (music.state === "blocked") music.resume();
    else music.toggle();
  });
  // F: kapak kadrajında fotoğraf; dolaşırken el feneri.
  input.onAction("KeyF", () => {
    if (cover?.active) takePhoto();
    else if (flashlight && !menu.open) {
      const on = flashlight.toggle();
      sfx.cue("ui");
      hud.hint(on ? `Fener açık · ${key("F")} ile kapat` : "Fener kapalı", 2);
    }
  });

  music.onChange((state) => {
    gramophone.setPlaying(state === "playing");
    sfx.setDuck(state === "playing");
    if (state === "ended" || state === "error") setCinema(false);
    if (state === "ended") hud.hint(`Plak bitti · ${key("R")} ile yeniden çal ya da yeni bir plak bul`, 6);
    if (state === "blocked") hud.hint(`Tarayıcı sesi bekletti · çalmak için ${key("R")} düğmesine bas`, 6);
    if (state === "error") hud.hint("Bu parça burada çalınamadı · müzik kartından YouTube'da açabilirsin", 7);
    if (finalePending && (state === "ended" || state === "error")) {
      finalePending = false;
      runFinale();
    }
  });

  player.onStep((sprinting) => sfx.step(world.surface ?? "sand", sprinting));
  player.onLand(() => sfx.step(world.surface ?? "sand", true));

  // --- Final ---------------------------------------------------------------
  function runFinale() {
    if (finaleShown) return;
    setCinema(false);
    finaleShown = true;
    persist();
    const seconds = world.onFinale?.() ?? 3;
    sfx.cue("finale");
    window.setTimeout(() => {
      pause(false);
      showFinale(app, meta, tracks, {
        demo,
        libraryHref,
        onStay: () => {
          world.onFinaleDone?.();
          void resume();
        },
      });
    }, seconds * 1000);
  }

  // --- Menü, duraklatma, ayarlar -------------------------------------------
  let appliedQuality = settings.quality;
  const applySettings = (next: Settings) => {
    saveSettings(demo ? { ...next, quality: loadSettings().quality } : next);
    if (next.quality !== appliedQuality) {
      appliedQuality = next.quality;
      runtime.setQuality(next.quality);
    }
    if (next.clips !== clipsOn) setClips(next.clips);
    input.sensitivity = next.sensitivity;
    input.invertY = next.invertY;
    music.setVolume(next.musicVolume);
    sfx.setVolume(next.sfxVolume);
    runtime.renderer.toneMappingExposure = baseExposure * next.brightness;
    applyView();
  };

  let touchControls: ReturnType<typeof createTouchControls> | null = null;
  let started = false;

  const menu = createMenu(app, meta, settings, {
    onStart: () => void resume(),
    onSettings: applySettings,
    onReset: () => {
      clearProgress(progressId);
      window.location.reload();
    },
    status: () => {
      const listened = tracks.length === 1 ? (found.size ? "Dinlendi" : "Dinlenmedi") : `Plaklar ${found.size} / ${tracks.length}`;
      return `${listened} · Gizli keşifler ${secrets.found.size} / ${secrets.total}`;
    },
    libraryHref,
    demo,
  });
  menu.setStartEnabled(false, "Yükleniyor…");
  // İlk AudioContext açılışı ~80 ms sürebilir; basma anında başlatılınca bu süre
  // düğme basılıyken geçer ve menünün kapanışı takılmaz.
  app.addEventListener("pointerdown", () => sfx.start(), { once: true });

  async function resume() {
    sfx.start();
    menu.hide();
    runtime.paused = false;
    input.active = true;
    touchControls?.setVisible(true);
    if (demo) {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        // iOS Safari tam ekranı desteklemez; oyun yine çalışır.
      }
    }
    await input.requestLock();
    if (!started) {
      started = true;
      const viewTip = (demo ? "" : " · T: bakış açısı") + (flashlight ? ` · ${key("F")}: fener` : "");
      hud.hint(
        (input.mode === "drag"
          ? "Bakmak için fareyi basılı tutup sürükle · ışık huzmeleri plakları gösterir"
          : demo
            ? "Sol başparmakla yürü, sağda sürükleyerek bak · ışık huzmeleri plakları gösterir"
            : found.size === tracks.length || shelvedAtStart.size === tracks.length
              ? "Plakların gramofonun yanındaki kitaplıkta · istediğini raftan al, gramofona tak."
              : found.size > 0
                ? `${world.startHint ?? "Plakları bul ve gramofona tak."} Çaldığın ${found.size} plak kitaplıkta.`
                : world.startHint ?? "Plakları bul ve gramofona tak.") + viewTip,
        8,
      );
    }
  }

  function pause(showMenu = true) {
    input.active = false;
    input.releaseLock();
    runtime.paused = true;
    touchControls?.setVisible(false);
    if (showMenu) menu.showPause();
  }

  input.onPauseRequest(() => {
    // Fotoğraf modunda ESC önce kadrajdan çıkarır; menü yine açılır ki fare kilidi geri alınabilsin.
    cover?.exit();
    pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && input.active) pause();
  });

  if (demo) {
    // Sade demo yalnızca tablette açılır (telefonda Sürüm 2 kilitli): yatay tutulur.
    app.appendChild(el("div", "ar-rotate", "Tableti yan çevir"));
    touchControls = createTouchControls(
      app,
      input,
      [
        { code: "KeyE", label: "Etkileşim" },
        { code: "Space", label: "Zıpla", hold: true },
        { code: "KeyR", label: "Çal / Durdur" },
        { code: "KeyG", label: "Gramofon" },
        ...(flashlight ? [{ code: "KeyF", label: "Fener" }] : []),
      ],
      () => pause(),
    );
    touchControls.setVisible(false);
  }

  applySettings(settings);
  syncClip();
  hud.setProgress(found.size, tracks.length);
  card.setCollection(tracks, found);
  if (found.size) world.onFound?.(found.size, tracks.length);

  // --- Ana döngü -------------------------------------------------------------
  const gramPosition = new THREE.Vector3();
  const earPosition = new THREE.Vector3();
  runtime.onUpdate((dt, time) => {
    const coverActive = cover?.active ?? false;
    player.update(dt, input, world.ground, colliders);
    world.update(dt, time);
    if (lyrics && active) {
      const line = lyricAt(lyrics, music.progress().time);
      if (line !== lyricShown) {
        lyricShown = line;
        hud.lyric(line);
      }
    }
    records.update(dt, time, camera.position);
    avatar.update(dt, time, player, settings.thirdPerson && !cinema && !coverActive);
    if (gramophone.spot === "carried") {
      // Kucakta: kameranın önünde, göğüs hizasında; yürürken hafifçe sallanır.
      carryBob += dt * player.speed() * 1.6;
      // Kucakta: sağ alt köşede, göğüs hizasının altında; boru ileri bakar, görüşü kapatmaz.
      carryForward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
      carryPoint.copy(player.position).addScaledVector(carryForward, 0.66);
      carryPoint.x += Math.cos(player.yaw) * 0.3;
      carryPoint.z -= Math.sin(player.yaw) * 0.3;
      carryPoint.y = camera.position.y - 1.02 + Math.sin(carryBob) * 0.025;
      gramophone.hold(carryPoint, player.yaw + CARRY_YAW + Math.sin(carryBob * 0.5) * 0.04);
    }
    looseCollider.enabled = gramophone.spot === "ground";
    if (looseCollider.enabled) {
      gramophone.basePosition(carryPoint);
      looseCollider.x = carryPoint.x;
      looseCollider.z = carryPoint.z;
    }
    gramophone.worldPosition(gramPosition);
    earPosition.copy(player.position).y += player.options.eyeHeight;
    const distance = gramPosition.distanceTo(cinema || coverActive ? earPosition : camera.position);
    gramophone.setInviting(Boolean(records.held) && distance < 12);
    // Elde plak varken gramofonun altın huzmesi yanar; yakına gelince söner.
    gramophone.setBeacon(records.held && !coverActive ? THREE.MathUtils.clamp((distance - 4) / 10, 0.2, 1) : 0);
    gramophone.update(dt, time);
    music.setGain(distanceGain(distance));
    if (!cover?.update(dt, camera, time)) {
      player.applyCamera(camera, dt, settings.headBob, settings.fov, settings.thirdPerson, world.ground);
      // Sinema: yönetmenin karesi ile oyuncu kamerası arasında yumuşak geçiş; çekimler arası kesmedir.
      if (cinema || cinemaBlend > 0) {
        const shots = clipShots();
        if (shots && frameAt(shots, music.progress().time, time, cinemaFrame)) {
          cinemaFramed = true;
          // Kamera asla zeminin altına inmez (bilinçli yer altı çekimleri hariç): görüntü toprağın içinden olmasın.
          if (!cinemaFrame.underground && logic) {
            const floor = logic.ground(cinemaFrame.position.x, cinemaFrame.position.z) + 0.35;
            if (cinemaFrame.position.y < floor) cinemaFrame.position.y = floor;
          }
        }
        else if (cinema) setCinema(false);
        cinemaBlend = cinema && cinemaFramed ? Math.min(1, cinemaBlend + dt / 1.4) : Math.max(0, cinemaBlend - dt / 0.8);
        if (cinemaBlend <= 0) cinemaFramed = false;
        if (cinemaFramed && cinemaBlend > 0) {
          const k = cinemaBlend * cinemaBlend * (3 - 2 * cinemaBlend);
          playerPose.position.copy(camera.position);
          playerPose.quaternion.copy(camera.quaternion);
          playerPose.fov = camera.fov;
          cinemaMatrix.lookAt(cinemaFrame.position, cinemaFrame.target, camera.up);
          cinemaQuat.setFromRotationMatrix(cinemaMatrix);
          if (cinemaFrame.roll) cinemaQuat.multiply(cinemaRoll.setFromAxisAngle(zAxis, cinemaFrame.roll));
          camera.position.lerpVectors(playerPose.position, cinemaFrame.position, k);
          camera.quaternion.slerpQuaternions(playerPose.quaternion, cinemaQuat, k);
          camera.fov = THREE.MathUtils.lerp(playerPose.fov, cinemaFrame.fov, k);
          camera.updateProjectionMatrix();
        }
        applyClipGrade(cinemaFramed ? cinemaBlend * cinemaBlend * (3 - 2 * cinemaBlend) : 0);
        adaptEye(dt, cinemaFramed && cinemaBlend > 0.5);
      } else {
        applyClipGrade(0);
        adaptEye(dt, false);
      }
      updateFilmCard();
      world.afterCamera?.(camera, dt, time);
    }
    if (devCamera.frame) {
      camera.position.copy(devCamera.frame.position);
      camera.lookAt(devCamera.frame.target);
      if (devCamera.frame.roll) camera.rotateZ(devCamera.frame.roll);
      camera.fov = devCamera.frame.fov;
      camera.updateProjectionMatrix();
    }
    // Fener kameranın son yerini izler; klip kamerası ve kapak kadrajında söner.
    if (flashlight) {
      chestPoint.copy(player.position).y += player.options.eyeHeight - 0.35;
      flashlight.update(camera, dt, !coverActive && !cinema && cinemaBlend < 0.3, settings.thirdPerson ? chestPoint : undefined);
    }
    eyePoint.copy(player.position).y += player.options.eyeHeight;
    hud.setPrompt(coverActive || cinema || menu.open ? null : (interaction.update(camera, settings.thirdPerson ? eyePoint : undefined) ?? world.prompt?.() ?? null));
    // Elde plak varken gramofon ekranda işaretlenir (yakınken gereksiz, gizlenir);
    // yoksa dünyanın kendi hedefi (varsa) gösterilir.
    const objective = !records.held && !coverActive && !cinema ? world.objective?.() : null;
    if (objective) marker.update(objective.position, camera, objective.label);
    else marker.update(records.held && !coverActive && !cinema && distance > 3.5 ? gramPosition : null, camera, "Gramofon");
  });

  // Yalnızca geliştirme sunucusunda: otomatik testlerin oyunu sürebilmesi için.
  if (import.meta.env.DEV) {
    Object.assign(window, { __audioroom: { ctx, world, player, records, gramophone, music, pickUp, hud, runFinale, THREE, devCamera } });
  }

  player.applyCamera(camera, 0, false, settings.fov, settings.thirdPerson, world.ground);
  // Dünyanın tüm malzemeleri yükleme ekranındayken derlenir (ilk karelerde takılma olmaz).
  await runtime.precompile();
  runtime.paused = true;
  runtime.start();
  loading.done();
  menu.setStartEnabled(true, demo ? "Demoyu başlat" : "Evrene gir");
}
