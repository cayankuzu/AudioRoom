import * as THREE from "three";

export type GramophoneState = "placed" | "carried";

export interface GramophoneHandle {
  /** Sahnede konumlanmış ya da kameraya bağlı kök. */
  root: THREE.Group;
  state: GramophoneState;
  /** Dünyadaki mevcut konumu (ses referansı için). */
  worldPosition(out: THREE.Vector3): THREE.Vector3;
  /** Dışarı açılmış interactable descriptor — E tuşu algısı. */
  interactTarget: THREE.Mesh;
  /** Plak takılı mı? 0 = yok, 1..12 = canonical order. */
  activeOrder: number;
  /** Plak yerleştir / çıkar. */
  setActive(order: number): void;
  /** Y toggle: taşımaya başla veya yere bırak. */
  toggleCarry(camera: THREE.Camera, getHeightAt: (x: number, z: number) => number): void;
  update(
    time: number,
    delta: number,
    pose: { speed: number; position: THREE.Vector3 },
  ): void;
}

/**
 * GRAMOFON — klasik fonograf.
 *
 * Yerleşim kuralı (çok önemli):
 *  - Model root'u YERİN ÜSTÜNE oturur. Model'in geometrik tabanı y=0'dır,
 *    bu yüzden `root.position.y = groundHeight + GROUND_PADDING` kullanılır.
 *  - `GROUND_PADDING` küçük bir pozitif ofset (0.02m) — z-fight önler
 *    ama "havada" görünmez.
 *
 * State makinesi:
 *  - "placed": sahnede durur. E → plak tak / müzik toggle. Y → taşımaya al.
 *  - "carried": kameraya bağlı. Y → zemine bırak (slope sampling ile).
 *
 * Taşıma davranışı:
 *  - Kameranın altında/önünde hafif sallantı ile tutulur (jittersiz).
 *  - Bırakma noktasında 3-nokta height sampling → doğru yerleşim.
 *  - Aşırı dik yamaçta alignment yumuşatılır → obje doğal görünür.
 */
const GROUND_PADDING = 0.02;

