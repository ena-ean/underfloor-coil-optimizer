"use client";

import { ArrowRight, Scale, Layers, Ruler } from "lucide-react";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalculatorController } from "@/lib/calculator-state";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { useLocale } from "@/lib/i18n/provider";
import { formatLength, type UnitSystem } from "@/lib/units";

interface SummaryPanelProps {
  controller: CalculatorController;
  onCalculate: () => void;
}

/** Sticky live summary: totals of the input and the headline result numbers. */
export function SummaryPanel({ controller, onCalculate }: SummaryPanelProps) {
  const { dict, locale } = useLocale();
  const { activeLoops, totalDesign, totalWithReserve, outcome, state } = controller;
  const units = state.settings.units;

  const result = outcome?.ok ? outcome.result : null;
  const error = outcome && !outcome.ok ? errorMessage(outcome.error, dict) : null;
  const canCalculate = activeLoops.length > 0 && state.settings.sizes.length > 0;

  return (
    <aside className="no-print h-fit lg:sticky lg:top-[4.75rem]">
      <Card>
        <CardHeader className="gap-1">
          <CardTitle className="flex items-center gap-2">
            <Layers aria-hidden className="text-muted-foreground size-4" />
            {dict.summary.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <dl className="space-y-2 text-sm">
            <SummaryRow label={dict.summary.loops} text={String(activeLoops.length)} />
            <SummaryRow label={dict.summary.design} metres={totalDesign} units={units} />
            <SummaryRow label={dict.summary.withReserve} metres={totalWithReserve} units={units} />
            <SummaryRow label={dict.summary.sizes} text={String(state.settings.sizes.length)} />
          </dl>

          {result ? (
            <div className="bg-muted/40 animate-card-in space-y-1.5 rounded-lg border p-3 text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted-foreground">{dict.result.kpiPurchased}</span>
                <span className="font-medium tabular-nums">
                  <AnimatedNumber
                    value={result.totalCoilLength}
                    format={(value) => formatLength(value, units, locale, dict, 1)}
                  />
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted-foreground">{dict.result.kpiWaste}</span>
                <span className="font-medium tabular-nums">
                  <AnimatedNumber
                    value={result.totalWaste}
                    format={(value) => formatLength(value, units, locale, dict, 1)}
                  />
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-muted-foreground">{dict.result.kpiCost}</span>
                <span className="font-medium tabular-nums">
                  {result.totalCost === null ? (
                    "—"
                  ) : (
                    <AnimatedNumber
                      value={result.totalCost}
                      format={(value) => formatMoney(value, locale, state.settings.currency, 0)}
                    />
                  )}
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
                    : `+${formatLength(result.diagnostics.gap, units, locale, dict, 1)}`}
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

interface SummaryRowProps {
  label: string;
  units?: UnitSystem;
  /** Canonical metres; rendered in the active unit system. */
  metres?: number;
  text?: string;
}

function SummaryRow({ label, units, metres, text }: SummaryRowProps) {
  const { dict, locale } = useLocale();

  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">
        {metres === undefined || units === undefined ? (
          <span key={text} className="animate-value-pop">
            {text}
          </span>
        ) : (
          <AnimatedNumber
            value={metres}
            format={(value) => formatLength(value, units, locale, dict, 1)}
          />
        )}
      </dd>
    </div>
  );
}
