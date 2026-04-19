import * as THREE from "three";
import { FontLoader, type Font } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { ASSETS, PALETTE, VINYL, WORLD } from "../config/config";
import { patchTurkishGlyphs } from "../utils/fontPatcher";

/**
 * Plak hareket modu:
 *  - "free"      → normal kuantum kaçma fiziği
 *  - "carried"   → oyuncunun elinde, kameraya kilitli
 *  - "onPlatter" → gramofon tablasına yerleşmiş, tablayla beraber döner
 */
export type VinylMode = "free" | "carried" | "onPlatter";

/**
 * Plak (vinyl) — sahnedeki **özel** tek disk: Henry the Lee × Kuantum Dolanıklık.
 *
 * Görsel:
 *  - Cam siyah disk üst yüzeyinde proseduurel oluk dokusu (CanvasTexture)
 *    → gerçek vinyl gibi grooves.
 *  - Merkez etiket: amber-altın disk, üzerinde 3B ekstrude yazı:
 *      "HENRY THE LEE"
 *      "KUANTUM DOLANIKLIK"
 *  - Disk merkez deliği (siyah).
 *  - Hız ile orantılı nabız aura (additive glow) — hızlandıkça parlar.
 *
 * Davranış:
 *  - 2D (XZ) hareket; Y = zemin yüksekliği + hoverY (dalgayı takip).
 *  - Oyuncu yaklaştıkça **olabilecek en uzak köşeye** yönelir:
 *      * Velocity-change (her 3 sn) anında: hedef köşe = oyuncudan diametral
 *        olarak en uzak köşe. Yön = (köşe - plak) normalize, küçük jitter.
 *      * Sürekli steering: oyuncu < 25 m içindeyken plak, en uzak köşeye
 *        doğru sürekli ivmelenir; max hıza yapışır.
 *  - Oyuncu uzaktayken (> 30 m) klasik kuantum jitter: rastgele yön + hız.
 *  - Duvarlara çarpınca elastik seker.
 *  - Disk spin'i hızla orantılı.
 */

export interface VinylHandle {
  group: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  /** Mevcut mod — interaction system değiştirir. */
  mode: VinylMode;
  setMode(mode: VinylMode, camera?: THREE.Camera): void;
  currentSpeed(): number;
  update(
    time: number,
    delta: number,
    getHeightAt: (x: number, z: number) => number,
    playerPos: THREE.Vector3,
    /** "onPlatter" modda gramofon tablası world pozisyonu (her frame). */
    platterPos: THREE.Vector3 | null,
  ): void;
}

export interface VinylOptions {
  startPosition: { x: number; z: number };
}

/**
 * Oluk (groove) tekstürü — proseduurel.
 * 64 ince halka + dış rim parlaklığı + merkez etiket alanı (saydam).
 * MeshStandardMaterial.map olarak kullanılır → diskin üst yüzeyine bindirilir.
 */
