"use client";

import { Calculator, Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ALL_COIL_SIZES, type CalculatorController } from "@/lib/calculator-state";
import { CURRENCIES, type Currency } from "@/lib/format";
import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  controller: CalculatorController;
  onCalculate: () => void;
}

export function SettingsPanel({ controller, onCalculate }: SettingsPanelProps) {
  const { state, outcome, actions } = controller;
  const { dict } = useLocale();
  const settings = state.settings;
  const canCalculate = controller.activeLoops.length > 0 && settings.sizes.length > 0;

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>{dict.params.title}</CardTitle>
        <CardDescription>{dict.params.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <section className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium">{dict.params.sizes}</h3>
            <span className="text-muted-foreground text-xs tabular-nums">
              {settings.sizes.length} {dict.common.of} {ALL_COIL_SIZES.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {ALL_COIL_SIZES.map((size) => {
              const active = settings.sizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={active}
                  onClick={() => actions.toggleSize(size)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                    active
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-4 place-items-center rounded-[5px] border transition-colors",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                    )}
                  >
                    {active ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="font-medium tabular-nums">{size}</span>
                  <span className="text-xs opacity-70">{dict.common.meters}</span>
                </button>
              );
            })}
          </div>
          <p className="text-muted-foreground text-xs">{dict.params.sizesHint}</p>
        </section>

        <Separator />

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="reserve">{dict.params.reserve}</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="reserve"
                type="number"
                min={0}
                step={0.5}
                inputMode="decimal"
                className="w-20 tabular-nums"
                value={settings.reserve}
                onChange={(event) => actions.setReserve(Number(event.target.value) || 0)}
              />
              <span className="text-muted-foreground text-xs">{dict.common.meters}</span>
              <div className="ml-auto flex items-center gap-0.5">
                {[0, 1, 2, 3].map((preset) => (
                  <Button
                    key={preset}
                    size="sm"
                    variant={settings.reserve === preset ? "secondary" : "ghost"}
                    className="h-7 px-2 text-xs tabular-nums"
                    onClick={() => actions.setReserve(preset)}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-muted-foreground text-xs">{dict.params.reserveHint}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">{dict.params.price}</Label>
            <div className="flex items-center gap-1.5">
              <Input
                id="price"
                type="number"
                min={0}
                step={5}
                inputMode="decimal"
                placeholder="0"
                className="w-24 tabular-nums"
                value={settings.pricePerMetre === 0 ? "" : settings.pricePerMetre}
                onChange={(event) => actions.setPrice(Number(event.target.value) || 0)}
              />
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

/** Optional price overrides — hidden by default to keep the form short. */
function PerSizePrices({ controller }: { controller: CalculatorController }) {
  const { state, actions } = controller;
  const { dict } = useLocale();
  const settings = state.settings;

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
        {settings.sizes.map((size) => (
          <label key={size} className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground w-12 shrink-0 text-right tabular-nums">
              {size} {dict.common.meters}
            </span>
            <Input
              type="number"
              min={0}
              step={5}
              inputMode="decimal"
              className="h-9 tabular-nums sm:h-8"
              placeholder={settings.pricePerMetre ? String(settings.pricePerMetre) : "—"}
              value={settings.pricePerSize[String(size)] ?? ""}
              onChange={(event) =>
                actions.setPricePerSize(
                  size,
                  event.target.value === "" ? null : Number(event.target.value),
                )
              }
            />
          </label>
        ))}
      </div>
    </details>
  );
}
