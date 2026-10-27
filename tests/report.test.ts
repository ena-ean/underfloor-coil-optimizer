import { describe, expect, it } from "vitest";

import { optimizePacking } from "@/lib/algorithm";
import type { PackingResult } from "@/lib/algorithm/types";
import { parseLoopsFromText } from "@/lib/clipboard";
import { circuitLabel, normalizeRoom } from "@/lib/loop-label";
import type { LoopEntry } from "@/lib/state";
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
    const unit = ru.common.meters;
    expect(header).toBe(
      [
        `${ru.spec.size}, ${unit}`,
        ru.spec.qty,
        `${ru.spec.length}, ${unit}`,
        `${ru.spec.used}, ${unit}`,
        `${ru.spec.waste}, ${unit}`,
        ru.spec.cost,
      ].join(";"),
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

  it("exports lengths in feet for the imperial unit system", () => {
    const imperial = buildCsv(result, loops, 2, ru, "ru", "imperial");
    expect(imperial.split("\r\n")[1]).toContain(ru.common.feet);
    // 200 m coil -> 656.17 ft, 1400 m purchased -> 4593.18 ft
    expect(imperial).toContain("656,17");
    expect(imperial).toContain("4593,18");
    expect(imperial).not.toContain("1400");
  });
});

describe("room names", () => {
  const roomLoops: LoopEntry[] = [
    { id: "r1", floor: 1, length: 60, room: "Кухня" },
    { id: "r2", floor: 1, length: 60, room: "  Спальня  " },
    { id: "r3", floor: 2, length: 60 },
  ];

  it("normalises what the user types and drops an empty name", () => {
    expect(normalizeRoom("  Кухня   1 ")).toBe("Кухня 1");
    expect(normalizeRoom("   ")).toBeUndefined();
    expect(normalizeRoom(undefined)).toBeUndefined();
    expect(normalizeRoom("я".repeat(50))).toHaveLength(40);
  });

  it("labels a loop with its room, and without one", () => {
    expect(circuitLabel({ room: "Кухня" }, 2, ru)).toBe("К3 · Кухня");
    expect(circuitLabel({}, 0, ru)).toBe("К1");
  });

  it("adds the room column to the CSV only when a loop is named", () => {
    const plain = buildCsv(result, loops, 2, ru, "ru");
    expect(plain).not.toContain(ru.loopsTable.room);

    const named = buildCsv(result, roomLoops, 2, ru, "ru");
    const lines = named.split("\r\n");
    const header = lines[lines.indexOf(ru.loopsTable.title) + 1];
    expect(header.split(";")).toContain(ru.loopsTable.room);
    expect(named).toContain("Кухня");
    expect(named).toContain("Спальня");
    expect(named).not.toContain("  Спальня");
  });

  it("adds the room column to the HTML report, escaped", () => {
    const htmlWithout = buildHtmlReport({
      result,
      loops,
      reserve: 2,
      dict: ru,
      locale: "ru",
      currency: "RUB",
      units: "metric",
      appName: "Coil Optimizer",
    });
    expect(htmlWithout).not.toContain(ru.loopsTable.room);

    const htmlWith = buildHtmlReport({
      result,
      loops: [...roomLoops, { id: "r4", floor: 2, length: 40, room: "A&B <x>" }],
      reserve: 2,
      dict: ru,
      locale: "ru",
      currency: "RUB",
      units: "metric",
      appName: "Coil Optimizer",
    });
    expect(htmlWith).toContain(`<th>${ru.loopsTable.room}</th>`);
    expect(htmlWith).toContain("<td>Кухня</td>");
    expect(htmlWith).toContain("<td>A&amp;B &lt;x&gt;</td>");
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
    units: "metric",
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

  it("switches every length to feet when the units are imperial", () => {
    const imperial = buildHtmlReport({
      result,
      loops,
      reserve: 2,
      dict: ru,
      locale: "ru",
      currency: "RUB",
      units: "imperial",
      appName: "Coil Optimizer",
    }).replace(/[\u00a0\u202f\u2009]/g, " ");

    expect(imperial).toContain(ru.common.feet);
    expect(imperial).toContain("4 593,2");
    expect(imperial).not.toContain("1 400 м");
  });
});
