import * as THREE from "three";
import { WORLD } from "../config/config";

/**
 * GRAMOFON — Redd · Mükemmel Boşluk birebir port'u, Kuantum sahnesine
 * uyarlandı (sahne sarısı palette ile uyumlu pirinç tonları korunur).
 *
 * Yerleşim kuralı:
 *  - Model root'u YERİN ÜSTÜNE oturur. Geometrik tabanı y=0; bu yüzden
 *    `root.position.y = groundHeight + GROUND_PADDING` kullanılır.
 *
 * State makinesi:
 *  - "placed": sahnede durur. E → plak tak / al. Q → taşımaya al.
 *  - "carried": kameraya bağlı (camera.add(root)) — gerçekten oyuncunun
 *    elinde "tutulur" gibi görünür.
 *
 * Taşıma:
 *  - cam.add ile kameraya parent edilir → her durumda doğru render edilir.
 *  - Bırakırken 3-nokta height sampling ile zemine doğru yerleşim.
 */
const GROUND_PADDING = 0.02;

export type GramophoneState = "placed" | "carried";

export interface GramophoneHandle {
  root: THREE.Group;
  state: GramophoneState;
  /** Gramofonun XZ konumu (canlı; placed iken anlık zemin xz). */
  position: { x: number; z: number };
  /** Plak tablasının world-space merkezi (vinyl yerleştirme noktası). */
  platterWorld(target: THREE.Vector3): THREE.Vector3;
  /** Plak takılı mı? (sadece görsel mini-disc'i toggle eder; ses panelden gelir.) */
  setActive(active: boolean): void;
  carried: boolean;
  /** Y/E toggle: taşımaya başla veya yere bırak. */
  setCarried(
    carried: boolean,
    cam: THREE.Camera,
    getHeightAt: (x: number, z: number) => number,
  ): void;
  update(time: number, delta: number, getHeightAt: (x: number, z: number) => number): void;
}

export interface GramophoneOptions {
  scene: THREE.Scene;
  position: { x: number; z: number };
  yaw: number;
}

