import { describe, expect, it } from "vitest";

import { naivePurchaseLength, optimizePacking, purchasedLowerBound } from "@/lib/algorithm";
import type { LoopInput, PackingResult } from "@/lib/algorithm/types";

const loops = (lengths: number[], floor = 1): LoopInput[] =>
  lengths.map((length, index) => ({ id: `l${index}`, floor, length }));

const expectOk = (outcome: ReturnType<typeof optimizePacking>): PackingResult => {
  if (!outcome.ok) throw new Error(`expected success, got ${outcome.error.code}`);
  return outcome.result;
};

/** Reference case from the original manual calculation: 19 loops, 200 m coils. */
const referenceLoops = [
  ...Array.from({ length: 15 }, () => 64),
  ...Array.from({ length: 4 }, () => 74),
];

describe("optimizePacking — reference cases", () => {
  it("finds the known optimum for 19 loops in 200 m coils", () => {
    const result = expectOk(
      optimizePacking(loops(referenceLoops), { coilSizes: [200], reserve: 2 }),
    );

    expect(result.totalDesign).toBe(1256);
    expect(result.totalUsed).toBe(1294);
    expect(result.coils).toHaveLength(7);
    expect(result.totalCoilLength).toBe(1400);
    expect(result.totalWaste).toBe(106);
    expect(result.diagnostics.gap).toBe(0);
    expect(result.diagnostics.lowerBound).toBe(1400);
    expect(result.diagnostics.optimal).toBe(true);
  });

  it("never spends more pipe with a wider choice of sizes", () => {
    const singleSize = expectOk(
      optimizePacking(loops(referenceLoops), { coilSizes: [200], reserve: 2 }),
    );
    const mixed = expectOk(
      optimizePacking(loops(referenceLoops), {
        coilSizes: [50, 100, 200, 250, 500, 600],
        reserve: 2,
      }),
    );

    expect(mixed.totalCoilLength).toBeLessThanOrEqual(singleSize.totalCoilLength);
    expect(mixed.totalWaste).toBeCloseTo(mixed.totalCoilLength - mixed.totalUsed, 6);
    expect(mixed.coils.length).toBeGreaterThan(0);
  });

  it("never returns a coil filled beyond its size", () => {
    const result = expectOk(
      optimizePacking(loops(referenceLoops), { coilSizes: [100, 200], reserve: 2 }),
    );
    for (const coil of result.coils) {
      expect(coil.used).toBeLessThanOrEqual(coil.size + 1e-9);
      expect(coil.waste).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it("assigns every loop exactly once", () => {
    const input = loops(referenceLoops);
    const result = expectOk(optimizePacking(input, { coilSizes: [200], reserve: 2 }));

    const seen = new Set<number>();
    for (const coil of result.coils) {
      for (const index of coil.loopIndexes) {
        expect(seen.has(index)).toBe(false);
        seen.add(index);
      }
    }
    expect(seen.size).toBe(input.length);
  });

  it("beats the naive one-coil-per-loop purchase", () => {
    const input = loops(referenceLoops);
    const result = expectOk(optimizePacking(input, { coilSizes: [200], reserve: 2 }));
    const naive = naivePurchaseLength(input, [200], 2);

    expect(naive).toBe(3800);
    expect(result.totalCoilLength).toBeLessThan(naive);
  });
});

describe("optimizePacking — validation", () => {
  it("rejects an empty loop list", () => {
    const outcome = optimizePacking([], { coilSizes: [200] });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error.code).toBe("no-loops");
  });

  it("rejects an empty coil size list", () => {
    const outcome = optimizePacking(loops([50]), { coilSizes: [] });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error.code).toBe("no-sizes");
  });

  it("reports loops that do not fit the largest coil", () => {
    const outcome = optimizePacking(loops([50, 260]), { coilSizes: [200], reserve: 2 });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.error.code).toBe("loop-too-long");
      expect(outcome.error.params.loop).toBe(2);
      expect(outcome.error.params.maxSize).toBe(200);
    }
  });

  it("reports non-positive lengths", () => {
    const outcome = optimizePacking(loops([50, 0]), { coilSizes: [200] });
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error.code).toBe("invalid-loop-length");
  });
});

