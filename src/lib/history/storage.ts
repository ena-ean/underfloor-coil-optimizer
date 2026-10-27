import { HISTORY_SCHEMA_VERSION, HISTORY_STORAGE_KEY } from "./constants";
import { sanitizeHistory } from "./model";
import type { HistoryEntry } from "./types";

/** The slice of `localStorage` the history needs; tests pass a fake. */
export type HistoryStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function defaultStorage(): HistoryStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadHistory(storage: HistoryStorage | null = defaultStorage()): HistoryEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(HISTORY_STORAGE_KEY);
    return raw ? sanitizeHistory(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveHistory(
  entries: HistoryEntry[],
  storage: HistoryStorage | null = defaultStorage(),
): void {
  if (!storage) return;
  const payload = (list: HistoryEntry[]) =>
    JSON.stringify({ version: HISTORY_SCHEMA_VERSION, entries: list });

  try {
    storage.setItem(HISTORY_STORAGE_KEY, payload(entries));
  } catch {
    // Quota exceeded: keep the newest half and try once more.
    try {
      storage.setItem(
        HISTORY_STORAGE_KEY,
        payload(entries.slice(0, Math.max(1, entries.length >> 1))),
      );
    } catch {
      // Storage blocked — the in-memory buffer keeps working.
    }
  }
}
