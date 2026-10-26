"use client";

import { ClipboardPaste, Copy, MousePointerClick, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { parseLoopsFromText } from "@/lib/clipboard";
import { sampleLoops, type CalculatorController, type LoopEntry } from "@/lib/calculator-state";
import { interpolate } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/provider";
import {
  formatLength,
  fromInputValue,
  toInputValue,
  unitLabel,
  type UnitSystem,
} from "@/lib/units";

interface LoopEditorProps {
  controller: CalculatorController;
}

export function LoopEditor({ controller }: LoopEditorProps) {
  const { state, actions } = controller;
  const { dict, locale } = useLocale();
  const loops = state.loops;
  const reserve = state.settings.reserve;
  const units = state.settings.units;

  /** Set after "Add" so the freshly created row receives focus. */
  const focusLastRef = useRef(false);

  useEffect(() => {
    if (!focusLastRef.current) return;
    focusLastRef.current = false;
    const last = loops[loops.length - 1];
    if (!last) return;
    const input = document.getElementById(`loop-length-${last.id}`);
    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }
  }, [loops]);

  const addLoop = () => {
    focusLastRef.current = true;
    actions.addLoop();
  };

  const clearAll = () => {
    if (loops.length === 0) return;
    const snapshot = loops;
    actions.clearLoops();
    toast(dict.loops.cleared, {
      action: { label: dict.common.undo, onClick: () => actions.replaceLoops(snapshot) },
    });
  };

  const loadSample = () => {
    actions.replaceLoops(sampleLoops());
    toast.success(dict.loops.sampleLoaded);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target && target.tagName === "INPUT") return; // keep normal field paste behaviour

    const text = event.clipboardData.getData("text/plain");
    const parsed = parseLoopsFromText(text ?? "");
    if (parsed.length === 0) return;

    event.preventDefault();
    const converted =
      units === "imperial"
        ? parsed.map((loop) => ({ ...loop, length: fromInputValue(loop.length, units) }))
        : parsed;
    actions.replaceLoops([...loops, ...converted]);
    toast.success(interpolate(dict.loops.pasted, { count: parsed.length }));
  };

  const updateLoop = (loop: LoopEntry, patch: Partial<Omit<LoopEntry, "id">>) =>
    actions.updateLoop(loop.id, patch);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{dict.loops.title}</CardTitle>
            <CardDescription>{dict.loops.description}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button size="sm" variant="outline" className="h-9 sm:h-8" onClick={loadSample}>
              <MousePointerClick aria-hidden />
              {dict.loops.loadSample}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-9 sm:h-8"
              onClick={clearAll}
              disabled={loops.length === 0}
            >
              <Trash2 aria-hidden />
              {dict.loops.clear}
            </Button>
            <Button size="sm" className="h-9 sm:h-8" onClick={addLoop}>
              <Plus aria-hidden />
              {dict.loops.add}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent onPaste={handlePaste} className="space-y-3">
        {loops.length === 0 ? (
          <EmptyLoops onAdd={addLoop} onSample={loadSample} />
        ) : (
          <LoopRows
            loops={loops}
            reserve={reserve}
            units={units}
            locale={locale}
            onUpdate={updateLoop}
            onDuplicate={actions.duplicateLoop}
            onRemove={actions.removeLoop}
            lastRowEnter={addLoop}
          />
        )}
      </CardContent>
    </Card>
  );
}

interface LoopRowsProps {
  loops: LoopEntry[];
  reserve: number;
  units: UnitSystem;
  locale: Parameters<typeof formatLength>[2];
  onUpdate: (loop: LoopEntry, patch: Partial<Omit<LoopEntry, "id">>) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  lastRowEnter: () => void;
}

