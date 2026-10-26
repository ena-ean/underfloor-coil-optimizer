"use client";

import { CheckCircle2, CircleAlert, FileCode2, Info, Printer, Table2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

import { CoilCard } from "@/components/calculator/coil-card";
import { LoopDistribution } from "@/components/calculator/loop-distribution";
import { SpecTable } from "@/components/calculator/spec-table";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PackingResult } from "@/lib/algorithm/types";
import type { CalculatorController } from "@/lib/calculator-state";
import { APP_NAME } from "@/lib/constants";
import { errorMessage } from "@/lib/errors";
import { formatMoney, formatPercent } from "@/lib/format";
import { interpolate } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/provider";
import { buildCsv } from "@/lib/report/csv";
import { downloadTextFile, fileStamp } from "@/lib/report/download";
import { buildHtmlReport } from "@/lib/report/html";
import {
  formatLength,
  formatLengthValue,
  formatUnitPrice,
  unitLabel,
  type UnitSystem,
} from "@/lib/units";
import { cn } from "@/lib/utils";

function StatusBanner({ result, units }: { result: PackingResult; units: UnitSystem }) {
  const { dict, locale } = useLocale();
  const { optimal, strategy, gap, lowerBound, elapsedMs } = result.diagnostics;

  const near = !optimal && strategy === "exact";
  const tone = optimal ? "success" : near ? "warning" : "muted";
  const Icon = optimal ? CheckCircle2 : near ? CircleAlert : Info;
  const title = optimal
    ? dict.result.optimal
    : near
      ? dict.result.nearOptimal
      : dict.result.heuristic;
  const hint = optimal
    ? dict.result.optimalHint
    : near
      ? dict.result.nearOptimalHint
      : dict.result.heuristicHint;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-xl border p-4",
        tone === "success" && "border-success/30 bg-success/8",
        tone === "warning" && "border-warning/40 bg-warning/10",
        tone === "muted" && "border-border bg-muted/40",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-5 shrink-0",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "muted" && "text-muted-foreground",
        )}
      />
      {/* min-w keeps the hint readable on phones: the metrics block wraps below
          instead of squeezing the text into a one-word column. */}
      <div className="min-w-[11rem] flex-1 space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
      </div>
      <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums sm:text-right">
        <dt>{dict.result.lowerBound}</dt>
        <dd className="text-foreground font-medium">
          {formatLength(lowerBound, units, locale, dict)}
        </dd>
        <dt>{dict.result.gap}</dt>
        <dd className="text-foreground font-medium">
          {gap === 0 ? dict.result.gapZero : `+${formatLength(gap, units, locale, dict)}`}
        </dd>
        <dt>{dict.result.solveTime}</dt>
        <dd className="text-foreground font-medium">{elapsedMs} ms</dd>
      </dl>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "print-plain animate-card-in flex flex-col gap-1 rounded-xl border p-4",
        emphasis ? "border-primary/30 bg-primary/6" : "bg-card",
      )}
    >
      <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="animate-value-pop text-xl leading-tight font-semibold tabular-nums sm:text-2xl">
        {value}
      </span>
      {hint ? <span className="text-muted-foreground text-xs tabular-nums">{hint}</span> : null}
    </div>
  );
}

function ResultEmpty({ onEditLoops }: { onEditLoops: () => void }) {
  const { dict } = useLocale();

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="bg-muted text-muted-foreground grid size-11 place-items-center rounded-full">
          <Table2 aria-hidden className="size-5" />
        </span>
        <p className="max-w-sm text-sm leading-relaxed">{dict.result.empty}</p>
        <Button size="sm" variant="outline" onClick={onEditLoops}>
          {dict.steps.loops}
        </Button>
      </CardContent>
    </Card>
  );
}

interface ResultPanelProps {
  controller: CalculatorController;
  onEditLoops: () => void;
  onEditSettings: () => void;
}

