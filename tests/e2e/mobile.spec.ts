import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

/**
 * Telefon (dar dokunmatik ekran): yalnızca Mükemmel Boşluk'un Sürüm 1'i açılır. Sürüm 2 evrenleri ve
 * öbür eski evrenler, adres doğrudan yazılsa bile bir kapı gösterir ve evreni başlatmaz.
 */
test.use({ viewport: { width: 915, height: 412 } });

const REDD_V1 = /depo\/redd\/mukemmel_bosluk\/$/;

for (const path of ["mukemmel-bosluk", "beni-buyuten-sarkilar", "kuantum-dolaniklik", "klostrofobik-kaplumbaga"]) {
  test(`telefonda Sürüm 2 (${path}) açılmaz, Sürüm 1'e yönlendirir`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`/worlds/${path}/`);
    await expect(page.getByText("Geniş ekran deneyimi")).toBeVisible();
    const phoneWorld = page.getByRole("link", { name: "Mükemmel Boşluk · Sürüm 1" });
    await expect(phoneWorld).toHaveAttribute("href", REDD_V1);
    await expect(page.getByRole("link", { name: "AudioRoom'a dön" })).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const path of ["depo/hayko_cepkin/Beni_B%C3%BCy%C3%BCten_%C5%9Eark%C4%B1lar_Vol.1/", "depo/henry_the_lee/kuantum_dolan%C4%B1kl%C4%B1%C4%9F%C4%B1/", "depo/henry_the_lee/klostrofobik_kaplumbaga/"]) {
  test(`telefonda eski evren ${decodeURI(path)} açılmaz`, async ({ page }) => {
    await page.goto(`/${path}`);
    await expect(page.getByText("Geniş ekran deneyimi")).toBeVisible();
    await expect(page.getByRole("link", { name: "Mükemmel Boşluk · Sürüm 1" })).toHaveAttribute("href", REDD_V1);
    await expect(page.locator("#app")).toHaveCount(0);
    await page.waitForTimeout(1500);
    await expect(page.locator("canvas")).toHaveCount(0);
  });
}

test("telefonda Mükemmel Boşluk Sürüm 1 açılır", async ({ page }) => {
  await page.goto("/depo/redd/mukemmel_bosluk/");
  await expect(page.locator("#app")).toHaveCount(1);
  await expect(page.getByText("Geniş ekran deneyimi")).toHaveCount(0);
  await expect(page.locator("canvas").first()).toBeAttached({ timeout: 60_000 });
});

test("telefonda hub: Redd yalnızca Sürüm 1 ile açılır, öbür evrenler kilitli", async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto("/");
  await expect(page.locator(".hub__cover.is-active")).toBeInViewport();
  await expect(page.getByRole("link", { name: "Evrene gir" })).toBeInViewport();
  await page.getByRole("link", { name: "Evrene gir" }).tap();
  const dialog = page.getByRole("dialog", { name: "Hangi sürümle girmek istersin?" });
  await expect(dialog.getByRole("link", { name: "Sürüm 1 ile gir" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Sürüm 2/ })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: "Geniş ekranda açılır" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  for (const id of ["beni-buyuten-sarkilar-vol-1", "kuantum-dolaniklik", "klostrofobik-kaplumbaga"]) {
    await page.goto(`/#/album/${id}`);
    await expect(page.getByRole("button", { name: "Geniş ekranda açılır" })).toBeDisabled();
    await expect(page.getByRole("link", { name: "Evrene gir" })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
