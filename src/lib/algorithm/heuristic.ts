import { isBetter, type Score } from "./cost";

/** A partially filled coil. `size` is always the smallest fitting size. */
export interface Bin {
  /** Indexes of the loops packed into this coil. */
  items: number[];
  /** Sum of lengths of the packed loops, in millimetres. */
  used: number;
  /** Coil size in millimetres. */
  size: number;
}

/** Smallest coil size that can hold `lengthMm`, or -1 when nothing fits. */
export function fitSize(lengthMm: number, sizesMm: number[]): number {
  for (const size of sizesMm) {
    if (size >= lengthMm) return size;
  }
  return -1;
}

/** Recomputes `used` and `size` of every bin, drops empty bins. */
export function normalizeBins(bins: Bin[], lengthsMm: number[], sizesMm: number[]): Bin[] {
  const result: Bin[] = [];
  for (const bin of bins) {
    if (bin.items.length === 0) continue;
    let used = 0;
    for (const item of bin.items) used += lengthsMm[item];
    const size = fitSize(used, sizesMm);
    result.push({ items: bin.items, used, size: size > 0 ? size : bin.size });
  }
  return result;
}

export function scoreOf(bins: Bin[]): Score {
  let length = 0;
  for (const bin of bins) length += bin.size;
  return { length, count: bins.length };
}

export function cloneBins(bins: Bin[]): Bin[] {
  return bins.map((bin) => ({ items: [...bin.items], used: bin.used, size: bin.size }));
}

/**
 * Greedy packing with a one-step lookahead.
 *
 * For every loop we either extend an already opened coil (smallest growth) or
 * open a new one: in that case each available size is filled with the largest
 * remaining loops and the size leaving the least leftover wins.
 */
export function packGreedy(
  lengthsMm: number[],
  order: number[],
  sizesMm: number[],
  maxSizeMm: number,
): Bin[] {
  const bins: Bin[] = [];
  const placed = new Uint8Array(lengthsMm.length);

  for (const idx of order) {
    if (placed[idx]) continue;
    const len = lengthsMm[idx];

    // ── Option A: grow an existing coil ────────────────────────────────────
    let bestBin = -1;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (let b = 0; b < bins.length; b++) {
      const bin = bins[b];
      const nextUsed = bin.used + len;
      if (nextUsed > maxSizeMm) continue;
      const nextSize = fitSize(nextUsed, sizesMm);
      if (nextSize < 0) continue;
      const delta = nextSize - bin.size;
      if (delta < bestDelta) {
        bestBin = b;
        bestDelta = delta;
      }
    }

    // ── Option B: open a new coil (with lookahead) ─────────────────────────
    let chosenSize = -1;
    let chosenExtras: number[] = [];
    let chosenLeftover = Number.POSITIVE_INFINITY;

    for (const size of sizesMm) {
      if (size < len) continue;
      let remaining = size - len;
      const extras: number[] = [];
      for (const candidate of order) {
        if (candidate === idx || placed[candidate]) continue;
        const candidateLength = lengthsMm[candidate];
        if (candidateLength <= remaining) {
          remaining -= candidateLength;
          extras.push(candidate);
        }
      }
      // Leftover of the new coil is what it costs us — pick the smallest.
      if (remaining < chosenLeftover) {
        chosenLeftover = remaining;
        chosenSize = size;
        chosenExtras = extras;
      }
    }

    if (bestBin >= 0 && bestDelta <= chosenSize) {
      const bin = bins[bestBin];
      bin.items.push(idx);
      bin.used += len;
      bin.size = fitSize(bin.used, sizesMm);
      placed[idx] = 1;
      continue;
    }

    if (chosenSize < 0) {
      // Validated upstream: every loop fits into the largest coil.
      continue;
    }

    let used = len;
    for (const extra of chosenExtras) used += lengthsMm[extra];
    bins.push({ items: [idx, ...chosenExtras], used, size: chosenSize });
    placed[idx] = 1;
    for (const extra of chosenExtras) placed[extra] = 1;
  }

  return bins;
}

