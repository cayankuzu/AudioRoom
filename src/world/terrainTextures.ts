import * as THREE from "three";

/**
 * Granüllü / tozlu / volkanik kum yüzey kanvas dokuları.
 * Gerçek milyarlarca kum mesh'i yerine: multi-octave noise + mikro granül
 * + açık/koyu parçacık + küçük ek çatlaklarla çok katmanlı bir kum hissi.
 */

function rand(seed: { v: number }): number {
  seed.v = (seed.v * 9301 + 49297) % 233280;
  return seed.v / 233280;
}

function smoothValue(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function layerNoise(x: number, y: number, freq: number): number {
  const a = smoothValue(Math.floor(x * freq), Math.floor(y * freq));
  const b = smoothValue(Math.floor(x * freq) + 1, Math.floor(y * freq));
  const c = smoothValue(Math.floor(x * freq), Math.floor(y * freq) + 1);
  const d = smoothValue(Math.floor(x * freq) + 1, Math.floor(y * freq) + 1);
  const xf = x * freq - Math.floor(x * freq);
  const yf = y * freq - Math.floor(y * freq);
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

export interface GroundMaps {
  colorMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  /**
   * Yüksek frekanslı "micro" normal — yakın plan granül hissini güçlendirmek
   * için shader içinde ikinci UV set'i gibi detayMap olarak harmanlanır.
   */
  detailNormalMap: THREE.CanvasTexture;
  /** Macro + mid'i kırmak için geniş ölçekli varyasyon haritası. */
  macroVariationMap: THREE.CanvasTexture;
}

export function createGroundSurfaceMaps(size = 1024): GroundMaps {
  const seed = { v: 20260417 };

  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cctx = colorCanvas.getContext("2d");
  if (!cctx) throw new Error("2D context yok");
  const cImg = cctx.createImageData(size, size);
  const cData = cImg.data;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const fx = x / size;
      const fy = y / size;

      const macro =
        layerNoise(fx, fy, 4) * 0.55 +
        layerNoise(fx, fy, 9) * 0.28 +
        layerNoise(fx, fy, 22) * 0.14;

      const micro =
        layerNoise(fx, fy, 180) * 0.6 +
        layerNoise(fx, fy, 420) * 0.4;

      const speck = rand(seed);
      const grain = speck > 0.988 ? 0.55 : speck > 0.965 ? 0.28 : 0;
      const dark = speck < 0.02 ? -0.28 : 0;

      const base = 0.08 + macro * 0.18 + micro * 0.07 + grain + dark;
      const v = THREE.MathUtils.clamp(base, 0.0, 1);

      const r = Math.floor(v * 38 + 6);
      const g = Math.floor(v * 36 + 5);
      const b = Math.floor(v * 40 + 7);
      cData[i] = r;
      cData[i + 1] = g;
      cData[i + 2] = b;
      cData[i + 3] = 255;
    }
  }
  cctx.putImageData(cImg, 0, 0);
  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(72, 72);
  colorMap.anisotropy = 8;
  colorMap.colorSpace = THREE.SRGBColorSpace;

  const rCanvas = document.createElement("canvas");
  rCanvas.width = size;
  rCanvas.height = size;
  const rctx = rCanvas.getContext("2d");
  if (!rctx) throw new Error("2D context yok");
  const rImg = rctx.createImageData(size, size);
  const rData = rImg.data;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const fx = x / size;
      const fy = y / size;
      const macro =
        layerNoise(fx, fy, 6) * 0.6 +
        layerNoise(fx, fy, 25) * 0.4;
      const micro = layerNoise(fx, fy, 260) * 0.9;
      const rough = THREE.MathUtils.clamp(0.72 + macro * 0.14 - micro * 0.25, 0.25, 1);
      const v = Math.floor(rough * 255);
      rData[i] = v;
      rData[i + 1] = v;
      rData[i + 2] = v;
      rData[i + 3] = 255;
    }
  }
  rctx.putImageData(rImg, 0, 0);
  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(72, 72);
  roughnessMap.anisotropy = 8;

  const nCanvas = document.createElement("canvas");
  nCanvas.width = size;
  nCanvas.height = size;
  const nctx = nCanvas.getContext("2d");
  if (!nctx) throw new Error("2D context yok");
  const nImg = nctx.createImageData(size, size);
  const nData = nImg.data;

  function heightAt(fx: number, fy: number): number {
    return (
      layerNoise(fx, fy, 6) * 0.3 +
      layerNoise(fx, fy, 40) * 0.4 +
      layerNoise(fx, fy, 220) * 0.6 +
      layerNoise(fx, fy, 520) * 0.35
    );
  }

  const step = 1 / size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = (y * size + x) * 4;
      const fx = x / size;
      const fy = y / size;
      const h = heightAt(fx, fy);
      const dx = h - heightAt(fx + step, fy);
      const dy = h - heightAt(fx, fy + step);
      const nx = THREE.MathUtils.clamp(128 + dx * 2400, 0, 255);
      const ny = THREE.MathUtils.clamp(128 + dy * 2400, 0, 255);
      nData[i] = nx;
      nData[i + 1] = ny;
      nData[i + 2] = 255;
      nData[i + 3] = 255;
    }
  }
  nctx.putImageData(nImg, 0, 0);
  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(72, 72);
  normalMap.anisotropy = 8;

  /**
   * Daha agresif micro normal — tek tek kum taneciği hissini taklit etmek için
   * yüksek frekanslı octave'larla hazırlanır. Çok yüksek repeat (ör. 240x)
   * ile uygulandığında yakın kamera çekimlerinde "kum taneli" yüzey etkisi.
   */
  const detailSize = Math.max(256, Math.floor(size / 2));
  const dCanvas = document.createElement("canvas");
  dCanvas.width = detailSize;
  dCanvas.height = detailSize;
  const dctx = dCanvas.getContext("2d");
  if (!dctx) throw new Error("2D context yok");
  const dImg = dctx.createImageData(detailSize, detailSize);
  const dData = dImg.data;

  function microHeightAt(fx: number, fy: number): number {
    return (
      layerNoise(fx, fy, 120) * 0.35 +
      layerNoise(fx, fy, 320) * 0.45 +
      layerNoise(fx, fy, 640) * 0.32 +
      layerNoise(fx, fy, 1100) * 0.22
    );
  }

  const dStep = 1 / detailSize;
  for (let y = 0; y < detailSize; y += 1) {
    for (let x = 0; x < detailSize; x += 1) {
      const i = (y * detailSize + x) * 4;
      const fx = x / detailSize;
      const fy = y / detailSize;
      const h = microHeightAt(fx, fy);
      const dx = h - microHeightAt(fx + dStep, fy);
      const dy = h - microHeightAt(fx, fy + dStep);
      const nx = THREE.MathUtils.clamp(128 + dx * 3200, 0, 255);
      const ny = THREE.MathUtils.clamp(128 + dy * 3200, 0, 255);
      dData[i] = nx;
      dData[i + 1] = ny;
      dData[i + 2] = 255;
      dData[i + 3] = 255;
    }
  }
  dctx.putImageData(dImg, 0, 0);
  const detailNormalMap = new THREE.CanvasTexture(dCanvas);
  detailNormalMap.wrapS = detailNormalMap.wrapT = THREE.RepeatWrapping;
  detailNormalMap.repeat.set(240, 240);
  detailNormalMap.anisotropy = 8;

  /**
   * Düşük frekanslı, geniş ölçekli varyasyon. Yüzeyin "hep aynı tile"
   * hissini kırar — koyu/parlak bantlar, yoğun/gevşek bölgeler oluşturur.
   */
  const mSize = 512;
  const mCanvas = document.createElement("canvas");
  mCanvas.width = mSize;
  mCanvas.height = mSize;
  const mctx = mCanvas.getContext("2d");
  if (!mctx) throw new Error("2D context yok");
  const mImg = mctx.createImageData(mSize, mSize);
  const mData = mImg.data;
  for (let y = 0; y < mSize; y += 1) {
    for (let x = 0; x < mSize; x += 1) {
      const i = (y * mSize + x) * 4;
      const fx = x / mSize;
      const fy = y / mSize;
      const macro =
        layerNoise(fx, fy, 1.3) * 0.55 +
        layerNoise(fx, fy, 3.2) * 0.3 +
        layerNoise(fx, fy, 7.5) * 0.15;
      const v = Math.floor(THREE.MathUtils.clamp(macro, 0, 1) * 255);
      mData[i] = v;
      mData[i + 1] = v;
      mData[i + 2] = v;
      mData[i + 3] = 255;
    }
  }
  mctx.putImageData(mImg, 0, 0);
  const macroVariationMap = new THREE.CanvasTexture(mCanvas);
  macroVariationMap.wrapS = macroVariationMap.wrapT = THREE.RepeatWrapping;
  /** Çok küçük repeat → dev patch'ler → tile hissi kaybolur. */
  macroVariationMap.repeat.set(1.4, 1.4);
  macroVariationMap.anisotropy = 4;

  return { colorMap, roughnessMap, normalMap, detailNormalMap, macroVariationMap };
}
