import { DEFAULT_COIL_SIZES } from "@/lib/algorithm/types";
import { currencyForLocale, isCurrency, type Currency } from "@/lib/format";
import { currentLocale } from "@/lib/i18n";
import { normalizeRoom } from "@/lib/loop-label";
import { isUnitSystem } from "@/lib/units";

import type { CalculatorSettings, LoopEntry } from "./types";

/** Largest coil the catalogue accepts, in metres. */
const MAX_COIL_SIZE = 20000;
/** Guard against a pathological list pasted into the size editor. */
export const MAX_COIL_SIZES = 24;

/**
 * Starting price of one metre of oxygen-barrier pipe, in the currency of the
 * interface. A placeholder rather than a quote: $1.50 is about $0.46/ft, which
 * is what 5/8" (16 mm) PEX for radiant heating costs at a US retailer, and
 * €1.40 matches a 16 × 2.0 PE-RT coil in a European shop. Roubles stay where
 * the Russian audience expects them.
 */
export const DEFAULT_PRICE_PER_METRE: Record<Currency, number> = {
  RUB: 120,
  USD: 1.5,
  EUR: 1.4,
};

export const DEFAULT_SETTINGS: CalculatorSettings = {
  sizes: [50, 100, 200, 250, 500, 600],
  reserve: 2,
  pricePerMetre: DEFAULT_PRICE_PER_METRE.RUB,
  pricePerSize: {},
  currency: "RUB",
  units: "metric",
};

/** True while the price is still the untouched default of that currency. */
export function isDefaultPrice(price: number, currency: Currency): boolean {
  return Math.abs(price - DEFAULT_PRICE_PER_METRE[currency]) <= 0.01;
}

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

/**
 * 12 loops over two floors, 641 m — enough to show how packing works without
 * drowning the list in near-identical rows.
 */
export function sampleLoops(): LoopEntry[] {
  const lengths: ReadonlyArray<readonly [floor: number, length: number]> = [
    [1, 25],
    [1, 38],
    [1, 46],
    [1, 55],
    [1, 64],
    [1, 78],
    [2, 30],
    [2, 42],
    [2, 50],
    [2, 61],
    [2, 72],
    [2, 80],
  ];

  return lengths.map(([floor, length]) => ({ id: createId(), floor, length }));
}

export function sanitizeLoop(value: unknown): LoopEntry | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const length = Number(candidate.length);
  const floor = Number(candidate.floor);
  if (!Number.isFinite(length) || length < 0) return null;
  const room = normalizeRoom(candidate.room);
  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createId(),
    floor: Number.isFinite(floor) && floor > 0 ? Math.round(floor) : 1,
    length: Math.round(length * 100) / 100,
    ...(room ? { room } : {}),
  };
}

/** Copy of a loop with the room name cleaned up — used when it leaves the editor. */
export function normalizeLoop(loop: LoopEntry): LoopEntry {
  const room = normalizeRoom(loop.room);
  return { id: loop.id, floor: loop.floor, length: loop.length, ...(room ? { room } : {}) };
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
    pricePerMetre: Number.isFinite(pricePerMetre) && pricePerMetre >= 0 ? pricePerMetre : 0,
    pricePerSize,
    currency: isCurrency(candidate.currency) ? candidate.currency : fallbackCurrency,
    units: isUnitSystem(candidate.units) ? candidate.units : DEFAULT_SETTINGS.units,
  };
}

/** Defaults for a first visit — the currency and its price follow the language. */
export function createDefaultSettings(): CalculatorSettings {
  const currency = currencyForLocale(currentLocale());
  return {
    ...DEFAULT_SETTINGS,
    currency,
    pricePerMetre: DEFAULT_PRICE_PER_METRE[currency],
  };
}
