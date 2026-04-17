// =============================================================================
// i18n — Переводы интерфейса (RU / EN)
// =============================================================================

export type Lang = "ru" | "en";

export const LANG_LABELS: Record<Lang, string> = { ru: "Русский", en: "English" };

interface T {
  // Header
  title: string;
  subtitle: string;
  subtitleItem: string; // "{count} circuits ({floor} fl.)"
  pipe: string; // "Pipe ⌀16 mm"

  // Tabs
  tabLoops: string;
  tabSettings: string;
  tabResult: string;

  // Loops tab
  loopsTitle: string;
  loopsDesc: string;
  clear: string;
  add: string;
  floor: string;
  length: string;
  meters: string;
  loopsCount: string; // "{n} loops"
  total: string; // "{n} m"
  noLoops: string; // "No loops. Click «Add»."
  hintGoSettings: string; // "Go to «Settings» tab to select coils and run calculation."
  next: string;

  // Settings tab
  coilSizesTitle: string;
  coilSizesDesc: string;
  params: string;
  reserve: string; // "Connection reserve (m)"
  reserveHint: string; // "Added to each loop"
  pricePerMeter: string; // "Price per meter (₽)"
  pricePlaceholder: string; // "0 — not specified"
  priceHint: string; // "For calculating purchase cost"
  calculate: string;
  warnNoLength: string; // "Specify length for all loops"
  warnNoSize: string; // "Select at least one coil size"

  // Result tab
  noResult: string; // "Calculation not yet performed"
  noResultHint: string; // "Go to «Settings» and click «Calculate»"
  openSettings: string;
  error: string;

  // Summary cards
  coils: string; // "Coils"
  ofPipe: string; // "{n} m of pipe"
  used: string;
  designM: string; // "{n} m design"
  waste: string;
  ofPurchase: string; // "{pct}% of purchase"
  efficiency: string;
  ms: string; // "{n} ms"
  cost: string;
  perMeter: string; // "{n} ₽/m"

  // Purchase composition
  purchaseComp: string;
  pcs: string; // "{n} pcs"
  pieces: string;

  // Coil details
  coilDetails: string;
  coilsTab: string;
  loopsTab: string;
  coilLabel: string; // "Coil {size} m"
  remainder: string;
  circuits: string; // "{n} circuits"

  // Loops table headers
  circuit: string;
  circuitShort: string; // "C{i}"
  project: string;
  withReserve: string;
  coil: string;
  totalLabel: string; // "Total: {n} circuits"

  // Specification
  specTitle: string; // "Purchase specification"
  coilSize: string;
  qty: string;
  sum: string;
  inUse: string;
  remainderShort: string;
  grandTotal: string;

  // Export
  printPdf: string;
  downloadHtml: string;
  modify: string;

  // Footer
  footerText: string; // "Coil Calculator · Pipe ⌀16 mm"
}

const ru: T = {
  title: "Калькулятор бухт тёплого пола",
  subtitle: "Оптимизация закупки трубки",
  subtitleItem: "{count} конт. ({floor} эт.)",
  pipe: "Трубка",

  tabLoops: "Петли",
  tabSettings: "Настройки",
  tabResult: "Результат",

  loopsTitle: "Контурные петли",
  loopsDesc: "Укажите длину каждого контура и этаж",
  clear: "Очистить",
  add: "Добавить",
  floor: "Этаж",
  length: "Длина (м)",
  meters: "м",
  loopsCount: "{n} пет.",
  total: "{n} м",
  noLoops: 'Нет петель. Нажмите «Добавить».',
  hintGoSettings: 'Далее перейдите на вкладку <strong>«Настройки»</strong> для выбора бухт и запуска расчёта.',
  next: "Далее",

  coilSizesTitle: "Доступные размеры бухт",
  coilSizesDesc: "Отметьте размеры, доступные для закупки",
  params: "Параметры",
  reserve: "Запас на подключение (м)",
  reserveHint: "Добавляется к каждой петле",
  pricePerMeter: "Цена за метр (₽)",
  pricePlaceholder: "0 — не указывать",
  priceHint: "Для расчёта стоимости закупки",
  calculate: "Рассчитать",
  warnNoLength: "Укажите длину для всех петель",
  warnNoSize: "Выберите хотя бы один размер бухты",

  noResult: "Расчёт ещё не выполнен",
  noResultHint: 'Перейдите на вкладку «Настройки» и нажмите «Рассчитать»',
  openSettings: "Открыть настройки",
  error: "Ошибка",

  coils: "Бухт",
  ofPipe: "{n} м трубки",
  used: "Использовано",
  designM: "{n} м проектных",
  waste: "Остаток",
  ofPurchase: "{pct}% от закупки",
  efficiency: "Эффективность",
  ms: "{n} мс",
  cost: "Стоимость",
  perMeter: "{n} ₽/м",

  purchaseComp: "Состав закупки",
  pcs: "{n} шт.",
  pieces: "шт.",

  coilDetails: "Детализация по бухтам",
  coilsTab: "Бухты",
  loopsTab: "Петли",
  coilLabel: "Бухта {size} м",
  remainder: "Остаток",
  circuits: "{n} конт.",

  circuit: "Контур",
  circuitShort: "К{n}",
  project: "Проектная",
  withReserve: "С запасом",
  coil: "Бухта",
  totalLabel: "Итого: {n} конт.",

  specTitle: "Спецификация для закупки",
  coilSize: "Размер бухты",
  qty: "Кол-во",
  sum: "Сумма",
  inUse: "В дело",
  remainderShort: "Остаток",
  grandTotal: "ИТОГО",

  printPdf: "Печать / PDF",
  downloadHtml: "Скачать HTML",
  modify: "Изменить",

  footerText: "Калькулятор бухт тёплого пола",
};

