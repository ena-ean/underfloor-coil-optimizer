import type { PackingResult } from "@/lib/algorithm/types";
import { isCurrency, type Currency } from "@/lib/format";
import {
  createId,
  normalizeLoop,
  round2,
  sanitizeLoop,
  sanitizeSettings,
  type CalculatorState,
  type LoopEntry,
} from "@/lib/state";

import { HISTORY_LIMIT, HISTORY_SCHEMA_VERSION, LABEL_LIMIT } from "./constants";
import type { HistoryEntry, HistorySummary } from "./types";

/** Identity of the calculator inputs: loop lengths, floors and settings. */
export function stateSignature(state: CalculatorState): string {
  const loops = state.loops
    .filter((loop) => loop.length > 0)
    .map((loop) => `${loop.floor}:${round2(loop.length)}`)
    .sort()
    .join("|");

  const { sizes, reserve, pricePerMetre, pricePerSize, currency } = state.settings;
  const prices = Object.keys(pricePerSize)
    .sort()
    .map((key) => `${key}=${round2(pricePerSize[key])}`)
    .join(",");

  return [
    loops,
    [...sizes].sort((a, b) => a - b).join(","),
    round2(reserve),
    round2(pricePerMetre),
    prices,
    currency,
  ].join("#");
}

/** Builds an entry from the current calculator state and a finished packing. */
export function createHistoryEntry(
  state: CalculatorState,
  result: PackingResult,
  now: number = Date.now(),
): HistoryEntry {
  const active = state.loops.filter((loop) => loop.length > 0);

  return {
    id: createId(),
    createdAt: now,
    signature: stateSignature(state),
    label: "",
    loops: state.loops.map(normalizeLoop),
    settings: { ...state.settings, pricePerSize: { ...state.settings.pricePerSize } },
    summary: {
      loops: active.length,
      design: round2(result.totalDesign),
      withReserve: round2(result.totalUsed),
      coils: result.coils.length,
      purchased: round2(result.totalCoilLength),
      waste: round2(result.totalWaste),
      cost: result.totalCost === null ? null : round2(result.totalCost),
      currency: state.settings.currency,
      gap: round2(result.diagnostics.gap),
      optimal: result.diagnostics.optimal,
    },
  };
}

/** Keeps the newest `limit` entries. */
export function trimHistory(
  entries: HistoryEntry[],
  limit: number = HISTORY_LIMIT,
): HistoryEntry[] {
  return entries.length > limit ? entries.slice(0, limit) : entries;
}

/**
 * Inserts a fresh calculation. Recalculating the same inputs does not create a
 * duplicate — the existing entry moves to the top and keeps its id and name.
 */
export function upsertHistoryEntry(
  entries: HistoryEntry[],
  entry: HistoryEntry,
  limit: number = HISTORY_LIMIT,
): HistoryEntry[] {
  const index = entries.findIndex((item) => item.signature === entry.signature);
  if (index < 0) return trimHistory([entry, ...entries], limit);

  const existing = entries[index];
  const merged: HistoryEntry = { ...entry, id: existing.id, label: existing.label };
  const rest = entries.filter((_, position) => position !== index);
  return trimHistory([merged, ...rest], limit);
}

export function renameHistoryEntry(
  entries: HistoryEntry[],
  id: string,
  label: string,
): HistoryEntry[] {
  const next = label.trim().slice(0, LABEL_LIMIT);
  return entries.map((entry) => (entry.id === id ? { ...entry, label: next } : entry));
}

export function removeHistoryEntry(entries: HistoryEntry[], id: string): HistoryEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


function sanitizeSummary(value: unknown): HistorySummary | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const currency: Currency = isCurrency(candidate.currency) ? candidate.currency : "RUB";
  const cost =
    candidate.cost === null || candidate.cost === undefined
      ? null
      : round2(toNumber(candidate.cost));

  return {
    loops: Math.max(0, Math.round(toNumber(candidate.loops))),
    design: Math.max(0, round2(toNumber(candidate.design))),
    withReserve: Math.max(0, round2(toNumber(candidate.withReserve))),
    coils: Math.max(0, Math.round(toNumber(candidate.coils))),
    purchased: Math.max(0, round2(toNumber(candidate.purchased))),
    waste: Math.max(0, round2(toNumber(candidate.waste))),
    cost,
    currency,
    gap: Math.max(0, round2(toNumber(candidate.gap))),
    optimal: candidate.optimal === true,
  };
}

/** Validates one stored / imported entry; `null` means "drop it". */
export function sanitizeHistoryEntry(value: unknown): HistoryEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;

  const loopsRaw = Array.isArray(candidate.loops) ? candidate.loops : [];
  const loops = loopsRaw.map(sanitizeLoop).filter((loop): loop is LoopEntry => loop !== null);
  if (loops.length === 0) return null;

  const settings = sanitizeSettings(candidate.settings);
  const summary = sanitizeSummary(candidate.summary);
  if (!summary) return null;

  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createId(),
    createdAt: toNumber(candidate.createdAt, Date.now()),
    signature: stateSignature({ loops, settings }),
    label:
      typeof candidate.label === "string" ? candidate.label.trim().slice(0, LABEL_LIMIT) : "",
    loops,
    settings,
    summary,
  };
}

/**
 * Accepts either a bare array or `{ version, entries }`, drops garbage,
 * collapses duplicates (newest wins) and returns the buffer newest-first.
 */
export function sanitizeHistory(value: unknown): HistoryEntry[] {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { entries?: unknown }).entries)
      ? (value as { entries: unknown[] }).entries
      : [];

  const entries = raw
    .map(sanitizeHistoryEntry)
    .filter((entry): entry is HistoryEntry => entry !== null)
    .sort((a, b) => b.createdAt - a.createdAt);

  const seen = new Set<string>();
  const unique: HistoryEntry[] = [];
  for (const entry of entries) {
    if (seen.has(entry.signature)) continue;
    seen.add(entry.signature);
    unique.push(entry);
  }

  return trimHistory(unique);
}


/** Serialises the buffer for a JSON download. */
export function exportHistory(entries: HistoryEntry[], now: number = Date.now()): string {
  return JSON.stringify(
    { version: HISTORY_SCHEMA_VERSION, exportedAt: new Date(now).toISOString(), entries },
    null,
    2,
  );
}

/**
 * Merges an exported file into the current buffer. Entries of the file win
 * when the same inputs appear on both sides; the result stays newest-first.
 */
export function importHistory(
  raw: string,
  current: HistoryEntry[],
  now: number = Date.now(),
): { entries: HistoryEntry[]; imported: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { entries: current, imported: 0 };
  }

  const incoming = sanitizeHistory(parsed).map((entry) => ({
    ...entry,
    createdAt: entry.createdAt > now ? now : entry.createdAt,
  }));
  if (incoming.length === 0) return { entries: current, imported: 0 };

  const bySignature = new Map<string, HistoryEntry>();
  for (const entry of incoming) bySignature.set(entry.signature, entry);
  for (const entry of current) {
    if (!bySignature.has(entry.signature)) bySignature.set(entry.signature, entry);
  }

  const entries = trimHistory(
    [...bySignature.values()].sort((a, b) => b.createdAt - a.createdAt),
  );

  return { entries, imported: incoming.length };
}
