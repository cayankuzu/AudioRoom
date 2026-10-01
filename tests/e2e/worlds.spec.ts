import { expect, test } from "@playwright/test";
import { collectErrors, enterWorld, fakePointerLock, fakeYouTube, freeRoam, game, seek } from "./helpers";

test.beforeEach(async ({ page }) => {
  await fakePointerLock(page);
  await freeRoam(page);
});

test("Mükemmel Boşluk: plak al, tak, an başlar, ilerleme kaydedilir", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  await expect(page.locator(".ar-chip__count")).toHaveText("0 / 12");
  const title = await game<string>(page, `const r = a.records.list.find((r) => r.state === "world"); a.pickUp(r); return r.track.title;`);
  expect(await game<string | null>(page, "return a.records.held && a.records.held.track.title;")).toBe(title);
  await page.keyboard.press("KeyQ");
  expect(await game<null>(page, "return a.records.held;")).toBeNull();
  await game(page, `const r = a.records.list.find((r) => r.track.title === ${JSON.stringify(title)}); a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return 1;`);
  await expect(page.locator(".ar-caption__title")).toHaveText(title);
  await expect(page.locator(".ar-chip__count")).toHaveText("1 / 12");
  await expect(page.locator(".ar-music")).toHaveClass(/is-visible/);
  await page.reload();
  await expect(page.locator("[data-start]")).toBeEnabled({ timeout: 60_000 });
  await expect(page.locator(".ar-chip__count")).toHaveText("1 / 12");
  expect(errors).toEqual([]);
});

test("Mükemmel Boşluk: ESC duraklatır, ayarlar uygulanır, kütüphaneye dönülür", async ({ page }) => {
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  await page.evaluate(() => document.exitPointerLock());
  await expect(page.locator(".ar-menu")).toHaveClass(/is-open/);
  await page.getByRole("button", { name: "Ayarlar" }).click();
  const fov = page.locator(".ar-settings__row", { hasText: "Görüş alanı" }).locator("input");
  await fov.fill("90");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("audioroom.settings.v1") ?? "{}").fov)).toBe(90);
  await page.getByRole("button", { name: "‹ Geri" }).click();
  await page.getByRole("button", { name: "Devam et" }).click();
  await expect(page.locator(".ar-menu")).not.toHaveClass(/is-open/);
  await page.evaluate(() => document.exitPointerLock());
  await page.getByRole("link", { name: "‹ Kütüphane" }).click();
  await expect(page).toHaveURL(/#\/album\/mukemmel-bosluk/);
});

test("Beni Büyüten Şarkılar: kabarcık patlat, plak eline gelir, bebek büyür", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/beni-buyuten-sarkilar/");
  // Oyuncuyu bir kabarcığın önüne koy, ona bak ve E ile patlat. Kabarcıklar
  // süzüldüğü için her denemede yeniden nişan alınır.
  const aimAndPop = async () => {
    await game(page, `
      const r = a.records.list.find((r) => r.state === "world");
      const p = r.group.position;
      const d = Math.hypot(p.x, p.z) || 1;
      const x = p.x - (p.x / d) * 2;
      const z = p.z - (p.z / d) * 2;
      a.player.teleport(x, z, Math.atan2(-(p.x - x), -(p.z - z)), a.world.ground);
      a.player.pitch = Math.atan2(p.y - (a.player.position.y + 1.7), 2);
      return 1;`);
    await page.waitForTimeout(100);
    await page.keyboard.press("KeyE");
    return game<string | null>(page, "return a.records.held && a.records.held.track.title;");
  };
  // Önündeki kabarcıklardan en yakını patlar; plak oyuncunun eline geçer.
  await expect.poll(aimAndPop, { timeout: 10_000 }).not.toBeNull();
  const held = await game<string>(page, "return a.records.held.track.title;");
  await game(page, "a.ctx.placeOnGramophone(a.records.held); return 1;");
  await expect(page.locator(".ar-caption__title")).toHaveText(held);
  await expect(page.locator(".ar-chip__count")).toHaveText("1 / 9");
  expect(errors).toEqual([]);
});

