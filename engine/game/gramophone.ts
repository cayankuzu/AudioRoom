import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createGroundGlow, createLightShaft } from "../fx/lightShaft";

export type PlinthStyle = "wood" | "stone" | "none";

export type GramophoneSpot = "stand" | "carried" | "ground";

export interface Gramophone {
  /** Sehpa, kaide ve (sehpadayken) gramofonun kendisi. */
  readonly root: THREE.Group;
  /** Taşınan ya da yere konan gramofonun sahnedeki kabı (sahneye eklenmeli). */
  readonly loose: THREE.Group;
  /** Gramofon nerede: sehpasında, oyuncunun kucağında ya da başka bir yerde yerde. */
  readonly spot: GramophoneSpot;
  /** Plağın oturduğu nokta (tabla üstü). */
  readonly platter: THREE.Group;
  readonly playing: boolean;
  /** scale: açık alanlarda uzaktan okunması için gramofon büyütülebilir. */
  place(x: number, y: number, z: number, yaw: number, scale?: number): void;
  setRecord(record: THREE.Object3D | null): void;
  setPlaying(playing: boolean): void;
  /** Oyuncu elinde plakla yaklaşınca tabla hafifçe parlar. */
  setInviting(inviting: boolean): void;
  /** Uzaktan yer gösteren altın huzme (0..1); elde plak varken dünya açar. */
  setBeacon(level: number): void;
  setBeaconStyle(color: THREE.ColorRepresentation, additive: boolean): void;
  update(dt: number, time: number): void;
  worldPosition(target: THREE.Vector3): THREE.Vector3;
  /** Gramofonun zemindeki yeri (sehpa ya da konduğu nokta; taşınırken kucaktaki yerin izdüşümü). */
  basePosition(target: THREE.Vector3): THREE.Vector3;
  /** Sehpadan kaldırır: gramofon kucağa alınır (çalıyorsa çalmaya devam eder). */
  carry(): void;
  /** Taşınırken kucaktaki konumu (dünya) ve yönü. */
  hold(position: THREE.Vector3, yaw: number): void;
  /** Bir noktaya bırakır; sehpasına yakınsa yerine oturur. true: sehpasına döndü. */
  setDown(x: number, y: number, z: number, yaw: number): boolean;
}

const BRASS = () =>
  new THREE.MeshStandardMaterial({ color: "#c79a45", metalness: 1, roughness: 0.3 });

/** Vernikli ceviz ağacı dokusu (prosedürel). */
function woodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#4a2716";
  g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 180; i += 1) {
    const y = Math.random() * 256;
    const wave = 4 + Math.random() * 10;
    g.strokeStyle = `rgba(${30 + Math.random() * 40}, ${14 + Math.random() * 16}, ${6 + Math.random() * 8}, ${0.25 + Math.random() * 0.35})`;
    g.lineWidth = 0.6 + Math.random() * 2.2;
    g.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      g.lineTo(x, y + Math.sin(x * 0.012 + i) * wave);
    }
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

