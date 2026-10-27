import type { Locale } from "@/lib/i18n";

export const CURRENCIES = ["RUB", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** First currency a visitor sees: roubles for Russian, dollars for English. */
export const CURRENCY_BY_LOCALE: Record<Locale, Currency> = { ru: "RUB", en: "USD" };

export function currencyForLocale(locale: Locale): Currency {
  return CURRENCY_BY_LOCALE[locale] ?? "USD";
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

const num = (locale: Locale) => (locale === "ru" ? "ru-RU" : "en-US");

/** 1234.5 -> "1 234,5" (ru) / "1,234.5" (en) */
export function formatNumber(value: number, locale: Locale, fractionDigits = 1): string {
  return new Intl.NumberFormat(num(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(num(locale), {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Every money figure is indicative: coils of one size cost differently per
 * supplier, so the per-metre price is an averaged reference value. The mark
 * keeps that honest wherever a price or a total is rendered.
 */
export const APPROX_MARK = "~";

export function formatMoney(
  value: number,
  locale: Locale,
  currency: Currency = "RUB",
  fractionDigits = 0,
): string {
  const formatted = new Intl.NumberFormat(num(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);

  return `${APPROX_MARK}${formatted}`;
}
