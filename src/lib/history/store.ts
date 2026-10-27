import { useSyncExternalStore } from "react";

import type { PackingResult } from "@/lib/algorithm/types";
import type { CalculatorState } from "@/lib/state";

import { HISTORY_STORAGE_KEY } from "./constants";
import {
  createHistoryEntry,
  removeHistoryEntry,
  renameHistoryEntry,
  sanitizeHistory,
  trimHistory,
  upsertHistoryEntry,
} from "./model";
import { loadHistory, saveHistory } from "./storage";
import type { HistoryEntry } from "./types";

const EMPTY_HISTORY: HistoryEntry[] = [];
const listeners = new Set<() => void>();
let cache: HistoryEntry[] | null = null;

function ensureHistory(): HistoryEntry[] {
  if (!cache) cache = loadHistory();
  return cache;
}

function commit(entries: HistoryEntry[]): void {
  cache = entries;
  saveHistory(entries);
  for (const listener of listeners) listener();
}

export function subscribeToHistory(callback: () => void): () => void {
  listeners.add(callback);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== HISTORY_STORAGE_KEY) return;
    cache = loadHistory();
    callback();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function getHistorySnapshot(): HistoryEntry[] {
  return ensureHistory();
}

/** The server has no storage: render the empty state, hydrate on the client. */
export function getHistoryServerSnapshot(): HistoryEntry[] {
  return EMPTY_HISTORY;
}

/** Subscribes a component to the stored history. */
export function useHistory(): HistoryEntry[] {
  return useSyncExternalStore(subscribeToHistory, getHistorySnapshot, getHistoryServerSnapshot);
}

/** Saves a finished calculation and returns the (possibly merged) entry. */
export function recordHistory(state: CalculatorState, result: PackingResult): HistoryEntry {
  const entry = createHistoryEntry(state, result);
  commit(upsertHistoryEntry(ensureHistory(), entry));
  return entry;
}

export function deleteHistoryEntry(id: string): void {
  commit(removeHistoryEntry(ensureHistory(), id));
}

export function renameHistory(id: string, label: string): void {
  commit(renameHistoryEntry(ensureHistory(), id, label));
}

/** Clears the buffer and returns what was there, so the UI can offer an undo. */
export function clearHistory(): HistoryEntry[] {
  const previous = ensureHistory();
  commit([]);
  return previous;
}

/** Replaces the whole buffer — used by import and by undo. */
export function replaceHistory(entries: HistoryEntry[]): void {
  commit(trimHistory(sanitizeHistory(entries)));
}

/** Testing helper: drops the cache so the next read hits storage again. */
export function resetHistoryStore(): void {
  cache = null;
  for (const listener of listeners) listener();
}