function buildGroovesTexture(): THREE.CanvasTexture {
  const SIZE = 512;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  const cx = SIZE * 0.5;
  const cy = SIZE * 0.5;

  /** Taban: derin siyah. */
  ctx.fillStyle = "#0a0a0e";
  ctx.fillRect(0, 0, SIZE, SIZE);

  /** Çok ince konsantrik oluklar — her 3 px'de bir. */
  const outerR = SIZE * 0.48;
  const innerR = SIZE * 0.18; /** etiket alanına girmesin */
  for (let r = innerR; r < outerR; r += 2.5) {
    /** Hafif değişken parlaklık → analog hissi. */
    const t = (r - innerR) / (outerR - innerR);
    const lum = 18 + Math.sin(r * 0.7) * 6 + (1 - t) * 4;
    ctx.strokeStyle = `rgba(${lum}, ${lum}, ${lum + 4}, 0.85)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  /** Dış rim — hafif parlak halka (diskin keskin kenarı). */
  ctx.strokeStyle = "rgba(60, 55, 45, 0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();

  /** Etiket dairesi maskeleme — burada amber etiket görünecek. */
  ctx.fillStyle = "#0a0a0e";
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/**
 * Etiket üzerine 3B ekstrude yazı kur — iki satır:
 *   HENRY THE LEE
 *   KUANTUM DOLANIKLIK
 * Yazı küçük (mm ölçeği), siyah ink. Etiket merkezine hizalanır.
 */
function buildLabelText(font: Font, labelRadius: number): THREE.Group {
  const group = new THREE.Group();
  const black = new THREE.MeshStandardMaterial({
    color: PALETTE.inkBlack,
    roughness: 0.7,
    metalness: 0.05,
  });

  const buildLine = (text: string, size: number) => {
    const lineGroup = new THREE.Group();
    let cursor = 0;
    const chars = Array.from(text);
    for (const ch of chars) {
      if (ch === " ") {
        cursor += size * 0.55;
        continue;
      }
      const geo = new TextGeometry(ch, {
        font,
        size,
        depth: size * 0.18,
        bevelEnabled: false,
        curveSegments: 6,
      });
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      if (!bb) continue;
      const w = bb.max.x - bb.min.x;
      const mesh = new THREE.Mesh(geo, black);
      mesh.position.x = cursor - bb.min.x;
      lineGroup.add(mesh);
      cursor += w + size * 0.18;
    }
    /** Satırı X'te merkeze hizala. */
    const bb = new THREE.Box3().setFromObject(lineGroup);
    const cx = (bb.min.x + bb.max.x) * 0.5;
    lineGroup.position.x = -cx;
    return lineGroup;
  };

  /** Etiket yarıçapı ~0.20 m → satırlar buna göre küçük. */
  const titleSize = labelRadius * 0.18;
  const subSize = labelRadius * 0.13;

  const title = buildLine("HENRY THE LEE", subSize);
  const sub = buildLine("KUANTUM DOLANIKLIK", subSize * 0.78);

  /** Üst satır: etiket yarıçapının ~%35 yukarısı. */
  title.position.z = -labelRadius * 0.32;
  sub.position.z = labelRadius * 0.30;

  group.add(title);
  group.add(sub);

  /** Disk yere bakar düzlemde — yazı XZ düzlemi üzerinde, +Y'ye yükselir.
   *  TextGeometry default olarak XY düzleminde dik kurulur; -π/2 X ile
   *  yatırırız → harfler düz yatar, +Y'ye küçük derinlik. */
  group.rotation.x = -Math.PI / 2;
  /** Z'de hafif ofset — etiket üzerinde çakışmasın. */
  void titleSize;
  return group;
}

export function createVinylDisk(
  scene: THREE.Scene,
  options: VinylOptions,
): VinylHandle {
  const group = new THREE.Group();
  group.name = "kd-vinyl";

  const diskTilt = new THREE.Group();
  group.add(diskTilt);
  diskTilt.rotation.z = VINYL.tilt;

  /** ── Disk gövdesi — silindir + groove tekstürü ─────────────── */
  const grooveTex = buildGroovesTexture();
  /** Cylinder'ın 3 materyali var: [side, top, bottom]. Top = grooves,
   *  bottom = aynı groove (mirror), side = düz siyah. */
  const sideMat = new THREE.MeshStandardMaterial({
    color: "#08080c",
    roughness: 0.55,
    metalness: 0.32,
  });
  const topMat = new THREE.MeshStandardMaterial({
    color: "#ffffff", /** map renklendirsin */
    roughness: 0.42,
    metalness: 0.38,
    map: grooveTex,
  });
  const bottomMat = topMat.clone();
  bottomMat.map = grooveTex;

  const disk = new THREE.Mesh(
    new THREE.CylinderGeometry(VINYL.radius, VINYL.radius, VINYL.thickness, 96),
    [sideMat, topMat, bottomMat],
  );
  diskTilt.add(disk);

  /** ── Etiket — amber-altın disk, üstüne yazı ─────────────────── */
  const labelRadius = VINYL.radius * 0.36;
  const labelMat = new THREE.MeshStandardMaterial({
    color: PALETTE.amber,
    roughness: 0.45,
    metalness: 0.18,
    emissive: new THREE.Color(PALETTE.amberDeep),
    emissiveIntensity: 0.45,
  });
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(labelRadius, labelRadius, VINYL.thickness * 1.06, 48),
    labelMat,
  );
  diskTilt.add(label);

  /** Etiket yazısı — async yükleniyor. */
  const fontLoader = new FontLoader();
  fontLoader.load(
    ASSETS.fontBold,
    (font) => {
      patchTurkishGlyphs(font);
      const text = buildLabelText(font, labelRadius);
      /** Yazı etiketin tam üstüne (silindirin pozitif Y yüzü). */
      text.position.y = (VINYL.thickness * 1.06) * 0.5 + 0.002;
      label.add(text);
    },
    undefined,
    (e) => console.warn("[vinyl] etiket fontu yüklenemedi:", e),
  );

  /** ── Merkez delik ──────────────────────────────────────────── */
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, VINYL.thickness * 1.15, 16),
    new THREE.MeshBasicMaterial({ color: "#000" }),
  );
  diskTilt.add(hole);

  /** ── Aura — nabız glow (hızla parlar) ───────────────────────── */
  const auraMat = new THREE.MeshBasicMaterial({
    color: PALETTE.amberWarm,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const aura = new THREE.Mesh(
    new THREE.RingGeometry(VINYL.radius * 1.05, VINYL.radius * 1.55, 64),
    auraMat,
  );
  aura.rotation.x = Math.PI / 2;
  diskTilt.add(aura);

  /** İkinci dış halka — daha büyük, daha sönük, hızla genişler. */
  const auraOuterMat = new THREE.MeshBasicMaterial({
    color: PALETTE.amber,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const auraOuter = new THREE.Mesh(
    new THREE.RingGeometry(VINYL.radius * 1.6, VINYL.radius * 2.1, 64),
    auraOuterMat,
  );
  auraOuter.rotation.x = Math.PI / 2;
  diskTilt.add(auraOuter);

  scene.add(group);

  /** ── State ───────────────────────────────────────────────────── */
  const position = new THREE.Vector3(
    options.startPosition.x,
    VINYL.hoverY,
    options.startPosition.z,
  );
  const velocity = new THREE.Vector3();
  /** İlk hız: rastgele yön + ortalama hız. */
  const initAngle = Math.random() * Math.PI * 2;
  const initSpeed = (VINYL.minSpeed + VINYL.maxSpeed) * 0.5;
  velocity.set(Math.cos(initAngle) * initSpeed, 0, Math.sin(initAngle) * initSpeed);

  let nextChange = VINYL.velocityChangeInterval;
  let smoothY = position.y;

  const limit = WORLD.half - VINYL.margin;

  /**
   * Oyuncuya göre **olabilecek en uzak köşe** — odanın 4 köşesinden
   * oyuncu pozisyonuna en uzak olanı. Pratikte: oyuncu hangi yarıdaysa
   * çapraz karşı köşe.
   */
  function farthestCorner(playerX: number, playerZ: number): { x: number; z: number } {
    const cornerX = playerX >= 0 ? -limit : limit;
    const cornerZ = playerZ >= 0 ? -limit : limit;
    return { x: cornerX, z: cornerZ };
  }

  /**
   * Velocity-change anında yeni hız — oyuncudan kaçma stratejisi.
   *  - Oyuncu yakın (< 18 m): hedef = en uzak köşe, küçük jitter (±15°),
   *    hız = maxSpeed (panik hız).
   *  - Oyuncu orta (18–35 m): hedef yönü ile rastgele yön karışımı,
   *    yakınlık ne kadar artarsa o kadar köşeye yönelir. Hız: random
   *    ama ortalamadan yukarı eğilimli.
   *  - Oyuncu uzak (> 35 m): klasik kuantum jitter, tamamen rastgele.
   */
  function nextVelocity(out: THREE.Vector3, playerPos: THREE.Vector3): void {
    const dxp = position.x - playerPos.x;
    const dzp = position.z - playerPos.z;
    const distP = Math.hypot(dxp, dzp);

    if (distP < 18) {
      const corner = farthestCorner(playerPos.x, playerPos.z);
      const cdx = corner.x - position.x;
      const cdz = corner.z - position.z;
      const clen = Math.hypot(cdx, cdz);
      let baseAngle: number;
      if (clen < 0.01) {
        /** Plak zaten en uzak köşede — oyuncudan dik kaçış. */
        baseAngle = Math.atan2(dzp, dxp);
      } else {
        baseAngle = Math.atan2(cdz, cdx);
      }
      /** ±15° jitter. */
      const jitter = (Math.random() - 0.5) * (Math.PI / 6);
      const angle = baseAngle + jitter;
      out.set(Math.cos(angle) * VINYL.maxSpeed, 0, Math.sin(angle) * VINYL.maxSpeed);
      return;
    }

    if (distP < 35) {
      const corner = farthestCorner(playerPos.x, playerPos.z);
      const cdx = corner.x - position.x;
      const cdz = corner.z - position.z;
      const cornerAngle = Math.atan2(cdz, cdx);
      const randomAngle = Math.random() * Math.PI * 2;
      /** Yakınlık katsayısı: 18 m'de 1, 35 m'de 0. */
      const w = (35 - distP) / 17;
      /** Açı blend — slerp benzeri minimum sapma. */
      let dAng = cornerAngle - randomAngle;
      while (dAng > Math.PI) dAng -= Math.PI * 2;
      while (dAng < -Math.PI) dAng += Math.PI * 2;
      const angle = randomAngle + dAng * w;
      const speedMin = VINYL.minSpeed + (VINYL.maxSpeed - VINYL.minSpeed) * w * 0.5;
      const speed = speedMin + Math.random() * (VINYL.maxSpeed - speedMin);
      out.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
      return;
    }

    /** Uzak — tam kuantum jitter. */
    const angle = Math.random() * Math.PI * 2;
    const speed = VINYL.minSpeed + Math.random() * (VINYL.maxSpeed - VINYL.minSpeed);
    out.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
  }

  /** Aura nabız fazı + intensity smoothing. */
  let pulsePhase = 0;
  let auraIntensity = 0.32;

  /** Carry / mod state. */
  let mode: VinylMode = "free";

  /** Kameraya bağlandığında uygulanacak el-pozisyonu (Redd-style).
   *  Yeni küçük plak (radius 0.30 m) için scale 1.05 → ekranda yaklaşık
   *  bir el-büyüklüğünde görünür; Redd'in 33⅓ rpm hissini korur. */
  const carriedPosition = new THREE.Vector3(0.30, -0.34, -0.55);
  const carriedEuler = new THREE.Euler(-0.55, -0.18, 0.10);
  const carriedScale = 1.05;

  return {
    group,
    position,
    velocity,
    get mode() { return mode; },
    setMode(next, camera) {
      if (next === mode) return;
      const prev = mode;
      mode = next;
      if (next === "carried" || next === "onPlatter") {
        velocity.set(0, 0, 0);
        nextChange = performance.now() / 1000 + VINYL.velocityChangeInterval;
      }
      /** Sahne ↔ Kamera reparenting — Redd-style. */
      if (next === "carried" && camera) {
        scene.remove(group);
        camera.add(group);
        group.position.copy(carriedPosition);
        group.rotation.copy(carriedEuler);
        group.scale.setScalar(carriedScale);
        /** Disk yatay → dikey: oyuncuya yüzü dönsün diye X'te 90° çevir. */
        diskTilt.rotation.set(0, 0, 0);
        diskTilt.rotation.x = Math.PI / 2;
        /** Aura sönük. */
        auraMat.opacity = 0.18;
        auraOuterMat.opacity = 0.08;
      }
      if (prev === "carried" && next !== "carried" && camera) {
        camera.remove(group);
        scene.add(group);
        group.scale.setScalar(1);
        group.rotation.set(0, 0, 0);
        diskTilt.rotation.set(0, 0, 0);
        diskTilt.rotation.z = VINYL.tilt;
      }
      if (next === "free" && prev !== "free") {
        /** Bırakıldı: küçük rastgele momentum, normal flee başlar. */
        const a = Math.random() * Math.PI * 2;
        const s = VINYL.minSpeed * 0.8;
        velocity.set(Math.cos(a) * s, 0, Math.sin(a) * s);
      }
    },
    currentSpeed() {
      return Math.hypot(velocity.x, velocity.z);
    },
    update(time, delta, getHeightAt, playerPos, platterPos) {
      /** ── CARRIED: kamera-child; pozisyon zaten setMode'da uygulandı. */
      if (mode === "carried") {
        /** Plak kendi ekseninde nazik dönüş — "elde inceliyorum" hissi. */
        diskTilt.rotation.y += (VINYL.spin * 0.35) * delta;
        return;
      }

      /** ── ON PLATTER: gramofon tablasına kilitle ────────────── */
      if (mode === "onPlatter" && platterPos) {
        position.copy(platterPos);
        smoothY = position.y;
        group.position.copy(position);
        /** Hızlı spin — gerçek 33⅓ hissi. */
        diskTilt.rotation.y += (VINYL.spin * 1.8) * delta;
        /** Aura sade nabız. */
        pulsePhase += delta * 2.0;
        const pulse = 0.5 + 0.5 * Math.sin(pulsePhase);
        auraMat.opacity = 0.22 + pulse * 0.1;
        auraOuterMat.opacity = 0.12 + pulse * 0.06;
        return;
      }

      /** ── FREE: normal kuantum kaçma fiziği ──────────────────── */
      if (time >= nextChange) {
        nextVelocity(velocity, playerPos);
        nextChange = time + VINYL.velocityChangeInterval;
      }

      const dxp = position.x - playerPos.x;
      const dzp = position.z - playerPos.z;
      const distP = Math.hypot(dxp, dzp);
      if (distP < 28) {
        const corner = farthestCorner(playerPos.x, playerPos.z);
        const cdx = corner.x - position.x;
        const cdz = corner.z - position.z;
        const clen = Math.hypot(cdx, cdz);
        if (clen > 0.01) {
          const proximity = Math.max(0, Math.min(1, (28 - distP) / 22));
          const accel = 9.0 * proximity;
          const inv = 1 / clen;
          velocity.x += cdx * inv * accel * delta;
          velocity.z += cdz * inv * accel * delta;
          const sp = Math.hypot(velocity.x, velocity.z);
          if (sp > VINYL.maxSpeed) {
            const k = VINYL.maxSpeed / sp;
            velocity.x *= k;
            velocity.z *= k;
          }
        }
      }

      position.x += velocity.x * delta;
      position.z += velocity.z * delta;

      if (position.x > limit) { position.x = limit; velocity.x = -Math.abs(velocity.x); }
      else if (position.x < -limit) { position.x = -limit; velocity.x = Math.abs(velocity.x); }
      if (position.z > limit) { position.z = limit; velocity.z = -Math.abs(velocity.z); }
      else if (position.z < -limit) { position.z = -limit; velocity.z = Math.abs(velocity.z); }

      const floorY = getHeightAt(position.x, position.z);
      const targetY = floorY + VINYL.hoverY;
      smoothY = smoothY + (targetY - smoothY) * (1 - Math.exp(-delta * 9));
      position.y = smoothY;

      group.position.copy(position);

      const speed = Math.hypot(velocity.x, velocity.z);
      diskTilt.rotation.y += (VINYL.spin + speed * 1.6) * delta;

      /**
       * Nabız aura — hız arttıkça parlar, ayrıca düşük frekanslı sinüs
       * nabız ekler. Hızlı plak = oyuncu için dramatik vurgu, "yakalanmaz"
       * hissi.
       */
      pulsePhase += delta * (2.0 + speed * 0.4);
      const speedNorm = Math.min(1, speed / VINYL.maxSpeed);
      const pulse = 0.5 + 0.5 * Math.sin(pulsePhase);
      const targetAura = 0.25 + speedNorm * 0.55 + pulse * 0.18;
      auraIntensity += (targetAura - auraIntensity) * (1 - Math.exp(-delta * 5));
      auraMat.opacity = auraIntensity;
      auraOuterMat.opacity = auraIntensity * 0.55;
      const auraScale = 1 + speedNorm * 0.18 + pulse * 0.06;
      aura.scale.setScalar(auraScale);
      auraOuter.scale.setScalar(1 + speedNorm * 0.25 + pulse * 0.12);
    },
  };
}
