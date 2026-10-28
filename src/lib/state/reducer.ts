import type { Currency } from "@/lib/format";
import type { UnitSystem } from "@/lib/units";

import { MAX_COILS, createId, defaultCoils, round2, sanitizeSettings } from "./model";
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
  | { type: "add-coil"; size: number; price: number }
  | { type: "update-coil"; id: string; patch: { size?: number; price?: number } }
  | { type: "remove-coil"; id: string }
  | { type: "reset-coils" }
  | { type: "set-reserve"; value: number }
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
    case "add-coil": {
      const size = round2(action.size);
      if (!Number.isFinite(size) || size <= 0) return state;
      if (state.settings.coils.length >= MAX_COILS) return state;
      const price = round2(action.price);
      const coil = {
        id: createId(),
        size,
        price: Number.isFinite(price) && price > 0 ? price : 0,
      };
      return { ...state, settings: { ...state.settings, coils: [...state.settings.coils, coil] } };
    }
    case "update-coil":
      return {
        ...state,
        settings: {
          ...state.settings,
          coils: state.settings.coils.map((coil) => {
            if (coil.id !== action.id) return coil;
            const size =
              action.patch.size === undefined ? coil.size : round2(action.patch.size);
            // A coil of zero length cannot be bought; keep the last valid size.
            const safeSize = Number.isFinite(size) && size > 0 ? size : coil.size;
            const price =
              action.patch.price === undefined ? coil.price : round2(action.patch.price);
            return {
              ...coil,
              size: safeSize,
              price: Number.isFinite(price) && price > 0 ? price : 0,
            };
          }),
        },
      };
    case "remove-coil": {
      const coils = state.settings.coils.filter((coil) => coil.id !== action.id);
      // The last coil stays: without a catalogue there is nothing to pack into.
      if (coils.length === 0) return state;
      return { ...state, settings: { ...state.settings, coils } };
    }
    case "reset-coils":
      return {
        ...state,
        settings: { ...state.settings, coils: defaultCoils(state.settings.currency) },
      };
    case "set-reserve":
      return { ...state, settings: { ...state.settings, reserve: Math.max(0, action.value) } };
    case "set-currency":
      return { ...state, settings: { ...state.settings, currency: action.value } };
    case "set-units":
      return { ...state, settings: { ...state.settings, units: action.value } };
    default:
      return state;
  }
}