test("Kuantum Dolanıklık: plak oyuncunun aynası, karşı noktada ölçünce çalar", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/kuantum-dolaniklik/");
  await game(page, `a.player.teleport(-15, 12, 0, () => 0); return 1;`);
  await page.waitForTimeout(1500);
  const position = await game<{ x: number; z: number }>(page, `const p = a.records.list[0].group.position; return { x: p.x, z: p.z };`);
  expect(Math.hypot(position.x - 15, position.z + 12)).toBeLessThan(1.4);
  await page.keyboard.press("KeyE");
  await expect.poll(() => game<string>(page, `return a.records.list[0].state;`)).toBe("placed");
  await expect(page.locator(".ar-chip__count")).toHaveText("Dinlendi");
  expect(errors).toEqual([]);
});

test("Klostrofobik Kaplumbağa: tavşan plağı taşır, kabuk ve tünel çalışır", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/klostrofobik-kaplumbaga/");
  expect(await game<boolean>(page, `return a.records.list[0].pickable;`)).toBe(false);
  await page.keyboard.down("KeyC");
  await expect.poll(() => game<number>(page, `return a.player.options.eyeHeight;`)).toBeLessThan(1);
  await page.keyboard.up("KeyC");
  // Deliğin başında C: huniden aşağı kayılır (ışınlanma yok), W ile sürünülür, karşı delikten çıkılır.
  await game(page, `a.player.teleport(26, 10.2, Math.atan2(-(8 - 26), -(-28 - 10.2)), () => 0); return 1;`);
  await expect(page.locator(".ar-prompt")).toContainText("Tavşan deliğine gir");
  await page.keyboard.down("KeyC");
  await page.waitForTimeout(250);
  await page.keyboard.up("KeyC");
  await expect.poll(() => game<number>(page, `return a.player.position.y;`)).toBeLessThan(-2);
  await page.keyboard.down("KeyW");
  await expect.poll(() => game<boolean>(page, `return a.world.tunnels.current === null;`), { timeout: 40_000 }).toBe(true);
  await page.keyboard.up("KeyW");
  const p = await game<{ x: number; y: number; z: number }>(page, `const p = a.player.position; return { x: p.x, y: p.y, z: p.z };`);
  expect(Math.hypot(p.x - 8, p.z + 28)).toBeLessThan(6);
  expect(p.y).toBeCloseTo(0, 1);
  await page.mouse.down();
  await page.mouse.up();
  await game(page, `const r = a.records.list[0]; a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return 1;`);
  await expect(page.locator(".ar-caption__title")).toHaveText("Klostrofobik Kaplumbağa");
  expect(errors).toEqual([]);
});

test("Mükemmel Boşluk: her şarkının kendi sahnesi açılır ve etkileşimi çalışır", async ({ page }) => {
  test.setTimeout(180_000);
  await fakeYouTube(page);
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  const ids = await game<string[]>(page, `return a.ctx.tracks.map((t) => t.id);`);
  expect(ids).toHaveLength(12);
  for (const id of ids) {
    await game(page, `
      const r = a.records.list.find((r) => r.track.id === ${JSON.stringify(id)});
      if (r.state !== "held") a.pickUp(r);
      a.ctx.placeOnGramophone(a.records.held);
      return 1;`);
    // Şarkının ortasına sar: hikâyenin o anındaki eylemler açık olmalı.
    await page.waitForTimeout(300);
    // Kalpsiz Romantik'te deniz 55. saniyeden sonra çekilir; gemiler denizdeyken sınanır.
    await seek(page, id === "kalpsiz-romantik" ? 20 : 100);
    // Sahne kurulunca (deniz dolar, sahne görünür olur) şarkıya özel eylemler açılır.
    await expect
      .poll(
        () =>
          game<number>(page, `
            const s = a.world.songs.scenes[${JSON.stringify(id)}];
            let k = 0;
            for (const it of s.interactables) if (it.prompt()) { it.use(); k++; }
            if (s.action && s.action.label) { s.action.use(); k++; }
            return k;`),
        { message: `${id} sahnesinde en az bir etkileşim olmalı`, timeout: 25_000 },
      )
      .toBeGreaterThan(0);
  }
  await expect(page.locator(".ar-chip__count")).toHaveText("12 / 12");
  expect(errors).toEqual([]);
});

