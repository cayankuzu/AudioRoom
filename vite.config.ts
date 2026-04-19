import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * AudioRoom — kök seviyede tek Vite uygulaması.
 *
 * Multi-page setup:
 *   /                                              → Hub (kök index.html)
 *   /redd/mukemmel_bosluk/                         → Redd · Mükemmel Boşluk
 *   /henry_the_lee/kuantum_dolanıklığı/            → Henry the Lee · Kuantum Dolanıklığı
 *
 * Her albüm kendi alt klasöründe yaşamaya devam eder; kök Vite onları
 * statik girdiler olarak servis eder. Tüm bağımlılıklar kök
 * `node_modules` içinden çözümlenir, böylece her albüm için ayrı
 * `npm install` gerekmez.
 */
export default defineConfig({
  base: "./",
  server: {
    host: true,
    port: 5173,
    fs: {
      allow: [".."],
    },
  },
  build: {
    rollupOptions: {
      input: {
        hub: resolve(__dirname, "index.html"),
        mukemmel_bosluk: resolve(
          __dirname,
          "redd/mukemmel_bosluk/index.html"
        ),
        kuantum_dolaniklik: resolve(
          __dirname,
          "henry_the_lee/kuantum_dolanıklığı/index.html"
        ),
      },
    },
  },
});
