import { describe, expect, it } from "vitest";
import { HEART_BPM, RHYTHM_TARGET, rhythmHit } from "../../worlds/beni-buyuten-sarkilar/rhythm";

describe("anne kalbi ritim oyunu", () => {
  it("vuruşun tepesine yakın basışlar isabettir", () => {
    expect(rhythmHit(0.25)).toBe(true);
    expect(rhythmHit(0.33)).toBe(true);
    expect(rhythmHit(3.17)).toBe(true);
  });
  it("vuruşlar arası basışlar kaçırmadır", () => {
    expect(rhythmHit(0.75)).toBe(false);
    expect(rhythmHit(0.0)).toBe(false);
    expect(rhythmHit(2.5)).toBe(false);
  });
  it("54 bpm'de pencere yaklaşık ±130 ms'dir", () => {
    const period = 60 / HEART_BPM;
    expect(rhythmHit(0.25 + 0.12 * 0.99)).toBe(true);
    expect(rhythmHit(0.25 + 0.12 * 1.01)).toBe(false);
    expect(period * 0.12).toBeCloseTo(0.133, 2);
    expect(RHYTHM_TARGET).toBe(8);
  });
});
