"use client";

import { useState, useMemo, useEffect, startTransition } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Trash2, Ruler, Layers, CheckCircle2, Calculator,
  Building2, FileDown, Printer, Settings2, Package,
  CircleDollarSign, ArrowRight, Info, Languages,
} from "lucide-react";
import {
  optimizeCoilPacking, COIL_SIZE_OPTIONS, calcCoilCost,
  type LoopInput, type PackingResult, type CoilResult,
} from "@/lib/coil-calculator";
import { downloadHTMLReport } from "@/lib/export-report";
import { t as tr, type Lang, LANG_LABELS, detectLang, saveLang } from "@/lib/i18n";

// =============================================================================
// Типы и данные
// =============================================================================

interface LoopEntry { uid: string; floor: number; length: number; }

const STORAGE_KEY = "coil-calc-state";

function loadState(): { loops: LoopEntry[]; sizes: number[]; reserve: number; price: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.loops)) return parsed;
  } catch { /* ignore */ }
  return null;
}

function saveState(loops: LoopEntry[], sizes: number[], reserve: number, price: number) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ loops, sizes, reserve, price })); } catch { /* ignore */ }
}

let _uid = 200;
const uid = () => `u${++_uid}`;

// =============================================================================
// Мини-компоненты
// =============================================================================

