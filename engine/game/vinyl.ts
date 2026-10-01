import * as THREE from "three";

/** 12" LP ölçüleri (metre). */
export const VINYL_RADIUS = 0.152;
const THICKNESS = 0.0024;
const LABEL_RADIUS = 0.05;
const MAP_SIZE = 512;

let shared: { roughness: THREE.CanvasTexture; anisotropy: THREE.CanvasTexture; bump: THREE.CanvasTexture } | null = null;

/** Tüm plakların paylaştığı oluk dokuları: pürüzlülük, yönlü parlama (anisotropy) ve kabartma. */
function sharedMaps() {
  if (shared) return shared;
  const size = MAP_SIZE;
  const make = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    return canvas;
  };
  const labelEdge = (LABEL_RADIUS / VINYL_RADIUS) * (size / 2);
  const leadIn = size / 2 - 3;

  // Pürüzlülük: etiket mat, oluklar parlak, parça araları (boş şeritler) daha parlak.
  const roughCanvas = make();
  const rough = roughCanvas.getContext("2d")!;
  rough.fillStyle = "#ffffff";
  rough.fillRect(0, 0, size, size);
  for (let r = leadIn; r > labelEdge + 6; r -= 1) {
    const gap = Math.sin(r * 0.21) > 0.97;
    rough.strokeStyle = gap ? "#1c1c1c" : r % 2 ? "#4a4a4a" : "#3a3a3a";
    rough.beginPath();
    rough.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    rough.stroke();
  }

  // Kabartma: ince eş merkezli oluklar.
  const bumpCanvas = make();
  const bump = bumpCanvas.getContext("2d")!;
  bump.fillStyle = "#808080";
  bump.fillRect(0, 0, size, size);
  for (let r = leadIn; r > labelEdge + 6; r -= 1.5) {
    bump.strokeStyle = r % 3 < 1.5 ? "#6a6a6a" : "#949494";
    bump.beginPath();
    bump.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    bump.stroke();
  }

  // Anisotropy yönü: teğet (dairesel) — gerçek plaklardaki yay biçimli ışık yansımasını üretir.
  const anisoCanvas = make();
  const aniso = anisoCanvas.getContext("2d")!;
  const image = aniso.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - size / 2;
      const dy = y - size / 2;
      const length = Math.hypot(dx, dy) || 1;
      const i = (y * size + x) * 4;
      image.data[i] = ((-dy / length) * 0.5 + 0.5) * 255;
      image.data[i + 1] = ((dx / length) * 0.5 + 0.5) * 255;
      image.data[i + 2] = length > labelEdge + 4 ? 255 : 0;
      image.data[i + 3] = 255;
    }
  }
  aniso.putImageData(image, 0, 0);

  const texture = (canvas: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(canvas);
    t.anisotropy = 8;
    return t;
  };
  shared = { roughness: texture(roughCanvas), anisotropy: texture(anisoCanvas), bump: texture(bumpCanvas) };
  return shared;
}

