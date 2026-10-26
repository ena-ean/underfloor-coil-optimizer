import type { Objective, PriceTable } from "./types";

/**
 * A solution is compared by a lexicographic score:
 *   1. total weight — money (kopecks) when prices are known, else millimetres;
 *   2. total purchased length in millimetres;
 *   3. number of coils (fewer is better: less handling, less waste in practice).
 */
export interface Score {
  weight: number;
  length: number;
  count: number;
}

export function compareScores(a: Score, b: Score): number {
  if (a.weight !== b.weight) return a.weight - b.weight;
  if (a.length !== b.length) return a.length - b.length;
  return a.count - b.count;
}

export function isBetter(candidate: Score, current: Score): boolean {
  return compareScores(candidate, current) < 0;
}

export interface CostModel {
  /** Price of a whole coil of the given size (mm) or null when unknown. */
  coilCost(sizeMm: number): number | null;
  /** Integer weight used by the solver for the given coil size. */
  weight(sizeMm: number): number;
  /** Cheapest weight per millimetre among available sizes (lower bound helper). */
  minWeightPerMm: number;
  cheapestWeight: number;
  hasPrices: boolean;
}

/** Converts a price table into a model usable by the packing algorithms. */
export function createCostModel(
  sizesMm: number[],
  prices?: PriceTable,
  objective: Objective = "waste",
): CostModel {
  const perSize = prices?.perSize ?? {};
  const fallback = prices?.perMeter ?? 0;

  const pricePerMetre = (sizeMm: number): number => {
    const override = perSize[String(sizeMm / 1000)];
    if (typeof override === "number" && Number.isFinite(override) && override > 0) {
      return override;
    }
    return fallback;
  };

  const hasPrices = sizesMm.some((size) => pricePerMetre(size) > 0);

  const coilCost = (sizeMm: number): number | null => {
    const price = pricePerMetre(sizeMm);
    if (!(price > 0)) return null;
    return Math.round((sizeMm / 1000) * price * 100) / 100;
  };

  const useMoney = objective === "cost" && hasPrices;

  const weight = (sizeMm: number): number => {
    const cost = coilCost(sizeMm);
    // Prices are compared in kopecks so that the solver stays on integers.
    return !useMoney || cost === null ? sizeMm : Math.round(cost * 100);
  };

  const weights = sizesMm.map(weight);
  const ratios = sizesMm.map((size, i) => (size > 0 ? weights[i] / size : Infinity));
  const minWeightPerMm = ratios.length > 0 ? Math.min(...ratios) : 1;

  return {
    coilCost,
    weight,
    minWeightPerMm,
    cheapestWeight: weights.length > 0 ? Math.min(...weights) : 0,
    hasPrices,
  };
}
