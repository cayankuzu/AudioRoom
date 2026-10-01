import * as THREE from "three";
import { SLEEVE_SIZE } from "./vinyl";

/**
 * Plak kitaplığı: gramofonun yanında duran ahşap dolap. Bir kez gramofona takılan plak artık
 * dünyaya dağılmaz; evren sıfırlanana kadar bu dolapta, parça sırasına göre kendi yuvasında durur.
 * Oyuncu istediğini raftan alıp gramofona takar; gramofondan inen ya da elden bırakılan plak
 * yine rafına döner. Her yuvanın altında parça numaralı bir pirinç plaket vardır.
 */
export interface Shelf {
  readonly root: THREE.Group;
  /** Parça sırasına göre yuva (0'dan başlar); plak bu grubun çocuğu olarak durur. */
  slot(index: number): THREE.Group;
  /** Plağın yuvada duracağı ölçek (dünya ölçeğine oranla). */
  readonly recordScale: number;
  setFilled(index: number, filled: boolean): void;
  update(time: number): void;
}

const COLUMNS = 4;
/** Rafta plak (zarf + zarftan çıkmış plak) bu boyda görünür. */
const SHELF_SLEEVE = 0.36;
const CELL_W = 0.46;
const CELL_H = 0.62;
const DEPTH = 0.42;
const BOARD = 0.045;

/** Pirinç plaket: parça numarası ve adı (uzun adlar sığacak kadar küçülür). */
function plaqueTexture(number: string, title: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 72;
  const g = canvas.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 72);
  grad.addColorStop(0, "#ecd08a");
  grad.addColorStop(0.5, "#b8903f");
  grad.addColorStop(1, "#8a6428");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 72);
  g.strokeStyle = "rgba(60,40,10,0.75)";
  g.lineWidth = 4;
  g.strokeRect(4, 4, 504, 64);
  g.fillStyle = "#2e1e06";
  g.textBaseline = "middle";
  g.font = "700 34px Georgia, serif";
  g.fillText(number, 20, 38);
  let size = 30;
  do {
    g.font = `600 ${size}px Georgia, serif`;
    size -= 1;
  } while (g.measureText(title).width > 400 && size > 14);
  g.fillText(title, 86, 38);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createShelf(titles: readonly string[], worldScale: number): Shelf {
  const count = titles.length;
  const root = new THREE.Group();
  root.name = "record-shelf";
  const columns = Math.min(COLUMNS, count);
  const rows = Math.ceil(count / columns);
  const innerW = columns * CELL_W;
  const innerH = rows * CELL_H;
  const legH = count <= 2 ? 0.75 : 0.16;
  const wood = new THREE.MeshStandardMaterial({ color: "#3b2415", roughness: 0.55, metalness: 0.05 });
  const woodDark = new THREE.MeshStandardMaterial({ color: "#1e120a", roughness: 0.8 });
  const brass = new THREE.MeshStandardMaterial({ color: "#b8904a", roughness: 0.3, metalness: 0.85 });
  const board = (w: number, h: number, d: number, x: number, y: number, z: number, material = wood) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };
  const bottom = legH;
  const top = bottom + innerH;
  const halfW = innerW / 2;
  // Gövde: yanlar, üst, alt, arka; raflar; ön kenarlarda pirinç şerit.
  board(BOARD, innerH + BOARD * 2, DEPTH, -halfW - BOARD / 2, bottom + innerH / 2, 0);
  board(BOARD, innerH + BOARD * 2, DEPTH, halfW + BOARD / 2, bottom + innerH / 2, 0);
  board(innerW + BOARD * 2, BOARD, DEPTH + 0.04, 0, top + BOARD / 2, 0.02);
  board(innerW + BOARD * 2, BOARD, DEPTH, 0, bottom - BOARD / 2, 0);
  board(innerW, innerH, 0.02, 0, bottom + innerH / 2, -DEPTH / 2 + 0.01, woodDark);
  for (let r = 1; r < rows; r += 1) board(innerW, BOARD * 0.8, DEPTH, 0, bottom + r * CELL_H, 0);
  for (let r = 0; r <= rows; r += 1) board(innerW + BOARD * 2, 0.012, 0.012, 0, bottom + r * CELL_H + (r === rows ? BOARD : 0.02), DEPTH / 2 + 0.004, brass);
  // Ayaklar ve üstte küçük bir taç.
  for (const x of [-halfW, halfW]) for (const z of [-DEPTH / 2 + 0.05, DEPTH / 2 - 0.05]) board(0.06, legH, 0.06, x, legH / 2, z, woodDark);
  board(innerW * 0.5, 0.05, 0.08, 0, top + BOARD + 0.025, DEPTH / 2 - 0.06, brass);

  // Yuvalar: plak hafif geriye yaslı durur; altında numaralı plaket; yuva ışığı.
  const slots: THREE.Group[] = [];
  const plaques: THREE.MeshStandardMaterial[] = [];
  const glowMaterial = new THREE.MeshBasicMaterial({ color: "#ffd9a0", transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < count; i += 1) {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = -halfW + CELL_W * (col + 0.5);
    const y = top - CELL_H * (row + 1) + 0.03;
    const slot = new THREE.Group();
    slot.position.set(x, y, -0.02);
    slot.rotation.x = -0.12;
    root.add(slot);
    slots.push(slot);
    const plaqueMaterial = new THREE.MeshStandardMaterial({ map: plaqueTexture(String(i + 1).padStart(2, "0"), titles[i]), roughness: 0.35, metalness: 0.6, emissive: "#ffffff", emissiveIntensity: 0 });
    plaqueMaterial.emissiveMap = plaqueMaterial.map;
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(CELL_W * 0.9, CELL_W * 0.9 * (72 / 512)), plaqueMaterial);
    plaque.position.set(x, y - 0.035, DEPTH / 2 + 0.012);
    root.add(plaque);
    plaques.push(plaqueMaterial);
    // Rafın altına gizli ışık şeridi: karanlık evrenlerde de plaklar okunur.
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(CELL_W * 0.86, 0.018), glowMaterial);
    strip.position.set(x, y + CELL_H - 0.06, DEPTH / 2 - 0.05);
    strip.rotation.x = Math.PI / 2;
    root.add(strip);
  }

  return {
    root,
    slot: (index) => slots[Math.max(0, Math.min(slots.length - 1, index))],
    recordScale: SHELF_SLEEVE / (SLEEVE_SIZE * worldScale),
    setFilled(index, filled) {
      const material = plaques[index];
      if (material) material.emissiveIntensity = filled ? 0.35 : 0.05;
    },
    update(time) {
      glowMaterial.opacity = 0.5 + Math.sin(time * 0.8) * 0.05;
    },
  };
}
