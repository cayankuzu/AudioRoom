/** Hızlı, deterministik 2B değer gürültüsü ve fraktal toplamı (arazi ve dokular için). */
function hash(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export function noise2(x: number, z: number): number {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash(xi, zi);
  const b = hash(xi + 1, zi);
  const c = hash(xi, zi + 1);
  const d = hash(xi + 1, zi + 1);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

export function fbm(x: number, z: number, octaves = 4): number {
  let amplitude = 1;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += noise2(x * frequency, z * frequency) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / norm;
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Tekrarlayan (seamless) gürültüden normal haritası üretir — arazi mikro detayı için. */
export function noiseNormalCanvas(size: number, scale: number, strength: number): HTMLCanvasElement {
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Periyodik örnekleme: dört köşeyi karıştırarak kenarları dikişsiz yapar.
      const u = x / size;
      const v = y / size;
      const a = fbm(x * scale, y * scale, 4);
      const b = fbm((x - size) * scale, y * scale, 4);
      const c = fbm(x * scale, (y - size) * scale, 4);
      const d = fbm((x - size) * scale, (y - size) * scale, 4);
      heights[y * size + x] = (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const h = (px: number, py: number) => heights[((py + size) % size) * size + ((px + size) % size)];
      const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
      const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
      const length = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      image.data[i] = (-dx / length) * 127 + 128;
      image.data[i + 1] = (-dy / length) * 127 + 128;
      image.data[i + 2] = (1 / length) * 127 + 128;
      image.data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}
