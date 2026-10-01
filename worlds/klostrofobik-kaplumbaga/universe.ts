import * as THREE from "three";
import { approach } from "../../engine/fx/fade";

/**
 * Daralan evren: duvar yok. Kâğıdın ötesi karanlığa döner ve o karanlık dizeden dizeye yaklaşır; gökyüzü
 * kubbesi ve sis de onunla küçülür. Eşyalar aynı boyda kalır, yalnız yer azalır. Sonda tersine döner:
 * kamera geri çekilirken bütün kâğıdın dev bir kabuğun içinde durduğu görülür (kabuk gezegen boyunda).
 */
export interface Universe {
  /** Kâğıdın şu anki yarıçapı (m). */
  readonly radius: number;
  /** Karanlık düzeyi 0..1 (gök, sis ve ışık buna göre söner). */
  readonly dark: number;
  /** Dış kabuk (son açılışta belirir). */
  readonly outer: THREE.Group;
  update(dt: number, time: number, target: number, sky: THREE.Mesh, fog: THREE.Fog, outerLevel: number): void;
}

export const UNIVERSE_FAR = 160;

/** Kabuk plakaları: koyu zeytin altıgenler (dış kabuk için, büyük ölçek). */
function shellTexture(random: () => number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#2d2d1a";
  g.fillRect(0, 0, 1024, 512);
  const cell = 110;
  for (let y = -cell; y < 512 + cell; y += cell * 0.86) {
    for (let x = -cell; x < 1024 + cell; x += cell) {
      const cx = x + ((Math.round(y / (cell * 0.86)) % 2) * cell) / 2;
      const r = cell * 0.47;
      g.fillStyle = `hsl(${50 + random() * 12}, ${30 + random() * 12}%, ${24 + random() * 12}%)`;
      g.beginPath();
      for (let k = 0; k < 6; k += 1) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        g.lineTo(cx + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(230,205,140,0.55)";
      g.lineWidth = 6;
      g.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 3);
  return texture;
}

export function createUniverse(scene: THREE.Scene, random: () => number): Universe {
  // Karanlık halka: kâğıdın ötesi. İç yarıçap daraldıkça dünya küçülür.
  const voidMaterial = new THREE.MeshBasicMaterial({ color: "#050403", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false });
  const void_ = new THREE.Mesh(new THREE.RingGeometry(1, 4, 128), voidMaterial);
  void_.rotation.x = -Math.PI / 2;
  void_.position.y = 0.06;
  void_.renderOrder = 3;
  void_.visible = false;
  scene.add(void_);
  // Ufuk: kâğıdın bittiği yerde yükselen karanlık (doku yok, duvar değil: hiçliğin kendisi).
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 40, 128, 1, true), new THREE.MeshBasicMaterial({ color: "#050403", transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  rim.position.y = 20;
  rim.renderOrder = 3;
  rim.visible = false;
  scene.add(rim);
  // Kenar: kâğıdın ucunda ince, koyu bir kıvrım (kalkık kâğıt kenarı gibi).
  const edge = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.005, 160), new THREE.MeshStandardMaterial({ color: "#3a2a12", roughness: 0.95, transparent: true, opacity: 0, fog: false, side: THREE.DoubleSide }));
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = 0.08;
  edge.renderOrder = 4;
  edge.visible = false;
  scene.add(edge);
  // Dış kabuk: dünyayı içine alan dev kubbe; yalnız son açılışta belirir.
  const outer = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: shellTexture(random), roughness: 0.85, side: THREE.BackSide, transparent: true, opacity: 0, fog: false, emissive: "#2a2416", emissiveIntensity: 0.6 }));
  outer.add(dome);
  outer.visible = false;
  scene.add(outer);

  let radius = UNIVERSE_FAR;
  let level = 0;
  let outerShown = 0;
  let dark = 0;
  const paper = new THREE.Color("#d9b56a");
  const night = new THREE.Color("#0b0806");
  return {
    get radius() {
      return radius;
    },
    get dark() {
      return dark;
    },
    outer,
    update(dt, time, target, sky, fog, outerLevel) {
      radius = approach(radius, target, target < radius ? 0.3 : 0.9, dt);
      // Açılışta (dış kabuk belirirken) karanlık hemen kalkar: kâğıt geri gelir, kabuk görünür.
      const lifting = outerLevel > 0.5;
      const want = radius < UNIVERSE_FAR - 4 && !lifting ? 1 : 0;
      level = approach(level, want, lifting ? 2.5 : 1.4, dt);
      void_.visible = level > 0.01;
      rim.visible = level > 0.01;
      edge.visible = level > 0.01;
      if (void_.visible) {
        // Nefes: daraldıkça kenar nabız gibi oynar.
        const breath = Math.sin(time * 1.9) * 0.4 * (1 - Math.min(1, radius / 60));
        const r = radius + breath;
        void_.scale.set(r, r, 1);
        rim.scale.set(r, 1, r);
        edge.scale.set(r, r, 1);
        voidMaterial.opacity = level;
        // Ufuktaki karanlık önce ince bir çizgidir; kâğıt küçüldükçe göğe doğru yükselir.
        const k0 = THREE.MathUtils.clamp(1 - radius / UNIVERSE_FAR, 0, 1);
        (rim.material as THREE.MeshBasicMaterial).opacity = level * THREE.MathUtils.smoothstep(k0, 0.14, 0.55);
        (edge.material as THREE.MeshStandardMaterial).opacity = level;
      }
      // Gök ve sis de kararır: ufuk kapanır, ışık azalır. Karanlık yarıçapla birlikte gelir.
      const k = THREE.MathUtils.clamp(radius / UNIVERSE_FAR, 0.06, 1);
      dark = THREE.MathUtils.clamp(1 - k, 0, 1) * level;
      const skyUniforms = (sky.material as THREE.ShaderMaterial).uniforms;
      if (skyUniforms.uDark) skyUniforms.uDark.value = Math.pow(dark, 0.8) * 0.96;
      fog.color.copy(paper).lerp(night, Math.pow(dark, 0.9));
      fog.near = THREE.MathUtils.lerp(4, 70, k);
      fog.far = THREE.MathUtils.lerp(22, 220, k);
      // Dış kabuk: gezegen boyunda; içeriden görünür, kamera uzaklaştıkça bütün kâğıt onun içinde kalır.
      outerShown = approach(outerShown, outerLevel, 0.8, dt);
      outer.visible = outerShown > 0.01;
      if (outer.visible) {
        const size = 420;
        outer.scale.setScalar(size);
        outer.position.y = -size * 0.15;
        const material = dome.material as THREE.MeshStandardMaterial;
        material.opacity = outerShown;
        // Son nefes: kubbe hafifçe genişleyip daralır.
        const breathe = 1 + Math.sin(time * 0.8) * 0.01 * outerShown;
        outer.scale.setScalar(size * breathe);
      }
    },
  };
}
