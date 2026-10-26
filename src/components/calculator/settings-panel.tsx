"use client";

import { Calculator, ChevronDown, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ALL_COIL_SIZES, type CalculatorController } from "@/lib/calculator-state";
import { CURRENCIES, type Currency } from "@/lib/format";
import { interpolate } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/provider";
import {
  formatLengthValue,
  fromInputValue,
  toInputValue,
  unitLabel,
  unitPriceToMetres,
  unitPriceValue,
} from "@/lib/units";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  controller: CalculatorController;
  onCalculate: () => void;
}

export function SettingsPanel({ controller, onCalculate }: SettingsPanelProps) {
  const { state, outcome, actions } = controller;
  const { dict } = useLocale();
  const settings = state.settings;
  const units = settings.units;
  const unit = unitLabel(units, dict);
  const canCalculate = controller.activeLoops.length > 0 && settings.sizes.length > 0;

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>{dict.params.title}</CardTitle>
        <CardDescription>{dict.params.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <CoilSizes controller={controller} />

        <Separator />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reserve">{dict.params.reserve}</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="reserve"
                type="number"
                min={0}
                step={units === "imperial" ? 1 : 0.5}
                inputMode="decimal"
                className="w-20 tabular-nums"
                value={toInputValue(settings.reserve, units)}
                onChange={(event) =>
                  actions.setReserve(fromInputValue(Number(event.target.value) || 0, units))
                }
              />
              <span className="text-muted-foreground text-xs">{unit}</span>
              <div className="ml-auto flex items-center gap-0.5">
                {[0, 1, 2, 3].map((preset) => {
                  const value = fromInputValue(preset, units);
                  return (
                    <Button
                      key={preset}
                      size="sm"
                      variant={settings.reserve === value ? "secondary" : "ghost"}
                      className="h-7 px-2 text-xs tabular-nums"
                      onClick={() => actions.setReserve(fromInputValue(preset, units))}
                    >
                      {preset}
                    </Button>
                  );
                })}
              </div>
            </div>
            <p className="text-muted-foreground text-xs">{dict.params.reserveHint}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">{interpolate(dict.params.price, { unit })}</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="price"
                type="number"
                min={0}
                step={units === "imperial" ? 1 : 5}
                inputMode="decimal"
                placeholder="0"
                className="w-24 tabular-nums"
                value={
                  settings.pricePerMetre === 0 ? "" : unitPriceValue(settings.pricePerMetre, units)
                }
                onChange={(event) =>
                  actions.setPrice(unitPriceToMetres(Number(event.target.value) || 0, units))
                }
              />
              <span className="text-muted-foreground text-xs">/{unit}</span>
              <select
                aria-label={dict.params.currency}
                className="border-input bg-card focus-visible:ring-ring h-9 rounded-md border px-2 text-sm outline-none focus-visible:ring-[3px]"
                value={settings.currency}
                onChange={(event) => actions.setCurrency(event.target.value as Currency)}
              >
                {CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-muted-foreground text-xs">{dict.params.priceHint}</p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">{dict.params.objective}</h3>
          <div
            role="radiogroup"
            aria-label={dict.params.objective}
            className="bg-muted/60 grid grid-cols-2 gap-1 rounded-lg p-1"
          >
            {(
              [
                { value: "waste", label: dict.params.objectiveWaste },
                { value: "cost", label: dict.params.objectiveCost },
              ] as const
            ).map((option) => {
              const active = settings.objective === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => actions.setObjective(option.value)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <PerSizePrices controller={controller} />

        <Button size="lg" className="w-full" onClick={onCalculate} disabled={!canCalculate}>
          <Calculator aria-hidden />
          {outcome ? dict.params.recalculate : dict.params.calculate}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Editable coil sizes — the preset list is only a starting point. */
function CoilSizes({ controller }: { controller: CalculatorController }) {
  const { state, actions } = controller;
  const { dict, locale } = useLocale();
  const settings = state.settings;
  const units = settings.units;
  const unit = unitLabel(units, dict);
  const [draft, setDraft] = useState("");
  const isDefault =
    settings.sizes.length === ALL_COIL_SIZES.length &&
    settings.sizes.every((size, index) => size === ALL_COIL_SIZES[index]);

  const commit = () => {
    const metres = fromInputValue(Number(draft.replace(",", ".")), units);
    if (!Number.isFinite(metres) || metres <= 0) {
      toast.error(dict.params.sizeInvalid);
      return;
    }
    actions.addSize(metres);
    setDraft("");
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{dict.params.sizes}</h3>
        <span className="text-muted-foreground text-xs tabular-nums">{settings.sizes.length}</span>
      </div>

      {settings.sizes.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {settings.sizes.map((size) => (
            <li
              key={size}
              className="animate-value-pop border-primary/40 bg-primary/10 inline-flex items-center gap-1 rounded-lg border py-1 pr-1 pl-2.5 text-sm"
            >
              <span className="font-medium tabular-nums">
                {formatLengthValue(size, units, locale, 0)}
              </span>
              <span className="text-muted-foreground text-xs">{unit}</span>
              <button
                type="button"
                aria-label={`${dict.params.removeSize}: ${formatLengthValue(size, units, locale, 0)} ${unit}`}
                onClick={() => actions.removeSize(size)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive grid size-5 place-items-center rounded-md transition-colors"
              >
                <X className="size-3.5" strokeWidth={2.5} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-destructive text-xs">{dict.errors.noSizes}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Input
          aria-label={dict.params.addSize}
          type="number"
          min={1}
          step={10}
          inputMode="decimal"
          placeholder={dict.params.sizePlaceholder}
          className="h-9 w-32 tabular-nums"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
        />
        <span className="text-muted-foreground text-xs">{unit}</span>
        <Button size="sm" variant="outline" className="h-9" onClick={commit}>
          <Plus aria-hidden />
          {dict.params.addSize}
        </Button>
        {isDefault ? null : (
          <Button size="sm" variant="ghost" className="h-9" onClick={() => actions.resetSizes()}>
            <RotateCcw aria-hidden />
            {dict.params.resetSizes}
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">{dict.params.sizesHint}</p>
    </section>
  );
}

/** Optional price overrides — hidden by default to keep the form short. */
function PerSizePrices({ controller }: { controller: CalculatorController }) {
  const { state, actions } = controller;
  const { dict, locale } = useLocale();
  const settings = state.settings;
  const units = settings.units;
  const unit = unitLabel(units, dict);

  return (
    <details className="group border-border/80 rounded-lg border px-3 py-2.5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
        <span>{dict.params.perSizePrices}</span>
        <ChevronDown
          aria-hidden
          className="text-muted-foreground size-4 transition-transform group-open:rotate-180"
        />
      </summary>
      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{dict.params.perSizeHint}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {settings.sizes.map((size) => {
          const override = settings.pricePerSize[String(size)];
          return (
            <label key={size} className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground w-14 shrink-0 text-right tabular-nums">
                {formatLengthValue(size, units, locale, 0)} {unit}
              </span>
              <Input
                type="number"
                min={0}
                step={units === "imperial" ? 1 : 5}
                inputMode="decimal"
                className="h-9 tabular-nums sm:h-8"
                placeholder={
                  settings.pricePerMetre ? String(unitPriceValue(settings.pricePerMetre, units)) : "—"
                }
                value={override === undefined ? "" : unitPriceValue(override, units)}
                onChange={(event) =>
                  actions.setPricePerSize(
                    size,
                    event.target.value === ""
                      ? null
                      : unitPriceToMetres(Number(event.target.value) || 0, units),
                  )
                }
              />
            </label>
          );
        })}
      </div>
    </details>
  );
}
