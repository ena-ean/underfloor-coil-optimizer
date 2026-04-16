"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import {
  Plus,
  Trash2,
  Ruler,
  Scissors,
  Layers,
  CheckCircle2,
  Calculator,
  Building2,
  Timer,
  TrendingDown,
  FileDown,
  Printer,
  Settings2,
  Zap,
  RotateCcw,
  Loader2,
  Package,
  CircleDollarSign,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  optimizeCoilPacking,
  COIL_SIZE_OPTIONS,
  calcCoilCost,
  type LoopInput,
  type PackingResult,
  type CoilResult,
  type OptimizationOptions,
} from "@/lib/coil-calculator";
import { downloadHTMLReport } from "@/lib/export-report";

// =============================================================================
// Типы
// =============================================================================

interface LoopEntry {
  uid: string;
  floor: number;
  length: number;
}

// =============================================================================
// Константы
// =============================================================================

const DEFAULT_LOOPS: LoopEntry[] = [
  { uid: "d1", floor: 1, length: 17 }, { uid: "d2", floor: 1, length: 54 },
  { uid: "d3", floor: 1, length: 78 }, { uid: "d4", floor: 1, length: 75 },
  { uid: "d5", floor: 1, length: 85 }, { uid: "d6", floor: 1, length: 83 },
  { uid: "d7", floor: 1, length: 38 }, { uid: "d8", floor: 1, length: 79 },
  { uid: "d9", floor: 1, length: 86 }, { uid: "d10", floor: 1, length: 86 },
  { uid: "d11", floor: 2, length: 70 }, { uid: "d12", floor: 2, length: 74 },
  { uid: "d13", floor: 2, length: 73 }, { uid: "d14", floor: 2, length: 72 },
  { uid: "d15", floor: 2, length: 68 }, { uid: "d16", floor: 2, length: 72 },
  { uid: "d17", floor: 2, length: 56 }, { uid: "d18", floor: 2, length: 65 },
  { uid: "d19", floor: 2, length: 40 },
];

const ITERATION_PRESETS = [
  { label: "Быстро", value: 10000, icon: Zap },
  { label: "Стандарт", value: 50000, icon: Settings2 },
  { label: "Тщательно", value: 200000, icon: RotateCcw },
  { label: "Максимум", value: 500000, icon: Timer },
];

let uidCounter = 200;
function genUid(): string { return `u${++uidCounter}`; }

// =============================================================================
// Мини-компоненты
// =============================================================================

function WasteSpan({ meters }: { meters: number }) {
  if (meters === 0) return <span className="text-emerald-600 font-bold">0 м</span>;
  if (meters <= 5) return <span className="text-emerald-600 font-semibold">{meters} м</span>;
  if (meters <= 15) return <span className="text-amber-600 font-semibold">{meters} м</span>;
  return <span className="text-red-500 font-semibold">{meters} м</span>;
}

function FillBadge({ percent }: { percent: number }) {
  if (percent >= 99) return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100">{percent}%</Badge>;
  if (percent >= 90) return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">{percent}%</Badge>;
  if (percent >= 75) return <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">{percent}%</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100">{percent}%</Badge>;
}

