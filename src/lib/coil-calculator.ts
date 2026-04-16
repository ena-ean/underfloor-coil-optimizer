// =============================================================================
// Coil Calculator — детерминированный алгоритм упаковки петель в бухты
//
// Алгоритм (без случайных итераций, ~2мс):
//   1. LookAhead Greedy — при создании новой бухты проверяет ВСЕ размеры
//      и выбирает тот, в который влезет больше всего последующих петель
//   2. Local Search (resize → merge → split) — доводит до оптимума
// =============================================================================

// ---------------------------------------------------------------------------
// Типы
// ---------------------------------------------------------------------------

export interface LoopInput {
  id: number;
  floor: number;
  originalLength: number;
}

export interface CoilResult {
  index: number;
  size: number;
  loops: number[];   // индексы в массиве loops
  totalLength: number;
  waste: number;
  fillPercent: number;
}

export interface PackingResult {
  coils: CoilResult[];
  totalWaste: number;
  totalUsed: number;
  totalCoilLength: number;
  error?: string;
}

export interface OptimizationOptions {
  coilSizes: number[];
  reserve: number;
  pricePerMeter?: number;
}

export const COIL_SIZE_OPTIONS = [50, 100, 200, 250, 500, 600] as const;

// ---------------------------------------------------------------------------
// Ядро алгоритма
// ---------------------------------------------------------------------------

interface Bin {
  size: number;
  items: number[];
  used: number;
}

/** Минимальный размер бухты, в который помещается length. Возвращает -1 если не влезает ни в один размер. */
function fitSize(length: number, sizes: number[]): number {
  for (const s of sizes) if (s >= length) return s;
  return -1;
}

/** Общий остаток по набору бухт */
function totalWaste(bins: Bin[]): number {
  return bins.reduce((s, b) => s + b.size - b.used, 0);
}

/** Глубокая копия */
function cloneBins(bins: Bin[]): Bin[] {
  return bins.map((b) => ({ size: b.size, items: [...b.items], used: b.used }));
}

// ---------------------------------------------------------------------------
// 1. LookAhead Greedy
// ---------------------------------------------------------------------------

function packLookAhead(lengths: number[], order: number[], sizes: number[]): Bin[] {
  const bins: Bin[] = [];
  const placed = new Set<number>();

  for (const idx of order) {
    if (placed.has(idx)) continue;
    const len = lengths[idx];

    // Best-Fit в существующие бухты
    let bestBin = -1;
    let bestRem = Infinity;
    for (let b = 0; b < bins.length; b++) {
      const rem = bins[b].size - bins[b].used - len;
      if (rem >= 0 && rem < bestRem) {
        bestRem = rem;
        bestBin = b;
      }
    }
    if (bestBin >= 0) {
      bins[bestBin].items.push(idx);
      bins[bestBin].used += len;
      placed.add(idx);
      continue;
    }

    // Создаём новую бухту — выбираем размер с минимальным остатком
    let chosenSize = sizes[sizes.length - 1];
    let chosenExtras: number[] = [];
    let minWaste = Infinity;

    for (const size of sizes) {
      if (size < len) continue;
      const capacity = size - len;

      // Жадная упаковка оставшихся петель
      const candidates = order.filter((o) => o !== idx && !placed.has(o))
        .sort((a, b) => lengths[b] - lengths[a]);

      let filled = 0;
      let remaining = capacity;
      const packed: number[] = [];
      for (const c of candidates) {
        if (lengths[c] <= remaining) {
          filled += lengths[c];
          packed.push(c);
          remaining -= lengths[c];
        }
      }

      const waste = size - len - filled;
      if (waste < minWaste) {
        minWaste = waste;
        chosenSize = size;
        chosenExtras = packed;
      }
    }

    const extrasUsed = chosenExtras.reduce((s, i) => s + lengths[i], 0);
    bins.push({
      size: chosenSize,
      items: [idx, ...chosenExtras],
      used: len + extrasUsed,
    });
    placed.add(idx);
    chosenExtras.forEach((i) => placed.add(i));
  }

  return bins;
}