export function createGramophone(options: GramophoneOptions): GramophoneHandle {
  const { scene } = options;
  const root = new THREE.Group();
  root.name = "kd-gramophone";
  root.position.set(options.position.x, 0, options.position.z);
  root.rotation.y = options.yaw;
  /** Boyut: Redd ölçüsü (0.78m baz) küçük; sahnede iyi okunsun diye 1.15x. */
  root.scale.setScalar(1.15);

  /** ── Materyaller ─────────────────────────────────────────────── */
  const woodDark = new THREE.MeshStandardMaterial({
    color: "#1d110a", roughness: 0.8, metalness: 0.08,
  });
  const woodMid = new THREE.MeshStandardMaterial({
    color: "#3a2018", roughness: 0.72, metalness: 0.1,
  });
  const woodGrain = new THREE.MeshStandardMaterial({
    color: "#4a2a1e", roughness: 0.7, metalness: 0.08,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#cc9e52", roughness: 0.26, metalness: 0.85,
    emissive: "#1e1204", emissiveIntensity: 0.12,
  });
  const brassDark = new THREE.MeshStandardMaterial({
    color: "#825a2a", roughness: 0.4, metalness: 0.8,
  });
  const matte = new THREE.MeshStandardMaterial({
    color: "#0f0f12", roughness: 0.86, metalness: 0.14,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: "#18181c", roughness: 0.48, metalness: 0.35,
  });

  /** ── Alt kaide (koyu ahşap kutu) — taban tam y=0 ─────────────── */
  const baseLower = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.14, 0.6), woodDark);
  baseLower.position.y = 0.07;
  root.add(baseLower);

  const baseUpper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.52), woodMid);
  baseUpper.position.y = 0.18;
  root.add(baseUpper);

  const topPanel = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.008, 0.48), woodGrain);
  topPanel.position.y = 0.224;
  root.add(topPanel);

  /** Pirinç çerçeveler. */
  const frameGeo = new THREE.BoxGeometry(0.8, 0.012, 0.62);
  const frameTop = new THREE.Mesh(frameGeo, brassDark);
  frameTop.position.y = 0.146;
  root.add(frameTop);
  const frameBottom = new THREE.Mesh(frameGeo, brassDark);
  frameBottom.position.y = 0.008;
  root.add(frameBottom);

  /** HENRY THE LEE pirinç plaket — ön yüzde. */
  const plaqueTex = createPlaqueTexture();
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.065),
    new THREE.MeshStandardMaterial({
      map: plaqueTex, color: "#d3a45a",
      roughness: 0.3, metalness: 0.7,
      emissive: "#1a0e04", emissiveIntensity: 0.15,
    }),
  );
  plaque.position.set(0, 0.12, 0.301);
  root.add(plaque);

  /** Ayaklar — küçük pirinç silindirler. */
  const footGeo = new THREE.CylinderGeometry(0.028, 0.038, 0.032, 12);
  for (const [x, z] of [[0.32, 0.24], [-0.32, 0.24], [0.32, -0.24], [-0.32, -0.24]]) {
    const foot = new THREE.Mesh(footGeo, brassDark);
    foot.position.set(x, 0.016, z);
    root.add(foot);
  }

  /** ── Platter — dönen tabla ─────────────────────────────────── */
  const platterGroup = new THREE.Group();
  platterGroup.position.y = 0.236;
  root.add(platterGroup);

  const platter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.018, 64),
    plateMat,
  );
  platterGroup.add(platter);

  /** Sarı keçe (felt mat) — Henry sarı paletine çevrildi. */
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.004, 48),
    new THREE.MeshStandardMaterial({
      color: "#c19a18", roughness: 0.92, metalness: 0,
    }),
  );
  felt.position.y = 0.012;
  platterGroup.add(felt);

  /** Spindle (merkez mili). */
  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.03, 12),
    brass,
  );
  spindle.position.y = 0.026;
  platterGroup.add(spindle);

  /**
   * Mini "gerçekten plak takılı" görüntüsü — ayrı slot. Plak elden
   * yerleştirildiğinde discSlot.add(buildDiscMesh()) ile küçük plak çıkar.
   * Dışarıdaki büyük vinyl mesh'i `vinyl.setMode("onPlatter")` zaten platter
   * üstüne kilitliyor; bu mini-disc güvence katmanı için: vinyl yokken
   * gramofon "boş" hissediyor olmasın.
   */
  const discSlot = new THREE.Group();
  discSlot.name = "gramophone:discSlot";
  discSlot.position.y = 0.014;
  platterGroup.add(discSlot);

  /** ── Tonearm: pivot kaidesi + kol + cartridge ────────────────── */
  const armBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.054, 16), brass,
  );
  armBase.position.set(0.28, 0.26, 0.22);
  root.add(armBase);

  const armRotGroup = new THREE.Group();
  armRotGroup.position.copy(armBase.position);
  armRotGroup.rotation.y = -0.95;
  root.add(armRotGroup);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.014, 0.016), brass);
  arm.position.set(-0.19, 0.02, 0);
  armRotGroup.add(arm);

  const cartridge = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.024, 0.046), matte);
  cartridge.position.set(-0.37, 0.008, 0);
  armRotGroup.add(cartridge);

  /** ── HORN: klasik pirinç trompet ─────────────────────────────── */
  const horn = new THREE.Mesh(
    new THREE.ConeGeometry(0.23, 0.6, 32, 1, true), brass,
  );
  horn.position.set(-0.34, 0.6, -0.04);
  horn.rotation.z = Math.PI / 2.05;
  horn.rotation.y = Math.PI / 14;
  root.add(horn);

  /** Boğaz (bent neck). */
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.056, 0.14, 16), brassDark,
  );
  neck.position.set(-0.08, 0.34, -0.02);
  neck.rotation.z = Math.PI / 3.8;
  root.add(neck);

  /** Horn ağız çemberi. */
  const hornMouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.016, 14, 32), brass,
  );
  hornMouth.position.set(-0.62, 0.62, -0.045);
  hornMouth.rotation.y = Math.PI / 2;
  root.add(hornMouth);

  /** Horn iç gölgesi. */
  const hornInside = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.5, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color: "#3a2008", roughness: 0.9, metalness: 0.25, side: THREE.BackSide,
    }),
  );
  hornInside.position.copy(horn.position);
  hornInside.rotation.copy(horn.rotation);
  root.add(hornInside);

  /** "Çalıyor" sıcak nokta ışığı. */
  const activeGlow = new THREE.PointLight("#ffb97a", 0, 2.4, 2);
  activeGlow.position.set(0, 0.5, 0);
  root.add(activeGlow);

  scene.add(root);

  /** ── State ───────────────────────────────────────────────────── */
  const state = { state: "placed" as GramophoneState, active: false };
  let platterRot = 0;
  let platterSpeed = 0;
  const targetPlatterSpeed = 2.2;
  let mechStartPhase = 0;
  const mechJitterSeed = Math.random() * Math.PI * 2;

  const livePos = { x: options.position.x, z: options.position.z };
  const limit = WORLD.half - 4;
  let smoothY = 0;

  /** Kameradaki "el" offseti — Redd'deki ile aynı. */
  const carriedOffset = new THREE.Vector3(0.3, -0.5, -0.92);
  const carriedEuler = new THREE.Euler(-0.28, 0.24, 0.04);

  const tempVec = new THREE.Vector3();
  const sampleA = new THREE.Vector3();
  const sampleB = new THREE.Vector3();
  const sampleC = new THREE.Vector3();
  const surfaceNormal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const qAlign = new THREE.Quaternion();

  function buildMiniDisc(): THREE.Group {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.195, 0.195, 0.006, 56),
      new THREE.MeshStandardMaterial({
        color: "#060608", roughness: 0.28, metalness: 0.5,
      }),
    );
    g.add(disc);
    for (let i = 0; i < 5; i += 1) {
      const r = 0.06 + i * 0.026;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.0018, 6, 48),
        new THREE.MeshStandardMaterial({
          color: "#1a1a1e", roughness: 0.9, metalness: 0.1,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.0032;
      g.add(ring);
    }
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.068, 0.0075, 32),
      new THREE.MeshStandardMaterial({
        color: "#c19a18", roughness: 0.55, metalness: 0.05,
        emissive: "#3a2a04", emissiveIntensity: 0.3,
      }),
    );
    label.position.y = 0.0042;
    g.add(label);
    return g;
  }

  function setActive(active: boolean): void {
    if (state.active === active) return;
    state.active = active;
    while (discSlot.children.length > 0) discSlot.remove(discSlot.children[0]);
    if (active) {
      discSlot.add(buildMiniDisc());
      activeGlow.intensity = 0.45;
      platterSpeed = 0;
      mechStartPhase = 1;
    } else {
      activeGlow.intensity = 0;
      mechStartPhase = 0;
    }
  }

  function placeOnGround(
    x: number, z: number,
    getHeightAt: (x: number, z: number) => number,
  ): void {
    const eps = 0.42;
    const hA = getHeightAt(x, z);
    const hB = getHeightAt(x + eps, z);
    const hC = getHeightAt(x, z + eps);
    sampleA.set(x, hA, z);
    sampleB.set(x + eps, hB, z).sub(sampleA);
    sampleC.set(x, hC, z + eps).sub(sampleA);
    surfaceNormal.crossVectors(sampleC, sampleB).normalize();
    if (surfaceNormal.y < 0) surfaceNormal.multiplyScalar(-1);
    const slopeDot = Math.max(0, Math.min(1, surfaceNormal.dot(up)));
    const alignmentStrength = slopeDot < 0.82 ? 0.3 : 0.65;
    qAlign
      .setFromUnitVectors(up, surfaceNormal)
      .slerp(new THREE.Quaternion(), 1 - alignmentStrength);
    root.quaternion.copy(qAlign);
    root.position.set(x, hA + GROUND_PADDING, z);
    livePos.x = x;
    livePos.z = z;
    smoothY = hA;
  }

  return {
    root,
    get state() { return state.state; },
    get position() { return livePos; },
    get carried() { return state.state === "carried"; },
    setActive,
    platterWorld(target) {
      target.set(0, 0, 0);
      platterGroup.localToWorld(target);
      return target;
    },
    setCarried(next, cam, getHeightAt) {
      if (next && state.state === "placed") {
        scene.remove(root);
        cam.add(root);
        root.position.copy(carriedOffset);
        root.rotation.copy(carriedEuler);
        root.scale.setScalar(1.15);
        state.state = "carried";
      } else if (!next && state.state === "carried") {
        cam.remove(root);
        scene.add(root);
        const forward = new THREE.Vector3(0, 0, -1);
        cam.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 1e-4) forward.set(0, 0, -1);
        forward.normalize();
        tempVec.copy(cam.position).addScaledVector(forward, 1.55);
        const tx = Math.max(-limit, Math.min(limit, tempVec.x));
        const tz = Math.max(-limit, Math.min(limit, tempVec.z));
        placeOnGround(tx, tz, getHeightAt);
        const yaw = Math.atan2(-forward.x, -forward.z);
        root.rotateY(yaw);
        state.state = "placed";
      }
    },
    update(time, delta, getHeightAt) {
      /** Platter dinamiği — Redd'deki gibi yumuşak kalkış + ufak jitter. */
      if (state.active) {
        const k = 1 - Math.exp(-1.8 * delta);
        platterSpeed += (targetPlatterSpeed - platterSpeed) * k;
        if (mechStartPhase > 0.001) {
          mechStartPhase *= Math.exp(-0.85 * delta);
          const jitter = Math.sin(time * 9.0 + mechJitterSeed) * mechStartPhase * 0.35;
          platterRot += (platterSpeed + jitter) * delta;
        } else {
          platterRot += platterSpeed * delta;
        }
      } else {
        platterSpeed *= Math.exp(-2.4 * delta);
        platterRot += platterSpeed * delta;
      }
      platter.rotation.y = platterRot;
      felt.rotation.y = platterRot;
      discSlot.rotation.y = platterRot;

      /** Tonearm hafif içe döner. */
      const targetArmRot = state.active ? -1.25 : -0.95;
      armRotGroup.rotation.y += (targetArmRot - armRotGroup.rotation.y) * Math.min(1, delta * 2);

      if (state.state === "carried") {
        /** Yürüme sallantısı — jittersiz. */
        const bobAmp = 0.012;
        const sway = Math.sin(time * 6.0) * bobAmp;
        const lift = Math.abs(Math.sin(time * 12.0)) * bobAmp * 0.6;
        root.position.x = carriedOffset.x + sway * 0.4;
        root.position.y = carriedOffset.y + lift;
        root.position.z = carriedOffset.z + sway * 0.15;
      } else {
        const targetY = getHeightAt(livePos.x, livePos.z);
        smoothY = smoothY + (targetY - smoothY) * (1 - Math.exp(-delta * 8));
        root.position.x = livePos.x;
        root.position.z = livePos.z;
        root.position.y = smoothY + GROUND_PADDING;
      }
    },
  };
}

/** Pirinç plaket — HENRY THE LEE / KUANTUM DOLANIKLIK metni. */
function createPlaqueTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 256, 64);
    grad.addColorStop(0, "#8c6a2a");
    grad.addColorStop(0.5, "#d9b170");
    grad.addColorStop(1, "#8c6a2a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#2a1805";
    ctx.font = "700 26px 'Inter', 'Helvetica Neue', Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("HENRY THE LEE", 128, 26);
    ctx.font = "500 11px 'Inter', Arial";
    ctx.fillText("KUANTUM DOLANIKLIK", 128, 50);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
