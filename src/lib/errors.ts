import type { PackingError } from "@/lib/algorithm/types";
import type { Dictionary } from "@/lib/i18n/ru";
import { interpolate } from "@/lib/i18n";
import { fromMetres, unitLabel, type UnitSystem } from "@/lib/units";

/** Turns a solver error code into a localized, human readable sentence. */
export function errorMessage(
  error: PackingError,
  dict: Dictionary,
  units: UnitSystem = "metric",
): string {
  const unit = unitLabel(units, dict);
  const length = (value: number | undefined) =>
    Math.round(fromMetres(value ?? 0, units) * 10) / 10;

  switch (error.code) {
    case "no-loops":
      return dict.errors.noLoops;
    case "no-sizes":
      return dict.errors.noSizes;
    case "invalid-loop-length":
      return interpolate(dict.errors.invalidLoop, { ...error.params, unit });
    case "loop-too-long":
      return interpolate(dict.errors.loopTooLong, {
        ...error.params,
        length: length(error.params.length),
        maxSize: length(error.params.maxSize),
        unit,
      });
    default:
      return dict.errors.noLoops;
  }
}
