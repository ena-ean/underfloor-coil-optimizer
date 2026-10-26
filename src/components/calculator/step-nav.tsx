"use client";

import { Check } from "lucide-react";

import { useLocale } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export type Step = "loops" | "params" | "result";

interface StepNavProps {
  step: Step;
  onChange: (step: Step) => void;
  hasResult: boolean;
}

export function StepNav({ step, onChange, hasResult }: StepNavProps) {
  const { dict } = useLocale();

  const items: { key: Step; label: string; hint: string }[] = [
    { key: "loops", label: dict.steps.loops, hint: dict.steps.loopsHint },
    { key: "params", label: dict.steps.params, hint: dict.steps.paramsHint },
    { key: "result", label: dict.steps.result, hint: dict.steps.resultHint },
  ];

  const currentIndex = items.findIndex((item) => item.key === step);

  return (
    <nav aria-label={dict.steps.loops} className="no-print grid grid-cols-3 gap-2">
      {items.map((item, index) => {
        const active = item.key === step;
        const done = index < currentIndex || (item.key === "result" && hasResult && !active);
        return (
          <button
            key={item.key}
            type="button"
            aria-current={active ? "step" : undefined}
            onClick={() => onChange(item.key)}
            className={cn(
              "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
              active
                ? "border-primary/40 bg-card shadow-soft"
                : "border-border/70 bg-card/50 hover:border-primary/30 hover:bg-card",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-success/15 text-success"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{item.label}</span>
              <span className="text-muted-foreground hidden truncate text-[11px] sm:block">
                {item.hint}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
