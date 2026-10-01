import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

// iPad mini yatay: sade demo yatay tutulur (dikeyde "Tableti yan çevir").
test.use({ viewport: { width: 1024, height: 768 } });

/** Tablet (geniş dokunmatik ekran): telefon kilidi uygulanmaz; Mükemmel Boşluk Sürüm 2 dokunmatik demoyla açılır. */
test("tablette Mükemmel Boşluk Sürüm 2 sade demo olarak açılır", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/worlds/mukemmel-bosluk/");
  const start = page.getByRole("button", { name: "Demoyu başlat" });
  await expect(start).toBeEnabled({ timeout: 60_000 });
  await expect(page.getByText("Geniş ekran deneyimi")).toHaveCount(0);
  await start.tap();
  await expect(page.locator(".ar-touch")).not.toHaveClass(/is-hidden/);
  await expect(page.locator(".ar-chip__count")).toHaveText("0 / 4");
  expect(errors).toEqual([]);
});

test("tablette hub'da Redd iki sürümle, Klostro Sürüm 1 ile açılır", async ({ page }) => {
  await page.goto("/#/album/mukemmel-bosluk");
  await page.getByRole("link", { name: "Evrene gir" }).tap();
  const dialog = page.getByRole("dialog", { name: "Hangi sürümle girmek istersin?" });
  await expect(dialog.getByRole("link", { name: "Sürüm 2 · demoyu başlat" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Sürüm 1 ile gir" })).toBeVisible();
  await page.goto("/#/album/klostrofobik-kaplumbaga");
  await page.getByRole("link", { name: "Evrene gir" }).tap();
  await expect(page.getByRole("dialog").getByRole("link", { name: "Sürüm 1 ile gir" })).toBeVisible();
});
