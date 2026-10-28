"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { naivePurchaseLength } from "@/lib/algorithm";
import type { LoopInput, OptimizationOptions, PackingOutcome } from "@/lib/algorithm/types";
import { currencyForLocale, type Currency } from "@/lib/format";
import type { Locale } from "@/lib/i18n";

import { coilPrices, coilSizes, isDefaultCoils, round2 } from "./model";
import {
  abandonSolve,
  cancelSolve,
  getSolverServerSnapshot,
  getSolverSnapshot,
  resetSolver,
  retrySolve,
  startSolve,
  subscribeToSolver,
  type SolverRequest,
} from "./solver";
import {
  applyAction,
  getCalculatorServerSnapshot,
  getCalculatorSnapshot,
  subscribeToCalculator,
} from "./store";
import type { CalculatorActions, CalculatorController } from "./types";

export * from "./model";
export * from "./storage";
export * from "./types";
export {
  getCalculatorServerSnapshot,
  getCalculatorSnapshot,
  resetCalculatorStore,
  subscribeToCalculator,
} from "./store";
export { getSolverSnapshot, startSolve, subscribeToSolver } from "./solver";
export type { SolverRequest, SolverSnapshot } from "./solver";

/** Typing pauses this long before the exact search is started. */
const SOLVE_DEBOUNCE_MS = 180;

/**
 * A default catalogue belongs to a currency: 24 000 means roubles, not dollars,
 * so carrying those numbers into a dollar total would price a 200 m coil at
 * $24,000. When the currency changes and the catalogue is still the untouched
 * default of the old one, it moves to the default of the new one. Prices the
 * visitor typed, and a currency they picked themselves, are left alone.
 */
function setCurrencyAligned(next: Currency): void {
  const settings = getCalculatorSnapshot().settings;
  if (settings.currency === next) return;
  const replacePrices = isDefaultCoils(settings.coils, settings.currency);
  applyAction({ type: "set-currency", value: next });
  if (replacePrices) applyAction({ type: "reset-coils" });
}

const ACTIONS: CalculatorActions = {
  addLoop: (floor) => applyAction({ type: "add-loop", floor }),
  updateLoop: (id, patch) => applyAction({ type: "update-loop", id, patch }),
  removeLoop: (id) => applyAction({ type: "remove-loop", id }),
  duplicateLoop: (id) => applyAction({ type: "duplicate-loop", id }),
  clearLoops: () => applyAction({ type: "clear-loops" }),
  replaceLoops: (loops) => applyAction({ type: "replace-loops", loops }),
  replaceSettings: (settings) => applyAction({ type: "replace-settings", settings }),
  addCoil: (size, price) => applyAction({ type: "add-coil", size, price }),
  updateCoil: (id, patch) => applyAction({ type: "update-coil", id, patch }),
  removeCoil: (id) => applyAction({ type: "remove-coil", id }),
  resetCoils: () => applyAction({ type: "reset-coils" }),
  setReserve: (value) => applyAction({ type: "set-reserve", value }),
  setCurrency: (value) => setCurrencyAligned(value),
  setUnits: (value) => applyAction({ type: "set-units", value }),
};

/**
 * A language switch carries the default currency, and with it the default
 * price, along: Russian starts on roubles at 120 ₽/m, English on dollars at
 * $1.50/m. A currency the visitor picked explicitly is not touched, so a
 * deliberate EUR choice survives the switch.
 */
export function alignCurrencyWithLocale(previous: Locale, next: Locale): void {
  if (previous === next) return;
  if (getCalculatorSnapshot().settings.currency !== currencyForLocale(previous)) return;
  setCurrencyAligned(currencyForLocale(next));
}

/** Identity of a search: a finished plan for another key is never displayed. */
function requestKey(loops: LoopInput[], options: OptimizationOptions): string {
  return [
    loops.map((loop) => `${loop.floor}:${loop.length}`).join(","),
    options.reserve ?? 0,
    [...options.coilSizes].sort((a, b) => a - b).join(","),
    options.prices?.perMeter ?? 0,
    JSON.stringify(options.prices?.perSize ?? {}),
    JSON.stringify(options.prices?.perCoil ?? {}),
  ].join("|");
}

/**
 * Single source of truth of the calculator: persisted state, the running
 * search and the actions the components call.
 */
export function useCalculator(): CalculatorController {
  const state = useSyncExternalStore(
    subscribeToCalculator,
    getCalculatorSnapshot,
    getCalculatorServerSnapshot,
  );

  const search = useSyncExternalStore(
    subscribeToSolver,
    getSolverSnapshot,
    getSolverServerSnapshot,
  );

  const activeLoops = useMemo(
    () => state.loops.filter((loop) => loop.length > 0),
    [state.loops],
  );

  const request = useMemo<SolverRequest>(() => {
    const loops = activeLoops.map<LoopInput>((loop) => ({
      id: loop.id,
      floor: loop.floor,
      length: loop.length,
    }));
    const { coils, reserve } = state.settings;
    const sizes = coilSizes(coils);
    const perCoil = coilPrices(coils);
    const priced = Object.values(perCoil).some((price) => price > 0);
    const options: OptimizationOptions = {
      coilSizes: sizes,
      reserve,
      prices: priced ? { perMeter: 0, perCoil } : undefined,
    };
    return { key: requestKey(loops, options), loops, options };
  }, [activeLoops, state.settings]);

  useEffect(() => {
    if (request.loops.length === 0 || request.options.coilSizes.length === 0) {
      resetSolver();
      return;
    }
    const timer = setTimeout(() => startSolve(request), SOLVE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      abandonSolve();
    };
  }, [request]);

  const cancelSearch = useCallback(() => cancelSolve(), []);
  const retrySearch = useCallback(() => retrySolve(), []);

  const outcome = useMemo<PackingOutcome | null>(
    () => (search.key === request.key ? search.outcome : null),
    [search.key, search.outcome, request.key],
  );

  const naivePurchase = useMemo(
    () =>
      activeLoops.length > 0
        ? naivePurchaseLength(
            activeLoops,
            coilSizes(state.settings.coils),
            state.settings.reserve,
          )
        : 0,
    [activeLoops, state.settings.coils, state.settings.reserve],
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
    search,
    naivePurchase,
    totalDesign,
    totalWithReserve,
    actions: ACTIONS,
    cancelSearch,
    retrySearch,
  };
}
