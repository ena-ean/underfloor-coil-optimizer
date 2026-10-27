import type { CoilPlan } from "@/lib/algorithm/types";
import { loopRoom } from "@/lib/loop-label";
import type { LoopEntry } from "@/lib/state";

/** Group key for loops the plan does not cover — a safety net, not a real case. */
export const UNASSIGNED_COIL = 0;

export interface CutRow {
  /** Position in the loops array the plan was built from. */
  loopIndex: number;
  /** Loop number as the crew sees it: 1-based. */
  loop: number;
  room: string;
  floor: number;
  /** Design length, metres. */
  design: number;
  /** `design + reserve` — the piece the installer actually measures out. */
  cut: number;
}

export interface CutGroup {
  /** Coil number from the plan, or `UNASSIGNED_COIL`. */
  coil: number;
  size: number;
  used: number;
  waste: number;
  fillPercent: number;
  cost: number | null;
  rows: CutRow[];
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Turns a packing into a per-coil cutting list: one group per purchased coil,
 * each holding the loops cut from it in loop order. This is the single source
 * for the on-site view, the HTML report and the CSV export, so a plumber reads
 * the same numbers everywhere.
 */
export function buildCutPlan(
  loops: LoopEntry[],
  coils: CoilPlan[],
  reserve: number,
): CutGroup[] {
  const coilByLoop = new Map<number, number>();
  for (const coil of coils) {
    for (const index of coil.loopIndexes) coilByLoop.set(index, coil.index);
  }

  const rowsByCoil = new Map<number, CutRow[]>();
  loops.forEach((loop, index) => {
    const coil = coilByLoop.get(index) ?? UNASSIGNED_COIL;
    const row: CutRow = {
      loopIndex: index,
      loop: index + 1,
      room: loopRoom(loop),
      floor: loop.floor,
      design: round2(loop.length),
      cut: round2(loop.length + reserve),
    };
    const rows = rowsByCoil.get(coil);
    if (rows) rows.push(row);
    else rowsByCoil.set(coil, [row]);
  });

  const groups: CutGroup[] = [];
  for (const coil of coils) {
    const rows = rowsByCoil.get(coil.index);
    if (!rows) continue;
    groups.push({
      coil: coil.index,
      size: coil.size,
      used: coil.used,
      waste: coil.waste,
      fillPercent: coil.fillPercent,
      cost: coil.cost,
      rows,
    });
  }

  const loose = rowsByCoil.get(UNASSIGNED_COIL);
  if (loose) {
    const cut = loose.reduce((sum, row) => sum + row.cut, 0);
    groups.push({
      coil: UNASSIGNED_COIL,
      size: 0,
      used: round2(cut),
      waste: 0,
      fillPercent: 0,
      cost: null,
      rows: loose,
    });
  }

  return groups;
}
