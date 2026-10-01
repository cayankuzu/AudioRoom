import { expect, test, type Page } from "@playwright/test";
import { collectErrors, enterWorld, fakePointerLock, fakeYouTube, game, seek } from "./helpers";

/**
 * Klip ve sinema kamerası, taşınabilir gramofon: şarkı başlayınca klip sinema
 * kamerasıyla açılır; yürüyünce serbest kalınır, V ile geri dönülür; K ile klip
 * kapanır (müzik sürer, evren kapak hâline döner). Gramofon G ile kucağa alınır,
 * kucakta plak çalar, istenen yere konur ve içinden geçilmez.
 */
test.beforeEach(async ({ page }) => {
  await fakePointerLock(page);
  await fakeYouTube(page);
});

const place = (page: Page, id: string) =>
  game(page, `const r = a.records.list.find((r) => r.track.id === ${JSON.stringify(id)}); if (r.state !== "held") a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return 1;`);

test("Klip: sinema kamerası açılır, yürüyünce serbest kalınır, V ile döner, K ile klip kapanıp açılır", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  await place(page, "kaniyorduk");
  await expect(page.locator("body")).toHaveClass(/ar-cinema/);
  expect(await game<boolean>(page, `return a.player.frozen;`)).toBe(true);
  await expect(page.locator(".ar-music__clip")).toContainText("Klibi kapat");
  // Yürümek sinemadan çıkarır; V geri döndürür.
  await page.keyboard.press("KeyW");
  await expect(page.locator("body")).not.toHaveClass(/ar-cinema/);
  expect(await game<boolean>(page, `return a.player.frozen;`)).toBe(false);
  await page.keyboard.press("KeyV");
  await expect(page.locator("body")).toHaveClass(/ar-cinema/);
  await seek(page, 22);
  await expect(page.locator("html")).toHaveAttribute("data-beat", "photo");
  // Klibi kapat: müzik sürer, sahne söner, evren kapaktaki hâline döner.
  await page.keyboard.press("KeyK");
  await expect(page.locator("body")).not.toHaveClass(/ar-cinema/);
  await expect(page.locator(".ar-music__clip")).toContainText("Klibi aç");
  expect(await game<string>(page, `return a.music.state;`)).toBe("playing");
  expect(await game<number>(page, `return a.ctx.songTime();`)).toBe(-1);
  await expect.poll(() => game<boolean>(page, `return a.world.songs.scenes.kaniyorduk.root.visible;`), { timeout: 30_000 }).toBe(false);
  // Klibi aç: sahne şarkının o anına yetişir.
  await page.keyboard.press("KeyK");
  await expect.poll(() => game<boolean>(page, `return a.world.songs.scenes.kaniyorduk.root.visible;`), { timeout: 15_000 }).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-beat", "photo");
  expect(errors).toEqual([]);
});

test("Gramofon taşınır: G ile kucağa alınır, kucakta plak çalar, yere konur ve katıdır", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/kuantum-dolaniklik/");
  await game(page, `
    const g = new a.ctx.camera.position.constructor(); a.gramophone.worldPosition(g);
    a.player.teleport(g.x - 2.2, g.z, Math.atan2(-2.2, 0), a.world.ground); return 1;`);
  await page.waitForTimeout(400);
  await page.keyboard.press("KeyG");
  await expect.poll(() => game<string>(page, `return a.gramophone.spot;`)).toBe("carried");
  // Kucaktayken dokunulan plak doğrudan tablaya konur ve çalar.
  await game(page, `a.pickUp(a.records.list[0]); return 1;`);
  await expect.poll(() => game<string>(page, `return a.music.state;`)).toBe("playing");
  expect(await game<string>(page, `return a.gramophone.spot;`)).toBe("carried");
  await page.keyboard.press("KeyW");
  // Uzakta yere koy.
  await game(page, `a.player.teleport(-8, 8, 0, a.world.ground); return 1;`);
  await page.waitForTimeout(400);
  await page.keyboard.press("KeyG");
  await expect.poll(() => game<string>(page, `return a.gramophone.spot;`)).toBe("ground");
  const spot = await game<{ x: number; z: number }>(page, `const p = new a.ctx.camera.position.constructor(); a.gramophone.basePosition(p); return { x: p.x, z: p.z };`);
  expect(Math.hypot(spot.x + 8, spot.z - 6.7)).toBeLessThan(0.6);
  // İçinden geçilmez: üstüne yürüyen oyuncu önünde durur.
  await page.keyboard.down("KeyW");
  await page.waitForTimeout(1200);
  await page.keyboard.up("KeyW");
  const gap = await game<number>(page, `const p = new a.ctx.camera.position.constructor(); a.gramophone.basePosition(p); return Math.hypot(p.x - a.player.position.x, p.z - a.player.position.z);`);
  expect(gap).toBeGreaterThan(0.8);
  expect(errors).toEqual([]);
});
