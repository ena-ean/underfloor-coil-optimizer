import { createPriceModel } from "./cost";
import { solveExact } from "./exact";
import { buildSeed, normalizeBins } from "./heuristic";
import type {
  CoilPlan,
  LoopInput,
  OptimizationOptions,
  PackingOutcome,
  PackingResult,
  SolverProgress,
} from "./types";

const MM_PER_M = 1000;

const toMm = (metres: number): number => Math.round(metres * MM_PER_M);
const toMetres = (mm: number): number => Math.round(mm) / MM_PER_M;

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y > 0) {
    const rest = x % y;
    x = y;
    y = rest;
  }
  return x;
}

/**
 * Every purchasable plan is a sum of coil sizes, hence a multiple of their
 * greatest common divisor. That gives a cheap but sound lower bound, used to
 * reassure the interface while a long search is still running.
 */
export function purchasedLowerBound(requiredMetres: number, coilSizes: number[]): number {
  const sizes = coilSizes.map(toMm).filter((size) => size > 0);
  if (sizes.length === 0) return requiredMetres;

  const divisor = sizes.reduce((acc, size) => gcd(acc, size), 0);
  const requiredMm = toMm(requiredMetres);
  if (divisor <= 0) return toMetres(requiredMm);

  return toMetres(Math.ceil(requiredMm / divisor) * divisor);
}

/**
 * Packs the loops into the cheapest possible set of coils.
 *
 * There is exactly one algorithm: the exact branch and bound. The greedy pass
 * inside `buildSeed` only supplies the initial upper bound, so its quality can
 * change the run time but never the plan.
 */
export function optimizePacking(
  loops: LoopInput[],
  options: OptimizationOptions,
): PackingOutcome {
  const sizesMm = [...new Set(options.coilSizes.filter((size) => Number.isFinite(size) && size > 0))]
    .map(toMm)
    .sort((a, b) => a - b);

  if (sizesMm.length === 0) {
    return { ok: false, error: { code: "no-sizes", params: {} } };
  }
  if (loops.length === 0) {
    return { ok: false, error: { code: "no-loops", params: {} } };
  }

  const reserve = Number.isFinite(options.reserve ?? 0) ? Math.max(0, options.reserve ?? 0) : 0;
  const maxSizeMm = sizesMm[sizesMm.length - 1];

  for (let i = 0; i < loops.length; i++) {
    const length = loops[i].length;
    if (!Number.isFinite(length) || length <= 0) {
      return {
        ok: false,
        error: { code: "invalid-loop-length", params: { loop: i + 1, length: Number(length) || 0 } },
      };
    }
    if (toMm(length + reserve) > maxSizeMm) {
      return {
        ok: false,
        error: {
          code: "loop-too-long",
          params: {
            loop: i + 1,
            length: Math.round((length + reserve) * 10) / 10,
            maxSize: toMetres(maxSizeMm),
          },
        },
      };
    }
  }

  const startedAt = Date.now();
  const lengthsMm = loops.map((loop) => toMm(loop.length + reserve));
  const seed = buildSeed(lengthsMm, sizesMm, maxSizeMm);

  const onProgress = options.hooks?.onProgress;
  const exact = solveExact(lengthsMm, sizesMm, seed, {
    shouldStop: options.hooks?.shouldStop,
    onProgress: onProgress
      ? (progress) =>
          onProgress({
            bestLength: toMetres(progress.bestLengthMm),
            bestCount: progress.bestCount,
            lowerBound: toMetres(progress.lowerBoundMm),
            nodesVisited: progress.nodes,
            elapsedMs: progress.elapsedMs,
          } satisfies SolverProgress)
      : undefined,
  });

  const prices = createPriceModel(sizesMm, options.prices);
  const packed = normalizeBins(exact.bins, lengthsMm, sizesMm);
  const ordered = [...packed].sort(
    (a, b) => b.size - a.size || (a.items[0] ?? 0) - (b.items[0] ?? 0),
  );

  const coils: CoilPlan[] = ordered.map((bin, index) => ({
    index: index + 1,
    size: toMetres(bin.size),
    loopIndexes: [...bin.items].sort((a, b) => a - b),
    used: toMetres(bin.used),
    waste: toMetres(bin.size - bin.used),
    fillPercent: bin.size > 0 ? Math.round((bin.used / bin.size) * 1000) / 10 : 0,
    cost: prices.coilCost(bin.size),
  }));

  const totalDesign =
    Math.round(loops.reduce((sum, loop) => sum + Math.max(0, loop.length), 0) * 100) / 100;
  const totalUsed = toMetres(lengthsMm.reduce((sum, length) => sum + length, 0));
  const totalCoilLength = toMetres(packed.reduce((sum, bin) => sum + bin.size, 0));

  // A finished search is itself the strongest possible bound.
  const lowerBound = exact.optimal
    ? totalCoilLength
    : Math.min(toMetres(exact.lowerBoundMm), totalCoilLength);
  const gap = Math.max(0, Math.round((totalCoilLength - lowerBound) * 1000) / 1000);

  const pricesKnown = coils.some((coil) => coil.cost !== null);
  const totalCost = pricesKnown
    ? Math.round(coils.reduce((sum, coil) => sum + (coil.cost ?? 0), 0) * 100) / 100
    : null;

  const result: PackingResult = {
    coils,
    totalDesign,
    totalUsed,
    totalWaste: Math.round((totalCoilLength - totalUsed) * 1000) / 1000,
    totalCoilLength,
    totalCost,
    diagnostics: {
      optimal: exact.optimal,
      elapsedMs: Math.max(0, Date.now() - startedAt),
      lowerBound,
      gap,
      loopsCount: loops.length,
      nodesVisited: exact.nodes,
    },
  };

  return { ok: true, result };
}

/** Naive baseline: one coil per loop, used to show the savings. */
export function naivePurchaseLength(loops: LoopInput[], coilSizes: number[], reserve = 0): number {
  const sizes = coilSizes.filter((size) => size > 0).sort((a, b) => a - b);
  const largest = sizes[sizes.length - 1];
  let total = 0;
  for (const loop of loops) {
    const needed = loop.length + reserve;
    const size = sizes.find((candidate) => candidate >= needed);
    total += size ?? Math.ceil(needed / (largest || 1)) * (largest || needed);
  }
  return Math.round(total * 100) / 100;
}
