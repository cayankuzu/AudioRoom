import * as THREE from "three";

export const HALF = 30;
export const HEIGHT = 26;
export const YELLOW = "#f3c012";
export const INK = "#141008";

/** Kapaktaki düz, sıcak hardal sarısı + seyrek mürekkep çizgileri (el çizimi hissi). */
function inkPaper(random: () => number, density: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const g = canvas.getContext("2d")!;
  g.fillStyle = YELLOW;
  g.fillRect(0, 0, 512, 512);
  g.lineCap = "round";
  for (let i = 0; i < density; i += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const length = 6 + random() * 22;
    const angle = -0.6 + random() * 0.25;
    g.strokeStyle = `rgba(90, 62, 0, ${0.08 + random() * 0.14})`;
    g.lineWidth = 0.8 + random() * 1.4;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

/** Üç kademeli çizgi-roman gölgelemesi. */
export function toonGradient(): THREE.DataTexture {
  const data = new Uint8Array([90, 170, 255]);
  const texture = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

export function createRoom(random: () => number): THREE.Group {
  const group = new THREE.Group();
  const gradientMap = toonGradient();
  const wallMap = inkPaper(random, 220);
  wallMap.repeat.set(4, 2);
  const floorMap = inkPaper(random, 160);
  floorMap.repeat.set(6, 6);
  // Duvarlar kapaktaki gibi düz boyalı: ışıktan bağımsız, parlak hardal sarısı (köşeleri mürekkep çizgiler belirler).
  const wall = new THREE.MeshBasicMaterial({ map: wallMap, side: THREE.BackSide });
  const floor = new THREE.MeshToonMaterial({ map: floorMap, gradientMap });

  const box = new THREE.Mesh(new THREE.BoxGeometry(HALF * 2, HEIGHT, HALF * 2), wall);
  box.position.y = HEIGHT / 2;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, HALF * 2), floor);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.01;
  ground.receiveShadow = true;

  // Köşe ve kenarlarda mürekkep çizgileri: kutunun çizilmiş gibi okunması için.
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(HALF * 2 - 0.05, HEIGHT - 0.05, HALF * 2 - 0.05)),
    new THREE.LineBasicMaterial({ color: INK }),
  );
  edges.position.y = HEIGHT / 2;
  group.add(box, ground, edges);
  return group;
}

/** Bükülmüş halat dokusu: kapaktaki gibi siyah sarmallar, aralarında sarı ince boşluklar. */
function ropeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#e3b00e";
  g.fillRect(0, 0, 256, 64);
  for (let x = -64; x < 320; x += 16) {
    g.fillStyle = "#100c06";
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + 13.5, 0);
    g.lineTo(x + 45.5, 64);
    g.lineTo(x + 32, 64);
    g.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export interface Mural {
  group: THREE.Group;
  /** Gülümsemenin derinliği (0..1, 1 = tam gülüş). */
  setSmile(amount: number): void;
  /** Açık gözün göz kırpması (0 kapalı, 1 açık). */
  setBlink(amount: number): void;
  /** Halatın gerginliği / çözülmesi (0..1). */
  setUntie(amount: number): void;
  /** Göz bir noktaya bakar (parıltı o yöne kayar); null: kapaktaki bakışına döner. */
  lookAt(target: THREE.Vector3 | null): void;
}

/**
 * Kuzey duvarındaki kapak, kapaktan ölçülerek kuruldu (kapak karesi 24 m, merkezi
 * duvarda y=13): sağda parlayan siyah göz, solunda kırpık göz, asimetrik halat
 * gülüş ve iki ucunda asılı ilmikler. Koordinatlar kapak oranlarından (u, v) gelir.
 */
const COVER_SIZE = 24;
const COVER_Y = 13;
const cover = (u: number, v: number, z = 0.4) => new THREE.Vector3((u - 0.5) * COVER_SIZE, COVER_Y - (v - 0.5) * COVER_SIZE, z);
/** Halat gülüşün kapaktaki yolu: sol ilmik düğümünden dik iner, en alt noktası solda, sağa yavaşça yükselir. */
const SMILE = [cover(0.215, 0.455), cover(0.27, 0.56), cover(0.33, 0.655), cover(0.45, 0.705), cover(0.56, 0.69), cover(0.67, 0.65), cover(0.79, 0.632)];