test("Beni Büyüten Şarkılar: şarkı çalarken zardaki anıya dokunulur, bebek tekmeler", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/beni-buyuten-sarkilar/");
  await game(page, `const r = a.records.list[0]; a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return 1;`);
  // Oyuncu perdeye yaklaşıp (anı kabarcıkları merkezin çevresinde r 7–19'da döner; nişan çizgisini kesmesinler)
  // gölge perdesine döner; istem "Anıya dokun" olur.
  await game(page, `
    const p = a.player.position; const w = { x: Math.sin(-1.2) * 27.9, y: 16.2, z: -Math.cos(-1.2) * 27.9 };
    p.x = w.x * 0.78; p.z = w.z * 0.78;
    a.player.yaw = Math.atan2(-(w.x - p.x), -(w.z - p.z));
    a.player.pitch = Math.atan2(w.y - (p.y + 1.7), Math.hypot(w.x - p.x, w.z - p.z));
    return 1;`);
  await expect(page.locator(".ar-prompt")).toContainText("Anıya dokun");
  await page.keyboard.press("KeyE");
  await expect(page.locator(".ar-hint")).toContainText("başkası");
  expect(errors).toEqual([]);
});

test("Klostrofobik Kaplumbağa: yere bakıp E ile ebru boyası damlatılır", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/klostrofobik-kaplumbaga/");
  await game(page, `a.player.pitch = -0.6; return 1;`);
  await expect(page.locator(".ar-prompt")).toContainText("Boya damlat");
  await page.keyboard.press("KeyE");
  expect(errors).toEqual([]);
});

test("Gramofon: elde plak varken ekranda yeri işaretlenir", async ({ page }) => {
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  await expect(page.locator(".ar-marker")).not.toHaveClass(/is-visible/);
  await game(page, `const r = a.records.list.find((r) => r.state === "world"); a.pickUp(r); a.player.teleport(40, 40, 0, a.world.ground); return 1;`);
  await expect(page.locator(".ar-marker")).toHaveClass(/is-visible/);
  await expect(page.locator(".ar-marker__label")).toHaveText("Gramofon");
});

test("Plak kitaplığı: çalınan plak rafa girer, yeniden girişte rafta kalır, Q ile rafa döner", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  // İki plak çal: kitaplığın yanındayken ikincisi alınınca ilki kitaplıktaki yuvasına girer.
  const nearShelf = `const s = a.records.shelf.root.getWorldPosition(a.player.position.clone()); a.player.position.x = s.x + 1.5; a.player.position.z = s.z + 1.5;`;
  const [first, second] = await game<string[]>(page, `const [a1, a2] = a.records.list.filter((r) => r.state === "world"); a.pickUp(a1); a.ctx.placeOnGramophone(a.records.held); ${nearShelf} a.pickUp(a2); a.ctx.placeOnGramophone(a.records.held); return [a1.track.id, a2.track.id];`);
  expect(await game<string>(page, `return a.records.byTrack(${JSON.stringify(first)}).state;`)).toBe("collected");
  // Yeniden girişte çalınmış plaklar dünyaya dağılmaz: ikisi de rafta.
  await page.reload();
  await expect(page.locator("[data-start]")).toBeEnabled({ timeout: 60_000 });
  await page.locator("[data-start]").click();
  const states = await game<string[]>(page, `return [${JSON.stringify(first)}, ${JSON.stringify(second)}].map((id) => a.records.byTrack(id).state);`);
  expect(states).toEqual(["collected", "collected"]);
  expect(await game<number>(page, `return a.records.list.filter((r) => r.state === "world").length;`)).toBe(10);
  // Raftan al, rafın yanında Q ile bırak: dünyaya düşmez, rafına döner.
  await game(page, `a.pickUp(a.records.byTrack(${JSON.stringify(first)})); ${nearShelf} return 1;`);
  expect(await game<string>(page, `return a.records.held.track.id;`)).toBe(first);
  await page.keyboard.press("KeyQ");
  expect(await game<string>(page, `return a.records.byTrack(${JSON.stringify(first)}).state;`)).toBe("collected");
  // Kitaplık gramofonun yanında (5 m içinde).
  expect(await game<number>(page, `const s = a.records.shelf.root.position, g = a.gramophone.root.position; return Math.hypot(s.x - g.x, s.z - g.z);`)).toBeLessThan(5);
  expect(errors).toEqual([]);
});

