import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";
import type { PackingResult } from "@/lib/algorithm/types";
import type { LoopEntry } from "@/lib/calculator-state";

import { buildSpec, specTotals, type SpecRow } from "./spec";

const SEPARATOR = ";";

/** Russian Excel expects `;` as separator and `,` as decimal mark. */
function cell(value: string | number | null, locale: Locale): string {
  if (value === null) return "";
  if (typeof value === "number") {
    const text = String(Math.round(value * 100) / 100);
    return locale === "ru" ? text.replace(".", ",") : text;
  }
  return value.includes(SEPARATOR) || value.includes('"') ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Purchase specification and loop distribution as CSV — opens directly in
 * Excel / LibreOffice and keeps the decimal separator of the UI language.
 */
export function buildCsv(
  result: PackingResult,
  loops: LoopEntry[],
  reserve: number,
  dict: Dictionary,
  locale: Locale,
): string {
  const spec = buildSpec(result.coils);
  const totals = specTotals(spec);
  const rows: string[][] = [];

  rows.push([dict.spec.title]);
  rows.push([
    dict.spec.size,
    dict.spec.qty,
    dict.spec.length,
    dict.spec.used,
    dict.spec.waste,
    dict.spec.cost,
  ]);

  for (const row of spec) {
    rows.push([
      cell(row.size, locale),
      cell(row.count, locale),
      cell(row.length, locale),
      cell(row.used, locale),
      cell(row.waste, locale),
      cell(row.cost, locale),
    ]);
  }

  rows.push([
    cell(dict.spec.total, locale),
    cell(totals.count, locale),
    cell(totals.length, locale),
    cell(totals.used, locale),
    cell(totals.waste, locale),
    cell(totals.cost, locale),
  ]);

  rows.push([]);
  rows.push([dict.loopsTable.title]);
  rows.push([
    dict.loopsTable.circuit,
    dict.loopsTable.floor,
    dict.loopsTable.design,
    dict.loopsTable.withReserve,
    dict.loopsTable.coil,
  ]);

  const coilByLoop = new Map<number, number>();
  for (const coil of result.coils) {
    for (const index of coil.loopIndexes) coilByLoop.set(index, coil.index);
  }

  loops.forEach((loop, index) => {
    rows.push([
      cell(index + 1, locale),
      cell(loop.floor, locale),
      cell(loop.length, locale),
      cell(loop.length + reserve, locale),
      cell(coilByLoop.get(index) ?? null, locale),
    ]);
  });

  return `\uFEFF${rows.map((row) => row.join(SEPARATOR)).join("\r\n")}`;
}

export function specRowsForDisplay(coils: PackingResult["coils"]): {
  rows: SpecRow[];
  totals: SpecRow;
} {
  const rows = buildSpec(coils);
  return { rows, totals: specTotals(rows) };
}
