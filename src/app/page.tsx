"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Ruler, Layers, CheckCircle2, Calculator,
  Building2, FileDown, Printer, Settings2, Package,
  CircleDollarSign, ArrowRight, Info,
} from "lucide-react";
import {
  optimizeCoilPacking, COIL_SIZE_OPTIONS, calcCoilCost,
  type LoopInput, type PackingResult, type CoilResult, type OptimizationOptions,
} from "@/lib/coil-calculator";
import { downloadHTMLReport } from "@/lib/export-report";

// =============================================================================
// Типы и данные
// =============================================================================

interface LoopEntry { uid: string; floor: number; length: number; }

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

let _uid = 200;
const uid = () => `u${++_uid}`;

// =============================================================================
// Мини-компоненты
// =============================================================================

function Waste({ m }: { m: number }) {
  if (m === 0) return <span className="text-emerald-600 font-bold">0 м</span>;
  if (m <= 5) return <span className="text-emerald-600 font-semibold">{m} м</span>;
  if (m <= 15) return <span className="text-amber-600 font-semibold">{m} м</span>;
  return <span className="text-red-500 font-semibold">{m} м</span>;
}

function Fill({ pct }: { pct: number }) {
  const cls = pct >= 99 ? "bg-emerald-100 text-emerald-800 border-emerald-300"
    : pct >= 90 ? "bg-green-100 text-green-800 border-green-300"
    : pct >= 75 ? "bg-amber-100 text-amber-800 border-amber-300"
    : "bg-red-100 text-red-800 border-red-300";
  return <Badge className={`${cls} hover:opacity-80`}>{pct}%</Badge>;
}

