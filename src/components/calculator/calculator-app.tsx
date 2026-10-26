"use client";

import { useState } from "react";

import { LoopEditor } from "@/components/calculator/loop-editor";
import { ResultPanel } from "@/components/calculator/result-panel";
import { SettingsPanel } from "@/components/calculator/settings-panel";
import { StepNav, type Step } from "@/components/calculator/step-nav";
import { SummaryPanel } from "@/components/calculator/summary-panel";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { useCalculator } from "@/lib/calculator-state";

export function CalculatorApp() {
  const controller = useCalculator();
  const [step, setStep] = useState<Step>("loops");

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="container-page flex-1 py-5 sm:py-8">
        <StepNav step={step} onChange={setStep} hasResult={Boolean(controller.outcome?.ok)} />

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:gap-6">
          <div className="min-w-0 space-y-5">
            {step === "loops" ? <LoopEditor controller={controller} /> : null}

            {step === "params" ? (
              <SettingsPanel controller={controller} onCalculate={() => setStep("result")} />
            ) : null}

            {step === "result" ? (
              <ResultPanel
                controller={controller}
                onEditLoops={() => setStep("loops")}
                onEditSettings={() => setStep("params")}
              />
            ) : null}
          </div>

          <SummaryPanel controller={controller} onCalculate={() => setStep("result")} />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
