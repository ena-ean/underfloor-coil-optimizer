import type { Currency } from "@/lib/format";
import type { UnitSystem } from "@/lib/units";

import { DEFAULT_SETTINGS, createId, normalizeSizes, sanitizeSettings } from "./model";
import type { CalculatorState, LoopEntry } from "./types";

export type Action =
  | { type: "hydrate"; state: CalculatorState }
  | { type: "add-loop"; floor?: number }
  | { type: "update-loop"; id: string; patch: Partial<Omit<LoopEntry, "id">> }
  | { type: "remove-loop"; id: string }
  | { type: "duplicate-loop"; id: string }
  | { type: "clear-loops" }
  | { type: "replace-loops"; loops: LoopEntry[] }
  | { type: "replace-settings"; settings: CalculatorState["settings"] }
  | { type: "add-size"; size: number }
  | { type: "remove-size"; size: number }
  | { type: "reset-sizes" }
  | { type: "set-reserve"; value: number }
  | { type: "set-price"; value: number }
  | { type: "set-price-per-size"; size: number; value: number | null }
  | { type: "set-currency"; value: Currency }
  | { type: "set-units"; value: UnitSystem };

/** Pure transition: every mutation of the calculator state goes through here. */
export function reducer(state: CalculatorState, action: Action): CalculatorState {
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
