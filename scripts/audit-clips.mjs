// Klip kamera denetimi: her çekimin başı, ortası ve sonunda sinema kamerası
//  (1) zeminin altında mı, (2) katı bir nesnenin içinde mi, (3) görüntüyü dolduran yakın bir engel var mı?
// Geliştirme sunucusu açıkken: npm run audit:clips -- <evren> [parçaId,...]
// Ortam: PLAYWRIGHT_CHROMIUM_PATH (Chromium yolu), AUDIT_URL (varsayılan http://localhost:5173).
// "görüntü kapalı" satırları bilinçli yakın çekimler de olabilir (buzdolabının içinden bakış gibi); kareye bakıp karar verin.
import { chromium } from "@playwright/test";
const [world, list] = process.argv.slice(2);
const base = process.env.AUDIT_URL ?? "http://localhost:5173";
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined, args: ["--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.addInitScript(() => {
  localStorage.clear();
  window.__fakeLock = null;
  Object.defineProperty(Document.prototype, "pointerLockElement", { configurable: true, get() { return window.__fakeLock; } });
  Element.prototype.requestPointerLock = function () { window.__fakeLock = this; document.dispatchEvent(new Event("pointerlockchange")); return Promise.resolve(); };
  window.__ytTime = 0;
  window.YT = { Player: function (el, opts) { const api = { playVideo() { opts.events.onStateChange?.({ data: 1 }); }, pauseVideo() {}, stopVideo() {}, loadVideoById() { window.__ytTime = 0; setTimeout(() => opts.events.onStateChange?.({ data: 1 }), 50); }, setVolume() {}, getVolume() { return 100; }, mute() {}, unMute() {}, isMuted() { return false; }, getCurrentTime() { return window.__ytTime; }, getDuration() { return 400; }, getPlayerState() { return 1; }, seekTo() {}, destroy() {} }; setTimeout(() => opts.events.onReady?.({ target: api }), 30); return api; } };
  setInterval(() => (window.__ytTime += 0.1), 100);
});
await page.goto(`${base}/worlds/${world}/`);
await page.waitForFunction(() => { const s = document.querySelector("[data-start]"); return s && !s.disabled; }, null, { timeout: 90000 });
await page.locator("[data-start]").click();
await page.waitForTimeout(1500);
const tracks = list ? list.split(",") : await page.evaluate(() => window.__audioroom.records.list.map((r) => r.track.id));
let total = 0;
for (const id of tracks) {
  const cuts = await page.evaluate((id) => {
    const a = window.__audioroom;
    const r = a.records.list.find((r) => r.track.id === id);
    if (r.state !== "placed") { a.pickUp(r); a.ctx.placeOnGramophone(a.records.held); }
    return (a.world.shots?.(id) ?? []).map((s) => ({ at: s.at, underground: Boolean(s.underground) }));
  }, id);
  await page.waitForTimeout(1500);
  const issues = [];
  for (let i = 0; i < cuts.length; i += 1) {
    const end = i < cuts.length - 1 ? cuts[i + 1].at : cuts[i].at + 10;
    for (const f of [0.08, 0.5, 0.92]) {
      const t = cuts[i].at + (end - cuts[i].at) * f;
      await page.evaluate((t) => (window.__ytTime = t), t);
      await page.waitForTimeout(380);
      const found = await page.evaluate((underground) => {
        const a = window.__audioroom; const T = a.THREE; const cam = a.ctx.camera; const p = cam.position;
        if (!a.ctx.cinema) return ["sinema kapalı"];
        const out = [];
        const g = a.world.ground(p.x, p.z);
        // Bilinçli yer altı çekimleri (tünel, oyuk: Shot.underground) zemin denetiminden muaftır.
        if (!underground && p.y < g + 0.15) out.push(`zemin altı (${(p.y - g).toFixed(2)})`);
        for (const { circle: c, object } of a.ctx.colliders.list()) {
          if (c.minY === undefined) continue;
          if (Math.hypot(p.x - c.x, p.z - c.z) < c.r - 0.15 && p.y > c.minY + 0.1 && p.y < c.maxY - 0.1) {
            let n = object?.name || ""; let o = object; while (o && !n) { o = o.parent; n = o?.name || ""; }
            const mat = []; object?.traverse((ch) => { if (!mat.length && ch.material) mat.push((Array.isArray(ch.material) ? ch.material[0] : ch.material).name || ch.geometry?.type); });
            out.push(`katının içinde: ${n || object?.type}/${mat[0] ?? ""}`);
            break;
          }
        }
        // Görüntüyü dolduran yakın engel: 5 ışın (merkez + 4 köşe), çoğu 0.5 m içinde çarpıyorsa.
        const rc = new T.Raycaster(); rc.near = 0.02; rc.far = 0.55;
        const targets = []; a.ctx.scene.traverse((o) => { if (o.isMesh && o.visible && !o.isSprite) { let v = true; let q = o.parent; while (q) { if (!q.visible) { v = false; break; } q = q.parent; } const m = Array.isArray(o.material) ? o.material[0] : o.material; if (v && !(m.transparent && m.opacity < 0.35) && m.colorWrite !== false) targets.push(o); } });
        let near = 0; let who = "";
        for (const [x, y] of [[0, 0], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
          rc.setFromCamera(new T.Vector2(x, y), cam);
          const hit = rc.intersectObjects(targets, false)[0];
          if (hit) { near += 1; who = who || (hit.object.name || (hit.object.material?.name) || hit.object.geometry?.type); }
        }
        if (near >= 3) out.push(`görüntü kapalı (${near}/5 ışın ~0.5 m): ${who}`);
        return out;
      }, cuts[i].underground);
      for (const f2 of found) issues.push(`  çekim ${i} (at ${cuts[i].at}) t=${t.toFixed(1)}: ${f2}`);
    }
  }
  total += issues.length;
  console.log(`== ${id}: ${cuts.length} çekim, ${issues.length} sorun`);
  if (issues.length) console.log([...new Set(issues)].join("\n"));
}
console.log(`TOPLAM ${total}`);
await browser.close();
