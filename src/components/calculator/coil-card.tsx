"use client";

import type { CoilPlan } from "@/lib/algorithm/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatMoney, formatNumber, formatPercent, type Currency } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";
import { cn } from "@/lib/utils";

interface CoilCardProps {
  coil: CoilPlan;
  site?: number;
  locale: Locale;
  dict: Dictionary;
  currency: Currency;
  loopLabel: (index: number) => string;
}

/** One purchased coil with its fill level and the loops it covers. */
export function CoilCard({ coil, locale, dict, currency, loopLabel }: CoilCardProps) {
  const tone =
    coil.fillPercent >= 90 ? "bg-success" : coil.fillPercent >= 70 ? "bg-primary" : "bg-warning";

  return (
    <article className="print-plain print-break-inside bg-card shadow-soft flex flex-col gap-3 rounded-xl border p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
            {dict.coils.coil} {coil.index}
          </p>
          <p className="text-xl leading-tight font-semibold tabular-nums">
            {coil.size} <span className="text-muted-foreground text-sm">{dict.common.meters}</span>
          </p>
        </div>
        <Badge variant={coil.waste === 0 ? "success" : "secondary"} className="tabular-nums">
          {formatPercent(coil.fillPercent, locale)}
        </Badge>
      </header>

      <Progress
        value={Math.min(100, coil.fillPercent)}
        aria-label={`${dict.coils.fill}: ${formatPercent(coil.fillPercent, locale)}`}
        className="h-1.5"
        indicatorClassName={tone}
      />

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">{dict.coils.used}</dt>
          <dd className="font-medium tabular-nums">
            {formatNumber(coil.used, locale, 1)} {dict.common.meters}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{dict.coils.waste}</dt>
          <dd className={cn("font-medium tabular-nums", coil.waste === 0 && "text-success")}>
            {formatNumber(coil.waste, locale, 1)} {dict.common.meters}
          </dd>
        </div>
      </dl>

      <p className="text-muted-foreground flex flex-wrap gap-1 text-xs">
        {coil.loopIndexes.map((index) => (
          <span
            key={index}
            className="bg-muted/70 text-foreground/80 rounded px-1.5 py-0.5 tabular-nums"
          >
            {loopLabel(index)}
          </span>
        ))}
      </p>

      {coil.cost !== null ? (
        <p className="text-muted-foreground border-t pt-2 text-xs tabular-nums">
          {dict.coils.cost}: {formatMoney(coil.cost, locale, currency)}
        </p>
      ) : null}
    </article>
  );
}