// ── Local search ───────────────────────────────────────────────────────────
//
// Four neighbourhoods are explored; every accepted move strictly improves the
// lexicographic score, so the loop always terminates:
//   move  — shift one loop to another coil;
//   swap  — exchange two loops between coils;
//   merge — combine two coils into a single one;
//   split — cut one coil into two when that is cheaper.

function rebuild(bins: Bin[], lengthsMm: number[], sizesMm: number[]): Bin[] {
  const cleaned = bins
    .filter((bin) => bin.items.length > 0)
    .map((bin) => ({ items: bin.items, used: 0, size: bin.size }));
  return normalizeBins(cleaned, lengthsMm, sizesMm);
}

function tryMove(
  bins: Bin[],
  lengthsMm: number[],
  sizesMm: number[],
  from: number,
  position: number,
  to: number,
): Bin[] | null {
  const maxSize = sizesMm[sizesMm.length - 1];
  const item = bins[from].items[position];
  if (bins[to].used + lengthsMm[item] > maxSize) return null;

  const next = bins.map((bin, index) => {
    if (index === from) {
      return { items: bin.items.filter((_, k) => k !== position), used: 0, size: bin.size };
    }
    if (index === to) {
      return { items: [...bin.items, item], used: 0, size: bin.size };
    }
    return { items: bin.items, used: 0, size: bin.size };
  });
  return rebuild(next, lengthsMm, sizesMm);
}

function trySwap(
  bins: Bin[],
  lengthsMm: number[],
  sizesMm: number[],
  first: number,
  firstPosition: number,
  second: number,
  secondPosition: number,
): Bin[] | null {
  const maxSize = sizesMm[sizesMm.length - 1];
  const itemA = bins[first].items[firstPosition];
  const itemB = bins[second].items[secondPosition];

  if (bins[first].used - lengthsMm[itemA] + lengthsMm[itemB] > maxSize) return null;
  if (bins[second].used - lengthsMm[itemB] + lengthsMm[itemA] > maxSize) return null;

  const next = bins.map((bin, index) => {
    if (index === first) {
      const items = [...bin.items];
      items[firstPosition] = itemB;
      return { items, used: 0, size: bin.size };
    }
    if (index === second) {
      const items = [...bin.items];
      items[secondPosition] = itemA;
      return { items, used: 0, size: bin.size };
    }
    return { items: bin.items, used: 0, size: bin.size };
  });
  return rebuild(next, lengthsMm, sizesMm);
}

function tryMerge(
  bins: Bin[],
  lengthsMm: number[],
  sizesMm: number[],
  first: number,
  second: number,
): Bin[] | null {
  const maxSize = sizesMm[sizesMm.length - 1];
  if (bins[first].used + bins[second].used > maxSize) return null;

  const next = bins
    .filter((_, index) => index !== first && index !== second)
    .map((bin) => ({ items: bin.items, used: 0, size: bin.size }));
  next.push({
    items: [...bins[first].items, ...bins[second].items],
    used: 0,
    size: 0,
  });
  return rebuild(next, lengthsMm, sizesMm);
}

/** Split enumeration is capped so the seed never freezes on a large coil. */
const SPLIT_ITEM_CAP = 10;

function trySplit(
  bins: Bin[],
  lengthsMm: number[],
  sizesMm: number[],
  index: number,
  currentScore: Score,
): Bin[] | null {
  const bin = bins[index];
  const count = bin.items.length;
  if (count < 2 || count > SPLIT_ITEM_CAP) return null;

  let best: Bin[] | null = null;
  let bestScore: Score = currentScore;
  const maskLimit = 1 << (count - 1); // the first item always stays in group A

  for (let mask = 1; mask < maskLimit; mask++) {
    const groupA: number[] = [bin.items[0]];
    const groupB: number[] = [];
    for (let k = 1; k < count; k++) {
      if (mask & (1 << (k - 1))) groupA.push(bin.items[k]);
      else groupB.push(bin.items[k]);
    }

    const next = bins.map((other, i) =>
      i === index
        ? { items: groupA, used: 0, size: other.size }
        : { items: other.items, used: 0, size: other.size },
    );
    next.push({ items: groupB, used: 0, size: 0 });

    const rebuilt = rebuild(next, lengthsMm, sizesMm);
    const score = scoreOf(rebuilt);
    if (isBetter(score, bestScore)) {
      bestScore = score;
      best = rebuilt;
    }
  }
  return best;
}

