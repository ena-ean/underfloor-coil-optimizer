import type { PackingResult } from "@/lib/algorithm/types";
import type { LoopEntry } from "@/lib/state";
import { formatMoney, formatPercent, type Currency } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";
import { circuitCode, hasRooms, loopRoom } from "@/lib/loop-label";
import { formatLength, type UnitSystem } from "@/lib/units";

import { buildCutPlan, UNASSIGNED_COIL } from "./cut-plan";
import { buildSpec, specTotals } from "./spec";

interface ReportInput {
  result: PackingResult;
  loops: LoopEntry[];
  reserve: number;
  dict: Dictionary;
  locale: Locale;
  currency: Currency;
  units: UnitSystem;
  appName: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const STYLES = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font: 14px/1.5 "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1b1b1f; background: #fff; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 32px 0 8px; }
  h3 { font-size: 13px; margin: 18px 0 2px; }
  .muted { color: #6b6b76; font-size: 12px; }
  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 20px 0; }
  .kpi { border: 1px solid #e5e3df; border-radius: 10px; padding: 12px; }
  .kpi b { display: block; font-size: 18px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  th, td { border-bottom: 1px solid #eceae6; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b6b76; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  tfoot td { font-weight: 600; }
  .coil-block { break-inside: avoid; page-break-inside: avoid; margin-bottom: 14px; }
  footer { margin-top: 28px; color: #8a8a93; font-size: 11px; }
  @media print { body { padding: 0; } .kpis, table, .coil-block { break-inside: avoid; } }
`;

/** Self-contained, print-ready HTML report (no external assets). */
export function buildHtmlReport({
  result,
  loops,
  reserve,
  dict,
  locale,
  currency,
  units,
  appName,
}: ReportInput): string {
  const meters = (value: number) => formatLength(value, units, locale, dict);
  const money = (value: number | null) =>
    value === null ? "—" : formatMoney(value, locale, currency);

  const spec = buildSpec(result.coils);
  const totals = specTotals(spec);
  const withRooms = hasRooms(loops);
  const coilByLoop = new Map<number, number>();
  for (const coil of result.coils) {
    for (const index of coil.loopIndexes) coilByLoop.set(index, coil.index);
  }

  const specRows = spec
    .map(
      (row) =>
        `<tr><td>${formatLength(row.size, units, locale, dict, 0)}</td><td class="num">${row.count}</td><td class="num">${meters(row.length)}</td><td class="num">${meters(row.used)}</td><td class="num">${meters(row.waste)}</td><td class="num">${money(row.cost)}</td></tr>`,
    )
    .join("");

  const cutPlan = buildCutPlan(loops, result.coils, reserve);

  const cutSections = cutPlan
    .map((group) => {
      const rows = group.rows
        .map(
          (row) =>
            `<tr><td>${escapeHtml(circuitCode(row.loopIndex, dict))}</td>${withRooms ? `<td>${escapeHtml(row.room)}</td>` : ""}<td class="num">${row.floor}</td><td class="num">${meters(row.design)}</td><td class="num"><strong>${meters(row.cut)}</strong></td></tr>`,
        )
        .join("");
      const meta =
        group.coil === UNASSIGNED_COIL
          ? []
          : [
              `${dict.coils.used} ${meters(group.used)}`,
              `${dict.coils.waste} ${meters(group.waste)}`,
              formatPercent(group.fillPercent, locale),
              ...(group.cost === null ? [] : [money(group.cost)]),
            ];
      const title =
        group.coil === UNASSIGNED_COIL
          ? dict.cutPlan.unassigned
          : `${dict.coils.coil} ${group.coil} · ${formatLength(group.size, units, locale, dict, 0)}`;

      return `<section class="coil-block">
    <h3>${escapeHtml(title)}</h3>
    <p class="muted">${meta.map((part) => escapeHtml(part)).join(" · ")}</p>
    <table>
      <thead><tr>
        <th>${escapeHtml(dict.loopsTable.circuit)}</th>
        ${withRooms ? `<th>${escapeHtml(dict.loopsTable.room)}</th>` : ""}
        <th class="num">${escapeHtml(dict.loopsTable.floor)}</th>
        <th class="num">${escapeHtml(dict.loopsTable.design)}</th>
        <th class="num">${escapeHtml(dict.cutPlan.cut)}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
    })
    .join("\n  ");

  const loopRows = loops
    .map(
      (loop, index) =>
        `<tr><td>${escapeHtml(circuitCode(index, dict))}</td>${withRooms ? `<td>${escapeHtml(loopRoom(loop))}</td>` : ""}<td class="num">${loop.floor}</td><td class="num">${meters(loop.length)}</td><td class="num">${meters(loop.length + reserve)}</td><td class="num">${coilByLoop.get(index) ?? ""}</td></tr>`,
    )
    .join("");

  const createdAt = new Date().toLocaleString(locale === "ru" ? "ru-RU" : "en-US");

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(dict.meta.report)} — ${escapeHtml(appName)}</title>
<style>${STYLES}</style>
</head>
<body>
  <h1>${escapeHtml(dict.meta.report)}</h1>
  <p class="muted">${escapeHtml(dict.meta.title)} · ${escapeHtml(createdAt)}</p>

  <div class="kpis">
    <div class="kpi"><span class="muted">${escapeHtml(dict.result.kpiCoils)}</span><b>${result.coils.length}</b></div>
    <div class="kpi"><span class="muted">${escapeHtml(dict.result.kpiPurchased)}</span><b>${meters(result.totalCoilLength)}</b></div>
    <div class="kpi"><span class="muted">${escapeHtml(dict.result.kpiWaste)}</span><b>${meters(result.totalWaste)}</b></div>
    <div class="kpi"><span class="muted">${escapeHtml(dict.result.kpiCost)}</span><b>${money(result.totalCost)}</b></div>
  </div>

  <h2>${escapeHtml(dict.spec.title)}</h2>
  <table>
    <thead><tr>
      <th>${escapeHtml(dict.spec.size)}</th>
      <th class="num">${escapeHtml(dict.spec.qty)}</th>
      <th class="num">${escapeHtml(dict.spec.length)}</th>
      <th class="num">${escapeHtml(dict.spec.used)}</th>
      <th class="num">${escapeHtml(dict.spec.waste)}</th>
      <th class="num">${escapeHtml(dict.spec.cost)}</th>
    </tr></thead>
    <tbody>${specRows}</tbody>
    <tfoot><tr>
      <td>${escapeHtml(dict.spec.total)}</td>
      <td class="num">${totals.count}</td>
      <td class="num">${meters(totals.length)}</td>
      <td class="num">${meters(totals.used)}</td>
      <td class="num">${meters(totals.waste)}</td>
      <td class="num">${money(totals.cost)}</td>
    </tr></tfoot>
  </table>

  <h2>${escapeHtml(dict.cutPlan.title)}</h2>
  <p class="muted">${escapeHtml(dict.cutPlan.hint)}</p>
  ${cutSections}

  <h2>${escapeHtml(dict.loopsTable.title)}</h2>
  <table>
    <thead><tr>
      <th>${escapeHtml(dict.loopsTable.circuit)}</th>
      ${withRooms ? `<th>${escapeHtml(dict.loopsTable.room)}</th>` : ""}
      <th class="num">${escapeHtml(dict.loopsTable.floor)}</th>
      <th class="num">${escapeHtml(dict.loopsTable.design)}</th>
      <th class="num">${escapeHtml(dict.loopsTable.withReserve)}</th>
      <th class="num">${escapeHtml(dict.loopsTable.coil)}</th>
    </tr></thead>
    <tbody>${loopRows}</tbody>
  </table>

  <footer>${escapeHtml(appName)} · ${escapeHtml(dict.footer.note)}</footer>
</body>
</html>`;
}
