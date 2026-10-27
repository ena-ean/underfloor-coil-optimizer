"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { naivePurchaseLength } from "@/lib/algorithm";
import type { LoopInput, OptimizationOptions, PackingOutcome } from "@/lib/algorithm/types";
import { currencyForLocale, type Currency } from "@/lib/format";
import type { Locale } from "@/lib/i18n";

import { DEFAULT_PRICE_PER_METRE, isDefaultPrice, round2 } from "./model";
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
 * A default price belongs to a currency: 120 means roubles, not dollars, so
 * carrying that number into a dollar total would turn a 200 m coil into
 * $24,000. When the currency changes and the price is still the untouched
 * default of the old one, it moves to the default of the new one. A price the
 * visitor typed, and a currency they picked themselves, are left alone.
 */
function setCurrencyAligned(next: Currency): void {
  const settings = getCalculatorSnapshot().settings;
  if (settings.currency === next) return;
  const replacePrice = isDefaultPrice(settings.pricePerMetre, settings.currency);
  applyAction({ type: "set-currency", value: next });
  if (replacePrice) applyAction({ type: "set-price", value: DEFAULT_PRICE_PER_METRE[next] });
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
  setPrice: (value) => applyAction({ type: "set-price", value }),
  setPricePerSize: (size, value) => applyAction({ type: "set-price-per-size", size, value }),
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
    const { sizes, reserve, pricePerMetre, pricePerSize } = state.settings;
    const options: OptimizationOptions = {
      coilSizes: sizes,
      reserve,
      prices: pricePerMetre > 0 ? { perMeter: pricePerMetre, perSize: pricePerSize } : undefined,
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
    search,
    naivePurchase,
    totalDesign,
    totalWithReserve,
    actions: ACTIONS,
    cancelSearch,
    retrySearch,
  };
}