export function localSearch(
  lengthsMm: number[],
  start: Bin[],
  sizesMm: number[],
  maxRounds = 60,
): Bin[] {
  let current = normalizeBins(cloneBins(start), lengthsMm, sizesMm);
  let currentScore = scoreOf(current);

  for (let round = 0; round < maxRounds; round++) {
    let improved = false;

    // `!improved` is tested before any index is read: accepting a move can
    // shrink `current`, and a stale index would then point past its end.
    for (let a = 0; !improved && a < current.length; a++) {
      for (let i = 0; !improved && i < current[a].items.length; i++) {
        for (let b = 0; !improved && b < current.length; b++) {
          if (a === b) continue;
          const next = tryMove(current, lengthsMm, sizesMm, a, i, b);
          if (next && isBetter(scoreOf(next), currentScore)) {
            current = next;
            currentScore = scoreOf(current);
            improved = true;
          }
        }
      }
    }
    if (improved) continue;

    for (let a = 0; !improved && a < current.length; a++) {
      for (let i = 0; !improved && i < current[a].items.length; i++) {
        for (let b = a + 1; !improved && b < current.length; b++) {
          for (let j = 0; !improved && j < current[b].items.length; j++) {
            const next = trySwap(current, lengthsMm, sizesMm, a, i, b, j);
            if (next && isBetter(scoreOf(next), currentScore)) {
              current = next;
              currentScore = scoreOf(current);
              improved = true;
            }
          }
        }
      }
    }
    if (improved) continue;

    for (let a = 0; !improved && a < current.length; a++) {
      for (let b = a + 1; !improved && b < current.length; b++) {
        const next = tryMerge(current, lengthsMm, sizesMm, a, b);
        if (next && isBetter(scoreOf(next), currentScore)) {
          current = next;
          currentScore = scoreOf(current);
          improved = true;
        }
      }
    }
    if (improved) continue;

    for (let a = 0; !improved && a < current.length; a++) {
      const next = trySplit(current, lengthsMm, sizesMm, a, currentScore);
      if (next) {
        current = next;
        currentScore = scoreOf(current);
        improved = true;
      }
    }
    if (!improved) break;
  }

  return current;
}

export interface SeedSolution {
  bins: Bin[];
  score: Score;
}

/**
 * Builds the initial incumbent for the exact search.
 *
 * This is the only job left of the greedy pipeline: the branch and bound always
 * runs afterwards, so a weak seed can only make the search slower, never the
 * answer worse.
 */
export function buildSeed(
  lengthsMm: number[],
  sizesMm: number[],
  maxSizeMm: number,
): SeedSolution {
  const count = lengthsMm.length;
  const natural = Array.from({ length: count }, (_, i) => i);
  const descending = [...natural].sort((a, b) => lengthsMm[b] - lengthsMm[a] || a - b);
  const ascending = [...natural].sort((a, b) => lengthsMm[a] - lengthsMm[b] || a - b);

  let best: SeedSolution | null = null;
  for (const order of [descending, natural, ascending]) {
    const packed = packGreedy(lengthsMm, order, sizesMm, maxSizeMm);
    const optimized = localSearch(lengthsMm, packed, sizesMm);
    const score = scoreOf(optimized);
    if (!best || isBetter(score, best.score)) {
      best = { bins: optimized, score };
    }
  }

  return best ?? { bins: [], score: { length: 0, count: 0 } };
}
