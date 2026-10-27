import type { Currency } from "@/lib/format";
import type { CalculatorSettings, LoopEntry } from "@/lib/state";

export interface HistorySummary {
  loops: number;
  /** Design length of the loops, in metres. */
  design: number;
  /** Design length plus the connection reserve, in metres. */
  withReserve: number;
  coils: number;
  purchased: number;
  waste: number;
  cost: number | null;
  currency: Currency;
  gap: number;
  optimal: boolean;
}

export interface HistoryEntry {
  id: string;
  /** Unix milliseconds; the newest entry is always first. */
  createdAt: number;
  /** Stable identity of the inputs — used to merge recalculations. */
  signature: string;
  /** User-defined name, `""` when the title is derived from the summary. */
  label: string;
  loops: LoopEntry[];
  settings: CalculatorSettings;
  summary: HistorySummary;
}
