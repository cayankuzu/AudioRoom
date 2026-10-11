import * as THREE from "three";
import { fitModel } from "../../../../engine/core/models";
import type { SceneKit } from "../kit";
import { CASE_GRID, COL_X, CURTAIN, DOOR, FLAWED, HALL, KEY_CASE, OPENING, PEDESTALS, SHEETS, STORAGE, ZONES, type Archive, type ArchiveCase } from "./types";

/**
 * Aşk, Virüs — ARŞİV. Kraterin ortasına gömülü, anıtsal, tertemiz, biraz insansız bir koruma arşivi: cilalı beton, beyaz
 * mineral kaideler, fırçalanmış alüminyum çerçeveler, füme cam. Bütün geometri prosedüreldir; vitrinlerdeki nesneler hazır
 * modellerden (Poly Haven, CC0) ya da sade yedeklerden. Hiç ışık eklenmez (dünya iki nokta ışığını paylaşır); okunurluk
 * tavan şeritlerinin kendi parıltısından ve malzeme renklerinden gelir. Yazı yok. Konumlar arşivin yerel uzayındadır
 * (types.ts): köken zemin merkezi, +x doğu (kapı), +z kuzey (cam duvarlar), zemin y = 0.
 */

const { clamp, lerp } = THREE.MathUtils;

/** Vitrinlerde gezen nesneler (hazır modeller; eksikse sade yedek). */
const PROPS = ["pocket_watch", "round_spectacles", "vintage_lighter", "cigarette_case", "seadogs_compass", "postcard_set_01", "ceramic_vase_01", "brass_goblets", "tea_set_01", "lambis_shell", "camera_01", "cassette_player", "alarm_clock_01", "binder_notebook", "mantel_clock_01", "jug_01"] as const;

/** Levhalardaki soyut işaretler: kısa çizgiler, noktalar, kırık vuruşlar, katalog şeritleri — harf değil. */
function marksTexture(random: () => number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 384;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#f1f2f4";
  g.fillRect(0, 0, 256, 384);
  g.strokeStyle = "rgba(60,62,70,0.55)";
  g.fillStyle = "rgba(60,62,70,0.5)";
  g.lineWidth = 2;
  for (let row = 0; row < 14; row += 1) {
    const y = 28 + row * 24 + (random() - 0.5) * 4;
    let x = 22 + random() * 20;
    while (x < 230) {
      const kind = random();
      const w = 6 + random() * 26;
      if (kind < 0.55) {
        g.beginPath();
        g.moveTo(x, y + (random() - 0.5) * 3);
        g.lineTo(x + w, y + (random() - 0.5) * 3);
        g.stroke();
      } else if (kind < 0.8) {
        g.beginPath();
        g.arc(x + 3, y, 1.6 + random() * 1.2, 0, Math.PI * 2);
        g.fill();
      } else {
        g.fillRect(x, y - 5, w * 0.4, 9);
      }
      x += w + 6 + random() * 10;
    }
  }
  // Katalog şeridi: üstte kalın bar, sağda kırık kutu.
  g.fillRect(22, 10, 110, 5);
  g.strokeRect(190, 8, 44, 12);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Anahtarın pürüz haritası: düz gri üstünde birkaç çizik. */
function scratchTexture(random: () => number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext("2d")!;
  g.fillStyle = "#737373";
  g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 26; i += 1) {
    g.strokeStyle = random() < 0.5 ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)";
    g.lineWidth = 0.6 + random();
    const x = random() * 128;
    const y = random() * 128;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (random() - 0.5) * 60, y + (random() - 0.5) * 12);
    g.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

/** Boş palto kalıbı: omuzda geniş, aşağı doğru hafif daralan yassı kabuk + askı kancası. Köken: kancanın tepesi. */
function garmentGeometry(): THREE.BufferGeometry {
  const around = 10;
  const rings = 7;
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rings; r += 1) {
    const v = r / rings;
    const y = -0.08 - v * 1.1;
    // Omuz 0,46 geniş, 0,14 kalın; etek 0,36 geniş, 0,1 kalın; omuzun hemen altında hafif içe büzülür (boyun).
    const widen = v < 0.12 ? lerp(0.55, 1, v / 0.12) : lerp(1, 0.78, (v - 0.12) / 0.88);
    const wx = 0.23 * widen;
    const wz = 0.07 * widen;
    for (let a = 0; a <= around; a += 1) {
      const th = (a / around) * Math.PI * 2;
      positions.push(Math.cos(th) * wx, y, Math.sin(th) * wz);
      const n = new THREE.Vector3(Math.cos(th) / wx, 0, Math.sin(th) / wz).normalize();
      normals.push(n.x, n.y, n.z);
    }
  }
  for (let r = 0; r < rings; r += 1) {
    for (let a = 0; a < around; a += 1) {
      const i = r * (around + 1) + a;
      const j = i + around + 1;
      indices.push(i, j, i + 1, j, j + 1, i + 1);
    }
  }
  const shell = new THREE.BufferGeometry();
  shell.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  shell.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  shell.setIndex(indices);
  // Kanca: küçük bir yarım halka tepede (tüp ince).
  const hook = new THREE.TorusGeometry(0.03, 0.004, 5, 10, Math.PI);
  hook.translate(0, -0.03, 0);
  const hookPos = hook.getAttribute("position") as THREE.BufferAttribute;
  const hookNor = hook.getAttribute("normal") as THREE.BufferAttribute;
  const base = positions.length / 3;
  for (let i = 0; i < hookPos.count; i += 1) {
    positions.push(hookPos.getX(i), hookPos.getY(i), hookPos.getZ(i));
    normals.push(hookNor.getX(i), hookNor.getY(i), hookNor.getZ(i));
  }
  const hookIndex = hook.getIndex()!;
  for (let i = 0; i < hookIndex.count; i += 1) indices.push(base + hookIndex.getX(i));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  shell.dispose();
  hook.dispose();
  return geometry;
}

