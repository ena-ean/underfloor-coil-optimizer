import { describe, expect, it } from "vitest";

import { optimizePacking } from "@/lib/algorithm";
import type { PackingResult } from "@/lib/algorithm/types";
import { DEFAULT_SETTINGS, sanitizeLoop, type CalculatorState, type LoopEntry } from "@/lib/state";
import {
  createHistoryEntry,
  exportHistory,
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  importHistory,
  loadHistory,
  removeHistoryEntry,
  renameHistoryEntry,
  sanitizeHistory,
  saveHistory,
  stateSignature,
  trimHistory,
  upsertHistoryEntry,
  type HistoryEntry,
  type HistoryStorage,
} from "@/lib/history";

const loops = (lengths: number[], floor = 1): LoopEntry[] =>
  lengths.map((length, index) => ({ id: `loop-${index}`, floor, length }));

/** Reference case from the original manual calculation: 19 loops, 200 m coils. */
const referenceState: CalculatorState = {
  loops: loops([...Array.from({ length: 15 }, () => 64), ...Array.from({ length: 4 }, () => 74)]),
  settings: { ...DEFAULT_SETTINGS, sizes: [200], reserve: 2 },
};

const solve = (state: CalculatorState): PackingResult => {
  const outcome = optimizePacking(
    state.loops.filter((loop) => loop.length > 0),
    {
      coilSizes: state.settings.sizes,
      reserve: state.settings.reserve,
      objective: state.settings.objective,
    },
  );
  if (!outcome.ok) throw new Error(`expected success, got ${outcome.error.code}`);
  return outcome.result;
};

const entryFor = (state: CalculatorState, now = 1_700_000_000_000) =>
  createHistoryEntry(state, solve(state), now);

/** In-memory stand-in for `window.localStorage`. */
function memoryStorage(): HistoryStorage & { dump(): Map<string, string> } {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
    dump: () => data,
  };
}

describe("history entries", () => {
  it("summarises the reference packing", () => {
    const entry = entryFor(referenceState);

    expect(entry.summary).toMatchObject({
      loops: 19,
      design: 1256,
      withReserve: 1294,
      coils: 7,
      purchased: 1400,
      waste: 106,
      gap: 0,
      optimal: true,
    });
    expect(entry.loops).toHaveLength(19);
    expect(entry.settings.sizes).toEqual([200]);
    expect(entry.label).toBe("");
  });

  it("uses the same signature for the same inputs and a different one otherwise", () => {
    const base = stateSignature(referenceState);
    expect(stateSignature({ ...referenceState, loops: [...referenceState.loops] })).toBe(base);

    const other = stateSignature({
      ...referenceState,
      settings: { ...referenceState.settings, reserve: 3 },
    });
    expect(other).not.toBe(base);
  });

  it("ignores empty rows when building the signature", () => {
    const padded: CalculatorState = {
      ...referenceState,
      loops: [...referenceState.loops, { id: "blank", floor: 1, length: 0 }],
    };
    expect(stateSignature(padded)).toBe(stateSignature(referenceState));
  });

  it("merges a recalculation and moves it to the top, keeping id and name", () => {
    const older = entryFor({ ...referenceState, settings: { ...referenceState.settings, sizes: [100, 200] } });
    const first = entryFor(referenceState, 1_700_000_000_000);
    const renamed = renameHistoryEntry([older, first], first.id, "  Первый этаж  ");

    const second = entryFor(referenceState, 1_700_000_100_000);
    const merged = upsertHistoryEntry(renamed, second);

    expect(merged).toHaveLength(2);
    expect(merged[0].id).toBe(first.id);
    expect(merged[0].label).toBe("Первый этаж");
    expect(merged[0].createdAt).toBe(1_700_000_100_000);
  });

  it("keeps only the newest entries up to the limit", () => {
    const entries = Array.from({ length: HISTORY_LIMIT + 5 }, (_, index) =>
      entryFor({ ...referenceState, settings: { ...referenceState.settings, reserve: index } }),
    );
    expect(trimHistory(entries)).toHaveLength(HISTORY_LIMIT);
    expect(trimHistory(entries)[0]).toBe(entries[0]);
  });

  it("drops a deleted entry", () => {
    const entry = entryFor(referenceState);
    const other = entryFor({ ...referenceState, settings: { ...referenceState.settings, reserve: 5 } });

    expect(removeHistoryEntry([entry, other], entry.id)).toEqual([other]);
  });
});

