import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_LOCALE, detectLocale } from "@/lib/i18n";

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
