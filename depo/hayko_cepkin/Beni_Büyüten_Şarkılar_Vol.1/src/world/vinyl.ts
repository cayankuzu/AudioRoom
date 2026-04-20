import * as THREE from "three";
import { CANONICAL_TRACKS } from "../data/trackLibrary";

/**
 * Tek bir plak (vinyl) mesh'i — kor turuncu etiketli, koyu siyah disk.
 * Hayko Cepkin · BBS Vol.1 paletine göre boyandı.
 */

export interface VinylMeshOptions {
  order: number;
  title: string;
  radius?: number;
  thickness?: number;
}

function createLabelTexture(order: number, title: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context alınamadı.");

  /** Arkaplan — sıcak kor turuncu / kan kırmızı kağıt. */
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 240);
  grad.addColorStop(0, "#f0a060");
  grad.addColorStop(0.55, "#d65a36");
  grad.addColorStop(1, "#5a0a0a");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 240, 0, Math.PI * 2);
  ctx.fill();

  /** Dış ince halka. */
  ctx.strokeStyle = "#fbe4c8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 256, 232, 0, Math.PI * 2);
  ctx.stroke();

  /** Merkez spindle deliği. */
  ctx.fillStyle = "#0a0302";
  ctx.beginPath();
  ctx.arc(256, 256, 14, 0, Math.PI * 2);
  ctx.fill();

  /** Sıra numarası — üstte. */
  ctx.fillStyle = "#fff5e8";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 46px 'Outfit', 'Helvetica Neue', Arial";
  ctx.fillText(String(order).padStart(2, "0"), 256, 120);

  /** Sanatçı adı kicker. */
  ctx.fillStyle = "#fbe4c8";
  ctx.font = "700 22px 'Outfit', Arial";
  ctx.fillText("HAYKO CEPKİN", 256, 160);

  /** Parça adı — ortada. */
  ctx.fillStyle = "#fff9f5";
  ctx.font = "600 32px 'Outfit', 'Helvetica Neue', Arial";
  const lines = wrapLines(ctx, title.toLocaleUpperCase("tr-TR"), 300);
  const baseY = 260;
  const lh = 42;
  const startY = baseY - ((lines.length - 1) * lh) / 2;
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], 256, startY + i * lh);
  }

  /** Alt kicker. */
  ctx.fillStyle = "#fbe4c8";
  ctx.font = "500 18px 'Outfit', Arial";
  ctx.fillText("BENİ BÜYÜTEN ŞARKILAR · 33⅓ RPM", 256, 398);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

export function createVinyl(opts: VinylMeshOptions): THREE.Group {
  const radius = opts.radius ?? 0.45;
  const thickness = opts.thickness ?? 0.025;

  const group = new THREE.Group();
  group.name = `vinyl:${opts.order}`;

  /** Vinil disk — parlak siyah, ince. */
  const diskGeo = new THREE.CylinderGeometry(radius, radius, thickness, 64, 1);
  const diskMat = new THREE.MeshStandardMaterial({
    color: "#0c0c0e",
    roughness: 0.32,
    metalness: 0.4,
  });
  const disk = new THREE.Mesh(diskGeo, diskMat);
  disk.castShadow = true;
  disk.receiveShadow = true;
  group.add(disk);

  /** Yüzey çizgileri — ince halka overlay. */
  for (let i = 0; i < 6; i += 1) {
    const r = radius * (0.22 + i * 0.1);
    const ringGeo = new THREE.TorusGeometry(r, 0.002, 6, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: "#1a1a1e",
      roughness: 0.8,
      metalness: 0.1,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = thickness * 0.5 + 0.0006;
    group.add(ring);
  }

  /** Kor etiket. */
  const labelTex = createLabelTexture(opts.order, opts.title);
  const labelGeo = new THREE.CircleGeometry(radius * 0.42, 48);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    roughness: 0.55,
    metalness: 0.02,
    emissive: "#3a0e08",
    emissiveIntensity: 0.22,
  });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.rotation.x = -Math.PI / 2;
  label.position.y = thickness * 0.5 + 0.001;
  group.add(label);

  const labelBottom = label.clone();
  labelBottom.rotation.x = Math.PI / 2;
  labelBottom.position.y = -thickness * 0.5 - 0.001;
  group.add(labelBottom);

  /** Kor halo — rahimde göze çarpsın. */
  const haloGeo = new THREE.RingGeometry(radius * 1.05, radius * 1.4, 48);
  const haloMat = new THREE.MeshBasicMaterial({
    color: "#ff8a4a",
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = thickness * 0.5 + 0.002;
  halo.name = "vinyl-halo";
  group.add(halo);

  group.userData = {
    interactable: {
      kind: "vinyl",
      vinylOrder: opts.order,
      promptKey: "E",
      promptText: `E — plağı al · "${opts.title}"`,
    },
  };

  return group;
}

export function titleForOrder(order: number): string {
  const track = CANONICAL_TRACKS.find((t) => t.order === order);
  return track?.title ?? "Bilinmeyen parça";
}
