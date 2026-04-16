import type { LoopInput, PackingResult, CoilResult, OptimizationOptions } from "./coil-calculator";

// =============================================================================
// HTML Report Generator — standalone HTML file with inline styles
// =============================================================================

export function generateHTMLReport(
  loops: LoopInput[],
  result: PackingResult,
  options: OptimizationOptions
): string {
  const date = new Date().toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalOriginal = loops.reduce((s, l) => s + l.originalLength, 0);
  const coilsBySize = groupCoilsBySize(result.coils);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Расчёт бухт тёплого пола</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; background: #fff; padding: 32px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
  h2 { font-size: 16px; margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
  th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-weight: 600; border: 1px solid #d1d5db; }
  td { padding: 7px 10px; border: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  .font-bold { font-weight: 700; }
  .text-green { color: #059669; font-weight: 600; }
  .text-amber { color: #d97706; font-weight: 600; }
  .text-red { color: #dc2626; font-weight: 600; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .summary-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; text-align: center; }
  .summary-card .value { font-size: 22px; font-weight: 700; }
  .summary-card .label { font-size: 11px; color: #666; margin-top: 2px; }
  .coil-section { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin-bottom: 10px; page-break-inside: avoid; }
  .coil-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .coil-title { font-size: 15px; font-weight: 700; }
  .coil-loops { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .loop-tag { background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 4px; padding: 3px 8px; font-size: 12px; }
  .coil-summary { font-size: 12px; color: #666; border-top: 1px solid #e5e7eb; padding-top: 6px; margin-top: 4px; }
  .progress-bar { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 3px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 16px; } .no-print { display: none; } }
</style>
</head>
<body>

<h1>Расчёт бухт тёплого пола</h1>
<div class="subtitle">Дата: ${date} &middot; Диаметр трубки: 16 мм &middot; Запас: +${options.reserve} м</div>

<h2>Сводка</h2>
<div class="summary-grid">
  <div class="summary-card">
    <div class="value">${result.coils.length}</div>
    <div class="label">Бухт всего</div>
  </div>
  <div class="summary-card">
    <div class="value">${result.totalUsed} м</div>
    <div class="label">Использовано</div>
  </div>
  <div class="summary-card">
    <div class="value ${wasteColorClass(result.totalWaste)}">${result.totalWaste} м</div>
    <div class="label">Суммарный остаток</div>
  </div>
  <div class="summary-card">
    <div class="value">${((1 - result.totalWaste / result.totalCoilLength) * 100).toFixed(1)}%</div>
    <div class="label">Эффективность</div>
  </div>
</div>

<h2>Спецификация для закупки</h2>
<table>
  <thead>
    <tr><th>Размер бухты</th><th class="text-center">Количество</th><th class="text-right">Общая длина</th><th class="text-right">Пойдёт в дело</th><th class="text-right">Остаток</th></tr>
  </thead>
  <tbody>
    ${coilsBySize.map(([size, coils]) => {
      const count = coils.length;
      const totalLen = count * size;
      const usedLen = coils.reduce((s, c) => s + c.totalLength, 0);
      return `<tr>
        <td class="font-bold">${size} м</td>
        <td class="text-center"><strong>${count} шт.</strong></td>
        <td class="text-right">${totalLen} м</td>
        <td class="text-right">${usedLen} м</td>
        <td class="text-right ${wasteColorClass(totalLen - usedLen)}">${totalLen - usedLen} м</td>
      </tr>`;
    }).join("\n    ")}
  </tbody>
  <tfoot>
    <tr style="font-weight:700; background:#f3f4f6;">
      <td>ИТОГО</td>
      <td class="text-center">${result.coils.length} шт.</td>
      <td class="text-right">${result.totalCoilLength} м</td>
      <td class="text-right">${result.totalUsed} м</td>
      <td class="text-right ${wasteColorClass(result.totalWaste)}">${result.totalWaste} м</td>
    </tr>
  </tfoot>
</table>

<h2>Детализация по бухтам</h2>
${result.coils.map((coil) => {
  const loopTags = coil.loops.map((idx) => {
    const loop = loops[idx];
    return `<span class="loop-tag">К${idx + 1} (${loop.originalLength}+${options.reserve}=${loop.originalLength + options.reserve} м) — ${loop.floor} эт.</span>`;
  }).join("");
  return `<div class="coil-section">
    <div class="coil-header">
      <span class="coil-title">Бухта #${coil.index} — ${coil.size} м</span>
      <span class="${wasteColorClass(coil.waste)}">Остаток: ${coil.waste} м</span>
    </div>
    <div class="progress-bar"><div class="progress-fill" style="width:${coil.fillPercent}%;background:${progressColor(coil.fillPercent)}"></div></div>
    <div class="coil-loops">${loopTags}</div>
    <div class="coil-summary">${coil.loops.length} конт. &middot; ${coil.totalLength} м из ${coil.size} м &middot; Заполнение: ${coil.fillPercent}%</div>
  </div>`;
}).join("\n")}

<h2>Распределение петель</h2>
<table>
  <thead>
    <tr><th>Контур</th><th>Этаж</th><th class="text-right">Проектная</th><th class="text-right">С запасом</th><th>Бухта</th></tr>
  </thead>
  <tbody>
    ${loops.map((loop, idx) => {
      const coil = result.coils.find((c) => c.loops.includes(idx));
      return `<tr>
        <td class="font-bold">К${idx + 1}</td>
        <td>${loop.floor} эт.</td>
        <td class="text-right">${loop.originalLength} м</td>
        <td class="text-right">${loop.originalLength + options.reserve} м</td>
        <td>${coil ? `#${coil.index} (${coil.size} м)` : "—"}</td>
      </tr>`;
    }).join("\n    ")}
  </tbody>
  <tfoot>
    <tr style="font-weight:700; background:#f3f4f6;">
      <td colspan="2">Итого: ${loops.length} контуров</td>
      <td class="text-right">${totalOriginal} м</td>
      <td class="text-right">${loops.reduce((s, l) => s + l.originalLength + options.reserve, 0)} м</td>
      <td></td>
    </tr>
  </tfoot>
</table>

<div class="footer">
  Калькулятор бухт тёплого пола &middot; Итераций: ${result.iterations.toLocaleString("ru")} &middot; ${date}
</div>

</body>
</html>`;
}

// =============================================================================
// Утилиты
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

function wasteColorClass(waste: number): string {
  if (waste === 0) return "text-green";
  if (waste <= 5) return "text-green";
  if (waste <= 15) return "text-amber";
  return "text-red";
}

function progressColor(percent: number): string {
  if (percent >= 99) return "#059669";
  if (percent >= 90) return "#16a34a";
  if (percent >= 75) return "#d97706";
  return "#dc2626";
}

/** Скачать HTML-файл */
export function downloadHTMLReport(
  loops: LoopInput[],
  result: PackingResult,
  options: OptimizationOptions
): void {
  const html = generateHTMLReport(loops, result, options);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateStr = new Date().toISOString().slice(0, 10);
  a.download = `расчёт-бухт-${dateStr}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
