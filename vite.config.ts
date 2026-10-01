import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

/**
 * AudioRoom: hub (kök index.html) + her evren `worlds/<ad>/index.html` (Sürüm 2).
 * Yeni bir evren klasörü eklemek yeterlidir; burada değişiklik gerekmez.
 *
 * Sürüm 1: evrenlerin ilk hâli, özgün kodu ve yollarıyla `depo/` altında korunur
 * (asset'leri `public/assets`, `public/henry_the_lee`, `public/hayko_bbs_vol1`).
 * Hub'daki sürüm seçici ikisine de götürür.
 */
const root = fileURLToPath(new URL(".", import.meta.url));
const worlds = readdirSync(`${root}worlds`).filter((name) => existsSync(`${root}worlds/${name}/index.html`));
export const LEGACY_V1: Record<string, string> = {
  "v1-mukemmel-bosluk": "depo/redd/mukemmel_bosluk",
  "v1-kuantum-dolaniklik": "depo/henry_the_lee/kuantum_dolanıklığı",
  "v1-klostrofobik-kaplumbaga": "depo/henry_the_lee/klostrofobik_kaplumbaga",
  "v1-beni-buyuten-sarkilar": "depo/hayko_cepkin/Beni_Büyüten_Şarkılar_Vol.1",
};
const { version } = JSON.parse(readFileSync(`${root}package.json`, "utf8")) as { version: string };

export default defineConfig({
  base: "./",
  // Tek sürüm kaynağı: package.json.
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { host: true, port: 5173 },
  // three saf ESM'dir; ön paketlemeye gerek yok (bu makinede esbuild'in
  // node_modules dosyalarını okuyamadığı durumlarda da sunucu ayakta kalır).
  optimizeDeps: { exclude: ["three"] },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      // three.js tüm evrenlerde ortak: ayrı dosya, tarayıcı önbelleğinde bir kez.
      // three.js ayrı ve önbelleklenebilir; hub (yalnızca albüm verisi) onu hiç yüklemez.
      output: { manualChunks: { three: ["three"] } },
      input: {
        hub: `${root}index.html`,
        ...Object.fromEntries(worlds.map((name) => [name, `${root}worlds/${name}/index.html`])),
        ...Object.fromEntries(Object.entries(LEGACY_V1).map(([name, dir]) => [name, `${root}${dir}/index.html`])),
      },
    },
  },
});
