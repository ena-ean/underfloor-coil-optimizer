import type { LoopInput, PackingResult, CoilResult } from "./coil-calculator";
import type { Lang } from "./i18n";

// =============================================================================
// HTML Report Generator — самодостаточный файл с инлайн-стилями
// =============================================================================

interface ReportOptions {
  coilSizes: number[];
  reserve: number;
  pricePerMeter?: number;
  lang?: Lang;
}

export function generateHTMLReport(
  loops: LoopInput[],
  result: PackingResult,
  options: ReportOptions
): string {
  const L = options.lang === "en" ? EN : RU;
  const locale = options.lang === "en" ? "en-US" : "ru-RU";
  const date = new Date().toLocaleDateString(locale, {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const totalOriginal = loops.reduce((s, l) => s + l.originalLength, 0);
  const coilsBySize = groupBySize(result.coils);
  const hasPrice = !!options.pricePerMeter && options.pricePerMeter > 0;
  const price = options.pricePerMeter || 0;
  const fmt = (v: number) => options.lang === "en"
    ? `₽${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : v.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
  const totalCost = hasPrice ? result.totalCoilLength * price : 0;

  return `<!DOCTYPE html>
<html lang="${options.lang || "ru"}">
<head>
<meta charset="utf-8"><title>${L.title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a1a;background:#fff;padding:32px;max-width:960px;margin:0 auto;font-size:13px}
  h1{font-size:22px;margin-bottom:4px}
  .sub{color:#666;font-size:12px;margin-bottom:24px}
  h2{font-size:15px;margin:24px 0 10px;padding-bottom:5px;border-bottom:2px solid #e5e7eb}
  table{width:100%;border-collapse:collapse;margin-bottom:14px}
  th{background:#f3f4f6;text-align:left;padding:7px 9px;font-weight:600;border:1px solid #d1d5db;font-size:12px}
  td{padding:6px 9px;border:1px solid #e5e7eb;font-size:12px}
  tr:nth-child(even) td{background:#f9fafb}
  .r{text-align:right}.c{text-align:center}.b{font-weight:700}
  .g{color:#059669;font-weight:600}.a{color:#d97706;font-weight:600}.red{color:#dc2626;font-weight:600}
  .sg{display:grid;grid-template-columns:repeat(${hasPrice ? 5 : 4},1fr);gap:10px;margin-bottom:24px}
  .sc{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center}
  .sc .v{font-size:20px;font-weight:700}.sc .l{font-size:10px;color:#666;margin-top:2px}
  .cs{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;page-break-inside:avoid}
  .ch{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
  .ct{font-size:14px;font-weight:700}
  .cl{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}
  .lt{background:#f3f4f6;border:1px solid #d1d5db;border-radius:4px;padding:2px 7px;font-size:11px}
  .csu{font-size:11px;color:#666;border-top:1px solid #e5e7eb;padding-top:5px;margin-top:4px}
  .bar{height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden;margin-bottom:4px}
  .bf{height:100%;border-radius:3px}
  .ft{margin-top:32px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:10px;color:#999;text-align:center}
  @media print{body{padding:16px}}
</style>
</head>
<body>
<h1>${L.title}</h1>
<div class="sub">${L.dateLabel}: ${date} · ${L.pipe} · ${L.reserveLabel}: +${options.reserve} ${L.m}${hasPrice ? ` · ${L.priceLabel}: ${price} ₽/${L.m}` : ""}</div>

<h2>${L.summary}</h2>
<div class="sg">
  <div class="sc"><div class="v">${result.coils.length}</div><div class="l">${L.coils}</div></div>
  <div class="sc"><div class="v">${result.totalUsed} ${L.m}</div><div class="l">${L.used}</div></div>
  <div class="sc"><div class="v ${wc(result.totalWaste)}">${result.totalWaste} ${L.m}</div><div class="l">${L.waste}</div></div>
  <div class="sc"><div class="v">${((1-result.totalWaste/result.totalCoilLength)*100).toFixed(1)}%</div><div class="l">${L.efficiency}</div></div>
  ${hasPrice ? `<div class="sc" style="background:#fffbeb;border-color:#fde68a"><div class="v" style="color:#92400e">${fmt(totalCost)}</div><div class="l" style="color:#b45309">${L.cost}</div></div>` : ""}
</div>

<h2>${L.specTitle}</h2>
<table>
<thead><tr><th>${L.size}</th><th class="c">${L.qty}</th><th class="r">${L.total}</th><th class="r">${L.inUse}</th><th class="r">${L.waste}</th>${hasPrice ? `<th class="r">${L.cost}</th>` : ""}</tr></thead>
<tbody>${coilsBySize.map(([size, coils]) => {
  const cnt = coils.length, tl = cnt * size, ul = coils.reduce((s, c) => s + c.totalLength, 0);
  return `<tr><td class="b">${size} ${L.m}</td><td class="c"><b>${cnt} ${L.pcs}</b></td><td class="r">${tl} ${L.m}</td><td class="r">${ul} ${L.m}</td><td class="r ${wc(tl - ul)}">${tl - ul} ${L.m}</td>${hasPrice ? `<td class="r b">${fmt(tl * price)}</td>` : ""}</tr>`;
}).join("\n")}</tbody>
<tfoot><tr style="font-weight:700;background:#f3f4f6">
  <td>${L.grandTotal}</td><td class="c">${result.coils.length} ${L.pcs}</td><td class="r">${result.totalCoilLength} ${L.m}</td><td class="r">${result.totalUsed} ${L.m}</td><td class="r ${wc(result.totalWaste)}">${result.totalWaste} ${L.m}</td>
  ${hasPrice ? `<td class="r">${fmt(totalCost)}</td>` : ""}</tr></tfoot>
</table>

<h2>${L.coilDetails}</h2>
${result.coils.map((coil) => {
  const fl = (n: number) => options.lang === "en" ? `fl. ${n}` : `${n} ${L.floorSuffix}`;
  const ci = (n: number) => options.lang === "en" ? `C${n}` : `К${n}`;
  const tags = coil.loops.map((i) => {
    const l = loops[i];
    return `<span class="lt">${ci(i + 1)} (${l.originalLength}+${options.reserve}=${l.originalLength + options.reserve} ${L.m}) — ${fl(l.floor)}</span>`;
  }).join("");
  const cc = hasPrice ? coil.size * price : 0;
  return `<div class="cs">
    <div class="ch"><span class="ct">${L.coilLabel} #${coil.index} — ${coil.size} ${L.m}${hasPrice ? ` — ${fmt(cc)}` : ""}</span><span class="${wc(coil.waste)}">${L.remainder}: ${coil.waste} ${L.m}</span></div>
    <div class="bar"><div class="bf" style="width:${coil.fillPercent}%;background:${bc(coil.fillPercent)}"></div></div>
    <div class="cl">${tags}</div>
    <div class="csu">${coil.loops.length} ${L.circuits} · ${coil.totalLength} ${L.m} ${L.ofWord} ${coil.size} ${L.m} · ${L.fillLabel}: ${coil.fillPercent}%</div>
  </div>`;
}).join("\n")}

<h2>${L.loopDistribution}</h2>
<table>
<thead><tr><th>${L.circuit}</th><th>${L.floor}</th><th class="r">${L.design}</th><th class="r">${L.withReserve}</th><th>${L.coil}</th></tr></thead>
<tbody>${loops.map((l, i) => {
  const coil = result.coils.find((c) => c.loops.includes(i));
  const ci = options.lang === "en" ? `C${i + 1}` : `К${i + 1}`;
  const fl = options.lang === "en" ? `fl. ${l.floor}` : `${l.floor} ${L.floorSuffix}`;
  return `<tr><td class="b">${ci}</td><td>${fl}</td><td class="r">${l.originalLength} ${L.m}</td><td class="r">${l.originalLength + options.reserve} ${L.m}</td><td>${coil ? `#${coil.index} (${coil.size} ${L.m})` : "—"}</td></tr>`;
}).join("\n")}</tbody>
<tfoot><tr style="font-weight:700;background:#f3f4f6">
  <td colspan="2">${L.totalLabel}: ${loops.length} ${L.circuits}</td><td class="r">${totalOriginal} ${L.m}</td><td class="r">${loops.reduce((s, l) => s + l.originalLength + options.reserve, 0)} ${L.m}</td><td></td></tr></tfoot>
</table>
<div class="ft">${L.footer} · ${date}</div>
</body></html>`;
}

// =============================================================================
// Language strings for reports
// =============================================================================

const RU = {
  title: "Расчёт бухт тёплого пола",
  dateLabel: "Дата",
  pipe: "Трубка ⌀16 мм",
  reserveLabel: "Запас",
  priceLabel: "Цена",
  m: "м",
  summary: "Сводка",
  coils: "Бухт",
  used: "Использовано",
  waste: "Остаток",
  efficiency: "Эффективность",
  cost: "Стоимость",
  specTitle: "Спецификация для закупки",
  size: "Размер",
  qty: "Кол-во",
  total: "Сумма",
  inUse: "В дело",
  pcs: "шт.",
  grandTotal: "ИТОГО",
  coilDetails: "Детализация по бухтам",
  coilLabel: "Бухта",
  remainder: "Остаток",
  floorSuffix: "эт.",
  circuits: "конт.",
  ofWord: "из",
  fillLabel: "Заполнение",
  loopDistribution: "Распределение петель",
  circuit: "Контур",
  floor: "Этаж",
  design: "Проектная",
  withReserve: "С запасом",
  coil: "Бухта",
  totalLabel: "Итого",
  footer: "Калькулятор бухт тёплого пола",
};

const EN = {
  title: "Underfloor Heating Coil Calculator",
  dateLabel: "Date",
  pipe: "Pipe ⌀16 mm",
  reserveLabel: "Reserve",
  priceLabel: "Price",
  m: "m",
  summary: "Summary",
  coils: "Coils",
  used: "Used",
  waste: "Waste",
  efficiency: "Efficiency",
  cost: "Cost",
  specTitle: "Purchase Specification",
  size: "Size",
  qty: "Qty",
  total: "Total",
  inUse: "Used",
  pcs: "pcs",
  grandTotal: "TOTAL",
  coilDetails: "Coil Details",
  coilLabel: "Coil",
  remainder: "Waste",
  floorSuffix: "fl.",
  circuits: "circuits",
  ofWord: "of",
  fillLabel: "Fill",
  loopDistribution: "Loop Distribution",
  circuit: "Circuit",
  floor: "Floor",
  design: "Design",
  withReserve: "With reserve",
  coil: "Coil",
  totalLabel: "Total",
  footer: "Underfloor Heating Coil Calculator",
};

// =============================================================================
// Helpers
// =============================================================================

function groupBySize(coils: CoilResult[]): [number, CoilResult[]][] {
  const m = new Map<number, CoilResult[]>();
  for (const c of coils) { const a = m.get(c.size) || []; a.push(c); m.set(c.size, a); }
  return [...m.entries()].sort((a, b) => b[0] - a[0]);
}

function wc(w: number) { return w <= 5 ? "g" : w <= 15 ? "a" : "red"; }
function bc(p: number) { return p >= 99 ? "#059669" : p >= 90 ? "#16a34a" : p >= 75 ? "#d97706" : "#dc2626"; }

export function downloadHTMLReport(loops: LoopInput[], result: PackingResult, options: ReportOptions): void {
  const blob = new Blob([generateHTMLReport(loops, result, options)], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(a);
  const prefix = options.lang === "en" ? "coil-calc" : "расчёт-бухт";
  a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.html`;
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