const en: T = {
  title: "Underfloor Heating Coil Calculator",
  subtitle: "Pipe coil purchase optimizer",
  subtitleItem: "{count} circuits ({floor} fl.)",
  pipe: "Pipe",

  tabLoops: "Loops",
  tabSettings: "Settings",
  tabResult: "Result",

  loopsTitle: "Circuit Loops",
  loopsDesc: "Enter the length and floor for each circuit",
  clear: "Clear",
  add: "Add",
  floor: "Floor",
  length: "Length (m)",
  meters: "m",
  loopsCount: "{n} loops",
  total: "{n} m",
  noLoops: 'No loops. Click "Add".',
  hintGoSettings: 'Go to the <strong>"Settings"</strong> tab to select coils and run the calculation.',
  next: "Next",

  coilSizesTitle: "Available Coil Sizes",
  coilSizesDesc: "Select sizes available for purchase",
  params: "Parameters",
  reserve: "Connection reserve (m)",
  reserveHint: "Added to each loop",
  pricePerMeter: "Price per meter",
  pricePlaceholder: "0 — not specified",
  priceHint: "For calculating purchase cost",
  calculate: "Calculate",
  warnNoLength: "Specify length for all loops",
  warnNoSize: "Select at least one coil size",

  noResult: "Calculation not yet performed",
  noResultHint: 'Go to "Settings" and click "Calculate"',
  openSettings: "Open Settings",
  error: "Error",

  coils: "Coils",
  ofPipe: "{n} m of pipe",
  used: "Used",
  designM: "{n} m design",
  waste: "Waste",
  ofPurchase: "{pct}% of purchase",
  efficiency: "Efficiency",
  ms: "{n} ms",
  cost: "Cost",
  perMeter: "{n} /m",

  purchaseComp: "Purchase Summary",
  pcs: "{n} pcs",
  pieces: "pcs",

  coilDetails: "Coil Details",
  coilsTab: "Coils",
  loopsTab: "Loops",
  coilLabel: "Coil {size} m",
  remainder: "Waste",
  circuits: "{n} circuits",

  circuit: "Circuit",
  circuitShort: "C{n}",
  project: "Design",
  withReserve: "With reserve",
  coil: "Coil",
  totalLabel: "Total: {n} circuits",

  specTitle: "Purchase Specification",
  coilSize: "Coil Size",
  qty: "Qty",
  sum: "Total",
  inUse: "Used",
  remainderShort: "Waste",
  grandTotal: "TOTAL",

  printPdf: "Print / PDF",
  downloadHtml: "Download HTML",
  modify: "Modify",

  footerText: "Underfloor Heating Coil Calculator",
};

const translations: Record<Lang, T> = { ru, en };

export function t(lang: Lang): T {
  return translations[lang];
}

/** Detect language from browser, fallback to 'ru' */
export function detectLang(): Lang {
  if (typeof window === "undefined") return "ru";
  const saved = localStorage.getItem("coil-calc-lang");
  if (saved === "en" || saved === "ru") return saved;
  const nav = navigator.language || "";
  if (nav.startsWith("en")) return "en";
  return "ru";
}

export function saveLang(lang: Lang) {
  if (typeof window !== "undefined") localStorage.setItem("coil-calc-lang", lang);
}
