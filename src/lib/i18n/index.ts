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

/** Language the server renders (and the fallback for an unknown system language). */
export const DEFAULT_LOCALE: Locale = "en";

export function dictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** The language the visitor picked earlier, `null` when there is no choice yet. */
export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** Locale the first render has to assume: the stored choice or the system one. */
export function currentLocale(): Locale {
  return readStoredLocale() ?? detectLocale();
}

/**
 * Language of the operating system: Russian systems get the Russian UI, every
 * other language gets English. Only the primary language tag counts — a Russian
 * tag further down `navigator.languages` does not flip a German browser.
 */
export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;

  const primary = navigator.language || navigator.languages?.[0] || "";
  return primary.toLowerCase().split("-")[0] === "ru" ? "ru" : DEFAULT_LOCALE;
}


/** Replaces `{name}` placeholders in a dictionary string. */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
