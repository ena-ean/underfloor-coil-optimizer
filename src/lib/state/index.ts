"use client";

import { useMemo, useSyncExternalStore } from "react";

import { naivePurchaseLength, optimizePacking } from "@/lib/algorithm";
import type { PackingOutcome } from "@/lib/algorithm/types";
import { currencyForLocale } from "@/lib/format";
import type { Locale } from "@/lib/i18n";

import { round2 } from "./model";
import {
  applyAction,
  getCalculatorServerSnapshot,
  getCalculatorSnapshot,
  subscribeToCalculator,
} from "./store";
import type { CalculatorActions, CalculatorController, LoopEntry } from "./types";

export * from "./model";
export * from "./storage";
export * from "./types";
export {
  getCalculatorServerSnapshot,
  getCalculatorSnapshot,
  resetCalculatorStore,
  subscribeToCalculator,
} from "./store";

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
  if (getCalculatorSnapshot().settings.currency !== currencyForLocale(previous)) return;
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
      activeLoops.map((loop: LoopEntry) => ({
        id: loop.id,
        floor: loop.floor,
        length: loop.length,
      })),
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
