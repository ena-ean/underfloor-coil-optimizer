import { describe, expect, it } from "vitest";

import { naivePurchaseLength, optimizePacking, purchasedLowerBound } from "@/lib/algorithm";
import type { LoopInput, PackingResult, SolverProgress } from "@/lib/algorithm/types";
import { sampleLoops } from "@/lib/state";

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

  it("matches brute force on random instances", () => {
    // Deterministic pseudo-random generator: a failure is always reproducible.
    let state = 20261027;
    const random = (): number => {
      state = (state * 1103515245 + 12345) % 2147483648;
      return state / 2147483648;
    };

    const catalogue = [6, 9, 10, 12, 15, 20, 24];
    let checked = 0;

    for (let round = 0; round < 220; round++) {
      const count = 3 + Math.floor(random() * 6);
      const scale = round % 3 === 0 ? 2 : 1;
      const lengths = Array.from(
        { length: count },
        () => (1 + Math.floor(random() * 16 * scale)) / scale,
      );
      const sizes = catalogue.filter(() => random() < 0.45);
      if (sizes.length === 0) sizes.push(catalogue[Math.floor(random() * catalogue.length)]);
      if (lengths.some((length) => length > Math.max(...sizes))) continue;

      const result = expectOk(optimizePacking(loops(lengths), { coilSizes: sizes }));
      const optimum = bruteForceMinLength(lengths, sizes);

      expect({ lengths, sizes, total: result.totalCoilLength }).toEqual({
        lengths,
        sizes,
        total: optimum,
      });
      expect(result.diagnostics.optimal).toBe(true);
      checked += 1;
    }

    expect(checked).toBeGreaterThan(100);
  });

  it("certifies optimality with a zero gap", () => {
    const result = expectOk(
      optimizePacking(loops(referenceLoops), { coilSizes: [200], reserve: 2 }),
    );

    expect(result.diagnostics.optimal).toBe(true);
    expect(result.diagnostics.lowerBound).toBe(result.totalCoilLength);
    expect(result.diagnostics.gap).toBe(0);
  });
});

describe("optimizePacking — search control", () => {
  /**
   * 36 loops of 40.1, 41.4, … 85.6 m: the reference run needs ~2.3 M nodes and
   * about a second, so cutting it short is deterministic.
   */
  const hardLoops = Array.from({ length: 36 }, (_, index) => 40.1 + index * 1.3);
  const hardSizes = [200, 250, 500];

  it("stops on request and keeps the best plan found so far", () => {
    let checks = 0;
    const result = expectOk(
      optimizePacking(loops(hardLoops), {
        coilSizes: hardSizes,
        hooks: { shouldStop: () => (checks += 1) > 3 },
      }),
    );

    expect(result.diagnostics.optimal).toBe(false);
    expect(result.coils.length).toBeGreaterThan(0);
    expect(result.totalCoilLength).toBeGreaterThan(0);
    expect(result.diagnostics.lowerBound).toBeLessThanOrEqual(result.totalCoilLength);
    expect(result.diagnostics.gap).toBeGreaterThanOrEqual(0);
  });

  it("reports progress while it searches", () => {
    const deadline = Date.now() + 250;
    const reports: SolverProgress[] = [];
    const result = expectOk(
      optimizePacking(loops(hardLoops), {
        coilSizes: hardSizes,
        hooks: {
          onProgress: (progress) => reports.push(progress),
          shouldStop: () => Date.now() > deadline,
        },
      }),
    );

    expect(reports.length).toBeGreaterThan(0);
    for (const report of reports) {
      expect(report.bestLength).toBeGreaterThanOrEqual(report.lowerBound);
      expect(report.bestCount).toBeGreaterThan(0);
    }
    expect(reports[reports.length - 1].elapsedMs).toBeGreaterThanOrEqual(
      reports[0].elapsedMs,
    );
    expect(result.diagnostics.optimal).toBe(false);
  });
});

describe("optimizePacking — prices", () => {
  it("prices describe the plan but never change it", () => {
    const input = loops([90, 90]);
    const prices = { perMeter: 100, perSize: { "100": 100, "250": 50 } };

    const priced = expectOk(optimizePacking(input, { coilSizes: [100, 250], prices }));
    const plain = expectOk(optimizePacking(input, { coilSizes: [100, 250] }));

    expect(plain.totalCoilLength).toBe(200);
    expect(priced.totalCoilLength).toBe(200);
    expect(priced.coils.map((coil) => coil.size)).toEqual(
      plain.coils.map((coil) => coil.size),
    );
    expect(priced.totalCost).toBe(20000);
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

describe("sample data", () => {
  it("offers five or six loops per floor with distinct lengths from 25 to 80 m", () => {
    const sample = sampleLoops();
    const perFloor = new Map<number, number>();
    for (const loop of sample) perFloor.set(loop.floor, (perFloor.get(loop.floor) ?? 0) + 1);

    expect([...perFloor.keys()].sort()).toEqual([1, 2]);
    for (const count of perFloor.values()) {
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(6);
    }

    for (const loop of sample) {
      expect(loop.length).toBeGreaterThanOrEqual(25);
      expect(loop.length).toBeLessThanOrEqual(80);
    }

    expect(new Set(sample.map((loop) => loop.length)).size).toBe(sample.length);
    expect(sample.every((loop) => loop.room === undefined)).toBe(true);
  });
});
