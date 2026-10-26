"use client";

import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CalculatorController } from "@/lib/calculator-state";
import { formatMoney, formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/i18n/provider";

interface SummaryBarProps {
  controller: CalculatorController;
  onCalculate: () => void;
}

/**
 * Phone-only sticky summary. The full card lives in the sidebar and is hidden
 * below `lg`, so the totals and the primary action stay one tap away.
 */
export function SummaryBar({ controller, onCalculate }: SummaryBarProps) {
  const { dict, locale } = useLocale();
  const { activeLoops, outcome, state } = controller;

  const result = outcome?.ok ? outcome.result : null;
  const canCalculate = activeLoops.length > 0 && state.settings.sizes.length > 0;

  return (
    <div className="no-print bg-background/95 fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur-md lg:hidden">
      <div className="container-page flex items-center gap-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-medium tabular-nums">
            {dict.summary.loops}: {activeLoops.length} ·{" "}
            {formatNumber(result ? result.totalCoilLength : controller.totalWithReserve, locale, 1)}{" "}
            {dict.common.meters}
          </p>
          <p className="text-muted-foreground truncate text-[11px] tabular-nums">
            {result
              ? `${dict.result.kpiWaste}: ${formatNumber(result.totalWaste, locale, 1)} ${dict.common.meters}` +
                (result.totalCost === null
                  ? ""
                  : ` · ${formatMoney(result.totalCost, locale, state.settings.currency)}`)
              : `${dict.summary.sizes}: ${state.settings.sizes.length}`}
          </p>
        </div>
        <Button size="sm" className="h-9 shrink-0" onClick={onCalculate} disabled={!canCalculate}>
          {result ? dict.params.recalculate : dict.params.calculate}
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  );
}