export function createMural(): Mural {
  const group = new THREE.Group();
  const ink = new THREE.MeshToonMaterial({ color: INK, gradientMap: toonGradient() });
  const texture = ropeTexture();
  texture.repeat.set(2.2, 1);
  const rope = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });

  // Göz: siyah disk + sol üstte beyaz parlama (kapaktaki gibi).
  const eyeRadius = 0.065 * COVER_SIZE;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius, 40, 20), ink);
  eye.scale.set(1, 1.05, 0.3);
  eye.position.copy(cover(0.69, 0.37, 0));
  const shine = new THREE.Mesh(new THREE.SphereGeometry(eyeRadius * 0.24, 20, 10), new THREE.MeshBasicMaterial({ color: "#fff8d8" }));
  shine.scale.set(1.25, 0.8, 1);
  shine.position.set(-eyeRadius * 0.42, eyeRadius * 0.46, eyeRadius * 1.08);
  eye.add(shine);

  // Kırpık göz: sağa doğru hafifçe inen, ucu incelen kısa bir fırça darbesi.
  const winkCurve = new THREE.CatmullRomCurve3([cover(0.365, 0.292, 0.2), cover(0.43, 0.305, 0.2), cover(0.5, 0.338, 0.2)]);
  const winkGeometry = new THREE.TubeGeometry(winkCurve, 32, 0.48, 10);
  const winkPos = winkGeometry.getAttribute("position") as THREE.BufferAttribute;
  const point = new THREE.Vector3();
  const center = new THREE.Vector3();
  for (let v = 0; v < winkPos.count; v += 1) {
    const t = Math.floor(v / 11) / 32;
    winkCurve.getPointAt(t, center);
    point.fromBufferAttribute(winkPos, v).sub(center).multiplyScalar(0.45 + 0.55 * Math.sin(Math.PI * (0.15 + t * 0.7)));
    winkPos.setXYZ(v, center.x + point.x, center.y + point.y, center.z + point.z);
  }
  const wink = new THREE.Mesh(winkGeometry, ink);
  group.add(eye, wink);

  // İlmikler: düğüm sarımları + halkası dışarı sarkan ilmik (sol yukarı-sola, sağ aşağı-sağa).
  const noose = (knot: THREE.Vector3, direction: THREE.Vector3, loopCenter: THREE.Vector3, rx: number, ry: number, tilt: number) => {
    const noosed = new THREE.Group();
    for (let k = 0; k < 5; k += 1) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.17, 8, 20), rope);
      coil.position.copy(direction).multiplyScalar((k - 2) * 0.32);
      coil.lookAt(coil.position.clone().add(direction));
      noosed.add(coil);
    }
    const loop: THREE.Vector3[] = [];
    for (let k = 0; k <= 40; k += 1) {
      const a = (k / 40) * Math.PI * 2;
      const x = Math.cos(a) * rx;
      const y = Math.sin(a) * ry;
      loop.push(new THREE.Vector3(loopCenter.x - knot.x + x * Math.cos(tilt) - y * Math.sin(tilt), loopCenter.y - knot.y + x * Math.sin(tilt) + y * Math.cos(tilt), loopCenter.z - knot.z));
    }
    const ring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loop, true), 80, 0.17, 8, true), ink);
    noosed.add(ring);
    // Grup düğümde durur: finalde ilmik kendi yerinde küçülüp kaybolur.
    noosed.position.copy(knot);
    return noosed;
  };
  const leftKnot = SMILE[0].clone().add(new THREE.Vector3(-0.9, 0.1, 0));
  const rightKnot = SMILE[SMILE.length - 1].clone().add(new THREE.Vector3(1.2, 0.05, 0));
  const nooses = [
    noose(leftKnot, new THREE.Vector3(1, -0.15, 0).normalize(), cover(0.1, 0.44), 1.75, 1.05, 0.12),
    noose(rightKnot, new THREE.Vector3(1, 0.1, 0).normalize(), cover(0.91, 0.7), 1.35, 1.45, -0.5),
  ];
  group.add(...nooses);

  let ropeMesh: THREE.Mesh | null = null;
  const buildRope = (smile: number, untie: number) => {
    if (ropeMesh) {
      ropeMesh.geometry.dispose();
      group.remove(ropeMesh);
    }
    // Gülüş: düğümler arasındaki doğruya göre sapma büyür (0.6 = kapaktaki biçim).
    const depth = 0.7 + smile * 0.5;
    const first = SMILE[0];
    const last = SMILE[SMILE.length - 1];
    const points = [leftKnot.clone(), ...SMILE.map((p, i) => {
      const t = i / (SMILE.length - 1);
      const lineY = first.y + (last.y - first.y) * t;
      return new THREE.Vector3(p.x, lineY + (p.y - lineY) * depth + untie * Math.sin(t * 9) * 0.8, p.z);
    }), rightKnot.clone()];
    ropeMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 140, 0.62, 14), rope);
    ropeMesh.castShadow = true;
    group.add(ropeMesh);
  };

  let smileNow = -1;
  let untieNow = -1;
  const shineRest = shine.position.clone();
  const eyeWorld = new THREE.Vector3();
  const gaze = new THREE.Vector3();
  buildRope(0, 0);
  group.position.set(0, 0, -HALF + 0.6);

  return {
    group,
    setSmile(amount) {
      if (Math.abs(amount - smileNow) < 0.01) return;
      smileNow = amount;
      buildRope(smileNow, Math.max(0, untieNow));
    },
    setBlink(amount) {
      eye.scale.y = 1.05 * (0.12 + amount * 0.88);
    },
    lookAt(target) {
      if (!target) {
        shine.position.lerp(shineRest, 0.08);
        return;
      }
      eye.getWorldPosition(eyeWorld);
      gaze.subVectors(target, eyeWorld);
      // Duvar düzleminde (x, y) bakış yönü; parıltı gözün kenarına doğru kayar.
      const len = Math.hypot(gaze.x, gaze.y, gaze.z) || 1;
      const x = THREE.MathUtils.clamp(gaze.x / len, -1, 1) * eyeRadius * 0.55;
      const y = THREE.MathUtils.clamp(gaze.y / len, -1, 1) * eyeRadius * 0.55;
      shine.position.x += (x - shine.position.x) * 0.12;
      shine.position.y += (y - shine.position.y) * 0.12;
    },
    setUntie(amount) {
      if (Math.abs(amount - untieNow) < 0.01) return;
      untieNow = amount;
      buildRope(Math.max(0, smileNow), untieNow);
      nooses.forEach((item) => item.scale.setScalar(1 - amount));
    },
  };
}