export function ResultPanel({ controller, onEditLoops, onEditSettings }: ResultPanelProps) {
  const { dict, locale } = useLocale();
  const { outcome, activeLoops, state, naivePurchase } = controller;
  const reserve = state.settings.reserve;
  const currency = state.settings.currency;

  if (!outcome) return <ResultEmpty onEditLoops={onEditLoops} />;

  if (!outcome.ok) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader className="gap-2">
          <CardTitle className="text-destructive flex items-center gap-2">
            <TriangleAlert aria-hidden className="size-4" />
            {dict.result.title}
          </CardTitle>
          <CardDescription className="text-foreground/80">
            {errorMessage(outcome.error, dict)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="outline" onClick={onEditSettings}>
            {dict.steps.params}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const result = outcome.result;
  const units = state.settings.units;
  const unit = unitLabel(units, dict);
  const maxCoilSize = result.coils.reduce((max, coil) => Math.max(max, coil.size), 0);
  const savings = Math.round(Math.max(0, naivePurchase - result.totalCoilLength) * 100) / 100;
  const savingsPercent =
    naivePurchase > 0 ? Math.round((savings / naivePurchase) * 1000) / 10 : 0;
  const wastePercent =
    result.totalCoilLength > 0
      ? Math.round((result.totalWaste / result.totalCoilLength) * 1000) / 10
      : 0;
  const loopLabel = (index: number) =>
    interpolate(dict.loopsTable.circuitShort, { n: index + 1 });
  const lengthValue = (metres: number) => formatLengthValue(metres, units, locale, 1);

  const exportCsv = () => {
    const csv = buildCsv(result, activeLoops, reserve, dict, locale, units);
    downloadTextFile(`coil-spec-${fileStamp()}.csv`, csv, "text/csv");
  };

  const exportHtml = () => {
    const html = buildHtmlReport({
      result,
      loops: activeLoops,
      reserve,
      dict,
      locale,
      currency,
      units,
      appName: APP_NAME,
    });
    downloadTextFile(`coil-report-${fileStamp()}.html`, html, "text/html");
  };

  return (
    <div className="space-y-5">
      <StatusBanner result={result} units={units} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label={dict.result.kpiCoils}
          value={String(result.coils.length)}
          hint={`${dict.spec.size}: ${new Set(result.coils.map((coil) => coil.size)).size} ${dict.common.of} ${state.settings.sizes.length}`}
        />
        <Kpi
          label={dict.result.kpiPurchased}
          value={
            <>
              <AnimatedNumber
                value={result.totalCoilLength}
                format={lengthValue}
                className="tabular-nums"
              />{" "}
              <span className="text-muted-foreground text-base font-medium">{unit}</span>
            </>
          }
          hint={`${dict.coils.used}: ${formatLength(result.totalUsed, units, locale, dict)}`}
          emphasis
        />
        <Kpi
          label={dict.result.kpiWaste}
          value={
            <>
              <AnimatedNumber
                value={result.totalWaste}
                format={lengthValue}
                className="tabular-nums"
              />{" "}
              <span className="text-muted-foreground text-base font-medium">{unit}</span>
            </>
          }
          hint={formatPercent(wastePercent, locale)}
        />
        <Kpi
          label={dict.result.kpiCost}
          value={
            result.totalCost === null ? (
              "—"
            ) : (
              <AnimatedNumber
                value={result.totalCost}
                format={(cost) => formatMoney(cost, locale, currency, 0)}
                className="tabular-nums"
              />
            )
          }
          hint={
            result.totalCost === null
              ? dict.result.noPrices
              : formatUnitPrice(state.settings.pricePerMetre, units, locale, currency, dict)
          }
        />
      </div>

      {savings > 0 ? (
        <div className="border-success/25 bg-success/8 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{dict.result.savings}</p>
            <p className="text-muted-foreground text-xs">{dict.result.savingsHint}</p>
          </div>
          <p className="text-success text-sm font-semibold tabular-nums">
            {formatLength(savings, units, locale, dict)} · {formatPercent(savingsPercent, locale)}
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader className="gap-1">
          <CardTitle>{dict.coils.title}</CardTitle>
          <CardDescription>
            {dict.result.kpiCoils}: {result.coils.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {result.coils.map((coil) => (
            <CoilCard
              key={coil.index}
              coil={coil}
              maxSize={maxCoilSize}
              locale={locale}
              dict={dict}
              currency={currency}
              units={units}
              loopLabel={loopLabel}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>{dict.spec.title}</CardTitle>
            <div className="no-print flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                aria-label={dict.export.csv}
                onClick={() => {
                  exportCsv();
                  toast.success(dict.export.csv);
                }}
              >
                <Table2 aria-hidden />
                <span className="hidden sm:inline">{dict.export.csv}</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label={dict.export.html}
                onClick={() => {
                  exportHtml();
                  toast.success(dict.export.html);
                }}
              >
                <FileCode2 aria-hidden />
                <span className="hidden sm:inline">{dict.export.html}</span>
              </Button>
              <Button size="sm" aria-label={dict.export.print} onClick={() => window.print()}>
                <Printer aria-hidden />
                <span className="hidden sm:inline">{dict.export.print}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SpecTable
            coils={result.coils}
            locale={locale}
            dict={dict}
            currency={currency}
            units={units}
          />

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-1">
          <CardTitle>{dict.loopsTable.title}</CardTitle>
          <CardDescription>
            {dict.loops.count}: {activeLoops.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoopDistribution
            loops={activeLoops}
            coils={result.coils}
            reserve={reserve}
            locale={locale}
            dict={dict}
            units={units}
          />
        </CardContent>
      </Card>
    </div>
  );
}
