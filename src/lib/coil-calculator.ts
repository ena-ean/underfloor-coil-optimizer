// =============================================================================
// Coil Calculator — оптимизация упаковки петель тёплого пола в бухты
// Задача: Variable-Sized Bin Packing с размерами бухт 50, 100, 200 м
// Цель: минимизировать суммарный остаток (waste)
// =============================================================================

export interface LoopInput {
  id: number;
  floor: number;
  originalLength: number;
}

export interface LoopData extends LoopInput {
  adjustedLength: number; // +2 м на запас
}

export interface CoilResult {
  index: number;
  size: number;
  loops: number[]; // indices into loops array
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
}

const COIL_SIZES = [50, 100, 200] as const;
const RESERVE = 2; // метров запаса на подключение

// ---------------------------------------------------------------------------
// Подготовка данных
// ---------------------------------------------------------------------------

export function prepareLoops(rawLoops: LoopInput[]): LoopData[] {
  return rawLoops.map((loop) => ({
    ...loop,
    adjustedLength: loop.originalLength + RESERVE,
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

function smallestCoilSize(length: number): number {
  for (const s of COIL_SIZES) {
    if (s >= length) return s;
  }
  return 200; // fallback (не должно случиться)
}

// ---------------------------------------------------------------------------
// Жадная упаковка (Best-Fit Decreasing с предпочтением минимальной бухты)
// ---------------------------------------------------------------------------

interface InternalCoil {
  size: number;
  loopIndices: number[];
  usedLength: number;
}

function greedyPack(
  loops: LoopData[],
  order: number[],
  preferLargeCoil: boolean = false
): InternalCoil[] {
  const coils: InternalCoil[] = [];

  for (const idx of order) {
    const loop = loops[idx];

    // Ищем лучший существующий контейнер (минимальный остаток)
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
      // Создаём новую бухту
      let newSize: number;
      if (preferLargeCoil) {
        // Предпочитаем 200м бухты — можно упаковать больше петель
        newSize = 200;
      } else {
        newSize = smallestCoilSize(loop.adjustedLength);
      }
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
// Локальный поиск — улучшаем упаковку перемещениями и обменами
// ---------------------------------------------------------------------------

function coilWaste(coil: InternalCoil): number {
  return coil.size - coil.usedLength;
}

function totalWaste(coils: InternalCoil[]): number {
  return coils.reduce((s, c) => s + coilWaste(c), 0);
}

function totalCoilLength(coils: InternalCoil[]): number {
  return coils.reduce((s, c) => s + c.size, 0);
}

function localSearch(
  loops: LoopData[],
  coils: InternalCoil[],
  maxRounds: number = 50
): InternalCoil[] {
  // Удаляем пустые бухты
  let current = coils.filter((c) => c.loopIndices.length > 0);
  let improved = true;
  let rounds = 0;

  while (improved && rounds < maxRounds) {
    improved = false;
    rounds++;

    // 1. Попытка переместить петлю в другую существующую бухту
    for (let i = 0; i < current.length; i++) {
      if (current[i].loopIndices.length <= 1) continue; // не опустошать до 0
      for (const loopIdx of current[i].loopIndices) {
        const loopLen = loops[loopIdx].adjustedLength;
        for (let j = 0; j < current.length; j++) {
          if (i === j) continue;
          if (current[j].usedLength + loopLen <= current[j].size) {
            const oldWasteI = coilWaste(current[i]);
            const oldWasteJ = coilWaste(current[j]);
            // Убираем из i
            current[i].usedLength -= loopLen;
            current[i].loopIndices = current[i].loopIndices.filter(
              (x) => x !== loopIdx
            );
            // Добавляем в j
            current[j].usedLength += loopLen;
            current[j].loopIndices.push(loopIdx);

            const newWasteI =
              current[i].loopIndices.length > 0 ? coilWaste(current[i]) : 0;
            const newWasteJ = coilWaste(current[j]);
            // Если добавили пустую бухту, она больше не вносит waste
            const delta =
              newWasteI + newWasteJ - oldWasteI - oldWasteJ -
              (current[i].loopIndices.length === 0 ? coilWaste({ size: current[i].size, usedLength: 0, loopIndices: [] }) : 0);

            if (delta < -0.01) {
              improved = true;
            } else {
              // Откат
              current[j].usedLength -= loopLen;
              current[j].loopIndices = current[j].loopIndices.filter(
                (x) => x !== loopIdx
              );
              current[i].usedLength += loopLen;
              current[i].loopIndices.push(loopIdx);
            }
          }
        }
      }
    }

    // Удаляем опустошённые бухты
    current = current.filter((c) => c.loopIndices.length > 0);

    // 2. Попытка переместить петлю в НОВУЮ бухту другого размера
    const baseWaste = totalWaste(current);
    for (let i = 0; i < current.length; i++) {
      for (const loopIdx of [...current[i].loopIndices]) {
        const loopLen = loops[loopIdx].adjustedLength;
        for (const newSize of COIL_SIZES) {
          if (newSize < loopLen) continue;
          // Проверяем: убираем петлю, возможно удаляем бухту
          const withoutLoop = current[i].usedLength - loopLen;
          const oldCoilWaste = coilWaste(current[i]);

          let newTotalWaste: number;
          if (withoutLoop === 0) {
            // Бухта удаляется
            newTotalWaste =
              baseWaste - oldCoilWaste + (newSize - loopLen);
          } else {
            newTotalWaste =
              baseWaste - oldCoilWaste + (current[i].size - withoutLoop) + (newSize - loopLen);
          }

          if (newTotalWaste < baseWaste - 0.01) {
            // Применяем
            current[i].usedLength -= loopLen;
            current[i].loopIndices = current[i].loopIndices.filter(
              (x) => x !== loopIdx
            );
            current.push({
              size: newSize,
              loopIndices: [loopIdx],
              usedLength: loopLen,
            });
            current = current.filter((c) => c.loopIndices.length > 0);
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
      if (improved) break;
    }
    current = current.filter((c) => c.loopIndices.length > 0);
  }

  return current;
}

// ---------------------------------------------------------------------------
// Основной оптимизатор — множественные итерации с разными стратегиями
// ---------------------------------------------------------------------------

export function optimizeCoilPacking(rawLoops: LoopInput[]): PackingResult {
  const loops = prepareLoops(rawLoops);
  const n = loops.length;
  const indices = Array.from({ length: n }, (_, i) => i);

  let bestCoils: InternalCoil[] = [];
  let bestWaste = Infinity;
  const totalIterations = 80_000;

  // Simple seeded RNG for reproducibility within run
  let seed = 42;
  function rng(): number {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  }

  // Стратегии сортировки
  const sortStrategies: Array<{ name: string; order: () => number[] }> = [
    {
      name: "desc",
      order: () => [...indices].sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength),
    },
    {
      name: "asc",
      order: () => [...indices].sort((a, b) => loops[a].adjustedLength - loops[b].adjustedLength),
    },
    {
      name: "desc-original",
      order: () => [...indices].sort((a, b) => loops[b].originalLength - loops[a].originalLength),
    },
    {
      name: "floor-1-then-desc",
      order: () => {
        const f1 = indices.filter((i) => loops[i].floor === 1).sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
        const f2 = indices.filter((i) => loops[i].floor === 2).sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
        return [...f1, ...f2];
      },
    },
    {
      name: "floor-2-then-desc",
      order: () => {
        const f2 = indices.filter((i) => loops[i].floor === 2).sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
        const f1 = indices.filter((i) => loops[i].floor === 1).sort((a, b) => loops[b].adjustedLength - loops[a].adjustedLength);
        return [...f2, ...f1];
      },
    },
    {
      name: "alternating-floors",
      order: () => {
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
    },
  ];

  // Запускаем детерминированные стратегии
  for (const strategy of sortStrategies) {
    for (const preferLarge of [false, true]) {
      const coils = greedyPack(loops, strategy.order(), preferLarge);
      const improved = localSearch(loops, coils);
      const w = totalWaste(improved);
      if (w < bestWaste) {
        bestWaste = w;
        bestCoils = improved;
      }
    }
  }

  // Случайные перестановки
  for (let iter = 0; iter < totalIterations; iter++) {
    const order = shuffleArray(indices, rng);
    const preferLarge = rng() < 0.3; // 30% шанс предпочитать 200м
    const coils = greedyPack(loops, order, preferLarge);
    const improved = localSearch(loops, coils, 20); // меньше раундов для скорости

    const w = totalWaste(improved);
    if (w < bestWaste) {
      bestWaste = w;
      bestCoils = improved;
    }
  }

  // Финальный локальный поиск с максимальными раундами
  bestCoils = localSearch(loops, bestCoils, 200);

  // Формируем результат
  const sortedCoils = [...bestCoils].sort((a, b) => {
    if (a.size !== b.size) return b.size - a.size;
    return a.loopIndices[0] - b.loopIndices[0];
  });

  const coils: CoilResult[] = sortedCoils.map((c, i) => ({
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
    iterations: totalIterations + sortStrategies.length * 2,
  };
}

// ---------------------------------------------------------------------------
// Вспомогательные функции для отображения
// ---------------------------------------------------------------------------

export function getFloorSummary(loops: LoopInput[], result: PackingResult) {
  const floorLoops = {
    1: loops.filter((l) => l.floor === 1),
    2: loops.filter((l) => l.floor === 2),
  };

  const floorCoils: Record<number, CoilResult[]> = { 1: [], 2: [] };

  for (const coil of result.coils) {
    const hasFloor1 = coil.loops.some((idx) => loops[idx].floor === 1);
    const hasFloor2 = coil.loops.some((idx) => loops[idx].floor === 2);
    if (hasFloor1 && !hasFloor2) {
      floorCoils[1].push(coil);
    } else if (hasFloor2 && !hasFloor1) {
      floorCoils[2].push(coil);
    } else {
      // Бухта с петлями с обоих этажей — назначаем по多数
      const f1Count = coil.loops.filter((idx) => loops[idx].floor === 1).length;
      const f2Count = coil.loops.filter((idx) => loops[idx].floor === 2).length;
      floorCoils[f1Count >= f2Count ? 1 : 2].push(coil);
    }
  }

  return { floorLoops, floorCoils };
}

export function formatMeters(m: number): string {
  return `${m} м`;
}
