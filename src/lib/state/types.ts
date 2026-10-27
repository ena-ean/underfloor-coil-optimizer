import type { Objective, PackingOutcome } from "@/lib/algorithm/types";
import type { Currency } from "@/lib/format";
import type { UnitSystem } from "@/lib/units";

/** One underfloor circuit: the floor it serves and its design length, in metres. */
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
  setObjective: (value: Objective) => void;
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
  outcome: PackingOutcome | null;
  naivePurchase: number;
  totalDesign: number;
  totalWithReserve: number;
  actions: CalculatorActions;
}
