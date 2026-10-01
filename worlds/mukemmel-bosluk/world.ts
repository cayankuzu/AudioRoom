import * as THREE from "three";
import type { Shot } from "../../engine/game/director";
import { createText3D } from "../../engine/core/text3d";
import { yawTowards } from "../../engine/core/player";
import { approach } from "../../engine/fx/fade";
import { createParticles } from "../../engine/fx/particles";
import { createSongStage } from "../../engine/game/songStage";
import type { WorldDefinition, WorldLogic } from "../../engine/world";
import { ALBUM } from "./album";
import { BASE_MOMENT, MOMENTS, MomentBlender } from "./moments";
import { createSky } from "./sky";
import { firstMesh, loadModels } from "../../engine/core/models";
import { createSongScenes, songModelNames } from "./songs";
import { createEffects, GRAMOPHONE } from "./songs/kit";
import { craterHeight, createRocks, createTerrain, WORLD_RADIUS } from "./terrain";
import { chooseDeskSpot, createQuiz, QUIZ_MODELS } from "./quiz";
import { loadCharacterLibrary } from "../../engine/fx/character";
import { createRoaches } from "./roaches";

const START = { x: 4, z: 82 };
const COVER_STAND = { x: 0, z: 64 };
const BASE_GRAVITY = 16;
const FIGURE_HEIGHT = 22;
/** Kapaktaki gibi: figürün ayakları ufuk çizgisinin belirgin biçimde üstünde. */
const FIGURE_BASE_Y = 22;