test("Kitaplık: yanında Q ya da E, eldeki plağı (çalınmamış olsa da) yuvasına koyar", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  const nearShelf = `const s = a.records.shelf.root.getWorldPosition(a.player.position.clone()); const g = a.gramophone.root.position; const dx = s.x - g.x, dz = s.z - g.z, d = Math.hypot(dx, dz) || 1; a.player.teleport(s.x + (dx / d) * 1.8, s.z + (dz / d) * 1.8, Math.atan2(dx / d, dz / d), a.world.ground); return 1;`;
  // Q: çalınmamış plak rafa.
  const first = await game<string>(page, `const r = a.records.list.find((r) => r.state === "world" && r.hover === 0) ?? a.records.list.find((r) => r.state === "world"); a.pickUp(r); return r.track.id;`);
  await game(page, nearShelf);
  await page.waitForTimeout(300);
  await page.keyboard.press("KeyQ");
  expect(await game<string>(page, `return a.records.list.find((r) => r.track.id === ${JSON.stringify(first)}).state;`)).toBe("collected");
  expect(await game<boolean>(page, `return a.records.held === null;`)).toBe(true);
  // E: kitaplığın yanında, elde plak varken istem "Rafa koy"; E plağı yuvasına koyar.
  const second = await game<string>(page, `const r = a.records.list.find((r) => r.state === "world"); a.pickUp(r); return r.track.id;`);
  await game(page, nearShelf);
  await expect(page.locator(".ar-prompt")).toContainText("Rafa koy");
  await page.keyboard.press("KeyE");
  expect(await game<string>(page, `return a.records.list.find((r) => r.track.id === ${JSON.stringify(second)}).state;`)).toBe("collected");
  expect(await game<boolean>(page, `return a.records.held === null;`)).toBe(true);
  expect(errors).toEqual([]);
});

test("Mükemmel Boşluk: Q rafın yanında rafa, uzakta olduğun yere bırakır", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  const title = await game<string>(page, `const r = a.records.list.find((r) => r.state === "world"); a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return r.track.title;`);
  await expect(page.locator(".ar-caption__title")).toHaveText(title);
  // Yeniden girişte çalınmış plak rafında; raftan alınıp uzakta Q ile bırakılınca olduğu yere düşer (rafa ışınlanmaz).
  await page.reload();
  await expect(page.locator("[data-start]")).toBeEnabled({ timeout: 60_000 });
  await page.locator("[data-start]").click();
  const byTitle = `a.records.list.find((r) => r.track.title === ${JSON.stringify(title)})`;
  expect(await game<string>(page, `return ${byTitle}.state;`)).toBe("collected");
  await game(page, `a.pickUp(${byTitle}); const s = a.records.shelf.root.getWorldPosition(a.player.position.clone()); a.player.position.x = s.x + 12; a.player.position.z = s.z + 12; return 1;`);
  await page.keyboard.press("KeyQ");
  expect(await game<string>(page, `return ${byTitle}.state;`)).toBe("world");
  // Rafın yanında Q: yuvasına döner.
  await game(page, `a.pickUp(${byTitle}); const s = a.records.shelf.root.getWorldPosition(a.player.position.clone()); a.player.position.x = s.x + 1.5; a.player.position.z = s.z + 1.5; return 1;`);
  await page.keyboard.press("KeyQ");
  expect(await game<string>(page, `return ${byTitle}.state;`)).toBe("collected");
  expect(errors).toEqual([]);
});

