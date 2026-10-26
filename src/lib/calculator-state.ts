"use client";

import { useMemo, useSyncExternalStore } from "react";

import { naivePurchaseLength, optimizePacking } from "@/lib/algorithm";
import { DEFAULT_COIL_SIZES, type Objective, type PackingOutcome } from "@/lib/algorithm/types";
import { currencyForLocale, isCurrency, type Currency } from "@/lib/format";
import { currentLocale, type Locale } from "@/lib/i18n";
import { isUnitSystem, type UnitSystem } from "@/lib/units";

export interface LoopEntry {
  id: string;
  floor: number;
  length: number;
}

export interface CalculatorSettings {
  sizes: number[];
  reserve: number;
  objective: Objective;
  pricePerMetre: number;
  pricePerSize: Record<string, number>;
  currency: Currency;
  /** Display units only: lengths are always stored in metres. */
  units: UnitSystem;
}

export interface CalculatorState {
  loops: LoopEntry[];
  settings: CalculatorSettings;
}

const STORAGE_KEY = "coil-calc:state";
const LEGACY_STORAGE_KEY = "coil-calc-state";
const SCHEMA_VERSION = 2;

/** Largest coil the catalogue accepts, in metres. */
const MAX_COIL_SIZE = 20000;
/** Guard against a pathological list pasted into the size editor. */
export const MAX_COIL_SIZES = 24;

export const DEFAULT_SETTINGS: CalculatorSettings = {
  sizes: [50, 100, 200, 250, 500, 600],
  reserve: 2,
  objective: "waste",
  pricePerMetre: 120,
  pricePerSize: {},
  currency: "RUB",
  units: "metric",
};

export const ALL_COIL_SIZES: readonly number[] = DEFAULT_COIL_SIZES;

export const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Unique, positive, sorted coil sizes; rounds to whole centimetres. */
export function normalizeSizes(values: readonly number[]): number[] {
  const unique = new Set<number>();
  for (const raw of values) {
    const size = round2(Number(raw));
    if (!Number.isFinite(size) || size <= 0 || size > MAX_COIL_SIZE) continue;
    unique.add(size);
  }
  return [...unique].sort((a, b) => a - b).slice(0, MAX_COIL_SIZES);
}


export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `loop-${Math.random().toString(36).slice(2, 10)}`;
}

/** 19 loops / 1294 m — the case from the original manual calculation. */
export function sampleLoops(): LoopEntry[] {
  return [
    ...Array.from({ length: 15 }, () => ({ id: createId(), floor: 1, length: 64 })),
    ...Array.from({ length: 4 }, () => ({ id: createId(), floor: 2, length: 74 })),
  ];
}

export function sanitizeLoop(value: unknown): LoopEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const length = Number(candidate.length);
  const floor = Number(candidate.floor);
  if (!Number.isFinite(length) || length < 0) return null;
  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createId(),
    floor: Number.isFinite(floor) && floor > 0 ? Math.round(floor) : 1,
    length: Math.round(length * 100) / 100,
  };
}

export function sanitizeSettings(
  value: unknown,
  fallbackCurrency: Currency = "RUB",
): CalculatorSettings {
  const candidate = (value ?? {}) as Record<string, unknown>;
  const sizes = Array.isArray(candidate.sizes) ? normalizeSizes(candidate.sizes) : [];

  const pricePerSizeRaw = (candidate.pricePerSize ?? {}) as Record<string, unknown>;
  const pricePerSize: Record<string, number> = {};
  for (const [key, raw] of Object.entries(pricePerSizeRaw)) {
    const price = Number(raw);
    if (Number.isFinite(price) && price > 0) pricePerSize[key] = price;
  }

  const reserve = Number(candidate.reserve);
  const pricePerMetre = Number(candidate.pricePerMetre);

  return {
    sizes: sizes.length > 0 ? sizes : DEFAULT_SETTINGS.sizes,
    reserve: Number.isFinite(reserve) && reserve >= 0 ? reserve : DEFAULT_SETTINGS.reserve,
    objective: candidate.objective === "cost" ? "cost" : "waste",
    pricePerMetre: Number.isFinite(pricePerMetre) && pricePerMetre >= 0 ? pricePerMetre : 0,
    pricePerSize,
    currency: isCurrency(candidate.currency) ? candidate.currency : fallbackCurrency,
    units: isUnitSystem(candidate.units) ? candidate.units : DEFAULT_SETTINGS.units,
  };
}


// ─── Persistence ────────────────────────────────────────────────────────────

/** Defaults for a first visit — the currency follows the interface language. */
export function createDefaultSettings(): CalculatorSettings {
  return { ...DEFAULT_SETTINGS, currency: currencyForLocale(currentLocale()) };
}

