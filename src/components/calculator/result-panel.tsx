"use client";

import {
  CheckCircle2,
  CircleAlert,
  FileCode2,
  Link2,
  Loader2,
  Printer,
  RotateCw,
  Table2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import type { ReactNode } from "react";

import { CoilCard } from "@/components/calculator/coil-card";
import { SpecTable } from "@/components/calculator/spec-table";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import type { PackingResult, SolverProgress } from "@/lib/algorithm/types";
import type { CalculatorController } from "@/lib/state";
import { APP_NAME } from "@/lib/constants";
import { errorMessage } from "@/lib/errors";
import { formatMoney, formatPercent } from "@/lib/format";
import { useLocale } from "@/lib/i18n/provider";
import { buildCsv } from "@/lib/report/csv";
import { buildCutPlan } from "@/lib/report/cut-plan";
import { downloadTextFile, fileStamp } from "@/lib/report/download";
import { buildHtmlReport } from "@/lib/report/html";
import { shareUrl } from "@/lib/share";
import {
  formatLength,
  formatLengthValue,
  unitLabel,
  type UnitSystem,
} from "@/lib/units";
import { cn } from "@/lib/utils";

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function StatusBanner({
  result,
  units,
  onRetry,
}: {
  result: PackingResult;
  units: UnitSystem;
  onRetry: () => void;
}) {
  const { dict, locale } = useLocale();
  const { optimal, gap, lowerBound, elapsedMs } = result.diagnostics;

  const Icon = optimal ? CheckCircle2 : CircleAlert;
  const title = optimal ? dict.result.optimal : dict.result.stopped;
  const hint = optimal ? dict.result.optimalHint : dict.result.stoppedHint;

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-3 rounded-xl border p-4",
        optimal ? "border-success/30 bg-success/8" : "border-warning/40 bg-warning/10",
      )}
    >
      <Icon
        aria-hidden
        className={cn("mt-0.5 size-5 shrink-0", optimal ? "text-success" : "text-warning")}
      />
      {/* min-w keeps the hint readable on phones: the metrics block wraps below
          instead of squeezing the text into a one-word column. */}
      <div className="min-w-[11rem] flex-1 space-y-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">{hint}</p>
        {optimal ? null : (
          <Button size="sm" variant="outline" className="mt-1" onClick={onRetry}>
            <RotateCw aria-hidden />
            {dict.result.restart}
          </Button>
        )}
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
        <dd className="text-foreground font-medium">{formatDuration(elapsedMs)}</dd>
      </dl>
    </div>
  );
}

/**
 * Shown while the exact search runs, or after it was stopped without a plan.
 * The numbers come from the solver itself: the best plan so far, the lower
 * bound it is chasing and how much of the tree was already explored.
 */