export const world: WorldDefinition = {
  ...ALBUM,
  plinth: "stone",
  // Kapaktaki gibi karanlık bir krater: oyuncu F ile el fenerini yakabilir.
  flashlight: true,
  player: { start: START, lookAt: { x: 0, z: 0 }, walkSpeed: 4.8, sprintSpeed: 8.6, jumpSpeed: 5.6 },

  async build(ctx): Promise<WorldLogic> {
    const { scene, runtime, records, gramophone, colliders, player, random, demo } = ctx;
    const detail = runtime.profile.detail;

    // Kapak: aşırı pozlanmış beyaz gök, simsiyah krater. Neutral tonlama beyazı beyaz,
    // siyahı siyah bırakır; bloom yalnızca ateş ve ışıklarda (eşik göğün üstünde).
    runtime.renderer.toneMapping = THREE.NeutralToneMapping;
    runtime.renderer.toneMappingExposure = 1;
    runtime.setBloom(0.45, 1.35, 0.5);
    runtime.grade.uVignette.value = 0.24;
    runtime.grade.uGrain.value = 0.03;
    runtime.grade.uContrast.value = 1.12;
    ctx.sfx.setAmbience("wind", 1);

    const sky = createSky();
    scene.add(sky.mesh);
    // Gündüz istegi (film): kapaktaki beyaz gök ve temiz hava; yalnız ışık seviyesi yükselir.
    const DAY_SKY_TOP = new THREE.Color(BASE_MOMENT.skyTop);
    const DAY_SKY_HORIZON = new THREE.Color(BASE_MOMENT.skyHorizon);
    const DAY_FOG = new THREE.Color(BASE_MOMENT.fog);
    const fog = new THREE.FogExp2(BASE_MOMENT.fog, BASE_MOMENT.fogDensity);
    scene.fog = fog;

    const hemi = new THREE.HemisphereLight("#ffffff", "#141416", BASE_MOMENT.hemi);
    const sun = new THREE.DirectionalLight("#fbfaf6", BASE_MOMENT.sun);
    sun.position.set(-30, 110, -140);
    sun.target.position.set(0, 0, 10);
    sun.shadow.camera.left = -120;
    sun.shadow.camera.right = 120;
    sun.shadow.camera.top = 120;
    sun.shadow.camera.bottom = -120;
    sun.shadow.camera.far = 420;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    scene.add(hemi, sun, sun.target);
    runtime.onQualityChange((profile) => {
      sun.castShadow = profile.shadows;
      sun.shadow.mapSize.setScalar(profile.shadowMapSize);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    });

    // Paylaşılan sahne ışıkları (sayı sabit kalır, shader'lar yeniden derlenmez).
    const lights = [new THREE.PointLight("#ffffff", 0, 30, 1.4), new THREE.PointLight("#ffffff", 0, 30, 1.4)];
    scene.add(...lights);

    const terrain = createTerrain();
    scene.add(terrain);
    // Oyuncu figürleri gerçek insansı rigi giysin (CC0 manken, 46 animasyon).
    await loadCharacterLibrary(ctx.assets);
    // Hazır modeller (Poly Haven, CC0): taranmış ay kayaları ve şarkı sahnelerinin gerçek eşyaları.
    const ROCKS = ["moon_rock_01", "moon_rock_03", "moon_rock_06"];
    const models = await loadModels(ctx.assets, [...ROCKS, ...QUIZ_MODELS, ...songModelNames(demo ? ALBUM.demoTracks : undefined)]);
    const deskSpot = chooseDeskSpot(random);
    const boulderMeshes = ROCKS.map((name) => firstMesh(models.get(name))).filter((mesh): mesh is THREE.Mesh => mesh !== null);
    const rocks = createRocks(random, detail, [
      { x: START.x, z: START.z, r: 14 },
      { x: COVER_STAND.x, z: COVER_STAND.z, r: 10 },
      { x: GRAMOPHONE.x, z: GRAMOPHONE.z, r: 7 },
      { x: 0, z: 0, r: 10 },
      { x: 0, z: 46, r: 18 },
      { x: deskSpot.x, z: deskSpot.z, r: 5 },
    ], boulderMeshes);
    scene.add(rocks.group);
    for (const b of rocks.boulders) colliders.addCircle(b.x, b.z, b.r);
    colliders.setBounds({ type: "circle", cx: 0, cz: 0, r: WORLD_RADIUS });
    // Hamam böceği sürüsü: klip çalarken kraterde dolaşır (Kafakafka'nın böceği yalnız değil).
    const roaches = createRoaches(scene, random, 14);
    // Sınav kürsüsü: kraterin girişinde bir okul sırası (yeri her girişte değişir).
    const quiz = createQuiz(ctx, models, deskSpot);

    // Dev figür: kapaktaki gibi havada, simsiyah bir silüet; hep kapağın bakış yönüne döner.
    const figure = new THREE.Group();
    const gltf = await ctx.assets.gltf("models/redd-figure.glb");
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.scale.setScalar(FIGURE_HEIGHT / size.y);
    box.setFromObject(model);
    model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    const silhouette = new THREE.MeshBasicMaterial({ color: "#000000", fog: false });
    model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.material = silhouette;
        mesh.castShadow = true;
      }
    });
    figure.add(model);
    figure.position.set(0, FIGURE_BASE_Y, 0);
    scene.add(figure);

    // Kapak tipografisi. Başlık gökte, ufkun hemen üstünde (uzakta olduğu için her yerden
    // aynı açıyla okunur); kırmızı REDD kraterin iç yamacında ayakta duran dev harfler.
    const redd = { font: "cinzel-400", size: 6, depth: 1.4, color: "#b3141d", sideColor: "#4a070b", emissive: 0.45, anchorY: "bottom" as const, align: "left" as const };
    const heading = { font: "cinzel-400", size: 17, depth: 2.5, letterSpacing: 0.62, color: "#1c1c1f", fog: false, align: "left" as const };
    const [head, tail, ring, ...letters] = await Promise.all([
      createText3D("MÜKEMMEL B", heading),
      createText3D("ŞLUK", heading),
      createText3D("O", heading),
      ...["R", "E", "D", "D"].map((letter) => createText3D(letter, redd)),
    ]);
    // Başlık: kapaktaki gibi BOŞLUK'un O'su fırçayla çizilmiş, bir yanı açık bir enso çemberi.
    const title = new THREE.Group();
    const spacing = heading.letterSpacing * heading.size;
    const headWidth = head.geometry.boundingBox!.max.x;
    // Enso, gerçek "O" harfinin ölçüsünde ve hizasında (harf sahneye eklenmez, yalnızca ölçü verir).
    const ringBox = ring.geometry.boundingBox!;
    const ensoRadius = (ringBox.max.y - ringBox.min.y) / 2;
    const ensoX = headWidth + spacing + ensoRadius;
    tail.position.x = ensoX + ensoRadius + spacing;
    const ensoCurve = new THREE.EllipseCurve(0, 0, ensoRadius, ensoRadius * 1.04, Math.PI * 0.42, Math.PI * 0.42 + Math.PI * 1.86, false, 0);
    const ensoPoints = ensoCurve.getPoints(80).map((p) => new THREE.Vector3(p.x, p.y, 0));
    const ensoPath = new THREE.CatmullRomCurve3(ensoPoints);
    const ensoGeometry = new THREE.TubeGeometry(ensoPath, 120, 1, 10);
    const ensoPos = ensoGeometry.getAttribute("position") as THREE.BufferAttribute;
    const ensoCenter = new THREE.Vector3();
    const ensoPoint = new THREE.Vector3();
    for (let v = 0; v < ensoPos.count; v += 1) {
      const t = Math.floor(v / 11) / 120;
      ensoPath.getPointAt(t, ensoCenter);
      // Fırça: başta dolgun, sona doğru incelip kuruyan bir darbe.
      const brush = heading.size * (0.075 - 0.05 * t) * (0.8 + 0.2 * Math.sin(t * 9));
      ensoPoint.fromBufferAttribute(ensoPos, v).sub(ensoCenter).multiplyScalar(brush);
      ensoPos.setXYZ(v, ensoCenter.x + ensoPoint.x, ensoCenter.y + ensoPoint.y, ensoCenter.z + ensoPoint.z * 1.4);
    }
    ensoGeometry.computeVertexNormals();
    const enso = new THREE.Mesh(ensoGeometry, new THREE.MeshStandardMaterial({ color: heading.color, roughness: 0.8, fog: false }));
    enso.position.set(ensoX, (ringBox.max.y + ringBox.min.y) / 2, 0);
    ring.geometry.dispose();
    title.add(head, enso, tail);
    const titleWidth = tail.position.x + tail.geometry.boundingBox!.max.x;
    title.position.set(-titleWidth / 2, 60, -515);
    // Filmler kapağın yazılarını gizleyebilsin (klipte ekranda yazı yok).
    title.userData.coverText = true;
    scene.add(title);
    // REDD: kapaktaki gibi kraterin yamacında, her harf kendi zeminine oturur (gömülmez), yamaca
    // hafifçe yaslanır. Gölgesi kapalı: gölgeler kameraya doğru düşüp harfin altında koyu bir
    // "yansıma" gibi görünüyordu. Harfler katı: içinden geçilmez.
    const gap = 0.5 * redd.size;
    const widths = letters.map((letter) => {
      letter.geometry.computeBoundingBox();
      return letter.geometry.boundingBox!.max.x - letter.geometry.boundingBox!.min.x;
    });
    const total = widths.reduce((sum, w) => sum + w, 0) + gap * (letters.length - 1);
    let cursor = -total / 2;
    // Tek taban çizgisi: kelimenin altındaki en yüksek zemin noktası (hiçbir harf toprağa batmaz).
    let floor = -Infinity;
    for (let k = 0; k <= 24; k += 1) floor = Math.max(floor, craterHeight(cursor + (total * k) / 24, -30));
    letters.forEach((letter, i) => {
      const x = cursor - letter.geometry.boundingBox!.min.x;
      const mid = cursor + widths[i] / 2;
      letter.position.set(x, floor - 0.15, -30);
      letter.rotation.x = -0.12;
      letter.castShadow = false;
      letter.userData.coverText = true;
      scene.add(letter);
      colliders.addCircle(mid, -30, widths[i] / 2 + 0.3);
      cursor += widths[i] + gap;
    });

    // Toz / kül / yıldız tozu — anlara göre değişen tek parçacık alanı.
    const dust = createParticles({
      count: Math.round(500 + 1300 * detail),
      box: new THREE.Vector3(70, 34, 70),
      size: 0.12,
      color: BASE_MOMENT.dust.color,
      opacity: BASE_MOMENT.dust.opacity,
    });
    scene.add(dust.points);

    gramophone.place(GRAMOPHONE.x, craterHeight(GRAMOPHONE.x, GRAMOPHONE.z), GRAMOPHONE.z, yawTowards(GRAMOPHONE.x, GRAMOPHONE.z, START.x, START.z) + Math.PI, 1.4);
    gramophone.setBeaconStyle("#7a1016", false);
    colliders.addCircle(GRAMOPHONE.x, GRAMOPHONE.z, 1.4);

    // Şarkı sahneleri: her parça kendi set parçası ve etkileşimiyle.
    const effects = createEffects();
    let coverLook = 0;
    let coverLookTarget = 0;
    const songs = await createSongScenes(
      {
        scene,
        camera: ctx.camera,
        player,
        sfx: ctx.sfx,
        hud: ctx.hud,
        random,
        colliders,
        secrets: ctx.secrets,
        terrain: terrain.material as THREE.MeshStandardMaterial,
        lights,
        effects,
        cinema: () => ctx.cinema,
        models,
        renderer: runtime.renderer,
        moonDirection: sky.moonDirection,
      },
      demo ? ALBUM.demoTracks : undefined,
    );
    const stage = createSongStage(scene, ctx.interaction, ctx.hud, songs.scenes);
    await stage.warmup(() => runtime.precompile());
    // Kalite kademesi değişince (ör. gölgeler kapanınca) shader'lar yeniden derlenir; önceden yap.
    let warmedTier = runtime.profile.tier;
    runtime.onQualityChange((profile) => {
      if (profile.tier === warmedTier) return;
      warmedTier = profile.tier;
      void stage.warmup(() => runtime.precompile());
    });

    // Plaklar: her oturumda rastgele yerlere; sıra yok.
    records.setBeaconStyle("#c8212c", false);
    const spots: Array<{ x: number; z: number }> = [];
    const minRadius = demo ? 14 : 14;
    const maxRadius = demo ? 55 : 125;
    // Boşlukta asılı plaklar: dördü yerde, gerisi kademe kademe havada. Her dinlenen plak yerçekimini azaltıp
    // zıplamayı yükselttiği için yüksektekilere ancak dinledikçe ulaşılır (4 yerde → 3 × 2.8 m → 3 × 4.2 m → 2 × 5.5 m;
    // her kademe bir öncekiler dinlenince erişilebilir olacak şekilde hesaplandı).
    const HOVER_TIERS = [0, 0, 0, 0, 2.8, 2.8, 2.8, 4.2, 4.2, 4.2, 5.5, 5.5];
    let tierIndex = ctx.found.size;
    for (const record of records.list) {
      if (ctx.startShelved.has(record.track.id)) {
        records.collect(record);
        continue;
      }
      record.hover = demo ? 0 : HOVER_TIERS[Math.min(HOVER_TIERS.length - 1, tierIndex++)];
      for (let attempt = 0; attempt < 400; attempt += 1) {
        const angle = random() * Math.PI * 2;
        const radius = minRadius + random() * (maxRadius - minRadius);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius + (demo ? 40 : 0);
        const clear = spots.every((s) => Math.hypot(s.x - x, s.z - z) > (demo ? 12 : 17));
        if (clear && colliders.isFree(x, z, 2) && Math.hypot(x - GRAMOPHONE.x, z - GRAMOPHONE.z) > 12) {
          spots.push({ x, z });
          records.drop(record, x, craterHeight(x, z), z);
          break;
        }
      }
    }


    const blender = new MomentBlender();
    let progressScale = 1;
    let hoverHintAt = -100;
    let finaleTime = -1;
    let finaleFromY = 0;
    let dustLevel = 1;
    const tint = runtime.grade.uTint.value;

    const sortedShots = new Map<string, Shot[]>();
    const logic: WorldLogic = {
      ground: craterHeight,
      debug: { quiz },
      surface: "sand",
      startHint: "Kırmızı ışık huzmeleri plakları gösterir. Gramofon hemen önünde, taş kaidede.",
      // Kapak kadrajı: fotoğraf sırtın üstünden çukura bakar; uzak sırt çizgisi karenin ortasında, REDD karşı yamaçta,
      // figür yukarıda. Kapağa bakarken evren kapağın kontrastına çekilir (koyu zemin, beyaz gök), çıkınca normale döner.
      coverPoint: {
        stand: COVER_STAND,
        camera: {
          position: new THREE.Vector3(0, craterHeight(0, 88) + 4, 88),
          target: new THREE.Vector3(0, 13, -20),
          fov: 46,
        },
        onEnter: () => {
          coverLookTarget = 1;
        },
        onExit: () => {
          coverLookTarget = 0;
        },
      },
      prompt: () => stage.prompt(),
      // Çekimler zamana göre sıralı verilir (sahneler ek çekimleri listenin sonuna ekleyebilir).
      // Yazısız filmler (sahibin kuralı): klibin başında ve sonunda şarkı adı kartı çıkmaz.
      filmCard: (trackId) => trackId !== "kaniyorduk" && trackId !== "kalpsiz-romantik",
      shots: (trackId) => {
        const list = songs.scenes[trackId]?.shots;
        if (!list) return null;
        let sorted = sortedShots.get(trackId);
        if (!sorted) {
          sorted = [...list].sort((a, b) => a.at - b.at);
          sortedShots.set(trackId, sorted);
        }
        return sorted;
      },
      use: () => stage.use(),
      onTrack(track) {
        blender.target = (track && MOMENTS[track.id]) || BASE_MOMENT;
        Object.assign(effects, createEffects());
        stage.play(track?.id ?? null);
      },
      onPickup(picked) {
        // Alınan plak artık asılı değildir: bir yere bırakılırsa yere konur.
        picked.hover = 0;
      },
      onFound(count, total) {
        // Hafifleme: tüm plaklar dinlendiğinde yerçekimi üçte birine iner.
        progressScale = 1 - 0.66 * (count / total);
        player.options.jumpSpeed = 5.6 * (1 + 0.35 * (count / total));
      },
      afterCamera(camera, dt) {
        // Sarsıntı ve eğilme: sahnelerin kamera etkileri (sarsıntı söner).
        if (effects.shake > 0.001) {
          camera.position.x += (Math.random() - 0.5) * effects.shake;
          camera.position.y += (Math.random() - 0.5) * effects.shake;
          effects.shake = Math.max(0, effects.shake - dt * 0.6);
        }
        camera.rotation.z += effects.roll;
      },
      onFinale() {
        finaleTime = 0;
        finaleFromY = player.position.y;
        player.frozen = true;
        return 11;
      },
      update(dt, time) {
        quiz.update(dt, time);
        // Hamam böcekleri yalnız Kafakafka klibinde (Kafka göndermesi oraya ait).
        roaches.update(dt, time, ctx.music.state === "playing" && ctx.songTime() >= 0 && ctx.music.track?.id === "kafakafka", player.position);
        // Asılı plaklar yalnızca göz hizası yeterince yakınken (zıplayınca) alınabilir.
        for (const record of records.list) {
          if (record.state !== "world" || record.hover <= 0) continue;
          const y = record.group.position.y + record.hover + 0.3;
          // Göz hizası oyuncudan ölçülür (üçüncü kişide kamera daha yüksekte ve geridedir).
          const eyeY = player.position.y + player.options.eyeHeight;
          const reach = Math.abs(eyeY - y) < 1.1;
          record.pickable = reach;
          const near = Math.hypot(record.group.position.x - player.position.x, record.group.position.z - player.position.z) < 3.5;
          if (near && !reach && time - hoverHintAt > 12) {
            hoverHintAt = time;
            // Şimdiki yerçekimi ve zıplamayla göz en fazla nereye çıkar?
            const jump = (player.options.jumpSpeed * player.options.jumpSpeed) / (2 * Math.max(1, player.options.gravity));
            const reachable = player.options.eyeHeight + jump + 1.1 > record.hover + 0.3;
            ctx.hud.hint(reachable ? "Plak boşlukta asılı — zıpla (Space) ve havadayken al." : "Bu plak çok yüksekte. Her dinlediğin plak seni hafifletir — önce başka plaklar dinle.", 4);
          }
        }
        blender.update(dt);
        const v = blender.values;
        sky.top.copy(blender.colors.skyTop);
        sky.horizon.copy(blender.colors.skyHorizon);
        sky.intensity.value = v.skyIntensity;
        sky.stars.value = v.stars;
        sky.moon.value = v.moon;
        sky.crack.value = Math.max(v.crack, effects.crack);
        sky.time.value = time;
        sky.mesh.position.copy(ctx.camera.position);
        sky.moonFull.value = effects.moonFull;
        sky.crescent.value = effects.crescent;
        sky.nebula.value = v.nebula;
        sky.nebulaA.copy(blender.colors.nebulaA);
        sky.nebulaB.copy(blender.colors.nebulaB);
        fog.color.copy(blender.colors.fog);
        fog.density = v.fogDensity * effects.fog;
        hemi.intensity = v.hemi;
        sun.intensity = v.sun;
        // Gündüz (sahne isteği): gök ve sis gün ışığına döner, yıldızlar söner, güneş güçlenir.
        const day = THREE.MathUtils.clamp(effects.daylight, 0, 1);
        if (day > 0) {
          sky.top.lerp(DAY_SKY_TOP, day);
          sky.horizon.lerp(DAY_SKY_HORIZON, day);
          sky.intensity.value = THREE.MathUtils.lerp(v.skyIntensity, BASE_MOMENT.skyIntensity, day);
          sky.stars.value = v.stars * (1 - day);
          sky.moon.value = v.moon * (1 - day * 0.85);
          sky.nebula.value = v.nebula * (1 - day);
          fog.color.lerp(DAY_FOG, day);
          fog.density = THREE.MathUtils.lerp(v.fogDensity, BASE_MOMENT.fogDensity, day) * effects.fog;
          hemi.intensity = THREE.MathUtils.lerp(v.hemi, 1.25, day);
          sun.intensity = THREE.MathUtils.lerp(v.sun, 2.0, day);
        }
        // Kapağa bakış: siyah-beyaz fotoğrafın kontrastı (koyu zemin, temiz hava, düşük doygunluk).
        coverLook = approach(coverLook, coverLookTarget, 1.6, dt);
        hemi.intensity *= THREE.MathUtils.lerp(1, 0.78, coverLook);
        sun.intensity *= THREE.MathUtils.lerp(1, 0.9, coverLook);
        fog.density *= THREE.MathUtils.lerp(1, 0.55, coverLook);
        runtime.grade.uContrast.value = THREE.MathUtils.lerp(1.12, 1.34, coverLook);
        // Uzay ve yukarıdan aydınlatma (film yükselişi): kubbe boşluk olur, kara parçası okunur.
        sky.space.value = THREE.MathUtils.clamp(effects.space, 0, 1);
        hemi.intensity += 2.4 * effects.groundLight;
        sun.intensity += 1.8 * effects.groundLight;
        tint.copy(blender.colors.tint);
        // Sahnelerin anlık etkileri: doygunluk, kararma, yürüme hızı.
        runtime.grade.uSaturation.value = v.saturation * effects.saturation * THREE.MathUtils.lerp(1, 0.5, coverLook);
        runtime.grade.uExposure.value = approach(runtime.grade.uExposure.value, 1 - THREE.MathUtils.clamp(effects.dim, -0.4, 0.9), 4, dt);
        player.speedScale = effects.speed;
        songs.setSky?.(blender.colors.skyTop, blender.colors.skyHorizon);

        const frozen = blender.target.figure === "freeze" && !effects.timeBroken;
        dustLevel = approach(dustLevel, effects.dust, 0.6, dt);
        dust.velocity.copy(blender.dust.velocity);
        dust.turbulence = frozen ? 0 : blender.dust.turbulence;
        dust.opacity = blender.dust.opacity * dustLevel;
        dust.size = blender.dust.size;
        dust.color.copy(blender.colors.dust);
        dust.update(frozen ? 0 : dt, ctx.camera.position);

        player.options.gravity = BASE_GRAVITY * progressScale * v.gravity * effects.gravity;

        // Figür: süzülme, dans ya da zamanın durduğu an. Dönmez; kapaktaki gibi hep önüne bakar.
        if (!frozen) {
          const dance = blender.target.figure === "dance";
          const bob = dance ? Math.sin(time * 2.4) * 1.4 : Math.sin(time * 0.35) * 0.7;
          figure.position.y = approach(figure.position.y, FIGURE_BASE_Y + bob + effects.figureLift + (finaleTime >= 0 ? -3 : 0), 1.5, dt);
          figure.rotation.y = approach(figure.rotation.y, dance ? Math.sin(time * 1.1) * 0.5 : 0, 2, dt);
          figure.rotation.z = approach(figure.rotation.z, dance ? Math.sin(time * 1.2) * 0.12 : 0, 2, dt);
        }

        for (const light of lights) light.intensity = 0;
        stage.update(dt, time, ctx.songTime());

        // Final: oyuncu figürün yanına süzülerek yükselir.
        if (finaleTime >= 0 && finaleTime < 11) {
          finaleTime += dt;
          const k = Math.min(1, finaleTime / 10);
          const ease = k * k * (3 - 2 * k);
          player.position.y = finaleFromY + ease * (FIGURE_BASE_Y + 12 - finaleFromY);
          player.velocity.set(0, 0, 0);
          player.yaw = approach(player.yaw, yawTowards(player.position.x, player.position.z, 0, 0), 1.2, dt);
          player.pitch = approach(player.pitch, 0.05, 1.2, dt);
          if (finaleTime >= 11) player.frozen = false;
        }
      },
    };
    // Yalnızca geliştirmede: otomatik turlar sahnelerin etkileşimlerini doğrudan tetikleyebilsin.
    if (import.meta.env.DEV) Object.assign(logic, { songs });
    return logic;
  },
};
