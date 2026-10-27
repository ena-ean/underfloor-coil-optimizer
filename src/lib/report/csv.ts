import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";
import type { PackingResult } from "@/lib/algorithm/types";
import type { LoopEntry } from "@/lib/state";
import { fromMetres, unitLabel, type UnitSystem } from "@/lib/units";

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
 * Lengths are exported in the unit system the user picked; the unit itself is
 * part of the column header, so a spreadsheet stays readable on its own.
 */
export function buildCsv(
  result: PackingResult,
  loops: LoopEntry[],
  reserve: number,
  dict: Dictionary,
  locale: Locale,
  units: UnitSystem = "metric",
): string {
  const spec = buildSpec(result.coils);
  const totals = specTotals(spec);
  const unit = unitLabel(units, dict);
  const length = (metres: number) => Math.round(fromMetres(metres, units) * 100) / 100;
  const withUnit = (label: string) => lengthCsvHeader(label, unit);
  const rows: string[][] = [];

  rows.push([dict.spec.title]);
  rows.push([
    withUnit(dict.spec.size),
    dict.spec.qty,
    withUnit(dict.spec.length),
    withUnit(dict.spec.used),
    withUnit(dict.spec.waste),
    dict.spec.cost,
  ]);

  for (const row of spec) {
    rows.push([
      cell(length(row.size), locale),
      cell(row.count, locale),
      cell(length(row.length), locale),
      cell(length(row.used), locale),
      cell(length(row.waste), locale),
      cell(row.cost, locale),
    ]);
  }

  rows.push([
    cell(dict.spec.total, locale),
    cell(totals.count, locale),
    cell(length(totals.length), locale),
    cell(length(totals.used), locale),
    cell(length(totals.waste), locale),
    cell(totals.cost, locale),
  ]);

  rows.push([]);
  rows.push([dict.loopsTable.title]);
  rows.push([
    dict.loopsTable.circuit,
    dict.loopsTable.floor,
    withUnit(dict.loopsTable.design),
    withUnit(dict.loopsTable.withReserve),
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
      cell(length(loop.length), locale),
      cell(length(loop.length + reserve), locale),
      cell(coilByLoop.get(index) ?? null, locale),
    ]);
  });

  return `\uFEFF${rows.map((row) => row.join(SEPARATOR)).join("\r\n")}`;
}

/** `Длина, м` — the unit belongs in the header, not in every cell. */
function lengthCsvHeader(label: string, unit: string): string {
  return `${label}, ${unit}`;
}

export function specRowsForDisplay(coils: PackingResult["coils"]): {
  rows: SpecRow[];
  totals: SpecRow;
} {
  const rows = buildSpec(coils);
  return { rows, totals: specTotals(rows) };
}