function SearchStatus({
  progress,
  running,
  units,
  onStop,
  onRetry,
}: {
  progress: SolverProgress | null;
  running: boolean;
  units: UnitSystem;
  onStop: () => void;
  onRetry: () => void;
}) {
  const { dict, locale } = useLocale();

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2">
          {running ? (
            <Loader2 aria-hidden className="text-primary size-4 animate-spin" />
          ) : (
            <CircleAlert aria-hidden className="text-warning size-4" />
          )}
          {running ? dict.result.searching : dict.result.stopped}
        </CardTitle>
        <CardDescription>
          {running ? dict.result.searchingHint : dict.result.stoppedHint}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {progress ? (
          <dl className="text-muted-foreground grid max-w-sm grid-cols-2 gap-x-4 gap-y-1 text-xs tabular-nums">
            <dt>{dict.result.kpiPurchased}</dt>
            <dd className="text-foreground font-medium">
              {formatLength(progress.bestLength, units, locale, dict)}
            </dd>
            <dt>{dict.result.lowerBound}</dt>
            <dd className="text-foreground font-medium">
              {formatLength(progress.lowerBound, units, locale, dict)}
            </dd>
            <dt>{dict.result.gap}</dt>
            <dd className="text-foreground font-medium">
              {progress.bestLength <= progress.lowerBound
                ? dict.result.gapZero
                : `+${formatLength(progress.bestLength - progress.lowerBound, units, locale, dict)}`}
            </dd>
            <dt>{dict.result.kpiCoils}</dt>
            <dd className="text-foreground font-medium">{progress.bestCount}</dd>
            <dt>{dict.result.solveTime}</dt>
            <dd className="text-foreground font-medium">
              {formatDuration(Math.round(progress.elapsedMs))}
            </dd>
            <dt>{dict.result.nodes}</dt>
            <dd className="text-foreground font-medium">
              {progress.nodesVisited.toLocaleString(locale)}
            </dd>
          </dl>
        ) : null}

        {running ? (
          <Button size="sm" variant="outline" onClick={onStop}>
            {dict.result.stop}
          </Button>
        ) : (
          <Button size="sm" onClick={onRetry}>
            {dict.result.restart}
          </Button>
        )}
      </CardContent>
    </Card>
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
        "print-plain flex flex-col gap-1 rounded-xl border p-4",
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
  const { outcome, activeLoops, state, naivePurchase, search, cancelSearch, retrySearch } = controller;
  const reserve = state.settings.reserve;
  const currency = state.settings.currency;
  const units = state.settings.units;

  if (!outcome) {
    if (search.running || search.stopped) {
      return (
        <SearchStatus
          progress={search.progress}
          running={search.running}
          units={units}
          onStop={cancelSearch}
          onRetry={retrySearch}
        />
      );
    }
    return <ResultEmpty onEditLoops={onEditLoops} />;
  }

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
  const unit = unitLabel(units, dict);
  const maxCoilSize = result.coils.reduce((max, coil) => Math.max(max, coil.size), 0);
  const savings = Math.round(Math.max(0, naivePurchase - result.totalCoilLength) * 100) / 100;
  const savingsPercent =
    naivePurchase > 0 ? Math.round((savings / naivePurchase) * 1000) / 10 : 0;
  const wastePercent =
    result.totalCoilLength > 0
      ? Math.round((result.totalWaste / result.totalCoilLength) * 1000) / 10
      : 0;
  const cutPlan = buildCutPlan(activeLoops, result.coils, reserve);
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

  /**
   * The whole project travels in the address, so sharing needs no backend.
   * A project too long for a link is refused instead of silently truncated.
   */
  const shareLink = async () => {
    const { url, tooLarge } = shareUrl(window.location.href, state);
    if (tooLarge) {
      toast.error(dict.share.tooLarge);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(dict.share.copied);
    } catch {
      toast.error(dict.share.failed);
    }
  };

  return (
    <div className="space-y-5">
      <Reveal>
        <StatusBanner result={result} units={units} onRetry={retrySearch} />
      </Reveal>

      <Reveal className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi
          label={dict.result.kpiCoils}
          value={String(result.coils.length)}
          hint={`${dict.spec.size}: ${new Set(result.coils.map((coil) => coil.size)).size} ${dict.common.of} ${state.settings.coils.length}`}
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
            result.totalCost === null ? dict.result.noPrices : dict.result.priceBasis
          }
        />
      </Reveal>

      {savings > 0 ? (
        <Reveal>
          <div className="border-success/25 bg-success/8 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">{dict.result.savings}</p>
              <p className="text-muted-foreground text-xs">{dict.result.savingsHint}</p>
            </div>
            <p className="text-success text-sm font-semibold tabular-nums">
              {formatLength(savings, units, locale, dict)} · {formatPercent(savingsPercent, locale)}
            </p>
          </div>
        </Reveal>
      ) : null}

      <Reveal>
        <Card>
          <CardHeader className="gap-1">
            <CardTitle>{dict.cutPlan.title}</CardTitle>
            <CardDescription>{dict.cutPlan.hint}</CardDescription>
          </CardHeader>
          {/* Half the content column from sm up, full width on a phone: the cut
              table needs the room for the design and reserve columns. */}
          <CardContent className="grid items-start gap-3 sm:grid-cols-2">
            {cutPlan.map((group) => (
              <CoilCard
                key={group.coil}
                group={group}
                maxSize={maxCoilSize}
                locale={locale}
                dict={dict}
                currency={currency}
                units={units}
              />
            ))}
            <p className="text-muted-foreground sm:col-span-2">{dict.cutPlan.mark}</p>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader className="gap-1">
            <CardTitle>{dict.spec.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <SpecTable
              coils={result.coils}
              locale={locale}
              dict={dict}
              currency={currency}
              units={units}
            />

            {/* The documents a plumber and a buyer actually take away live
                under the table they come from, and are big enough to hit with
                a thumb. */}
            <div className="no-print mt-4 grid gap-2 sm:grid-cols-2">
              <Button
                size="lg"
                variant="outline"
                className="justify-start"
                onClick={() => {
                  exportCsv();
                  toast.success(dict.export.csv);
                }}
              >
                <Table2 aria-hidden />
                {dict.export.csv}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="justify-start"
                onClick={() => {
                  exportHtml();
                  toast.success(dict.export.html);
                }}
              >
                <FileCode2 aria-hidden />
                {dict.export.html}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="justify-start"
                onClick={() => window.print()}
              >
                <Printer aria-hidden />
                {dict.export.print}
              </Button>
              <Button size="lg" className="justify-start" onClick={shareLink}>
                <Link2 aria-hidden />
                {dict.share.action}
              </Button>
            </div>
            <p className="no-print text-muted-foreground mt-2 text-xs leading-relaxed">
              {dict.share.hint}
            </p>
          </CardContent>
        </Card>
      </Reveal>
    </div>
  );
}
