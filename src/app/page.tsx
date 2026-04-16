"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Separator,
} from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  Ruler,
  Scissors,
  Layers,
  CheckCircle2,
  ArrowRightLeft,
  Building2,
  Timer,
  TrendingDown,
  Calculator,
} from "lucide-react";
import {
  optimizeCoilPacking,
  prepareLoops,
  type LoopInput,
  type PackingResult,
  type CoilResult,
} from "@/lib/coil-calculator";

// =============================================================================
// Исходные данные
// =============================================================================

const RAW_LOOPS: LoopInput[] = [
  // 1 этаж
  { id: 1, floor: 1, originalLength: 17 },
  { id: 2, floor: 1, originalLength: 54 },
  { id: 3, floor: 1, originalLength: 78 },
  { id: 4, floor: 1, originalLength: 75 },
  { id: 5, floor: 1, originalLength: 85 },
  { id: 6, floor: 1, originalLength: 83 },
  { id: 7, floor: 1, originalLength: 38 },
  { id: 8, floor: 1, originalLength: 79 },
  { id: 9, floor: 1, originalLength: 86 },
  { id: 10, floor: 1, originalLength: 86 },
  // 2 этаж
  { id: 11, floor: 2, originalLength: 70 },
  { id: 12, floor: 2, originalLength: 74 },
  { id: 13, floor: 2, originalLength: 73 },
  { id: 14, floor: 2, originalLength: 72 },
  { id: 15, floor: 2, originalLength: 68 },
  { id: 16, floor: 2, originalLength: 72 },
  { id: 17, floor: 2, originalLength: 56 },
  { id: 18, floor: 2, originalLength: 65 },
  { id: 19, floor: 2, originalLength: 40 },
];

const RESERVE = 2; // м

// =============================================================================
// Вспомогательные компоненты
// =============================================================================

