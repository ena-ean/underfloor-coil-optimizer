// =============================================================================
// Coil Calculator — оптимизация упаковки петель тёплого пола в бухты
// Variable-Sized Bin Packing с настраиваемыми размерами бухт
//
// Алгоритм:
//   1. LookAhead Greedy — при создании новой бухты просматривает ВСЕ размеры
//   2. Local Search (быстрый) — move + resize для массовых итераций
//   3. Local Search (глубокий) — move + resize + merge + split для финала
// =============================================================================

export interface LoopInput {
  id: number;
  floor: number;
  originalLength: number;
}

export interface LoopData extends LoopInput {
  adjustedLength: number;
}

export interface CoilResult {
  index: number;
  size: number;
  loops: number[];
  totalLength: number;
  waste: number;
  fillPercent: number;
}

export interface PackingResult {
  coils: CoilResult[];
  totalWaste: number;
  totalUsed: number;
  totalCoilLength: number;
  iterations: number;
  error?: string;
}

export interface OptimizationOptions {
  coilSizes: number[];
  iterations: number;
  reserve: number;
  pricePerMeter?: number;
}

export const COIL_SIZE_OPTIONS = [50, 100, 200, 250, 500, 600] as const;

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------

function prepareLoops(rawLoops: LoopInput[], reserve: number): LoopData[] {
  return rawLoops.map((loop, i) => ({ ...loop, id: i + 1, adjustedLength: loop.originalLength + reserve }));
}

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function smallestCoilSize(length: number, sortedSizes: number[]): number {
  for (const s of sortedSizes) { if (s >= length) return s; }
  return sortedSizes[sortedSizes.length - 1];
}

// ---------------------------------------------------------------------------
// Внутреннее представление
// ---------------------------------------------------------------------------

interface InternalCoil {
  size: number;
  loopIndices: number[];
  usedLength: number;
}

function cw(c: InternalCoil): number { return c.size - c.usedLength; }

function tw(coils: InternalCoil[]): number {
  return coils.reduce((s, c) => s + c.size - c.usedLength, 0);
}

function cloneC(coils: InternalCoil[]): InternalCoil[] {
  return coils.map((c) => ({ size: c.size, loopIndices: [...c.loopIndices], usedLength: c.usedLength }));
}

// ---------------------------------------------------------------------------
// LookAhead Greedy
// ---------------------------------------------------------------------------

type Strategy = "lookahead" | "smallest" | "largest" | "random-size";

function greedyPack(
  loops: LoopData[],
  order: number[],
  sortedSizes: number[],
  strategy: Strategy,
  rng: () => number
): InternalCoil[] {
  const coils: InternalCoil[] = [];
  const placed = new Set<number>();
  const maxSize = sortedSizes[sortedSizes.length - 1];

  for (const idx of order) {
    if (placed.has(idx)) continue;
    const loop = loops[idx];

    // Best-Fit в существующие
    let bi = -1, br = Infinity;
    for (let c = 0; c < coils.length; c++) {
      const rem = coils[c].size - coils[c].usedLength - loop.adjustedLength;
      if (rem >= 0 && rem < br) { br = rem; bi = c; }
    }
    if (bi >= 0) {
      coils[bi].loopIndices.push(idx);
      coils[bi].usedLength += loop.adjustedLength;
      placed.add(idx);
      continue;
    }

    // Новая бухта
    let newSize: number;
    let extras: number[] = [];

    if (strategy === "lookahead") {
      let bestW = Infinity;
      for (const size of sortedSizes) {
        if (size < loop.adjustedLength) continue;
        const cap = size - loop.adjustedLength;
        const cands: number[] = [];
        for (const oi of order) { if (oi !== idx && !placed.has(oi)) cands.push(oi); }
        cands.sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
        let filled = 0, rem = cap;
        const packed: number[] = [];
        for (const ci of cands) {
          if (loops[ci].adjustedLength <= rem) { filled += loops[ci].adjustedLength; packed.push(ci); rem -= loops[ci].adjustedLength; }
        }
        const w = size - loop.adjustedLength - filled;
        if (w < bestW) { bestW = w; newSize = size; extras = packed; }
      }
    } else if (strategy === "smallest") {
      newSize = smallestCoilSize(loop.adjustedLength, sortedSizes);
    } else if (strategy === "largest") {
      newSize = maxSize;
    } else {
      const fit = sortedSizes.filter((s) => s >= loop.adjustedLength);
      newSize = fit[Math.floor(rng() * fit.length)] || maxSize;
    }

    const extraUsed = extras.reduce((s, i) => s + loops[i].adjustedLength, 0);
    coils.push({ size: newSize, loopIndices: [idx, ...extras], usedLength: loop.adjustedLength + extraUsed });
    placed.add(idx);
    extras.forEach((i) => placed.add(i));
  }

  return coils;
}