// ---------------------------------------------------------------------------
// 2. Local Search: resize → merge → split → repeat
// ---------------------------------------------------------------------------

function localSearch(lengths: number[], initial: Bin[], sizes: number[]): Bin[] {
  let bins = cloneBins(initial);

  for (let round = 0; round < 200; round++) {
    let improved = false;

    // Resize: подобрать минимальный размер для каждой бухты
    for (const bin of bins) {
      const ns = fitSize(bin.used, sizes);
      if (ns < 0 || ns >= bin.size) continue; // нет подходящего размера или уже минимальный
      const newWaste = ns - bin.used;
      const oldWaste = bin.size - bin.used;
      if (newWaste < oldWaste - 0.01) {
        bin.size = ns;
        improved = true;
      }
    }
    if (improved) continue;

    // Merge: объединить две бухты, если поместятся в одну меньшую
    let merged = false;
    for (let i = 0; i < bins.length && !merged; i++) {
      for (let j = i + 1; j < bins.length && !merged; j++) {
        const combined = bins[i].used + bins[j].used;
        const oldWaste = (bins[i].size - bins[i].used) + (bins[j].size - bins[j].used);
        const newSize = fitSize(combined, sizes);
        if (newSize < 0) continue; // не влезает ни в один размер
        const newWaste = newSize - combined;
        if (newWaste < oldWaste - 0.01) {
          bins.push({
            size: newSize,
            items: [...bins[i].items, ...bins[j].items],
            used: combined,
          });
          bins = bins.filter((_, k) => k !== i && k !== j);
          merged = true;
          improved = true;
        }
      }
    }
    if (improved) continue;

    // Move: перенести петлю из одной бухты в другую
    let moved = false;
    for (let i = 0; i < bins.length && !moved; i++) {
      if (bins[i].items.length <= 1) continue;
      for (const item of [...bins[i].items]) {
        const len = lengths[item];
        for (let j = 0; j < bins.length && !moved; j++) {
          if (i === j || bins[j].used + len > bins[j].size) continue;
          const oldW = (bins[i].size - bins[i].used) + (bins[j].size - bins[j].used);
          bins[i].used -= len;
          bins[i].items = bins[i].items.filter((x) => x !== item);
          bins[j].used += len;
          bins[j].items.push(item);
          const newW =
            (bins[i].items.length > 0 ? bins[i].size - bins[i].used : 0) +
            (bins[j].size - bins[j].used);
          if (newW < oldW - 0.01) moved = true;
          else {
            bins[j].used -= len;
            bins[j].items = bins[j].items.filter((x) => x !== item);
            bins[i].used += len;
            bins[i].items.push(item);
          }
        }
      }
    }
    bins = bins.filter((b) => b.items.length > 0);
    if (moved) continue;

    // Split: разделить бухту на две (только ≤10 петель для производительности)
    let split = false;
    for (let i = 0; i < bins.length && !split; i++) {
      const n = bins[i].items.length;
      if (n < 2 || n > 10) continue;
      const oldWaste = bins[i].size - bins[i].used;
      for (let mask = 1; mask < (1 << n) - 1 && !split; mask++) {
        const g1: number[] = [];
        const g2: number[] = [];
        for (let b = 0; b < n; b++) {
          if (mask & (1 << b)) g1.push(bins[i].items[b]);
          else g2.push(bins[i].items[b]);
        }
        const u1 = g1.reduce((s, x) => s + lengths[x], 0);
        const u2 = g2.reduce((s, x) => s + lengths[x], 0);
        const s1 = fitSize(u1, sizes);
        const s2 = fitSize(u2, sizes);
        if (s1 < 0 || s2 < 0) continue; // не влезает ни в один размер
        const newWaste = (s1 - u1) + (s2 - u2);
        if (newWaste < oldWaste - 0.01) {
          bins.splice(i, 1,
            { size: s1, items: g1, used: u1 },
            { size: s2, items: g2, used: u2 },
          );
          split = true;
          improved = true;
        }
      }
    }
    if (!improved) break;
  }

  // Защитная проверка: удалить/разбить невалидные бухты (used > size)
  const validBins: Bin[] = [];
  for (const bin of bins) {
    if (bin.used <= bin.size + 0.01) {
      validBins.push(bin);
    } else {
      // Бухта переполнена — разбиваем на отдельные петли
      for (const item of bin.items) {
        const itemLen = lengths[item];
        const sz = fitSize(itemLen, sizes);
        if (sz > 0) {
          validBins.push({ size: sz, items: [item], used: itemLen });
        }
      }
    }
  }

  return validBins;
}

