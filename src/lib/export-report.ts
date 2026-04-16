import type { LoopInput, PackingResult, CoilResult, OptimizationOptions } from "./coil-calculator";

// =============================================================================
// HTML Report Generator — самодостаточный файл с инлайн-стилями
// =============================================================================

export function generateHTMLReport(
  loops: LoopInput[],
  result: PackingResult,
  options: OptimizationOptions
): string {
  const date = new Date().toLocaleDateString("ru-RU", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const totalOriginal = loops.reduce((s, l) => s + l.originalLength, 0);
  const coilsBySize = groupBySize(result.coils);
  const hasPrice = !!options.pricePerMeter && options.pricePerMeter > 0;
  const price = options.pricePerMeter || 0;
  const fmt = (v: number) => v.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
  const totalCost = hasPrice ? result.totalCoilLength * price : 0;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8"><title>Расчёт бухт тёплого пола</title>
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
<h1>Расчёт бухт тёплого пола</h1>
<div class="sub">Дата: ${date} · Трубка ⌀16 мм · Запас: +${options.reserve} м${hasPrice ? ` · Цена: ${price} ₽/м` : ""}</div>

<h2>Сводка</h2>
<div class="sg">
  <div class="sc"><div class="v">${result.coils.length}</div><div class="l">Бухт</div></div>
  <div class="sc"><div class="v">${result.totalUsed} м</div><div class="l">Использовано</div></div>
  <div class="sc"><div class="v ${wc(result.totalWaste)}">${result.totalWaste} м</div><div class="l">Остаток</div></div>
  <div class="sc"><div class="v">${((1-result.totalWaste/result.totalCoilLength)*100).toFixed(1)}%</div><div class="l">Эффективность</div></div>
  ${hasPrice ? `<div class="sc" style="background:#fffbeb;border-color:#fde68a"><div class="v" style="color:#92400e">${fmt(totalCost)}</div><div class="l" style="color:#b45309">Стоимость</div></div>` : ""}
</div>

<h2>Спецификация для закупки</h2>
<table>
<thead><tr><th>Размер</th><th class="c">Кол-во</th><th class="r">Сумма</th><th class="r">В дело</th><th class="r">Остаток</th>${hasPrice ? "<th class=\"r\">Стоимость</th>" : ""}</tr></thead>
<tbody>${coilsBySize.map(([size, coils]) => {
  const cnt = coils.length, tl = cnt * size, ul = coils.reduce((s, c) => s + c.totalLength, 0);
  return `<tr><td class="b">${size} м</td><td class="c"><b>${cnt} шт.</b></td><td class="r">${tl} м</td><td class="r">${ul} м</td><td class="r ${wc(tl - ul)}">${tl - ul} м</td>${hasPrice ? `<td class="r b">${fmt(tl * price)}</td>` : ""}</tr>`;
}).join("\n")}</tbody>
<tfoot><tr style="font-weight:700;background:#f3f4f6">
  <td>ИТОГО</td><td class="c">${result.coils.length} шт.</td><td class="r">${result.totalCoilLength} м</td><td class="r">${result.totalUsed} м</td><td class="r ${wc(result.totalWaste)}">${result.totalWaste} м</td>
  ${hasPrice ? `<td class="r">${fmt(totalCost)}</td>` : ""}</tr></tfoot>
</table>

<h2>Детализация по бухтам</h2>
${result.coils.map((coil) => {
  const tags = coil.loops.map((i) => {
    const l = loops[i];
    return `<span class="lt">К${i + 1} (${l.originalLength}+${options.reserve}=${l.originalLength + options.reserve} м) — ${l.floor} эт.</span>`;
  }).join("");
  const cc = hasPrice ? coil.size * price : 0;
  return `<div class="cs">
    <div class="ch"><span class="ct">Бухта #${coil.index} — ${coil.size} м${hasPrice ? ` — ${fmt(cc)}` : ""}</span><span class="${wc(coil.waste)}">Остаток: ${coil.waste} м</span></div>
    <div class="bar"><div class="bf" style="width:${coil.fillPercent}%;background:${bc(coil.fillPercent)}"></div></div>
    <div class="cl">${tags}</div>
    <div class="csu">${coil.loops.length} конт. · ${coil.totalLength} м из ${coil.size} м · Заполнение: ${coil.fillPercent}%</div>
  </div>`;
}).join("\n")}

<h2>Распределение петель</h2>
<table>
<thead><tr><th>Контур</th><th>Этаж</th><th class="r">Проектная</th><th class="r">С запасом</th><th>Бухта</th></tr></thead>
<tbody>${loops.map((l, i) => {
  const coil = result.coils.find((c) => c.loops.includes(i));
  return `<tr><td class="b">К${i + 1}</td><td>${l.floor} эт.</td><td class="r">${l.originalLength} м</td><td class="r">${l.originalLength + options.reserve} м</td><td>${coil ? `#${coil.index} (${coil.size} м)` : "—"}</td></tr>`;
}).join("\n")}</tbody>
<tfoot><tr style="font-weight:700;background:#f3f4f6">
  <td colspan="2">Итого: ${loops.length} контуров</td><td class="r">${totalOriginal} м</td><td class="r">${loops.reduce((s, l) => s + l.originalLength + options.reserve, 0)} м</td><td></td></tr></tfoot>
</table>
<div class="ft">Калькулятор бухт тёплого пола · ${date}</div>
</body></html>`;
}

function groupBySize(coils: CoilResult[]): [number, CoilResult[]][] {
  const m = new Map<number, CoilResult[]>();
  for (const c of coils) { const a = m.get(c.size) || []; a.push(c); m.set(c.size, a); }
  return [...m.entries()].sort((a, b) => b[0] - a[0]);
}

function wc(w: number) { return w <= 5 ? "g" : w <= 15 ? "a" : "red"; }
function bc(p: number) { return p >= 99 ? "#059669" : p >= 90 ? "#16a34a" : p >= 75 ? "#d97706" : "#dc2626"; }

export function downloadHTMLReport(loops: LoopInput[], result: PackingResult, options: OptimizationOptions): void {
  const blob = new Blob([generateHTMLReport(loops, result, options)], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `расчёт-бухт-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
