// =============================================================================
// Coil Calculator — оптимизация упаковки петель тёплого пола в бухты
// Variable-Sized Bin Packing с настраиваемыми размерами бухт
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
}

/** Все доступные размеры бухт для UI */
export const COIL_SIZE_OPTIONS = [50, 100, 200, 250, 500, 600];

// ---------------------------------------------------------------------------
// Подготовка данных
// ---------------------------------------------------------------------------

function prepareLoops(rawLoops: LoopInput[], reserve: number): LoopData[] {
  return rawLoops.map((loop, i) => ({
    ...loop,
    id: i + 1,
    adjustedLength: loop.originalLength + reserve,
  }));
}

// ---------------------------------------------------------------------------
// Утилиты
// ---------------------------------------------------------------------------

function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function smallestCoilSize(
  length: number,
  sortedSizes: number[]
): number {
  for (const s of sortedSizes) {
    if (s >= length) return s;
  }
  return sortedSizes[sortedSizes.length - 1];
}

// ---------------------------------------------------------------------------
// Жадная упаковка
// ---------------------------------------------------------------------------

interface InternalCoil {
  size: number;
  loopIndices: number[];
  usedLength: number;
}

function greedyPack(
  loops: LoopData[],
  order: number[],
  sortedSizes: number[],
  preferLargeCoil: boolean
): InternalCoil[] {
  const maxSize = sortedSizes[sortedSizes.length - 1];
  const coils: InternalCoil[] = [];

  for (const idx of order) {
    const loop = loops[idx];

    let bestCoilIdx = -1;
    let bestRemaining = Infinity;

    for (let c = 0; c < coils.length; c++) {
      const remaining = coils[c].size - coils[c].usedLength - loop.adjustedLength;
      if (remaining >= 0 && remaining < bestRemaining) {
        bestRemaining = remaining;
        bestCoilIdx = c;
      }
    }

    if (bestCoilIdx >= 0) {
      coils[bestCoilIdx].loopIndices.push(idx);
      coils[bestCoilIdx].usedLength += loop.adjustedLength;
    } else {
      const newSize = preferLargeCoil ? maxSize : smallestCoilSize(loop.adjustedLength, sortedSizes);
      coils.push({
        size: newSize,
        loopIndices: [idx],
        usedLength: loop.adjustedLength,
      });
    }
  }

  return coils;
}

// ---------------------------------------------------------------------------
// Локальный поиск
// ---------------------------------------------------------------------------

function coilWaste(coil: InternalCoil): number {
  return coil.size - coil.usedLength;
}

function totalWaste(coils: InternalCoil[]): number {
  return coils.reduce((s, c) => s + coilWaste(c), 0);
}

