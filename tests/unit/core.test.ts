import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createColliders } from "../../engine/core/colliders";
import { createFrame, frameAt } from "../../engine/game/director";
import { contrast, readableAccent, readableFill } from "../../engine/core/color";
import { createPlayer, yawTowards } from "../../engine/core/player";
import { createRng, shuffle } from "../../engine/core/rng";
import type { Input } from "../../engine/core/input";
import { craterHeight } from "../../worlds/mukemmel-bosluk/terrain";
import { wombGround } from "../../worlds/beni-buyuten-sarkilar/womb";

function fakeInput(axis: { x: number; y: number }, down: string[] = []): Input {
  return {
    mode: "lock",
    active: true,
    sensitivity: 1,
    invertY: false,
    isDown: (code) => down.includes(code),
    onAction: () => {},
    moveAxis: () => axis,
    consumeLook: () => ({ yaw: 0, pitch: 0 }),
    requestLock: async () => {},
    releaseLock: () => {},
    onPauseRequest: () => {},
    setTouchAxis: () => {},
    addTouchLook: () => {},
    press: () => {},
    setHeld: () => {},
    dispose: () => {},
  };
}

describe("rastgelelik", () => {
  it("aynı tohum aynı diziyi üretir", () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("karıştırma bir permütasyondur", () => {
    const items = [1, 2, 3, 4, 5, 6];
    expect(shuffle(items, createRng(7)).sort()).toEqual(items);
  });
});

describe("çarpışma", () => {
  it("engelden ve sınırdan dışarı iter", () => {
    const colliders = createColliders();
    colliders.addCircle(0, 0, 1);
    colliders.setBounds({ type: "circle", cx: 0, cz: 0, r: 10 });
    const p = new THREE.Vector3(0.2, 0, 0);
    colliders.resolve(p, 0.5);
    expect(Math.hypot(p.x, p.z)).toBeCloseTo(1.5, 5);
    const far = new THREE.Vector3(20, 0, 0);
    colliders.resolve(far, 0.5);
    expect(far.x).toBeCloseTo(9.5, 5);
    expect(colliders.isFree(0, 0, 0.1)).toBe(false);
    expect(colliders.isFree(5, 0, 0.1)).toBe(true);
  });

  it("katı nesne hareket eder, döner, gizlenince ve baş üstündeyken engellemez", () => {
    const colliders = createColliders();
    const scene = new THREE.Scene();
    const table = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1));
    table.position.set(10, 0.5, 0);
    scene.add(table);
    colliders.solid(table);
    scene.updateMatrixWorld(true);
    // Uzun kenarın ucuna yakın bir nokta: boyuna dairelerle örtülür.
    const p = new THREE.Vector3(11.6, 0, 0.1);
    colliders.resolve(p, 0.4);
    expect(Math.abs(p.z)).toBeGreaterThan(0.5);
    // Doksan derece döndü: aynı nokta artık boşta.
    table.rotation.y = Math.PI / 2;
    scene.updateMatrixWorld(true);
    const q = new THREE.Vector3(11.6, 0, 0.1);
    colliders.resolve(q, 0.4);
    expect(q.x).toBeCloseTo(11.6, 5);
    // Gizli nesne engellemez.
    table.rotation.y = 0;
    table.visible = false;
    scene.updateMatrixWorld(true);
    const r = new THREE.Vector3(10, 0, 0.1);
    colliders.resolve(r, 0.4);
    expect(r.z).toBeCloseTo(0.1, 5);
    // Başın üstünde süzülen nesnenin altından geçilir.
    table.visible = true;
    table.position.y = 4;
    scene.updateMatrixWorld(true);
    const s = new THREE.Vector3(10, 0, 0.1);
    colliders.resolve(s, 0.4);
    expect(s.z).toBeCloseTo(0.1, 5);
  });
});

