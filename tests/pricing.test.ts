import { describe, expect, it } from "vitest";

import { optimizePacking } from "@/lib/algorithm";
import type { LoopInput, PackingOutcome } from "@/lib/algorithm/types";
import {
  coilPrices,
  coilSizes,
  defaultCoils,
  sampleLoops,
  sampleState,
  sanitizeSettings,
  type CoilOption,
} from "@/lib/state";

const loops = (lengths: number[]): LoopInput[] =>
  lengths.map((length, index) => ({ id: `loop-${index}`, floor: 1, length }));

const coil = (size: number, price: number, id = `coil-${size}`): CoilOption => ({
  id,
  size,
  price,
});

function expectOk(outcome: PackingOutcome) {
  if (!outcome.ok) throw new Error(`expected success, got ${outcome.error.code}`);
  return outcome.result;
}

describe("coil catalogue", () => {
  it("keeps one row per size for the solver, sorted", () => {
    expect(coilSizes([coil(200, 24_000), coil(100, 12_000), coil(200, 21_000)])).toEqual([
      100, 200,
    ]);
  });

  it("prices a size by its cheapest row", () => {
    expect(coilPrices([coil(200, 24_000, "a"), coil(200, 21_000, "b")])).toEqual({ "200": 21_000 });
  });

  it("ignores rows without a price or a length", () => {
    expect(coilPrices([coil(200, 0), coil(0, 5000), coil(100, 12_000)])).toEqual({ "100": 12_000 });
    expect(coilSizes([coil(0, 5000)])).toEqual([]);
  });
});

describe("cost of a finished plan", () => {
  it("adds up whole-coil prices", () => {
    const result = expectOk(
      optimizePacking(loops([64, 64, 64, 64]), {
        coilSizes: [200],
        prices: { perMeter: 0, perCoil: { "200": 24_000 } },
      }),
    );

    // 256 m needs two 200 m coils, so the estimate is two whole coils.
    expect(result.coils).toHaveLength(2);
    expect(result.coils.every((item) => item.cost === 24_000)).toBe(true);
    expect(result.totalCoilLength).toBe(400);
    expect(result.totalCost).toBe(48_000);
  });

  it("prefers a per-coil price over a per-metre rate", () => {
    const result = expectOk(
      optimizePacking(loops([50, 50, 50, 50]), {
        coilSizes: [200],
        prices: { perMeter: 120, perCoil: { "200": 18_000 } },
      }),
    );

    // 200 m at 120/m would be 24 000.
    expect(result.totalCost).toBe(18_000);
  });

  it("falls back to the per-metre rate for an unpriced size", () => {
    const result = expectOk(
      optimizePacking(loops([50, 50, 50, 50]), {
        coilSizes: [200],
        prices: { perMeter: 120 },
      }),
    );

    expect(result.totalCost).toBe(24_000);
  });

  it("keeps the cost unknown when nothing is priced", () => {
    const result = expectOk(optimizePacking(loops([50]), { coilSizes: [100] }));
    expect(result.coils[0].cost).toBeNull();
    expect(result.totalCost).toBeNull();
  });

  it("never lets prices steer the packing", () => {
    // The cheap 250 m coil would be the cheaper purchase, but the objective is
    // the purchased length: 200 m wins.
    const input = loops([60, 60, 60]);
    const priced = expectOk(
      optimizePacking(input, {
        coilSizes: [200, 250],
        prices: { perMeter: 0, perCoil: { "200": 24_000, "250": 1_000 } },
      }),
    );
    const plain = expectOk(optimizePacking(input, { coilSizes: [200, 250] }));

    expect(priced.totalCoilLength).toBe(plain.totalCoilLength);
    expect(priced.totalCoilLength).toBe(200);
    expect(priced.totalCost).toBe(24_000);
  });
});

describe("settings migration", () => {
  it("turns the 1.3 per-metre settings into whole-coil prices", () => {
    const settings = sanitizeSettings({
      sizes: [100, 200],
      pricePerMetre: 120,
      pricePerSize: { "200": 100 },
      reserve: 2,
      currency: "RUB",
      units: "metric",
    });

    expect(settings.coils.map((item) => [item.size, item.price])).toEqual([
      [100, 12_000],
      [200, 20_000],
    ]);
    expect(settings.reserve).toBe(2);
    expect(settings.currency).toBe("RUB");
  });

  it("keeps two rows of the same length", () => {
    const settings = sanitizeSettings({
      coils: [coil(200, 24_000, "a"), coil(200, 19_000, "b")],
      currency: "RUB",
    });

    expect(settings.coils).toHaveLength(2);
    expect(settings.coils.map((item) => item.price)).toEqual([24_000, 19_000]);
  });

  it("drops rows without a usable length and falls back to the defaults", () => {
    const cleaned = sanitizeSettings({ coils: [coil(0, 5000), coil(200, 24_000)] });
    expect(cleaned.coils.map((item) => item.size)).toEqual([200]);

    const empty = sanitizeSettings({ coils: [], currency: "USD" });
    expect(empty.coils.map((item) => item.size)).toEqual(defaultCoils("USD").map((c) => c.size));
  });

  it("keeps the reserve and rejects a negative one", () => {
    expect(sanitizeSettings({ reserve: 3 }).reserve).toBe(3);
    expect(sanitizeSettings({ reserve: -1 }).reserve).toBe(2);
    expect(sanitizeSettings({}).reserve).toBe(2);
  });
});

describe("sample project", () => {
  it("speaks the language of the interface and is priced in its currency", () => {
    const ru = sampleState("ru");
    expect(ru.loops).toHaveLength(12);
    expect(ru.loops[0].room).toBe("Гостиная");
    expect(ru.settings.currency).toBe("RUB");
    expect(ru.settings.coils.find((item) => item.size === 200)?.price).toBe(24_000);

    const en = sampleState("en");
    expect(en.loops[0].room).toBe("Living room");
    expect(en.settings.currency).toBe("USD");
    expect(en.settings.coils.find((item) => item.size === 200)?.price).toBe(300);
  });

  it("leaves the loops unnamed when no rooms are given", () => {
    const loops = sampleLoops();
    expect(loops).toHaveLength(12);
    expect(loops.every((loop) => loop.room === undefined)).toBe(true);
    expect(loops.reduce((sum, loop) => sum + loop.length, 0)).toBe(641);
  });
});