describe("purchasedLowerBound", () => {
  it("rounds up to a multiple of the greatest common divisor", () => {
    expect(purchasedLowerBound(1294, [200])).toBe(1400);
    expect(purchasedLowerBound(1294, [100, 200])).toBe(1300);
    expect(purchasedLowerBound(100, [50, 200])).toBe(100);
  });
});

describe("optimizePacking — optimality", () => {
  it("matches brute force on small instances", () => {
    const instances: { lengths: number[]; sizes: number[] }[] = [
      { lengths: [7, 5, 5, 4, 3, 3], sizes: [10, 12] },
      { lengths: [9, 8, 7, 6, 5, 4, 3], sizes: [12, 20] },
      { lengths: [6, 6, 6, 6, 6], sizes: [10, 15] },
      { lengths: [11, 4, 4, 4, 4, 4], sizes: [12, 16] },
      { lengths: [5, 5, 5, 5, 5, 5, 5], sizes: [9, 14] },
    ];

    for (const instance of instances) {
      const result = expectOk(
        optimizePacking(loops(instance.lengths), { coilSizes: instance.sizes }),
      );
      const optimum = bruteForceMinLength(instance.lengths, instance.sizes);
      expect(result.totalCoilLength).toBeCloseTo(optimum, 6);
      expect(result.diagnostics.optimal).toBe(true);
    }
  });

  it("keeps heuristic mode for large inputs and stays fast", () => {
    const many = Array.from({ length: 120 }, (_, index) => 40 + (index % 7) * 5);
    const startedAt = Date.now();
    const result = expectOk(optimizePacking(loops(many), { coilSizes: [200, 250, 500] }));
    const elapsed = Date.now() - startedAt;

    expect(result.coils.length).toBeGreaterThan(0);
    expect(result.diagnostics.strategy).toBe("heuristic");
    expect(elapsed).toBeLessThan(2000);
  });
});

describe("optimizePacking — cost objective", () => {
  it("prefers the cheaper per-metre option when optimizing money", () => {
    const input = loops([90, 90]);
    const prices = { perMeter: 100, perSize: { "100": 100, "250": 50 } };

    const waste = expectOk(
      optimizePacking(input, { coilSizes: [100, 250], prices, objective: "waste" }),
    );
    const cost = expectOk(
      optimizePacking(input, { coilSizes: [100, 250], prices, objective: "cost" }),
    );

    expect(waste.totalCoilLength).toBe(200);
    expect(waste.totalCost).toBe(20000);
    expect(cost.totalCoilLength).toBe(250);
    expect(cost.totalCost).toBe(12500);
  });

  it("returns null cost when no prices are given", () => {
    const result = expectOk(optimizePacking(loops([50]), { coilSizes: [100] }));
    expect(result.totalCost).toBeNull();
    expect(result.coils[0].cost).toBeNull();
  });
});

/**
 * Exhaustive search over every partition of the loops — the ground truth for
 * the tests above. Only usable for handfuls of loops.
 */
function bruteForceMinLength(lengths: number[], sizes: number[]): number {
  const sortedSizes = [...sizes].sort((a, b) => a - b);
  const largest = sortedSizes[sortedSizes.length - 1];
  let best = Number.POSITIVE_INFINITY;

  const fit = (used: number): number => {
    for (const size of sortedSizes) if (size >= used - 1e-9) return size;
    return Number.POSITIVE_INFINITY;
  };

  const walk = (index: number, groups: number[]): void => {
    if (index === lengths.length) {
      const total = groups.reduce((sum, used) => sum + fit(used), 0);
      if (total < best) best = total;
      return;
    }

    const length = lengths[index];
    for (let g = 0; g < groups.length; g++) {
      if (groups[g] + length > largest + 1e-9) continue;
      groups[g] += length;
      walk(index + 1, groups);
      groups[g] -= length;
    }
    groups.push(length);
    walk(index + 1, groups);
    groups.pop();
  };

  walk(0, []);
  return best;
}
