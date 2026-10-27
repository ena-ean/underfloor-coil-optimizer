import { isBetter, type Score } from "./cost";
import { fitSize, type Bin } from "./heuristic";

/** Progress of the branch and bound, in millimetres (public API is metres). */
export interface ExactProgress {
  bestLengthMm: number;
  bestCount: number;
  lowerBoundMm: number;
  nodes: number;
  elapsedMs: number;
}

export interface ExactOptions {
  onProgress?: (progress: ExactProgress) => void;
  /** Returning true aborts the search and returns the best plan so far. */
  shouldStop?: () => boolean;
}

export interface ExactSolution {
  bins: Bin[];
  score: Score;
  /** True when the search finished, i.e. the returned plan is provably optimal. */
  optimal: boolean;
  nodes: number;
  elapsedMs: number;
  /** Lower bound for the whole input, in millimetres. */
  lowerBoundMm: number;
}

const PROGRESS_INTERVAL_MS = 120;
const STOP_CHECK_MASK = 511;

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
 * Exact solver: depth-first branch and bound over whole coils.
 *
 * Coils are built one at a time. The longest unpacked loop must go into the
 * coil being created, so every partition is visited once instead of once per
 * permutation. Loops of equal length are interchangeable and are counted as a
 * multiplicity, which removes the largest source of duplicate branches.
 *
 * Pruning:
 *   • maximality — a coil with room for another remaining loop is dominated:
 *     moving that loop in never costs an extra millimetre and never adds a
 *     coil, so an optimal plan can always be assumed maximal;
 *   • lower bound — the remaining loops need at least
 *     `ceil(remaining / maxSize)` coils of at least `minSize` each, at least
 *     `reachable rounding` millimetres in total, and every loop longer than
 *     half a coil needs a coil of its own;
 *   • incumbent — the greedy seed only prunes, it never decides the answer.
 *
 * There is no node or time budget: the search either finishes (the plan is
 * then optimal) or is aborted from outside through `shouldStop`.
 */