// ---------------------------------------------------------------------------
// Публичный API
// ---------------------------------------------------------------------------

export function optimizeCoilPacking(
  rawLoops: LoopInput[],
  options: OptimizationOptions
): PackingResult {
  const { coilSizes, reserve } = options;
  const sizes = [...new Set(coilSizes)].sort((a, b) => a - b);

  if (sizes.length === 0) {
    return { coils: [], totalWaste: 0, totalUsed: 0, totalCoilLength: 0, error: "Не выбраны размеры бухт" };
  }

  const lengths = rawLoops.map((l) => l.originalLength + reserve);
  const totalNeeded = lengths.reduce((s, v) => s + v, 0);
  const maxSize = sizes[sizes.length - 1];

  if (rawLoops.length === 0) {
    return { coils: [], totalWaste: 0, totalUsed: 0, totalCoilLength: 0, error: "Нет петель для расчёта" };
  }

  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] > maxSize) {
      return {
        coils: [], totalWaste: 0, totalUsed: 0, totalCoilLength: 0,
        error: `Контур К${i + 1} (${lengths[i]} м с запасом) не помещается в самую большую бухту (${maxSize} м)`,
      };
    }
  }

  const indices = lengths.map((_, i) => i);

  // Пробуем несколько порядков сортировки — берём лучший
  const sortOrders = [
    [...indices].sort((a, b) => lengths[b] - lengths[a]),         // по убыванию длины
    [...indices].sort((a, b) => lengths[a] - lengths[b]),         // по возрастанию
    [...indices],                                                   // оригинальный порядок
  ];

  let bestBins: Bin[] = [];
  let bestWaste = Infinity;

  for (const order of sortOrders) {
    const packed = packLookAhead(lengths, order, sizes);
    const optimized = localSearch(lengths, packed, sizes);
    const w = totalWaste(optimized);
    if (w < bestWaste) {
      bestWaste = w;
      bestBins = optimized;
    }
  }

  // Формируем результат
  const sorted = [...bestBins].sort((a, b) => {
    if (a.size !== b.size) return b.size - a.size;
    return a.items[0] - b.items[0];
  });

  const coils: CoilResult[] = sorted.map((b, i) => ({
    index: i + 1,
    size: b.size,
    loops: b.items.sort((a, c) => a - c),
    totalLength: b.used,
    waste: b.size - b.used,
    fillPercent: Math.round((b.used / b.size) * 1000) / 10,
  }));

  const totalUsed = coils.reduce((s, c) => s + c.totalLength, 0);
  const totalCoilLen = coils.reduce((s, c) => s + c.size, 0);

  return {
    coils,
    totalWaste: totalCoilLen - totalUsed,
    totalUsed,
    totalCoilLength: totalCoilLen,
  };
}

// ---------------------------------------------------------------------------
// Стоимость
// ---------------------------------------------------------------------------

export function calcCoilCost(
  coils: CoilResult[],
  pricePerMeter: number
): { perCoil: number[]; total: number } {
  const perCoil = coils.map((c) => Math.round(c.size * pricePerMeter * 100) / 100);
  const total = perCoil.reduce((s, v) => s + v, 0);
  return { perCoil, total: Math.round(total * 100) / 100 };
}
