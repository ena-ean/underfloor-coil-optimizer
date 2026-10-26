import type { PackingError } from "@/lib/algorithm/types";
import type { Dictionary } from "@/lib/i18n/ru";
import { interpolate } from "@/lib/i18n";

/** Turns a solver error code into a localized, human readable sentence. */
export function errorMessage(error: PackingError, dict: Dictionary): string {
  switch (error.code) {
    case "no-loops":
      return dict.errors.noLoops;
    case "no-sizes":
      return dict.errors.noSizes;
    case "invalid-loop-length":
      return interpolate(dict.errors.invalidLoop, error.params);
    case "loop-too-long":
      return interpolate(dict.errors.loopTooLong, error.params);
    default:
      return dict.errors.noLoops;
  }
}