export function createArchive(kit: SceneKit, random: () => number): Archive {
  const group = new THREE.Group();
  group.name = "archive";

  // --- Malzemeler (paylaşılır) ----------------------------------------------------------------------------------------
  const concrete = new THREE.MeshStandardMaterial({ color: "#c9c7c2", roughness: 0.85, metalness: 0 });
  const concreteDark = new THREE.MeshStandardMaterial({ color: "#8d8b86", roughness: 0.9, metalness: 0 });
  const floorMat = new THREE.MeshStandardMaterial({ color: "#b9b7b2", roughness: 0.55, metalness: 0 });
  const mineral = new THREE.MeshStandardMaterial({ color: "#e4e2dd", roughness: 0.6, metalness: 0 });
  /** Vitrin içi arka: orta gri (beyaz arka yakın planda patlıyordu). */
  const caseBack = new THREE.MeshStandardMaterial({ color: "#a9a7a2", roughness: 0.8, metalness: 0 });
  // Ortam haritası yok: yüksek metalness simsiyah çıkar; fırçalanmış alüminyum düşük metalness + açık renkle okunur.
  const aluminium = new THREE.MeshStandardMaterial({ color: "#b4b7bb", roughness: 0.45, metalness: 0.35 });
  const glassBase = new THREE.MeshPhysicalMaterial({ color: "#dfe6ea", roughness: 0.12, metalness: 0, transparent: true, opacity: 0.16, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide });
  const pitMat = new THREE.MeshStandardMaterial({ color: "#141416", roughness: 1, metalness: 0, side: THREE.BackSide });
  const stripMat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
  const plasticCover = new THREE.MeshStandardMaterial({ color: "#ececf0", roughness: 0.35, metalness: 0, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  const marks = marksTexture(random);
  const sheetMat = new THREE.MeshStandardMaterial({ color: "#e9ebee", map: marks, roughness: 0.7, metalness: 0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });

  const solids: THREE.Mesh[] = [];
  /** Kutu: merkez konumlu; duvarlar gölge atar ve alır. */
  const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = group, shadow = true) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  /** Dikey cam pano (PlaneGeometry +z'ye bakar; `faceZ` -1 ise odaya güneye bakacak biçimde çevrilir). */
  const pane = (w: number, h: number, x: number, y: number, z: number, faceZ: 1 | -1, parent: THREE.Object3D = group) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassBase);
    mesh.position.set(x, y, z);
    if (faceZ < 0) mesh.rotation.y = Math.PI;
    mesh.renderOrder = 5;
    parent.add(mesh);
    return mesh;
  };
  /** Cam duvar: pano + 3 m'de bir alüminyum dikme + alt/üst ray; `skirt` altta beton etek. */
  const glassWall = (x0: number, x1: number, z: number, h: number, faceZ: 1 | -1) => {
    const w = x1 - x0;
    const cx = (x0 + x1) / 2;
    const mesh = pane(w, h, cx, h / 2, z, faceZ);
    for (let x = x0; x <= x1 + 1e-6; x += 3) box(0.12, h, 0.12, aluminium, Math.min(x, x1), h / 2, z);
    box(w, 0.1, 0.14, aluminium, cx, h - 0.05, z);
    box(w, 0.08, 0.14, aluminium, cx, 0.04, z);
    return mesh;
  };

  // --- Kabuk: zemin (cam zemin paneli için delikli), çukur, dış duvarlar, etek, çatı ve çatı yarıkları -------------------
  const FL = 0.3;
  const floorAt = (x0: number, x1: number, z0: number, z1: number) => {
    const m = box(x1 - x0, FL, z1 - z0, floorMat, (x0 + x1) / 2, -FL / 2, (z0 + z1) / 2, group, false);
    m.receiveShadow = true;
    return m;
  };
  const GF = { x0: 15, x1: 23, z0: -2, z1: 2 };
  floorAt(HALL.x0, GF.x0, HALL.z0, HALL.z1);
  floorAt(GF.x0, GF.x1, HALL.z0, GF.z0);
  floorAt(GF.x0, GF.x1, GF.z1, HALL.z1);
  floorAt(GF.x1, HALL.x1, HALL.z0, HALL.z1);
  // Çukur: içi koyu (arka yüzler çizilir); cam panel üstünde.
  const pit = new THREE.Mesh(new THREE.BoxGeometry(GF.x1 - GF.x0, 1.2, GF.z1 - GF.z0), pitMat);
  pit.position.set((GF.x0 + GF.x1) / 2, -0.6, 0);
  group.add(pit);
  const glassFloor = new THREE.Mesh(new THREE.PlaneGeometry(GF.x1 - GF.x0, GF.z1 - GF.z0), glassBase);
  glassFloor.rotation.x = -Math.PI / 2;
  glassFloor.position.set((GF.x0 + GF.x1) / 2, 0.002, 0);
  glassFloor.renderOrder = 5;
  group.add(glassFloor);
  // Cam zemin kenar çıtaları.
  box(GF.x1 - GF.x0 + 0.1, 0.03, 0.06, aluminium, (GF.x0 + GF.x1) / 2, 0.012, GF.z0);
  box(GF.x1 - GF.x0 + 0.1, 0.03, 0.06, aluminium, (GF.x0 + GF.x1) / 2, 0.012, GF.z1);

  const W = HALL.wall;
  const skirtH = HALL.skirt;
  const wallH = HALL.h + skirtH;
  const wallY = (HALL.h - skirtH) / 2;
  // Güney ve batı dış duvarları (tam yükseklik, etek dahil).
  solids.push(box(HALL.x1 - HALL.x0 + 2 * W, wallH, W, concrete, 0, wallY, HALL.z0 - W / 2));
  solids.push(box(W, wallH, HALL.z1 - HALL.z0, concrete, HALL.x0 - W / 2, wallY, 0));
  // Doğu duvarı: kapı boşluğu (z ±w/2, y 0…h), üstünde lento, altında etek.
  const dz = DOOR.w / 2;
  solids.push(box(W, wallH, HALL.z1 - dz, concrete, HALL.x1 + W / 2, wallY, (dz + HALL.z1) / 2));
  solids.push(box(W, wallH, HALL.z1 - dz, concrete, HALL.x1 + W / 2, wallY, -(dz + HALL.z1) / 2));
  box(W, HALL.h - DOOR.h, DOOR.w, concrete, HALL.x1 + W / 2, (HALL.h + DOOR.h) / 2, 0);
  box(W, skirtH, DOOR.w, concrete, HALL.x1 + W / 2, -skirtH / 2, 0);
  // Kuzey dış duvarı: beton (depo, koridor yanı) + cam (levhalar, koleksiyon, galeri); etek baştan başa beton.
  box(HALL.x1 - HALL.x0 + 2 * W, skirtH, W, concrete, 0, -skirtH / 2, HALL.z1 + W / 2);
  solids.push(box(ZONES.storage.x1 - HALL.x0, HALL.h, W, concrete, (HALL.x0 + ZONES.storage.x1) / 2, HALL.h / 2, HALL.z1 + W / 2));
  solids.push(box(ZONES.gallery.x0 - ZONES.corridor.x0, HALL.h, W, concrete, (ZONES.corridor.x0 + ZONES.gallery.x0) / 2, HALL.h / 2, HALL.z1 + W / 2));
  const galleryGlass = glassWall(ZONES.gallery.x0, HALL.x1, HALL.z1, HALL.h, -1);
  const collectionGlass = glassWall(ZONES.collection.x0, ZONES.collection.x1, HALL.z1, HALL.h, -1);
  glassWall(ZONES.sheets.x0, ZONES.sheets.x1, HALL.z1, HALL.h, -1);
  // Etek: zeminin altındaki boşluğu kapatan koyu kuşak (dıştan yapı toprağa gömülü okunur).
  box(HALL.x1 - HALL.x0 + 2 * W + 0.2, 0.6, HALL.z1 - HALL.z0 + 2 * W + 0.2, concreteDark, 0, -skirtH - 0.3, 0);

  // Çatı: koleksiyon ve galeri üstünde cam yarıklar (z ±0,8), gerisi beton plak.
  const RT = 0.4;
  const roofAt = (x0: number, x1: number, z0: number, z1: number) => box(x1 - x0, RT, z1 - z0, concrete, (x0 + x1) / 2, HALL.h + RT / 2, (z0 + z1) / 2);
  const SKY = 0.8;
  roofAt(HALL.x0, ZONES.collection.x0, HALL.z0, HALL.z1);
  roofAt(ZONES.collection.x0, ZONES.collection.x1, HALL.z0, -SKY);
  roofAt(ZONES.collection.x0, ZONES.collection.x1, SKY, HALL.z1);
  roofAt(ZONES.collection.x1, ZONES.gallery.x0, HALL.z0, HALL.z1);
  roofAt(ZONES.gallery.x0, HALL.x1, HALL.z0, -SKY);
  roofAt(ZONES.gallery.x0, HALL.x1, SKY, HALL.z1);
  const skylights: THREE.Mesh[] = [];
  for (const [x0, x1] of [[ZONES.collection.x0, ZONES.collection.x1], [ZONES.gallery.x0, HALL.x1]] as const) {
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, SKY * 2), glassBase);
    sky.rotation.x = Math.PI / 2;
    sky.position.set((x0 + x1) / 2, HALL.h + 0.2, 0);
    sky.renderOrder = 5;
    group.add(sky);
    skylights.push(sky);
    box(x1 - x0, 0.12, 0.12, aluminium, (x0 + x1) / 2, HALL.h + 0.2, -SKY);
    box(x1 - x0, 0.12, 0.12, aluminium, (x0 + x1) / 2, HALL.h + 0.2, SKY);
  }

  // --- Bölme duvarları (merkezde geçit) ve bölgelerin alçak tavanları --------------------------------------------------
  const PT = 0.3;
  const partition = (x: number, h = HALL.h) => {
    const side = (HALL.z1 - OPENING.w / 2);
    box(PT, h + 0.2, side, concrete, x, (h - 0.2) / 2, (OPENING.w / 2 + HALL.z1) / 2);
    box(PT, h + 0.2, side, concrete, x, (h - 0.2) / 2, -(OPENING.w / 2 + HALL.z1) / 2);
    box(PT, h - OPENING.h, OPENING.w, concrete, x, (h + OPENING.h) / 2, 0);
  };
  partition(ZONES.gallery.x0);
  partition(ZONES.corridor.x0);
  partition(ZONES.collection.x0);
  partition(ZONES.sheets.x0);
  // Koridor: hareketli duvarlar ve tavan (daralma).
  const corridorGroup = new THREE.Group();
  group.add(corridorGroup);
  const cw = ZONES.corridor;
  const corridorLen = cw.x1 - cw.x0;
  const wallN = box(corridorLen, cw.h, 0.25, concrete, (cw.x0 + cw.x1) / 2, cw.h / 2, cw.halfWidth, corridorGroup);
  const wallS = box(corridorLen, cw.h, 0.25, concrete, (cw.x0 + cw.x1) / 2, cw.h / 2, -cw.halfWidth, corridorGroup);
  const corridorCeiling = box(corridorLen, 0.3, cw.halfWidth * 2 + 0.5, concrete, (cw.x0 + cw.x1) / 2, cw.h + 0.15, 0, corridorGroup);
  // Levhalar odası: güney duvar beton, kuzey duvar cam (yansıma koridoru), tavan 6.
  const sh = ZONES.sheets;
  box(sh.x1 - sh.x0, sh.h, PT, concrete, (sh.x0 + sh.x1) / 2, sh.h / 2, -sh.halfWidth);
  const sheetsGlass = glassWall(sh.x0, sh.x1, sh.halfWidth, sh.h, -1);
  box(sh.x1 - sh.x0, 0.3, sh.halfWidth * 2 + 0.6, concrete, (sh.x0 + sh.x1) / 2, sh.h + 0.15, 0);
  // Depo tavanı.
  box(ZONES.storage.x1 - HALL.x0, 0.3, HALL.z1 - HALL.z0, concrete, (HALL.x0 + ZONES.storage.x1) / 2, ZONES.storage.h + 0.15, 0);

  // --- Tavan ışık şeritleri ----------------------------------------------------------------------------------------------
  const strip = (x0: number, x1: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.06, 0.12), stripMat);
    mesh.position.set((x0 + x1) / 2, y, z);
    group.add(mesh);
    return mesh;
  };
  for (const z of [-11, -5, 5, 11]) {
    strip(ZONES.collection.x0 + 0.5, ZONES.collection.x1 - 0.5, HALL.h - 0.08, z);
    strip(ZONES.gallery.x0 + 0.5, HALL.x1 - 0.5, HALL.h - 0.08, z);
  }
  const corridorStrip = new THREE.Mesh(new THREE.BoxGeometry(corridorLen - 0.6, 0.06, 0.12), stripMat);
  corridorStrip.position.set((cw.x0 + cw.x1) / 2, cw.h - 0.06, 0);
  corridorGroup.add(corridorStrip);
  for (const z of [-3, 3]) strip(sh.x0 + 0.3, sh.x1 - 0.3, sh.h - 0.08, z);
  for (const z of [-8, 0, 8]) strip(HALL.x0 + 0.5, ZONES.storage.x1 - 0.5, ZONES.storage.h - 0.08, z);

  // --- Vitrinler ------------------------------------------------------------------------------------------------------------
  /** Vitrin: alüminyum kabuk (arka, yanlar, alt, üst), beyaz iç arka, ön cam (kendi malzeme örneği), ön çıtalar, yuva. */
  const makeCase = (w: number, h: number, d: number): ArchiveCase => {
    const g = new THREE.Group();
    const T = 0.02;
    box(w, h, T, aluminium, 0, 0, -d / 2 + T / 2, g);
    box(w, T, d, aluminium, 0, h / 2 - T / 2, 0, g);
    box(w, T, d, aluminium, 0, -h / 2 + T / 2, 0, g);
    box(T, h, d, aluminium, -w / 2 + T / 2, 0, 0, g);
    box(T, h, d, aluminium, w / 2 - T / 2, 0, 0, g);
    box(w - 2 * T, h - 2 * T, 0.004, caseBack, 0, 0, -d / 2 + T + 0.003, g, false);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 2 * T, h - 2 * T), glassBase.clone());
    glass.position.z = d / 2 - 0.003;
    glass.renderOrder = 5;
    g.add(glass);
    const frame = box(w, h, T, aluminium, 0, 0, d / 2 - T / 2, g, false);
    // Ön çerçeve dört çıta: ortası boş kalsın diye kutu yerine dört ince bar.
    g.remove(frame);
    const bars = new THREE.Group();
    box(w, 0.03, T, aluminium, 0, h / 2 - 0.015, d / 2 - T / 2, bars, false);
    box(w, 0.03, T, aluminium, 0, -h / 2 + 0.015, d / 2 - T / 2, bars, false);
    box(0.03, h, T, aluminium, -w / 2 + 0.015, 0, d / 2 - T / 2, bars, false);
    box(0.03, h, T, aluminium, w / 2 - 0.015, 0, d / 2 - T / 2, bars, false);
    g.add(bars);
    const slot = new THREE.Group();
    slot.position.set(0, -h / 2 + T, 0);
    g.add(slot);
    return { group: g, glass, frame: bars.children[0] as THREE.Mesh, slot, front: new THREE.Vector3(), normal: new THREE.Vector3(0, 0, 1), size: { w, h, d } };
  };
  /** Kaide vitrini: mineral kaide + cam küp; yuva kaidenin üstünde. */
  const makePedestal = (x: number, z: number, glassH: number): ArchiveCase => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pw = 0.62;
    box(pw, KEY_CASE.plinth, pw, mineral, 0, KEY_CASE.plinth / 2, 0, g);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(pw, glassH, pw), glassBase.clone());
    glass.position.y = KEY_CASE.plinth + glassH / 2;
    glass.renderOrder = 5;
    g.add(glass);
    // Köşe dikmeleri ve üst çerçeve.
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) box(0.02, glassH, 0.02, aluminium, (sx * (pw - 0.02)) / 2, KEY_CASE.plinth + glassH / 2, (sz * (pw - 0.02)) / 2, g, false);
    const frame = box(pw, 0.02, pw, aluminium, 0, KEY_CASE.plinth + glassH - 0.01, 0, g, false);
    const slot = new THREE.Group();
    slot.position.y = KEY_CASE.plinth;
    g.add(slot);
    group.add(g);
    return { group: g, glass, frame, slot, front: new THREE.Vector3(x, KEY_CASE.plinth + glassH / 2, z + pw / 2), normal: new THREE.Vector3(0, 0, 1), size: { w: pw, h: glassH, d: pw } };
  };

  // Nesneler: hazır modeller (soluk tonlanır) ve sade yedekler; komşular yinelenmez.
  const fillers: Array<() => THREE.Object3D> = [
    () => {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: "#d9d2c6", roughness: 0.95 });
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.07, 0.18), m).translateY(0.035));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.16), m).translateY(0.095));
      return g;
    },
    () => {
      const g = new THREE.Group();
      const colors = ["#5a4a3a", "#3a4a5a", "#6a5a4a"];
      colors.forEach((c, i) => g.add(new THREE.Mesh(new THREE.BoxGeometry(0.2 - i * 0.02, 0.035, 0.14), new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 })).translateY(0.0175 + i * 0.035)));
      return g;
    },
    () => {
      const g = new THREE.Group();
      const m = new THREE.MeshPhysicalMaterial({ color: "#8aa08c", roughness: 0.15, transparent: true, opacity: 0.8, clearcoat: 1 });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.2, 14), m).translateY(0.1));
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.07, 10), m).translateY(0.235));
      return g;
    },
    () => {
      const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.06, 0.005), new THREE.Vector2(0.11, 0.05), new THREE.Vector2(0.12, 0.07), new THREE.Vector2(0.11, 0.07), new THREE.Vector2(0.1, 0.05), new THREE.Vector2(0.05, 0.012), new THREE.Vector2(0, 0.012)];
      return new THREE.Mesh(new THREE.LatheGeometry(pts, 24), new THREE.MeshStandardMaterial({ color: "#e2d8cc", roughness: 0.55 }));
    },
  ];
  let objectIndex = 0;
  const nextObject = (size: number): THREE.Object3D => {
    const total = PROPS.length + fillers.length;
    const i = objectIndex % total;
    objectIndex += 1;
    let object: THREE.Object3D;
    if (i < PROPS.length) {
      const model = kit.models.get(PROPS[i]);
      if (model) {
        object = fitModel(model, size, { by: "height" });
        object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          const material = (mesh.material as THREE.MeshStandardMaterial).clone();
          if (material.color) material.color.multiplyScalar(0.85);
          mesh.material = material;
          mesh.castShadow = true;
        });
      } else object = fillers[i % fillers.length]();
    } else object = fillers[i - PROPS.length]();
    object.rotation.y = (random() - 0.5) * 0.9;
    return object;
  };

  // Koleksiyon ızgarası (güney duvar).
  const cases: ArchiveCase[][] = [];
  for (let r = 0; r < CASE_GRID.rows; r += 1) {
    const row: ArchiveCase[] = [];
    for (let i = 0; i < CASE_GRID.cols; i += 1) {
      const c = makeCase(CASE_GRID.w, CASE_GRID.h, CASE_GRID.d);
      c.group.position.set(COL_X(i), CASE_GRID.rowY[r], CASE_GRID.wallZ + CASE_GRID.d / 2);
      group.add(c.group);
      row.push(c);
    }
    cases.push(row);
  }
  const flawedCase = cases[FLAWED.row][FLAWED.col];
  // Montaj kuşağı: vitrin sıralarının arkasında, duvara dayanan ince alüminyum ray.
  for (const y of CASE_GRID.rowY) box(CASE_GRID.cols * CASE_GRID.dx + 0.4, 0.04, 0.4, aluminium, COL_X((CASE_GRID.cols - 1) / 2), y - CASE_GRID.h / 2 - 0.02, CASE_GRID.wallZ - 0.2);
  // Koridor vitrinleri: duvarların çocuğu (daralmayla birlikte hareket ederler).
  for (const [wall, face] of [[wallN, -1], [wallS, 1]] as const) {
    for (let i = 0; i < 5; i += 1) {
      const c = makeCase(0.8, 0.8, 0.45);
      c.group.position.set(-corridorLen / 2 + 1.6 + i * 1.7, CASE_GRID.rowY[1] - cw.h / 2, face * (0.125 + 0.225));
      if (face < 0) c.group.rotation.y = Math.PI;
      wall.add(c.group);
      c.slot.add(nextObject(0.22));
    }
  }
  const keyCase = makePedestal(KEY_CASE.x, KEY_CASE.z, KEY_CASE.glass);
  const pedestals = PEDESTALS.map((p) => makePedestal(p.x, p.z, 0.9));
  for (const p of pedestals) p.slot.add(nextObject(0.3));
  for (let r = 0; r < CASE_GRID.rows; r += 1) {
    for (let i = 0; i < CASE_GRID.cols; i += 1) {
      if (r === FLAWED.row && i === FLAWED.col) continue;
      cases[r][i].slot.add(nextObject(0.2 + 0.1 * random()));
    }
  }

  // --- Anahtar (kahraman nesne) ve kusurlu fincan ------------------------------------------------------------------------
  const key = new THREE.Group();
  {
    const steel = new THREE.MeshStandardMaterial({ color: "#a4a6aa", metalness: 0.55, roughness: 0.4, roughnessMap: scratchTexture(random) });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.056, 10), steel);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.009, 0.004, 0);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0025, 8, 20), steel);
    bow.rotation.x = Math.PI / 2;
    bow.position.set(-0.03, 0.004, 0);
    const bit1 = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.012), steel);
    bit1.position.set(0.026, 0.004, 0.006);
    const bit2 = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.009), steel);
    bit2.position.set(0.035, 0.004, 0.0045);
    for (const m of [shaft, bow, bit1, bit2]) m.castShadow = true;
    key.add(shaft, bow, bit1, bit2);
    key.position.y = 0.003;
    keyCase.slot.add(key);
  }
  const cup = new THREE.Group();
  {
    const ceramic = new THREE.MeshStandardMaterial({ color: "#e8e2d8", roughness: 0.6 });
    const pts = [0, 0.03, 0.035, 0.038, 0.04, 0.037, 0.035, 0.032, 0].map((r, i) => new THREE.Vector2(r, [0, 0, 0.01, 0.05, 0.09, 0.09, 0.05, 0.012, 0.012][i]));
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), ceramic);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.004, 8, 16, Math.PI * 1.2), ceramic);
    handle.position.set(0.042, 0.05, 0);
    handle.rotation.z = -Math.PI * 0.1;
    // Kılcal çatlak: ön yüzde ince koyu çizgi.
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.05, 0.0012), new THREE.MeshStandardMaterial({ color: "#3a3230", roughness: 1 }));
    crack.position.set(0.006, 0.055, 0.0385);
    crack.rotation.z = 0.18;
    body.castShadow = true;
    cup.add(body, handle, crack);
    cup.rotation.y = -0.4;
    flawedCase.slot.add(cup);
  }

  // --- Kapı: iki kayar füme cam panel; dışarıda platform ve rampa -------------------------------------------------------
  const doorGroup = new THREE.Group();
  group.add(doorGroup);
  const panelW = DOOR.w / 2;
  const panels: THREE.Object3D[] = [];
  for (const side of [-1, 1] as const) {
    const panel = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(panelW - 0.08, DOOR.h - 0.1), glassBase.clone());
    glass.rotation.y = Math.PI / 2;
    glass.renderOrder = 5;
    panel.add(glass);
    box(0.06, DOOR.h, 0.06, aluminium, 0, 0, side * (panelW / 2 - 0.03), panel);
    box(0.06, DOOR.h, 0.06, aluminium, 0, 0, -side * (panelW / 2 - 0.03), panel);
    box(0.06, 0.06, panelW, aluminium, 0, DOOR.h / 2 - 0.03, 0, panel);
    box(0.06, 0.06, panelW, aluminium, 0, -DOOR.h / 2 + 0.03, 0, panel);
    panel.position.set(DOOR.x, DOOR.h / 2, side * panelW / 2);
    doorGroup.add(panel);
    panels.push(panel);
    panel.userData.side = side;
  }
  box(0.2, 0.12, DOOR.w + 3.6, aluminium, DOOR.x, DOOR.h + 0.06, 0);
  const platform = box(DOOR.platform, 0.3, 8, concrete, HALL.x1 + W + DOOR.platform / 2, -0.15, 0);
  solids.push(platform);
  box(DOOR.platform, skirtH - 0.3, 8, concreteDark, HALL.x1 + W + DOOR.platform / 2, -0.3 - (skirtH - 0.3) / 2, 0);
  const rampLen = Math.hypot(8, 4);
  const ramp = box(rampLen, 0.3, 8, concrete, HALL.x1 + W + DOOR.platform + 4, -2.15, 0);
  ramp.rotation.z = -Math.atan2(4, 8);
  const door = {
    group: doorGroup,
    open(k: number) {
      const kk = clamp(k, 0, 1);
      for (const panel of doorGroup.children) {
        const side = panel.userData.side as number;
        panel.position.z = side * (panelW / 2 + kk * (panelW + 0.1));
      }
    },
    inside: new THREE.Vector3(24.6, 0, 0),
    outside: new THREE.Vector3(28.5, 0, 0),
  };

  // --- Levhalar odası -----------------------------------------------------------------------------------------------------
  const sheetsGroup = new THREE.Group();
  group.add(sheetsGroup);
  const sheetGeometry = new THREE.PlaneGeometry(SHEETS.w, SHEETS.h);
  const wireGeometry = new THREE.CylinderGeometry(0.003, 0.003, 2.3 - SHEETS.bottom - SHEETS.h, 5);
  const wireMat = new THREE.MeshStandardMaterial({ color: "#6a6c70", roughness: 0.5, metalness: 0.6 });
  const all: THREE.Mesh[] = [];
  let hero!: THREE.Mesh;
  const heroPos = new THREE.Vector3();
  for (let j = 0; j < SHEETS.rows; j += 1) {
    const z = SHEETS.z0 + j * SHEETS.dz;
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, SHEETS.cols * SHEETS.dx + 0.4, 8), aluminium);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(SHEETS.x0 + ((SHEETS.cols - 1) * SHEETS.dx) / 2, 2.3, z);
    sheetsGroup.add(rail);
    for (let i = 0; i < SHEETS.cols; i += 1) {
      const x = SHEETS.x0 + i * SHEETS.dx;
      const isHero = j === SHEETS.hero.row && i === SHEETS.hero.col;
      const sheet = new THREE.Mesh(sheetGeometry, isHero ? sheetMat.clone() : sheetMat);
      sheet.position.set(x, SHEETS.bottom + SHEETS.h / 2, z);
      sheet.rotation.y = (random() - 0.5) * 0.08;
      sheet.renderOrder = 4;
      sheetsGroup.add(sheet);
      const wire = new THREE.Mesh(wireGeometry, wireMat);
      wire.position.set(x, SHEETS.bottom + SHEETS.h + (2.3 - SHEETS.bottom - SHEETS.h) / 2, z);
      sheetsGroup.add(wire);
      all.push(sheet);
      if (isHero) {
        hero = sheet;
        heroPos.copy(sheet.position);
      }
    }
  }
  const stripGeometry = (i: number, n: number, w: number, h: number) => {
    const geometry = new THREE.PlaneGeometry(w, h);
    const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
    for (let k = 0; k < uv.count; k += 1) uv.setX(k, (i + uv.getX(k)) / n);
    return geometry;
  };
  const strips: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i += 1) {
    const mesh = new THREE.Mesh(stripGeometry(i, 6, SHEETS.w / 6, SHEETS.h), hero.material);
    mesh.visible = false;
    mesh.renderOrder = 4;
    sheetsGroup.add(mesh);
    strips.push(mesh);
  }
  const copies: THREE.Mesh[] = [];
  for (let j = 0; j < 24; j += 1) {
    const mesh = new THREE.Mesh(stripGeometry(j % 6, 6, SHEETS.w / 12, SHEETS.h / 2), hero.material);
    mesh.visible = false;
    mesh.renderOrder = 4;
    sheetsGroup.add(mesh);
    copies.push(mesh);
  }
  const frac = (x: number) => x - Math.floor(x);
  let lastTear = -1;
  let lastScatter = -1;
  const setTear = (k: number, scatter: number) => {
    const kk = clamp(k, 0, 1);
    const sc = clamp(scatter, 0, 1);
    if (kk === lastTear && sc === lastScatter) return;
    lastTear = kk;
    lastScatter = sc;
    hero.visible = kk <= 0.001;
    strips.forEach((s, i) => {
      s.visible = kk > 0.001;
      if (!s.visible) return;
      const c = i - 2.5;
      const ang = i * 1.1 + 0.4;
      const drift = sc * (0.5 + 2.0 * frac(i * 0.618));
      s.position.set(heroPos.x + c * (SHEETS.w / 6 + 0.26 * kk) + Math.cos(ang) * drift, heroPos.y + 0.2 * sc * frac(i * 0.37) - 0.1 * sc, heroPos.z + 0.03 * kk * Math.sin(i * 7.3) + Math.sin(ang) * drift * 0.6);
      s.rotation.set(0.1 * sc * Math.sin(i * 2.3), 0.15 * kk * Math.sin(i * 3.1) + 0.6 * sc * Math.sin(i * 1.7), 0.08 * kk * Math.sin(i * 5.7) + 0.3 * sc * Math.cos(i * 2.9));
    });
    copies.forEach((m, j) => {
      const on = clamp((sc - 0.2 - 0.03 * j) / 0.3, 0, 1);
      m.visible = on > 0.001;
      if (!m.visible) return;
      const ang = j * 0.9;
      const radius = (0.8 + 1.9 * frac(j * 0.37)) * on;
      m.position.set(heroPos.x + Math.cos(ang) * radius, heroPos.y - 0.3 + 0.9 * frac(j * 0.53) * on, heroPos.z + Math.sin(ang) * radius * 0.7);
      m.rotation.set(0.4 * Math.sin(j * 1.3) * on, j * 0.7, 0.3 * Math.cos(j * 2.1) * on);
      m.scale.setScalar(0.6 + 0.4 * on);
    });
  };
  setTear(0, 0);

  // --- Depo: raylar ve giysiler ----------------------------------------------------------------------------------------------
  const storageGroup = new THREE.Group();
  group.add(storageGroup);
  const railLen = STORAGE.perRail * STORAGE.spacing + 0.6;
  const railGeometry = new THREE.CylinderGeometry(0.015, 0.015, railLen, 8);
  const count = STORAGE.rails * STORAGE.tiers.length * STORAGE.perRail;
  const garments = new THREE.InstancedMesh(garmentGeometry(), plasticCover, count);
  garments.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  garments.renderOrder = 4;
  garments.frustumCulled = false;
  storageGroup.add(garments);
  const base = new Float32Array(count * 3);
  const current = new Float32Array(count * 3);
  const dist = new Float32Array(count);
  const center = new THREE.Vector3(STORAGE.center.x, 0, STORAGE.center.z);
  {
    let i = 0;
    for (let k = 0; k < STORAGE.rails; k += 1) {
      const z = STORAGE.railZ0 + k * STORAGE.railDz;
      for (const tier of STORAGE.tiers) {
        const rail = new THREE.Mesh(railGeometry, aluminium);
        rail.rotation.z = Math.PI / 2;
        rail.position.set(STORAGE.x0 + (STORAGE.perRail - 1) * STORAGE.spacing / 2, tier, z);
        storageGroup.add(rail);
        for (let n = 0; n < STORAGE.perRail; n += 1) {
          const x = STORAGE.x0 + n * STORAGE.spacing;
          base[i * 3] = x;
          base[i * 3 + 1] = tier + 0.01;
          base[i * 3 + 2] = z;
          dist[i] = Math.hypot(x - center.x, z - center.z);
          i += 1;
        }
      }
    }
  }
  current.set(base);
  const nearest = Array.from({ length: count }, (_, i) => i).filter((i) => dist[i] < 2.6).sort((a, b) => dist[a] - dist[b]);
  const dropped = new Set(nearest.slice(0, 8));
  const white = new THREE.Color("#ffffff");
  const stainColor = new THREE.Color("#a83a46");
  const tmpColor = new THREE.Color();
  const matrix = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const quatFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.2, 0, 0));
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < count; i += 1) {
    // Omuzlar raya dik (askı gibi): ray boyunca bakınca giysinin yüzü görünür.
    matrix.compose(pos.fromArray(base, i * 3), quat.setFromEuler(new THREE.Euler(0, Math.PI / 2 + (random() - 0.5) * 0.3, (random() - 0.5) * 0.05)), one);
    garments.setMatrixAt(i, matrix);
    garments.setColorAt(i, white);
  }
  garments.instanceMatrix.needsUpdate = true;
  if (garments.instanceColor) garments.instanceColor.needsUpdate = true;
  const yaws = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    garments.getMatrixAt(i, matrix);
    matrix.decompose(pos, quat, one.set(1, 1, 1));
    yaws[i] = new THREE.Euler().setFromQuaternion(quat).y;
  }
  let lastClose = 0;
  const setClose = (k: number) => {
    const kk = clamp(k, -1, 1);
    if (kk === lastClose) return;
    lastClose = kk;
    for (const i of nearest) {
      const d = dist[i];
      const w = 1 - d / 2.6;
      const bx = base[i * 3];
      const bz = base[i * 3 + 2];
      let x = bx;
      let y = base[i * 3 + 1];
      let z = bz;
      const dx = center.x - bx;
      const dzc = center.z - bz;
      const len = Math.max(1e-3, Math.hypot(dx, dzc));
      if (kk > 0) {
        x += (dx / len) * 1.2 * kk * w;
        z += (dzc / len) * 1.2 * kk * w;
        y -= 0.15 * kk * w;
        quat.setFromEuler(new THREE.Euler(0.12 * kk * w, yaws[i], 0));
      } else {
        const push = -kk;
        x -= (dx / len) * 0.9 * push * w;
        z -= (dzc / len) * 0.9 * push * w;
        if (dropped.has(i)) {
          // Düşen giysi: yere yatar (kalıbın boyu 1,1: kökeni yerin biraz üstünde kalır).
          y = lerp(base[i * 3 + 1], 0.1, push);
          quat.slerpQuaternions(quat.setFromEuler(new THREE.Euler(0, yaws[i], 0)), quatFlat, push);
        } else quat.setFromEuler(new THREE.Euler(0, yaws[i], 0));
      }
      current[i * 3] = x;
      current[i * 3 + 1] = y;
      current[i * 3 + 2] = z;
      matrix.compose(pos.set(x, y, z), quat, one.set(1, 1, 1));
      garments.setMatrixAt(i, matrix);
    }
    garments.instanceMatrix.needsUpdate = true;
  };
  let lastStain = 0;
  const setStain = (k: number) => {
    const kk = clamp(k, 0, 1);
    if (kk === lastStain) return;
    lastStain = kk;
    for (let i = 0; i < count; i += 1) {
      if (dist[i] >= 4) continue;
      tmpColor.copy(white).lerp(stainColor, kk * (1 - dist[i] / 4));
      garments.setColorAt(i, tmpColor);
    }
    if (garments.instanceColor) garments.instanceColor.needsUpdate = true;
  };
  const garmentPoint = (i: number, out: THREE.Vector3) => out.fromArray(current, clamp(i, 0, count - 1) * 3);

  // --- Plastik perde askısı ---------------------------------------------------------------------------------------------------
  const curtainRail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, CURTAIN.w + 0.4, 10), aluminium);
  curtainRail.rotation.x = Math.PI / 2;
  curtainRail.position.set(CURTAIN.x, CURTAIN.h + 0.1, 0);
  group.add(curtainRail);
  const curtainTop = new THREE.Vector3(CURTAIN.x, CURTAIN.h + 0.05, 0);

  // --- Yinelenen vitrin sırası (depo geçidinin içinde, doğuya bakar) -----------------------------------------------------------
  const repeatGroup = new THREE.Group();
  repeatGroup.position.set(ZONES.sheets.x0 - 0.6, 0, 0);
  repeatGroup.rotation.y = Math.PI / 2;
  group.add(repeatGroup);
  const repeatMaterials: THREE.Material[] = [];
  {
    const backing = box(3.9, 3.6, 0.1, concrete.clone(), 0, 1.8, -0.4, repeatGroup);
    repeatMaterials.push(backing.material as THREE.Material);
    for (let r = 0; r < 3; r += 1) {
      for (let i = 0; i < 3; i += 1) {
        const c = makeCase(CASE_GRID.w, CASE_GRID.h, CASE_GRID.d);
        c.group.position.set((i - 1) * CASE_GRID.dx, CASE_GRID.rowY[r], 0);
        repeatGroup.add(c.group);
        c.slot.add(nextObject(0.22));
      }
    }
    // Malzemeler bu gruba özel kopyalanır (opaklık yalnız burada değişsin).
    repeatGroup.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || mesh === backing) return;
      const cloned = (mesh.material as THREE.Material).clone();
      mesh.material = cloned;
      repeatMaterials.push(cloned);
    });
    for (const m of repeatMaterials) {
      m.userData.baseOpacity = (m as THREE.MeshStandardMaterial).opacity;
      m.transparent = true;
      m.depthWrite = false;
    }
  }
  repeatGroup.visible = false;
  const repeat = {
    group: repeatGroup,
    setOpacity(k: number) {
      const kk = clamp(k, 0, 1);
      repeatGroup.visible = kk > 0.002;
      for (const m of repeatMaterials) (m as THREE.MeshStandardMaterial).opacity = (m.userData.baseOpacity as number) * kk;
    },
  };

  // --- Konumlar: ön yüz merkezleri (arşiv uzayı) ----------------------------------------------------------------------------
  group.updateMatrixWorld(true);
  const frontOf = (c: ArchiveCase) => {
    c.front.copy(c.group.localToWorld(new THREE.Vector3(0, 0, c.size.d / 2)));
    c.normal.copy(new THREE.Vector3(0, 0, 1).transformDirection(c.group.matrixWorld));
  };
  for (const row of cases) for (const c of row) frontOf(c);
  for (const p of pedestals) frontOf(p);
  frontOf(keyCase);
  keyCase.front.set(KEY_CASE.x, KEY_CASE.plinth + KEY_CASE.glass / 2, KEY_CASE.z + 0.31);

  const anchors: Record<string, THREE.Vector3> = {
    galleryCenter: new THREE.Vector3(20, 0, 0),
    corridorEast: new THREE.Vector3(13, 0, 0),
    corridorWest: new THREE.Vector3(5, 0, 0),
    collectionCenter: new THREE.Vector3(-3, 0, 0),
    sheetsCenter: new THREE.Vector3(-13, 0, 0),
    storageCenter: new THREE.Vector3(STORAGE.center.x, 0, STORAGE.center.z),
    doorInside: door.inside.clone(),
    doorOutside: door.outside.clone(),
    keyCaseStand: new THREE.Vector3(19, 0, 1.3),
    flawedStand: new THREE.Vector3(COL_X(FLAWED.col), 0, -12.6),
    curtainEast: new THREE.Vector3(CURTAIN.x + 0.8, 0, 0),
    curtainWest: new THREE.Vector3(CURTAIN.x - 0.8, 0, 0),
  };

  let lastNarrow = -1;
  const corridor = {
    setNarrow(k: number) {
      const kk = clamp(k, 0, 1);
      if (kk === lastNarrow) return;
      lastNarrow = kk;
      wallN.position.z = cw.halfWidth - 0.45 * kk;
      wallS.position.z = -(cw.halfWidth - 0.45 * kk);
      corridorCeiling.position.y = cw.h + 0.15 - 0.4 * kk;
      corridorStrip.position.y = cw.h - 0.06 - 0.4 * kk;
    },
  };
  corridor.setNarrow(0);

  const setLit = (k: number) => {
    stripMat.color.setScalar(0.2 + 1.5 * clamp(k, 0, 1));
  };
  setLit(1);

  return {
    group,
    door,
    keyCase,
    key,
    cup,
    cases,
    flawedCase,
    pedestals,
    corridor,
    glassWalls: {
      gallery: { mesh: galleryGlass, center: new THREE.Vector3((ZONES.gallery.x0 + HALL.x1) / 2, HALL.h / 2, HALL.z1), normal: new THREE.Vector3(0, 0, -1), width: HALL.x1 - ZONES.gallery.x0, height: HALL.h },
      collection: { mesh: collectionGlass, center: new THREE.Vector3((ZONES.collection.x0 + ZONES.collection.x1) / 2, HALL.h / 2, HALL.z1), normal: new THREE.Vector3(0, 0, -1), width: ZONES.collection.x1 - ZONES.collection.x0, height: HALL.h },
      sheets: { mesh: sheetsGlass, center: new THREE.Vector3((sh.x0 + sh.x1) / 2, sh.h / 2, sh.halfWidth), normal: new THREE.Vector3(0, 0, -1), width: sh.x1 - sh.x0, height: sh.h },
    },
    glassFloor,
    sheets: { group: sheetsGroup, all, hero, strips, copies, setTear },
    storage: { group: storageGroup, garments, count, setClose, setStain, garmentPoint },
    curtainTop,
    repeat,
    setLit,
    anchors,
    solidify() {
      for (const mesh of solids) kit.colliders.solid(mesh, { shape: "box", pad: 0.1 });
      for (const p of panels) kit.colliders.solid(p, { shape: "box", pad: 0.1 });
    },
  };
}