describe("oyuncu", () => {
  const flat = () => 0;
  it("yaw 0'da ileri -Z yönündedir ve kare hızından bağımsızdır", () => {
    const slow = createPlayer();
    const fast = createPlayer();
    const colliders = createColliders();
    const input = fakeInput({ x: 0, y: 1 });
    for (let i = 0; i < 60; i += 1) slow.update(1 / 30, input, flat, colliders);
    for (let i = 0; i < 288; i += 1) fast.update(1 / 144, input, flat, colliders);
    expect(slow.position.z).toBeLessThan(-4);
    expect(Math.abs(slow.position.z - fast.position.z) / Math.abs(fast.position.z)).toBeLessThan(0.03);
  });
  it("zıplar ve yere geri iner", () => {
    const player = createPlayer();
    const colliders = createColliders();
    player.update(1 / 60, fakeInput({ x: 0, y: 0 }, ["Space"]), flat, colliders);
    expect(player.onGround).toBe(false);
    for (let i = 0; i < 180; i += 1) player.update(1 / 60, fakeInput({ x: 0, y: 0 }), flat, colliders);
    expect(player.onGround).toBe(true);
    expect(player.position.y).toBe(0);
  });
  it("yawTowards hedefe bakar", () => {
    expect(yawTowards(0, 10, 0, 0)).toBeCloseTo(0, 5);
    expect(yawTowards(0, 0, -10, 0)).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe("arazi", () => {
  it("krater ortası kenardan alçaktır", () => {
    expect(craterHeight(0, 0)).toBeLessThan(craterHeight(80, 0) - 8);
    for (let x = -150; x <= 150; x += 37) expect(Number.isFinite(craterHeight(x, x * 0.7))).toBe(true);
  });
  it("rahim zemini çanak biçimindedir", () => {
    expect(wombGround(0, 0)).toBeLessThan(wombGround(20, 0));
  });
});

describe("renk erişilebilirliği", () => {
  it("WCAG kontrastını hesaplar", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 5);
  });

  it("her albüm vurgusu koyu zeminde okunur metne ve okunur buton yazısına dönüşür", () => {
    for (const [accent, ink] of [["#c8212c", "#ffffff"], ["#ff8a4c", "#1a0703"], ["#f3c012", "#141008"], ["#d24a26", "#fff5e6"]]) {
      expect(contrast(readableAccent(accent), "#0e0e10")).toBeGreaterThanOrEqual(4.5);
      const button = readableFill(accent, ink);
      expect(contrast(button.fill, button.ink)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("senkron sözler", () => {
  it("LRC satırlarını zamana göre sıralar ve o anki satırı bulur", async () => {
    const { parseLrc, lyricAt } = await import("../../engine/audio/lyrics");
    const lines = parseLrc("[00:05.00] ikinci\n[00:01.50] birinci\n[00:09.00][00:12.00] tekrar\ngeçersiz satır");
    expect(lines.map((l) => l.text)).toEqual(["birinci", "ikinci", "tekrar", "tekrar"]);
    expect(lyricAt(lines, 0.5)).toBe("");
    expect(lyricAt(lines, 6)).toBe("ikinci");
    expect(lyricAt(lines, 12.5)).toBe("tekrar");
  });
});

describe("klip yönetmeni", () => {
  it("çekimler şarkının saniyesine göre keser; çekim içinde kamera kayar, yörünge döner", () => {
    const frame = createFrame();
    const shots = [
      { at: 10, from: new THREE.Vector3(0, 0, 10), to: new THREE.Vector3(0, 0, 0), look: new THREE.Vector3(0, 0, -10), fov: 40, curve: "linear" as const },
      { at: 20, orbit: { center: new THREE.Vector3(), radius: 5, height: 2, from: 0, to: Math.PI }, look: new THREE.Vector3(), fov: 60, curve: "linear" as const },
    ];
    expect(frameAt(shots, 5, 0, frame)).toBe(false);
    expect(frameAt(shots, 15, 0, frame)).toBe(true);
    expect(frame.position.z).toBeCloseTo(5, 5);
    expect(frame.fov).toBe(40);
    expect(frame.flash).toBe(0);
    // Kesme: 20. saniyede yörüngenin başı.
    frameAt(shots, 20, 0, frame);
    expect(frame.position.x).toBeCloseTo(5, 5);
    expect(frame.position.y).toBeCloseTo(2, 5);
    // Son çekim 24 sn sürer; yarısında yörünge yarı yolda.
    frameAt(shots, 32, 0, frame);
    expect(frame.position.x).toBeCloseTo(0, 5);
    expect(frame.position.z).toBeCloseTo(5, 5);
  });

  it("çekimin paleti, lensi ve girişi kareye geçer", () => {
    const frame = createFrame();
    const shots = [
      { at: 0, from: new THREE.Vector3(0, 0, 10), look: new THREE.Vector3(), grade: "noir" as const, lens: "film" as const, in: "fade" as const },
      { at: 10, from: new THREE.Vector3(0, 0, 10), look: new THREE.Vector3(), in: "flash" as const },
    ];
    frameAt(shots, 0.1, 0, frame);
    expect(frame.grade.saturation).toBe(0);
    expect(frame.lens).toBe(2);
    expect(frame.flash).toBeGreaterThan(0.8);
    frameAt(shots, 5, 0, frame);
    expect(frame.flash).toBe(0);
    frameAt(shots, 10.05, 0, frame);
    expect(frame.flashColor.r).toBe(1);
    expect(frame.lens).toBe(0);
    expect(frame.grade.saturation).toBe(1);
  });
});