describe("room names", () => {
  it("keeps an optional room name and cleans it up", () => {
    expect(sanitizeLoop({ id: "a", floor: 1, length: 64, room: "  Кухня   1 " })).toEqual({
      id: "a",
      floor: 1,
      length: 64,
      room: "Кухня 1",
    });
    expect(sanitizeLoop({ id: "a", floor: 1, length: 64, room: "   " })).toEqual({
      id: "a",
      floor: 1,
      length: 64,
    });
    expect(sanitizeLoop({ id: "a", floor: 1, length: 64, room: 7 })).toEqual({
      id: "a",
      floor: 1,
      length: 64,
    });
  });

  it("does not take part in the state signature", () => {
    const named: CalculatorState = {
      ...referenceState,
      loops: referenceState.loops.map((loop, index) =>
        index === 0 ? { ...loop, room: "Кухня" } : loop,
      ),
    };
    expect(stateSignature(named)).toBe(stateSignature(referenceState));
  });

  it("travels through a history entry, its export and its import", () => {
    const named: CalculatorState = {
      ...referenceState,
      loops: referenceState.loops.map((loop, index) =>
        index === 0 ? { ...loop, room: "  Кухня  " } : loop,
      ),
    };
    const entry = entryFor(named);
    expect(entry.loops[0].room).toBe("Кухня");

    const [restored] = sanitizeHistory(JSON.parse(exportHistory([entry])));
    expect(restored.loops[0].room).toBe("Кухня");
    expect(restored.signature).toBe(entry.signature);
  });
});

describe("history storage", () => {
  it("round-trips through a storage object", () => {
    const storage = memoryStorage();
    const entry = entryFor(referenceState);

    saveHistory([entry], storage);
    expect(storage.dump().has(HISTORY_STORAGE_KEY)).toBe(true);

    const loaded = loadHistory(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].signature).toBe(entry.signature);
    expect(loaded[0].summary.purchased).toBe(1400);
  });

  it("returns an empty buffer for garbage or missing data", () => {
    expect(loadHistory(memoryStorage())).toEqual([]);

    const broken = memoryStorage();
    broken.setItem(HISTORY_STORAGE_KEY, "{not json");
    expect(loadHistory(broken)).toEqual([]);
  });

  it("survives a quota error by keeping the newest half", () => {
    const data = new Map<string, string>();
    let calls = 0;
    const storage: HistoryStorage = {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        calls += 1;
        if (calls === 1) throw new Error("QuotaExceededError");
        data.set(key, value);
      },
      removeItem: (key) => void data.delete(key),
    };

    const entries = [
      entryFor(referenceState, 3),
      entryFor({ ...referenceState, settings: { ...referenceState.settings, reserve: 4 } }, 2),
      entryFor({ ...referenceState, settings: { ...referenceState.settings, reserve: 6 } }, 1),
    ];
    saveHistory(entries, storage);

    expect(calls).toBe(2);
    expect(loadHistory(storage)).toHaveLength(1);
  });
});

describe("history import / export", () => {
  it("exports a versioned document and imports it back", () => {
    const entry = entryFor(referenceState);
    const raw = exportHistory([entry], 1_700_000_500_000);
    const document = JSON.parse(raw) as { version: number; entries: HistoryEntry[] };

    expect(document.version).toBe(1);
    expect(document.entries).toHaveLength(1);

    const { entries, imported } = importHistory(raw, []);
    expect(imported).toBe(1);
    expect(entries[0].summary.coils).toBe(7);
  });

  it("merges an import into the current buffer without duplicates", () => {
    const shared = entryFor(referenceState, 1_000);
    const extra = entryFor({ ...referenceState, settings: { ...referenceState.settings, reserve: 4 } }, 2_000);

    const { entries, imported } = importHistory(exportHistory([shared]), [shared, extra]);
    expect(imported).toBe(1);
    expect(entries).toHaveLength(2);
  });

  it("rejects a file that is not a history export", () => {
    expect(importHistory("not json at all", [])).toEqual({ entries: [], imported: 0 });
    expect(importHistory(JSON.stringify({ hello: "world" }), [])).toEqual({
      entries: [],
      imported: 0,
    });
  });

  it("sanitises a stored buffer: keeps valid entries, newest first", () => {
    const older = entryFor(referenceState, 1_000);
    const newer = entryFor({ ...referenceState, settings: { ...referenceState.settings, reserve: 3 } }, 2_000);

    const cleaned = sanitizeHistory({
      version: 1,
      entries: [
        { ...older, loops: [] },
        older,
        newer,
        "nonsense",
        { ...newer, summary: null },
      ],
    });

    expect(cleaned.map((entry) => entry.createdAt)).toEqual([2_000, 1_000]);
  });

  it("recomputes the signature instead of trusting the file", () => {
    const entry = entryFor(referenceState);
    const [restored] = sanitizeHistory([{ ...entry, signature: "forged" }]);

    expect(restored.signature).toBe(stateSignature(referenceState));
  });
});
