"use client";

import { ArrowRight, Scale, Layers, Ruler } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalculatorController } from "@/lib/calculator-state";
import { errorMessage } from "@/lib/errors";
import { formatMoney, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/provider";

interface SummaryPanelProps {
  controller: CalculatorController;
  onCalculate: () => void;
}

/** Sticky live summary: totals of the input and the headline result numbers. */
export function SummaryPanel({ controller, onCalculate }: SummaryPanelProps) {
  const { dict, locale } = useLocale();
  const { activeLoops, totalDesign, totalWithReserve, outcome, state } = controller;

  const result = outcome?.ok ? outcome.result : null;
  const error = outcome && !outcome.ok ? errorMessage(outcome.error, dict) : null;
  const canCalculate = activeLoops.length > 0 && state.settings.sizes.length > 0;

  const rows = [
    { label: dict.summary.loops, value: String(activeLoops.length) },
    { label: dict.summary.design, value: `${formatNumber(totalDesign, locale, 1)} ${dict.common.meters}` },
    {
      label: dict.summary.withReserve,
      value: `${formatNumber(totalWithReserve, locale, 1)} ${dict.common.meters}`,
    },
    { label: dict.summary.sizes, value: String(state.settings.sizes.length) },
  ];

  return (
    <aside className="no-print h-fit lg:sticky lg:top-20">
      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2">
            <Layers aria-hidden className="text-muted-foreground size-4" />
            {dict.summary.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <dl className="space-y-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>

          {result ? (
            <div className="bg-muted/40 space-y-1.5 rounded-lg border p-3 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted-foreground">{dict.result.kpiPurchased}</span>
                <span className="font-medium tabular-nums">
                  {formatNumber(result.totalCoilLength, locale, 1)} {dict.common.meters}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted-foreground">{dict.result.kpiWaste}</span>
                <span className="font-medium tabular-nums">
                  {formatNumber(result.totalWaste, locale, 1)} {dict.common.meters}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted-foreground">{dict.result.kpiCost}</span>
                <span className="font-medium tabular-nums">
                  {result.totalCost === null
                    ? "—"
                    : formatMoney(result.totalCost, locale, state.settings.currency)}
                </span>
              </div>
              <div className="text-muted-foreground flex items-baseline justify-between gap-2 border-t pt-1.5">
                <span className="inline-flex items-center gap-1">
                  <Scale aria-hidden className="size-3" />
                  {dict.result.gap}
                </span>
                <span className="tabular-nums">
                  {result.diagnostics.gap === 0
                    ? dict.result.gapZero
                    : `+${formatNumber(result.diagnostics.gap, locale, 1)} ${dict.common.meters}`}
                </span>
              </div>
            </div>
          ) : null}

          {error ? <p className="text-destructive text-xs leading-relaxed">{error}</p> : null}

          <Button className="w-full" onClick={onCalculate} disabled={!canCalculate}>
            {result ? dict.params.recalculate : dict.params.calculate}
            <ArrowRight aria-hidden />
          </Button>

          <p className="text-muted-foreground flex items-start gap-1.5 text-[11px] leading-relaxed">
            <Ruler aria-hidden className="mt-0.5 size-3 shrink-0" />
            {dict.summary.hint}
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}
