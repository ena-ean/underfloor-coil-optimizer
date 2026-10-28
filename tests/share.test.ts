import { describe, expect, it } from "vitest";

import { SHARE_MAX_LENGTH, SHARE_PREFIX, decodeShare, encodeShare, shareUrl } from "@/lib/share";
import { sanitizeSettings, type CalculatorState } from "@/lib/state";

const state: CalculatorState = {
  loops: [
    { id: "a", floor: 1, length: 64, room: "Гостиная" },
    { id: "b", floor: 2, length: 41.5 },
    { id: "c", floor: 2, length: 78, room: "Kids room" },
  ],
  settings: sanitizeSettings({
    // The same length twice: the cheaper row is the one that prices the plan.
    coils: [
      { id: "x", size: 100, price: 12_000 },
      { id: "y", size: 200, price: 24_000 },
      { id: "z", size: 200, price: 21_000 },
    ],
    reserve: 2.5,
    currency: "RUB",
    units: "metric",
  }),
};

describe("share links", () => {
  it("round-trips the whole project, rooms and duplicate rows included", () => {
    const restored = decodeShare(encodeShare(state));

    expect(restored).not.toBeNull();
    expect(restored?.loops.map((loop) => [loop.floor, loop.length, loop.room])).toEqual([
      [1, 64, "Гостиная"],
      [2, 41.5, undefined],
      [2, 78, "Kids room"],
    ]);
    expect(restored?.settings.coils.map((coil) => [coil.size, coil.price])).toEqual([
      [100, 12_000],
      [200, 24_000],
      [200, 21_000],
    ]);
    expect(restored?.settings.reserve).toBe(2.5);
    expect(restored?.settings.currency).toBe("RUB");
    expect(restored?.settings.units).toBe("metric");
  });

  it("keeps the unit system the link was made in", () => {
    const imperial: CalculatorState = {
      ...state,
      settings: { ...state.settings, units: "imperial" },
    };
    expect(decodeShare(encodeShare(imperial))?.settings.units).toBe("imperial");
  });

  it("starts the payload with the documented prefix", () => {
    expect(encodeShare(state).startsWith(SHARE_PREFIX)).toBe(true);
    expect(encodeShare(state).slice(SHARE_PREFIX.length)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("ignores a hash that is not a share link", () => {
    expect(decodeShare("")).toBeNull();
    expect(decodeShare("#section-2")).toBeNull();
    expect(decodeShare("#p=")).toBeNull();
  });

  it("rejects a payload it cannot read", () => {
    expect(decodeShare(`${SHARE_PREFIX}not-base64-$$$`)).toBeNull();
    expect(decodeShare(`${SHARE_PREFIX}bm90LWpzb24`)).toBeNull(); // "not-json"
  });

  it("rejects a payload of another version or without loops", () => {
    const other = `#p=${btoa(JSON.stringify({ v: 99, l: [], c: [] }))}`;
    expect(decodeShare(other)).toBeNull();

    const empty = `#p=${btoa(JSON.stringify({ v: 1, l: [], c: [] }))}`;
    expect(decodeShare(empty)).toBeNull();
  });

  it("builds an absolute link and flags an oversized one", () => {
    const link = shareUrl("https://example.com/?x=1#old", state);
    expect(link.url.startsWith("https://example.com/?x=1#p=")).toBe(true);
    expect(link.tooLarge).toBe(false);

    const huge: CalculatorState = {
      ...state,
      loops: Array.from({ length: 400 }, (_, index) => ({
        id: `loop-${index}`,
        floor: 1,
        length: 60,
        room: `Помещение номер ${index} с длинным названием`,
      })),
    };
    const big = shareUrl("https://example.com/", huge);
    expect(big.url.length).toBeGreaterThan(SHARE_MAX_LENGTH);
    expect(big.tooLarge).toBe(true);
  });
});
