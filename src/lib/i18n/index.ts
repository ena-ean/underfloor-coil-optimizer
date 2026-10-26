import { en } from "./en";
import { ru, type Dictionary } from "./ru";

export const LOCALES = ["ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  ru: "Русский",
  en: "English",
};

export const LOCALE_SHORT: Record<Locale, string> = {
  ru: "RU",
  en: "EN",
};

const DICTIONARIES: Record<Locale, Dictionary> = { ru, en };

export const LOCALE_STORAGE_KEY = "coil-calc:locale";

export function dictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES.en;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the language of the operating system / browser.
 * The first supported tag wins, English is used when nothing matches.
 */
export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";

  const candidates: string[] = [];
  if (navigator.language) candidates.push(navigator.language);
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);

  for (const candidate of candidates) {
    const base = candidate.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return "en";
}

/** Replaces `{name}` placeholders in a dictionary string. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