/** Reads the persisted state, migrating the v1 (pre-refactor) layout. */
export function loadState(): CalculatorState {
  if (typeof window === "undefined") {
    return { loops: [], settings: createDefaultSettings() };
  }

  const read = (key: string): unknown => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const stored = read(STORAGE_KEY) as Record<string, unknown> | null;
  if (stored && Array.isArray(stored.loops)) {
    const loops = stored.loops.map(sanitizeLoop).filter((loop): loop is LoopEntry => loop !== null);
    return { loops, settings: sanitizeSettings(stored.settings, currencyForLocale(currentLocale())) };
  }

  // v1 kept everything under a single unversioned key.
  const legacy = read(LEGACY_STORAGE_KEY) as Record<string, unknown> | null;
  if (legacy && Array.isArray(legacy.loops)) {
    const loops = legacy.loops.map(sanitizeLoop).filter((loop): loop is LoopEntry => loop !== null);
    return {
      loops,
      settings: sanitizeSettings(
        {
          sizes: legacy.coilSizes,
          reserve: legacy.reserve,
          pricePerMetre: legacy.pricePerMeter,
        },
        currencyForLocale(currentLocale()),
      ),
    };
  }

  return { loops: [], settings: createDefaultSettings() };
}

export function saveState(state: CalculatorState): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: SCHEMA_VERSION, ...state }),
    );
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage full or blocked — the calculator keeps working in memory.
  }
}

// ─── Reducer ────────────────────────────────────────────────────────────────

type Action =
  | { type: "hydrate"; state: CalculatorState }
  | { type: "add-loop"; floor?: number }
  | { type: "update-loop"; id: string; patch: Partial<Omit<LoopEntry, "id">> }
  | { type: "remove-loop"; id: string }
  | { type: "duplicate-loop"; id: string }
  | { type: "clear-loops" }
  | { type: "replace-loops"; loops: LoopEntry[] }
  | { type: "replace-settings"; settings: CalculatorSettings }
  | { type: "add-size"; size: number }
  | { type: "remove-size"; size: number }
  | { type: "reset-sizes" }
  | { type: "set-reserve"; value: number }
  | { type: "set-objective"; value: Objective }
  | { type: "set-price"; value: number }
  | { type: "set-price-per-size"; size: number; value: number | null }
  | { type: "set-currency"; value: Currency }
  | { type: "set-units"; value: UnitSystem };

function reducer(state: CalculatorState, action: Action): CalculatorState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "add-loop": {
      const last = state.loops[state.loops.length - 1];
      return {
        ...state,
        loops: [
          ...state.loops,
          { id: createId(), floor: action.floor ?? last?.floor ?? 1, length: 0 },
        ],
      };
    }
    case "update-loop":
      return {
        ...state,
        loops: state.loops.map((loop) =>
          loop.id === action.id ? { ...loop, ...action.patch } : loop,
        ),
      };
    case "remove-loop":
      return { ...state, loops: state.loops.filter((loop) => loop.id !== action.id) };
    case "duplicate-loop": {
      const index = state.loops.findIndex((loop) => loop.id === action.id);
      if (index < 0) return state;
      const loops = [...state.loops];
      loops.splice(index + 1, 0, { ...state.loops[index], id: createId() });
      return { ...state, loops };
    }
    case "clear-loops":
      return { ...state, loops: [] };
    case "replace-loops":
      return { ...state, loops: action.loops };
    case "replace-settings":
      return { ...state, settings: sanitizeSettings(action.settings) };
    case "add-size": {
      const sizes = normalizeSizes([...state.settings.sizes, action.size]);
      return { ...state, settings: { ...state.settings, sizes } };
    }
    case "remove-size": {
      const sizes = state.settings.sizes.filter((size) => size !== action.size);
      // The last size stays: without a catalogue there is nothing to pack into.
      if (sizes.length === 0) return state;
      return { ...state, settings: { ...state.settings, sizes } };
    }
    case "reset-sizes":
      return { ...state, settings: { ...state.settings, sizes: [...DEFAULT_SETTINGS.sizes] } };
    case "set-reserve":
      return { ...state, settings: { ...state.settings, reserve: Math.max(0, action.value) } };
    case "set-objective":
      return { ...state, settings: { ...state.settings, objective: action.value } };
    case "set-price":
      return {
        ...state,
        settings: { ...state.settings, pricePerMetre: Math.max(0, action.value) },
      };
    case "set-price-per-size": {
      const next = { ...state.settings.pricePerSize };
      const key = String(action.size);
      if (action.value === null || action.value <= 0) delete next[key];
      else next[key] = action.value;
      return { ...state, settings: { ...state.settings, pricePerSize: next } };
    }
    case "set-currency":
      return { ...state, settings: { ...state.settings, currency: action.value } };
    case "set-units":
      return { ...state, settings: { ...state.settings, units: action.value } };
    default:
      return state;
  }
}

// ─── Store ──────────────────────────────────────────────────────────────────
//
// A tiny external store: React reads it through `useSyncExternalStore`, so the
// persisted state survives reloads without any hydration effects, and changes
// are written back to `localStorage` exactly once per action.

const EMPTY_STATE: CalculatorState = { loops: [], settings: DEFAULT_SETTINGS };

let currentState: CalculatorState | null = null;
const listeners = new Set<() => void>();