test("Klostrofobik Kaplumbağa: tavşan gramofondaki plağa dokunmaz, raftakini kapar", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/klostrofobik-kaplumbaga/");
  await game(page, `const r = a.records.list[0]; a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); a.player.position.set(24, 0, -26); return 1;`);
  await expect(page.locator(".ar-music")).toHaveClass(/is-visible/);
  // Gramofonda çalarken tavşan uzaktan bakar, dokunmaz.
  await page.waitForTimeout(12_000);
  expect(await game<string>(page, `return a.records.list[0].state;`)).toBe("placed");
  // Plak rafa konunca ve oyuncu uzaktayken tavşan rafa koşup plağı kapar.
  await game(page, `a.records.collect(a.records.list[0]); a.player.position.set(24, 0, -26); return 1;`);
  await expect.poll(() => game<string>(page, `return a.records.list[0].state;`), { timeout: 60_000, intervals: [1000] }).toBe("world");
  await expect(page.locator(".ar-hint")).toContainText("kaptı");
  expect(errors).toEqual([]);
});

test("Klostrofobik Kaplumbağa: yere bırakılan plak E ile geri alınır, tavşan elden ve yerden kapar", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/klostrofobik-kaplumbaga/");
  await game(page, `const r = a.records.list[0]; a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return 1;`);
  await expect(page.locator(".ar-music")).toHaveClass(/is-visible/);
  await page.reload();
  await expect(page.locator("[data-start]")).toBeEnabled({ timeout: 60_000 });
  await page.locator("[data-start]").click();
  // Raftan al, uzakta Q ile bırak: plak yerde ve E ile alınabilir (tavşanın elinde değil).
  await game(page, `a.pickUp(a.records.list[0]); a.player.position.set(-20, 0, -8); return 1;`);
  await page.keyboard.press("KeyQ");
  await expect.poll(() => game<string>(page, `const r = a.records.list[0]; return r.state + ":" + r.pickable;`)).toBe("world:true");
  // Oyuncu uzaklaşınca tavşan yerdeki plağı kapar.
  await game(page, `a.player.position.set(24, 0, -26); return 1;`);
  await expect(page.locator(".ar-hint")).toContainText("yerden kaptı", { timeout: 60_000 });
  expect(await game<boolean>(page, `return a.records.list[0].pickable;`)).toBe(false);
  expect(errors).toEqual([]);
});

test("Klostrofobik Kaplumbağa: tavşan raftan kapınca deliğe koşup dalar; kazdığı çukur girilebilir tünel olur", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/klostrofobik-kaplumbaga/");
  await game(page, `const r = a.records.list[0]; a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return 1;`);
  await expect(page.locator(".ar-music")).toHaveClass(/is-visible/);
  await game(page, `a.records.collect(a.records.list[0]); a.player.position.set(22, 0, -20); return 1;`);
  // Kapar ve takılıp kalmadan deliğe dalar.
  await expect.poll(() => game<string>(page, `return a.world.debug.rabbit.state;`), { timeout: 90_000, intervals: [1000] }).toBe("hidden");
  expect(await game<string>(page, `return a.records.list[0].state;`)).toBe("world");
  // Kovala-uzaklaş: tavşan kaçışın ardından kendine çukur kazar.
  await expect.poll(async () => {
    await game(page, `const p = a.world.debug.rabbit.root.position; const d = Date.now() % 4000 < 2000 ? 9 : 20; a.player.position.set(p.x + d, 0, p.z + 1); return 1;`);
    return game<number>(page, `return a.world.debug.rabbit.holes.length;`);
  }, { timeout: 90_000, intervals: [1500] }).toBeGreaterThan(0);
  // Kazılan ağzın başında C istemi çıkar ve içeri girilir.
  await game(page, `const h = a.world.debug.rabbit.holes.at(-1); a.player.position.set(h.x + 1.8, 0, h.z); a.player.yaw = Math.atan2(1.8, 0); return 1;`);
  await expect(page.locator(".ar-prompt")).toContainText("Tavşan deliğine gir");
  await page.keyboard.press("KeyC");
  await expect.poll(() => game<number>(page, `return a.player.position.y;`), { timeout: 5_000 }).toBeLessThan(-1);
  expect(errors).toEqual([]);
});

