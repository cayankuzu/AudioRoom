// 3D (hacimli) yazılar için TTF → typeface JSON dönüşümü (three FontLoader biçimi).
// Çalışma anında opentype.js taşımamak için dönüşüm derlemede yapılır. Kullanım: npm run fonts
import fs from "node:fs/promises";
import path from "node:path";
import { TTFLoader } from "three/examples/jsm/loaders/TTFLoader.js";

const SRC = "assets-src/fonts";
const DIR = "public/fonts";
const FONTS = ["cinzel-400", "sedgwick-400", "cormorant-500", "courier-prime-400"];

const loader = new TTFLoader();
for (const name of FONTS) {
  const buffer = await fs.readFile(path.join(SRC, `${name}.ttf`));
  const json = loader.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  const out = path.join(DIR, `${name}.typeface.json`);
  await fs.writeFile(out, JSON.stringify(json));
  const glyphs = Object.keys(json.glyphs).length;
  console.log(`${name}: ${glyphs} glif → ${out} (${Math.round((await fs.stat(out)).size / 1024)} KB)`);
}
