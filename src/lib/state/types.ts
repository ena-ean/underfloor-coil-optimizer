import type { PackingOutcome } from "@/lib/algorithm/types";
import type { Currency } from "@/lib/format";
import type { UnitSystem } from "@/lib/units";

import type { SolverSnapshot } from "./solver";

/** One underfloor circuit: the floor it serves and its design length, in metres. */
export interface LoopEntry {
  id: string;
  floor: number;
  length: number;
  /**
   * Optional room name — free text the user types to tell loops apart in a
   * project. Absent when unnamed; never part of the packing itself.
   */
  room?: string;
}

export interface CalculatorSettings {
  sizes: number[];
  reserve: number;
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

/** Everything the screens are allowed to change in the store. */
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
  setPrice: (value: number) => void;
  setPricePerSize: (size: number, value: number | null) => void;
  setCurrency: (value: Currency) => void;
  setUnits: (units: UnitSystem) => void;
}

/** What `useCalculator()` hands to a screen block: state plus derived numbers. */
export interface CalculatorController {
  state: CalculatorState;
  /** Loops with a positive length — the ones that take part in the packing. */
  activeLoops: LoopEntry[];
  /** Finished plan for the current inputs; null while the search runs. */
  outcome: PackingOutcome | null;
  /** Live progress of the exact search. */
  search: SolverSnapshot;
  naivePurchase: number;
  totalDesign: number;
  totalWithReserve: number;
  actions: CalculatorActions;
  /** Stops the running search and keeps the best plan found so far. */
  cancelSearch: () => void;
  /** Starts the search over from scratch after it was stopped. */
  retrySearch: () => void;
}
