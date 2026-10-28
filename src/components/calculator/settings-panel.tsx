"use client";

import { Calculator, Plus, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal } from "@/components/ui/reveal";
import { Separator } from "@/components/ui/separator";
import { CURRENCIES, currencySymbol, type Currency } from "@/lib/format";
import { useLocale } from "@/lib/i18n/provider";
import { coilSizes, isDefaultCoils, type CalculatorController } from "@/lib/state";
import { formatLengthValue, fromInputValue, toInputValue, unitLabel } from "@/lib/units";

interface SettingsPanelProps {
  controller: CalculatorController;
  onCalculate: () => void;
}

/** Whole coils move in hundreds of roubles and in single dollars. */
function priceStep(currency: Currency): number {
  return currency === "RUB" ? 100 : 1;
}

export function SettingsPanel({ controller, onCalculate }: SettingsPanelProps) {
  const { state, outcome, actions } = controller;
  const { dict, locale } = useLocale();
  const settings = state.settings;
  const units = settings.units;
  const unit = unitLabel(units, dict);
  const canCalculate = controller.activeLoops.length > 0 && coilSizes(settings.coils).length > 0;

  return (
    <Card>
      <CardHeader className="gap-2">
        <CardTitle>{dict.params.title}</CardTitle>
        <CardDescription>{dict.params.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <CoilCatalogue controller={controller} />

        <Separator />

        <Reveal className="grid gap-5 sm:grid-cols-2">
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
                      onClick={() => actions.setReserve(value)}
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
            <Label htmlFor="currency">{dict.params.currency}</Label>
            <select
              id="currency"
              className="border-input bg-card focus-visible:ring-ring h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-[3px] sm:w-40"
              value={settings.currency}
              onChange={(event) => actions.setCurrency(event.target.value as Currency)}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency} · {currencySymbol(currency, locale)}
                </option>
              ))}
            </select>
          </div>
        </Reveal>

        <Reveal>
          <Button size="lg" className="w-full" onClick={onCalculate} disabled={!canCalculate}>
            <Calculator aria-hidden />
            {outcome ? dict.params.recalculate : dict.params.calculate}
          </Button>
        </Reveal>
      </CardContent>
    </Card>
  );
}

interface SuffixInputProps {
  ariaLabel: string;
  /** Unit shown inside the field, e.g. `м` or `₽`. */
  suffix: string;
  value: number | string;
  onChange: (raw: string) => void;
  min?: number;
  step?: number;
  placeholder?: string;
}

/** Number field with the unit drawn inside it: no room lost to a label. */
function SuffixInput({ ariaLabel, suffix, value, onChange, min, step, placeholder }: SuffixInputProps) {
  return (
    <div className="relative min-w-0">
      <Input
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        min={min}
        step={step}
        placeholder={placeholder}
        className="h-9 w-full pr-7 text-right tabular-nums"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-[11px]">
        {suffix}
      </span>
    </div>
  );
}

/**
 * The purchase catalogue: one row per coil that can be bought, priced as a whole
 * coil. The same length may appear twice — one size from two suppliers — and the
 * estimate then uses the cheaper price.
 */
function CoilCatalogue({ controller }: { controller: CalculatorController }) {
  const { state, actions } = controller;
  const { dict, locale } = useLocale();
  const settings = state.settings;
  const units = settings.units;
  const unit = unitLabel(units, dict);
  const sign = currencySymbol(settings.currency, locale);
  const step = priceStep(settings.currency);
  const sizeStep = units === "imperial" ? 1 : 10;

  const [draftSize, setDraftSize] = useState("");
  const [draftPrice, setDraftPrice] = useState("");

  const isDefault = isDefaultCoils(settings.coils, settings.currency);

  const commit = () => {
    const metres = fromInputValue(Number(draftSize.replace(",", ".")), units);
    if (!Number.isFinite(metres) || metres <= 0) {
      toast.error(dict.params.invalidSize);
      return;
    }
    const price = Number(draftPrice.replace(",", "."));
    actions.addCoil(metres, Number.isFinite(price) && price > 0 ? price : 0);
    setDraftSize("");
    setDraftPrice("");
  };

  return (
    <section className="space-y-2">
      <div className="text-muted-foreground grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_1.75rem] items-center gap-1.5 text-[10px] font-medium tracking-wide uppercase">
        <span>
          {dict.params.size}, {unit}
        </span>
        <span>
          {dict.params.price}, {sign}
        </span>
        <span aria-hidden />
      </div>

      <ul className="space-y-1.5">
        {settings.coils.map((coil, index) => (
          <li
            key={coil.id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_1.75rem] items-center gap-1.5"
          >
            <SuffixInput
              ariaLabel={`${dict.params.size} ${index + 1} (${unit})`}
              suffix={unit}
              min={1}
              step={sizeStep}
              value={toInputValue(coil.size, units)}
              onChange={(raw) =>
                actions.updateCoil(coil.id, { size: fromInputValue(Number(raw) || 0, units) })
              }
            />
            <SuffixInput
              ariaLabel={`${dict.params.price} ${index + 1} (${sign})`}
              suffix={sign}
              min={0}
              step={step}
              placeholder="—"
              value={coil.price > 0 ? Math.round(coil.price * 100) / 100 : ""}
              onChange={(raw) => actions.updateCoil(coil.id, { price: Number(raw) || 0 })}
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive size-7"
              aria-label={`${dict.params.remove}: ${formatLengthValue(coil.size, units, locale, 0)} ${unit}`}
              disabled={settings.coils.length <= 1}
              onClick={() => actions.removeCoil(coil.id)}
            >
              <X aria-hidden className="size-3.5" strokeWidth={2.5} />
            </Button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <div className="relative w-20">
          <Input
            type="number"
            inputMode="decimal"
            min={1}
            step={sizeStep}
            aria-label={`${dict.params.add}: ${dict.params.size}`}
            placeholder={dict.params.size}
            className="h-9 pr-6 text-right tabular-nums"
            value={draftSize}
            onChange={(event) => setDraftSize(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              commit();
            }}
          />
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-1.5 grid place-items-center text-[11px]">
            {unit}
          </span>
        </div>
        <div className="relative w-28">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step={step}
            aria-label={`${dict.params.add}: ${dict.params.price}`}
            placeholder={dict.params.price}
            className="h-9 pr-6 text-right tabular-nums"
            value={draftPrice}
            onChange={(event) => setDraftPrice(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              commit();
            }}
          />
          <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-1.5 grid place-items-center text-[11px]">
            {sign}
          </span>
        </div>
        <Button size="sm" variant="outline" className="h-9" onClick={commit}>
          <Plus aria-hidden />
          {dict.params.add}
        </Button>
        {isDefault ? null : (
          <Button size="sm" variant="ghost" className="h-9" onClick={() => actions.resetCoils()}>
            <RotateCcw aria-hidden />
            {dict.params.reset}
          </Button>
        )}
      </div>

      <p className="text-muted-foreground text-xs leading-relaxed">{dict.params.hint}</p>
    </section>
  );
}
