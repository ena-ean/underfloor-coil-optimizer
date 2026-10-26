import { isBetter, type CostModel, type Score } from "./cost";
import { fitSize, type Bin } from "./heuristic";

export interface ExactOptions {
  /** Hard cap of the search tree size. */
  maxNodes: number;
  /** Wall-clock budget in milliseconds. */
  timeLimitMs: number;
}

export interface ExactSolution {
  bins: Bin[];
  score: Score;
  /** True when the search finished, i.e. the returned plan is provably optimal. */
  optimal: boolean;
  nodes: number;
}

/**
 * Exact solver: depth-first branch and bound.
 *
 * Coils are built one by one: the longest unpacked loop must go into the coil
 * being created, which makes the enumeration canonical (each partition is
 * visited once, up to interchangeable equal-length loops).
 *
 * Pruning:
 *   • the coil being created never exceeds the largest available size;
 *   • the remaining length yields a lower bound on the weight still to come;
 *   • equal-length loops are not treated as distinguishable.
 *
 * The heuristic plan seeds the incumbent and a node/time budget keeps the UI
 * responsive: when the budget is hit, the best plan found so far is returned
 * with `optimal: false`.
 */
export function solveExact(
  lengthsMm: number[],
  sizesMm: number[],
  cost: CostModel,
  seed: { bins: Bin[]; score: Score },
  options: ExactOptions,
): ExactSolution {
  const maxSize = sizesMm[sizesMm.length - 1];
  const startedAt = Date.now();
  const path: Bin[] = [];

  let bestBins = seed.bins.map((bin) => ({ ...bin, items: [...bin.items] }));
  let bestScore = seed.score;
  let nodes = 0;
  let aborted = false;

  const order = Array.from({ length: lengthsMm.length }, (_, i) => i).sort(
    (a, b) => lengthsMm[b] - lengthsMm[a] || a - b,
  );
  const totalLength = order.reduce((sum, index) => sum + lengthsMm[index], 0);

  const search = (remaining: number[], score: Score, remainingLength: number): void => {
    if (aborted) return;

    nodes += 1;
    if (
      nodes > options.maxNodes ||
      ((nodes & 0x3ff) === 0 && Date.now() - startedAt > options.timeLimitMs)
    ) {
      aborted = true;
      return;
    }

    if (remaining.length === 0) {
      if (isBetter(score, bestScore)) {
        bestScore = score;
        bestBins = path.map((bin) => ({ ...bin, items: [...bin.items] }));
      }
      return;
    }

    // Lower bound on the weight still required for the remaining loops.
    const countBound = Math.ceil(remainingLength / maxSize) * cost.cheapestWeight;
    const ratioBound = remainingLength * cost.minWeightPerMm;
    if (score.weight + Math.max(countBound, ratioBound) > bestScore.weight) return;

    const pivot = remaining[0];
    const others = remaining.slice(1);
    const total = others.length;
    const limit = 1 << total;

    for (let mask = 0; mask < limit; mask++) {
      let sum = lengthsMm[pivot];
      const group: number[] = [pivot];
      let valid = true;

      for (let k = 0; k < total; k++) {
        if ((mask & (1 << k)) === 0) continue;
        // Equal lengths are interchangeable: skip symmetric duplicates.
        if (
          k > 0 &&
          lengthsMm[others[k]] === lengthsMm[others[k - 1]] &&
          (mask & (1 << (k - 1))) === 0
        ) {
          valid = false;
          break;
        }
        sum += lengthsMm[others[k]];
        if (sum > maxSize) {
          valid = false;
          break;
        }
        group.push(others[k]);
      }
      if (!valid) continue;

      const size = fitSize(sum, sizesMm);
      const nextScore: Score = {
        weight: score.weight + cost.weight(size),
        length: score.length + size,
        count: score.count + 1,
      };
      // The incumbent can still be reached on ties, so prune strictly worse only.
      if (nextScore.weight > bestScore.weight) continue;

      const rest: number[] = [];
      for (let k = 0; k < total; k++) {
        if ((mask & (1 << k)) === 0) rest.push(others[k]);
      }

      path.push({ items: group, used: sum, size });
      search(rest, nextScore, remainingLength - sum);
      path.pop();

      if (aborted) return;
    }
  };

  search(order, { weight: 0, length: 0, count: 0 }, totalLength);

  return { bins: bestBins, score: bestScore, optimal: !aborted, nodes };
}
