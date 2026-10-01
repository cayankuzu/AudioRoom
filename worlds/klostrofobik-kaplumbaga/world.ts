import { allRecordsShelved } from "../../engine/devFlags";
import * as THREE from "three";
import { yawTowards } from "../../engine/core/player";
import { createText3D } from "../../engine/core/text3d";
import { approach } from "../../engine/fx/fade";
import { createParticles } from "../../engine/fx/particles";
import type { Shot } from "../../engine/game/director";
import { createTimeline } from "../../engine/game/timeline";
import { bird, createMotes, createPetals, flap, flyTo, type Flyer } from "../../engine/fx/sceneProps";
import type { WorldDefinition, WorldLogic } from "../../engine/world";
import type { FigurePose } from "../../engine/fx/figure";
import { ALBUM } from "./album";
import { createEbruFloorMaterial, createEbruSky, createEbruUniforms, DROPS } from "./ebru";
import { createRabbit, type Burrow } from "./rabbit";
import { RADIUS_TARGET, SQUEEZE_TARGET, STORY } from "./story";
import { createTunnels, TUNNEL_RADIUS } from "./tunnels";
import { loadModels } from "../../engine/core/models";
import { createQuiz, QUIZ_MODELS } from "./quiz";
import { createHurried } from "./hurried";
import { loadCharacterLibrary } from "../../engine/fx/character";
import { createUniverse, UNIVERSE_FAR } from "./universe";
import { createShellHome, SHELL_MODELS } from "./shellHome";

const START = { x: 0, z: 30 };
const GRAM = { x: -9, z: 22 };
const ARENA = 42;
const BURROWS: Burrow[] = [
  { x: 26, z: 8 },
  { x: -24, z: -14 },
  { x: 8, z: -28 },
  { x: -18, z: 20 },
];
/** Klipte tavşanın kazdığı delik: kaplumbağanın önünde, kabuğun ağzının dibinde. */
const HOLE = { x: 0, z: 3.9 };
/** Tavşanın klipte kâğıdı geçmeye başladığı uzak nokta ve kabuğun ağzının önünde duraksadığı yer. */
const RABBIT_FAR = new THREE.Vector3(-34, 0, 18);
const RABBIT_PAUSE = new THREE.Vector3(0, 0, 5.6);
/** Tavşanın filmin sonunda oturduğu yer: kaplumbağanın yanı. */
const RABBIT_SEAT = new THREE.Vector3(3.4, 0, 3.4);
/** Kapak kadrajı: figür biraz sağda, solda iki kapsül, sağda sırtı dönük zıplayan tavşan. */
const COVER = { x: -1, y: 6.5, z: 30 };

