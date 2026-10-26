import type { Locale } from "@/lib/i18n";

export const CURRENCIES = ["RUB", "USD", "EUR"] as const;
export type Currency = (typeof CURRENCIES)[number];

const num = (locale: Locale) => (locale === "ru" ? "ru-RU" : "en-US");

/** 1234.5 -> "1 234,5" (ru) / "1,234.5" (en) */
export function formatNumber(value: number, locale: Locale, fractionDigits = 1): string {
  return new Intl.NumberFormat(num(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatMeters(
  value: number,
  locale: Locale,
  unit = "m",
  fractionDigits = 1,
): string {
  return `${formatNumber(value, locale, fractionDigits)} ${unit}`;
}

export function formatPercent(value: number, locale: Locale): string {
  return new Intl.NumberFormat(num(locale), {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatMoney(
  value: number,
  locale: Locale,
  currency: Currency = "RUB",
  fractionDigits = 0,
): string {
  return new Intl.NumberFormat(num(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
