import { expect, type Page } from "@playwright/test";

/**
 * Test tarayıcısında fare kilidi yoktur; kilidi taklit ederiz ki oyun
 * gerçek kullanıcıdaki gibi "kilitli" modda koşsun.
 */
export async function fakePointerLock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Geçici "bütün plaklar rafta" kipi testlerde kapalı: testler plakların evrendeki yerlerini sınar.
    localStorage.setItem("audioroom.dev.shelveAll", "0");
    let locked: Element | null = null;
    Object.defineProperty(Document.prototype, "pointerLockElement", { configurable: true, get: () => locked });
    Element.prototype.requestPointerLock = function (this: Element) {
      locked = this;
      document.dispatchEvent(new Event("pointerlockchange"));
      return Promise.resolve();
    } as typeof Element.prototype.requestPointerLock;
    Document.prototype.exitPointerLock = () => {
      locked = null;
      document.dispatchEvent(new Event("pointerlockchange"));
    };
  });
}

/**
 * Şarkı başlayınca sinema kamerası açılmasın: etkileşim testleri oyuncunun gözünden
 * sürülür (oyuncu da bunu ayarlardan kapatabilir). Klip sahneleri yine oynar.
 */
export async function freeRoam(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const key = "audioroom.settings.v1";
    let current = {};
    try {
      current = JSON.parse(localStorage.getItem(key) ?? "{}");
    } catch {
      current = {};
    }
    localStorage.setItem(key, JSON.stringify({ ...current, cinema: false }));
  });
}

/** Sayfa hatalarını toplar; testin sonunda boş olmalıdır. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    // Tarayıcının kendi izin politikası uyarıları (ör. compute-pressure) uygulamanın hatası değildir.
    if (message.type() === "error" && !/youtube|ERR_BLOCKED|net::|Failed to load resource|Permissions policy violation/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

export async function enterWorld(page: Page, path: string): Promise<void> {
  await page.goto(path);
  const start = page.locator("[data-start]");
  await expect(start).toBeEnabled({ timeout: 60_000 });
  await start.click();
  await expect(page.locator(".ar-menu")).not.toHaveClass(/is-open/);
}

/** Geliştirme sunucusundaki test kancası üzerinden oyunu sürer. */
export async function game<T>(page: Page, fn: string): Promise<T> {
  return page.evaluate(`(() => { const a = window.__audioroom; ${fn} })()`) as Promise<T>;
}

/**
 * YouTube oynatıcısının yerine saati elle sürülen bir taklit: `window.__ytTime`
 * şarkının saniyesidir. Hikâye zaman çizelgelerini ağ olmadan sınamak için.
 */
export async function fakeYouTube(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __ytTime: number; YT: unknown };
    w.__ytTime = 0;
    w.YT = {
      Player: function (_mount: Element, options: { events: { onReady?: (e: unknown) => void; onStateChange?: (e: { data: number }) => void } }) {
        const api = {
          playVideo: () => options.events.onStateChange?.({ data: 1 }),
          pauseVideo: () => options.events.onStateChange?.({ data: 2 }),
          stopVideo: () => options.events.onStateChange?.({ data: 5 }),
          loadVideoById: () => {
            w.__ytTime = 0;
            setTimeout(() => options.events.onStateChange?.({ data: 1 }), 30);
          },
          cueVideoById: () => undefined,
          setVolume: () => undefined,
          getVolume: () => 100,
          mute: () => undefined,
          unMute: () => undefined,
          isMuted: () => false,
          getCurrentTime: () => w.__ytTime,
          getDuration: () => 300,
          getPlayerState: () => 1,
          seekTo: (t: number) => void (w.__ytTime = t),
          destroy: () => undefined,
        };
        setTimeout(() => options.events.onReady?.({ target: api }), 20);
        return api;
      },
    };
  });
}

/** Şarkının saniyesini ayarlar (fakeYouTube ile). */
export async function seek(page: Page, seconds: number): Promise<void> {
  await page.evaluate((t) => ((window as unknown as { __ytTime: number }).__ytTime = t), seconds);
}