export const world: WorldDefinition = {
  ...ALBUM,
  plinth: "wood",
  player: { start: START, lookAt: { x: 0, z: 0 }, walkSpeed: 4.2, sprintSpeed: 7.4 },

  async build(ctx): Promise<WorldLogic> {
    const { scene, runtime, records, gramophone, colliders, player, random, music, sfx, input, camera, hud } = ctx;
    runtime.renderer.toneMapping = THREE.AgXToneMapping;
    runtime.renderer.toneMappingExposure = 1.2;
    runtime.grade.uVignette.value = 0.32;
    runtime.grade.uGrain.value = 0.05;
    runtime.grade.uContrast.value = 1.05;
    runtime.grade.uSaturation.value = 1.15;
    sfx.setAmbience("desert", 0.8);
    records.beacons = false;
    colliders.setBounds({ type: "circle", cx: 0, cz: 0, r: ARENA });

    const ebru = createEbruUniforms();
    const sky = createEbruSky(ebru);
    scene.add(sky);
    const fog = new THREE.Fog("#d9b56a", 70, 220);
    scene.fog = fog;

    const drops = Array.from({ length: DROPS }, () => new THREE.Vector4(0, 0, 0, 0));
    let dropIndex = 0;
    const dropPaint = (x: number, z: number, size: number) => {
      drops[dropIndex % DROPS].set(x, z, ebru.uTime.value, size);
      dropIndex += 1;
    };
    // Zemin tavşan deliklerinde gerçekten açıktır: aşağıdaki tünel görünür.
    const holes = BURROWS.map((b) => new THREE.Vector3(b.x, b.z, TUNNEL_RADIUS));
    const floor = new THREE.Mesh(new THREE.CircleGeometry(160, 96), createEbruFloorMaterial(ebru, drops, holes));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const hemi = new THREE.HemisphereLight("#fff0cc", "#9a6a2a", 1.3);
    const sun = new THREE.DirectionalLight("#fff4dc", 2.4);
    sun.position.set(30, 60, 20);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -50;
    sun.shadow.camera.right = sun.shadow.camera.top = 50;
    sun.shadow.bias = -0.0005;
    runtime.onQualityChange((profile) => {
      sun.castShadow = profile.shadows;
      sun.shadow.mapSize.setScalar(profile.shadowMapSize);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
    });
    // Tünelde oyuncunun taşıdığı sıcak fener ışığı.
    const lantern = new THREE.PointLight("#ffc27a", 0, 11, 1.5);
    scene.add(hemi, sun, lantern);

    // Merkez: kabuğunun üstünde gitar çalan kaplumbağa (kapaktaki figür).
    const turtleGltf = await ctx.assets.gltf("models/klostro-turtle.glb");
    const turtle = turtleGltf.scene;
    const tBox = new THREE.Box3().setFromObject(turtle);
    const tSize = tBox.getSize(new THREE.Vector3());
    // Kapaktaki gibi kadrajı dolduran bir anıt: kabuğun üstünde gitar çalan kaplumbağa.
    const tScale = 12 / tSize.y;
    turtle.scale.setScalar(tScale);
    turtle.position.set(-((tBox.min.x + tBox.max.x) / 2) * tScale, -tBox.min.y * tScale, -((tBox.min.z + tBox.max.z) / 2) * tScale);
    turtle.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) child.castShadow = true;
    });
    const statue = new THREE.Group();
    statue.add(turtle);
    scene.add(statue);
    colliders.addCircle(0, 0, 4.2);

    // Kapaktaki iki ince kapsül yazı: kaplumbağanın solunda havada süzülür, dikey küçük harfler.
    // Yerleri kapaktan ölçüldü (kapak kadrajında figürün solunda, biri daha uzun ve yüksek).
    const capsuleMaterial = new THREE.MeshStandardMaterial({ color: "#e5bf6b", roughness: 0.6 });
    const makeCapsule = async (word: string, x: number, bottom: number, top: number) => {
      const group = new THREE.Group();
      const radius = 0.3;
      const height = top - bottom - radius * 2;
      const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(radius, height, 8, 24), capsuleMaterial);
      capsule.castShadow = true;
      // Harfler kapsülün önüne ve arkasına kabartma: her iki yandan da okunur.
      const letters = await createText3D([...word].join("\n"), {
        font: "courier-prime-400",
        size: 0.44,
        depth: 0.08,
        color: "#2a1a08",
        lineHeight: (height + radius) / word.length / 0.44,
      });
      letters.position.set(0, 0, radius - 0.02);
      const back = letters.clone();
      back.rotation.y = Math.PI;
      back.position.z = -radius + 0.02;
      group.add(capsule, letters, back);
      group.position.set(x, (top + bottom) / 2, 0);
      group.lookAt(COVER.x, group.position.y, COVER.z);
      scene.add(group);
    };
    await Promise.all([makeCapsule("klostrofobik", -7.2, 3.6, 12.2), makeCapsule("kaplumbağa", -5.6, 3, 10.2)]);

    // Tavşan delikleri: toprak tümseği ağzı çevreler; aşağısı gerçek tünel.
    const dirt = new THREE.MeshStandardMaterial({ color: "#6b4424", roughness: 1 });
    for (const burrow of BURROWS) {
      const mound = new THREE.Mesh(new THREE.TorusGeometry(TUNNEL_RADIUS + 0.35, 0.42, 10, 28), dirt);
      mound.rotation.x = -Math.PI / 2;
      mound.scale.z = 0.55;
      mound.position.set(burrow.x, 0.05, burrow.z);
      mound.receiveShadow = true;
      scene.add(mound);
    }
    const models = await loadModels(ctx.assets, [...QUIZ_MODELS, ...SHELL_MODELS]);
    // Sınav kürsüsü: kâğıdın üstünde bir okul sırası (yeri her girişte değişir).
    const quiz = createQuiz(ctx, models);
    const tunnels = createTunnels(BURROWS, random);
    scene.add(tunnels.group);

    // Toz: ebru kâğıdından kalkan ince zerreler.
    const dust = createParticles({ count: Math.round(260 + 500 * runtime.profile.detail), box: new THREE.Vector3(60, 18, 60), size: 0.12, color: "#fff2cf", opacity: 0.4 });
    dust.velocity.set(0.4, 0.08, 0.1);
    scene.add(dust.points);

    gramophone.place(GRAM.x, 0, GRAM.z, yawTowards(GRAM.x, GRAM.z, START.x, START.z) + Math.PI, 1.4);
    gramophone.setBeaconStyle("#8f3a18", false);
    colliders.addCircle(GRAM.x, GRAM.z, 1.3);

    // Tavşan ve plak.
    const rabbitGltf = await ctx.assets.gltf("models/klostro-bunny.glb");
    const rabbit = createRabbit(rabbitGltf, BURROWS, random, (position, radius) => colliders.resolve(position, radius), (x, z, radius) => colliders.isFree(x, z, radius));
    scene.add(rabbit.root);
    await loadCharacterLibrary(ctx.assets);
    // Filmin insanı: bizim karakter (yalnız şarkı çalarken). Kabuğa girince içerideki ev onu devralır.
    const hurried = createHurried(scene);
    // Kabuğun içi: kaplumbağanın evi; film ilerledikçe kubbe daralır, ortada çorba kâsesi belirir.
    const shellHome = createShellHome(scene, models, random);
    let homeLevel = 0;
    // Daralan evren: duvar yok. Kâğıdın ötesi karanlığa döner ve karanlık dizeden dizeye yaklaşır.
    const universe = createUniverse(scene, random);
    // Tavşan kaçarken çukur kazar: toprak parçaları fırlar, geride tümsekli bir delik kalır (yalnız tavşan dalar).
    const digDirt = new THREE.MeshStandardMaterial({ color: "#5a3a1e", roughness: 1 });
    const clodGeometry = new THREE.DodecahedronGeometry(0.07, 0);
    const clods = Array.from({ length: 16 }, () => ({ mesh: new THREE.Mesh(clodGeometry, digDirt), velocity: new THREE.Vector3(), life: 0 }));
    clods.forEach((clod) => {
      clod.mesh.visible = false;
      clod.mesh.castShadow = true;
      scene.add(clod.mesh);
    });
    const spray = (x: number, z: number) => {
      for (const clod of clods) {
        clod.mesh.position.set(x + (random() - 0.5) * 0.3, 0.1, z + (random() - 0.5) * 0.3);
        clod.velocity.set((random() - 0.5) * 3.2, 2.5 + random() * 2.5, (random() - 0.5) * 3.2);
        clod.life = 0.9 + random() * 0.5;
        clod.mesh.visible = true;
      }
      sfx.cue("hit");
    };
    const makeMound = (x: number, z: number) => {
      const mound = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.TorusGeometry(TUNNEL_RADIUS + 0.3, 0.36, 10, 28), digDirt);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.08;
      ring.castShadow = true;
      const hole = new THREE.Mesh(new THREE.CircleGeometry(TUNNEL_RADIUS + 0.05, 28), new THREE.MeshBasicMaterial({ color: "#0d0703" }));
      hole.rotation.x = -Math.PI / 2;
      hole.position.y = 0.025;
      mound.add(ring, hole);
      mound.position.set(x, 0, z);
      return mound;
    };
    const mounds: THREE.Group[] = [];
    let digs = 0;
    rabbit.onDig = (x, z, phase) => {
      if (phase === "start") {
        spray(x, z);
        return;
      }
      // Kazılan ağız gerçek bir tünelin başıdır: en yakın yuvaya (en az 8 m ötedeki) bağlanır, girilebilir.
      const ranked = [...BURROWS].sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
      const to = ranked.find((b) => Math.hypot(b.x - x, b.z - z) >= 8) ?? ranked[ranked.length - 1];
      const mouth: Burrow = { x, z };
      const open = tunnels.dig(mouth, to);
      const mound = makeMound(x, z);
      mound.userData.mouth = mouth;
      scene.add(mound);
      mounds.push(mound);
      // Kapanan (en eski) tünelin tümseği de kaybolur.
      for (let k = mounds.length - 1; k >= 0; k -= 1) {
        if (!open.includes(mounds[k].userData.mouth as Burrow)) {
          scene.remove(mounds[k]);
          mounds.splice(k, 1);
        }
      }
      digs += 1;
      if (digs === 1) hud.hint("Tavşan kendine yeni bir tünel kazdı — sen de girebilirsin (C).", 4);
      return to;
    };
    // Klipteki delik: tavşanın duvarların içinde kazdığı ağız (yalnız film boyunca görünür).
    const clipMound = makeMound(HOLE.x, HOLE.z);
    clipMound.visible = false;
    scene.add(clipMound);
    // Raftaki plağa göz diken tavşan: gramofondaki plağa dokunamaz.
    let stealCooldown = 6;
    // Geçici test kipinde (bütün plaklar rafta) tavşan plak kapmaz.
    const noSteal = allRecordsShelved();
    let stillFor = 0;
    const shelfSpot = new THREE.Vector3();
    const shelfFront = new THREE.Vector3();
    const shelfTurn = new THREE.Quaternion();
    const toRabbit = new THREE.Vector3();
    const behindSpot = new THREE.Vector3();
    /** Oyuncunun tam arkasındaki nokta (elden kapma için). */
    const behindPlayer = () => behindSpot.set(player.position.x + Math.sin(player.yaw) * 0.9, 0, player.position.z + Math.cos(player.yaw) * 0.9);
    const record = records.list[0];
    record.hover = 0;
    record.pickable = false;
    // Serbest kalan tavşan müziğin yanında oturur; gramofon taşınırsa peşinden gelir.
    const gramBase = new THREE.Vector3();
    const listenSpot = new THREE.Vector3(GRAM.x + 1.6, 0, GRAM.z - 1.2);
    const shelfBase = new THREE.Vector3();
    /** Gramofonun kitaplıktan uzak yanı: tavşan rafla sehpanın arasına sıkışmasın. */
    const awayFromShelf = (cx: number, cz: number) => {
      records.shelf.root.getWorldPosition(shelfBase);
      const dx = cx - shelfBase.x;
      const dz = cz - shelfBase.z;
      const d = Math.hypot(dx, dz) || 1;
      return { x: cx + (dx / d) * 2.3, z: cz + (dz / d) * 2.3 };
    };
    /** Gramofonun yanında boş bir oturma yeri: kitaplık ve sehpa gibi engellerin dışında. */
    const seatNear = (cx: number, cz: number, preferX: number, preferZ: number) => {
      const a0 = Math.atan2(preferZ - cz, preferX - cx);
      for (let k = 0; k < 12; k += 1) {
        const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.55;
        const x = cx + Math.cos(a) * 2.3;
        const z = cz + Math.sin(a) * 2.3;
        if (colliders.isFree(x, z, 0.7)) return new THREE.Vector3(x, 0, z);
      }
      return new THREE.Vector3(cx + 2.3, 0, cz);
    };
    const followMusic = () => {
      gramophone.basePosition(gramBase);
      const prefer = awayFromShelf(gramBase.x, gramBase.z);
      const next = gramophone.spot === "stand" ? seatNear(GRAM.x, GRAM.z, prefer.x, prefer.z) : seatNear(gramBase.x, gramBase.z, rabbit.root.position.x, rabbit.root.position.z);
      if (next.distanceTo(listenSpot) > 0.6) {
        listenSpot.copy(next);
        rabbit.release(listenSpot);
      }
    };
    if (ctx.startShelved.has(record.track.id)) {
      records.collect(record);
      followMusic();
      rabbit.release(listenSpot);
    } else {
      records.drop(record, 0, 0, 0);
    }
    const handWorld = new THREE.Vector3();

    // Havuç atar: elde küçük havuç, sol tıkla parabolik atış.
    const carrotGltf = await ctx.assets.gltf("models/klostro-carrot.glb");
    const carrotModel = carrotGltf.scene;
    const cBox = new THREE.Box3().setFromObject(carrotModel);
    carrotModel.scale.setScalar(0.3 / cBox.getSize(new THREE.Vector3()).y);
    const inHand = carrotModel.clone();
    inHand.scale.multiplyScalar(0.7);
    inHand.position.set(0.32, -0.3, -0.62);
    inHand.rotation.set(-1.35, 0.35, -0.2);
    camera.add(inHand);
    interface Carrot {
      mesh: THREE.Object3D;
      velocity: THREE.Vector3;
      life: number;
    }
    const carrots: Carrot[] = [];
    const throwCarrot = () => {
      if (carrots.length >= 10) {
        const old = carrots.shift()!;
        scene.remove(old.mesh);
      }
      const mesh = carrotModel.clone();
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      mesh.position.copy(camera.position).addScaledVector(dir, 0.6);
      scene.add(mesh);
      carrots.push({ mesh, velocity: dir.multiplyScalar(26).add(new THREE.Vector3(0, 2.5, 0)), life: 3 });
      sfx.cue("throw");
      inHand.position.z = -0.35;
    };
    const tryThrow = () => {
      if (!shell && !tunnels.current) throwCarrot();
    };
    input.onAction("Mouse0", tryThrow);
    input.onAction("KeyF", tryThrow);
    // Deliğin başında C'ye kısa basmak da yeter (basılı tutmak kabuğa çekilmektir).
    input.onAction("KeyC", () => {
      if (tunnels.current) return;
      const mouth = tunnels.mouthNear(player.position.x, player.position.z, 2.4);
      if (mouth) enterTunnel(mouth);
    });

    // Kabuk: C basılıyken kabuğa çekil (delik başında C: deliğe gir).
    let shell = false;
    let posing = false;
    let shellAmount = 0;

    // Ebru damlası: bakılan yere (ya da önüne) boya damlatır; yürürken ayak izinden küçük damlalar.
    const aim = new THREE.Vector3();
    let travelled = 0;
    let lastX = player.position.x;
    let lastZ = player.position.z;
    const paintAtAim = () => {
      camera.getWorldDirection(aim);
      const t = aim.y < -0.05 ? Math.min(28, -camera.position.y / aim.y) : 6;
      dropPaint(camera.position.x + aim.x * t, camera.position.z + aim.z * t, 4 + random() * 3);
      sfx.cue("drop");
    };

    // Şarkının zaman çizelgesi ve dizelere bağlı damlalar.
    const timeline = createTimeline(STORY);

    // Klibin hareketli katmanı: kaplumbağanın çevresinde süzülen karahindiba tohumları, dünya
    // hızlanınca kaplumbağanın üstünden hızla geçen kırlangıçlar, damla perdelerinde gökten yağan
    // ebru renkli taç yaprakları.
    const seeds = createMotes(200, "#fffaf0", 0.22, new THREE.Vector3(60, 14, 60), 0.6);
    scene.add(seeds.points);
    const petals = createPetals(200, "#e0603a", 0.13, new THREE.Vector3(50, 18, 50), 0.6);
    scene.add(petals.mesh);
    const petalMaterial = petals.mesh.material as THREE.MeshStandardMaterial;
    const swallowMaterial = new THREE.MeshStandardMaterial({ color: "#1c2233", roughness: 0.7, side: THREE.DoubleSide });
    const swallows: Flyer[] = Array.from({ length: 10 }, () => {
      const flyer = bird(swallowMaterial);
      flyer.group.scale.setScalar(2);
      flyer.group.visible = false;
      scene.add(flyer.group);
      return flyer;
    });
    const swallowAt = new THREE.Vector3();
    const layerCenter = new THREE.Vector3(0, 0, 0);
    let swallowLevel = 0;
    let finaleTime = -1;
    let flowBoost = 0;
    let sink = 0;
    let squeeze = 0;
    let squeezeGoal = 0;
    const forward = new THREE.Vector3();

    // Tavşanın klipteki rolü: "tavşan"da kâğıdı koşarak geçer, kabuğun ağzında duraksar (ağız dar), sonra
    // daralan kâğıtta gitgide küçülen turlar atar; "kaçış"ta deliği kazıp dalar; "açılış"ta çıkıp kaplumbağanın
    // yanına oturur; film bitince gramofonun yanındaki yerine döner.
    type RabbitScript = "none" | "cross" | "hesitate" | "laps" | "toHole" | "dig" | "down" | "hidden" | "up" | "toSeat" | "seated";
    let script: RabbitScript = "none";
    let scriptTimer = 0;
    let lapAngle = 0;
    const scriptStart = () => {
      if (script !== "none") return;
      script = "cross";
      rabbit.root.position.copy(RABBIT_FAR);
      rabbit.root.rotation.y = Math.atan2(RABBIT_PAUSE.x - RABBIT_FAR.x, RABBIT_PAUSE.z - RABBIT_FAR.z);
      rabbit.scripted = true;
    };
    const scriptEnd = () => {
      if (script === "none") return;
      script = "none";
      rabbit.scripted = false;
      rabbit.root.visible = true;
      rabbit.root.position.y = 0;
      rabbit.root.rotation.x = 0;
      rabbit.release(listenSpot);
    };
    const moveRabbit = (dt: number, to: THREE.Vector3, speed: number) => {
      const dx = to.x - rabbit.root.position.x;
      const dz = to.z - rabbit.root.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.35) {
        rabbit.drive(dt, 0);
        return true;
      }
      const step = Math.min(d, speed * dt);
      rabbit.root.position.x += (dx / d) * step;
      rabbit.root.position.z += (dz / d) * step;
      const yaw = Math.atan2(dx, dz);
      rabbit.root.rotation.y += Math.atan2(Math.sin(yaw - rabbit.root.rotation.y), Math.cos(yaw - rabbit.root.rotation.y)) * Math.min(1, dt * 8);
      rabbit.drive(dt, speed);
      return false;
    };
    const holeAt = new THREE.Vector3(HOLE.x, 0, HOLE.z);
    const lapTarget = new THREE.Vector3();
    const startLaps = () => {
      script = "laps";
      lapAngle = Math.atan2(rabbit.root.position.x, rabbit.root.position.z);
      rabbit.root.position.y = 0;
    };
    const updateScript = (dt: number, time: number, act: string) => {
      switch (script) {
        case "cross":
          // Kâğıdı baştan başa koşar, kabuğun ağzının önünde durur.
          if (moveRabbit(dt, RABBIT_PAUSE, 7.5)) {
            script = "hesitate";
            scriptTimer = 2.2;
          } else if (act !== "tavsan" && act !== "damla") startLaps();
          break;
        case "hesitate":
          // Ağız öncekinden dar: burnunu oynatır, içeri bakar, giremez; daha hızlı koşmaya başlar.
          rabbit.root.rotation.y += Math.atan2(Math.sin(Math.PI - rabbit.root.rotation.y), Math.cos(Math.PI - rabbit.root.rotation.y)) * Math.min(1, dt * 6);
          rabbit.root.position.y = Math.abs(Math.sin(time * 6)) * 0.04;
          rabbit.drive(dt, 0);
          scriptTimer -= dt;
          if (scriptTimer <= 0) startLaps();
          break;
        case "laps": {
          if (act === "kacis" || act === "nefes" || act === "durus") {
            script = "toHole";
            break;
          }
          // Karanlık yaklaştıkça turu küçülür: koşacak yer azalır.
          const r = THREE.MathUtils.clamp(universe.radius - 3.5, 5.5, 12);
          lapAngle += (dt * 7.5) / r;
          lapTarget.set(Math.sin(lapAngle) * r, 0, Math.cos(lapAngle) * r);
          moveRabbit(dt, lapTarget, 7.5);
          break;
        }
        case "toHole":
          if (moveRabbit(dt, holeAt, 6.5)) {
            script = "dig";
            scriptTimer = 1.8;
            spray(HOLE.x, HOLE.z);
          }
          break;
        case "dig":
          rabbit.root.position.y = -Math.abs(Math.sin(time * 16)) * 0.14;
          rabbit.root.rotation.x = -Math.abs(Math.sin(time * 16)) * 0.25;
          rabbit.drive(dt, 0);
          scriptTimer -= dt;
          if (scriptTimer <= 0) {
            rabbit.root.rotation.x = 0;
            script = "down";
          }
          break;
        case "down":
          rabbit.root.position.y -= dt * 5.5;
          rabbit.drive(dt, 0);
          if (rabbit.root.position.y < -2.4) {
            rabbit.root.visible = false;
            script = "hidden";
          }
          break;
        case "hidden":
          if (act === "acilis" || act === "son") {
            rabbit.root.visible = true;
            rabbit.root.position.set(HOLE.x, -2.4, HOLE.z);
            script = "up";
          }
          break;
        case "up":
          rabbit.root.position.y = Math.min(0, rabbit.root.position.y + dt * 3.5);
          rabbit.root.rotation.y = Math.atan2(-HOLE.x, -HOLE.z);
          rabbit.drive(dt, 0);
          if (rabbit.root.position.y >= 0) script = "toSeat";
          break;
        case "toSeat":
          if (moveRabbit(dt, RABBIT_SEAT, 3.2)) {
            script = "seated";
            rabbit.root.rotation.y = Math.atan2(-RABBIT_SEAT.x, -RABBIT_SEAT.z);
          }
          break;
        case "seated":
          rabbit.drive(dt, 0);
          break;
        default:
          break;
      }
    };

    const enterTunnel = (burrow: Burrow) => {
      tunnels.enter(burrow);
      shell = false;
      inHand.visible = false;
      sfx.cue("whoosh");
      hud.hint("Tüneldesin: bakıp W ile sürün, geri dönmek için arkana bak.", 4);
    };

    // Klip: daralan evrenin kısa filmi. Kapağın kadrajıyla açılır ve kapanır. Uçsuz kâğıt → kabuğun içindeki
    // ev → koşan tavşan → yaklaşan karanlık → ikinci, daha küçük ev → çorba/çatal → tavşanın kaçışı → nefes
    // (tek çekim) → geri çekilince bütün kâğıdın dev bir kabuğun içinde olduğu görülür.
    const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    // Tavşan yer altındayken kamera toprağa gömülmesin: nokta ağzın hizasına çekilir.
    const hare = (dx: number, dy: number, dz: number) => () => {
      const p = rabbit.root.getWorldPosition(v(0, 0, 0));
      p.y = Math.max(0, p.y);
      return p.add(v(dx, dy, dz));
    };
    // Evdeki adam (kubbe daraldıkça içeri kayar) ve evin ölçeğine göre nokta.
    const manAt = (dx: number, dy: number, dz: number) => () => shellHome.man.group.position.clone().add(v(dx, dy, dz));
    const home = (x: number, y: number, z: number) => () => {
      const k = shellHome.radius / 2.8;
      return v(x * k, y, z * k);
    };
    const coverFrom = v(COVER.x, COVER.y, COVER.z);
    const coverLook = v(COVER.x, COVER.y, 0);
    const shots: Shot[] = [
      { at: 0, from: coverFrom, to: v(COVER.x + 3, COVER.y + 2, COVER.z - 6), look: coverLook, lookTo: v(0, 3, 0), fov: 30, fovTo: 40 },
      // Uçsuz bucaksız kâğıt: kenar boyunca uzun uçuş; ufukta karanlık yok.
      { at: 10, from: v(-40, 6, -30), path: [v(-12, 4, -40), v(30, 5, -22)], to: v(38, 4, 10), look: v(0, 2, 0), fov: 54, curve: "linear", grade: "pastel" },
      // Ev: adamın peşinden kabuğun ağzına; içeri girince tek çekimde oda dolaşılır.
      { at: 24, from: () => hurried.actor.figure.group.position.clone().add(v(0.8, 1.6, 3.2)), to: v(0.6, 1.4, 5.6), look: () => hurried.actor.figure.group.position.clone().add(v(0, 1.2, 0)), lookTo: v(0.3, 1.4, 2.6), fov: 50, curve: "linear", grade: "dawn" },
      { at: 30, from: v(0.2, 1.45, 2.3), path: [v(-0.6, 1.3, 1.5)], to: v(-1.2, 1.2, 0.9), look: home(0.55, 1.0, -0.35), lookTo: home(-1.2, 0.8, -0.5), fov: 62, curve: "linear", grade: "candle", handheld: 0.015 },
      { at: 38, from: v(1.7, 1.5, 1.5), to: v(1.4, 1.35, 1.2), look: home(-0.4, 0.9, -1.2), lookTo: home(0.9, 1.0, -0.3), fov: 68, curve: "linear", grade: "candle" },
      { at: 43, from: v(1.3, 1.15, 0.6), to: v(1.05, 1.1, 0.35), look: manAt(0, 1.0, 0), fov: 44, grade: "candle" },
      // Tavşan: kâğıdı koşarak geçer; ağza gelir, duraksar, daha hızlı koşar.
      { at: 47.9, from: hare(4, 1.6, 3), to: hare(2.6, 1.2, 2.2), look: hare(0, 0.6, 0), fov: 42, grade: "cold", handheld: 0.02 },
      { at: 53.7, from: v(2.4, 1.2, 2.2), to: v(2.0, 1.1, 2.6), look: hare(0, 0.9, 0), fov: 54, grade: "cold" },
      { at: 57, from: hare(-3, 1.4, 2.5), to: hare(-2, 1.1, 1.8), look: hare(0, 0.5, 0), fov: 44, grade: "cold" },
      // Üç damla: tepeden; kâğıdın kenarında karanlık ilk kez belirir.
      { at: 60, from: v(0, 46, 8), to: v(0, 34, 6), look: v(0, 0, 0), fov: 60, grade: "neon", in: "flash" },
      { at: 68.78, from: v(12, 1.6, 4), to: v(9, 1.8, 6), look: v(-30, 3, -60), lookTo: v(-8, 3, -40), fov: 50, curve: "linear", grade: "pastel" },
      { at: 77, orbit: { center: v(0, 0, 0), radius: 30, height: 7, from: 2.2, to: 3.4 }, look: v(0, 2, 0), fov: 54, curve: "linear", grade: "pastel" },
      // Daralma: göz hizasında uzun kaydırma; kaplumbağanın ardında karanlık kıyı. Eşyalar aynı, yer az.
      { at: 83.8, from: v(-22, 1.2, 20), to: v(22, 1.2, 20), look: v(0, 1, 0), fov: 52, curve: "linear", grade: "pastel", in: "flash" },
      { at: 89.71, from: v(2, 1.4, 6), to: v(1.4, 1.5, 7.5), look: v(30, 2, 60), lookTo: v(40, 6, 30), fov: 48, curve: "linear", grade: "cold" },
      { at: 92.84, from: v(0, 100, 6), to: v(0, 84, 3), look: v(0, 0, 0), fov: 64, grade: "neon", in: "flash" },
      // Sıkışma: içeride; adam duvara yaslanıp itiyor, kubbe omzuna değiyor.
      { at: 95.8, from: v(-0.3, 1.4, 2.0), to: v(-0.1, 1.3, 1.5), look: manAt(0, 1.1, 0), fov: 58, grade: "candle", handheld: 0.02 },
      { at: 100, from: manAt(-1.1, 1.3, 0.9), to: manAt(-0.9, 1.25, 0.6), look: manAt(0.3, 1.2, 0), fov: 40, grade: "candle", handheld: 0.02 },
      { at: 104, from: v(-1.5, 1.4, -0.4), to: v(-1.2, 1.3, -0.2), look: manAt(0, 1.0, 0), lookTo: home(0.4, 1.4, 1.8), fov: 66, curve: "linear", grade: "candle" },
      // Akış: dünya hızlanır; kamera omuzda; karanlık halka üç adım daha yakın.
      { at: 108, from: v(20, 2.5, -16), to: v(-20, 2.5, -10), look: v(0, 2, 0), fov: 50, handheld: 0.05, curve: "linear", grade: "fever" },
      { at: 114, from: v(-20, 12, 0), path: [v(0, 16, -18)], to: v(20, 12, 0), look: v(0, 0, 0), fov: 58, curve: "linear", grade: "fever", handheld: 0.04 },
      { at: 120, from: v(0, 50, 4), to: v(0, 40, 2), look: v(0, 0, 0), fov: 60, grade: "dawn" },
      { at: 126, from: v(-8.5, 1.6, 6.5), to: v(-6.2, 1.8, 4.6), look: v(0, 3, 0), lookTo: v(-14, 2, -20), fov: 50, curve: "linear", grade: "fever" },
      // İkinci ev: kaplumbağa kabuğuna çekilir; kamera ağızdan içeri (mikroskop maskesi), aynı ev daha küçük.
      { at: 133.2, from: v(7, 3, 9), to: v(4.5, 2.6, 6.5), look: v(0, 2.6, 0), fov: 44, grade: "deep", lens: "scope", lensAmount: 0.55, in: "fade" },
      { at: 139.39, from: v(0, 1.6, 5), path: [v(0, 1.3, 3.0)], to: v(0.2, 1.1, 1.3), look: v(0, 1.5, 0), lookTo: manAt(0, 1.0, 0), fov: 50, fovTo: 66, curve: "linear", grade: "deep", lens: "scope", lensAmount: 0.4 },
      // Çorba: evin ortasında kâse; adam diz çöker.
      { at: 143.9, from: v(-1.3, 1.3, 1.5), to: v(-0.9, 1.0, 1.1), look: v(0, 0.6, 0), lookTo: manAt(0, 0.8, 0), fov: 56, curve: "linear", grade: "candle", handheld: 0.02 },
      { at: 148.5, from: manAt(0.9, 1.0, 0.8), to: manAt(0.7, 0.9, 0.6), look: manAt(0, 1.0, 0), lookTo: v(0.2, 0.7, 0.1), fov: 44, curve: "linear", grade: "candle" },
      // Çatal: çorbadan kalkar, dişlerinden çorba akar (yakın plan).
      { at: 152.9, from: v(0.6, 0.8, 1.15), to: v(0.45, 0.72, 0.85), look: v(0.25, 0.6, 0.1), fov: 36, grade: "candle" },
      // Kaçış: tavşan daralan koridorda kazar; içeriden ağza bakınca dalışı görülür.
      { at: 155.8, from: hare(2.4, 1.4, 2.4), to: hare(1.6, 1.0, 1.6), look: hare(0, 0.45, 0), fov: 42, grade: "fever", handheld: 0.02 },
      { at: 160, from: v(-0.4, 0.8, -0.2), to: v(-0.2, 0.75, 0.4), look: v(HOLE.x, 0.5, HOLE.z), fov: 66, grade: "candle", handheld: 0.02 },
      { at: 164, from: hare(2.2, 1.3, 2.0), to: hare(1.6, 0.9, 1.4), look: hare(0, 0.3, 0), fov: 46, grade: "fever" },
      { at: 168.5, from: v(0.7, 0.95, 1.0), to: v(0.5, 0.85, 0.7), look: manAt(0, 0.9, 0), fov: 70, grade: "candle", lens: "scope", lensAmount: 0.4, handheld: 0.02 },
      // Nefes: tek çekim, kesme yok (173,9 → 194,9). Kamera burnunun dibinde; kadraj 62 dereceden 34 dereceye sıkışır.
      { at: 173.9, from: manAt(0.55, 0.85, 0.75), to: manAt(0.28, 0.72, 0.4), look: manAt(0, 0.85, 0), fov: 62, fovTo: 34, curve: "linear", grade: "noir", lens: "scope", lensAmount: 0.7, handheld: 0.015 },
      // Açılış: kamera ağızdan geri geri dışarı, yükselir; bütün kâğıt dev bir kabuğun içinde.
      { at: 194.9, from: manAt(0.3, 0.8, 0.5), path: [v(0, 1.0, 2.2), v(0, 3, 10), v(0, 18, 46)], to: v(0, 70, 150), look: manAt(0, 0.85, 0), lookPath: [v(0, 1.5, 0)], lookTo: v(0, 12, 0), fov: 36, fovTo: 70, curve: "linear", grade: "cold" },
      { at: 199, from: v(0, 44, 110), to: coverFrom, look: v(0, 8, 0), lookTo: coverLook, fov: 60, fovTo: 30, curve: "linear", grade: "dawn" },
    ];
    shots.push(...hurried.shots());
    shots.sort((a, b) => a.at - b.at);
    /** Evin içinde geçen perdeler: anıt gizlenir, kubbe dışarıdan da çizilir; kaplumbağa kabuğuna çekilmiştir. */
    const INSIDE_ACTS = new Set(["ikinci", "corba", "catal", "kacis", "nefes", "durus"]);
    const SOUP_ACTS = new Set(["corba", "catal", "kacis", "nefes", "durus", "acilis", "son"]);
    const BREATH_ACTS = new Set(["nefes", "durus", "acilis", "son"]);
    /** Evdeki adamın perdeye göre duruşu, yeri (2,8 m'lik eve göre) ve yönü. */
    const MAN_STAGE: Record<string, { pose: FigurePose; x: number; z: number; yaw: number }> = {
      sit: { pose: "sit", x: 0.55, z: -0.35, yaw: Math.atan2(-2.3, -0.15) },
      push: { pose: "push", x: 2.3, z: -0.3, yaw: Math.atan2(2.3, -0.3) },
      tired: { pose: "tired", x: 0.55, z: -0.35, yaw: 0 },
      kneel: { pose: "kneel", x: -1.5, z: 0.9, yaw: Math.atan2(1.5, -0.9) },
      crouch: { pose: "tired", x: -1.5, z: 0.9, yaw: Math.atan2(1.5, -0.9) },
    };
    const MAN_ACT: Record<string, string> = { sikisma: "push", akis: "push", ikinci: "tired", corba: "kneel", catal: "kneel", kacis: "kneel", nefes: "crouch", durus: "crouch", acilis: "crouch", son: "crouch" };

    const logic: WorldLogic = {
      ground: () => (tunnels.current ? tunnels.floor() : 0),
      debug: { rabbit, quiz, hurried, universe, shellHome },
      shots: () => shots,
      use: () => {
        if (shell || tunnels.current) return false;
        paintAtAim();
        return true;
      },
      surface: "sand",
      startHint: "Tavşanın elinde plak var. Havuçla vur ya da C ile kabuğuna çekilip bekle.",
      coverPoint: {
        stand: { x: 2, z: 27 },
        camera: { position: new THREE.Vector3(COVER.x, COVER.y, COVER.z), target: new THREE.Vector3(COVER.x, COVER.y, 0), fov: 30 },
        // Kapak pozu: tavşan figürün sağında, sırtı dönük, havada.
        onEnter: () => void (posing = true),
        onExit: () => void (posing = false),
      },
      prompt: () => {
        if (tunnels.current) return null;
        if (tunnels.mouthNear(player.position.x, player.position.z, 2.4) && !shell) return [{ key: "C", label: "Tavşan deliğine gir — dar tünel" }];
        if (shell) return [{ key: "C", label: "Kabuktasın · bırakınca çıkarsın" }];
        // Boya istemi yalnızca yere bakarken: sürekli ekranda duran bir düğme olmasın.
        camera.getWorldDirection(aim);
        return aim.y < -0.25 ? [{ key: "E", label: "Boya damlat" }] : null;
      },
      onPickup(picked) {
        if (picked !== record) return;
        followMusic();
        rabbit.release(listenSpot);
        stealCooldown = 6;
      },
      onTrack(track) {
        if (!track) timeline.reset();
      },
      onFinale() {
        finaleTime = 0;
        return 8;
      },
      onFinaleDone() {
        finaleTime = -1;
      },
      update(dt, time) {
        quiz.update(dt, time);
        ebru.uTime.value = time;
        sky.position.copy(camera.position);
        travelled += Math.hypot(player.position.x - lastX, player.position.z - lastZ);
        lastX = player.position.x;
        lastZ = player.position.z;
        if (travelled > 3.2 && !shell && !tunnels.current) {
          travelled = 0;
          dropPaint(player.position.x, player.position.z, 1.2 + random() * 0.6);
        }
        dust.update(dt, camera.position);

        // Delik: C ile ya da ağzın tam üstüne basınca içeri kayılır.
        const wantsShell = input.isDown("KeyC");
        if (!tunnels.current) {
          const mouth = tunnels.mouthNear(player.position.x, player.position.z, wantsShell && !shell ? 2.4 : 0.8);
          if (mouth) enterTunnel(mouth);
        }
        camera.getWorldDirection(forward);
        const exited = tunnels.update(dt, player, forward, input.moveAxis().y, lantern);
        if (exited) {
          inHand.visible = true;
          sfx.cue("whoosh");
          hud.hint("Tünelden çıktın. Yavaş ama kararlı.", 3.5);
        }
        // Yer altında gün ışığı söner, fener ve toprak kokusu kalır; evren karardıkça ışık da azalır.
        const under = tunnels.depth;
        hemi.intensity = 1.3 * (1 - under * 0.85) * (1 - universe.dark * 0.7);
        sun.intensity = 2.4 * (1 - under * 0.95) * (1 - universe.dark * 0.6);

        if (!tunnels.current) {
          shell = wantsShell;
          shellAmount = approach(shellAmount, shell ? 1 : 0, 6, dt);
          player.speedScale = 1 - shellAmount;
          player.options.eyeHeight = 1.7 - shellAmount * 1.1;
          // Havuç sinemada görünmez (kadrajın köşesinde el kalmasın).
          inHand.visible = shellAmount < 0.5 && !ctx.cinema;
        }
        runtime.grade.uVignette.value = 0.32 + shellAmount * 0.9 + under * 0.28 + squeeze * 0.3;
        sfx.setAmbience(under > 0.5 ? "room" : "desert", under > 0.5 ? 0.5 : 0.8 - shellAmount * 0.6);

        // Şarkının saniyesi: dizeler kâğıda damlar, duvarlar daralır, kaplumbağa çekilir.
        // Klip kapalıyken (songTime -1) şarkı çalsa da kâğıt kapaktaki hâlinde kalır.
        const songTime = ctx.songTime();
        const playing = music.state === "playing" && music.track !== null && songTime >= 0;
        if (playing) for (const beat of timeline.update(songTime)) {
          if (beat.id === "damla") {
            // Üç damla: kaplumbağanın çevresine üç büyük boya damlası.
            for (let k = 0; k < 3; k += 1) {
              const a = (k / 3) * Math.PI * 2 + random();
              dropPaint(Math.cos(a) * 9, Math.sin(a) * 9, 7);
            }
          }
        }
        const act = playing ? (timeline.current?.id ?? "bos") : "";

        // Tavşan: kapak pozu, klipteki rolü ya da kendi aklı.
        if (posing) {
          rabbit.root.visible = true;
          rabbit.root.position.set(3.9, 4.4 + Math.sin(time * 3) * 0.05, 0);
          rabbit.root.rotation.y = Math.PI;
          rabbit.root.scale.setScalar(1.5);
        } else {
          rabbit.root.scale.setScalar(1);
          const inFilm = playing && rabbit.state === "free" && !["", "bos", "ev"].includes(act);
          if (inFilm) scriptStart();
          else if (!playing || act === "") scriptEnd();
          if (script !== "none") updateScript(dt, time, act);
          else {
            rabbit.update(dt, time, player.position, shell && shellAmount > 0.8);
            if (rabbit.state === "free") followMusic();
          }
        }
        clipMound.visible = ["dig", "down", "hidden", "up", "toSeat", "seated"].includes(script);
        // Tavşan plağı kapar: raftan (sen uzaktayken), yerden (bırakılmışsa) ya da elinden (arkandan, sen
        // dururken). Gramofona takılı plağa dokunamaz. Kaptığında kovalamaca yeniden başlar.
        stealCooldown -= dt;
        const grabbed = (where: string) => {
          record.pickable = false;
          sfx.cue("throw");
          hud.hint(`Tavşan plağı ${where} kaptı! Havuçla vur ya da kabuğuna çekilip bekle.`, 5);
        };
        if (rabbit.state === "free" && script === "none" && !tunnels.current && !posing && !shell && stealCooldown <= 0 && !noSteal) {
          const far = (x: number, z: number) => Math.hypot(player.position.x - x, player.position.z - z);
          if (record.state === "collected") {
            record.group.getWorldPosition(shelfSpot);
            if (far(shelfSpot.x, shelfSpot.z) > 9) {
              stealCooldown = 24;
              hud.hint("Tavşan rafa göz dikti…", 3);
              // Hedef rafın önü: kitaplık katıdır, tavşan içine giremez.
              records.shelf.root.getWorldQuaternion(shelfTurn);
              shelfFront.set(0, 0, 1).applyQuaternion(shelfTurn).setY(0).normalize().multiplyScalar(1.1).add(shelfSpot);
              rabbit.steal(shelfFront, () => {
                if (record.state !== "collected") return; // bu arada raftan alındıysa eli boş döner
                records.drop(record, shelfSpot.x, shelfSpot.y, shelfSpot.z);
                grabbed("raftan");
              });
            }
          } else if (record.state === "world" && record.pickable) {
            // Yere bırakılmış (atılmış) plak: sen 3,5 m'den uzaktaysan hemen koşup alır.
            if (far(record.group.position.x, record.group.position.z) > 3.5) {
              stealCooldown = 14;
              hud.hint("Tavşan yerdeki plağa göz dikti…", 3);
              rabbit.steal(record.group.position, () => {
                if (record.state !== "world" || !record.pickable) return;
                grabbed("yerden");
              });
            }
          } else if (record.state === "held" && records.held === record) {
            // Elindeki plak: sen 4 saniyedir duruyorsan arkandan sokulup kapar (yüzünü dönersen kaçar).
            stillFor = player.speed() < 0.3 ? stillFor + dt : 0;
            if (stillFor > 4 && far(rabbit.root.position.x, rabbit.root.position.z) < 16) {
              stealCooldown = 30;
              stillFor = 0;
              hud.hint("Arkanda bir hışırtı…", 3);
              rabbit.steal(behindPlayer(), () => {
                if (record.state !== "held" || records.held !== record) return;
                records.drop(record, player.position.x, 0, player.position.z);
                grabbed("elinden");
              }, true);
            }
          } else stillFor = 0;
        }
        // Plak bu arada gramofona takıldıysa kapma biter: tavşan oturmaya döner.
        if (rabbit.state === "steal" && record.state === "placed") rabbit.release(rabbit.root.position);
        if (rabbit.state === "steal" && record.state === "held") {
          // Oyuncu kıpırdarsa arkası da kayar; tavşana dönerse ürküp kaçar.
          rabbit.retarget(behindPlayer());
          camera.getWorldDirection(forward);
          toRabbit.copy(rabbit.root.position).sub(player.position).setY(0);
          if (toRabbit.length() < 6 && forward.dot(toRabbit.normalize()) > 0.35) {
            rabbit.release(rabbit.root.position);
            stealCooldown = 20;
            hud.hint("Tavşan yakalandığını anlayıp kaçtı.", 3);
          }
        }
        if (record.state === "world" && rabbit.state !== "free" && rabbit.state !== "steal") {
          rabbit.hands.getWorldPosition(handWorld);
          record.group.position.copy(handWorld);
          record.pickable = rabbit.state === "dizzy";
          record.group.visible = rabbit.root.visible;
        } else if (record.state === "world") {
          // Yerde duran plak (tavşanın elinde değil): E ile alınır.
          record.pickable = true;
          record.group.visible = true;
        }

        // Kazılan toprak parçaları.
        for (const clod of clods) {
          if (clod.life <= 0) continue;
          clod.life -= dt;
          clod.velocity.y -= 12 * dt;
          clod.mesh.position.addScaledVector(clod.velocity, dt);
          clod.mesh.rotation.x += dt * 9;
          if (clod.mesh.position.y < 0.04 || clod.life <= 0) {
            clod.life = 0;
            clod.mesh.visible = false;
          }
        }

        // Havuçlar.
        inHand.position.z = approach(inHand.position.z, -0.62, 8, dt);
        for (let i = carrots.length - 1; i >= 0; i -= 1) {
          const carrot = carrots[i];
          carrot.life -= dt;
          carrot.velocity.y -= 12 * dt;
          carrot.mesh.position.addScaledVector(carrot.velocity, dt);
          carrot.mesh.rotation.x += dt * 10;
          if (rabbit.hitTest(carrot.mesh.position)) {
            rabbit.hit();
            sfx.cue("hit");
            hud.hint(rabbit.state === "dizzy" ? "Tavşan sersemledi — hemen plağı kap (E)" : "İsabet!", 2);
            carrot.life = 0;
          }
          if (carrot.mesh.position.y < 0.05) {
            carrot.mesh.position.y = 0.05;
            carrot.velocity.set(0, 0, 0);
          }
          if (carrot.life <= 0) {
            scene.remove(carrot.mesh);
            carrots.splice(i, 1);
          }
        }

        hurried.update(dt, time, act, playing, songTime);
        // Evren daralır: duvar yok; kâğıdın ötesindeki karanlık yaklaşır, gök ve sis onunla kapanır. Açılışta
        // kâğıt geri gelir ve bütün dünyayı saran dış kabuk belirir.
        universe.update(dt, time, playing ? (RADIUS_TARGET[act] ?? UNIVERSE_FAR) : UNIVERSE_FAR, sky, fog, act === "acilis" ? 1 : 0);
        squeeze = 1 - THREE.MathUtils.clamp(universe.radius / UNIVERSE_FAR, 0, 1);
        // Kabuğun içi: kamera kubbenin içindeyken ya da iç perdelerde ev görünür, anıt gizlenir (kamera anıtın
        // içinde kalmasın diye anında). Kubbe daralması perdeden perdeye artar, film bitince açılır.
        const camDist = Math.hypot(camera.position.x, camera.position.z);
        // "İkinci ev"in ilk saniyelerinde kaplumbağa hâlâ dışarıda (kabuğuna çekilirken görülür); kamera ağza girince ev.
        const insideAct = INSIDE_ACTS.has(act) && !(act === "ikinci" && songTime < 139.2);
        const camInside = camDist < shellHome.radius - 0.05 && camera.position.y < 2.7;
        const homeWanted = playing && (insideAct || (camInside && act !== "bos"));
        homeLevel = approach(homeLevel, homeWanted ? 1 : 0, 8, dt);
        statue.visible = !homeWanted;
        if (!playing) squeezeGoal = 0;
        else if (SQUEEZE_TARGET[act] !== undefined) squeezeGoal = SQUEEZE_TARGET[act];
        const stage = MAN_STAGE[MAN_ACT[act] ?? "sit"];
        shellHome.pose = stage.pose;
        shellHome.place.x = stage.x;
        shellHome.place.z = stage.z;
        shellHome.yaw = stage.yaw;
        shellHome.soup = SOUP_ACTS.has(act) ? 1 : 0;
        shellHome.breath = BREATH_ACTS.has(act) ? 1 : 0;
        shellHome.update(dt, time, homeWanted ? 1 : 0, squeezeGoal, camInside || insideAct);
        flowBoost = approach(flowBoost, act === "akis" ? 1 : 0, 1, dt);
        seeds.level = playing ? 0.85 : 0.3;
        seeds.update(time, layerCenter);
        petals.level = approach(petals.level, act === "damla" || act === "daralma" ? 1 : 0, 0.7, dt);
        petalMaterial.color.setHSL(0.02 + ((time * 0.03) % 0.12), 0.7, 0.55);
        petals.update(time, layerCenter);
        // Kırlangıçlar kâğıdın içinde kalır: yörünge yarıçapı karanlığa göre küçülür.
        swallowLevel = approach(swallowLevel, flowBoost > 0.3 ? 1 : 0, 0.9, dt);
        const swallowR = Math.min(9, universe.radius - 4);
        swallows.forEach((flyer, i) => {
          const angle = time * (1.2 + (i % 3) * 0.2) + i * 0.63;
          const r = Math.max(4, swallowR * (0.7 + (i % 4) * 0.1));
          swallowAt.set(Math.cos(angle) * r, 5 + (i % 3) * 1.4 + Math.sin(time * 2 + i) + (1 - swallowLevel) * 20, Math.sin(angle) * r);
          flyTo(flyer, swallowAt);
          flap(flyer, time, 14, 0.8);
          flyer.group.visible = swallowLevel > 0.03 && !tunnels.current;
        });
        ebru.uFlow.value = 0.05 + flowBoost * 0.45;
        ebru.uWarp.value = 2.2 + flowBoost * 1.6;
        if (!shell && !tunnels.current) player.speedScale = 1 - flowBoost * 0.45;
        // Kaplumbağa kabuğuna çekilir: anıt kâğıda gömülür, renkler solar; açılışta geri çıkar.
        sink = approach(sink, insideAct ? 1 : 0, insideAct ? 0.8 : 0.4, dt);
        statue.position.y = -sink * 1.6;
        runtime.grade.uSaturation.value = approach(runtime.grade.uSaturation.value, 1.15 - sink * 0.4 - squeeze * 0.25, 1, dt);

        // Final: tavşan gramofonun yanında dinler, kâğıt sıcak renklere açılır.
        if (finaleTime >= 0) {
          finaleTime += dt;
          ebru.uInk.value.lerp(new THREE.Color("#d24a26"), dt * 0.3);
        }
      },
    };
    if (import.meta.env.DEV) Object.assign(logic, { tunnels, rabbit });
    return logic;
  },
};