function LoopRows({
  loops,
  reserve,
  units,
  locale,
  onUpdate,
  onDuplicate,
  onRemove,
  lastRowEnter,
}: LoopRowsProps) {
  const { dict } = useLocale();
  const active = loops.filter((loop) => loop.length > 0);
  const designTotal = active.reduce((sum, loop) => sum + loop.length, 0);

  return (
    <>
      <div className="text-muted-foreground border-border hidden grid-cols-[2.5rem_5rem_minmax(0,1fr)_9rem] items-center gap-2 border-b pb-2 text-[11px] font-medium tracking-wide uppercase sm:grid">
        <span aria-hidden>#</span>
        <span>{dict.loops.floor}</span>
        <span>{dict.loops.length}</span>
        <span className="text-right">{dict.loops.withReserveTotal}</span>
      </div>

      <div className="divide-border/70 -mx-1 divide-y">
        {loops.map((loop, index) => (
          <div
            key={loop.id}
            className="grid grid-cols-[1.25rem_2.5rem_minmax(0,1fr)_6rem] items-center gap-1 px-1 py-1 sm:grid-cols-[2.5rem_5rem_minmax(0,1fr)_9rem] sm:gap-2 sm:py-1.5"
          >
            <span className="text-muted-foreground text-xs tabular-nums">{index + 1}</span>

            <Input
              type="number"
              min={1}
              max={99}
              inputMode="numeric"
              aria-label={`${dict.loops.floor} ${index + 1}`}
              className="h-9 w-full px-0.5 text-center tabular-nums sm:h-8 sm:px-1"
              value={loop.floor}
              onChange={(event) => {
                const floor = Number(event.target.value);
                onUpdate(loop, { floor: Number.isFinite(floor) && floor > 0 ? floor : 1 });
              }}
            />

            <div className="flex min-w-0 items-center gap-1.5">
              <Input
                id={`loop-length-${loop.id}`}
                type="number"
                min={0}
                step={units === "imperial" ? 1 : 0.5}
                inputMode="decimal"
                placeholder="0"
                aria-label={`${dict.loops.length} ${index + 1} (${unitLabel(units, dict)})`}
                className="h-9 max-w-40 min-w-0 flex-1 tabular-nums sm:h-8 sm:max-w-36"
                value={loop.length === 0 ? "" : toInputValue(loop.length, units)}
                onChange={(event) => {
                  const raw = event.target.value;
                  const value = raw === "" ? 0 : Number(raw);
                  onUpdate(loop, {
                    length: Number.isFinite(value) ? Math.max(0, fromInputValue(value, units)) : 0,
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  if (index === loops.length - 1) lastRowEnter();
                }}
              />
              <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
                {unitLabel(units, dict)}
              </span>
            </div>

            <div className="flex items-center justify-end gap-0.5">
              <span className="text-muted-foreground mr-1 hidden text-xs tabular-nums whitespace-nowrap sm:inline">
                {loop.length > 0
                  ? formatLength(loop.length + reserve, units, locale, dict, 1)
                  : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 sm:size-7"
                aria-label={`${dict.loops.duplicate}: ${index + 1}`}
                onClick={() => onDuplicate(loop.id)}
              >
                <Copy aria-hidden className="size-4 sm:size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive size-9 sm:size-7"
                aria-label={`${dict.loops.remove}: ${index + 1}`}
                onClick={() => onRemove(loop.id)}
              >
                <Trash2 aria-hidden className="size-4 sm:size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <ClipboardPaste aria-hidden className="size-3.5" />
          {dict.loops.pasteHint}
        </span>
        <span className="text-foreground tabular-nums">
          {dict.loops.count}: {active.length} · {dict.loops.designTotal}:{" "}
          {formatLength(designTotal, units, locale, dict, 1)} · {dict.loops.withReserveTotal}:{" "}
          {formatLength(designTotal + active.length * reserve, units, locale, dict, 1)}
        </span>
      </div>
    </>
  );
}

function EmptyLoops({ onAdd, onSample }: { onAdd: () => void; onSample: () => void }) {
  const { dict } = useLocale();

  return (
    <div className="border-border/80 bg-muted/30 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
      <span className="bg-card text-muted-foreground grid size-11 place-items-center rounded-full border">
        <Plus aria-hidden className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{dict.loops.emptyTitle}</p>
        <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
          {dict.loops.emptyText}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" onClick={onAdd}>
          <Plus aria-hidden />
          {dict.loops.add}
        </Button>
        <Button size="sm" variant="outline" onClick={onSample}>
          {dict.loops.loadSample}
        </Button>
      </div>
    </div>
  );
}
