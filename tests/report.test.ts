import { describe, expect, it } from "vitest";

import { optimizePacking } from "@/lib/algorithm";
import type { PackingResult } from "@/lib/algorithm/types";
import { parseLoopsFromText } from "@/lib/clipboard";
import type { LoopEntry } from "@/lib/calculator-state";
import { ru } from "@/lib/i18n/ru";
import { buildCsv } from "@/lib/report/csv";
import { buildHtmlReport } from "@/lib/report/html";
import { buildSpec, specTotals } from "@/lib/report/spec";

const loops: LoopEntry[] = [
  ...Array.from({ length: 15 }, (_, index) => ({ id: `a${index}`, floor: 1, length: 64 })),
  ...Array.from({ length: 4 }, (_, index) => ({ id: `b${index}`, floor: 2, length: 74 })),
];

const result: PackingResult = (() => {
  const outcome = optimizePacking(
    loops.map((loop) => ({ id: loop.id, floor: loop.floor, length: loop.length })),
    { coilSizes: [200], reserve: 2, prices: { perMeter: 120 } },
  );
  if (!outcome.ok) throw new Error(outcome.error.code);
  return outcome.result;
})();

describe("parseLoopsFromText", () => {
  it("reads a single column of lengths", () => {
    const parsed = parseLoopsFromText("64\n74\n");
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ floor: 1, length: 64 });
    expect(parsed[1]).toMatchObject({ floor: 1, length: 74 });
  });

  it("reads floor + length pairs with a decimal comma", () => {
    const parsed = parseLoopsFromText("2\t64,5\n3;70");
    expect(parsed[0]).toMatchObject({ floor: 2, length: 64.5 });
    expect(parsed[1]).toMatchObject({ floor: 3, length: 70 });
  });

  it("skips header rows and empty lines", () => {
    const parsed = parseLoopsFromText("Этаж\tДлина\n\n1\t55\n");
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ floor: 1, length: 55 });
  });
});

describe("purchase specification", () => {
  it("aggregates coils by size and totals correctly", () => {
    const rows = buildSpec(result.coils);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ size: 200, count: 7, length: 1400, used: 1294, waste: 106 });

    const totals = specTotals(rows);
    expect(totals.count).toBe(7);
    expect(totals.length).toBe(1400);
    expect(totals.used).toBe(1294);
    expect(totals.cost).toBe(168000);
  });
});

describe("CSV export", () => {
  const csv = buildCsv(result, loops, 2, ru, "ru");

  it("starts with a BOM and separates columns with semicolons", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const header = csv.split("\r\n")[1];
    expect(header).toBe(
      [ru.spec.size, ru.spec.qty, ru.spec.length, ru.spec.used, ru.spec.waste, ru.spec.cost].join(
        ";",
      ),
    );
  });

  it("contains the specification and the loop distribution", () => {
    expect(csv).toContain(ru.spec.total);
    expect(csv).toContain(ru.loopsTable.title);
    expect(csv).toMatch(/1400/);
    const rows = csv.split("\r\n");
    // title + header + size + total + blank + title + header + one row per loop
    expect(rows.length).toBe(7 + loops.length);
  });

  it("formats decimals with a comma for the Russian locale", () => {
    const decimalCsv = buildCsv(result, [{ id: "x", floor: 1, length: 64.5 }], 0, ru, "ru");
    expect(decimalCsv).toContain("64,5");

    const englishCsv = buildCsv(result, [{ id: "x", floor: 1, length: 64.5 }], 0, ru, "en");
    expect(englishCsv).toContain("64.5");
  });
});

describe("HTML report", () => {
  const html = buildHtmlReport({
    result,
    loops,
    reserve: 2,
    dict: ru,
    locale: "ru",
    currency: "RUB",
    appName: "Coil Optimizer",
  });

  it("is a standalone document in the selected language", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('<html lang="ru">');
    expect(html).toContain("<style>");
    expect(html).not.toContain("<script");
  });

  it("lists every coil and loop", () => {
    const text = html.replace(/[\u00a0\u202f\u2009]/g, " ");
    expect(text).toContain(ru.spec.title);
    expect(html.match(/<tr>/g)?.length ?? 0).toBeGreaterThan(loops.length);
    expect(text).toContain("1 400");
  });
});