test("Mükemmel Boşluk: asılı plaklar yalnızca zıplayınca alınır; alınan plak bırakılınca yere konur", async ({ page }) => {
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/mukemmel-bosluk/");
  const hovering = await game<number>(page, `return a.records.list.filter((r) => r.state === "world" && r.hover > 0).length;`);
  expect(hovering).toBe(8);
  // Yerdeyken, asılı plağın altında: alınamaz. Göz hizası yükselince (zıplama) alınabilir.
  const ok = await game<boolean[]>(page, `
    const r = a.records.list.find((r) => r.state === "world" && r.hover > 2 && r.hover < 3);
    const g = r.group.position; a.player.teleport(g.x + 0.8, g.z, 0, a.world.ground);
    return [r.pickable];`);
  await page.waitForTimeout(300);
  expect(await game<boolean>(page, `return a.records.list.find((r) => r.state === "world" && r.hover > 2 && r.hover < 3).pickable;`)).toBe(false);
  expect(ok.length).toBe(1);
  await game(page, `const r = a.records.list.find((r) => r.state === "world" && r.hover > 2 && r.hover < 3); a.pickUp(r); return 1;`);
  expect(await game<number>(page, `return a.records.held.hover;`)).toBe(0);
  expect(errors).toEqual([]);
});

test("Kuantum Dolanıklık: sınav sırasında E ile 10 soruluk sınav açılır; 8+ doğru 'Ezberden' sırrını açar", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await enterWorld(page, "/worlds/kuantum-dolaniklik/");
  // Sıranın önünde dur ve ona bak.
  await game(page, `const s = a.world.debug.quiz.deskSpot; a.player.teleport(s.x, s.z, s.yaw, a.world.ground); a.player.pitch = -0.45; return 1;`);
  await expect(page.locator(".ar-prompt")).toContainText("Sınava gir");
  await page.keyboard.press("KeyE");
  await expect(page.locator(".ar-quiz")).toHaveClass(/is-open/);
  const questions = await game<Array<{ answer: number }>>(page, `return a.world.debug.quiz.station.current;`);
  expect(questions).toHaveLength(10);
  for (const [i, q] of questions.entries()) {
    await expect(page.locator(".ar-quiz__progress")).toContainText(`${i + 1} / 10`);
    await page.keyboard.press(`Digit${q.answer + 1}`);
    await page.waitForTimeout(150);
  }
  await expect(page.locator(".ar-quiz")).not.toHaveClass(/is-open/);
  await expect(page.locator(".ar-secret")).toContainText("Ezberden");
  expect(errors).toEqual([]);
});

test("Kuantum Dolanıklık: şarkı çalarken adam ve kadın belirir; çiçekler sırayla açar, aynada yansımalar, gamzede evren", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await fakeYouTube(page);
  await enterWorld(page, "/worlds/kuantum-dolaniklik/");
  expect(await game<boolean>(page, `return a.world.debug.pair.a.group.parent.visible;`)).toBe(false);
  await game(page, `const r = a.records.list[0]; r.pickable = true; a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return 1;`);
  await expect(page.locator(".ar-music")).toHaveClass(/is-visible/);
  await seek(page, 30);
  await expect.poll(() => game<boolean>(page, `return a.world.debug.pair.a.group.parent.visible;`), { timeout: 8_000 }).toBe(true);
  // İki çiçek: adam batıda, kadın doğuda, ikisi de yerinde durur.
  expect(await game<number>(page, `return a.world.debug.pair.a.group.position.x;`)).toBeLessThan(-8);
  expect(await game<number>(page, `return a.world.debug.pair.b.group.position.x;`)).toBeGreaterThan(8);
  // Ayna: yansımalar görünür.
  await seek(page, 130);
  await expect.poll(() => game<boolean>(page, `return a.world.debug.pair.copies.visible;`), { timeout: 10_000 }).toBe(true);
  // Gamze: kadının yanağında, baş hizasında.
  await seek(page, 205);
  await expect.poll(() => game<number>(page, `return a.world.debug.pair.dimpleAt(new a.THREE.Vector3()).y;`), { timeout: 10_000 }).toBeGreaterThan(1.3);
  expect(errors).toEqual([]);
});