export function createGramophone(plinth: PlinthStyle = "wood", withDais = true): Gramophone {
  const root = new THREE.Group();
  root.name = "gramophone";
  const brass = BRASS();
  const wood = new THREE.MeshPhysicalMaterial({
    map: woodTexture(),
    roughness: 0.42,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
  });

  let baseY = 0;
  if (plinth !== "none") {
    const stand = new THREE.Group();
    if (plinth === "wood") {
      const top = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.05, 0.62, 3, 0.012), wood);
      top.position.y = 0.76;
      stand.add(top);
      const legGeo = new THREE.CylinderGeometry(0.022, 0.016, 0.74, 12);
      for (const [x, z] of [[-0.3, -0.25], [0.3, -0.25], [-0.3, 0.25], [0.3, 0.25]]) {
        const leg = new THREE.Mesh(legGeo, wood);
        leg.position.set(x, 0.37, z);
        stand.add(leg);
      }
    } else {
      const stone = new THREE.MeshStandardMaterial({ color: "#2b2b2e", roughness: 0.92 });
      const block = new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.78, 0.56, 3, 0.04), stone);
      block.position.y = 0.39;
      stand.add(block);
    }
    stand.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    root.add(stand);
    baseY = 0.785;
    stand.position.y = 0.07;
  }

  // Sahne: gramofonun durduğu, pirinç kenarlı alçak yuvarlak kaide — uzaktan bir "yer" olarak okunur.
  const daisMaterial = plinth === "wood"
    ? new THREE.MeshPhysicalMaterial({ color: "#2a1810", roughness: 0.5, clearcoat: 0.4 })
    : new THREE.MeshStandardMaterial({ color: "#1b1b1d", roughness: 0.85 });
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.12, 0.07, 64), daisMaterial);
  dais.position.y = 0.035;
  dais.receiveShadow = true;
  const daisRim = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.012, 8, 96), brass);
  daisRim.rotation.x = Math.PI / 2;
  daisRim.position.y = 0.07;
  if (withDais) root.add(dais, daisRim);

  const body = new THREE.Group();
  const bodyRestY = baseY + 0.07;
  body.position.y = bodyRestY;
  root.add(body);
  const loose = new THREE.Group();
  loose.name = "gramophone-loose";
  let spot: GramophoneSpot = "stand";

  const cabinet = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.17, 0.46, 4, 0.018), wood);
  cabinet.position.y = 0.085;
  body.add(cabinet);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.012, 0.47), brass);
  trim.position.y = 0.168;
  body.add(trim);
  for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), brass);
    foot.position.set(x, 0.006, z);
    body.add(foot);
  }

  // Tabla: metal disk + keçe.
  const platter = new THREE.Group();
  platter.position.set(-0.03, 0.18, 0.02);
  body.add(platter);
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.162, 0.162, 0.012, 64),
    new THREE.MeshStandardMaterial({ color: "#2a2a2c", metalness: 0.8, roughness: 0.35 }),
  );
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.158, 0.158, 0.003, 64),
    new THREE.MeshStandardMaterial({ color: "#5a1417", roughness: 1 }),
  );
  felt.position.y = 0.0075;
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.03, 12), brass);
  spindle.position.y = 0.012;
  platter.add(plate, felt, spindle);
  const recordSlot = new THREE.Group();
  recordSlot.position.y = 0.011;
  platter.add(recordSlot);

  // Kol (tonearm): pivot + kavisli pirinç boru + ses kutusu.
  const armPivot = new THREE.Group();
  armPivot.position.set(0.17, 0.18, -0.16);
  body.add(armPivot);
  const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.04, 20), brass);
  armBase.position.y = 0.02;
  armPivot.add(armBase);
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.045, 0),
    new THREE.Vector3(-0.03, 0.06, 0.08),
    new THREE.Vector3(-0.08, 0.05, 0.19),
    new THREE.Vector3(-0.12, 0.035, 0.24),
  ]);
  const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 24, 0.011, 10), brass);
  armPivot.add(arm);
  const soundbox = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.018, 28), brass);
  soundbox.rotation.z = Math.PI / 2;
  soundbox.position.set(-0.125, 0.03, 0.245);
  armPivot.add(soundbox);
  const diaphragm = new THREE.Mesh(
    new THREE.CircleGeometry(0.03, 28),
    new THREE.MeshStandardMaterial({ color: "#d8cdb4", roughness: 0.6, metalness: 0.2 }),
  );
  diaphragm.rotation.y = Math.PI / 2;
  diaphragm.position.set(-0.115, 0.03, 0.245);
  armPivot.add(diaphragm);

  // Boyun + çiçek biçimli boru (12 yapraklı, düz gölgeli).
  const neckCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.17, 0.2, -0.16),
    new THREE.Vector3(0.2, 0.32, -0.24),
    new THREE.Vector3(0.16, 0.5, -0.26),
    new THREE.Vector3(0.08, 0.62, -0.18),
  ]);
  body.add(new THREE.Mesh(new THREE.TubeGeometry(neckCurve, 32, 0.022, 12), brass));
  const hornProfile: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i += 1) {
    const t = i / 24;
    hornProfile.push(new THREE.Vector2(0.024 + 0.3 * t ** 2.6, t * 0.55));
  }
  const hornMaterial = new THREE.MeshStandardMaterial({
    color: "#c9983f",
    metalness: 1,
    roughness: 0.26,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const horn = new THREE.Mesh(new THREE.LatheGeometry(hornProfile, 12), hornMaterial);
  horn.position.set(0.08, 0.62, -0.18);
  horn.rotation.set(0.55, 0, -0.45);
  body.add(horn);
  const hornLip = new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.008, 8, 48), brass);
  hornLip.rotation.x = Math.PI / 2;
  hornLip.position.y = 0.55;
  horn.add(hornLip);

  // Kurma kolu.
  const crank = new THREE.Group();
  crank.position.set(0.235, 0.09, 0.05);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 8), brass);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.x = 0.035;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.05, 10), wood);
  handle.position.set(0.07, -0.025, 0);
  crank.add(shaft, handle);
  body.add(crank);

  // Davet ışığı: elde plak varken tabla yumuşakça parlar.
  const glow = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.26, 48),
    new THREE.MeshBasicMaterial({ color: "#fff2cf", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.02;
  platter.add(glow);

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child !== glow) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  const beam = createLightShaft("#ffd27a", 26, 0.3);
  const pool = createGroundGlow("#ffd27a", 1.6);
  pool.position.y = 0.08;
  // Huzme ve ışık havuzu gramofonla birlikte gezer (sehpada kalmaz).
  const beacons = new THREE.Group();
  beacons.add(beam.mesh, pool);
  root.add(beacons);
  let beacon = 0;

  const REST_ANGLE = 0.55;
  const PLAY_ANGLE = 0.02;
  armPivot.rotation.y = REST_ANGLE;
  let playing = false;
  let inviting = false;
  let spin = 0;

  const onStand = () => {
    spot = "stand";
    root.add(body, beacons);
    body.position.set(0, bodyRestY, 0);
    body.rotation.set(0, 0, 0);
    beacons.visible = true;
  };

  return {
    root,
    loose,
    platter: recordSlot,
    get spot() {
      return spot;
    },
    get playing() {
      return playing;
    },
    carry() {
      if (spot === "carried") return;
      spot = "carried";
      loose.add(body, beacons);
      body.position.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      beacons.visible = false;
      loose.scale.setScalar(root.scale.x * 0.5);
    },
    hold(position, yaw) {
      loose.position.copy(position);
      loose.rotation.set(0, yaw, 0);
    },
    setDown(x, y, z, yaw) {
      if (Math.hypot(x - root.position.x, z - root.position.z) < 2.2) {
        onStand();
        return true;
      }
      spot = "ground";
      loose.add(body, beacons);
      body.position.set(0, 0, 0);
      beacons.visible = true;
      loose.position.set(x, y, z);
      loose.rotation.set(0, yaw, 0);
      loose.scale.setScalar(root.scale.x);
      return false;
    },
    basePosition(target) {
      return spot === "stand" ? target.copy(root.position) : target.copy(loose.position);
    },
    place(x, y, z, yaw, scale = 1.35) {
      root.position.set(x, y, z);
      root.rotation.y = yaw;
      root.scale.setScalar(scale);
    },
    setRecord(record) {
      recordSlot.clear();
      if (record) {
        record.position.set(0, 0, 0);
        record.rotation.set(0, 0, 0);
        record.scale.setScalar(1);
        recordSlot.add(record);
      }
    },
    setPlaying(next) {
      playing = next;
    },
    setInviting(next) {
      inviting = next;
    },
    setBeacon(level) {
      beacon = level;
    },
    setBeaconStyle(color, additive) {
      beam.setStyle(color, additive);
      const material = pool.material as THREE.ShaderMaterial;
      material.uniforms.uColor.value.set(color);
      material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      material.needsUpdate = true;
    },
    update(dt, time) {
      const target = playing ? 3.46 : 0; // 33⅓ devir/dk
      spin += (target - spin) * Math.min(1, dt * (playing ? 1.4 : 2.2));
      recordSlot.rotation.y -= spin * dt;
      plate.rotation.y = recordSlot.rotation.y;
      const armTarget = playing ? PLAY_ANGLE + Math.sin(time * 0.05) * 0.004 : REST_ANGLE;
      armPivot.rotation.y += (armTarget - armPivot.rotation.y) * Math.min(1, dt * 2.5);
      horn.scale.setScalar(1 + (playing ? Math.sin(time * 12.5) * 0.004 : 0));
      const glowMaterial = glow.material as THREE.MeshBasicMaterial;
      const glowTarget = inviting ? 0.35 + Math.sin(time * 3) * 0.15 : 0;
      glowMaterial.opacity += (glowTarget - glowMaterial.opacity) * Math.min(1, dt * 5);
      crank.rotation.x += spin * dt * 0.2;
      beam.opacity += (beacon * 0.85 - beam.opacity) * Math.min(1, dt * 3);
      beam.update();
      const poolMaterial = pool.material as THREE.ShaderMaterial;
      poolMaterial.uniforms.uOpacity.value = 0.35 + beam.opacity * 0.9;
      poolMaterial.uniforms.uTime.value = time;
    },
    worldPosition(target) {
      return recordSlot.getWorldPosition(target);
    },
  };
}