/** Plak yüzü: siyah vinil + ortada kapak görselli etiket ve parça adı. */
function drawFace(cover: HTMLImageElement | null, title: string, index: string, accent: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = MAP_SIZE;
  const g = canvas.getContext("2d")!;
  const c = MAP_SIZE / 2;
  const labelR = (LABEL_RADIUS / VINYL_RADIUS) * c;

  g.fillStyle = "#0a0a0b";
  g.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  const sheen = g.createRadialGradient(c, c, labelR, c, c, c);
  sheen.addColorStop(0, "#151517");
  sheen.addColorStop(1, "#0b0b0c");
  g.fillStyle = sheen;
  g.beginPath();
  g.arc(c, c, c, 0, Math.PI * 2);
  g.fill();

  g.save();
  g.beginPath();
  g.arc(c, c, labelR, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = accent;
  g.fillRect(c - labelR, c - labelR, labelR * 2, labelR * 2);
  if (cover) {
    const side = Math.min(cover.naturalWidth, cover.naturalHeight);
    g.globalAlpha = 0.9;
    g.drawImage(
      cover,
      (cover.naturalWidth - side) / 2,
      (cover.naturalHeight - side) / 2,
      side,
      side,
      c - labelR,
      c - labelR,
      labelR * 2,
      labelR * 2,
    );
    g.globalAlpha = 1;
  }
  const band = g.createLinearGradient(0, c + labelR * 0.3, 0, c + labelR);
  band.addColorStop(0, "rgba(0,0,0,0)");
  band.addColorStop(1, "rgba(0,0,0,0.78)");
  g.fillStyle = band;
  g.fillRect(c - labelR, c, labelR * 2, labelR);
  g.fillStyle = "#f4efe6";
  g.textAlign = "center";
  g.font = `600 ${Math.round(labelR * 0.2)}px Manrope, sans-serif`;
  g.fillText(index, c, c + labelR * 0.55);
  g.font = `700 ${Math.round(labelR * 0.16)}px Manrope, sans-serif`;
  g.fillText(title.toLocaleUpperCase("tr-TR").slice(0, 26), c, c + labelR * 0.78);
  g.restore();

  g.fillStyle = "#050505";
  g.beginPath();
  g.arc(c, c, labelR * 0.08, 0, Math.PI * 2);
  g.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function createVinylMesh(cover: HTMLImageElement | null, title: string, index: string, accent: string): THREE.Group {
  const maps = sharedMaps();
  const face = new THREE.MeshPhysicalMaterial({
    map: drawFace(cover, title, index, accent),
    roughnessMap: maps.roughness,
    roughness: 1,
    metalness: 0,
    bumpMap: maps.bump,
    bumpScale: 0.35,
    anisotropy: 0.85,
    anisotropyMap: maps.anisotropy,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
  });
  const edge = new THREE.MeshStandardMaterial({ color: "#070708", roughness: 0.35 });

  const group = new THREE.Group();
  const disc = new THREE.CircleGeometry(VINYL_RADIUS, 96);
  const top = new THREE.Mesh(disc, face);
  top.rotation.x = -Math.PI / 2;
  top.position.y = THICKNESS / 2;
  const bottom = new THREE.Mesh(disc, face);
  bottom.rotation.x = Math.PI / 2;
  bottom.position.y = -THICKNESS / 2;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(VINYL_RADIUS, VINYL_RADIUS, THICKNESS, 96, 1, true), edge);
  group.add(top, bottom, rim);
  group.traverse((child) => {
    child.castShadow = true;
  });
  return group;
}

export function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

/** 12" plak zarfı: önde albüm kapağı, arkada siyah zemin üstünde parça numarası ve adı. */
export const SLEEVE_SIZE = 0.315;

function sleeveTexture(cover: HTMLImageElement | null, title: string, index: string, accent: string, back: boolean): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  if (!back && cover) {
    const side = Math.min(cover.naturalWidth, cover.naturalHeight);
    g.drawImage(cover, (cover.naturalWidth - side) / 2, (cover.naturalHeight - side) / 2, side, side, 0, 0, size, size);
  } else {
    g.fillStyle = "#0d0d0e";
    g.fillRect(0, 0, size, size);
  }
  if (back) {
    g.fillStyle = accent;
    g.fillRect(40, 40, 6, size - 80);
    g.fillStyle = "#f2ede4";
    g.font = "800 150px Manrope, sans-serif";
    g.fillText(index, 70, 190);
    g.font = "700 40px Manrope, sans-serif";
    const words = title.toLocaleUpperCase("tr-TR").split(" ");
    let line = "";
    let y = 270;
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (g.measureText(next).width > size - 120 && line) {
        g.fillText(line, 70, y);
        line = word;
        y += 50;
      } else line = next;
    }
    g.fillText(line, 70, y);
    g.fillStyle = "rgba(242, 237, 228, 0.5)";
    g.font = "500 22px 'IBM Plex Mono', monospace";
    g.fillText("33⅓ RPM · AUDIOROOM", 70, size - 60);
  }
  // Kenar aşınması: karton zarfın köşeleri hafifçe açık.
  const wear = g.createRadialGradient(size / 2, size / 2, size * 0.45, size / 2, size / 2, size * 0.75);
  wear.addColorStop(0, "rgba(255,255,255,0)");
  wear.addColorStop(1, "rgba(255,255,255,0.14)");
  g.fillStyle = wear;
  g.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** Zarf (plak içine girip çıkabilir). Taban y=0'da, yüzü +Z'ye bakar. */
export function createSleeveMesh(cover: HTMLImageElement | null, title: string, index: string, accent: string): THREE.Mesh {
  const edge = new THREE.MeshStandardMaterial({ color: "#1a1a1b", roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: sleeveTexture(cover, title, index, accent, false), roughness: 0.62 });
  const back = new THREE.MeshStandardMaterial({ map: sleeveTexture(cover, title, index, accent, true), roughness: 0.7 });
  // BoxGeometry yüz sırası: +x, -x, +y, -y, +z, -z.
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(SLEEVE_SIZE, SLEEVE_SIZE, 0.005), [edge, edge, edge, edge, front, back]);
  mesh.position.y = SLEEVE_SIZE / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