function ensureState(): CalculatorState {
  if (!currentState) currentState = loadState();
  return currentState;
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToCalculator(callback: () => void): () => void {
  listeners.add(callback);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    currentState = loadState();
    callback();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function getCalculatorSnapshot(): CalculatorState {
  return ensureState();
}

export function getCalculatorServerSnapshot(): CalculatorState {
  return EMPTY_STATE;
}

/** Applies an action, persists the result and wakes up every subscriber. */
function applyAction(action: Action): void {
  currentState = reducer(ensureState(), action);
  saveState(currentState);
  emit();
}

/** Testing helper: drops the cached state so the next read hits storage. */
export function resetCalculatorStore(): void {
  currentState = null;
  emit();
}

export interface CalculatorActions {
  addLoop: (floor?: number) => void;
  updateLoop: (id: string, patch: Partial<Omit<LoopEntry, "id">>) => void;
  removeLoop: (id: string) => void;
  duplicateLoop: (id: string) => void;
  clearLoops: () => void;
  replaceLoops: (loops: LoopEntry[]) => void;
  replaceSettings: (settings: CalculatorSettings) => void;
  addSize: (size: number) => void;
  removeSize: (size: number) => void;
  resetSizes: () => void;
  setReserve: (value: number) => void;
  setObjective: (value: Objective) => void;
  setPrice: (value: number) => void;
  setPricePerSize: (size: number, value: number | null) => void;
  setCurrency: (value: Currency) => void;
  setUnits: (units: UnitSystem) => void;
}

export interface CalculatorController {
  state: CalculatorState;
  /** Loops with a positive length — the ones that take part in the packing. */
  activeLoops: LoopEntry[];
  outcome: PackingOutcome | null;
  naivePurchase: number;
  totalDesign: number;
  totalWithReserve: number;
  actions: CalculatorActions;
}

const ACTIONS: CalculatorActions = {
  addLoop: (floor) => applyAction({ type: "add-loop", floor }),
  updateLoop: (id, patch) => applyAction({ type: "update-loop", id, patch }),
  removeLoop: (id) => applyAction({ type: "remove-loop", id }),
  duplicateLoop: (id) => applyAction({ type: "duplicate-loop", id }),
  clearLoops: () => applyAction({ type: "clear-loops" }),
  replaceLoops: (loops) => applyAction({ type: "replace-loops", loops }),
  replaceSettings: (settings) => applyAction({ type: "replace-settings", settings }),
  addSize: (size) => applyAction({ type: "add-size", size }),
  removeSize: (size) => applyAction({ type: "remove-size", size }),
  resetSizes: () => applyAction({ type: "reset-sizes" }),
  setReserve: (value) => applyAction({ type: "set-reserve", value }),
  setObjective: (value) => applyAction({ type: "set-objective", value }),
  setPrice: (value) => applyAction({ type: "set-price", value }),
  setPricePerSize: (size, value) => applyAction({ type: "set-price-per-size", size, value }),
  setCurrency: (value) => applyAction({ type: "set-currency", value }),
  setUnits: (value) => applyAction({ type: "set-units", value }),
};

/**
 * A language switch carries the default currency with it: Russian starts on
 * roubles, English on dollars. A currency the visitor picked explicitly is not
 * touched, so a deliberate EUR choice survives the switch.
 */
export function alignCurrencyWithLocale(previous: Locale, next: Locale): void {
  if (previous === next) return;
  if (ensureState().settings.currency !== currencyForLocale(previous)) return;
  applyAction({ type: "set-currency", value: currencyForLocale(next) });
}

/**
 * Single source of truth of the calculator: persisted state, live
 * recalculation and the actions the components call.
 */
export function useCalculator(): CalculatorController {
  const state = useSyncExternalStore(
    subscribeToCalculator,
    getCalculatorSnapshot,
    getCalculatorServerSnapshot,
  );

  const activeLoops = useMemo(
    () => state.loops.filter((loop) => loop.length > 0),
    [state.loops],
  );

  const outcome = useMemo<PackingOutcome | null>(() => {
    if (activeLoops.length === 0) return null;
    const { sizes, reserve, objective, pricePerMetre, pricePerSize } = state.settings;
    const prices =
      pricePerMetre > 0 ? { perMeter: pricePerMetre, perSize: pricePerSize } : undefined;

    return optimizePacking(
      activeLoops.map((loop) => ({ id: loop.id, floor: loop.floor, length: loop.length })),
      { coilSizes: sizes, reserve, objective, prices },
    );
  }, [activeLoops, state.settings]);

  const naivePurchase = useMemo(
    () =>
      activeLoops.length > 0
        ? naivePurchaseLength(activeLoops, state.settings.sizes, state.settings.reserve)
        : 0,
    [activeLoops, state.settings.sizes, state.settings.reserve],
  );

  const totalDesign = useMemo(
    () => round2(activeLoops.reduce((sum, loop) => sum + loop.length, 0)),
    [activeLoops],
  );

  const totalWithReserve = useMemo(
    () => round2(totalDesign + activeLoops.length * state.settings.reserve),
    [totalDesign, activeLoops.length, state.settings.reserve],
  );

  return {
    state,
    activeLoops,
    outcome,
    naivePurchase,
    totalDesign,
    totalWithReserve,
    actions: ACTIONS,
  };
}