// ---------------------------------------------------------------------------
// Local Search — быстрая версия (move + resize)
// ---------------------------------------------------------------------------

function localSearchFast(
  loops: LoopData[],
  coils: InternalCoil[],
  sortedSizes: number[],
  maxRounds: number
): InternalCoil[] {
  let cur = cloneC(coils);

  for (let round = 0; round < maxRounds; round++) {
    let improved = false;

    // MOVE
    outer1: for (let i = 0; i < cur.length; i++) {
      if (cur[i].loopIndices.length <= 1) continue;
      for (const li of [...cur[i].loopIndices]) {
        const ll = loops[li].adjustedLength;
        for (let j = 0; j < cur.length; j++) {
          if (i === j || cur[j].usedLength + ll > cur[j].size) continue;
          const oldW = cw(cur[i]) + cw(cur[j]);
          cur[i].usedLength -= ll;
          cur[i].loopIndices = cur[i].loopIndices.filter((x) => x !== li);
          cur[j].usedLength += ll;
          cur[j].loopIndices.push(li);
          const nw = (cur[i].loopIndices.length > 0 ? cw(cur[i]) : 0) + cw(cur[j]);
          if (nw < oldW - 0.01) { improved = true; break outer1; }
          cur[j].usedLength -= ll;
          cur[j].loopIndices = cur[j].loopIndices.filter((x) => x !== li);
          cur[i].usedLength += ll;
          cur[i].loopIndices.push(li);
        }
      }
    }

    if (!improved) {
      cur = cur.filter((c) => c.loopIndices.length > 0);
    }

    // RESIZE
    if (!improved) {
      for (let i = 0; i < cur.length; i++) {
        const oldW = cw(cur[i]);
        let bs = cur[i].size, bw = oldW;
        for (const ns of sortedSizes) {
          if (ns < cur[i].usedLength) continue;
          const w = ns - cur[i].usedLength;
          if (w < bw - 0.01) { bw = w; bs = ns; }
        }
        if (bs !== cur[i].size) { cur[i].size = bs; improved = true; break; }
      }
    }

    cur = cur.filter((c) => c.loopIndices.length > 0);

    // NEW COIL (move loop to new coil of different size)
    if (!improved) {
      const baseW = tw(cur);
      outer2: for (let i = 0; i < cur.length; i++) {
        for (const li of [...cur[i].loopIndices]) {
          const ll = loops[li].adjustedLength;
          const wl = cur[i].usedLength - ll;
          const ocw = cw(cur[i]);
          for (const ns of sortedSizes) {
            if (ns < ll) continue;
            let nw: number;
            if (wl === 0) { nw = baseW - ocw + (ns - ll); }
            else { nw = baseW - ocw + (cur[i].size - wl) + (ns - ll); }
            if (nw < baseW - 0.01) {
              cur[i].usedLength -= ll;
              cur[i].loopIndices = cur[i].loopIndices.filter((x) => x !== li);
              cur.push({ size: ns, loopIndices: [li], usedLength: ll });
              cur = cur.filter((c) => c.loopIndices.length > 0);
              improved = true;
              break outer2;
            }
          }
        }
      }
    }

    if (!improved) break;
  }

  return cur;
}

// ---------------------------------------------------------------------------
// Local Search — глубокий (move + resize + merge + split)
// ---------------------------------------------------------------------------