export function createGramophone(
  scene: THREE.Scene,
  camera: THREE.Camera,
  initialPosition: THREE.Vector3,
): GramophoneHandle {
  const root = new THREE.Group();
  root.name = "gramophone";
  root.position.copy(initialPosition);

  /** Model hafifçe daha görkemli — oyuncunun gözüne çarpsın. */
  root.scale.setScalar(1.15);

  /** --- MATERYALLER --- */
  const woodDark = new THREE.MeshStandardMaterial({
    color: "#1d110a",
    roughness: 0.8,
    metalness: 0.08,
  });
  const woodMid = new THREE.MeshStandardMaterial({
    color: "#3a2018",
    roughness: 0.72,
    metalness: 0.1,
  });
  const woodGrain = new THREE.MeshStandardMaterial({
    color: "#4a2a1e",
    roughness: 0.7,
    metalness: 0.08,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#cc9e52",
    roughness: 0.26,
    metalness: 0.85,
    emissive: "#1e1204",
    emissiveIntensity: 0.12,
  });
  const brassDark = new THREE.MeshStandardMaterial({
    color: "#825a2a",
    roughness: 0.4,
    metalness: 0.8,
  });
  const matte = new THREE.MeshStandardMaterial({
    color: "#0f0f12",
    roughness: 0.86,
    metalness: 0.14,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: "#18181c",
    roughness: 0.48,
    metalness: 0.35,
  });

  /**
   * Alt kaide (koyu ahşap kutu) — modelin TABANI tam y=0'da olur.
   * Yükseklikler: lower 0→0.14, upper 0.14→0.22, çıkıntı pirinç şeritler ayrı.
   */
  const baseLower = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.14, 0.6), woodDark);
  baseLower.position.y = 0.07;
  baseLower.castShadow = true;
  baseLower.receiveShadow = true;
  root.add(baseLower);

  const baseUpper = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.52), woodMid);
  baseUpper.position.y = 0.18;
  baseUpper.castShadow = true;
  baseUpper.receiveShadow = true;
  root.add(baseUpper);

  /** Dekoratif üst yüzey paneli (ahşap doku hissi). */
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

  /** REDD pirinç plaket — ön yüzde. */
  const plaqueGeo = new THREE.PlaneGeometry(0.24, 0.065);
  const plaqueTex = createPlaqueTexture();
  const plaque = new THREE.Mesh(
    plaqueGeo,
    new THREE.MeshStandardMaterial({
      map: plaqueTex,
      color: "#d3a45a",
      roughness: 0.3,
      metalness: 0.7,
      emissive: "#1a0e04",
      emissiveIntensity: 0.15,
    }),
  );
  plaque.position.set(0, 0.12, 0.301);
  root.add(plaque);

  /** Ayaklar — küçük pirinç silindirler. */
  const footGeo = new THREE.CylinderGeometry(0.028, 0.038, 0.032, 12);
  const footOffsets: Array<[number, number]> = [
    [0.32, 0.24],
    [-0.32, 0.24],
    [0.32, -0.24],
    [-0.32, -0.24],
  ];
  for (const [x, z] of footOffsets) {
    const foot = new THREE.Mesh(footGeo, brassDark);
    foot.position.set(x, 0.016, z);
    root.add(foot);
  }

  /** PLATTER — dönen pirinç/alüminyum tabla. */
  const platter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.018, 64),
    plateMat,
  );
  platter.position.y = 0.236;
  platter.castShadow = true;
  root.add(platter);

  /** Kırmızı keçe (felt) mat. */
  const felt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.004, 48),
    new THREE.MeshStandardMaterial({
      color: "#6a0f16",
      roughness: 0.92,
      metalness: 0,
    }),
  );
  felt.position.y = 0.248;
  root.add(felt);

  /** Spindle (merkez milii). */
  const spindle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.03, 12),
    brass,
  );
  spindle.position.y = 0.266;
  root.add(spindle);

  /** TONEARM kaidesi + kol + cartridge. */
  const armBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.054, 16),
    brass,
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

  /** HORN — klasik pirinç trompet. */
  const horn = new THREE.Mesh(
    new THREE.ConeGeometry(0.23, 0.6, 32, 1, true),
    brass,
  );
  horn.position.set(-0.34, 0.6, -0.04);
  horn.rotation.z = Math.PI / 2.05;
  horn.rotation.y = Math.PI / 14;
  root.add(horn);

  /** Boğaz (bent neck). */
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.034, 0.056, 0.14, 16),
    brassDark,
  );
  neck.position.set(-0.08, 0.34, -0.02);
  neck.rotation.z = Math.PI / 3.8;
  root.add(neck);

  /** Horn ağız çemberi. */
  const hornMouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.016, 14, 32),
    brass,
  );
  hornMouth.position.set(-0.62, 0.62, -0.045);
  hornMouth.rotation.y = Math.PI / 2;
  root.add(hornMouth);

  /** Horn iç gölgesi — silüet daha dolu. */
  const hornInside = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.5, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color: "#3a2008",
      roughness: 0.9,
      metalness: 0.25,
      side: THREE.BackSide,
    }),
  );
  hornInside.position.copy(horn.position);
  hornInside.rotation.copy(horn.rotation);
  root.add(hornInside);

  /** Disc slot — takılı plağı barındırır. */
  const discSlot = new THREE.Group();
  discSlot.name = "gramophone:discSlot";
  discSlot.position.y = 0.252;
  root.add(discSlot);

  /**
   * Aktif durumda çok hafif sıcak bir ışık — "gramofon çalışıyor" hissi.
   * Scene'e değil root'a ekli; taşınırken bile doğru hareket eder.
   */
  const activeGlow = new THREE.PointLight("#ffb97a", 0, 2.4, 2);
  activeGlow.position.set(0, 0.5, 0);
  root.add(activeGlow);

  /** Etkileşim hit-target. */
  const hitGeo = new THREE.SphereGeometry(0.95, 12, 12);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const interactTarget = new THREE.Mesh(hitGeo, hitMat);
  interactTarget.position.y = 0.35;
  interactTarget.userData = {
    interactable: {
      kind: "gramophone",
      promptKey: "E",
      promptText: "E — gramofonu taşı · R — başlat/duraklat",
    },
  };
  root.add(interactTarget);

  scene.add(root);

  const state = {
    state: "placed" as GramophoneState,
    activeOrder: 0,
  };

  let platterRot = 0;
  let platterSpeed = 0; // rad/sn
  const targetPlatterSpeed = 2.2; // 33⅓ rpm hissine yakın
  let mechStartPhase = 0; // 0..1 — plak takıldığı an ilk birkaç saniyedeki "uyanma" fazı
  let lastDropTime = 0;
  /** Küçük varyasyon: başlangıç açı salınımı — robotik başlamasın. */
  const mechJitterSeed = Math.random() * Math.PI * 2;

  /** Kameradaki "el" offseti. */
  const carriedOffset = new THREE.Vector3(0.3, -0.5, -0.92);
  const carriedEuler = new THREE.Euler(-0.28, 0.24, 0.04);

  const tempVec = new THREE.Vector3();
  const sampleA = new THREE.Vector3();
  const sampleB = new THREE.Vector3();
  const sampleC = new THREE.Vector3();
  const surfaceNormal = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const qAlign = new THREE.Quaternion();

  /** Yeni plak mesh'i — her setActive'de temiz oluşturulur. */
  function buildDiscMesh(): THREE.Group {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.195, 0.195, 0.006, 56),
      new THREE.MeshStandardMaterial({
        color: "#060608",
        roughness: 0.28,
        metalness: 0.5,
      }),
    );
    g.add(disc);
    for (let i = 0; i < 5; i += 1) {
      const r = 0.06 + i * 0.026;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.0018, 6, 48),
        new THREE.MeshStandardMaterial({
          color: "#1a1a1e",
          roughness: 0.9,
          metalness: 0.1,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.0032;
      g.add(ring);
    }
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.068, 0.0075, 32),
      new THREE.MeshStandardMaterial({
        color: "#a6121a",
        roughness: 0.55,
        metalness: 0.05,
        emissive: "#3a0308",
        emissiveIntensity: 0.34,
      }),
    );
    label.position.y = 0.0042;
    g.add(label);
    return g;
  }

  function setActive(order: number): void {
    const changing = state.activeOrder !== order;
    state.activeOrder = order;
    while (discSlot.children.length > 0) {
      const ch = discSlot.children[0];
      discSlot.remove(ch);
    }
    if (order > 0) {
      discSlot.add(buildDiscMesh());
      activeGlow.intensity = 0.45;
      /**
       * Plak takıldığı an mekanik hissi: platter speed 0'dan hedefe yumuşak çıkar.
       * Subtle randomness için mechStartPhase ile ufak bir salınım uygulanır.
       */
      if (changing) {
        platterSpeed = 0;
        mechStartPhase = 1;
      }
    } else {
      activeGlow.intensity = 0;
      mechStartPhase = 0;
    }
  }

  function placeOnGround(
    x: number,
    z: number,
    getHeightAt: (x: number, z: number) => number,
  ): void {
    /** 3-nokta yükseklik örneklemesi → zemin normali. */
    const eps = 0.42;
    const hA = getHeightAt(x, z);
    const hB = getHeightAt(x + eps, z);
    const hC = getHeightAt(x, z + eps);
    sampleA.set(x, hA, z);
    sampleB.set(x + eps, hB, z).sub(sampleA);
    sampleC.set(x, hC, z + eps).sub(sampleA);
    surfaceNormal.crossVectors(sampleC, sampleB).normalize();
    if (surfaceNormal.y < 0) surfaceNormal.multiplyScalar(-1);

    /** Eğim → slerp yumuşatma. */
    const slopeDot = Math.max(0, Math.min(1, surfaceNormal.dot(up)));
    const alignmentStrength = slopeDot < 0.82 ? 0.3 : 0.65;
    qAlign
      .setFromUnitVectors(up, surfaceNormal)
      .slerp(new THREE.Quaternion(), 1 - alignmentStrength);
    root.quaternion.copy(qAlign);
    root.position.set(x, hA + GROUND_PADDING, z);
  }

  return {
    root,
    get state() {
      return state.state;
    },
    get activeOrder() {
      return state.activeOrder;
    },
    set activeOrder(order: number) {
      setActive(order);
    },
    interactTarget,
    worldPosition(out) {
      return root.getWorldPosition(out);
    },
    setActive,
    toggleCarry(cam, getHeightAt) {
      if (state.state === "placed") {
        scene.remove(root);
        cam.add(root);
        root.position.copy(carriedOffset);
        root.rotation.copy(carriedEuler);
        state.state = "carried";
      } else {
        cam.remove(root);
        scene.add(root);

        const forward = new THREE.Vector3(0, 0, -1);
        cam.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 1e-4) forward.set(0, 0, -1);
        forward.normalize();

        tempVec.copy(cam.position).addScaledVector(forward, 1.55);
        placeOnGround(tempVec.x, tempVec.z, getHeightAt);

        /** Yaw — ön yüz oyuncuya baksın. */
        const yaw = Math.atan2(-forward.x, -forward.z);
        root.rotateY(yaw);

        state.state = "placed";
        lastDropTime = 0;
      }
    },
    update(time, delta, pose) {
      /**
       * Plak takılıyken platter döner — mekanik hissiyat:
       *  - Başlangıçta speed 0'dan `targetPlatterSpeed`'e yumuşak kalkış (1.6s civarı)
       *  - Uyanma fazında ufak bir salınım (jitter) → gerçek motor hissi
       *  - Plak çıkarılırsa hızlı yavaşlar ama sert değil
       */
      if (state.activeOrder > 0) {
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

      /** Tonearm plak üstünde hafifçe içe döner. */
      const targetArmRot = state.activeOrder > 0 ? -1.25 : -0.95;
      armRotGroup.rotation.y += (targetArmRot - armRotGroup.rotation.y) * Math.min(1, delta * 2);

      if (state.state === "carried") {
        /** Yürüme sallantısı — jittersiz. */
        const bobAmp = 0.01 + Math.min(pose.speed, 10) * 0.0028;
        const sway = Math.sin(time * 6.0) * bobAmp;
        const lift = Math.abs(Math.sin(time * 12.0)) * bobAmp * 0.6;
        root.position.x = carriedOffset.x + sway * 0.4;
        root.position.y = carriedOffset.y + lift;
        root.position.z = carriedOffset.z + sway * 0.15;
      } else if (lastDropTime < 0.4) {
        lastDropTime += delta;
      }
    },
  };
}

/** Küçük canvas — REDD metni pirinç plaket için. */
function createPlaqueTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 256, 64);
    grad.addColorStop(0, "#8c6a2a");
    grad.addColorStop(0.5, "#d9b170");
    grad.addColorStop(1, "#8c6a2a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#2a1805";
    ctx.font = "700 32px 'Inter', 'Helvetica Neue', Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("REDD", 128, 36);
    ctx.font = "500 11px 'Inter', Arial";
    ctx.fillText("MÜKEMMEL BOŞLUK", 128, 54);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
