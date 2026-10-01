import { expect, test } from "@playwright/test";
import { collectErrors } from "./helpers";

test.describe("Kütüphane (hub)", () => {
  test("raf, klavye gezinmesi, arama ve filtreler", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page.locator(".hub__cover")).toHaveCount(6);
    await expect(page.locator(".hub__title")).toHaveText("Mükemmel Boşluk");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".hub__title")).toHaveText("Beni Büyüten Şarkılar Vol.1");
    await page.getByRole("button", { name: "Sonraki albüm" }).click();
    await expect(page.locator(".hub__title")).toHaveText("Kuantum Dolanıklık");

    await page.getByRole("button", { name: "Yakında", exact: true }).click();
    await expect(page.locator(".hub__cover")).toHaveCount(2);
    await page.getByRole("button", { name: "Tümü" }).click();
    await expect(page.locator(".hub__cover")).toHaveCount(6);

    await page.getByLabel("Kütüphanede ara").fill("dolanıklığı");
    await expect(page.locator(".hub__cover")).toHaveCount(1);
    await page.getByLabel("Kütüphanede ara").fill("bulunmayan albüm");
    await expect(page.getByText("Sonuç bulunamadı")).toBeVisible();
    await page.getByRole("button", { name: "Filtreleri temizle" }).click();
    await expect(page.locator(".hub__cover")).toHaveCount(6);
    expect(errors).toEqual([]);
  });

  test("gizlilik sayfası altbilgiden açılır, YouTube yalnızca evrende yüklenir", async ({ page }) => {
    const errors = collectErrors(page);
    const thirdParty: string[] = [];
    page.on("request", (request) => {
      if (!request.url().startsWith("http://localhost")) thirdParty.push(request.url());
    });
    await page.goto("/");
    await page.getByRole("link", { name: "Gizlilik" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Gizlilik" })).toBeFocused();
    await expect(page.getByText("localStorage")).toBeVisible();
    await page.getByRole("link", { name: "‹ Kütüphane" }).click();
    await expect(page.locator(".hub__cover")).toHaveCount(6);
    expect(thirdParty).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("bilinmeyen adres anlamlı sayfa gösterir, raf konumu geri dönüşte korunur", async ({ page }) => {
    await page.goto("/#/album/olmayan-albüm");
    await expect(page.getByRole("heading", { level: 1, name: "Bulunamadı" })).toBeFocused();
    await page.getByRole("link", { name: "Kütüphaneye dön" }).click();
    await expect(page.locator(".hub__title")).toHaveText("Mükemmel Boşluk");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator(".hub__title")).toHaveText("Kuantum Dolanıklık");
    await page.goto("/worlds/kuantum-dolaniklik/");
    await page.goBack();
    await expect(page.locator(".hub__title")).toHaveText("Kuantum Dolanıklık");
  });

  test("Rastgele düğmesi çarkı döndürür, sonra bir kapakta durur", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await expect(page.locator(".hub__cover")).toHaveCount(6);
    await page.getByRole("button", { name: /Rastgele/ }).click();
    await expect(page.locator(".hub__ring")).toHaveClass(/is-spinning/);
    await expect(page.getByRole("button", { name: /Rastgele/ })).toBeDisabled();
    await expect(page.locator(".hub__ring")).not.toHaveClass(/is-spinning/, { timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Rastgele/ })).toBeEnabled();
    await expect(page.locator(".hub__cover.is-active")).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test("sosyal, sepet ve profil alanları yok", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Beğeni|Yorum|Sepete ekle|Profil/)).toHaveCount(0);
    await page.goto("/#/album/mukemmel-bosluk");
    await expect(page.getByText(/Beğeni|Yorum|Sepete ekle|Profil/)).toHaveCount(0);
  });

  test("albüm sayfaları eksiksiz", async ({ page }) => {
    const pages: Array<[string, number]> = [
      ["mukemmel-bosluk", 12],
      ["beni-buyuten-sarkilar-vol-1", 9],
      ["kuantum-dolaniklik", 1],
      ["klostrofobik-kaplumbaga", 1],
    ];
    for (const [id, tracks] of pages) {
      await page.goto(`/#/album/${id}`);
      await expect(page.locator(".album__tracks li")).toHaveCount(tracks);
      await expect(page.locator(".album__yt")).toHaveCount(tracks);
      await expect(page.locator(".album__mechanic")).toBeVisible();
      await expect(page.getByRole("link", { name: "Evrene gir" })).toHaveAttribute("href", /worlds\//);
    }
    await page.goto("/#/album/redd-21");
    await expect(page.locator(".hub-badge--soon")).toHaveText("Yakında");
    await expect(page.getByRole("button", { name: "Yakında" })).toBeDisabled();
    await page.getByRole("link", { name: "‹ Kütüphane" }).click();
    await expect(page.locator(".hub__cover")).toHaveCount(6);
  });

  test("Evreni sıfırla sayfa içinde onaylanır; yalnızca keşif bulunmuşsa da görünür", async ({ page }) => {
    const errors = collectErrors(page);
    const dialogs: string[] = [];
    page.on("dialog", (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("audioroom.progress.mukemmel-bosluk.v1", JSON.stringify({ found: ["itiraf"], completed: false, secrets: ["kalpsiz-sise"] }));
      localStorage.setItem("audioroom.progress.klostrofobik-kaplumbaga.v1", JSON.stringify({ found: [], completed: false, secrets: ["soz-sinavi"] }));
    });
    await page.reload();
    await expect(page.locator(".hub-badge--progress").first()).toBeVisible();
    await page.goto("/#/album/mukemmel-bosluk");
    await expect(page.locator(".album__secrets")).toContainText("Denizlerden Mektup");
    await page.getByRole("button", { name: "Evreni sıfırla" }).click();
    await page.getByRole("button", { name: "Vazgeç" }).click();
    expect(await page.evaluate(() => localStorage.getItem("audioroom.progress.mukemmel-bosluk.v1"))).not.toBeNull();
    await page.getByRole("button", { name: "Evreni sıfırla" }).click();
    await page.getByRole("button", { name: "Evet, sıfırla" }).click();
    await expect(page.locator(".album__status")).toContainText("sıfırlandı");
    expect(await page.evaluate(() => localStorage.getItem("audioroom.progress.mukemmel-bosluk.v1"))).toBeNull();
    await expect(page.getByRole("button", { name: "Evreni sıfırla" })).toHaveCount(0);
    // Plak dinlenmemiş ama bir keşif bulunmuş evren de sıfırlanabilir.
    await page.goto("/#/album/klostrofobik-kaplumbaga");
    await expect(page.getByRole("button", { name: "Evreni sıfırla" })).toBeVisible();
    expect(dialogs).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("eski evren adresi yeni adrese yönlenir", async ({ page }) => {
    await page.goto("/404.html");
    await expect(page.getByText("Bu sayfa bulunamadı")).toBeVisible();
  });
});
