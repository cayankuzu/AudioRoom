import { defineConfig, devices } from "@playwright/test";

/**
 * Uçtan uca testler geliştirme sunucusunda koşar (yalnızca orada açık olan
 * `window.__audioroom` test kancası sayesinde oyunu sürebilir).
 * Yerelde farklı bir Chromium kullanmak için: PLAYWRIGHT_CHROMIUM_PATH=/yol/chrome
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
/**
 * Yerelde donanım GPU (Windows: ANGLE/D3D11): üç boyutlu evrenler yazılım çizicide 3–5 kare/sn'ye düşer,
 * oyun zamanı gerçek zamandan geri kalır ve süreye bağlı testler (kapı bekleme, sahne sönme) oynar.
 * CI'da ya da PLAYWRIGHT_SOFTWARE_GL=1 ile yazılım çizici (SwiftShader) kullanılır.
 */
const gpuArgs = process.env.CI || process.env.PLAYWRIGHT_SOFTWARE_GL ? ["--use-angle=swiftshader"] : ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"];

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  // Üç boyutlu sayfalar ağır: çok işçi kare hızını düşürür, oyun zamanı gerçek zamandan geri kalır ve süreye bağlı testler oynar.
  workers: process.env.CI ? 1 : 2,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:5173/",
    launchOptions: { executablePath, args: [...gpuArgs, "--autoplay-policy=no-user-gesture-required"] },
  },
  webServer: { command: "npm run dev -- --port 5173", url: "http://localhost:5173/", reuseExistingServer: true, timeout: 60_000 },
  projects: [
    { name: "masaustu", use: { viewport: { width: 1440, height: 900 } }, testIgnore: /mobile|tablet/ },
    { name: "telefon", use: { ...devices["Pixel 7"], launchOptions: { executablePath, args: gpuArgs } }, testMatch: /mobile/ },
    // Tablet: geniş dokunmatik ekran (telefon kilidi uygulanmaz). Yalnızca Chromium kurulu olduğu için tarayıcı Chromium.
    { name: "tablet", use: { ...devices["iPad Mini"], browserName: "chromium", launchOptions: { executablePath, args: gpuArgs } }, testMatch: /tablet/ },
  ],
});
