"use client";

import { useTheme } from "next-themes";
import { CircleHelp, FileText, Languages, Moon, Ruler, Sun, TrendingDown, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { alignCurrencyWithLocale, useCalculator } from "@/lib/state";
import { LOCALES, LOCALE_LABELS, LOCALE_SHORT } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const subscribeToNothing = () => () => {};
const getClientMounted = () => true;
const getServerMounted = () => false;

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Themes only resolve on the client; this keeps the first paint deterministic.
  const mounted = useSyncExternalStore(subscribeToNothing, getClientMounted, getServerMounted);
  const { dict } = useLocale();

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? dict.header.themeLight : dict.header.themeDark;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={`${dict.header.theme}: ${label}`}
      title={`${dict.header.theme}: ${label}`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun aria-hidden className={cn("size-4 transition-all", isDark ? "scale-0 opacity-0" : "scale-100 opacity-100")} />
      <Moon
        aria-hidden
        className={cn(
          "absolute size-4 transition-all",
          isDark ? "scale-100 opacity-100" : "scale-0 opacity-0",
        )}
      />
    </Button>
  );
}

function LocaleSwitch() {
  const { locale, setLocale, dict } = useLocale();

  return (
    <div
      role="group"
      aria-label={dict.header.language}
      className="border-border bg-card/60 flex items-center gap-0.5 rounded-lg border p-0.5"
    >
      <Languages aria-hidden className="text-muted-foreground mx-1 hidden size-3.5 sm:block" />
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={locale === code}
          aria-label={`${LOCALE_LABELS[code]} (${LOCALE_SHORT[code]})`}
          onClick={() => {
            if (code === locale) return;
            // Russian defaults to roubles, English to dollars.
            alignCurrencyWithLocale(locale, code);
            setLocale(code);
          }}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            locale === code
              ? "bg-primary text-primary-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LOCALE_SHORT[code]}
        </button>
      ))}
    </div>
  );
}

/** Metric / imperial switch: the state itself always stays in metres. */
function UnitSwitch() {
  const { state, actions } = useCalculator();
  const { dict } = useLocale();
  const units = state.settings.units;

  const options = [
    { value: "metric", label: dict.common.meters, title: dict.header.unitsMetric },
    { value: "imperial", label: dict.common.feet, title: dict.header.unitsImperial },
  ] as const;

  return (
    <div
      role="group"
      aria-label={dict.header.units}
      className="border-border bg-card/60 flex items-center gap-0.5 rounded-lg border p-0.5"
    >
      <Ruler aria-hidden className="text-muted-foreground mx-1 hidden size-3.5 sm:block" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={units === option.value}
          aria-label={option.title}
          title={`${dict.header.units}: ${option.title}`}
          onClick={() => actions.setUnits(option.value)}
          className={cn(
            "rounded-md px-1.5 py-1 text-xs font-medium transition-colors sm:px-2",
            units === option.value
              ? "bg-primary text-primary-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * "What does this solve" panel. It sits in the header because the question
 * arrives before the first loop is typed, and it explains both the purpose and
 * the approximate "~" prices.
 */
function IntroPanel({ onClose }: { onClose: () => void }) {
  const { dict } = useLocale();

  const points = [
    { icon: TrendingDown, text: dict.intro.cost },
    { icon: FileText, text: dict.intro.docs },
    { icon: CircleHelp, text: dict.intro.price },
  ];

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        onClick={onClose}
        className="bg-background/50 fixed inset-0 z-30 cursor-default backdrop-blur-[1px]"
      />
      <div className="absolute inset-x-0 top-full z-40 px-3 pt-2 sm:px-4">
        <div className="container-page">
          <div
            id="app-intro"
            role="dialog"
            aria-labelledby="app-intro-title"
            className="bg-card shadow-soft ml-auto max-h-[calc(100dvh-6rem)] max-w-md overflow-y-auto rounded-2xl border p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="app-intro-title" className="text-sm font-semibold tracking-tight sm:text-base">
                {dict.intro.title}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-1 size-7"
                aria-label={dict.common.close}
                title={dict.common.close}
                onClick={onClose}
              >
                <X aria-hidden className="size-4" />
              </Button>
            </div>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed sm:text-[13px]">
              {dict.intro.lead}
            </p>
            <ul className="mt-3 space-y-2">
              {points.map(({ icon: Icon, text }) => (
                <li key={text} className="flex gap-2 text-xs leading-relaxed sm:text-[13px]">
                  <Icon aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

export function SiteHeader() {
  const { dict } = useLocale();
  const [introOpen, setIntroOpen] = useState(false);

  // Escape closes the intro panel; the backdrop below closes it on click.
  useEffect(() => {
    if (!introOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIntroOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [introOpen]);

  return (
    <header className="no-print border-border/70 bg-background/85 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="container-page relative z-40 flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <span className="bg-primary text-primary-foreground shadow-soft grid size-8 shrink-0 place-items-center rounded-xl sm:size-9">
            <svg viewBox="0 0 24 24" aria-hidden className="size-4 sm:size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 17c0-3.6 2.6-6 5.6-6s5.6 2 5.6 4.8" />
              <path d="M7 17.5c0-2.7 1.8-4.5 3.6-4.5s3.6 1.4 3.6 3.4" opacity="0.7" />
              <path d="M10.5 10.5V6.8c0-.9.7-1.6 1.6-1.6s1.6.7 1.6 1.6v2.4" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold tracking-tight sm:text-sm">
              {dict.meta.title}
            </p>
            <p className="text-muted-foreground hidden truncate text-xs sm:block">
              {dict.header.tagline}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            aria-expanded={introOpen}
            aria-controls="app-intro"
            aria-label={dict.intro.open}
            title={dict.intro.open}
            className={cn(introOpen && "bg-accent text-accent-foreground")}
            onClick={() => setIntroOpen((open) => !open)}
          >
            <CircleHelp aria-hidden className="size-4" />
          </Button>
          <UnitSwitch />
          <LocaleSwitch />
          <ThemeToggle />
        </div>
      </div>

      {introOpen ? <IntroPanel onClose={() => setIntroOpen(false)} /> : null}
    </header>
  );
}
