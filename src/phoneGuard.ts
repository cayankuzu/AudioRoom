import { isPhone, PHONE_WORLD } from "../engine/core/device";

/**
 * Sürüm 1 sayfaları için telefon kilidi. Telefonda yalnızca Mükemmel Boşluk'un Sürüm 1'i açılır;
 * öbür eski evrenlerin sayfası (adres doğrudan yazılsa bile) evreni başlatmaz, bir kapı gösterir.
 * Eski sürümün kendi koduna dokunmamak için sayfanın ana betiğinden önce yüklenir ve `#app`
 * kabını kaldırır (eski ana betikler kap yoksa hiçbir şey başlatmaz).
 */
function guardPhone(): void {
  if (!isPhone()) return;
  document.getElementById("app")?.remove();
  const { pathname } = window.location;
  const depo = pathname.indexOf("/depo/");
  const root = depo >= 0 ? pathname.slice(0, depo + 1) : "/";

  const page = document.createElement("main");
  page.setAttribute("role", "main");
  Object.assign(page.style, {
    position: "fixed",
    inset: "0",
    display: "grid",
    placeItems: "center",
    padding: "24px",
    background: "radial-gradient(circle at 50% 30%, #2a1c14, #0b0a0a 70%)",
    color: "#f4efe6",
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    textAlign: "center",
    zIndex: "10",
  });
  const card = document.createElement("section");
  Object.assign(card.style, { maxWidth: "420px", display: "grid", gap: "14px", justifyItems: "center" });
  const kicker = document.createElement("p");
  kicker.textContent = "Geniş ekran deneyimi";
  Object.assign(kicker.style, { margin: "0", letterSpacing: "0.2em", textTransform: "uppercase", fontSize: "12px", color: "#e0a95a" });
  const title = document.createElement("h1");
  title.textContent = document.title.split("—").pop()?.trim() || "AudioRoom";
  Object.assign(title.style, { margin: "0", fontSize: "26px", lineHeight: "1.2" });
  const text = document.createElement("p");
  text.textContent = "Bu evren bilgisayar ve tablet için. Telefonda yalnızca Mükemmel Boşluk'un Sürüm 1'i açılır.";
  Object.assign(text.style, { margin: "0", fontSize: "15px", lineHeight: "1.5", color: "#d6cdbf" });
  const link = (label: string, href: string, primary: boolean) => {
    const a = document.createElement("a");
    a.textContent = label;
    a.href = href;
    Object.assign(a.style, {
      display: "inline-block",
      minWidth: "240px",
      padding: "12px 20px",
      borderRadius: "999px",
      textDecoration: "none",
      fontWeight: "600",
      color: primary ? "#1a0f08" : "#f4efe6",
      background: primary ? "#e0a95a" : "transparent",
      border: primary ? "none" : "1px solid rgba(244,239,230,0.35)",
    });
    return a;
  };
  card.append(kicker, title, text, link(PHONE_WORLD.label, root + PHONE_WORLD.href, true), link("AudioRoom'a dön", root, false));
  page.append(card);
  document.body.append(page);
}

guardPhone();