function localSearch(
  loops: LoopData[],
  coils: InternalCoil[],
  sortedSizes: number[],
  maxRounds: number = 50
): InternalCoil[] {
  let current = coils.filter((c) => c.loopIndices.length > 0);
  let improved = true;
  let rounds = 0;

  while (improved && rounds < maxRounds) {
    improved = false;
    rounds++;

    // 1. Перемещение петли в другую существующую бухту
    for (let i = 0; i < current.length; i++) {
      if (current[i].loopIndices.length <= 1) continue;
      for (const loopIdx of [...current[i].loopIndices]) {
        const loopLen = loops[loopIdx].adjustedLength;
        let moved = false;
        for (let j = 0; j < current.length; j++) {
          if (i === j) continue;
          if (current[j].usedLength + loopLen <= current[j].size) {
            const oldWasteI = coilWaste(current[i]);
            const oldWasteJ = coilWaste(current[j]);

            current[i].usedLength -= loopLen;
            current[i].loopIndices = current[i].loopIndices.filter((x) => x !== loopIdx);
            current[j].usedLength += loopLen;
            current[j].loopIndices.push(loopIdx);

            const newCoilI = current[i].loopIndices.length > 0 ? current[i] : null;
            const newWasteI = newCoilI ? coilWaste(newCoilI) : 0;
            const newWasteJ = coilWaste(current[j]);
            const removedWaste = newCoilI ? 0 : (oldWasteI);

            if (newWasteI + newWasteJ - oldWasteI - oldWasteJ - removedWaste < -0.01) {
              improved = true;
              moved = true;
              break;
            } else {
              current[j].usedLength -= loopLen;
              current[j].loopIndices = current[j].loopIndices.filter((x) => x !== loopIdx);
              current[i].usedLength += loopLen;
              current[i].loopIndices.push(loopIdx);
            }
          }
        }
        if (moved) {
          current = current.filter((c) => c.loopIndices.length > 0);
          break;
        }
      }
      if (improved) continue;
    }

    if (improved) {
      current = current.filter((c) => c.loopIndices.length > 0);
      continue;
    }

    // 2. Перемещение петли в новую бухту другого размера
    const baseW = totalWaste(current);
    let found = false;
    for (let i = 0; i < current.length && !found; i++) {
      for (const loopIdx of [...current[i].loopIndices]) {
        const loopLen = loops[loopIdx].adjustedLength;
        for (const newSize of sortedSizes) {
          if (newSize < loopLen) continue;
          const withoutLoop = current[i].usedLength - loopLen;
          let newTotalWaste: number;
          if (withoutLoop === 0) {
            newTotalWaste = baseW - coilWaste(current[i]) + (newSize - loopLen);
          } else {
            newTotalWaste =
              baseW -
              coilWaste(current[i]) +
              (current[i].size - withoutLoop) +
              (newSize - loopLen);
          }
          if (newTotalWaste < baseW - 0.01) {
            current[i].usedLength -= loopLen;
            current[i].loopIndices = current[i].loopIndices.filter((x) => x !== loopIdx);
            current.push({
              size: newSize,
              loopIndices: [loopIdx],
              usedLength: loopLen,
            });
            current = current.filter((c) => c.loopIndices.length > 0);
            improved = true;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    current = current.filter((c) => c.loopIndices.length > 0);
  }

  return current;
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
      return {
        coils: [],
        totalWaste: 0,
        totalUsed: 0,
        totalCoilLength: 0,
        iterations,
        error: `Контур К${loop.id} (${loop.adjustedLength} м с запасом) не помещается в самую большую бухту (${maxSize} м)`,
      };
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

  // Детерминированные стратегии
  const sortStrategies: Array<() => number[]> = [
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
    () => {
      const f1 = indices.filter((i) => loops[i].floor === 1).sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
      const f2 = indices.filter((i) => loops[i].floor === 2).sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
      const result: number[] = [];
      let i1 = 0, i2 = 0;
      while (i1 < f1.length || i2 < f2.length) {
        if (i2 < f2.length) result.push(f2[i2++]);
        if (i1 < f1.length) result.push(f1[i1++]);
      }
      return result;
    },
  ];

  for (const getOrder of sortStrategies) {
    for (const preferLarge of [false, true]) {
      const coils = greedyPack(loops, getOrder(), sortedSizes, preferLarge);
      const improved = localSearch(loops, coils, sortedSizes);
      const w = totalWaste(improved);
      if (w < bestWaste) {
        bestWaste = w;
        bestCoils = improved;
      }
    }
  }

  // Случайные перестановки
  for (let iter = 0; iter < iterations; iter++) {
    const order = shuffleArray(indices, rng);
    const preferLarge = rng() < 0.3;
    const coils = greedyPack(loops, order, sortedSizes, preferLarge);
    const improved = localSearch(loops, coils, sortedSizes, 15);
    const w = totalWaste(improved);
    if (w < bestWaste) {
      bestWaste = w;
      bestCoils = improved;
    }
  }

  // Финальный локальный поиск
  bestCoils = localSearch(loops, bestCoils, sortedSizes, 200);

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
    iterations: iterations + sortStrategies.length * 2,
  };
}
