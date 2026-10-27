// A tiny external store: React reads it through `useSyncExternalStore`, so the
// persisted state survives reloads without any hydration effects, and changes
// are written back to `localStorage` exactly once per action.

import { DEFAULT_SETTINGS } from "./model";
import { reducer, type Action } from "./reducer";
import { STORAGE_KEY, loadState, saveState } from "./storage";
import type { CalculatorState } from "./types";

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
export function applyAction(action: Action): void {
  currentState = reducer(ensureState(), action);
  saveState(currentState);
  emit();
}

/** Testing helper: drops the cached state so the next read hits storage. */
export function resetCalculatorStore(): void {
  currentState = null;
  emit();
}
