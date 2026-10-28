"use client";

import { CoilSpool } from "@/components/calculator/coil-spool";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatMoney, formatPercent, type Currency } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";
import { circuitCode } from "@/lib/loop-label";
import { UNASSIGNED_COIL, type CutGroup } from "@/lib/report/cut-plan";
import { formatLengthValue, unitLabel, type UnitSystem } from "@/lib/units";
import { cn } from "@/lib/utils";

interface CoilCardProps {
  group: CutGroup;
  /** Largest coil size in the plan, used to scale the spool drawing. */
  maxSize: number;
  locale: Locale;
  dict: Dictionary;
  currency: Currency;
  units: UnitSystem;
}

/**
 * One purchased coil as a cutting sheet: what the coil is, how full it ends up
 * and — the part the installer needs — which loop is cut from it and at what
 * length. Lengths under the cut list already include the reserve.
 */
export function CoilCard({ group, maxSize, locale, dict, currency, units }: CoilCardProps) {
  const unit = unitLabel(units, dict);
  const size = formatLengthValue(group.size, units, locale, 0);
  const length = (value: number) => formatLengthValue(value, units, locale, 1);
  const loose = group.coil === UNASSIGNED_COIL;

  const tone =
    group.fillPercent >= 90 ? "bg-success" : group.fillPercent >= 70 ? "bg-primary" : "bg-warning";

  const rows = (
    <div className="border-t pt-2">
      <p className="text-muted-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
        {dict.cutPlan.lengths}, {unit}
      </p>
      {/* Two numbers per loop: the design length and what is actually cut. The
          reserve is the same everywhere, so it never needs its own column. */}
      <table className="w-full table-fixed text-xs">
        <colgroup>
          <col />
          {/* The longest single-word header ("Проектная") fits on one line; the
              reserve header may wrap onto two. */}
          <col className="w-20" />
          <col className="w-16" />
        </colgroup>
        <thead>
          <tr className="text-muted-foreground text-[10px] tracking-wide uppercase">
            <th scope="col" className="pb-0.5 text-left font-medium">
              {dict.cutPlan.loop}
            </th>
            <th scope="col" className="pb-0.5 pl-2 text-right leading-tight font-medium">
              {dict.cutPlan.design}
            </th>
            <th scope="col" className="pb-0.5 pl-2 text-right leading-tight font-medium">
              {dict.cutPlan.withReserve}
            </th>
          </tr>
        </thead>
        <tbody>
          {group.rows.map((row) => (
            <tr key={row.loopIndex} className="border-border/50 border-t">
              <td className="max-w-0 truncate py-0.5 pr-1">
                <span className="font-semibold tabular-nums">{circuitCode(row.loopIndex, dict)}</span>
                {row.room ? <span className="text-muted-foreground"> · {row.room}</span> : null}
                <span className="text-muted-foreground">{` · ${row.floor} ${dict.cutPlan.floorShort}`}</span>
              </td>
              <td className="text-muted-foreground py-0.5 pl-2 text-right tabular-nums">
                {length(row.design)}
              </td>
              <td className="py-0.5 pl-2 text-right font-semibold tabular-nums">
                {length(row.cut)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loose) {
    return (
      <article className="print-plain print-break-inside bg-card shadow-soft border-warning/40 flex flex-col gap-3 rounded-xl border border-dashed p-4">
        <p className="text-warning text-sm font-semibold">{dict.cutPlan.unassigned}</p>
        {rows}
      </article>
    );
  }

  return (
    <article className="print-plain print-break-inside bg-card shadow-soft flex flex-col gap-3 rounded-xl border p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <CoilSpool
            scale={maxSize > 0 ? group.size / maxSize : 1}
            fillPercent={group.fillPercent}
            label={`${dict.coils.coil} ${group.coil}: ${size} ${unit}, ${formatPercent(group.fillPercent, locale)}`}
            className={cn(
              group.fillPercent >= 90
                ? "text-success"
                : group.fillPercent >= 70
                  ? "text-primary"
                  : "text-warning",
            )}
          />
          <div>
            <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
              {dict.coils.coil} {group.coil}
            </p>
            <p className="text-xl leading-tight font-semibold tabular-nums">
              {size} <span className="text-muted-foreground text-sm">{unit}</span>
            </p>
          </div>
        </div>
        <Badge variant={group.waste === 0 ? "success" : "secondary"} className="tabular-nums">
          {formatPercent(group.fillPercent, locale)}
        </Badge>
      </header>

      <Progress
        value={Math.min(100, group.fillPercent)}
        aria-label={`${dict.coils.fill}: ${formatPercent(group.fillPercent, locale)}`}
        className="h-1.5"
        indicatorClassName={tone}
      />

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">{dict.coils.used}</dt>
          <dd className="font-medium tabular-nums">
            {length(group.used)} {unit}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{dict.coils.waste}</dt>
          <dd className={cn("font-medium tabular-nums", group.waste === 0 && "text-success")}>
            {length(group.waste)} {unit}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{dict.coils.cost}</dt>
          <dd className="font-medium tabular-nums">
            {group.cost === null ? "—" : formatMoney(group.cost, locale, currency, 0)}
          </dd>
        </div>
      </dl>

      {rows}
    </article>
  );
}
