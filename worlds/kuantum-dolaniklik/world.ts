import * as THREE from "three";
import { yawTowards } from "../../engine/core/player";
import { createText3D } from "../../engine/core/text3d";
import { approach } from "../../engine/fx/fade";
import { glowSprite } from "../../engine/fx/glow";
import { createParticles } from "../../engine/fx/particles";
import type { Shot } from "../../engine/game/director";
import { createTimeline } from "../../engine/game/timeline";
import { createEmitter } from "../../engine/fx/emitter";
import { VOID } from "./pairActors";
import type { WorldDefinition, WorldLogic } from "../../engine/world";
import { ALBUM } from "./album";
import { loadModels } from "../../engine/core/models";
import { createQuiz, QUIZ_MODELS } from "./quiz";
import { createPairActors } from "./pairActors";
import { loadCharacterLibrary } from "../../engine/fx/character";
import { createMural, createRoom, HALF, HEIGHT, INK, toonGradient } from "./room";
import { STORY } from "./story";
import { createMotes } from "../../engine/fx/sceneProps";

const START = { x: 0, z: 20 };
const GRAM = { x: 15, z: -12 };
/** Plak, oyuncunun odanın merkezine göre aynası (nokta yansıması). */
const mirror = (x: number, z: number) => ({ x: -x, z: -z });
const flat = () => 0;
/** Ay: odanın kuzeybatısında asılı; karanlık yüzü köşeye bakar. */
const MOON = new THREE.Vector3(-17, 13, -17);
/** Gülüşün sağ ucundaki gamze (duvardaki halat gülümsemesinin yanı). */
const DIMPLE = new THREE.Vector3(6.4, 11.4, -HALF + 0.9);

