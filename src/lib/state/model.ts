import { DEFAULT_COIL_SIZES } from "@/lib/algorithm/types";
import { currencyForLocale, isCurrency, type Currency } from "@/lib/format";
import { currentLocale, dictionary, type Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";
import { normalizeRoom } from "@/lib/loop-label";
import { isUnitSystem } from "@/lib/units";

import type { CalculatorSettings, CalculatorState, CoilOption, LoopEntry } from "./types";

/** Largest coil the catalogue accepts, in metres. */
const MAX_COIL_SIZE = 20000;
/** Guard against a pathological list pasted into the catalogue editor. */
export const MAX_COILS = 24;

/**
 * Starting price of one metre of oxygen-barrier pipe, in the currency of the
 * interface. The catalogue is priced per whole coil (that is how pipe is sold),
 * so these rates only produce the built-in prices: a 200 m coil costs 24 000 ₽
 * at 120 ₽/m. A placeholder rather than a quote — $1.50 is about $0.46/ft,
 * which is what 5/8" (16 mm) PEX for radiant heating costs at a US retailer,
 * and €1.40 matches a 16 × 2.0 PE-RT coil in a European shop.
 */
export const DEFAULT_PRICE_PER_METRE: Record<Currency, number> = {
  RUB: 120,
  USD: 1.5,
  EUR: 1.4,
};

export const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Built-in catalogue: every standard size, priced as a whole coil. The ids are
 * derived from the size, so the defaults are identical on every render and in
 * tests — no `crypto.randomUUID()` runs while a module is evaluated.
 */
export function defaultCoils(currency: Currency): CoilOption[] {
  const rate = DEFAULT_PRICE_PER_METRE[currency];
  return DEFAULT_COIL_SIZES.map((size) => ({
    id: `coil-${size}`,
    size,
    price: round2(size * rate),
  }));
}

export const DEFAULT_SETTINGS: CalculatorSettings = {
  coils: defaultCoils("RUB"),
  reserve: 2,
  currency: "RUB",
  units: "metric",
};

/**
 * True while the catalogue is still the untouched default of that currency.
 * Used when the currency changes: 24 000 ₽ must not become $24 000, but a price
 * the visitor typed stays as it is.
 */
export function isDefaultCoils(coils: CoilOption[], currency: Currency): boolean {
  const standard = defaultCoils(currency);
  if (coils.length !== standard.length) return false;
  return standard.every((expected) =>
    coils.some(
      (coil) =>
        Math.abs(coil.size - expected.size) <= 0.01 && Math.abs(coil.price - expected.price) <= 0.01,
    ),
  );
}

/** Unique purchasable sizes, ascending — what the solver packs the loops into. */
export function coilSizes(coils: CoilOption[]): number[] {
  const sizes = new Set<number>();
  for (const coil of coils) {
    const size = round2(coil.size);
    if (Number.isFinite(size) && size > 0) sizes.add(size);
  }
  return [...sizes].sort((a, b) => a - b);
}

/**
 * Cheapest whole-coil price per size, keyed by the size in metres (a string key
 * so the table survives JSON round-trips). Two rows of one size — the same coil
 * from two suppliers — never change the packing, only what it costs.
 */
export function coilPrices(coils: CoilOption[]): Record<string, number> {
  const prices: Record<string, number> = {};
  for (const coil of coils) {
    const size = round2(coil.size);
    const price = round2(coil.price);
    if (!(size > 0) || !(price > 0)) continue;
    const key = String(size);
    const current = prices[key];
    if (current === undefined || price < current) prices[key] = price;
  }
  return prices;
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `loop-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Room names of the built-in sample project. Keys rather than literals, so the
 * prefilled project speaks the language of the interface; `sampleLoops` pairs
 * them with the lengths below and repeats a few names, which is what a real
 * two-floor house looks like.
 */
const SAMPLE_ROOM_KEYS = [
  "livingRoom",
  "kitchen",
  "bedroom",
  "kidsRoom",
  "study",
  "hallway",
  "lounge",
  "livingRoom",
  "bedroom",
  "kidsRoom",
  "bathroom",
  "cloakroom",
] as const;

/** Localized room names for the sample project, in sample order. */
export function sampleRooms(dict: Dictionary): string[] {
  return SAMPLE_ROOM_KEYS.map((key) => dict.sample[key]);
}

/**
 * 12 loops over two floors, 641 m — enough to show how packing works without
 * drowning the list in near-identical rows. Pass room names to get a labelled
 * project; without them the loops stay unnamed.
 */
export function sampleLoops(rooms: readonly string[] = []): LoopEntry[] {
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

  return lengths.map(([floor, length], index) => {
    const room = normalizeRoom(rooms[index]);
    return { id: createId(), floor, length, ...(room ? { room } : {}) };
  });
}

/** Sample project in the given language — what a first, empty visit opens on. */
export function sampleState(locale: Locale = currentLocale()): CalculatorState {
  return {
    loops: sampleLoops(sampleRooms(dictionary(locale))),
    settings: createDefaultSettings(locale),
  };
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

/** Validates one catalogue row; keeps duplicates (same size, another price). */
function sanitizeCoil(value: unknown, usedIds: Set<string>): CoilOption | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;

  const size = round2(Number(candidate.size));
  if (!Number.isFinite(size) || size <= 0 || size > MAX_COIL_SIZE) return null;

  const price = round2(Number(candidate.price));
  const id =
    typeof candidate.id === "string" && candidate.id && !usedIds.has(candidate.id)
      ? candidate.id
      : createId();
  usedIds.add(id);

  return { id, size, price: Number.isFinite(price) && price > 0 ? price : 0 };
}

/** Pre-1.4 settings (`sizes`, `pricePerMetre`, `pricePerSize`) as a catalogue. */
function legacyCoils(candidate: Record<string, unknown> | null, currency: Currency): CoilOption[] {
  const rawSizes = Array.isArray(candidate?.sizes) ? candidate.sizes : [];
  const sizes = rawSizes
    .map((raw) => round2(Number(raw)))
    .filter((size) => Number.isFinite(size) && size > 0 && size <= MAX_COIL_SIZE)
    .slice(0, MAX_COILS);

  if (sizes.length === 0) return defaultCoils(currency);

  const rawPerSize = (candidate?.pricePerSize ?? {}) as Record<string, unknown>;
  const defaultRate = Number(candidate?.pricePerMetre);
  const rate = Number.isFinite(defaultRate) && defaultRate > 0 ? defaultRate : 0;

  return sizes.map((size) => {
    const override = Number(rawPerSize[String(size)]);
    const perMetre = Number.isFinite(override) && override > 0 ? override : rate;
    return { id: `coil-${size}`, size, price: perMetre > 0 ? round2(size * perMetre) : 0 };
  });
}

/**
 * The catalogue of a stored project. Two shapes reach this function: the current
 * one (`coils`) and the 1.3 one (`sizes` + `pricePerMetre` + `pricePerSize`),
 * converted into whole-coil prices so no saved project loses its numbers.
 */
function sanitizeCoils(value: unknown, currency: Currency): CoilOption[] {
  if (Array.isArray(value)) {
    const usedIds = new Set<string>();
    const coils: CoilOption[] = [];
    for (const raw of value) {
      const coil = sanitizeCoil(raw, usedIds);
      if (!coil) continue;
      coils.push(coil);
      if (coils.length >= MAX_COILS) break;
    }
    if (coils.length > 0) return coils;
  }

  return legacyCoils(value as Record<string, unknown> | null, currency);
}

export function sanitizeSettings(
  value: unknown,
  fallbackCurrency: Currency = "RUB",
): CalculatorSettings {
  const candidate = (value ?? {}) as Record<string, unknown>;
  const currency = isCurrency(candidate.currency) ? candidate.currency : fallbackCurrency;
  const reserve = Number(candidate.reserve);

  return {
    coils: sanitizeCoils(candidate.coils ?? candidate, currency),
    reserve: Number.isFinite(reserve) && reserve >= 0 ? reserve : DEFAULT_SETTINGS.reserve,
    currency,
    units: isUnitSystem(candidate.units) ? candidate.units : DEFAULT_SETTINGS.units,
  };
}

/** Defaults for a first visit — the currency and its prices follow the language. */
export function createDefaultSettings(locale: Locale = currentLocale()): CalculatorSettings {
  const currency = currencyForLocale(locale);
  return {
    ...DEFAULT_SETTINGS,
    coils: defaultCoils(currency),
    currency,
  };
}

