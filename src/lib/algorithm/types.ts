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

export interface PriceTable {
  /** Fallback price per metre of pipe. */
  perMeter: number;
  /**
   * Optional per-size override: coil size in metres (as a string key so the
   * table survives JSON round-trips) -> price per metre.
   */
  perSize?: Record<string, number>;
}

/** Progress of a running search, reported from the solver to the interface. */
export interface SolverProgress {
  /** Total purchased length of the best plan found so far, in metres. */
  bestLength: number;
  /** Number of coils in the best plan found so far. */
  bestCount: number;
  /** Lowest purchase length that can still win, in metres. */
  lowerBound: number;
  nodesVisited: number;
  elapsedMs: number;
}

/**
 * Cooperative controls handed to the solver. They never change the answer,
 * only whether the search is allowed to run to completion.
 */
export interface SolverHooks {
  /** Called periodically with the best plan so far. */
  onProgress?: (progress: SolverProgress) => void;
  /** Returning true aborts the search; the best plan found so far is returned. */
  shouldStop?: () => boolean;
}

export interface OptimizationOptions {
  /** Coil sizes available for purchase, in metres. */
  coilSizes: CoilSize[];
  /** Reserve added to every loop, in metres (default 0). */
  reserve?: number;
  /** Prices, used only to show the purchase cost of the finished plan. */
  prices?: PriceTable;
  /** Progress reporting and cancellation. */
  hooks?: SolverHooks;
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
  /** True only when the search finished, i.e. nothing better exists. */
  optimal: boolean;
  elapsedMs: number;
  /**
   * Lowest purchase length no plan can beat, in metres. Equal to
   * `totalCoilLength` once optimality is proven.
   */
  lowerBound: number;
  /** totalCoilLength - lowerBound, in metres. */
  gap: number;
  loopsCount: number;
  /** Search nodes visited by the branch and bound. */
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
