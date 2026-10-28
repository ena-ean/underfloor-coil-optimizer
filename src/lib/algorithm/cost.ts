import type { PriceTable } from "./types";

/**
 * A solution is compared lexicographically:
 *   1. total purchased length in millimetres — the only objective;
 *   2. number of coils (fewer is better: less handling, fewer offcuts).
 *
 * Money never enters the comparison: prices describe the plan, they do not
 * steer it.
 */
export interface Score {
  length: number;
  count: number;
}

export function compareScores(a: Score, b: Score): number {
  if (a.length !== b.length) return a.length - b.length;
  return a.count - b.count;
}

export function isBetter(candidate: Score, current: Score): boolean {
  return compareScores(candidate, current) < 0;
}

export interface PriceModel {
  /** Price of a whole coil of the given size (mm) or null when unknown. */
  coilCost(sizeMm: number): number | null;
  /** True when at least one size carries a price. */
  hasPrices: boolean;
}

/** Converts a price table into the model used to price a finished plan. */
export function createPriceModel(sizesMm: number[], prices?: PriceTable): PriceModel {
  const perSize = prices?.perSize ?? {};
  const perCoil = prices?.perCoil ?? {};
  const fallback = prices?.perMeter ?? 0;

  const isPrice = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && value > 0;

  /** Whole-coil price if the catalogue quotes one, otherwise null. */
  const wholeCoilPrice = (sizeMm: number): number | null => {
    const fixed = perCoil[String(sizeMm / 1000)];
    return isPrice(fixed) ? Math.round(fixed * 100) / 100 : null;
  };

  const pricePerMetre = (sizeMm: number): number => {
    const override = perSize[String(sizeMm / 1000)];
    if (isPrice(override)) return override;
    return fallback;
  };

  const hasPrices =
    sizesMm.some((size) => wholeCoilPrice(size) !== null) ||
    sizesMm.some((size) => pricePerMetre(size) > 0);

  const coilCost = (sizeMm: number): number | null => {
    const fixed = wholeCoilPrice(sizeMm);
    if (fixed !== null) return fixed;

    const price = pricePerMetre(sizeMm);
    if (!(price > 0)) return null;
    return Math.round((sizeMm / 1000) * price * 100) / 100;
  };

  return { coilCost, hasPrices };
}
