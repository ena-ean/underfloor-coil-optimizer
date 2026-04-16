import type { LoopInput, PackingResult, CoilResult, OptimizationOptions } from "./coil-calculator";

// =============================================================================
// HTML Report Generator
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
  const coilsBySize = groupCoilsBySize(result.coils);
  const hasPrice = !!options.pricePerMeter && options.pricePerMeter > 0;
  const price = options.pricePerMeter || 0;

  function fmt(v: number): string {
    return v.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
  }

  const totalCost = hasPrice ? result.totalCoilLength * price : 0;
  const usedCost = hasPrice ? result.totalUsed * price : 0;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Расчёт бухт тёплого пола</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; background: #fff; padding: 32px; max-width: 960px; margin: 0 auto; font-size: 13px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 12px; margin-bottom: 24px; }
  h2 { font-size: 15px; margin: 24px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { background: #f3f4f6; text-align: left; padding: 7px 9px; font-weight: 600; border: 1px solid #d1d5db; font-size: 12px; }
  td { padding: 6px 9px; border: 1px solid #e5e7eb; font-size: 12px; }
  tr:nth-child(even) td { background: #f9fafb; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  .text-green { color: #059669; font-weight: 600; }
  .text-amber { color: #d97706; font-weight: 600; }
  .text-red { color: #dc2626; font-weight: 600; }
  .summary-grid { display: grid; grid-template-columns: repeat(${hasPrice ? 5 : 4}, 1fr); gap: 10px; margin-bottom: 24px; }
  .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
  .summary-card .value { font-size: 20px; font-weight: 700; }
  .summary-card .label { font-size: 10px; color: #666; margin-top: 2px; }
  .coil-section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 8px; page-break-inside: avoid; }
  .coil-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .coil-title { font-size: 14px; font-weight: 700; }
  .coil-loops { display: flex; flex-wrap: wrap; gap: 4px; margin: 6px 0; }
  .loop-tag { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; padding: 2px 7px; font-size: 11px; }
  .coil-summary { font-size: 11px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 5px; margin-top: 4px; }
  .bar { height: 5px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .footer { margin-top: 32px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>

<h1>Расчёт бухт тёплого пола</h1>
<div class="subtitle">Дата: ${date} &middot; Диаметр трубки: 16 мм &middot; Запас: +${options.reserve} м${hasPrice ? ` &middot; Цена: ${price} ₽/м` : ""}</div>

<h2>Сводка</h2>
<div class="summary-grid">
  <div class="summary-card"><div class="value">${result.coils.length}</div><div class="label">Бухт</div></div>
  <div class="summary-card"><div class="value">${result.totalUsed} м</div><div class="label">Использовано</div></div>
  <div class="summary-card"><div class="value ${wasteCls(result.totalWaste)}">${result.totalWaste} м</div><div class="label">Остаток</div></div>
  <div class="summary-card"><div class="value">${((1 - result.totalWaste / result.totalCoilLength) * 100).toFixed(1)}%</div><div class="label">Эффективность</div></div>
  ${hasPrice ? `<div class="summary-card" style="background:#fffbeb;border-color:#fde68a;"><div class="value" style="color:#92400e;">${fmt(totalCost)}</div><div class="label" style="color:#b45309;">Стоимость закупки</div></div>` : ""}
</div>

<h2>Спецификация для закупки</h2>
<table>
  <thead><tr>
    <th>Размер бухты</th><th class="text-center">Кол-во</th><th class="text-right">Сумма</th><th class="text-right">В дело</th><th class="text-right">Остаток</th>
    ${hasPrice ? '<th class="text-right">Стоимость</th>' : ""}
  </tr></thead>
  <tbody>
    ${coilsBySize.map(([size, coils]) => {
      const count = coils.length;
      const totalLen = count * size;
      const usedLen = coils.reduce((s, c) => s + c.totalLength, 0);
      const cost = hasPrice ? totalLen * price : 0;
      return `<tr>
        <td class="font-bold">${size} м</td>
        <td class="text-center"><strong>${count} шт.</strong></td>
        <td class="text-right">${totalLen} м</td>
        <td class="text-right">${usedLen} м</td>
        <td class="text-right ${wasteCls(totalLen - usedLen)}">${totalLen - usedLen} м</td>
        ${hasPrice ? `<td class="text-right font-bold">${fmt(cost)}</td>` : ""}
      </tr>`;
    }).join("\n    ")}
  </tbody>
  <tfoot>
    <tr style="font-weight:700;background:#f3f4f6;">
      <td>ИТОГО</td>
      <td class="text-center">${result.coils.length} шт.</td>
      <td class="text-right">${result.totalCoilLength} м</td>
      <td class="text-right">${result.totalUsed} м</td>
      <td class="text-right ${wasteCls(result.totalWaste)}">${result.totalWaste} м</td>
      ${hasPrice ? `<td class="text-right">${fmt(totalCost)}</td>` : ""}
    </tr>
  </tfoot>
</table>

<h2>Детализация по бухтам</h2>
${result.coils.map((coil) => {
  const loopTags = coil.loops.map((idx) => {
    const loop = loops[idx];
    return `<span class="loop-tag">К${idx + 1} (${loop.originalLength}+${options.reserve}=${loop.originalLength + options.reserve} м) — ${loop.floor} эт.</span>`;
  }).join("");
  const coilCost = hasPrice ? coil.size * price : 0;
  return `<div class="coil-section">
    <div class="coil-header">
      <span class="coil-title">Бухта #${coil.index} — ${coil.size} м${hasPrice ? ` — ${fmt(coilCost)}` : ""}</span>
      <span class="${wasteCls(coil.waste)}">Остаток: ${coil.waste} м</span>
    </div>
    <div class="bar"><div class="bar-fill" style="width:${coil.fillPercent}%;background:${barColor(coil.fillPercent)}"></div></div>
    <div class="coil-loops">${loopTags}</div>
    <div class="coil-summary">${coil.loops.length} конт. &middot; ${coil.totalLength} м из ${coil.size} м &middot; Заполнение: ${coil.fillPercent}%</div>
  </div>`;
}).join("\n")}

<h2>Распределение петель</h2>
<table>
  <thead><tr><th>Контур</th><th>Этаж</th><th class="text-right">Проектная</th><th class="text-right">С запасом</th><th>Бухта</th></tr></thead>
  <tbody>
    ${loops.map((loop, idx) => {
      const coil = result.coils.find((c) => c.loops.includes(idx));
      return `<tr>
        <td class="font-bold">К${idx + 1}</td><td>${loop.floor} эт.</td>
        <td class="text-right">${loop.originalLength} м</td>
        <td class="text-right">${loop.originalLength + options.reserve} м</td>
        <td>${coil ? `#${coil.index} (${coil.size} м)` : "—"}</td>
      </tr>`;
    }).join("\n    ")}
  </tbody>
  <tfoot>
    <tr style="font-weight:700;background:#f3f4f6;">
      <td colspan="2">Итого: ${loops.length} контуров</td>
      <td class="text-right">${totalOriginal} м</td>
      <td class="text-right">${loops.reduce((s, l) => s + l.originalLength + options.reserve, 0)} м</td>
      <td></td>
    </tr>
  </tfoot>
</table>

<div class="footer">Калькулятор бухт тёплого пола &middot; Итераций: ${result.iterations.toLocaleString("ru")} &middot; ${date}</div>
</body></html>`;
}

// =============================================================================
// Helpers
// =============================================================================

function groupCoilsBySize(coils: CoilResult[]): [number, CoilResult[]][] {
  const map = new Map<number, CoilResult[]>();
  for (const coil of coils) {
    const arr = map.get(coil.size) || [];
    arr.push(coil);
    map.set(coil.size, arr);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]);
}

function wasteCls(w: number): string { return w <= 5 ? "text-green" : w <= 15 ? "text-amber" : "text-red"; }
function barColor(p: number): string { return p >= 99 ? "#059669" : p >= 90 ? "#16a34a" : p >= 75 ? "#d97706" : "#dc2626"; }

export function downloadHTMLReport(
  loops: LoopInput[], result: PackingResult, options: OptimizationOptions
): void {
  const html = generateHTMLReport(loops, result, options);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `расчёт-бухт-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
