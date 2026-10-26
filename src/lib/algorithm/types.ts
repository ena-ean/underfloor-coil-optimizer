/**
 * Domain types of the coil packing optimizer.
 *
 * Internally every length is an integer number of millimetres, so the solver
 * never compares floats. Public results are returned in metres.
 */

/** Coil sizes are described in metres (e.g. 50, 100, 200). */
export type CoilSize = number;

export interface LoopInput {
  /** Stable identifier owned by the caller (React keys, table numbering). */
  id: string;
  /** Floor / storey the circuit belongs to. Free-form positive integer. */
  floor: number;
  /** Design length of the circuit in metres, without the connection reserve. */
  length: number;
}

/** What the solver should minimise. */
export type Objective = "waste" | "cost";

export interface PriceTable {
  /** Fallback price per metre of pipe. */
  perMeter: number;
  /**
   * Optional per-size override: coil size in metres (as a string key so the
   * table survives JSON round-trips) -> price per metre.
   */
  perSize?: Record<string, number>;
}

export interface OptimizationOptions {
  /** Coil sizes available for purchase, in metres. */
  coilSizes: CoilSize[];
  /** Reserve added to every loop, in metres (default 0). */
  reserve?: number;
  /** Objective, defaults to "waste" (minimum purchased length). */
  objective?: Objective;
  /** Prices, required for the "cost" objective to take effect. */
  prices?: PriceTable;
  /** Time budget for the exact solver in milliseconds. */
  timeLimitMs?: number;
  /** Exact solver is only attempted when loops count is below this value. */
  maxExactLoops?: number;
}

export interface CoilPlan {
  /** 1-based number shown to the user. */
  index: number;
  /** Coil size in metres. */
  size: number;
  /** 0-based indexes into the normalized loop list. */
  loopIndexes: number[];
  /** Metres actually consumed (design length + reserve). */
  used: number;
  /** Metres left over in the coil. */
  waste: number;
  /** used / size in percent, one decimal. */
  fillPercent: number;
  /** Price of the whole coil, null when prices are unknown. */
  cost: number | null;
}

export interface OptimizationDiagnostics {
  strategy: "exact" | "heuristic";
  /** True only when the solver proved that nothing better exists. */
  optimal: boolean;
  elapsedMs: number;
  /** Theoretical minimum purchase length, in metres. */
  lowerBound: number;
  /** How far the returned plan is above the lower bound, in metres. */
  gap: number;
  loopsCount: number;
  /** Search nodes visited by the exact solver (0 for heuristic-only runs). */
  nodesVisited: number;
}

export interface PackingResult {
  coils: CoilPlan[];
  /** Design sum of all loops (without reserve), in metres. */
  totalDesign: number;
  /** Sum of loops with reserve, in metres. */
  totalUsed: number;
  /** totalCoilLength - totalUsed, in metres. */
  totalWaste: number;
  /** Total length of pipe to purchase, in metres. */
  totalCoilLength: number;
  /** Total purchase cost, null when prices are unknown. */
  totalCost: number | null;
  diagnostics: OptimizationDiagnostics;
}

export type PackingErrorCode =
  | "no-loops"
  | "no-sizes"
  | "invalid-loop-length"
  | "loop-too-long";

export interface PackingError {
  code: PackingErrorCode;
  /** Values for the localized message, e.g. `{ loop: 4, length: 92, maxSize: 50 }`. */
  params: Record<string, number>;
}

export type PackingOutcome =
  | { ok: true; result: PackingResult }
  | { ok: false; error: PackingError };

/** Sizes offered in the UI. Any other list can be passed programmatically. */
export const DEFAULT_COIL_SIZES: readonly CoilSize[] = [50, 100, 200, 250, 500, 600];
