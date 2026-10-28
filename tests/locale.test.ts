import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_LOCALE, detectLocale } from "@/lib/i18n";
import {
  createDefaultSettings,
  DEFAULT_PRICE_PER_METRE,
  defaultCoils,
  isDefaultCoils,
} from "@/lib/state";

/** Replaces the browser language environment Node happens to provide. */
function withLanguage(language: string, languages: string[] = [language]): void {
  vi.stubGlobal("navigator", { language, languages });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("detectLocale", () => {
  it("uses Russian for a Russian system", () => {
    withLanguage("ru-RU");
    expect(detectLocale()).toBe("ru");
  });

  it("uses Russian for the bare ru tag", () => {
    withLanguage("ru");
    expect(detectLocale()).toBe("ru");
  });

  it("uses English for every other system language", () => {
    withLanguage("en-US");
    expect(detectLocale()).toBe("en");

    withLanguage("de-DE");
    expect(detectLocale()).toBe("en");

    withLanguage("uk-UA");
    expect(detectLocale()).toBe("en");
  });

  it("ignores Russian accepted languages behind a different primary one", () => {
    withLanguage("de-DE", ["de-DE", "ru-RU", "en-US"]);
    expect(detectLocale()).toBe("en");
  });

  it("falls back to English without a browser", () => {
    vi.stubGlobal("navigator", undefined);
    expect(detectLocale()).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe("en");
  });
});

describe("default catalogue", () => {
  it("opens a Russian interface on roubles with a 200 m coil at 24 000 ₽", () => {
    withLanguage("ru-RU");
    const settings = createDefaultSettings();
    expect(settings.currency).toBe("RUB");
    expect(settings.coils.find((coil) => coil.size === 200)?.price).toBe(24_000);
  });

  it("opens an English interface on dollars, not on rouble numbers", () => {
    withLanguage("en-US");
    const settings = createDefaultSettings();
    expect(settings.currency).toBe("USD");
    const price = settings.coils.find((coil) => coil.size === 200)?.price;
    // A rouble figure carried over would read as a $24,000 coil.
    expect(price).toBe(300);
    expect(price).toBeLessThan(1000);
  });

  it("keeps every currency's rate and the dollar one below the rouble one", () => {
    expect(DEFAULT_PRICE_PER_METRE.USD).toBeGreaterThan(0.5);
    expect(DEFAULT_PRICE_PER_METRE.EUR).toBeGreaterThan(0.5);
    expect(DEFAULT_PRICE_PER_METRE.USD).toBeLessThan(DEFAULT_PRICE_PER_METRE.RUB);
    expect(DEFAULT_PRICE_PER_METRE.EUR).toBeLessThan(DEFAULT_PRICE_PER_METRE.RUB);
  });

  it("tells an untouched default catalogue from prices somebody typed", () => {
    expect(isDefaultCoils(defaultCoils("RUB"), "RUB")).toBe(true);
    expect(isDefaultCoils(defaultCoils("USD"), "USD")).toBe(true);
    // The rouble numbers under a dollar sign are not a dollar catalogue.
    expect(isDefaultCoils(defaultCoils("RUB"), "USD")).toBe(false);

    const edited = defaultCoils("USD").map((coil) =>
      coil.size === 200 ? { ...coil, price: 999 } : coil,
    );
    expect(isDefaultCoils(edited, "USD")).toBe(false);
  });

  it("prices the standard sizes as whole coils", () => {
    const coils = defaultCoils("RUB");
    expect(coils.map((coil) => coil.size)).toEqual([50, 100, 200, 250, 500, 600]);
    expect(coils.every((coil) => coil.price === coil.size * 120)).toBe(true);
    // Deterministic ids: no randomUUID while the module is evaluated.
    expect(coils[0].id).toBe("coil-50");
  });
});
