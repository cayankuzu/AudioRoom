import { expect, test, type Page } from "@playwright/test";
import { collectErrors, enterWorld, fakePointerLock, fakeYouTube, freeRoam, game, seek } from "./helpers";

/**
 * Gerçek oyuncu akışları: her düğme ve eylem çalışır mı? Şarkı saati taklit
 * YouTube ile sürülür; hikâye satırları, gizli keşifler, kapak noktası,
 * plağı çıkarma ve evreni sıfırlama baştan sona denenir.
 */
test.beforeEach(async ({ page }) => {
  await fakePointerLock(page);
  await fakeYouTube(page);
  await freeRoam(page);
});

const place = (page: Page, id: string) =>
  game(page, `const r = a.records.list.find((r) => r.track.id === ${JSON.stringify(id)}); if (r.state !== "held") a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return 1;`);

test("Mükemmel Boşluk: şarkı ilerledikçe vuruşlar akar, geri sarınca baştan başlar; ekranda hikâye yazısı yok", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  await place(page, "kaniyorduk");
  await seek(page, 22);
  await expect(page.locator("html")).toHaveAttribute("data-beat", "photo");
  await seek(page, 55);
  await expect(page.locator("html")).toHaveAttribute("data-beat", "shot");
  await expect(page.locator(".ar-story")).toHaveCount(0);
  await seek(page, 5);
  await page.waitForTimeout(300);
  await seek(page, 22.5);
  await expect(page.locator("html")).toHaveAttribute("data-beat", "photo");
  expect(errors).toEqual([]);
});

test("Gramofon: E ile plak çıkarılır, müzik durur, plak ele geçer; R ile duraklat/çal", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  await place(page, "itiraf");
  await expect(page.locator(".ar-caption__title")).toHaveText("İtiraf");
  await expect.poll(() => game<string>(page, `return a.music.state;`)).toBe("playing");
  await page.keyboard.press("KeyR");
  await expect.poll(() => game<string>(page, `return a.music.state;`)).toBe("paused");
  await page.keyboard.press("KeyR");
  await expect.poll(() => game<string>(page, `return a.music.state;`)).toBe("playing");
  // Gramofona bak: istemde "Plağı çıkar" görünür.
  await game(page, `
    const g = new a.ctx.camera.position.constructor(); a.gramophone.worldPosition(g);
    const x = g.x + 2.2, z = g.z + 0.4;
    a.player.teleport(x, z, Math.atan2(-(g.x - x), -(g.z - z)), a.world.ground);
    a.player.pitch = Math.atan2(g.y + 0.9 - (a.player.position.y + 1.7), 2.2);
    return 1;`);
  await expect(page.locator(".ar-prompt")).toContainText("Plağı çıkar");
  await page.keyboard.press("KeyE");
  await expect.poll(() => game<string | null>(page, `return a.records.held && a.records.held.track.id;`)).toBe("itiraf");
  expect(await game<string>(page, `return a.music.state;`)).toBe("idle");
  expect(errors).toEqual([]);
});

test("Kapak noktası: işaret bulunur, girilir, fotoğraf çekilir, yürüyünce çıkılır", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/kuantum-dolaniklik/");
  await game(page, `const s = a.world.coverPoint.stand; a.player.teleport(s.x, s.z, 0, a.world.ground); return 1;`);
  await expect(page.locator(".ar-prompt")).toContainText("Kapak");
  await page.keyboard.press("KeyE");
  await expect(page.locator("body")).toHaveClass(/ar-photo/);
  const download = page.waitForEvent("download");
  await page.keyboard.press("KeyF");
  expect((await download).suggestedFilename()).toContain("kapak");
  await page.keyboard.press("KeyW");
  await expect(page.locator("body")).not.toHaveClass(/ar-photo/);
  expect(await game<boolean>(page, `return a.player.frozen;`)).toBe(false);
  expect(errors).toEqual([]);
});

test("Gizli keşif: kart görünür, kaydedilir ve albüm sayfasında listelenir", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/kuantum-dolaniklik/");
  // Sırlar yalnızca kliplerin içinde yaşar (ör. zehirli kadehi geri çevirmek); kart ve kayıt yolu buradan sınanır.
  await game(page, `a.ctx.secrets.reveal("kadeh"); return 1;`);
  await expect(page.locator(".ar-secret")).toContainText("Kadeh");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("audioroom.progress.kuantum-dolaniklik.v1") ?? "{}").secrets);
  expect(saved).toContain("kadeh");
  await page.goto("/#/album/kuantum-dolaniklik");
  await expect(page.locator(".album__secrets")).toContainText("Kadeh");
  await expect(page.locator(".album__secrets h2")).toContainText("1 / 3");
  expect(errors).toEqual([]);
});

