import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_LOCALE, detectLocale } from "@/lib/i18n";
import {
  createDefaultSettings,
  DEFAULT_PRICE_PER_METRE,
  isDefaultPrice,
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

describe("default price", () => {
  it("opens a Russian interface on roubles at 120 per metre", () => {
    withLanguage("ru-RU");
    const settings = createDefaultSettings();
    expect(settings.currency).toBe("RUB");
    expect(settings.pricePerMetre).toBe(120);
  });

  it("opens an English interface on dollars at 1.50 per metre", () => {
    withLanguage("en-US");
    const settings = createDefaultSettings();
    expect(settings.currency).toBe("USD");
    expect(settings.pricePerMetre).toBe(DEFAULT_PRICE_PER_METRE.USD);
    // A dollar price carried over from the rouble default would read as $120/m.
    expect(settings.pricePerMetre).toBeLessThan(5);
  });

  it("keeps every currency's default and the dollar one below the rouble one", () => {
    expect(DEFAULT_PRICE_PER_METRE.USD).toBeGreaterThan(0.5);
    expect(DEFAULT_PRICE_PER_METRE.EUR).toBeGreaterThan(0.5);
    expect(DEFAULT_PRICE_PER_METRE.USD).toBeLessThan(DEFAULT_PRICE_PER_METRE.RUB);
    expect(DEFAULT_PRICE_PER_METRE.EUR).toBeLessThan(DEFAULT_PRICE_PER_METRE.RUB);
  });

  it("tells an untouched default from a price somebody typed", () => {
    expect(isDefaultPrice(120, "RUB")).toBe(true);
    expect(isDefaultPrice(DEFAULT_PRICE_PER_METRE.USD, "USD")).toBe(true);
    expect(isDefaultPrice(120, "USD")).toBe(false);
    expect(isDefaultPrice(2.25, "USD")).toBe(false);
    expect(isDefaultPrice(0, "RUB")).toBe(false);
  });
});
