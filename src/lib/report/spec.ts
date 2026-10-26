import type { CoilPlan } from "@/lib/algorithm/types";

export interface SpecRow {
  size: number;
  count: number;
  /** Purchased length of all coils of this size. */
  length: number;
  /** Pipe actually consumed. */
  used: number;
  waste: number;
  cost: number | null;
}

/** Aggregates the packing plan into purchase rows (one per coil size). */
export function buildSpec(coils: CoilPlan[]): SpecRow[] {
  const bySize = new Map<number, SpecRow>();

  for (const coil of coils) {
    const row = bySize.get(coil.size) ?? {
      size: coil.size,
      count: 0,
      length: 0,
      used: 0,
      waste: 0,
      cost: null,
    };
    row.count += 1;
    row.length += coil.size;
    row.used += coil.used;
    row.waste += coil.waste;
    row.cost = coil.cost === null ? row.cost : (row.cost ?? 0) + coil.cost;
    bySize.set(coil.size, row);
  }

  return [...bySize.values()]
    .map((row) => ({
      ...row,
      length: round2(row.length),
      used: round2(row.used),
      waste: round2(row.waste),
      cost: row.cost === null ? null : round2(row.cost),
    }))
    .sort((a, b) => a.size - b.size);
}

export function specTotals(rows: SpecRow[]): SpecRow {
  return rows.reduce<SpecRow>(
    (acc, row) => ({
      size: 0,
      count: acc.count + row.count,
      length: round2(acc.length + row.length),
      used: round2(acc.used + row.used),
      waste: round2(acc.waste + row.waste),
      cost: row.cost === null ? acc.cost : round2((acc.cost ?? 0) + row.cost),
    }),
    { size: 0, count: 0, length: 0, used: 0, waste: 0, cost: null },
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
