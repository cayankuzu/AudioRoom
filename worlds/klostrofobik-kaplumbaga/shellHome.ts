import * as THREE from "three";
import { fitModel, type Models } from "../../engine/core/models";
import { createFigure, type Figure, type FigurePose } from "../../engine/fx/figure";
import { approach } from "../../engine/fx/fade";
import { glowSprite } from "../../engine/fx/glow";

/**
 * Kabuğun içi: kaplumbağanın evi. Küçük yatak, mutfak köşesi, masa, lamba, fincan, küçük televizyon; boş yer
 * az. Filmin ortasında bu ev bir kez daha, daha küçük belirir (kubbe daralır). Ortada bir çorba kâsesi
 * geçidi kapatır; çatal çorbadan kalkar, dişlerinden çorba akar. Sonda tavan başa değer, nefes görünür olur.
 */
export const SHELL_MODELS = ["small_wooden_table_01", "vintage_oil_lamp", "tea_set_01", "book_encyclopedia_set_01", "ottoman_01", "hanging_picture_frame_01", "potted_plant_02", "wall_clock", "vintage_suitcase", "rubber_boots", "ukulele_01", "wicker_basket_01", "television_01", "vintage_day_bed", "vintage_electric_kettle", "brass_pot_01"];

export interface ShellHome {
  readonly group: THREE.Group;
  readonly man: Figure;
  /** Kubbenin şu anki yarıçapı. */
  readonly radius: number;
  /** Adamın duruşu, yeri (2,8 m'lik eve göre; kubbe daralınca içeri kayar) ve yönü (dışarıdan yönetilir). */
  pose: FigurePose;
  place: { x: number; z: number };
  yaw: number;
  /** Çorba kâsesi (0 yok, 1 var) ve çatalın çalışması. */
  soup: number;
  /** Nefes belirginliği (0..1): sonda kubbe adamla birlikte soluk alır. */
  breath: number;
  /** level 0..1 görünürlük; squeeze 0..1 daralma; cameraInside: kubbe yalnız içeriden çizilir. */
  update(dt: number, time: number, level: number, squeeze: number, cameraInside: boolean): void;
}

const R_WIDE = 2.8;
const R_TIGHT = 1.6;