function localSearchDeep(
  loops: LoopData[],
  coils: InternalCoil[],
  sortedSizes: number[],
  maxRounds: number
): InternalCoil[] {
  let cur = cloneC(coils);

  for (let round = 0; round < maxRounds; round++) {
    let improved = false;

    // 1. MOVE
    outerM: for (let i = 0; i < cur.length; i++) {
      if (cur[i].loopIndices.length <= 1) continue;
      for (const li of [...cur[i].loopIndices]) {
        const ll = loops[li].adjustedLength;
        for (let j = 0; j < cur.length; j++) {
          if (i === j || cur[j].usedLength + ll > cur[j].size) continue;
          const oldW = cw(cur[i]) + cw(cur[j]);
          cur[i].usedLength -= ll;
          cur[i].loopIndices = cur[i].loopIndices.filter((x) => x !== li);
          cur[j].usedLength += ll;
          cur[j].loopIndices.push(li);
          const nw = (cur[i].loopIndices.length > 0 ? cw(cur[i]) : 0) + cw(cur[j]);
          if (nw < oldW - 0.01) { improved = true; break outerM; }
          cur[j].usedLength -= ll;
          cur[j].loopIndices = cur[j].loopIndices.filter((x) => x !== li);
          cur[i].usedLength += ll;
          cur[i].loopIndices.push(li);
        }
      }
    }
    if (improved) { cur = cur.filter((c) => c.loopIndices.length > 0); continue; }

    // 2. RESIZE
    for (let i = 0; i < cur.length; i++) {
      const oldW = cw(cur[i]);
      let bs = cur[i].size, bw = oldW;
      for (const ns of sortedSizes) {
        if (ns < cur[i].usedLength) continue;
        const w = ns - cur[i].usedLength;
        if (w < bw - 0.01) { bw = w; bs = ns; }
      }
      if (bs !== cur[i].size) { cur[i].size = bs; improved = true; break; }
    }
    if (improved) continue;

    // 3. NEW COIL
    {
      const baseW = tw(cur);
      outerN: for (let i = 0; i < cur.length; i++) {
        for (const li of [...cur[i].loopIndices]) {
          const ll = loops[li].adjustedLength;
          const wl = cur[i].usedLength - ll;
          const ocw = cw(cur[i]);
          for (const ns of sortedSizes) {
            if (ns < ll) continue;
            let nw: number;
            if (wl === 0) nw = baseW - ocw + (ns - ll);
            else nw = baseW - ocw + (cur[i].size - wl) + (ns - ll);
            if (nw < baseW - 0.01) {
              cur[i].usedLength -= ll;
              cur[i].loopIndices = cur[i].loopIndices.filter((x) => x !== li);
              cur.push({ size: ns, loopIndices: [li], usedLength: ll });
              cur = cur.filter((c) => c.loopIndices.length > 0);
              improved = true;
              break outerN;
            }
          }
        }
      }
      if (improved) continue;
    }

    // 4. MERGE
    outerG: for (let i = 0; i < cur.length; i++) {
      for (let j = i + 1; j < cur.length; j++) {
        const cu = cur[i].usedLength + cur[j].usedLength;
        const oldW = cw(cur[i]) + cw(cur[j]);
        let bms = -1, bmw = Infinity;
        for (const s of sortedSizes) { if (s >= cu && s - cu < bmw) { bmw = s - cu; bms = s; } }
        if (bms > 0 && bmw < oldW - 0.01) {
          cur.push({ size: bms, loopIndices: [...cur[i].loopIndices, ...cur[j].loopIndices], usedLength: cu });
          cur = cur.filter((_, k) => k !== i && k !== j);
          improved = true;
          break outerG;
        }
      }
    }
    if (improved) continue;

    // 5. SPLIT (только бухты с ≤8 петель)
    outerS: for (let i = 0; i < cur.length; i++) {
      const n = cur[i].loopIndices.length;
      if (n < 2 || n > 8) continue;
      const cl = cur[i].loopIndices;
      const oldW = cw(cur[i]);
      for (let mask = 1; mask < (1 << n) - 1; mask++) {
        const g1: number[] = [], g2: number[] = [];
        for (let b = 0; b < n; b++) { if (mask & (1 << b)) g1.push(cl[b]); else g2.push(cl[b]); }
        const u1 = g1.reduce((s, idx) => s + loops[idx].adjustedLength, 0);
        const u2 = g2.reduce((s, idx) => s + loops[idx].adjustedLength, 0);
        const s1 = smallestCoilSize(u1, sortedSizes);
        const s2 = smallestCoilSize(u2, sortedSizes);
        if (s1 < u1 || s2 < u2) continue;
        const nw = s1 - u1 + s2 - u2;
        if (nw < oldW - 0.01) {
          cur.splice(i, 1, { size: s1, loopIndices: g1, usedLength: u1 }, { size: s2, loopIndices: g2, usedLength: u2 });
          improved = true;
          break outerS;
        }
      }
    }

    if (!improved) break;
  }

  return cur;
}

// ---------------------------------------------------------------------------
// Основной оптимизатор
// ---------------------------------------------------------------------------