function WasteColor({ meters }: { meters: number }) {
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

function ProgressColored({ value, className }: { value: number; className?: string }) {
  const getColor = (v: number) => {
    if (v >= 99) return "bg-emerald-500";
    if (v >= 90) return "bg-green-500";
    if (v >= 75) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className={`relative h-3 w-full overflow-hidden rounded-full bg-muted ${className || ""}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${getColor(value)}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

// =============================================================================
// Основная страница
// =============================================================================

export default function HomePage() {
  const [elapsed, setElapsed] = useState(0);

  const result = useMemo<PackingResult>(() => {
    const t0 = performance.now();
    const res = optimizeCoilPacking(RAW_LOOPS);
    setElapsed(Math.round(performance.now() - t0));
    return res;
  }, []);

  const loops = useMemo(() => prepareLoops(RAW_LOOPS), []);
  const floor1Loops = loops.filter((l) => l.floor === 1);
  const floor2Loops = loops.filter((l) => l.floor === 2);

  const coilsBySize = useMemo(() => {
    const map = new Map<number, CoilResult[]>();
    for (const coil of result.coils) {
      const arr = map.get(coil.size) || [];
      arr.push(coil);
      map.set(coil.size, arr);
    }
    return map;
  }, [result]);

  const totalOriginal = RAW_LOOPS.reduce((s, l) => s + l.originalLength, 0);
  const totalAdjusted = loops.reduce((s, l) => s + l.adjustedLength, 0);



  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-stone-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
              <Calculator className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                Калькулятор бухт тёплого пола
              </h1>
              <p className="text-sm text-muted-foreground">
                Оптимизация закупки трубок ⌀16 мм &middot; 19 петель &middot; 2 этажа
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Сводные карточки */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="py-4">
            <CardContent className="px-4 sm:px-6">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Бухт всего</span>
              </div>
              <div className="text-2xl font-bold">{result.coils.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {result.totalCoilLength} м трубки
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardContent className="px-4 sm:px-6">
              <div className="flex items-center gap-2 mb-1">
                <Ruler className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Использовано</span>
              </div>
              <div className="text-2xl font-bold">{result.totalUsed} м</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                из {totalOriginal} м проектных
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardContent className="px-4 sm:px-6">
              <div className="flex items-center gap-2 mb-1">
                <Scissors className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Суммарный остаток</span>
              </div>
              <div className="text-2xl font-bold">
                <WasteColor meters={result.totalWaste} />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {((result.totalWaste / result.totalCoilLength) * 100).toFixed(1)}% от закупки
              </div>
            </CardContent>
          </Card>

          <Card className="py-4">
            <CardContent className="px-4 sm:px-6">
              <div className="flex items-center gap-2 mb-1">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Расчёт</span>
              </div>
              <div className="text-2xl font-bold">{result.iterations.toLocaleString("ru")}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                итераций за {elapsed} мс
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Состав по размерам бухт */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="w-5 h-5" />
              Состав закупки по размерам бухт
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[200, 100, 50].map((size) => {
                const coils = coilsBySize.get(size) || [];
                const count = coils.length;
                const totalLen = coils.reduce((s, c) => s + c.totalLength, 0);
                const totalWaste = coils.reduce((s, c) => s + c.waste, 0);
                return (
                  <div
                    key={size}
                    className={`rounded-lg border p-4 ${
                      count > 0
                        ? "bg-white border-gray-200"
                        : "bg-gray-50 border-gray-100 opacity-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold">{size} м</span>
                      <Badge variant={count > 0 ? "default" : "secondary"}>
                        {count} шт.
                      </Badge>
                    </div>
                    {count > 0 ? (
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <div>Трубы: {totalLen} м</div>
                        <div>Остаток: <WasteColor meters={totalWaste} /></div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Не требуется
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Основное содержимое — табы */}
        <Tabs defaultValue="coils" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="coils">Бухты</TabsTrigger>
            <TabsTrigger value="loops">Петли</TabsTrigger>
            <TabsTrigger value="source">Исходные данные</TabsTrigger>
          </TabsList>

          {/* ========== Вкладка: Бухты ========== */}
          <TabsContent value="coils" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ArrowRightLeft className="w-5 h-5" />
                  Детализация по бухтам
                </CardTitle>
                <CardDescription>
                  Каждая бухта с указанием контуров, суммарной длины и остатка
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.coils.map((coil) => (
                  <div
                    key={coil.index}
                    className="rounded-lg border border-gray-200 bg-white p-4 space-y-3"
                  >
                    {/* Заголовок бухты */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-9 h-9 rounded-md bg-gray-100 text-sm font-bold text-gray-700">
                          #{coil.index}
                        </div>
                        <div>
                          <span className="font-bold text-lg">Бухта {coil.size} м</span>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="w-3.5 h-3.5" />
                            {coil.loops.some((idx) => loops[idx].floor === 1) && "1 этаж"}
                            {coil.loops.some((idx) => loops[idx].floor === 1) &&
                              coil.loops.some((idx) => loops[idx].floor === 2) &&
                              " + "}
                            {coil.loops.some((idx) => loops[idx].floor === 2) && "2 этаж"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <FillBadge percent={coil.fillPercent} />
                        <span className="text-sm text-muted-foreground">
                          Остаток: <WasteColor meters={coil.waste} />
                        </span>
                      </div>
                    </div>

                    {/* Прогресс-бар */}
                    <ProgressColored value={coil.fillPercent} />

                    {/* Петли в бухте */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {coil.loops.map((idx) => {
                        const loop = loops[idx];
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50/50 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                К{loop.id}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-xs px-1.5"
                              >
                                {loop.floor} эт.
                              </Badge>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">
                                {loop.originalLength}+{RESERVE}=
                              </span>
                              <span className="font-semibold">
                                {loop.adjustedLength} м
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Итог по бухте */}
                    <div className="flex items-center justify-between pt-2 border-t text-sm">
                      <span className="text-muted-foreground">
                        {coil.loops.length} конт. &middot;{" "}
                        {coil.totalLength} м из {coil.size} м
                      </span>
                      <span className="font-medium">
                        Остаток: <WasteColor meters={coil.waste} />
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== Вкладка: Петли ========== */}
          <TabsContent value="loops" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Layers className="w-5 h-5" />
                  Распределение петель по бухтам
                </CardTitle>
                <CardDescription>
                  Для каждого контура указана назначенная бухта
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Контур</TableHead>
                      <TableHead className="w-16">Этаж</TableHead>
                      <TableHead className="text-right">Проектная</TableHead>
                      <TableHead className="text-right">С запасом +{RESERVE}м</TableHead>
                      <TableHead>Бухта</TableHead>
                      <TableHead className="text-right">Размер бухты</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loops.map((loop, idx) => {
                      const assignedCoil = result.coils.find((c) =>
                        c.loops.includes(idx)
                      );
                      return (
                        <TableRow key={loop.id}>
                          <TableCell className="font-mono font-semibold">
                            К{loop.id}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {loop.floor} эт.
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {loop.originalLength} м
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {loop.adjustedLength} м
                          </TableCell>
                          <TableCell>
                            {assignedCoil && (
                              <Badge
                                variant="secondary"
                                className="font-mono"
                              >
                                Бухта #{assignedCoil.index} ({assignedCoil.size}м)
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {assignedCoil?.size} м
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-semibold">
                        Итого: {loops.length} контуров
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {totalOriginal} м
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {totalAdjusted} м
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== Вкладка: Исходные данные ========== */}
          <TabsContent value="source" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="w-5 h-5" />
                  Исходные данные по этажам
                </CardTitle>
                <CardDescription>
                  Проектные длины контуров + запас {RESERVE} м на подключение
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 1 этаж */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-100">
                      1 этаж
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {floor1Loops.length} петель &middot;{" "}
                      {floor1Loops.reduce((s, l) => s + l.originalLength, 0)} м проектных &middot;{" "}
                      {floor1Loops.reduce((s, l) => s + l.adjustedLength, 0)} м с запасом
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {floor1Loops.map((loop) => (
                      <div
                        key={loop.id}
                        className="rounded-md border border-gray-100 bg-white px-3 py-2 text-center"
                      >
                        <div className="text-xs text-muted-foreground">
                          Контур {loop.id}
                        </div>
                        <div className="font-bold">{loop.originalLength} м</div>
                        <div className="text-xs text-muted-foreground">
                          → {loop.adjustedLength} м
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* 2 этаж */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge className="bg-sky-100 text-sky-700 border-sky-300 hover:bg-sky-100">
                      2 этаж
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {floor2Loops.length} петель &middot;{" "}
                      {floor2Loops.reduce((s, l) => s + l.originalLength, 0)} м проектных &middot;{" "}
                      {floor2Loops.reduce((s, l) => s + l.adjustedLength, 0)} м с запасом
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {floor2Loops.map((loop) => (
                      <div
                        key={loop.id}
                        className="rounded-md border border-gray-100 bg-white px-3 py-2 text-center"
                      >
                        <div className="text-xs text-muted-foreground">
                          Контур {loop.id}
                        </div>
                        <div className="font-bold">{loop.originalLength} м</div>
                        <div className="text-xs text-muted-foreground">
                          → {loop.adjustedLength} м
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
                  <h4 className="font-semibold text-amber-800 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4" />
                    Метод расчёта
                  </h4>
                  <ul className="text-sm text-amber-900 space-y-1 list-disc list-inside">
                    <li>
                      К каждой петле добавлен запас <strong>+{RESERVE} м</strong> на подключение
                    </li>
                    <li>
                      Доступные размеры бухт: <strong>50, 100, 200 м</strong>
                    </li>
                    <li>
                      Петли <strong>не делятся</strong> — соединения в стяжке не допускаются
                    </li>
                    <li>
                      Оптимизация: итерационный алгоритм с{" "}
                      <strong>{result.iterations.toLocaleString("ru")} подходов</strong> упаковки +
                      локальный поиск
                    </li>
                    <li>
                      Цель: минимизация суммарного остатка (waste) по всем бухтам
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Итоговая сводка для закупки */}
        <Card className="border-2 border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-emerald-800">
              <CheckCircle2 className="w-5 h-5" />
              Спецификация для закупки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-emerald-100/50">
                    <TableHead>Размер бухты</TableHead>
                    <TableHead className="text-center">Количество</TableHead>
                    <TableHead className="text-right">Общая длина</TableHead>
                    <TableHead className="text-right">Пойдет в дело</TableHead>
                    <TableHead className="text-right">Остаток</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[200, 100, 50]
                    .filter((size) => (coilsBySize.get(size) || []).length > 0)
                    .map((size) => {
                      const coils = coilsBySize.get(size)!;
                      const count = coils.length;
                      const totalLen = count * size;
                      const usedLen = coils.reduce(
                        (s, c) => s + c.totalLength,
                        0
                      );
                      return (
                        <TableRow key={size}>
                          <TableCell className="font-bold">{size} м</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="default" className="text-sm px-3 py-0.5">
                              {count} шт.
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {totalLen} м
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {usedLen} м
                          </TableCell>
                          <TableCell className="text-right">
                            <WasteColor meters={totalLen - usedLen} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-emerald-100/30">
                    <TableCell className="font-bold">ИТОГО</TableCell>
                    <TableCell className="text-center font-bold">
                      {result.coils.length} шт.
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {result.totalCoilLength} м
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {result.totalUsed} м
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <WasteColor meters={result.totalWaste} />
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Калькулятор бухт тёплого пола &middot; Трубка ⌀16 мм</span>
          <span>
            {new Date().toLocaleDateString("ru-RU", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </footer>
    </div>
  );
}
