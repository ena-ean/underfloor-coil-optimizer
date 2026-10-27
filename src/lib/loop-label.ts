import { interpolate } from "@/lib/i18n";
import type { Dictionary } from "@/lib/i18n/ru";
import type { LoopEntry } from "@/lib/state";

/** Longest room name the editor accepts, in characters. */
export const ROOM_LIMIT = 40;

/**
 * Room name as it is stored: trimmed, single-spaced, capped at `ROOM_LIMIT`.
 *
 * An empty name is `undefined`, never `""` — a loop without a label is the
 * normal case, so absence is what the rest of the app checks for.
 */
export function normalizeRoom(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, ROOM_LIMIT);
  return cleaned.length > 0 ? cleaned : undefined;
}

/** The room a loop is installed in, `""` when the user left it blank. */
export function loopRoom(loop: Pick<LoopEntry, "room"> | undefined): string {
  return normalizeRoom(loop?.room) ?? "";
}

/** True when at least one loop names a room — the extra column earns its place. */
export function hasRooms(
  loops: readonly (Pick<LoopEntry, "room"> | undefined)[],
): boolean {
  return loops.some((loop) => loopRoom(loop) !== "");
}

/**
 * Short name of a loop: `К3` on its own, `К3 · Кухня` once the room is named.
 * Used by the coil cards and anywhere else a loop has to identify itself.
 */
export function circuitLabel(
  loop: Pick<LoopEntry, "room"> | undefined,
  index: number,
  dict: Dictionary,
): string {
  const code = interpolate(dict.loopsTable.circuitShort, { n: index + 1 });
  const room = loopRoom(loop);
  return room ? `${code} · ${room}` : code;
}