/** Kabuk içi dokusu: koyu zeytin plakalar, aralarında açık damarlar. */
function shellTexture(random: () => number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#3a3a22";
  g.fillRect(0, 0, 1024, 512);
  const cell = 96;
  for (let y = -cell; y < 512 + cell; y += cell * 0.86) {
    for (let x = -cell; x < 1024 + cell; x += cell) {
      const cx = x + ((Math.round(y / (cell * 0.86)) % 2) * cell) / 2;
      const r = cell * 0.46;
      g.fillStyle = `hsl(${52 + random() * 10}, ${28 + random() * 14}%, ${16 + random() * 10}%)`;
      g.beginPath();
      for (let k = 0; k < 6; k += 1) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        g.lineTo(cx + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(220,200,140,0.35)";
      g.lineWidth = 3;
      g.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 1.5);
  return texture;
}

/** Ahşap zemin: tahta çizgileri. */
function plankTexture(random: () => number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const g = canvas.getContext("2d")!;
  for (let y = 0; y < 512; y += 48) {
    g.fillStyle = `hsl(${28 + random() * 6}, ${40 + random() * 10}%, ${22 + random() * 5}%)`;
    g.fillRect(0, y, 512, 46);
    g.fillStyle = "rgba(0,0,0,0.35)";
    g.fillRect(0, y + 46, 512, 2);
    g.strokeStyle = "rgba(0,0,0,0.18)";
    for (let i = 0; i < 6; i += 1) {
      g.beginPath();
      const x0 = random() * 512;
      g.moveTo(x0, y);
      g.lineTo(x0 + (random() - 0.5) * 30, y + 46);
      g.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

export function createShellHome(scene: THREE.Scene, models: Models, random: () => number): ShellHome {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  // Kubbe: +z'ye bakan dar bir yarık (boyun ağzı) dışında kapalı. İçeriden görünür.
  const gap = 0.62;
  const domeGeometry = new THREE.SphereGeometry(1, 40, 20, Math.PI / 2 + gap / 2, Math.PI * 2 - gap, 0, Math.PI / 2);
  const shellMaterial = new THREE.MeshStandardMaterial({ map: shellTexture(random), roughness: 0.8, side: THREE.BackSide });
  const dome = new THREE.Mesh(domeGeometry, shellMaterial);
  dome.receiveShadow = true;
  group.add(dome);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ map: plankTexture(random), roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.01;
  group.add(floor);
  const lip = new THREE.MeshStandardMaterial({ color: "#2a2a16", roughness: 0.85 });
  const lips = [-1, 1].map((side) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.3), lip);
    group.add(mesh);
    return { mesh, side };
  });

  // Eşyalar: hepsi kubbenin kenarına yaslı; kubbe daraldıkça içeri kayar (yerel konumlar 2,8 m'e göre).
  interface Item {
    object: THREE.Object3D;
    x: number;
    y: number;
    z: number;
    slide: number;
  }
  const items: Item[] = [];
  const put = (name: string, x: number, y: number, z: number, size: number, yaw = 0, by?: "height" | "length", slide = 1) => {
    const source = models.get(name);
    if (!source) return null;
    const object = fitModel(source, size, { by });
    object.position.set(x, y, z);
    object.rotation.y = yaw;
    object.traverse((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    group.add(object);
    items.push({ object, x, y, z, slide });
    return object;
  };
  put("vintage_day_bed", -0.9, 0, -1.9, 1.7, 0.15);
  put("small_wooden_table_01", -1.75, 0, -0.5, 0.75, 0.4);
  put("vintage_oil_lamp", -1.75, 0.55, -0.55, 0.32, 0.3, "height");
  put("tea_set_01", -1.55, 0.55, -0.2, 0.28, -0.4);
  put("television_01", 1.7, 0, -1.55, 0.6, -2.5);
  put("vintage_electric_kettle", 1.95, 0, 0.3, 0.26, 0, "height");
  put("brass_pot_01", 2.05, 0, 0.75, 0.3, 0.4, "height");
  put("book_encyclopedia_set_01", 0.7, 0, -2.25, 0.5, 1.3);
  put("ottoman_01", 1.3, 0, 1.2, 0.5, 0.2, "height");
  put("potted_plant_02", -2.0, 0, 1.2, 0.55, 0, "height");
  put("vintage_suitcase", -1.35, 0, 2.0, 0.6, 1.1);
  put("rubber_boots", -0.6, 0, 2.35, 0.3, 2.6, "height");
  put("ukulele_01", 2.1, 0, -0.5, 0.7, -1.9, "height");
  put("wicker_basket_01", 1.0, 0, 2.1, 0.45, 0.6);
  put("hanging_picture_frame_01", 0, 1.55, -2.6, 0.5, 0, "length", 1);
  put("wall_clock", -2.2, 1.6, 0.6, 0.36, Math.PI / 2 + 0.3, "length", 1);
  const lampLight = new THREE.PointLight("#ffb56a", 0, 7, 1.6);
  lampLight.position.set(-1.6, 0.95, -0.5);
  group.add(lampLight);
  const flame = glowSprite("#ffc27a", 0.6);
  flame.position.set(-1.75, 0.84, -0.55);
  group.add(flame);
  // Televizyon: sessiz, mavi kar.
  const tvGlow = glowSprite("#9ac8ff", 0.9);
  tvGlow.position.set(1.55, 0.55, -1.35);
  group.add(tvGlow);

  // Çorba kâsesi: evin ortasında, geçidi kapatır; çatal çorbadan kalkar, dişlerinden çorba akar.
  const soupGroup = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.95, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#f3ead6", roughness: 0.35, side: THREE.DoubleSide }));
  bowl.position.y = 0.6;
  const soupTop = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshStandardMaterial({ color: "#c46a24", roughness: 0.2 }));
  soupTop.rotation.x = -Math.PI / 2;
  soupTop.position.y = 0.5;
  const fork = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: "#e4e4e8", metalness: 0.5, roughness: 0.3 });
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.03), steel);
  fork.add(handle);
  for (let k = 0; k < 4; k += 1) {
    const tine = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.3, 0.02), steel);
    tine.position.set(-0.075 + k * 0.05, -0.68, 0);
    fork.add(tine);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.035, 0.024), steel);
  bridge.position.y = -0.55;
  fork.add(bridge);
  fork.position.set(0.25, 0.9, 0.1);
  fork.rotation.z = -0.35;
  const dripMaterial = new THREE.MeshStandardMaterial({ color: "#c46a24", roughness: 0.2 });
  const drips = Array.from({ length: 10 }, () => ({ mesh: new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), dripMaterial), vy: 0, life: 0 }));
  drips.forEach((drip) => {
    drip.mesh.visible = false;
    soupGroup.add(drip.mesh);
  });
  // Çatalın dişleri arasında asılı bir çorba perdesi (kalkarken uzar, sonra kopar).
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.3), new THREE.MeshStandardMaterial({ color: "#c46a24", roughness: 0.25, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  sheet.position.set(0, -0.83, 0);
  fork.add(sheet);
  soupGroup.add(bowl, soupTop, fork);
  soupGroup.scale.setScalar(0.001);
  soupGroup.visible = false;
  group.add(soupGroup);
  let forkClock = 0;

  // İçerideki adam: bizim karakter (siyah gömlek). Dışarıdan yönetilen duruş.
  const man = createFigure({ kind: "man", outfit: "man_black", height: 1.8 });
  man.pose = "sit";
  group.add(man.group);

  let radius = R_WIDE;
  let shown = 0;
  const home: ShellHome = {
    group,
    man,
    pose: "sit",
    place: { x: 0.55, z: -0.35 },
    yaw: Math.atan2(-2.3, -0.15),
    soup: 0,
    breath: 0,
    get radius() {
      return radius;
    },
    update(dt, time, level, squeeze, cameraInside) {
      shown = approach(shown, level, 6, dt);
      group.visible = shown > 0.02;
      // Duruş görünürlükten bağımsız güncellenir (perde değişince ev görünmese de adam doğru duruşta bekler).
      man.pose = home.pose;
      if (!group.visible) return;
      dome.visible = cameraInside;
      // Daralma yavaş ve sürekli; sonda nefesle birlikte kubbe soluk alır.
      const target = THREE.MathUtils.lerp(R_WIDE, R_TIGHT, squeeze);
      radius = approach(radius, target, 0.3, dt);
      const inhale = Math.sin(time * 1.25);
      const breath = inhale * (0.02 + 0.07 * home.breath) * (0.3 + squeeze);
      const r = radius + breath;
      dome.scale.setScalar(r);
      floor.scale.setScalar(r);
      const k = r / R_WIDE;
      for (const item of items) {
        const s = THREE.MathUtils.lerp(1, k, item.slide);
        item.object.position.set(item.x * s, item.y, item.z * s);
      }
      lips.forEach(({ mesh, side }) => {
        const a = Math.PI / 2 + (side * gap) / 2;
        mesh.position.set(-Math.cos(a) * r, 0.8, Math.sin(a) * r);
        mesh.rotation.y = -a;
      });
      lampLight.intensity = shown * (2.2 + Math.sin(time * 9) * 0.25);
      lampLight.position.set(-1.6 * k, 0.95, -0.5 * k);
      flame.position.set(-1.75 * k, 0.84, -0.55 * k);
      flame.material.opacity = shown * (0.6 + 0.3 * Math.sin(time * 11));
      tvGlow.position.set(1.55 * k, 0.55, -1.35 * k);
      tvGlow.material.opacity = shown * (0.35 + 0.25 * Math.abs(Math.sin(time * 17)) * Math.abs(Math.sin(time * 3.3)));
      // Çorba: ortada belirir; çatal çorbadan kalkar, dişlerinden damlar, sonra yeniden dalar.
      soupGroup.scale.setScalar(Math.max(0.001, approach(soupGroup.scale.x, home.soup, 2.5, dt)));
      soupGroup.visible = soupGroup.scale.x > 0.01;
      if (soupGroup.visible && home.soup > 0.5) {
        forkClock += dt;
        const cycle = forkClock % 3.2;
        // 0..1,2 kalkış, 1,2..2,2 havada, 2,2..3,2 dalış.
        const up = cycle < 1.2 ? cycle / 1.2 : cycle < 2.2 ? 1 : 1 - (cycle - 2.2) / 1.0;
        const lift = up * up * (3 - 2 * up);
        fork.position.set(0.25, 0.3 + lift * 0.75, 0.1);
        fork.rotation.z = -0.35 - lift * 0.25;
        (sheet.material as THREE.MeshStandardMaterial).opacity = 0.85 * Math.max(0, 1 - Math.max(0, cycle - 1.2) * 1.6);
        sheet.scale.y = 1 + Math.min(1, cycle / 1.2) * 1.4;
        if (cycle > 0.7 && cycle < 2.0 && random() < dt * 9) {
          const drip = drips.find((d) => d.life <= 0);
          if (drip) {
            drip.mesh.visible = true;
            const tineX = -0.075 + Math.floor(random() * 4) * 0.05;
            drip.mesh.position.set(fork.position.x + tineX * Math.cos(fork.rotation.z), fork.position.y - 0.85, fork.position.z);
            drip.vy = 0;
            drip.life = 1.2;
          }
        }
      }
      for (const drip of drips) {
        if (drip.life <= 0) continue;
        drip.life -= dt;
        drip.vy += 6 * dt;
        drip.mesh.position.y -= drip.vy * dt;
        if (drip.mesh.position.y < 0.5 || drip.life <= 0) {
          drip.life = 0;
          drip.mesh.visible = false;
        }
      }
      man.pose = home.pose;
      man.energy = home.pose === "tired" ? 0.4 : 0.3;
      man.group.position.set(home.place.x * k, 0, home.place.z * k);
      man.group.rotation.y = home.yaw;
      man.update(dt, time);
    },
  };
  return home;
}