export function optimizeCoilPacking(
  rawLoops: LoopInput[],
  options: OptimizationOptions
): PackingResult {
  const { coilSizes, iterations, reserve } = options;
  const sortedSizes = [...new Set(coilSizes)].sort((a, b) => a - b);

  if (sortedSizes.length === 0) {
    return { coils: [], totalWaste: 0, totalUsed: 0, totalCoilLength: 0, iterations, error: "Не выбраны размеры бухт" };
  }

  const loops = prepareLoops(rawLoops, reserve);
  const maxSize = sortedSizes[sortedSizes.length - 1];

  for (const loop of loops) {
    if (loop.adjustedLength > maxSize) {
      return { coils: [], totalWaste: 0, totalUsed: 0, totalCoilLength: 0, iterations,
        error: `Контур К${loop.id} (${loop.adjustedLength} м с запасом) не помещается в самую большую бухту (${maxSize} м)` };
    }
  }

  if (loops.length === 0) {
    return { coils: [], totalWaste: 0, totalUsed: 0, totalCoilLength: 0, iterations, error: "Нет петель для расчёта" };
  }

  const n = loops.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  let bestCoils: InternalCoil[] = [];
  let bestWaste = Infinity;

  let seed = 42;
  function rng(): number {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  // Детерминированные стратегии — с глубоким local search
  const sortFns: Array<() => number[]> = [
    () => [...indices].sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength),
    () => [...indices].sort((a, b) => loops[a].adjustedLength - loops[b].adjustedLength),
    () => [...indices].sort((a, b) => loops[b].originalLength - loops[a].originalLength),
    () => {
      const f1 = indices.filter((i) => loops[i].floor === 1).sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
      const f2 = indices.filter((i) => loops[i].floor === 2).sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
      return [...f1, ...f2];
    },
    () => {
      const f2 = indices.filter((i) => loops[i].floor === 2).sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
      const f1 = indices.filter((i) => loops[i].floor === 1).sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
      return [...f2, ...f1];
    },
  ];

  const strategies: Strategy[] = ["lookahead", "smallest", "random-size"];

  for (const sortFn of sortFns) {
    for (const strategy of strategies) {
      const coils = greedyPack(loops, sortFn(), sortedSizes, strategy, rng);
      const improved = localSearchDeep(loops, coils, sortedSizes, 80);
      const w = tw(improved);
      if (w < bestWaste) { bestWaste = w; bestCoils = improved; }
    }
  }

  // Случайные итерации — быстрый local search
  for (let iter = 0; iter < iterations; iter++) {
    const order = shuffleArray(indices, rng);
    const strategy: Strategy = rng() < 0.75 ? "lookahead" : "random-size";
    const coils = greedyPack(loops, order, sortedSizes, strategy, rng);
    const improved = localSearchFast(loops, coils, sortedSizes, 8);
    const w = tw(improved);
    if (w < bestWaste) { bestWaste = w; bestCoils = improved; }
  }

  // Финальный глубокий local search
  bestCoils = localSearchDeep(loops, bestCoils, sortedSizes, 200);

  // Формируем результат
  const sortedResult = [...bestCoils].sort((a, b) => {
    if (a.size !== b.size) return b.size - a.size;
    return a.loopIndices[0] - b.loopIndices[0];
  });

  const coils: CoilResult[] = sortedResult.map((c, i) => ({
    index: i + 1,
    size: c.size,
    loops: c.loopIndices.sort((a, b) => a - b),
    totalLength: c.usedLength,
    waste: c.size - c.usedLength,
    fillPercent: Math.round((c.usedLength / c.size) * 1000) / 10,
  }));

  const totalUsed = coils.reduce((s, c) => s + c.totalLength, 0);
  const totalCoilLen = coils.reduce((s, c) => s + c.size, 0);

  return {
    coils,
    totalWaste: totalCoilLen - totalUsed,
    totalUsed,
    totalCoilLength: totalCoilLen,
    iterations: iterations + sortFns.length * strategies.length,
  };
}

// ---------------------------------------------------------------------------
// Стоимость
// ---------------------------------------------------------------------------

export function calcCoilCost(coils: CoilResult[], pricePerMeter: number): { perCoil: number[]; total: number } {
  const perCoil = coils.map((c) => Math.round(c.size * pricePerMeter * 100) / 100);
  const total = perCoil.reduce((s, v) => s + v, 0);
  return { perCoil, total: Math.round(total * 100) / 100 };
}
