import { defineConfig } from "vite";
import { resolve } from "node:path";

/**
 * AudioRoom — kök seviyede tek Vite uygulaması.
 *
 * Multi-page setup:
 *   /                                              → Hub (kök index.html)
 *   /depo/redd/mukemmel_bosluk/                    → Redd · Mükemmel Boşluk
 *   /depo/henry_the_lee/kuantum_dolanıklığı/       → Henry the Lee · Kuantum Dolanıklığı
 *   /depo/hayko_cepkin/Beni_Büyüten_Şarkılar_Vol.1/ → Hayko Cepkin · Beni Büyüten Şarkılar Vol.1
 *
 * Her albüm kendi alt klasöründe yaşamaya devam eder; kök Vite onları
 * statik girdiler olarak servis eder. Tüm bağımlılıklar kök
 * `node_modules` içinden çözümlenir, böylece her albüm için ayrı
 * `npm install` gerekmez.
 */
export default defineConfig({
  base: "./",
  /**
   * Yalnızca bu HTML girişlerinden import taranırsın; taşınmış `redd/` yolları
   * gibi eski `node_modules` konumlarına takılı kalan Vite önbelleği riski azalır.
   */
  optimizeDeps: {
    entries: [
      "index.html",
      "depo/redd/mukemmel_bosluk/index.html",
      "depo/henry_the_lee/kuantum_dolanıklığı/index.html",
      "depo/hayko_cepkin/Beni_Büyüten_Şarkılar_Vol.1/index.html",
    ],
  },
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
          "depo/redd/mukemmel_bosluk/index.html"
        ),
        kuantum_dolaniklik: resolve(
          __dirname,
          "depo/henry_the_lee/kuantum_dolanıklığı/index.html"
        ),
        hayko_beni_buyuyen_v1: resolve(
          __dirname,
          "depo/hayko_cepkin/Beni_Büyüten_Şarkılar_Vol.1/index.html"
        ),
      },
    },
  },
});
