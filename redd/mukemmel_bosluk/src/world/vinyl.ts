import * as THREE from "three";
import { CANONICAL_TRACKS } from "../data/trackLibrary";

/**
 * Tek bir plak (vinyl) mesh'i oluşturur:
 *  - ince silindir disk (siyah vinil görünümü)
 *  - ortada kırmızı kağıt etiket (canvas texture — parça adı + sıra no)
 *  - üstünde hafif kaldırılmış canlı kırmızı halka
 *
 * Vinyller aslında `THREE.Group` olarak döner — hit-testing için
 * `userData.interactable.vinylOrder` taşır; interactionSystem bunu okur.
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

  /** Arkaplan — sıcak kanlı kırmızı kağıt. */
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 240);
  grad.addColorStop(0, "#d9242e");
  grad.addColorStop(0.7, "#a6121a");
  grad.addColorStop(1, "#5c070c");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 240, 0, Math.PI * 2);
  ctx.fill();

  /** Dış ince halka. */
  ctx.strokeStyle = "#f1d1d3";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 256, 232, 0, Math.PI * 2);
  ctx.stroke();

  /** Merkez spindle deliği. */
  ctx.fillStyle = "#0a0a0c";
  ctx.beginPath();
  ctx.arc(256, 256, 14, 0, Math.PI * 2);
  ctx.fill();

  /** Sıra numarası — üstte. */
  ctx.fillStyle = "#f6e4e5";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 46px 'Inter', 'Helvetica Neue', Arial";
  ctx.fillText(String(order).padStart(2, "0"), 256, 120);

  /** REDD band adı — küçük kicker. */
  ctx.fillStyle = "#f1c7c9";
  ctx.font = "700 22px 'Inter', Arial";
  ctx.fillText("R E D D", 256, 160);

  /** Parça adı — ortada, iki satıra bölünmüş olabilir. */
  ctx.fillStyle = "#fff9f5";
  ctx.font = "600 34px 'Inter', 'Helvetica Neue', Arial";
  const lines = wrapLines(ctx, title.toLocaleUpperCase("tr-TR"), 300);
  const baseY = 260;
  const lh = 44;
  const startY = baseY - ((lines.length - 1) * lh) / 2;
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], 256, startY + i * lh);
  }

  /** Alt kicker. */
  ctx.fillStyle = "#e3a8ab";
  ctx.font = "500 20px 'Inter', Arial";
  ctx.fillText("MÜKEMMEL BOŞLUK · 33⅓ RPM", 256, 398);

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

  /** Yüzey çizgileri için ince halka overlay — sadece görsel his. */
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

  /** Kırmızı etiket — disk'in üst yüzeyinde, CanvasTexture. */
  const labelTex = createLabelTexture(opts.order, opts.title);
  const labelGeo = new THREE.CircleGeometry(radius * 0.42, 48);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    roughness: 0.55,
    metalness: 0.02,
    emissive: "#280003",
    emissiveIntensity: 0.18,
  });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.rotation.x = -Math.PI / 2;
  label.position.y = thickness * 0.5 + 0.001;
  group.add(label);

  /** Alt yüzey için de kopyalanmış ama ince etiket (basit). */
  const labelBottom = label.clone();
  labelBottom.rotation.x = Math.PI / 2;
  labelBottom.position.y = -thickness * 0.5 - 0.001;
  group.add(labelBottom);

  /**
   * Göze batması için yumuşak bir "bulunabilir" glow — krater
   * atmosferinde gözden kaçırmamak için çok hafif.
   */
  const haloGeo = new THREE.RingGeometry(radius * 1.05, radius * 1.35, 48);
  const haloMat = new THREE.MeshBasicMaterial({
    color: "#ff3b45",
    transparent: true,
    opacity: 0.22,
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

/** Plak order'ını title'a çevirir — UI için yardımcı. */
export function titleForOrder(order: number): string {
  const track = CANONICAL_TRACKS.find((t) => t.order === order);
  return track?.title ?? "Bilinmeyen parça";
}
