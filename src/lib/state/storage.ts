import { currencyForLocale } from "@/lib/format";
import { currentLocale } from "@/lib/i18n";

import { createDefaultSettings, sampleState, sanitizeLoop, sanitizeSettings } from "./model";
import type { CalculatorState, LoopEntry } from "./types";

export const STORAGE_KEY = "coil-calc:state";
/** Single unversioned key used before the 1.1.0 layout. */
const LEGACY_STORAGE_KEY = "coil-calc-state";
/** v2 stored coil sizes plus a per-metre price; v3 stores whole-coil prices. */
const SCHEMA_VERSION = 3;

function readPayload(key: string): Record<string, unknown> | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function readLoops(raw: unknown): LoopEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeLoop).filter((loop): loop is LoopEntry => loop !== null);
}

/**
 * Reads the persisted state, migrating the older layouts: v2 (coil sizes and a
 * per-metre price) and the unversioned v1 one. A browser that has never stored
 * anything opens on the sample project, so the first screen is never empty.
 */
export function loadState(): CalculatorState {
  if (typeof window === "undefined") {
    return { loops: [], settings: createDefaultSettings() };
  }

  const fallbackCurrency = currencyForLocale(currentLocale());

  const stored = readPayload(STORAGE_KEY);
  if (stored && Array.isArray(stored.loops)) {
    return {
      loops: readLoops(stored.loops),
      settings: sanitizeSettings(stored.settings, fallbackCurrency),
    };
  }

  const legacy = readPayload(LEGACY_STORAGE_KEY);
  if (legacy && Array.isArray(legacy.loops)) {
    return {
      loops: readLoops(legacy.loops),
      settings: sanitizeSettings(
        {
          sizes: legacy.coilSizes,
          reserve: legacy.reserve,
          pricePerMetre: legacy.pricePerMeter,
        },
        fallbackCurrency,
      ),
    };
  }

  return sampleState(currentLocale());
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
