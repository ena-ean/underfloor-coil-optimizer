import { formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";

/**
 * Display units of the calculator.
 *
 * The solver and the persisted state always work in metres (integer millimetres
 * inside the solver), so switching the unit system never changes a packing — it
 * only changes what the user types and reads.
 */
export type UnitSystem = "metric" | "imperial";

export const FEET_PER_METRE = 3.280839895;

export function isUnitSystem(value: unknown): value is UnitSystem {
  return value === "metric" || value === "imperial";
}

/** Metres (canonical) -> the number shown in the current unit system. */
export function fromMetres(metres: number, units: UnitSystem): number {
  return units === "imperial" ? metres * FEET_PER_METRE : metres;
}

/** A number typed by the user -> metres (canonical). */
export function toMetres(value: number, units: UnitSystem): number {
  return units === "imperial" ? value / FEET_PER_METRE : value;
}

/**
 * Value for a number input. Two decimals are enough for metres, one for feet
 * (0.1 ft is 3 cm), so switching units back and forth does not drift.
 */
export function toInputValue(metres: number, units: UnitSystem): number {
  const value = fromMetres(metres, units);
  return units === "imperial" ? Math.round(value * 10) / 10 : Math.round(value * 100) / 100;
}

/** A number typed in the current unit system, rounded to whole centimetres. */
export function fromInputValue(value: number, units: UnitSystem): number {
  const metres = toMetres(value, units);
  return Math.round(metres * 100) / 100;
}

export function unitLabel(units: UnitSystem, dict: Dictionary): string {
  return units === "imperial" ? dict.common.feet : dict.common.meters;
}

/** `1 294 м` / `4 246.1 ft` */
export function formatLength(
  metres: number,
  units: UnitSystem,
  locale: Locale,
  dict: Dictionary,
  fractionDigits = 1,
): string {
  return `${formatLengthValue(metres, units, locale, fractionDigits)} ${unitLabel(units, dict)}`;
}

/** The number of a length, without the unit label. */
export function formatLengthValue(
  metres: number,
  units: UnitSystem,
  locale: Locale,
  fractionDigits = 1,
): string {
  return formatNumber(fromMetres(metres, units), locale, fractionDigits);
}
