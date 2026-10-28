import { isCurrency, type Currency } from "@/lib/format";
import {
  sanitizeLoop,
  sanitizeSettings,
  type CalculatorState,
  type LoopEntry,
} from "@/lib/state";
import { isUnitSystem, type UnitSystem } from "@/lib/units";

/**
 * Share links without a backend.
 *
 * The whole project — loops with their rooms, the coil catalogue, the reserve —
 * travels inside the URL hash, so opening a link restores the project in any
 * browser. Nothing is uploaded, there is no storage and no account; the flip
 * side is a link that cannot be revoked or shortened, and one that grows with
 * the number of loops.
 */
export const SHARE_PREFIX = "#p=";
/** Longer than this is not something you can paste into a chat window. */
export const SHARE_MAX_LENGTH = 8000;

const SHARE_VERSION = 1;

interface SharePayload {
  v: number;
  /** `[floor, length]` or `[floor, length, room]` per loop. */
  l: Array<[number, number] | [number, number, string]>;
  /** `[size, price]` per catalogue row, in metres and project currency. */
  c: Array<[number, number]>;
  /** Reserve per loop, metres. */
  r: number;
  cur: Currency;
  u: UnitSystem;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** The project as a hash fragment: `#p=<base64url>`. */
export function encodeShare(state: CalculatorState): string {
  const payload: SharePayload = {
    v: SHARE_VERSION,
    l: state.loops.map((loop) =>
      loop.room ? [loop.floor, loop.length, loop.room] : [loop.floor, loop.length],
    ),
    c: state.settings.coils.map((coil) => [coil.size, coil.price]),
    r: state.settings.reserve,
    cur: state.settings.currency,
    u: state.settings.units,
  };

  return `${SHARE_PREFIX}${toBase64Url(JSON.stringify(payload))}`;
}

/** Absolute link for the current page plus the encoded project. */
export function shareUrl(href: string, state: CalculatorState): { url: string; tooLarge: boolean } {
  const base = href.split("#")[0];
  const url = `${base}${encodeShare(state)}`;
  return { url, tooLarge: url.length > SHARE_MAX_LENGTH };
}

function readLoops(raw: unknown): LoopEntry[] {
  if (!Array.isArray(raw)) return [];
  const loops: LoopEntry[] = [];
  for (const row of raw) {
    if (!Array.isArray(row)) continue;
    const loop = sanitizeLoop({ floor: row[0], length: row[1], room: row[2] });
    if (loop) loops.push(loop);
  }
  return loops;
}

/**
 * Project from a hash fragment, or null when the fragment is not one, was built
 * by another version, or carries nothing usable. Everything is sanitised: a link
 * comes from a stranger, so it is treated like an imported file.
 */
export function decodeShare(hash: string): CalculatorState | null {
  if (!hash.startsWith(SHARE_PREFIX)) return null;

  const json = fromBase64Url(hash.slice(SHARE_PREFIX.length));
  if (!json) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const payload = parsed as Partial<SharePayload>;
  if (payload.v !== SHARE_VERSION) return null;
  if (!Array.isArray(payload.l) || !Array.isArray(payload.c)) return null;

  const loops = readLoops(payload.l);
  if (loops.length === 0) return null;

  const coils: Array<{ size: number; price: number }> = [];
  for (const row of payload.c) {
    if (!Array.isArray(row)) continue;
    coils.push({ size: Number(row[0]), price: Number(row[1]) });
  }

  return {
    loops,
    settings: sanitizeSettings({
      coils,
      reserve: payload.r,
      currency: isCurrency(payload.cur) ? payload.cur : undefined,
      units: isUnitSystem(payload.u) ? payload.u : undefined,
    }),
  };
}