function ColoredBar({ value }: { value: number }) {
  const color = value >= 99 ? "bg-emerald-500" : value >= 90 ? "bg-green-500" : value >= 75 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all duration-700 ease-out ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function formatPrice(v: number): string {
  return v.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
}

// =============================================================================
// Основная страница
// =============================================================================

export default function HomePage() {
  // --- State ---
  const [loops, setLoops] = useState<LoopEntry[]>(DEFAULT_LOOPS);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([50, 100, 200]);
  const [iterations, setIterations] = useState(50000);
  const [reserve, setReserve] = useState(2);
  const [pricePerMeter, setPricePerMeter] = useState(0);
  const [result, setResult] = useState<PackingResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [inputsDirty, setInputsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState("loops");

  // --- Derived ---
  const totalOriginal = useMemo(() => loops.reduce((s, l) => s + l.length, 0), [loops]);
  const totalAdjusted = useMemo(() => loops.reduce((s, l) => s + l.length + reserve, 0), [loops, reserve]);
  const loopsValid = loops.length > 0 && loops.every((l) => l.length > 0 && l.floor >= 1);
  const sizesValid = selectedSizes.length > 0;
  const hasPrice = pricePerMeter > 0;

  const coilsBySize = useMemo(() => {
    if (!result) return new Map<number, CoilResult[]>();
    const map = new Map<number, CoilResult[]>();
    for (const coil of result.coils) {
      const arr = map.get(coil.size) || [];
      arr.push(coil);
      map.set(coil.size, arr);
    }
    return map;
  }, [result]);

  const costData = useMemo(() => {
    if (!result || !hasPrice) return null;
    return calcCoilCost(result.coils, pricePerMeter);
  }, [result, hasPrice, pricePerMeter]);

  // --- Handlers ---
  const addLoop = useCallback(() => {
    const lastFloor = loops.length > 0 ? loops[loops.length - 1].floor : 1;
    setLoops((prev) => [...prev, { uid: genUid(), floor: lastFloor, length: 0 }]);
    setInputsDirty(true);
  }, [loops]);

  const removeLoop = useCallback((uid: string) => {
    setLoops((prev) => prev.filter((l) => l.uid !== uid));
    setInputsDirty(true);
  }, []);

  const updateLoop = useCallback((uid: string, field: "floor" | "length", value: number) => {
    setLoops((prev) => prev.map((l) => (l.uid === uid ? { ...l, [field]: value } : l)));
    setInputsDirty(true);
  }, []);

  const clearAllLoops = useCallback(() => { setLoops([]); setInputsDirty(true); }, []);

  const toggleSize = useCallback((size: number, checked: boolean) => {
    setSelectedSizes((prev) => checked ? [...prev, size] : prev.filter((s) => s !== size));
    setInputsDirty(true);
  }, []);

  const handleCalculate = useCallback(() => {
    if (!loopsValid || !sizesValid) return;
    setIsCalculating(true);
    setResult(null);
    setInputsDirty(false);

    const loopInputs: LoopInput[] = loops.map((l, i) => ({
      id: i + 1, floor: l.floor, originalLength: l.length,
    }));
    const options: OptimizationOptions = {
      coilSizes: selectedSizes, iterations, reserve, pricePerMeter: hasPrice ? pricePerMeter : undefined,
    };

    setTimeout(() => {
      const t0 = performance.now();
      const res = optimizeCoilPacking(loopInputs, options);
      setElapsed(Math.round(performance.now() - t0));
      setResult(res);
      setIsCalculating(false);
      setActiveTab("result");
    }, 60);
  }, [loops, loopsValid, sizesValid, selectedSizes, iterations, reserve, hasPrice, pricePerMeter]);

  const handlePrint = useCallback(() => window.print(), []);
  const handleDownloadHTML = useCallback(() => {
    if (!result) return;
    const loopInputs: LoopInput[] = loops.map((l, i) => ({
      id: i + 1, floor: l.floor, originalLength: l.length,
    }));
    downloadHTMLReport(loopInputs, result, { coilSizes: selectedSizes, iterations, reserve, pricePerMeter: hasPrice ? pricePerMeter : undefined });
  }, [result, loops, selectedSizes, iterations, reserve, hasPrice, pricePerMeter]);

  const currentPreset = ITERATION_PRESETS.find((p) => p.value === iterations);
  const estimatedTime = useMemo(() => {
    const perThousand = 0.025;
    return Math.max(1, Math.round((iterations * perThousand) * Math.sqrt(loops.length / 19)));
  }, [iterations, loops.length]);

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-stone-100">
      {/* ── Header ── */}
      <header className="bg-white border-b shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 shrink-0">
              <Calculator className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Калькулятор бухт тёплого пола</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Оптимизация закупки трубки ⌀16 мм</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="loops" className="gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Петли</span>
              <Badge variant="secondary" className="ml-0.5 text-xs px-1.5">{loops.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Настройки</span>
              {inputsDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
            </TabsTrigger>
            <TabsTrigger value="result" className="gap-1.5" disabled={!result || !!result.error}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Результат</span>
            </TabsTrigger>
          </TabsList>

          {/* ============================================================ */}
          {/* TAB 1: ПЕТЛИ                                                   */}
          {/* ============================================================ */}
          <TabsContent value="loops" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Контурные петли</CardTitle>
                    <CardDescription className="mt-0.5">Укажите длину каждого контура и этаж</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={clearAllLoops} disabled={loops.length === 0}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Очистить
                    </Button>
                    <Button size="sm" onClick={addLoop}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                {/* Desktop */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead className="w-28">Этаж</TableHead>
                        <TableHead>Длина (м)</TableHead>
                        <TableHead className="w-20 text-center">С запасом</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loops.map((loop, idx) => (
                        <TableRow key={loop.uid}>
                          <TableCell className="text-center font-mono text-muted-foreground text-xs">{idx + 1}</TableCell>
                          <TableCell>
                            <Input type="number" min={1} max={99} value={loop.floor}
                              onChange={(e) => updateLoop(loop.uid, "floor", parseInt(e.target.value) || 1)}
                              className="h-8 w-20 text-center" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step={0.5} value={loop.length || ""} placeholder="м"
                              onChange={(e) => updateLoop(loop.uid, "length", parseFloat(e.target.value) || 0)}
                              className="h-8 w-32" />
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground text-xs">
                            {loop.length > 0 ? `${loop.length + reserve}` : "—"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLoop(loop.uid)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    {loops.length > 0 && (
                      <TableFooter>
                        <TableRow>
                          <TableCell className="font-semibold">{loops.length} пет.</TableCell>
                          <TableCell />
                          <TableCell className="font-semibold">{totalOriginal} м</TableCell>
                          <TableCell className="text-center font-semibold">{totalAdjusted} м</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableFooter>
                    )}
                  </Table>
                </div>

                {/* Mobile */}
                <div className="sm:hidden space-y-2 max-h-[60vh] overflow-y-auto">
                  {loops.map((loop, idx) => (
                    <div key={loop.uid} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
                      <span className="text-xs font-mono text-muted-foreground w-6 text-center shrink-0">{idx + 1}</span>
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Label className="text-xs text-muted-foreground shrink-0">Эт.</Label>
                        <Input type="number" min={1} max={99} value={loop.floor}
                          onChange={(e) => updateLoop(loop.uid, "floor", parseInt(e.target.value) || 1)}
                          className="h-7 w-14 text-center text-sm" />
                      </div>
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Label className="text-xs text-muted-foreground shrink-0">м</Label>
                        <Input type="number" min={0} step={0.5} value={loop.length || ""} placeholder="0"
                          onChange={(e) => updateLoop(loop.uid, "length", parseFloat(e.target.value) || 0)}
                          className="h-7 w-20 text-center text-sm" />
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => removeLoop(loop.uid)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  {loops.length > 0 && (
                    <div className="text-xs text-muted-foreground text-center pt-1">
                      {loops.length} петель &middot; {totalOriginal} м проектных &middot; {totalAdjusted} м с запасом
                    </div>
                  )}
                </div>

                {loops.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    Нет петель. Нажмите «Добавить» для начала.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Подсказка */}
            <div className="flex items-start gap-2 text-sm text-muted-foreground px-1">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Далее перейдите на вкладку <strong>«Настройки»</strong> для выбора размеров бухт и запуска расчёта.</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("settings")} className="gap-2">
                Далее <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          {/* ============================================================ */}
          {/* TAB 2: НАСТРОЙКИ                                               */}
          {/* ============================================================ */}
          <TabsContent value="settings" className="space-y-4">
            {/* Размеры бухт */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Доступные размеры бухт</CardTitle>
                <CardDescription>Отметьте размеры, которые доступны для закупки</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2.5">
                  {COIL_SIZE_OPTIONS.map((size) => {
                    const checked = selectedSizes.includes(size);
                    return (
                      <label key={size}
                        className={`flex items-center gap-2 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all ${
                          checked
                            ? "border-gray-900 bg-gray-900 text-white shadow-md"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-sm"
                        }`}>
                        <Checkbox checked={checked} onCheckedChange={(c) => toggleSize(size, !!c)}
                          className={checked ? "border-white bg-white data-[state=checked]:bg-white data-[state=checked]:text-gray-900" : ""} />
                        <span className="font-bold text-sm">{size} м</span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Параметры расчёта */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Параметры расчёта</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Запас */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Запас на подключение (м)</Label>
                    <Input type="number" min={0} max={20} step={0.5} value={reserve}
                      onChange={(e) => { setReserve(parseFloat(e.target.value) || 0); setInputsDirty(true); }}
                      className="h-9 w-32" />
                    <p className="text-xs text-muted-foreground">Добавляется к каждой петле (по умолчанию +2 м)</p>
                  </div>

                  {/* Цена */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Цена за метр (₽)</Label>
                    <Input type="number" min={0} step={1} value={pricePerMeter || ""}
                      placeholder="0 — не указывать"
                      onChange={(e) => { setPricePerMeter(parseFloat(e.target.value) || 0); setInputsDirty(true); }}
                      className="h-9 w-40" />
                    <p className="text-xs text-muted-foreground">Для расчёта примерной стоимости закупки</p>
                  </div>
                </div>

                <Separator />

                {/* Итерации */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Количество итераций: <span className="text-muted-foreground font-normal">
                      {currentPreset ? currentPreset.label : "Своя"} ({iterations.toLocaleString("ru")})
                    </span>
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {ITERATION_PRESETS.map((preset) => {
                      const Icon = preset.icon;
                      const active = iterations === preset.value;
                      return (
                        <Button key={preset.value} variant={active ? "default" : "outline"} size="sm"
                          onClick={() => { setIterations(preset.value); setInputsDirty(true); }}
                          className="text-xs gap-1">
                          <Icon className="w-3 h-3" />
                          {preset.label} ({(preset.value / 1000).toFixed(0)}K)
                        </Button>
                      );
                    })}
                  </div>
                  <Slider value={[iterations]}
                    onValueChange={([v]) => { setIterations(v); setInputsDirty(true); }}
                    min={5000} max={500000} step={5000} className="w-full" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>5 000</span>
                    <span className="flex items-center gap-1">
                      <Timer className="w-3 h-3" /> Примерно ~{estimatedTime} сек.
                    </span>
                    <span>500 000</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Кнопка расчёта */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-2">
              <Button size="lg" onClick={handleCalculate}
                disabled={!loopsValid || !sizesValid || isCalculating}
                className="flex-1 sm:flex-none text-base px-10 gap-2">
                {isCalculating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Расчёт...</>
                ) : (
                  <><Calculator className="w-4 h-4" /> Рассчитать</>
                )}
              </Button>
              {isCalculating && (
                <p className="text-sm text-muted-foreground">
                  {iterations.toLocaleString("ru")} итераций, {loops.length} петель...
                </p>
              )}
              {!loopsValid && loops.length > 0 && (
                <p className="text-sm text-amber-600">Укажите длину для всех петель</p>
              )}
              {!sizesValid && (
                <p className="text-sm text-amber-600">Выберите хотя бы один размер бухты</p>
              )}
            </div>
          </TabsContent>

          {/* ============================================================ */}
          {/* TAB 3: РЕЗУЛЬТАТ                                               */}
          {/* ============================================================ */}
          <TabsContent value="result" className="space-y-4">
            {!result && !isCalculating && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Calculator className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-1">Расчёт ещё не выполнен</p>
                  <p className="text-sm mb-4">Перейдите на вкладку «Настройки» и нажмите «Рассчитать»</p>
                  <Button variant="outline" onClick={() => setActiveTab("settings")}>Открыть настройки</Button>
                </CardContent>
              </Card>
            )}

            {isCalculating && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium">Выполняется расчёт...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {iterations.toLocaleString("ru")} итераций, {loops.length} петель
                  </p>
                </CardContent>
              </Card>
            )}

            {result && result.error && (
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="flex items-center gap-3 py-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
                    <Scissors className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Ошибка расчёта</p>
                    <p className="text-sm text-red-600">{result.error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {result && !result.error && result.coils.length > 0 && (
              <>
                {/* Сводные карточки */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <Card className="py-4">
                    <CardContent className="px-4 sm:px-5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">Бухт</span>
                      </div>
                      <div className="text-2xl font-bold">{result.coils.length}</div>
                      <div className="text-xs text-muted-foreground">{result.totalCoilLength} м трубки</div>
                    </CardContent>
                  </Card>
                  <Card className="py-4">
                    <CardContent className="px-4 sm:px-5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">Использовано</span>
                      </div>
                      <div className="text-2xl font-bold">{result.totalUsed} м</div>
                      <div className="text-xs text-muted-foreground">{totalOriginal} м проектных</div>
                    </CardContent>
                  </Card>
                  <Card className="py-4">
                    <CardContent className="px-4 sm:px-5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Scissors className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">Остаток</span>
                      </div>
                      <div className="text-2xl font-bold"><WasteSpan meters={result.totalWaste} /></div>
                      <div className="text-xs text-muted-foreground">
                        {((result.totalWaste / result.totalCoilLength) * 100).toFixed(1)}% от закупки
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="py-4">
                    <CardContent className="px-4 sm:px-5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">Эффективность</span>
                      </div>
                      <div className="text-2xl font-bold">
                        {((1 - result.totalWaste / result.totalCoilLength) * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">{elapsed} мс</div>
                    </CardContent>
                  </Card>
                  {hasPrice && costData && (
                    <Card className="py-4 border-amber-200 bg-amber-50/50">
                      <CardContent className="px-4 sm:px-5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <CircleDollarSign className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-xs text-amber-700 font-medium">Стоимость</span>
                        </div>
                        <div className="text-2xl font-bold text-amber-800">{formatPrice(costData.total)}</div>
                        <div className="text-xs text-amber-600">{pricePerMeter} ₽/м</div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Состав закупки */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Состав закупки</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {COIL_SIZE_OPTIONS.map((size) => {
                        const coils = coilsBySize.get(size) || [];
                        const count = coils.length;
                        const usedLen = coils.reduce((s, c) => s + c.totalLength, 0);
                        const cost = hasPrice && costData
                          ? coils.reduce((s, _, ci) => s + (costData.perCoil[result.coils.indexOf(coils[ci])] || 0), 0)
                          : 0;
                        return (
                          <div key={size}
                            className={`rounded-lg border p-3 text-center transition-colors ${
                              count > 0 ? "border-gray-300 bg-white" : "border-gray-100 bg-gray-50/50 opacity-40"
                            }`}>
                            <div className="text-lg font-bold">{size} м</div>
                            {count > 0 ? (
                              <>
                                <Badge variant="default" className="mt-1">{count} шт.</Badge>
                                <div className="text-xs text-muted-foreground mt-1.5">
                                  {usedLen} / {count * size} м
                                </div>
                                {hasPrice && cost > 0 && (
                                  <div className="text-xs font-semibold text-amber-700 mt-0.5">{formatPrice(cost)}</div>
                                )}
                              </>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Детализация */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Детализация по бухтам</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="coils" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="coils">Бухты</TabsTrigger>
                        <TabsTrigger value="loops">Петли</TabsTrigger>
                      </TabsList>

                      <TabsContent value="coils" className="space-y-3">
                        {result.coils.map((coil) => {
                          const costIdx = result.coils.indexOf(coil);
                          const coilCost = hasPrice && costData ? costData.perCoil[costIdx] : 0;
                          return (
                            <div key={coil.index} className="rounded-lg border bg-white p-4 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-sm font-bold text-gray-700">#{coil.index}</div>
                                  <div>
                                    <span className="font-bold">Бухта {coil.size} м</span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Building2 className="w-3 h-3" />
                                      {[...new Set(coil.loops.map((idx) => loops[idx].floor))].map((f) => `${f} эт.`).join(", ")}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <FillBadge percent={coil.fillPercent} />
                                  <span className="text-sm">Остаток: <WasteSpan meters={coil.waste} /></span>
                                  {hasPrice && coilCost > 0 && (
                                    <Badge variant="outline" className="text-amber-700 border-amber-300">{formatPrice(coilCost)}</Badge>
                                  )}
                                </div>
                              </div>
                              <ColoredBar value={coil.fillPercent} />
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                {coil.loops.map((idx) => {
                                  const loop = loops[idx];
                                  return (
                                    <div key={idx} className="flex items-center justify-between rounded border border-gray-100 bg-gray-50/50 px-2.5 py-1.5 text-sm">
                                      <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className="font-mono text-xs">К{idx + 1}</Badge>
                                        <Badge variant="secondary" className="text-xs px-1.5">{loop.floor} эт.</Badge>
                                      </div>
                                      <span className="text-muted-foreground">
                                        {loop.length}+{reserve}=<span className="font-semibold text-foreground">{loop.length + reserve} м</span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex items-center justify-between pt-1.5 border-t text-xs text-muted-foreground">
                                <span>{coil.loops.length} конт. &middot; {coil.totalLength} м из {coil.size} м</span>
                                <span>Остаток: <WasteSpan meters={coil.waste} /></span>
                              </div>
                            </div>
                          );
                        })}
                      </TabsContent>

                      <TabsContent value="loops" className="space-y-3">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-16">Контур</TableHead>
                                <TableHead className="w-16">Этаж</TableHead>
                                <TableHead className="text-right">Проектная</TableHead>
                                <TableHead className="text-right">С запасом</TableHead>
                                <TableHead>Бухта</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {loops.map((loop, idx) => {
                                const coil = result.coils.find((c) => c.loops.includes(idx));
                                return (
                                  <TableRow key={loop.uid}>
                                    <TableCell className="font-mono font-semibold">К{idx + 1}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs">{loop.floor} эт.</Badge></TableCell>
                                    <TableCell className="text-right">{loop.length} м</TableCell>
                                    <TableCell className="text-right font-medium">{loop.length + reserve} м</TableCell>
                                    <TableCell>
                                      {coil && <Badge variant="secondary" className="font-mono">#{coil.index} ({coil.size} м)</Badge>}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell colSpan={2} className="font-semibold">Итого: {loops.length} конт.</TableCell>
                                <TableCell className="text-right font-semibold">{totalOriginal} м</TableCell>
                                <TableCell className="text-right font-semibold">{totalAdjusted} м</TableCell>
                                <TableCell />
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Спецификация для закупки */}
                <Card className="border-2 border-emerald-200 bg-emerald-50/30" id="specification">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-emerald-800">Спецификация для закупки</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-emerald-100/50">
                            <TableHead>Размер бухты</TableHead>
                            <TableHead className="text-center">Кол-во</TableHead>
                            <TableHead className="text-right">Сумма</TableHead>
                            <TableHead className="text-right">В дело</TableHead>
                            <TableHead className="text-right">Остаток</TableHead>
                            {hasPrice && <TableHead className="text-right">Стоимость</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...coilsBySize.entries()].sort((a, b) => b[0] - a[0]).map(([size, sizeCoils]) => {
                            const count = sizeCoils.length;
                            const totalLen = count * size;
                            const usedLen = sizeCoils.reduce((s, c) => s + c.totalLength, 0);
                            const sizeCost = hasPrice && costData
                              ? sizeCoils.reduce((s, c) => s + (costData.perCoil[result.coils.indexOf(c)] || 0), 0)
                              : 0;
                            return (
                              <TableRow key={size}>
                                <TableCell className="font-bold">{size} м</TableCell>
                                <TableCell className="text-center"><Badge>{count} шт.</Badge></TableCell>
                                <TableCell className="text-right font-medium">{totalLen} м</TableCell>
                                <TableCell className="text-right font-medium">{usedLen} м</TableCell>
                                <TableCell className="text-right"><WasteSpan meters={totalLen - usedLen} /></TableCell>
                                {hasPrice && <TableCell className="text-right font-semibold">{sizeCost > 0 ? formatPrice(sizeCost) : "—"}</TableCell>}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="bg-emerald-100/30">
                            <TableCell className="font-bold">ИТОГО</TableCell>
                            <TableCell className="text-center font-bold">{result.coils.length} шт.</TableCell>
                            <TableCell className="text-right font-bold">{result.totalCoilLength} м</TableCell>
                            <TableCell className="text-right font-bold">{result.totalUsed} м</TableCell>
                            <TableCell className="text-right font-bold"><WasteSpan meters={result.totalWaste} /></TableCell>
                            {hasPrice && (
                              <TableCell className="text-right font-bold text-amber-800">
                                {costData ? formatPrice(costData.total) : "—"}
                              </TableCell>
                            )}
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Экспорт */}
                <div className="flex flex-wrap gap-3 no-print pb-2">
                  <Button variant="outline" onClick={handlePrint} className="gap-2">
                    <Printer className="w-4 h-4" /> Печать / PDF
                  </Button>
                  <Button variant="outline" onClick={handleDownloadHTML} className="gap-2">
                    <FileDown className="w-4 h-4" /> Скачать HTML-отчёт
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("settings")} className="gap-2">
                    <Settings2 className="w-4 h-4" /> Изменить настройки
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Калькулятор бухт тёплого пола &middot; Трубка ⌀16 мм</span>
          <span>{new Date().toLocaleDateString("ru-RU", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </footer>
    </div>
  );
}