function Bar({ pct }: { pct: number }) {
  const color = pct >= 99 ? "bg-emerald-500" : pct >= 90 ? "bg-green-500" : pct >= 75 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function money(v: number) {
  return v.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
}

// =============================================================================
// Страница
// =============================================================================

export default function HomePage() {
  const [loops, setLoops] = useState<LoopEntry[]>(DEFAULT_LOOPS);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([50, 100, 200]);
  const [reserve, setReserve] = useState(2);
  const [pricePerMeter, setPricePerMeter] = useState(0);
  const [result, setResult] = useState<PackingResult | null>(null);
  const [activeTab, setActiveTab] = useState("loops");

  // --- Производные ---
  const totalOriginal = useMemo(() => loops.reduce((s, l) => s + l.length, 0), [loops]);
  const totalAdjusted = useMemo(() => loops.reduce((s, l) => s + l.length + reserve, 0), [loops, reserve]);
  const canCalc = loops.length > 0 && loops.every((l) => l.length > 0 && l.floor >= 1) && selectedSizes.length > 0;
  const hasPrice = pricePerMeter > 0;

  const coilsBySize = useMemo(() => {
    if (!result) return new Map<number, CoilResult[]>();
    const m = new Map<number, CoilResult[]>();
    for (const c of result.coils) { const a = m.get(c.size) || []; a.push(c); m.set(c.size, a); }
    return m;
  }, [result]);

  const cost = useMemo(() => {
    if (!result || !hasPrice) return null;
    return calcCoilCost(result.coils, pricePerMeter);
  }, [result, hasPrice, pricePerMeter]);

  // --- Обработчики ---
  const addLoop = () => {
    const lastFloor = loops.length > 0 ? loops[loops.length - 1].floor : 1;
    setLoops((p) => [...p, { uid: uid(), floor: lastFloor, length: 0 }]);
  };

  const removeLoop = (id: string) => setLoops((p) => p.filter((l) => l.uid !== id));

  const updateLoop = (id: string, field: "floor" | "length", val: number) =>
    setLoops((p) => p.map((l) => (l.uid === id ? { ...l, [field]: val } : l)));

  const toggleSize = (size: number, on: boolean) =>
    setSelectedSizes((p) => on ? [...p, size] : p.filter((s) => s !== size));

  const calculate = () => {
    if (!canCalc) return;
    const t0 = performance.now();
    const loopInputs: LoopInput[] = loops.map((l, i) => ({ id: i + 1, floor: l.floor, originalLength: l.length }));
    const res = optimizeCoilPacking(loopInputs, { coilSizes: selectedSizes, reserve, pricePerMeter: hasPrice ? pricePerMeter : undefined });
    const ms = Math.round(performance.now() - t0);
    setResult({ ...res, iterations: ms });
    setActiveTab("result");
  };

  const exportHTML = () => {
    if (!result) return;
    const loopInputs: LoopInput[] = loops.map((l, i) => ({ id: i + 1, floor: l.floor, originalLength: l.length }));
    downloadHTMLReport(loopInputs, result, { coilSizes: selectedSizes, reserve, pricePerMeter: hasPrice ? pricePerMeter : undefined });
  };

  // --- Количество петель по этажам ---
  const floors = useMemo(() => {
    const f = new Map<number, number>();
    loops.forEach((l) => f.set(l.floor, (f.get(l.floor) || 0) + 1));
    return [...f.entries()].sort((a, b) => a[0] - b[0]);
  }, [loops]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-stone-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 shrink-0">
              <Calculator className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Калькулятор бухт тёплого пола</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Оптимизация закупки трубки ⌀16 мм &middot; {floors.map(([f, c]) => `${c} конт. (${f} эт.)`).join(", ")}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
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
            </TabsTrigger>
            <TabsTrigger value="result" className="gap-1.5" disabled={!result || !!result.error}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Результат</span>
            </TabsTrigger>
          </TabsList>

          {/* ============================================================ */}
          {/* ПЕТЛИ                                                             */}
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
                    <Button variant="outline" size="sm" onClick={() => { setLoops([]); setResult(null); }} disabled={loops.length === 0}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Очистить
                    </Button>
                    <Button size="sm" onClick={addLoop}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Добавить
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                {/* Desktop table */}
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
                            {loop.length > 0 ? loop.length + reserve : "—"}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeLoop(loop.uid)}><Trash2 className="w-3.5 h-3.5" /></Button>
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

                {/* Mobile cards */}
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
                        onClick={() => removeLoop(loop.uid)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  ))}
                  {loops.length > 0 && (
                    <div className="text-xs text-muted-foreground text-center pt-1">
                      {loops.length} петель &middot; {totalOriginal} м проектных &middot; {totalAdjusted} м с запасом
                    </div>
                  )}
                </div>

                {loops.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">Нет петель. Нажмите «Добавить».</div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 text-sm text-muted-foreground px-1">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p>Далее перейдите на вкладку <strong>«Настройки»</strong> для выбора бухт и запуска расчёта.</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("settings")} className="gap-2">Далее <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </TabsContent>

          {/* ============================================================ */}
          {/* НАСТРОЙКИ                                                         */}
          {/* ============================================================ */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Доступные размеры бухт</CardTitle>
                <CardDescription>Отметьте размеры, доступные для закупки</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2.5">
                  {COIL_SIZE_OPTIONS.map((size) => {
                    const on = selectedSizes.includes(size);
                    return (
                      <label key={size}
                        className={`flex items-center gap-2 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all select-none ${
                          on ? "border-gray-900 bg-gray-900 text-white shadow-md" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}>
                        <Checkbox checked={on} onCheckedChange={(c) => toggleSize(size, !!c)}
                          className={on ? "border-white bg-white data-[state=checked]:bg-white data-[state=checked]:text-gray-900" : ""} />
                        <span className="font-bold text-sm">{size} м</span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Параметры</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Запас на подключение (м)</Label>
                    <Input type="number" min={0} max={20} step={0.5} value={reserve}
                      onChange={(e) => setReserve(parseFloat(e.target.value) || 0)}
                      className="h-9 w-32" />
                    <p className="text-xs text-muted-foreground">Добавляется к каждой петле</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Цена за метр (₽)</Label>
                    <Input type="number" min={0} step={1} value={pricePerMeter || ""}
                      placeholder="0 — не указывать"
                      onChange={(e) => setPricePerMeter(parseFloat(e.target.value) || 0)}
                      className="h-9 w-40" />
                    <p className="text-xs text-muted-foreground">Для расчёта стоимости закупки</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3 py-1">
              <Button size="lg" onClick={calculate} disabled={!canCalc} className="px-10 gap-2">
                <Calculator className="w-4 h-4" /> Рассчитать
              </Button>
              {loops.length > 0 && !loops.every((l) => l.length > 0) && (
                <p className="text-sm text-amber-600">Укажите длину для всех петель</p>
              )}
              {selectedSizes.length === 0 && (
                <p className="text-sm text-amber-600">Выберите хотя бы один размер бухты</p>
              )}
            </div>
          </TabsContent>

          {/* ============================================================ */}
          {/* РЕЗУЛЬТАТ                                                         */}
          {/* ============================================================ */}
          <TabsContent value="result" className="space-y-4">
            {!result && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Calculator className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-1">Расчёт ещё не выполнен</p>
                  <p className="text-sm mb-4">Перейдите на вкладку «Настройки» и нажмите «Рассчитать»</p>
                  <Button variant="outline" onClick={() => setActiveTab("settings")}>Открыть настройки</Button>
                </CardContent>
              </Card>
            )}

            {result?.error && (
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="flex items-center gap-3 py-6">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 shrink-0">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">Ошибка</p>
                    <p className="text-sm text-red-600">{result.error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {result && !result.error && result.coils.length > 0 && (
              <>
                {/* Сводка */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <Card className="py-4"><CardContent className="px-4">
                    <div className="flex items-center gap-1.5 mb-1"><Package className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Бухт</span></div>
                    <div className="text-2xl font-bold">{result.coils.length}</div>
                    <div className="text-xs text-muted-foreground">{result.totalCoilLength} м трубки</div>
                  </CardContent></Card>
                  <Card className="py-4"><CardContent className="px-4">
                    <div className="flex items-center gap-1.5 mb-1"><Ruler className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Использовано</span></div>
                    <div className="text-2xl font-bold">{result.totalUsed} м</div>
                    <div className="text-xs text-muted-foreground">{totalOriginal} м проектных</div>
                  </CardContent></Card>
                  <Card className="py-4"><CardContent className="px-4">
                    <div className="flex items-center gap-1.5 mb-1"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Остаток</span></div>
                    <div className="text-2xl font-bold"><Waste m={result.totalWaste} /></div>
                    <div className="text-xs text-muted-foreground">{((result.totalWaste / result.totalCoilLength) * 100).toFixed(1)}% от закупки</div>
                  </CardContent></Card>
                  <Card className="py-4"><CardContent className="px-4">
                    <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Эффективность</span></div>
                    <div className="text-2xl font-bold">{((1 - result.totalWaste / result.totalCoilLength) * 100).toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">{result.iterations} мс</div>
                  </CardContent></Card>
                  {hasPrice && cost && (
                    <Card className="py-4 border-amber-200 bg-amber-50/50"><CardContent className="px-4">
                      <div className="flex items-center gap-1.5 mb-1"><CircleDollarSign className="w-3.5 h-3.5 text-amber-600" /><span className="text-xs text-amber-700">Стоимость</span></div>
                      <div className="text-2xl font-bold text-amber-800">{money(cost.total)}</div>
                      <div className="text-xs text-amber-600">{pricePerMeter} ₽/м</div>
                    </CardContent></Card>
                  )}
                </div>

                {/* Состав закупки */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Состав закупки</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {COIL_SIZE_OPTIONS.map((size) => {
                        const sc = coilsBySize.get(size) || [];
                        const cnt = sc.length;
                        if (cnt === 0) return (
                          <div key={size} className="rounded-lg border border-gray-100 bg-gray-50/50 opacity-40 p-3 text-center">
                            <div className="text-lg font-bold">{size} м</div><span className="text-xs text-muted-foreground">—</span>
                          </div>
                        );
                        const used = sc.reduce((s, c) => s + c.totalLength, 0);
                        const scCost = hasPrice && cost ? sc.reduce((s, c) => s + (cost.perCoil[result.coils.indexOf(c)] || 0), 0) : 0;
                        return (
                          <div key={size} className="rounded-lg border border-gray-300 bg-white p-3 text-center">
                            <div className="text-lg font-bold">{size} м</div>
                            <Badge variant="default" className="mt-1">{cnt} шт.</Badge>
                            <div className="text-xs text-muted-foreground mt-1.5">{used} / {cnt * size} м</div>
                            {hasPrice && scCost > 0 && <div className="text-xs font-semibold text-amber-700 mt-0.5">{money(scCost)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Детализация */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Детализация по бухтам</CardTitle></CardHeader>
                  <CardContent>
                    <Tabs defaultValue="coils" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="coils">Бухты</TabsTrigger>
                        <TabsTrigger value="loops">Петли</TabsTrigger>
                      </TabsList>

                      <TabsContent value="coils" className="space-y-3">
                        {result.coils.map((coil) => {
                          const ci = result.coils.indexOf(coil);
                          const coilCost = hasPrice && cost ? cost.perCoil[ci] : 0;
                          return (
                            <div key={coil.index} className="rounded-lg border bg-white p-4 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-100 text-sm font-bold text-gray-700">#{coil.index}</div>
                                  <div>
                                    <span className="font-bold">Бухта {coil.size} м</span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Building2 className="w-3 h-3" />
                                      {[...new Set(coil.loops.map((i) => loops[i].floor))].map((f) => `${f} эт.`).join(", ")}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Fill pct={coil.fillPercent} />
                                  <span className="text-sm">Остаток: <Waste m={coil.waste} /></span>
                                  {hasPrice && coilCost > 0 && <Badge variant="outline" className="text-amber-700 border-amber-300">{money(coilCost)}</Badge>}
                                </div>
                              </div>
                              <Bar pct={coil.fillPercent} />
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                {coil.loops.map((i) => {
                                  const l = loops[i];
                                  return (
                                    <div key={i} className="flex items-center justify-between rounded border border-gray-100 bg-gray-50/50 px-2.5 py-1.5 text-sm">
                                      <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className="font-mono text-xs">К{i + 1}</Badge>
                                        <Badge variant="secondary" className="text-xs px-1.5">{l.floor} эт.</Badge>
                                      </div>
                                      <span className="text-muted-foreground">
                                        {l.length}+{reserve}=<span className="font-semibold text-foreground">{l.length + reserve} м</span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex items-center justify-between pt-1.5 border-t text-xs text-muted-foreground">
                                <span>{coil.loops.length} конт. &middot; {coil.totalLength} м из {coil.size} м</span>
                                <span>Остаток: <Waste m={coil.waste} /></span>
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
                              {loops.map((l, i) => {
                                const coil = result.coils.find((c) => c.loops.includes(i));
                                return (
                                  <TableRow key={l.uid}>
                                    <TableCell className="font-mono font-semibold">К{i + 1}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs">{l.floor} эт.</Badge></TableCell>
                                    <TableCell className="text-right">{l.length} м</TableCell>
                                    <TableCell className="text-right font-medium">{l.length + reserve} м</TableCell>
                                    <TableCell>{coil && <Badge variant="secondary" className="font-mono">#{coil.index} ({coil.size} м)</Badge>}</TableCell>
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

                {/* Спецификация */}
                <Card className="border-2 border-emerald-200 bg-emerald-50/30">
                  <CardHeader className="pb-3"><CardTitle className="text-base text-emerald-800">Спецификация для закупки</CardTitle></CardHeader>
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
                          {[...coilsBySize.entries()].sort((a, b) => b[0] - a[0]).map(([size, sc]) => {
                            const cnt = sc.length;
                            const tl = cnt * size;
                            const ul = sc.reduce((s, c) => s + c.totalLength, 0);
                            const scCost = hasPrice && cost ? sc.reduce((s, c) => s + (cost.perCoil[result.coils.indexOf(c)] || 0), 0) : 0;
                            return (
                              <TableRow key={size}>
                                <TableCell className="font-bold">{size} м</TableCell>
                                <TableCell className="text-center"><Badge>{cnt} шт.</Badge></TableCell>
                                <TableCell className="text-right font-medium">{tl} м</TableCell>
                                <TableCell className="text-right font-medium">{ul} м</TableCell>
                                <TableCell className="text-right"><Waste m={tl - ul} /></TableCell>
                                {hasPrice && <TableCell className="text-right font-semibold">{scCost > 0 ? money(scCost) : "—"}</TableCell>}
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
                            <TableCell className="text-right font-bold"><Waste m={result.totalWaste} /></TableCell>
                            {hasPrice && <TableCell className="text-right font-bold text-amber-800">{cost ? money(cost.total) : "—"}</TableCell>}
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Экспорт */}
                <div className="flex flex-wrap gap-3 no-print pb-2">
                  <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" /> Печать / PDF</Button>
                  <Button variant="outline" onClick={exportHTML} className="gap-2"><FileDown className="w-4 h-4" /> Скачать HTML</Button>
                  <Button variant="outline" onClick={() => setActiveTab("settings")} className="gap-2"><Settings2 className="w-4 h-4" /> Изменить</Button>
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
