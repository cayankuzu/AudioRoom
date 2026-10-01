import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

test.describe("Sürümler", () => {
  // Eski sürümler geliştirme sunucusunda ilk açılışta yüzlerce modül derler; soğuk başlangıçta yavaş olabilir.
  test.setTimeout(180_000);
  test("Evrene gir sürüm seçiciyi açar; önizlemeler yüklü, Esc kapatır", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page.locator(".hub__title")).toHaveText("Mükemmel Boşluk");
    await page.getByRole("link", { name: "Evrene gir" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Hangi sürümle girmek istersin?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Sürüm 2 ile gir" })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Sürüm 1 ile gir" })).toBeVisible();
    // Her sürümün önizleme görselleri gerçekten yüklenir (kırık görsel yok).
    const images = dialog.locator("img");
    expect(await images.count()).toBeGreaterThanOrEqual(2);
    await expect
      .poll(async () => images.evaluateAll((list) => list.every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)))
      .toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("Sürüm 1 kendi adresinde açılır ve hatasız yüklenir", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await page.getByRole("link", { name: "Evrene gir" }).first().click();
    await page.getByRole("link", { name: "Sürüm 1 ile gir" }).click();
    await expect(page).toHaveURL(/depo\/redd\/mukemmel_bosluk\//, { timeout: 60_000 });
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 150_000 });
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  // Dört evrenin her birinde seçici iki sürümü gösterir ve Sürüm 1 kendi adresinde hatasız açılır.
  const albums = [
    ["mukemmel-bosluk", /depo\/redd\/mukemmel_bosluk\//],
    ["beni-buyuten-sarkilar-vol-1", /depo\/hayko_cepkin\//],
    ["kuantum-dolaniklik", /depo\/henry_the_lee\/kuantum_/],
    ["klostrofobik-kaplumbaga", /depo\/henry_the_lee\/klostrofobik_kaplumbaga\//],
  ] as const;
  for (const [id, url] of albums) {
    test(`${id}: albüm sayfasından Sürüm 1'e girilir`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(`/#/album/${id}`);
      await page.getByRole("link", { name: "Evrene gir" }).first().click();
      const dialog = page.getByRole("dialog", { name: "Hangi sürümle girmek istersin?" });
      await expect(dialog.getByRole("link", { name: "Sürüm 2 ile gir" })).toBeVisible();
      await dialog.getByRole("link", { name: "Sürüm 1 ile gir" }).click();
      await expect(page).toHaveURL(url, { timeout: 60_000 });
      await expect(page.locator("canvas").first()).toBeVisible({ timeout: 150_000 });
      await page.waitForTimeout(1500);
      expect(errors).toEqual([]);
    });
  }
});

test("sürüm seçici adres değişince kapanır", async ({ page }) => {
  await page.goto("/#/album/mukemmel-bosluk");
  await page.getByRole("link", { name: "Evrene gir" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Hangi sürümle girmek istersin?" });
  await expect(dialog).toBeVisible();
  await page.goto("/#/album/kuantum-dolaniklik");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveClass(/hub-modal-open/);
});
