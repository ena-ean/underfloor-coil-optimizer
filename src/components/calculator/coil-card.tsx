"use client";

import type { CoilPlan } from "@/lib/algorithm/types";
import { CoilSpool } from "@/components/calculator/coil-spool";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatMoney, formatPercent, type Currency } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";
import { formatLengthValue, unitLabel, type UnitSystem } from "@/lib/units";
import { cn } from "@/lib/utils";

interface CoilCardProps {
  coil: CoilPlan;
  /** Largest coil size in the plan, used to scale the spool drawing. */
  maxSize: number;
  site?: number;
  locale: Locale;
  dict: Dictionary;
  currency: Currency;
  units: UnitSystem;
  loopLabel: (index: number) => string;
}

/** One purchased coil with its fill level and the loops it covers. */
export function CoilCard({ coil, maxSize, locale, dict, currency, units, loopLabel }: CoilCardProps) {
  const tone =
    coil.fillPercent >= 90 ? "bg-success" : coil.fillPercent >= 70 ? "bg-primary" : "bg-warning";
  const unit = unitLabel(units, dict);
  const size = formatLengthValue(coil.size, units, locale, 0);
  const length = (value: number) => formatLengthValue(value, units, locale, 1);

  return (
    <article className="print-plain print-break-inside animate-card-in bg-card shadow-soft flex flex-col gap-3 rounded-xl border p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <CoilSpool
            scale={maxSize > 0 ? coil.size / maxSize : 1}
            fillPercent={coil.fillPercent}
            label={`${dict.coils.coil} ${coil.index}: ${size} ${unit}, ${formatPercent(coil.fillPercent, locale)}`}
            className={cn(
              coil.fillPercent >= 90
                ? "text-success"
                : coil.fillPercent >= 70
                  ? "text-primary"
                  : "text-warning",
            )}
          />
          <div>
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {dict.coils.coil} {coil.index}
            </p>
            <p className="text-xl leading-tight font-semibold tabular-nums">
              {size} <span className="text-muted-foreground text-sm">{unit}</span>
            </p>
          </div>
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
            {length(coil.used)} {unit}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{dict.coils.waste}</dt>
          <dd className={cn("font-medium tabular-nums", coil.waste === 0 && "text-success")}>
            {length(coil.waste)} {unit}
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
          {dict.coils.cost}: {formatMoney(coil.cost, locale, currency, 0)}
        </p>
      ) : null}
    </article>
  );
}
