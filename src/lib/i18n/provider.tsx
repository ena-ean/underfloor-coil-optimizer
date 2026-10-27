"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  DEFAULT_LOCALE,
  detectLocale,
  dictionary,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./index";
import type { Dictionary } from "./ru";

const listeners = new Set<() => void>();


function readLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private mode — fall back to the system language.
  }
  return detectLocale();
}

function subscribeToLocale(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function writeLocale(locale: Locale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // The choice simply will not survive a reload.
  }
  for (const listener of listeners) listener();
}

const getServerLocale = (): Locale => DEFAULT_LOCALE;

interface LocaleContextValue {
  locale: Locale;
  dict: Dictionary;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Language of the interface: the system/browser language by default, the user
 * choice (persisted in `localStorage`) takes precedence. Mirrored onto
 * `<html lang>` so screen readers and hyphenation follow the UI.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribeToLocale, readLocale, getServerLocale);
  const dict = useMemo(() => dictionary(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = dict.meta.title;
  }, [locale, dict]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dict, setLocale: writeLocale }),
    [locale, dict],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used inside <LocaleProvider>");
  return context;
}