function Waste({ m, t: tx }: { m: number; t: ReturnType<typeof tr> }) {
  if (m === 0) return <span className="text-emerald-600 font-bold">0 {tx.meters}</span>;
  if (m <= 5) return <span className="text-emerald-600 font-semibold">{m} {tx.meters}</span>;
  if (m <= 15) return <span className="text-amber-600 font-semibold">{m} {tx.meters}</span>;
  return <span className="text-red-500 font-semibold">{m} {tx.meters}</span>;
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

function money(v: number, lang: Lang) {
  if (lang === "en") return `₽${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return v.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
}

// =============================================================================
// Страница
// =============================================================================

export default function HomePage() {
  // Начинаем с «ru» на сервере и клиенте — избегаем hydration mismatch.
  // После монтирования подхватываем сохранённый язык из localStorage.
  const [lang, setLang] = useState<Lang>("ru");
  const [hydrated, setHydrated] = useState(false);
  const tx = useMemo(() => tr(lang), [lang]);

  useEffect(() => {
    const saved = detectLang();
    startTransition(() => { setLang(saved); setHydrated(true); });
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === "ru" ? "en" : "ru";
    setLang(next);
    saveLang(next);
  };

  const [loops, setLoops] = useState<LoopEntry[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([50, 100, 200]);
  const [reserve, setReserve] = useState(2);
  const [pricePerMeter, setPricePerMeter] = useState(0);
  const [result, setResult] = useState<PackingResult | null>(null);
  const [activeTab, setActiveTab] = useState("loops");

  // Восстановление данных из localStorage после монтирования
  useEffect(() => {
    const state = loadState();
    if (!state) return;
    startTransition(() => {
      if (state.loops.length > 0) setLoops(state.loops);
      if (state.sizes?.length > 0) setSelectedSizes(state.sizes);
      if (typeof state.reserve === "number") setReserve(state.reserve);
      if (typeof state.price === "number") setPricePerMeter(state.price);
    });
  }, []);

  // Сохраняем данные в localStorage при изменениях
  useEffect(() => {
    if (!hydrated) return;
    saveState(loops, selectedSizes, reserve, pricePerMeter);
  }, [loops, selectedSizes, reserve, pricePerMeter, hydrated]);

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

  const removeLoop = (id: string) => { setLoops((p) => p.filter((l) => l.uid !== id)); setResult(null); };

  const updateLoop = (id: string, field: "floor" | "length", val: number) =>
    setLoops((p) => p.map((l) => (l.uid === id ? { ...l, [field]: val } : l)));

  const toggleSize = (size: number, on: boolean) =>
    setSelectedSizes((p) => on ? [...p, size] : p.filter((s) => s !== size));

  const calculate = () => {
    if (!canCalc) return;
    const t0 = performance.now();
    const loopInputs: LoopInput[] = loops.map((l, i) => ({ id: i + 1, floor: l.floor, originalLength: l.length }));
    const res = optimizeCoilPacking(loopInputs, { coilSizes: selectedSizes, reserve });
    const ms = Math.round(performance.now() - t0);
    setResult({ ...res, iterations: ms });
    setActiveTab("result");
  };

  const exportHTML = () => {
    if (!result) return;
    const loopInputs: LoopInput[] = loops.map((l, i) => ({ id: i + 1, floor: l.floor, originalLength: l.length }));
    downloadHTMLReport(loopInputs, result, { coilSizes: selectedSizes, reserve, pricePerMeter: hasPrice ? pricePerMeter : undefined, lang });
  };

  // --- Количество петель по этажам ---
  const floors = useMemo(() => {
    const f = new Map<number, number>();
    loops.forEach((l) => f.set(l.floor, (f.get(l.floor) || 0) + 1));
    return [...f.entries()].sort((a, b) => a[0] - b[0]);
  }, [loops]);

  const fl = (n: number) => lang === "en" ? `fl. ${n}` : `${n} эт.`;
  const fm = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-stone-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-100 shrink-0">
                <Calculator className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">{tx.title}</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {tx.subtitle} &middot; {floors.map(([f, c]) => fm(tx.subtitleItem, { count: c, floor: f })).join(", ")}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={toggleLang} className="gap-1.5 shrink-0">
              <Languages className="w-4 h-4" />
              <span className="text-xs font-medium">{LANG_LABELS[lang === "ru" ? "en" : "ru"]}</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="loops" className="gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tx.tabLoops}</span>
              <Badge variant="secondary" className="ml-0.5 text-xs px-1.5">{loops.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tx.tabSettings}</span>
            </TabsTrigger>
            <TabsTrigger value="result" className="gap-1.5" disabled={!result || !!result.error}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tx.tabResult}</span>
            </TabsTrigger>
          </TabsList>

          {/* ============================================================ */}
          {/* LOOPS                                                           */}
          {/* ============================================================ */}
          <TabsContent value="loops" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{tx.loopsTitle}</CardTitle>
                    <CardDescription className="mt-0.5">{tx.loopsDesc}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setLoops([]); setResult(null); }} disabled={loops.length === 0}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> {tx.clear}
                    </Button>
                    <Button size="sm" onClick={addLoop}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> {tx.add}
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
                        <TableHead className="w-28">{tx.floor}</TableHead>
                        <TableHead>{tx.length}</TableHead>
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
                            <Input type="number" min={0} step={0.5} value={loop.length || ""} placeholder={tx.meters}
                              onChange={(e) => updateLoop(loop.uid, "length", parseFloat(e.target.value) || 0)}
                              className="h-8 w-32" />
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
                          <TableCell className="font-semibold">{fm(tx.loopsCount, { n: loops.length })}</TableCell>
                          <TableCell />
                          <TableCell className="font-semibold">{totalOriginal} {tx.meters}</TableCell>
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
                        <Label className="text-xs text-muted-foreground shrink-0">{lang === "en" ? "Fl." : "Эт."}</Label>
                        <Input type="number" min={1} max={99} value={loop.floor}
                          onChange={(e) => updateLoop(loop.uid, "floor", parseInt(e.target.value) || 1)}
                          className="h-7 w-14 text-center text-sm" />
                      </div>
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <Label className="text-xs text-muted-foreground shrink-0">{tx.meters}</Label>
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
                      {fm(tx.loopsCount, { n: loops.length })} &middot; {totalOriginal} {tx.meters}
                    </div>
                  )}
                </div>

                {loops.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">{tx.noLoops}</div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 text-sm text-muted-foreground px-1">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p dangerouslySetInnerHTML={{ __html: tx.hintGoSettings }} />
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("settings")} className="gap-2">{tx.next} <ArrowRight className="w-4 h-4" /></Button>
            </div>
          </TabsContent>

          {/* ============================================================ */}
          {/* SETTINGS                                                        */}
          {/* ============================================================ */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{tx.coilSizesTitle}</CardTitle>
                <CardDescription>{tx.coilSizesDesc}</CardDescription>
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
                        <span className="font-bold text-sm">{size} {tx.meters}</span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{tx.params}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{tx.reserve}</Label>
                    <Input type="number" min={0} max={20} step={0.5} value={reserve}
                      onChange={(e) => setReserve(parseFloat(e.target.value) || 0)}
                      className="h-9 w-32" />
                    <p className="text-xs text-muted-foreground">{tx.reserveHint}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">{tx.pricePerMeter}</Label>
                    <Input type="number" min={0} step={1} value={pricePerMeter || ""}
                      placeholder={tx.pricePlaceholder}
                      onChange={(e) => setPricePerMeter(parseFloat(e.target.value) || 0)}
                      className="h-9 w-40" />
                    <p className="text-xs text-muted-foreground">{tx.priceHint}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3 py-1">
              <Button size="lg" onClick={calculate} disabled={!canCalc} className="px-10 gap-2">
                <Calculator className="w-4 h-4" /> {tx.calculate}
              </Button>
              {loops.length > 0 && !loops.every((l) => l.length > 0) && (
                <p className="text-sm text-amber-600">{tx.warnNoLength}</p>
              )}
              {selectedSizes.length === 0 && (
                <p className="text-sm text-amber-600">{tx.warnNoSize}</p>
              )}
            </div>
          </TabsContent>

          {/* ============================================================ */}
          {/* RESULT                                                          */}
          {/* ============================================================ */}
          <TabsContent value="result" className="space-y-4">
            {!result && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <Calculator className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-1">{tx.noResult}</p>
                  <p className="text-sm mb-4">{tx.noResultHint}</p>
                  <Button variant="outline" onClick={() => setActiveTab("settings")}>{tx.openSettings}</Button>
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
                    <p className="font-semibold text-red-800">{tx.error}</p>
                    <p className="text-sm text-red-600">{result.error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {result && !result.error && result.coils.length > 0 && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  <Card className="py-4"><CardContent className="px-4">
                    <div className="flex items-center gap-1.5 mb-1"><Package className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{tx.coils}</span></div>
                    <div className="text-2xl font-bold">{result.coils.length}</div>
                    <div className="text-xs text-muted-foreground">{fm(tx.ofPipe, { n: result.totalCoilLength })}</div>
                  </CardContent></Card>
                  <Card className="py-4"><CardContent className="px-4">
                    <div className="flex items-center gap-1.5 mb-1"><Ruler className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{tx.used}</span></div>
                    <div className="text-2xl font-bold">{result.totalUsed} {tx.meters}</div>
                    <div className="text-xs text-muted-foreground">{fm(tx.designM, { n: totalOriginal })}</div>
                  </CardContent></Card>
                  <Card className="py-4"><CardContent className="px-4">
                    <div className="flex items-center gap-1.5 mb-1"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{tx.waste}</span></div>
                    <div className="text-2xl font-bold"><Waste m={result.totalWaste} t={tx} /></div>
                    <div className="text-xs text-muted-foreground">{fm(tx.ofPurchase, { pct: ((result.totalWaste / result.totalCoilLength) * 100).toFixed(1) })}</div>
                  </CardContent></Card>
                  <Card className="py-4"><CardContent className="px-4">
                    <div className="flex items-center gap-1.5 mb-1"><CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">{tx.efficiency}</span></div>
                    <div className="text-2xl font-bold">{((1 - result.totalWaste / result.totalCoilLength) * 100).toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground">{fm(tx.ms, { n: result.iterations })}</div>
                  </CardContent></Card>
                  {hasPrice && cost && (
                    <Card className="py-4 border-amber-200 bg-amber-50/50"><CardContent className="px-4">
                      <div className="flex items-center gap-1.5 mb-1"><CircleDollarSign className="w-3.5 h-3.5 text-amber-600" /><span className="text-xs text-amber-700">{tx.cost}</span></div>
                      <div className="text-2xl font-bold text-amber-800">{money(cost.total, lang)}</div>
                      <div className="text-xs text-amber-600">{fm(tx.perMeter, { n: pricePerMeter })}</div>
                    </CardContent></Card>
                  )}
                </div>

                {/* Purchase composition */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">{tx.purchaseComp}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                      {COIL_SIZE_OPTIONS.map((size) => {
                        const sc = coilsBySize.get(size) || [];
                        const cnt = sc.length;
                        if (cnt === 0) return (
                          <div key={size} className="rounded-lg border border-gray-100 bg-gray-50/50 opacity-40 p-3 text-center">
                            <div className="text-lg font-bold">{size} {tx.meters}</div><span className="text-xs text-muted-foreground">—</span>
                          </div>
                        );
                        const used = sc.reduce((s, c) => s + c.totalLength, 0);
                        const scCost = hasPrice && cost ? sc.reduce((s, c) => s + (cost.perCoil[result.coils.indexOf(c)] || 0), 0) : 0;
                        return (
                          <div key={size} className="rounded-lg border border-gray-300 bg-white p-3 text-center">
                            <div className="text-lg font-bold">{size} {tx.meters}</div>
                            <Badge variant="default" className="mt-1">{fm(tx.pcs, { n: cnt })}</Badge>
                            <div className="text-xs text-muted-foreground mt-1.5">{used} / {cnt * size} {tx.meters}</div>
                            {hasPrice && scCost > 0 && <div className="text-xs font-semibold text-amber-700 mt-0.5">{money(scCost, lang)}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Details */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">{tx.coilDetails}</CardTitle></CardHeader>
                  <CardContent>
                    <Tabs defaultValue="coils" className="space-y-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="coils">{tx.coilsTab}</TabsTrigger>
                        <TabsTrigger value="loops">{tx.loopsTab}</TabsTrigger>
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
                                    <span className="font-bold">{fm(tx.coilLabel, { size: coil.size })}</span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Building2 className="w-3 h-3" />
                                      {[...new Set(coil.loops.map((i) => loops[i].floor))].map((f) => fl(f)).join(", ")}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Fill pct={coil.fillPercent} />
                                  <span className="text-sm">{tx.remainder}: <Waste m={coil.waste} t={tx} /></span>
                                  {hasPrice && coilCost > 0 && <Badge variant="outline" className="text-amber-700 border-amber-300">{money(coilCost, lang)}</Badge>}
                                </div>
                              </div>
                              <Bar pct={coil.fillPercent} />
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                                {coil.loops.map((i) => {
                                  const l = loops[i];
                                  return (
                                    <div key={i} className="flex items-center justify-between rounded border border-gray-100 bg-gray-50/50 px-2.5 py-1.5 text-sm">
                                      <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className="font-mono text-xs">{fm(tx.circuitShort, { n: i + 1 })}</Badge>
                                        <Badge variant="secondary" className="text-xs px-1.5">{fl(l.floor)}</Badge>
                                      </div>
                                      <span className="text-muted-foreground">
                                        {l.length}+{reserve}=<span className="font-semibold text-foreground">{l.length + reserve} {tx.meters}</span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="flex items-center justify-between pt-1.5 border-t text-xs text-muted-foreground">
                                <span>{fm(tx.circuits, { n: coil.loops.length })} &middot; {coil.totalLength} {tx.meters} {lang === "en" ? "of" : "из"} {coil.size} {tx.meters}</span>
                                <span>{tx.remainder}: <Waste m={coil.waste} t={tx} /></span>
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
                                <TableHead className="w-16">{tx.circuit}</TableHead>
                                <TableHead className="w-16">{tx.floor}</TableHead>
                                <TableHead className="text-right">{tx.project}</TableHead>
                                <TableHead className="text-right">{tx.withReserve}</TableHead>
                                <TableHead>{tx.coil}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {loops.map((l, i) => {
                                const coil = result.coils.find((c) => c.loops.includes(i));
                                return (
                                  <TableRow key={l.uid}>
                                    <TableCell className="font-mono font-semibold">{fm(tx.circuitShort, { n: i + 1 })}</TableCell>
                                    <TableCell><Badge variant="outline" className="text-xs">{fl(l.floor)}</Badge></TableCell>
                                    <TableCell className="text-right">{l.length} {tx.meters}</TableCell>
                                    <TableCell className="text-right font-medium">{l.length + reserve} {tx.meters}</TableCell>
                                    <TableCell>{coil && <Badge variant="secondary" className="font-mono">#{coil.index} ({coil.size} {tx.meters})</Badge>}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                            <TableFooter>
                              <TableRow>
                                <TableCell colSpan={2} className="font-semibold">{fm(tx.totalLabel, { n: loops.length })}</TableCell>
                                <TableCell className="text-right font-semibold">{totalOriginal} {tx.meters}</TableCell>
                                <TableCell className="text-right font-semibold">{totalAdjusted} {tx.meters}</TableCell>
                                <TableCell />
                              </TableRow>
                            </TableFooter>
                          </Table>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Specification */}
                <Card className="border-2 border-emerald-200 bg-emerald-50/30">
                  <CardHeader className="pb-3"><CardTitle className="text-base text-emerald-800">{tx.specTitle}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-emerald-100/50">
                            <TableHead>{tx.coilSize}</TableHead>
                            <TableHead className="text-center">{tx.qty}</TableHead>
                            <TableHead className="text-right">{tx.sum}</TableHead>
                            <TableHead className="text-right">{tx.inUse}</TableHead>
                            <TableHead className="text-right">{tx.remainderShort}</TableHead>
                            {hasPrice && <TableHead className="text-right">{tx.cost}</TableHead>}
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
                                <TableCell className="font-bold">{size} {tx.meters}</TableCell>
                                <TableCell className="text-center"><Badge>{cnt} {tx.pieces}</Badge></TableCell>
                                <TableCell className="text-right font-medium">{tl} {tx.meters}</TableCell>
                                <TableCell className="text-right font-medium">{ul} {tx.meters}</TableCell>
                                <TableCell className="text-right"><Waste m={tl - ul} t={tx} /></TableCell>
                                {hasPrice && <TableCell className="text-right font-semibold">{scCost > 0 ? money(scCost, lang) : "—"}</TableCell>}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                        <TableFooter>
                          <TableRow className="bg-emerald-100/30">
                            <TableCell className="font-bold">{tx.grandTotal}</TableCell>
                            <TableCell className="text-center font-bold">{result.coils.length} {tx.pieces}</TableCell>
                            <TableCell className="text-right font-bold">{result.totalCoilLength} {tx.meters}</TableCell>
                            <TableCell className="text-right font-bold">{result.totalUsed} {tx.meters}</TableCell>
                            <TableCell className="text-right font-bold"><Waste m={result.totalWaste} t={tx} /></TableCell>
                            {hasPrice && <TableCell className="text-right font-bold text-amber-800">{cost ? money(cost.total, lang) : "—"}</TableCell>}
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Export */}
                <div className="flex flex-wrap gap-3 no-print pb-2">
                  <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer className="w-4 h-4" /> {tx.printPdf}</Button>
                  <Button variant="outline" onClick={exportHTML} className="gap-2"><FileDown className="w-4 h-4" /> {tx.downloadHtml}</Button>
                  <Button variant="outline" onClick={() => setActiveTab("settings")} className="gap-2"><Settings2 className="w-4 h-4" /> {tx.modify}</Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{tx.footerText}</span>
          <span>{new Date().toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
        </div>
      </footer>
    </div>
  );
}