export function solveExact(
  lengthsMm: number[],
  sizesMm: number[],
  seed: { bins: Bin[]; score: Score },
  options: ExactOptions = {},
): ExactSolution {
  const startedAt = Date.now();
  const maxSize = sizesMm[sizesMm.length - 1];
  const minSize = sizesMm[0];
  const divisor = sizesMm.reduce((acc, size) => gcd(acc, size), 0) || 1;

  // ── Loops grouped by length, longest first ───────────────────────────────
  const order = Array.from({ length: lengthsMm.length }, (_, index) => index).sort(
    (a, b) => lengthsMm[b] - lengthsMm[a] || a - b,
  );

  const groupLength: number[] = [];
  const buckets: number[][] = [];
  for (const index of order) {
    const length = lengthsMm[index];
    if (groupLength.length === 0 || groupLength[groupLength.length - 1] !== length) {
      groupLength.push(length);
      buckets.push([]);
    }
    buckets[buckets.length - 1].push(index);
  }

  const groups = groupLength.length;
  const counts = buckets.map((bucket) => bucket.length);
  /** How many loops of each group already sit in the coils on the path. */
  const cursor = new Array<number>(groups).fill(0);

  const totalLength = lengthsMm.reduce((sum, length) => sum + length, 0);

  let remaining = lengthsMm.length;
  let remainingLength = totalLength;

  // ── Lower bound on what the remaining loops still cost ───────────────────
  const remainingBound = (lengthLeft: number): number => {
    let bound = lengthLeft;

    const rounded = Math.ceil(lengthLeft / divisor) * divisor;
    if (rounded > bound) bound = rounded;

    const countBound = Math.ceil(lengthLeft / maxSize) * minSize;
    if (countBound > bound) bound = countBound;

    // Loops longer than half a coil cannot share a coil with each other, so
    // each one needs a coil of its own — of at least its own fitting size.
    let big = 0;
    for (let g = 0; g < groups; g++) {
      if (counts[g] > 0 && groupLength[g] * 2 > maxSize) {
        big += counts[g] * fitSize(groupLength[g], sizesMm);
      }
    }
    if (big > bound) bound = big;

    return bound;
  };

  const rootLowerBound = remainingBound(totalLength);

  let bestBins: Bin[] = seed.bins.map((bin) => ({ ...bin, items: [...bin.items] }));
  let bestScore: Score = seed.score;
  let nodes = 0;
  let aborted = false;
  let lastReport = startedAt;
  let pathLength = 0;
  let pathCount = 0;

  const path: Bin[] = [];

  const report = (): void => {
    if (!options.onProgress) return;
    const now = Date.now();
    if (now - lastReport < PROGRESS_INTERVAL_MS) return;
    lastReport = now;
    options.onProgress({
      bestLengthMm: bestScore.length,
      bestCount: bestScore.count,
      lowerBoundMm: rootLowerBound,
      nodes,
      elapsedMs: now - startedAt,
    });
  };

  // ── One complete coil ────────────────────────────────────────────────────
  const closeCoil = (sum: number, items: number[]): void => {
    const size = fitSize(sum, sizesMm);

    // Dominance: a loop that still fits into the coil *at its current size* is
    // free — moving it here keeps this coil and shrinks the rest. Larger
    // sizes are not free: they would upgrade the coil, so no prune there.
    for (let g = 0; g < groups; g++) {
      if (counts[g] > 0 && sum + groupLength[g] <= size) return;
    }

    const nextLength = pathLength + size;
    if (nextLength > bestScore.length) return;

    const nextCount = pathCount + 1;
    if (nextLength === bestScore.length && nextCount >= bestScore.count) return;

    path.push({ items: [...items], used: sum, size });
    pathLength = nextLength;
    pathCount = nextCount;
    search();
    pathLength -= size;
    pathCount -= 1;
    path.pop();
  };

  // ── Fill the coil being built with loops of group `g` and beyond ─────────
  const fill = (g: number, sum: number, items: number[]): void => {
    if (aborted) return;
    if (g === groups) {
      closeCoil(sum, items);
      return;
    }

    const length = groupLength[g];
    const limit = Math.min(counts[g], Math.floor((maxSize - sum) / length));

    for (let take = limit; take >= 0; take--) {
      if (take === 0) {
        fill(g + 1, sum, items);
      } else {
        const start = cursor[g];
        counts[g] -= take;
        cursor[g] += take;
        remaining -= take;
        remainingLength -= take * length;
        for (let k = 0; k < take; k++) items.push(buckets[g][start + k]);

        fill(g + 1, sum + take * length, items);

        items.length -= take;
        remainingLength += take * length;
        remaining += take;
        cursor[g] = start;
        counts[g] += take;
      }
      if (aborted) return;
    }
  };

  // ── Depth-first search over the unpacked loops ───────────────────────────
  function search(): void {
    nodes += 1;
    if (nodes > 1 && (nodes & STOP_CHECK_MASK) === 0) {
      report();
      if (options.shouldStop?.()) {
        aborted = true;
        return;
      }
    }

    if (remaining === 0) {
      if (isBetter({ length: pathLength, count: pathCount }, bestScore)) {
        bestScore = { length: pathLength, count: pathCount };
        bestBins = path.map((bin) => ({ ...bin, items: [...bin.items] }));
      }
      return;
    }

    const optimistic = pathLength + remainingBound(remainingLength);
    if (optimistic > bestScore.length) return;
    if (
      optimistic === bestScore.length &&
      pathCount + Math.ceil(remainingLength / maxSize) >= bestScore.count
    ) {
      return;
    }

    let pivot = 0;
    while (pivot < groups && counts[pivot] === 0) pivot += 1;
    if (pivot >= groups) return;

    const pivotLength = groupLength[pivot];
    const start = cursor[pivot];
    counts[pivot] -= 1;
    cursor[pivot] += 1;
    remaining -= 1;
    remainingLength -= pivotLength;

    fill(pivot, pivotLength, [buckets[pivot][start]]);

    cursor[pivot] = start;
    remainingLength += pivotLength;
    remaining += 1;
    counts[pivot] += 1;
  }

  // A seed that already reaches the bound needs no search at all.
  if (seed.score.length > rootLowerBound) search();

  return {
    bins: bestBins,
    score: bestScore,
    optimal: !aborted,
    nodes,
    elapsedMs: Math.max(0, Date.now() - startedAt),
    lowerBoundMm: rootLowerBound,
  };
}