/** İki nokta arasına gerilen ince silindir (tasma, bağ). */
function stretch(mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3): void {
  const length = from.distanceTo(to);
  mesh.position.copy(from).lerp(to, 0.5);
  mesh.scale.set(1, Math.max(0.001, length), 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
}

export const world: WorldDefinition = {
  ...ALBUM,
  plinth: "wood",
  player: { start: START, lookAt: { x: 0, z: -HALF }, walkSpeed: 5, sprintSpeed: 8.5 },

  async build(ctx): Promise<WorldLogic> {
    const { scene, runtime, records, gramophone, colliders, player, random, music, sfx, hud, secrets, interaction } = ctx;
    runtime.renderer.toneMapping = THREE.NeutralToneMapping;
    runtime.renderer.toneMappingExposure = 1.0;
    runtime.grade.uVignette.value = 0.16;
    runtime.grade.uGrain.value = 0.045;
    runtime.grade.uContrast.value = 1.04;
    runtime.setBloom(0.3, 1.1, 0.4);
    sfx.setAmbience("room", 1);
    records.beacons = false;

    scene.background = new THREE.Color("#f3c012");
    scene.add(createRoom(random));
    colliders.setBounds({ type: "box", halfX: HALF - 1, halfZ: HALF - 1 });
    const ambient = new THREE.HemisphereLight("#fff6d6", "#b58a08", 1.6);
    const key = new THREE.DirectionalLight("#fff3cc", 1.4);
    key.position.set(10, HEIGHT - 2, 18);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.camera.left = key.shadow.camera.bottom = -HALF;
    key.shadow.camera.right = key.shadow.camera.top = HALF;
    key.shadow.bias = -0.0005;
    runtime.onQualityChange((profile) => {
      key.castShadow = profile.shadows;
      key.shadow.mapSize.setScalar(profile.shadowMapSize);
      key.shadow.map?.dispose();
      key.shadow.map = null;
    });
    scene.add(ambient, key, key.target);

    const mural = createMural();
    scene.add(mural.group);
    const ink = new THREE.MeshToonMaterial({ color: INK, gradientMap: toonGradient() });
    await loadCharacterLibrary(ctx.assets);
    const models = await loadModels(ctx.assets, QUIZ_MODELS);
    // Sınav kürsüsü: mürekkep çizgili bir okul sırası (yeri her girişte değişir).
    const quiz = createQuiz(ctx, models);

    // Künye duvarın sol alt köşesinde, bir imza gibi.
    const [title, artist] = await Promise.all([
      createText3D("KUANTUM DOLANIKLIK", { font: "cormorant-500", size: 1.1, depth: 0.12, letterSpacing: 0.3, color: INK, align: "left" }),
      createText3D("Henry the Lee · 2023", { font: "cormorant-500", size: 0.75, depth: 0.08, letterSpacing: 0.1, color: INK, align: "left" }),
    ]);
    // Künye batı duvarında: kuzey duvarı kapaktaki gibi yalnızca yüz ve sarı kalır.
    title.position.set(-HALF + 0.12, 2.4, 8);
    artist.position.set(-HALF + 0.1, 1.35, 8);
    title.rotation.y = artist.rotation.y = Math.PI / 2;
    scene.add(title, artist);

    // Mürekkep lekeleri: odada süzülen küçük siyah zerreler.
    const specks = createParticles({
      count: Math.round(200 + 400 * runtime.profile.detail),
      box: new THREE.Vector3(56, 24, 56),
      size: 0.14,
      color: INK,
      opacity: 0.5,
    });
    specks.velocity.set(0.05, 0.02, 0);
    scene.add(specks.points);

    // Gramofon ve onun "karşı noktası" (oyuncunun durması gereken yer).
    gramophone.place(GRAM.x, 0, GRAM.z, yawTowards(GRAM.x, GRAM.z, 0, 0) + Math.PI, 1.4);
    gramophone.setBeaconStyle(INK, false);
    colliders.addCircle(GRAM.x, GRAM.z, 1.3);
    // Gramofon taşınabilir: karşı nokta ve tasma, gramofonun o anki yerini izler.
    const gramBase = new THREE.Vector3(GRAM.x, 0, GRAM.z);
    const target = mirror(GRAM.x, GRAM.z);
    const followGramophone = () => {
      gramophone.basePosition(gramBase);
      const next = mirror(gramBase.x, gramBase.z);
      target.x = next.x;
      target.z = next.z;
      marker.position.set(target.x, 0.03, target.z);
      gramPoint.set(gramBase.x, gramophone.spot === "carried" ? gramBase.y + 0.2 : 1.2, gramBase.z);
    };
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.35, 48),
      new THREE.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.55 }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(target.x, 0.03, target.z);
    // Buluşma noktası: odanın tam ortasında ikizinle buluşacağın mürekkep halka.
    const meeting = marker.clone();
    meeting.position.set(0, 0.03, 0);
    scene.add(marker, meeting);

    // Tek plak, oyuncunun dolanık ikizinin elinde: odanın öbür ucunda seni ayna gibi taklit eden
    // mürekkep bir figür, plağı başının üstünde taşır. Aradaki ip bileğinden onun eline uzanır.
    const record = records.list[0];
    record.pickable = false;
    record.hover = 3.1;
    record.display.scale.multiplyScalar(1.45);
    const twin = new THREE.Group();
    const twinBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.95, 6, 14), ink);
    twinBody.position.y = 1.05;
    const twinHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 14), ink);
    twinHead.position.y = 1.95;
    twin.add(twinBody, twinHead);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.7, 4, 8), ink);
      arm.position.set(side * 0.36, 1.95, 0.05);
      arm.rotation.z = side * -0.35;
      twin.add(arm);
    }
    twin.traverse((child) => (child.castShadow = true));
    twin.scale.setScalar(1.25);
    const twinGlow = glowSprite("#fffbe6", 3.4);
    twinGlow.position.y = 2.5;
    twin.add(twinGlow);
    scene.add(twin);
    let walked = 0;
    let lastX = START.x;
    let lastZ = START.z;
    const alreadyFound = ctx.startShelved.has(record.track.id);
    const start = mirror(START.x, START.z);
    if (alreadyFound) records.collect(record);
    else records.drop(record, start.x, 0, start.z);

    const ropeMaterial = new THREE.MeshToonMaterial({ color: "#2a2014", gradientMap: toonGradient() });
    let rope: THREE.Mesh | null = null;
    const hand = new THREE.Vector3();
    const recordPoint = new THREE.Vector3();
    const updateRope = (tension: number) => {
      if (rope) {
        rope.geometry.dispose();
        scene.remove(rope);
      }
      if (record.state !== "world") return;
      // İp oyuncunun sağ bileğinden çıkar (kameranın önünü kapatmaz).
      hand.set(0.32, -0.5, -0.7).applyQuaternion(ctx.camera.quaternion).add(ctx.camera.position);
      recordPoint.copy(record.group.position).setY(record.hover);
      const mid = hand.clone().lerp(recordPoint, 0.5);
      mid.y -= 2.5 * (1 - tension);
      const curve = new THREE.QuadraticBezierCurve3(hand, mid, recordPoint);
      rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.022, 5), ropeMaterial);
      scene.add(rope);
    };

    // Schrödinger'in kedisi: yalnızca ona bakmadığında hareket eder. Yakalanınca
    // odanın öbür ucunda belirir: hem yakalandı hem yakalanmadı.
    const catGeometry = await ctx.assets.stl("models/kuantum-cat.stl");
    // STL Z-yukarı modellenmiş: kediyi dört ayağının üstüne oturt (baş +Z'ye bakar).
    catGeometry.rotateX(-Math.PI / 2);
    catGeometry.computeVertexNormals();
    catGeometry.computeBoundingBox();
    const catBox = catGeometry.boundingBox!;
    const catSize = catBox.getSize(new THREE.Vector3());
    catGeometry.translate(-(catBox.min.x + catBox.max.x) / 2, -catBox.min.y, -(catBox.min.z + catBox.max.z) / 2);
    const cat = new THREE.Mesh(catGeometry, ink);
    const catScale = 0.9 / Math.max(catSize.y, 0.001);
    cat.scale.setScalar(catScale);
    cat.castShadow = true;
    cat.position.set(-12, 0, -8);
    scene.add(cat);
    const catCollider = colliders.addCircle(cat.position.x, cat.position.z, 0.45);
    let catTarget = new THREE.Vector3(-12, 0, -8);
    /** Gözlemci oyunu: kediye bakmadan yanına varınca bacağına sürtünür (bir süre durur). */
    let purr = 0;
    const toCat = new THREE.Vector3();
    const forward = new THREE.Vector3();
    interaction.add({
      radius: 0.6,
      position: (out) => out.copy(cat.position).setY(0.5),
      prompt: () => [{ key: "E", label: "Kediyi yakala" }],
      use: () => {
        cat.position.set(-cat.position.x, 0, -cat.position.z);
        catTarget.copy(cat.position);
        sfx.cue("chime");
        hud.hint("Kedi yine öbür uçta: hem yakaladın hem yakalamadın.", 2.5);
      },
    });

    // Ay: "karanlık yüz" perdesinde tavandan iner; bir yarısı aydınlık, öbürü mürekkep.
    const moon = new THREE.Group();
    const litMaterial = new THREE.MeshBasicMaterial({ color: "#fff4c4" });
    const lit = new THREE.Mesh(new THREE.SphereGeometry(4, 40, 24, 0, Math.PI), litMaterial);
    const dark = new THREE.Mesh(new THREE.SphereGeometry(4, 40, 24, Math.PI, Math.PI), ink);
    const moonGlow = glowSprite("#fff2b0", 9);
    moon.add(lit, dark, moonGlow);
    // Aydınlık yarı (+z) odanın merkezine, karanlık yarı köşeye baksın.
    moon.position.copy(MOON);
    moon.lookAt(0, MOON.y, 0);
    moon.position.y = HEIGHT + 6;
    scene.add(moon);

    // Kadeh ve masa: "zehir" perdesinde belirir; kadeh oyuncuya doğru süzülür.
    const table = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.07, 32), ink);
    top.position.y = 1.06;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.34, 1.06, 12), ink);
    leg.position.y = 0.53;
    table.add(top, leg);
    // Masa odanın tam ortasında: çift karşılıklı oturur, kadeh kadından adama süzülür.
    table.position.set(0, 0, 0);
    table.visible = false;
    scene.add(table);
    const tableCollider = colliders.addCircle(table.position.x, table.position.z, 0.8);
    tableCollider.enabled = false;
    const goblet = new THREE.Mesh(
      new THREE.LatheGeometry(
        [[0, 0], [0.22, 0.01], [0.04, 0.05], [0.035, 0.35], [0.2, 0.45], [0.25, 0.7]].map(([x, y]) => new THREE.Vector2(x, y)),
        24,
      ),
      new THREE.MeshPhysicalMaterial({ color: "#d8f0e0", roughness: 0.05, metalness: 0, transparent: true, opacity: 0.42, side: THREE.DoubleSide }),
    );
    // Kadehin içindeki yeşil, hiç şarap değil: kendi kendine ışıyan bir sıvı.
    const poison = new THREE.Mesh(
      new THREE.LatheGeometry([[0.03, 0.36], [0.17, 0.44], [0.21, 0.62]].map(([x, y]) => new THREE.Vector2(x, y)), 20),
      new THREE.MeshStandardMaterial({ color: "#3cff6a", emissive: "#1aa040", emissiveIntensity: 0.9, roughness: 0.2 }),
    );
    const poisonTop = new THREE.Mesh(new THREE.CircleGeometry(0.21, 20), new THREE.MeshStandardMaterial({ color: "#7dffa0", emissive: "#2ac055", emissiveIntensity: 1.2 }));
    poisonTop.rotation.x = -Math.PI / 2;
    poisonTop.position.y = 0.62;
    goblet.add(poison, poisonTop);
    const gobletHome = new THREE.Vector3(-0.55, 1.1, 0);
    const gobletOffer = new THREE.Vector3(0.55, 1.1, 0);
    goblet.position.copy(gobletHome);
    goblet.visible = false;
    scene.add(goblet);
    let offered = 0;
    let refused = false;
    // Dolanık çift: bizim adam ve kadın; filmi oynarlar (çiçekler, yol, tasma, ayna, koza, kadeh, gamze).
    const pair = createPairActors(scene, MOON, goblet);
    interaction.add({
      radius: 0.5,
      position: (out) => out.copy(goblet.position).setY(goblet.position.y + 0.3),
      prompt: () => (goblet.visible && !refused ? [{ key: "E", label: "Kadehi geri çevir" }] : null),
      use: () => {
        refused = true;
        sfx.cue("place");
        secrets.reveal("kadeh");
      },
    });

    // Tasma: oyuncunun boynundan gramofona gerilen ip.
    const leash = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), ropeMaterial);
    leash.visible = false;
    scene.add(leash);
    const neck = new THREE.Vector3();
    const gramPoint = new THREE.Vector3(GRAM.x, 1.2, GRAM.z);

    // Gamze: gülüş perdesinde yanağa bir nokta düşer; ona dokununca kıyamet kopar.
    // Gamze: gülüşün ucunda yanağa çizilmiş küçük bir kavis.
    const dimple = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.16, 8, 28, Math.PI * 0.85), ink);
    dimple.position.copy(DIMPLE);
    dimple.rotation.z = Math.PI + 0.5;
    dimple.scale.setScalar(0.001);
    scene.add(dimple);
    let doom = -1;
    // Gülüş: gamzeden küçük patlamalar (mürekkep ve ışık); her patlamada oda titrer.
    const dimpleBurst = createEmitter({ count: 110, colors: ["#fff6c8", "#141008"], size: 0.22, life: 1.3, spread: new THREE.Vector3(0.25, 0.25, 0.1), velocity: new THREE.Vector3(0, 1.2, 3.2), jitter: 3.4, gravity: -5, loop: false });
    scene.add(dimpleBurst.points);
    let dimpleClock = 0;
    interaction.add({
      radius: 1.2,
      reach: 48,
      position: (out) => out.copy(DIMPLE),
      prompt: () => (dimple.scale.x > 0.6 && doom < 0 ? [{ key: "E", label: "Gamzeye dokun" }] : null),
      use: () => {
        doom = 0;
        sfx.cue("moment");
        secrets.reveal("gamze");
      },
    });

    let collapsed = alreadyFound;
    let collapseAnim = -1;
    let smile = 0;
    let blinkTimer = 0;
    let untie = 0;
    let finaleTime = -1;
    let roll = 0;
    let shake = 0;
    let posing = false;
    const baseWalk = player.options.walkSpeed;
    const baseSprint = player.options.sprintSpeed;
    const timeline = createTimeline(STORY);

    const dust = createMotes(240, "#fff4c0", 0.2, new THREE.Vector3(HALF * 2, 24, HALF * 2));
    scene.add(dust.points);
    const dustCenter = new THREE.Vector3(0, 0, 0);

    const inGramophone = () =>
      !collapsed && record.state === "world" && Math.hypot(record.group.position.x - gramBase.x, record.group.position.z - gramBase.z) < 2.4;
    // Merkezde buluşma: sen ve ikizin aynı noktaya yaklaşınca plağı onun elinden alabilirsin.
    const atCenter = () => !collapsed && record.state === "world" && Math.hypot(player.position.x, player.position.z) < 1.8;
    interaction.add({
      radius: 1.2,
      always: true,
      reach: 3,
      position: (out) => out.set(0, 1.2, 0),
      prompt: () => (atCenter() ? [{ key: "E", label: "İkizinle buluştun — plağı elinden al" }] : null),
      use: () => {
        collapsed = true;
        record.pickable = true;
        record.hover = 0;
        record.display.scale.setScalar(2.6);
        ctx.pickUp(record);
        sfx.cue("chime");
        hud.hint("Plak artık sende. Gramofona götür ve E ile tak.", 5);
      },
    });

    ctx.input.onAction("KeyE", () => {
      if (!collapsed && inGramophone()) {
        collapsed = true;
        collapseAnim = 0;
        sfx.cue("moment");
      }
    });

    // Klip: kapağın kadrajından açılır; iki çiçek, Ay yolu, tasma ve ayna, koza, yeşil kadeh, gamze; gamzenin
    // içinde iki kalp ve tek siluet; son notada ikiye ayrılır, karanlık; kapağın kadrajına döner.
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const onObject = (object: THREE.Object3D, dx: number, dy: number, dz: number) => () => object.getWorldPosition(v(0, 0, 0)).add(v(dx, dy, dz));
    const wall = v(0, 13, -HALF);
    const shots: Shot[] = [
      { at: 0, from: v(0, 13, -2.4), to: v(0, 11, 18), look: wall, fov: 48 },
      // Koza zarı kadehin camına döner: beyazdan kadehin makrosuna.
      { at: 171.4, from: onObject(goblet, 0.9, 0.5, 1.1), to: onObject(goblet, 0.7, 0.4, 0.8), look: onObject(goblet, 0, 0.3, 0), fov: 34, grade: "blood", in: "white" },
      { at: 221, from: v(0, 13, 14), to: v(0, 13, -2.4), look: wall, fov: 48, in: "fade", grade: "pastel" },
    ];
    shots.push(...pair.shots(MOON));
    shots.sort((a, b) => a.at - b.at);

    const logic: WorldLogic = {
      ground: flat,
      debug: { cat, twin, quiz, pair, VOID },
      surface: "hard",
      startHint: "Tam karşında seni taklit eden biri var: dolanık ikizin, plak onun elinde. Ona asla yürüyerek ulaşamazsın; ama odanın tam ortasında buluşursunuz. Ya da gramofonun karşısındaki halkaya yürü, ikizin plağı gramofona getirsin.",
      coverPoint: {
        stand: { x: 2, z: 0.5 },
        camera: { position: new THREE.Vector3(0, 13, -2.4), target: new THREE.Vector3(0, 13, -HALF), fov: 48 },
        // Kapak pozu: gülüş kapaktaki derinlikte, göz açık.
        onEnter: () => void (posing = true),
        onExit: () => void (posing = false),
      },
      prompt: () => (!collapsed && inGramophone() ? [{ key: "E", label: "Ölç — plak gramofona çöksün" }] : null),
      shots: () => shots,
      // Önce plağı taşıyan ikiz gösterilir; oyuncu birkaç adım atınca hedef karşı noktaya geçer.
      objective: () => {
        if (collapsed || record.state !== "world" || inGramophone()) return null;
        if (walked < 4) return { position: new THREE.Vector3(twin.position.x, 3.1, twin.position.z), label: "Plak · dolanık ikizin" };
        // Merkeze gramofonun halkasından daha yakınsan buluşma noktasını göster.
        const toCenter = Math.hypot(player.position.x, player.position.z);
        const toRing = Math.hypot(player.position.x - target.x, player.position.z - target.z);
        if (toCenter < toRing) return { position: new THREE.Vector3(0, 0.2, 0), label: "Buluşma noktası" };
        return { position: new THREE.Vector3(target.x, 0.2, target.z), label: "Karşı nokta" };
      },
      onTrack(track) {
        if (!track) timeline.reset();
      },
      onFinale() {
        finaleTime = 0;
        return 8;
      },
      onFinaleDone() {
        untie = 1;
      },
      afterCamera(camera, dt) {
        // "Tafra" perdesinde oda burnu havada sallanır; kıyamette sarsılır.
        camera.rotation.z += roll;
        if (shake > 0.001) {
          camera.position.x += (Math.random() - 0.5) * shake;
          camera.position.y += (Math.random() - 0.5) * shake;
          shake = Math.max(0, shake - dt * 0.5);
        }
      },
      update(dt, time) {
        followGramophone();
        quiz.update(dt, time);
        specks.update(dt, ctx.camera.position);

        // Dolanıklık: ikiz (ve elindeki plak) oyuncunun odanın merkezine göre aynasıdır.
        walked += Math.hypot(player.position.x - lastX, player.position.z - lastZ);
        lastX = player.position.x;
        lastZ = player.position.z;
        const m = mirror(player.position.x, player.position.z);
        twin.position.x = approach(twin.position.x, m.x, 10, dt);
        twin.position.z = approach(twin.position.z, m.z, 10, dt);
        // Ayna: sen kuzeye bakarsan o güneye; yürüdükçe o da yaylanır.
        twin.rotation.y = player.yaw;
        twin.position.y = Math.abs(Math.sin(time * 7)) * Math.min(0.08, player.speed() * 0.02);
        twinGlow.visible = !collapsed;
        // Sinemada oyun nesneleri (ikiz, halkalar) gizlenir: film yalnız çifti gösterir.
        twin.visible = !ctx.cinema;
        if (!collapsed && record.state === "world") {
          record.group.position.x = twin.position.x;
          record.group.position.z = twin.position.z;
          marker.visible = !ctx.cinema;
        } else {
          marker.visible = false;
        }
        meeting.visible = marker.visible;
        record.group.visible = !(ctx.cinema && record.state === "world" && !collapsed);
        if (collapseAnim >= 0) {
          ctx.placeOnGramophone(record);
          collapseAnim = -1;
        }

        // Şarkının saniyesi: her dize odada bir şeyi değiştirir.
        // Klip kapalıyken (songTime -1) şarkı çalsa da oda kapaktaki hâlinde kalır.
        const songTime = ctx.songTime();
        const playing = music.state === "playing" && music.track !== null && songTime >= 0;
        if (playing) timeline.update(songTime);
        const act = playing ? (timeline.current?.id ?? "kutu") : "";
        const bound = act === "bag" || act === "yalnizlik";
        pair.update(dt, time, act, playing, songTime);

        dust.level = playing ? 0.8 : 0.25;
        dust.update(time, dustCenter);

        // İp: bağ perdelerinde gerilir.
        if (!collapsed && record.state === "world") updateRope(bound ? 0.95 : 0.3);
        else if (rope) {
          rope.geometry.dispose();
          scene.remove(rope);
          rope = null;
        }

        const smileTarget = posing ? 0.6 : act === "gulus" || act === "son" ? 1 : act === "ara" ? 0.55 : playing ? 0.35 : 0;
        smile = approach(smile, smileTarget, 1.5, dt);
        mural.setSmile(Math.round(smile * 40) / 40);
        blinkTimer -= dt;
        if (blinkTimer <= 0) blinkTimer = act === "gulus" ? 0.6 : 3 + random() * 4;
        mural.setBlink(blinkTimer < 0.15 && !posing ? 0 : 1);

        // Ay iner, ışık yarıya düşer; adam başını sallayınca Ay bir aydınlanır bir söner (tek neden, tek sonuç).
        const moonDown = act === "cicek" || act === "ay" || act === "tafra";
        moon.position.y = approach(moon.position.y, moonDown ? MOON.y : HEIGHT + 6, 1.2, dt);
        moon.visible = moon.position.y < HEIGHT + 5;
        litMaterial.color.setRGB(1, 0.96, 0.77).multiplyScalar(0.25 + 0.75 * pair.moonMood);
        moonGlow.material.opacity = 0.35 + 0.65 * pair.moonMood;
        const dim = act === "ay" ? 0.45 + 0.2 * pair.moonMood : act === "tafra" ? 0.35 + 0.35 * pair.moonMood : act === "yalnizlik" ? 0.6 : act === "ara" ? 0.7 : act === "gulus" || act === "son" ? 0.8 : 1;
        ambient.intensity = approach(ambient.intensity, 1.6 * dim, 1, dt);
        key.intensity = approach(key.intensity, 1.4 * dim, 1, dt);
        runtime.grade.uVignette.value = approach(runtime.grade.uVignette.value, act === "yalnizlik" ? 0.62 : 0.16, 0.8, dt);
        roll = approach(roll, act === "tafra" ? Math.sin(time * 0.9) * 0.035 : 0, 2, dt);

        // Bağlı eller: hareket yavaşlar. Tasma: gramofondan uzaklaşamazsın.
        const slow = bound || act === "tasma";
        player.options.walkSpeed = approach(player.options.walkSpeed, slow ? baseWalk * 0.45 : baseWalk, 2, dt);
        player.options.sprintSpeed = approach(player.options.sprintSpeed, slow ? baseSprint * 0.45 : baseSprint, 2, dt);
        leash.visible = act === "tasma";
        if (leash.visible) {
          const dx = player.position.x - gramBase.x;
          const dz = player.position.z - gramBase.z;
          const distance = Math.hypot(dx, dz);
          // Işınlamaz: tasma gerildikçe oyuncuyu gramofona doğru çeker.
          const excess = distance - 9;
          if (excess > 0) {
            const pull = Math.min(excess, dt * (2.5 + excess * 1.2));
            player.position.x -= (dx / distance) * pull;
            player.position.z -= (dz / distance) * pull;
          }
          neck.set(0, -0.35, -0.2).applyQuaternion(ctx.camera.quaternion).add(ctx.camera.position);
          stretch(leash, neck, gramPoint);
        }

        // Zehirli kadeh: masayla belirir, oyuncuya doğru süzülür; geri çevrilirse masaya döner. Tasma perdesinde
        // kadehteki yeşil yükselip tasma olur: sıvı azalır.
        const poisonAct = act === "zehir";
        table.visible = goblet.visible = poisonAct || act === "tasma" || act === "gulus" || act === "son";
        tableCollider.enabled = table.visible;
        poison.visible = pair.greenRise < 0.85;
        poison.scale.y = Math.max(0.05, 1 - pair.greenRise * 0.9);
        poisonTop.position.y = THREE.MathUtils.lerp(0.62, 0.38, pair.greenRise);
        if (!poisonAct) {
          offered = 0;
          if (act !== "tasma") refused = false;
        }
        offered = poisonAct && !refused ? Math.min(1, offered + dt * 0.35) : Math.max(0, offered - dt * 1.5);
        goblet.position.lerpVectors(gobletHome, gobletOffer, offered * offered);
        goblet.position.y = 1.1 + Math.sin(offered * Math.PI) * 0.1;

        // Gülüş: gamze belirir; dokunulursa kıyamet — eşler çevrilir, oda sarsılır, ışık patlar.
        dimple.scale.setScalar(approach(dimple.scale.x, act === "gulus" ? 1 : 0.001, 3, dt));
        if (act === "gulus" && dimple.scale.x > 0.6) {
          dimpleClock -= dt;
          if (dimpleClock <= 0) {
            dimpleClock = 0.85 + random() * 0.5;
            dimpleBurst.origin.copy(DIMPLE).add(new THREE.Vector3(0, 0, 0.3));
            dimpleBurst.burst(time);
            if (!ctx.cinema) shake = Math.max(shake, 0.18);
            sfx.cue("hit");
          }
        }
        dimpleBurst.update(time);
        if (doom >= 0) {
          doom += dt;
          if (doom < 0.1) shake = 0.5;
          runtime.grade.uFadeColor.value.set("#fffbe0");
          runtime.grade.uFade.value = Math.max(0, 0.8 - doom * 0.5);
          if (doom > 2) doom = act === "gulus" ? 2 : -1;
        }
        runtime.grade.uSaturation.value = approach(runtime.grade.uSaturation.value, act === "son" ? 1.25 : 1, 1, dt);

        // Kedi: bakılmadığında yürür, bakıldığında donar.
        ctx.camera.getWorldDirection(forward);
        toCat.copy(cat.position).setY(0.5).sub(ctx.camera.position).normalize();
        const observed = toCat.dot(forward) > 0.8;
        // Bakmadan yaklaşırsan (ya da o sana gelirse) kedi bacağına sürtünür: ölçmeyen gözlemciye kedi kedi olur.
        purr = Math.max(0, purr - dt);
        if (!observed && purr <= 0 && doom < 0 && Math.hypot(cat.position.x - player.position.x, cat.position.z - player.position.z) < 1.7) {
          purr = 4;
          hud.hint("Kedi bacağına sürtündü: ölçmeyen gözlemciye kedi yalnızca kedidir.", 2.5);
        }
        if (purr > 0) {
          cat.rotation.y += dt * 1.6;
        } else if (!observed) {
          if (cat.position.distanceTo(catTarget) < 0.5) {
            catTarget = new THREE.Vector3((random() - 0.5) * 48, 0, (random() - 0.5) * 48);
          }
          const step = catTarget.clone().sub(cat.position).setY(0);
          const length = step.length();
          if (length > 0.01) {
            cat.position.addScaledVector(step.normalize(), Math.min(length, dt * 2.4));
            cat.rotation.y = Math.atan2(step.x, step.z);
          }
        }
        catCollider.x = cat.position.x;
        catCollider.z = cat.position.z;

        // Final: halat çözülür, gülümseme gerçek bir gülüşe döner.
        if (finaleTime >= 0) {
          finaleTime += dt;
          untie = Math.min(1, finaleTime / 6);
          smile = 1;
          mural.setSmile(1);
          runtime.grade.uFadeColor.value.set("#fff3b0");
          runtime.grade.uFade.value = Math.sin(Math.min(1, finaleTime / 8) * Math.PI) * 0.6;
        } else if (doom < 0) {
          runtime.grade.uFade.value = approach(runtime.grade.uFade.value, 0, 1, dt);
        }
        mural.setUntie(Math.round(untie * 30) / 30);
      },
    };
    if (import.meta.env.DEV) Object.assign(logic, { cat });
    return logic;
  },
};