test("Ayarlar: Ayarları sıfırla düğmesi bütün ayarları varsayılana döndürür", async ({ page }) => {
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  await page.keyboard.press("KeyT");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("audioroom.settings.v1") ?? "{}").thirdPerson)).toBe(false);
  await page.evaluate(() => document.exitPointerLock());
  await expect(page.locator(".ar-menu")).toHaveClass(/is-open/);
  await page.getByRole("button", { name: "Ayarlar" }).click();
  const fov = page.locator(".ar-range").nth(1);
  await fov.fill("90");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("audioroom.settings.v1") ?? "{}").fov)).toBe(90);
  await page.locator("[data-reset-settings]").click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("audioroom.settings.v1") ?? "{}"));
  expect(saved.fov).toBe(70);
  expect(saved.thirdPerson).toBe(true);
  expect(saved.musicVolume).toBeCloseTo(0.85, 2);
  await expect(page.locator(".ar-range").nth(1)).toHaveValue("70");
});

test("Menüdeki Evreni sıfırla: onaylanınca plaklar ve keşifler silinir, evren baştan yüklenir", async ({ page }) => {
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  await place(page, "sextronot");
  await expect(page.locator(".ar-chip__count")).toHaveText("1 / 12");
  await page.evaluate(() => document.exitPointerLock());
  await expect(page.locator(".ar-menu")).toHaveClass(/is-open/);
  await expect(page.locator(".ar-menu__status")).toContainText("Plaklar 1 / 12");
  await page.getByRole("button", { name: "Evreni sıfırla" }).click();
  // Vazgeç: hiçbir şey silinmez.
  await page.getByRole("button", { name: "‹ Vazgeç" }).click();
  expect(await page.evaluate(() => localStorage.getItem("audioroom.progress.mukemmel-bosluk.v1"))).not.toBeNull();
  await page.getByRole("button", { name: "Evreni sıfırla" }).click();
  await page.locator("[data-reset]").click();
  await expect(page.locator("[data-start]")).toBeEnabled({ timeout: 60_000 });
  await expect(page.locator(".ar-chip__count")).toHaveText("0 / 12");
  expect(await page.evaluate(() => localStorage.getItem("audioroom.progress.mukemmel-bosluk.v1"))).toBeNull();
});

test("Beni Büyüten Şarkılar: gölge oyunu şarkıyla ilerler, hatıra eşyası o dizede belirir", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/beni-buyuten-sarkilar/");
  await place(page, "ben-insan-degil-miyim");
  await seek(page, 30);
  await expect(page.locator("html")).toHaveAttribute("data-beat", "atilmis");
  // Kukla, ipler perdesinde (118 sn) perdenin önünde belirir; iplerini kesmek bir sırdır.
  await seek(page, 120);
  await game(page, `
    const az = -1.2 + 0.3, r = 14; const tx = Math.sin(az) * r, tz = -Math.cos(az) * r;
    const x = Math.sin(az) * (r - 2), z = -Math.cos(az) * (r - 2);
    a.player.teleport(x, z, Math.atan2(-(tx - x), -(tz - z)), a.world.ground);
    const gy = a.world.ground(tx, tz) + 1.3; a.player.pitch = Math.atan2(gy - (a.player.position.y + 1.7), 2);
    return 1;`);
  await expect(page.locator(".ar-prompt")).toContainText("Kuklanın iplerini kes");
  await page.keyboard.press("KeyE");
  await expect(page.locator(".ar-secret")).toContainText("İpleri Kopmuş");
  expect(errors).toEqual([]);
});

test("Kuantum Dolanıklık: dizeler odayı değiştirir, tasma oyuncuyu ışınlamadan çeker", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/kuantum-dolaniklik/");
  await game(page, `const r = a.records.list[0]; a.ctx.placeOnGramophone(r); return 1;`);
  await seek(page, 180);
  await expect(page.locator("html")).toHaveAttribute("data-beat", "tasma");
  await game(page, `a.player.teleport(-20, 20, 0, a.world.ground); return 1;`);
  await page.waitForTimeout(200);
  const first = await game<number>(page, `return Math.hypot(a.player.position.x - 15, a.player.position.z + 12);`);
  expect(first).toBeGreaterThan(20);
  await expect.poll(() => game<number>(page, `return Math.hypot(a.player.position.x - 15, a.player.position.z + 12);`), { timeout: 15_000 }).toBeLessThan(9.5);
  expect(errors).toEqual([]);
});

test("Lisanslı söz dosyası varsa satırlar şarkının saniyesiyle sol altta görünür", async ({ page }) => {
  // Test için sahte bir LRC (gerçek söz değil).
  await page.route("**/lyrics/kaniyorduk.lrc", (route) => route.fulfill({ status: 200, contentType: "text/plain", body: "[00:10.00] deneme satırı bir\n[00:20.00] deneme satırı iki" }));
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  await place(page, "kaniyorduk");
  await seek(page, 12);
  await expect(page.locator(".ar-lyric")).toHaveText("deneme satırı bir");
  await seek(page, 22);
  await expect(page.locator(".ar-lyric")).toHaveText("deneme satırı iki");
  // Hikâye yazısı yok: sol altta yalnız söz satırı durur.
  await expect(page.locator(".ar-story")).toHaveCount(0);
  expect(errors).toEqual([]);
});