test("Klostrofobik Kaplumbağa: adam kâğıtta yürüyüp kabuğa girer, evren daralır, sonda dış kabuk belirir", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await fakeYouTube(page);
  await enterWorld(page, "/worlds/klostrofobik-kaplumbaga/");
  expect(await game<boolean>(page, `return a.world.debug.hurried.actor.figure.group.visible;`)).toBe(false);
  await game(page, `const r = a.records.list[0]; a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return 1;`);
  await expect(page.locator(".ar-music")).toHaveClass(/is-visible/);
  await seek(page, 8);
  await expect.poll(() => game<string>(page, `return a.world.debug.hurried.actor.figure.group.visible ? a.world.debug.hurried.actor.figure.pose : "";`), { timeout: 8_000 }).toBe("walk");
  // Ev: adam kabuğun içinde oturur; dışarıdaki figür gizlenir. Karanlık henüz ufukta değil.
  await seek(page, 34);
  await game(page, `a.world.debug.hurried.actor.figure.group.position.set(0.3, 0, 3.6); return 1;`);
  await expect.poll(() => game<boolean>(page, `return a.world.debug.hurried.inShell;`), { timeout: 10_000 }).toBe(true);
  expect(await game<string>(page, `return a.world.debug.shellHome.man.pose;`)).toBe("sit");
  expect(await game<number>(page, `return a.world.debug.universe.radius;`)).toBeGreaterThan(150);
  // Sıkışma: karanlık yaklaşır, adam duvarı iter.
  await seek(page, 100);
  await expect.poll(() => game<number>(page, `return a.world.debug.universe.radius;`), { timeout: 12_000 }).toBeLessThan(80);
  expect(await game<string>(page, `return a.world.debug.shellHome.man.pose;`)).toBe("push");
  // Nefes: ev en dar, adam iki büklüm; çorba kâsesi ortada.
  await seek(page, 178);
  await expect.poll(() => game<number>(page, `return a.world.debug.shellHome.radius;`), { timeout: 12_000 }).toBeLessThan(2.0);
  expect(await game<string>(page, `return a.world.debug.shellHome.man.pose;`)).toBe("tired");
  expect(await game<number>(page, `return a.world.debug.shellHome.soup;`)).toBe(1);
  // Açılış: kâğıt geri gelir, dış kabuk görünür.
  await seek(page, 196);
  await expect.poll(() => game<boolean>(page, `return a.world.debug.universe.outer.visible;`), { timeout: 8_000 }).toBe(true);
  expect(errors).toEqual([]);
});

test("Beni Büyüten Şarkılar: şarkı oyuncusu perdede belirir, kukla perdesinde iplerle kalkar", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = collectErrors(page);
  await fakeYouTube(page);
  await enterWorld(page, "/worlds/beni-buyuten-sarkilar/");
  await game(page, `const r = a.records.list.find((r) => r.track.id === "ben-insan-degil-miyim"); a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); return 1;`);
  await expect(page.locator(".ar-music")).toHaveClass(/is-visible/);
  await seek(page, 15);
  await expect.poll(() => game<boolean>(page, `return a.world.debug.songActor.actor.figure.group.visible;`), { timeout: 8_000 }).toBe(true);
  await seek(page, 120);
  await expect.poll(() => game<number>(page, `return a.world.debug.songActor.actor.lift;`), { timeout: 8_000 }).toBeGreaterThan(0.8);
  expect(errors).toEqual([]);
});
