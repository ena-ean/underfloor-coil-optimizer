"use client";

import {
  Check,
  Download,
  FolderOpen,
  History as HistoryIcon,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createId, type CalculatorController } from "@/lib/calculator-state";
import { formatMoney } from "@/lib/format";
import {
  clearHistory,
  deleteHistoryEntry,
  exportHistory,
  HISTORY_LIMIT,
  importHistory,
  renameHistory,
  replaceHistory,
  useHistory,
  type HistoryEntry,
} from "@/lib/history";
import { interpolate, type Locale } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/provider";
import { downloadTextFile, fileStamp } from "@/lib/report/download";
import { formatLength, formatLengthValue, unitLabel, type UnitSystem } from "@/lib/units";
import { cn } from "@/lib/utils";

interface HistoryPanelProps {
  controller: CalculatorController;
  /** Called after a stored calculation has been applied to the calculator. */
  onRestored: () => void;
}

/** Compact `26 окт., 14:05` stamp; only ever rendered on the client. */
function formatStamp(value: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function HistoryPanel({ controller, onRestored }: HistoryPanelProps) {
  const entries = useHistory();
  const { dict, locale } = useLocale();
  const { actions, state } = controller;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const restore = (entry: HistoryEntry) => {
    const previousLoops = state.loops;
    const previousSettings = state.settings;

    actions.replaceLoops(entry.loops.map((loop) => ({ ...loop, id: createId() })));
    actions.replaceSettings(entry.settings);

    toast.success(dict.history.restored, {
      action: {
        label: dict.common.undo,
        onClick: () => {
          actions.replaceLoops(previousLoops);
          actions.replaceSettings(previousSettings);
        },
      },
    });
    onRestored();
  };

  const removeEntry = (entry: HistoryEntry) => {
    const previous = entries;
    deleteHistoryEntry(entry.id);
    toast(dict.history.removed, {
      action: { label: dict.common.undo, onClick: () => replaceHistory(previous) },
    });
  };

  const clearAll = () => {
    const previous = clearHistory();
    if (previous.length === 0) return;
    toast(dict.history.cleared, {
      action: { label: dict.common.undo, onClick: () => replaceHistory(previous) },
    });
  };

  const exportAll = () => {
    downloadTextFile(`coil-history-${fileStamp()}.json`, exportHistory(entries), "application/json");
    toast.success(dict.history.exported);
  };

  const importFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const merged = importHistory(await file.text(), entries);
      if (merged.imported === 0) {
        toast.error(dict.history.importFailed);
        return;
      }
      replaceHistory(merged.entries);
      toast.success(interpolate(dict.history.imported, { count: merged.imported }));
    } catch {
      toast.error(dict.history.importFailed);
    }
  };

  const startRename = (entry: HistoryEntry) => {
    setEditingId(entry.id);
    setDraft(entry.label);
  };

  const commitRename = (entry: HistoryEntry) => {
    renameHistory(entry.id, draft);
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <HistoryIcon aria-hidden className="text-muted-foreground size-4" />
              {dict.history.title}
            </CardTitle>
            <CardDescription>{dict.history.description}</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={importFile}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              aria-label={dict.history.importAction}
            >
              <Upload aria-hidden />
              <span className="hidden sm:inline">{dict.history.importAction}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={exportAll}
              disabled={entries.length === 0}
              aria-label={dict.history.exportAction}
            >
              <Download aria-hidden />
              <span className="hidden sm:inline">{dict.history.exportAction}</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearAll}
              disabled={entries.length === 0}
              aria-label={dict.history.clear}
            >
              <Trash2 aria-hidden />
              <span className="hidden sm:inline">{dict.history.clear}</span>
            </Button>
          </div>
        </div>
        {entries.length > 0 ? (
          <p className="text-muted-foreground text-xs tabular-nums">
            {dict.history.count}: {entries.length} / {HISTORY_LIMIT}
          </p>
        ) : null}
      </CardHeader>

      <CardContent>
        {entries.length === 0 ? (
          <EmptyHistory />
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                locale={locale}
                units={state.settings.units}
                editing={editingId === entry.id}
                draft={draft}
                onDraftChange={setDraft}
                onStartRename={() => startRename(entry)}
                onCommitRename={() => commitRename(entry)}
                onCancelRename={() => setEditingId(null)}
                onOpen={() => restore(entry)}
                onRemove={() => removeEntry(entry)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyHistory() {
  const { dict } = useLocale();

  return (
    <div className="border-border/80 bg-muted/30 flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
      <span className="bg-card text-muted-foreground grid size-11 place-items-center rounded-full border">
        <HistoryIcon aria-hidden className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">{dict.history.emptyTitle}</p>
        <p className="text-muted-foreground max-w-sm text-xs leading-relaxed">
          {interpolate(dict.history.emptyText, { limit: HISTORY_LIMIT })}
        </p>
      </div>
    </div>
  );
}

interface HistoryRowProps {
  entry: HistoryEntry;
  locale: Locale;
  units: UnitSystem;
  editing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onStartRename: () => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  onOpen: () => void;
  onRemove: () => void;
}

function HistoryRow({
  entry,
  locale,
  units,
  editing,
  draft,
  onDraftChange,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onOpen,
  onRemove,
}: HistoryRowProps) {
  const { dict } = useLocale();
  const title =
    entry.label ||
    `${dict.history.unnamed} · ${formatLengthValue(entry.summary.purchased, units, locale, 0)} ${unitLabel(units, dict)}`;

  return (
    <li className="border-border/80 bg-card/60 hover:border-primary/30 rounded-xl border p-3 transition-colors sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                className="h-9"
                aria-label={dict.history.rename}
                placeholder={dict.history.namePlaceholder}
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onCommitRename();
                  if (event.key === "Escape") onCancelRename();
                }}
              />
              <Button
                size="icon"
                className="size-9 shrink-0"
                aria-label={dict.common.apply}
                onClick={onCommitRename}
              >
                <Check aria-hidden />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-9 shrink-0"
                aria-label={dict.common.cancel}
                onClick={onCancelRename}
              >
                <X aria-hidden />
              </Button>
            </div>
          ) : (
            <p className="truncate text-sm font-medium">{title}</p>
          )}

          <p className="text-muted-foreground text-[11px] tabular-nums">
            {formatStamp(entry.createdAt, locale)} · {dict.summary.loops}: {entry.summary.loops} ·{" "}
            {dict.result.kpiPurchased}: {formatLength(entry.summary.purchased, units, locale, dict, 1)}
          </p>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
            entry.summary.optimal
              ? "border-success/35 bg-success/10 text-success"
              : "border-border bg-muted text-muted-foreground",
          )}
        >
          {entry.summary.optimal ? dict.history.optimal : dict.history.fast}
        </span>
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs tabular-nums">
        <div className="flex items-baseline gap-1">
          <dt className="text-muted-foreground">{dict.coils.title}:</dt>
          <dd className="font-medium">{entry.summary.coils}</dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt className="text-muted-foreground">{dict.result.kpiWaste}:</dt>
          <dd className="font-medium">
            {formatLength(entry.summary.waste, units, locale, dict, 1)}
          </dd>
        </div>
        <div className="flex items-baseline gap-1">
          <dt className="text-muted-foreground">{dict.result.kpiCost}:</dt>
          <dd className="font-medium">
            {entry.summary.cost === null
              ? "—"
              : formatMoney(entry.summary.cost, locale, entry.summary.currency)}
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button size="sm" className="h-9" onClick={onOpen}>
          <FolderOpen aria-hidden />
          {dict.history.open}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          onClick={onStartRename}
          disabled={editing}
          aria-label={dict.history.rename}
        >
          <Pencil aria-hidden />
          <span className="hidden sm:inline">{dict.history.rename}</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive h-9"
          onClick={onRemove}
          aria-label={dict.history.remove}
        >
          <Trash2 aria-hidden />
        </Button>
      </div>
    </li>
  );
}
