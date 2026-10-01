import * as THREE from "three";

/**
 * Gerçekçi hamamböceği (Kafka'nın Gregor'u): basık, parlak kızıl-kahve kanat örtüleri,
 * açık renk kenarlı göğüs kalkanı, altına gizlenmiş baş, gövdeden uzun kıvrık antenler,
 * dikenli üç parçalı altı bacak ve arkada iki kuyruk çıkıntısı. Bacaklar gerçek böcekler
 * gibi üçlü adımla (sol ön, sağ orta, sol arka birlikte) yürür. Birim boy ≈ 2 (baştan sona).
 */
export interface Roach {
  readonly group: THREE.Group;
  /** Yalnızca gövde (karın, kanatlar, kalkan, baş): çarpışma izi bacak ve antensiz hesaplanır. */
  readonly body: THREE.Group;
  /** speed: yürüme hızı (0 durur); flail: sırtüstü devrildiğinde bacak çırpma. */
  update(dt: number, time: number, speed: number, flail?: boolean): void;
}

function pronotumTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const gradient = g.createRadialGradient(64, 70, 10, 64, 64, 64);
  gradient.addColorStop(0, "#1a0c06");
  gradient.addColorStop(0.55, "#3a1a0c");
  gradient.addColorStop(0.78, "#8a5a32");
  gradient.addColorStop(1, "#c79a62");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function wingTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#5a2610";
  g.fillRect(0, 0, 64, 256);
  // Kanat damarları: ince, boyuna açık çizgiler.
  g.strokeStyle = "rgba(190,120,70,0.35)";
  g.lineWidth = 1.5;
  for (let x = 6; x < 64; x += 9) {
    g.beginPath();
    g.moveTo(x, 0);
    g.quadraticCurveTo(x + 6, 128, x - 3, 256);
    g.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRoach(): Roach {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const chitin = new THREE.MeshPhysicalMaterial({ color: "#3a1a0c", roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.18 });
  const legMaterial = new THREE.MeshPhysicalMaterial({ color: "#4a2412", roughness: 0.5, clearcoat: 0.6 });

  // Karın: segmentli, basık.
  for (let i = 0; i < 6; i += 1) {
    const segment = new THREE.Mesh(new THREE.SphereGeometry(0.42 - i * 0.045, 20, 10), chitin);
    segment.scale.set(1.15, 0.28, 0.42);
    segment.position.set(0, 0.2, -0.15 - i * 0.18);
    body.add(segment);
  }
  // Kanat örtüleri (tegmina): iki uzun, parlak, hafif örtüşen yaprak.
  const wings = new THREE.MeshPhysicalMaterial({ map: wingTexture(), roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.94 });
  for (const side of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), wings);
    wing.scale.set(0.62, 0.14, 1.9);
    wing.position.set(side * 0.13, 0.28, -0.55);
    wing.rotation.y = side * -0.06;
    wing.rotation.z = side * -0.12;
    body.add(wing);
  }
  // Göğüs kalkanı (pronotum): açık renk kenarlı, başı örten kalkan.
  const shield = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ map: pronotumTexture(), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15 }),
  );
  shield.scale.set(1.05, 0.3, 0.8);
  shield.position.set(0, 0.27, 0.42);
  body.add(shield);
  // Baş ve gözler: kalkanın altından öne eğik.
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), chitin);
  head.scale.set(1, 0.8, 0.9);
  head.position.set(0, 0.16, 0.74);
  body.add(head);
  const eyeMaterial = new THREE.MeshPhysicalMaterial({ color: "#050302", roughness: 0.1, clearcoat: 1 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), eyeMaterial);
    eye.position.set(side * 0.12, 0.2, 0.8);
    body.add(eye);
  }
  // Antenler: gövdeden uzun, uca doğru incelen kıvrık teller.
  const antennae: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.07, 0.2, 0.86);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.25, 0.15, 0.5),
      new THREE.Vector3(side * 0.7, 0.2, 1.2),
      new THREE.Vector3(side * 1.25, 0.05, 1.9),
    ]);
    const geometry = new THREE.TubeGeometry(curve, 40, 0.018, 5);
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;
    const point = new THREE.Vector3();
    const center = new THREE.Vector3();
    for (let v = 0; v < position.count; v += 1) {
      const t = Math.floor(v / 6) / 40;
      curve.getPointAt(t, center);
      point.fromBufferAttribute(position, v).sub(center).multiplyScalar(1 - t * 0.8);
      position.setXYZ(v, center.x + point.x, center.y + point.y, center.z + point.z);
    }
    pivot.add(new THREE.Mesh(geometry, legMaterial));
    group.add(pivot);
    antennae.push(pivot);
  }
  // Kuyruk çıkıntıları (cerci).
  for (const side of [-1, 1]) {
    const cercus = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.28, 6), legMaterial);
    cercus.rotation.x = -Math.PI / 2 - 0.2;
    cercus.rotation.z = side * 0.35;
    cercus.position.set(side * 0.1, 0.18, -1.25);
    group.add(cercus);
  }
  // Bacaklar: kalça (menteşe) → uyluk → dikenli baldır; üçlü adım fazları.
  interface Leg {
    hip: THREE.Group;
    knee: THREE.Group;
    phase: number;
    side: number;
    base: number;
  }
  const legs: Leg[] = [];
  const spine = new THREE.ConeGeometry(0.012, 0.07, 4);
  [0.3, -0.05, -0.4].forEach((z, row) => {
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.2, 0.14, z);
      const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.45, 6), legMaterial);
      femur.rotation.z = Math.PI / 2;
      femur.position.x = side * 0.22;
      const knee = new THREE.Group();
      knee.position.x = side * 0.44;
      const tibiaLength = row === 2 ? 0.65 : 0.5;
      const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.012, tibiaLength, 6), legMaterial);
      tibia.position.set(side * 0.1, -tibiaLength / 2 + 0.05, 0);
      tibia.rotation.z = side * 0.35;
      for (let k = 0; k < 4; k += 1) {
        const barb = new THREE.Mesh(spine, legMaterial);
        barb.position.set(side * (0.1 + k * 0.03), -0.05 - k * 0.12, 0);
        barb.rotation.z = side * 1.1;
        knee.add(barb);
      }
      knee.add(tibia);
      hip.add(femur, knee);
      // Bacaklar öne/arkaya yayılır: ön bacaklar ileri, arka bacaklar geri bakar.
      const base = side * (row === 0 ? -0.55 : row === 1 ? 0 : 0.55);
      hip.rotation.y = base;
      hip.rotation.z = side * -0.25;
      group.add(hip);
      // Üçlü adım: sol-ön, sağ-orta, sol-arka aynı fazda.
      const tripod = (row + (side < 0 ? 0 : 1)) % 2;
      legs.push({ hip, knee, phase: tripod * Math.PI, side, base });
    }
  });
  group.traverse((child) => {
    child.castShadow = true;
  });

  let gait = 0;
  return {
    group,
    body,
    update(dt, time, speed, flail = false) {
      gait += dt * (flail ? 16 : 4 + speed * 9);
      const stride = flail ? 0.7 : Math.min(0.45, 0.12 + speed * 0.5);
      for (const leg of legs) {
        const swing = Math.sin(gait + leg.phase);
        const lift = Math.max(0, Math.cos(gait + leg.phase));
        leg.hip.rotation.y = leg.base + swing * stride * leg.side * (speed > 0.01 || flail ? 1 : 0);
        leg.hip.rotation.z = leg.side * (-0.25 - lift * (speed > 0.01 || flail ? 0.35 : 0));
        leg.knee.rotation.z = leg.side * (flail ? Math.sin(gait * 1.3 + leg.phase) * 0.6 : 0);
      }
      // Antenler durmadan yoklar.
      antennae.forEach((antenna, i) => {
        antenna.rotation.y = Math.sin(time * 2.3 + i * 1.7) * 0.25;
        antenna.rotation.x = Math.sin(time * 1.7 + i) * 0.15 - 0.05;
      });
    },
  };
}
