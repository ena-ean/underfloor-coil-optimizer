"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { HistoryPanel } from "@/components/calculator/history-panel";
import { LoopEditor } from "@/components/calculator/loop-editor";
import { ResultPanel } from "@/components/calculator/result-panel";
import { SettingsPanel } from "@/components/calculator/settings-panel";
import { StepNav, type Step } from "@/components/calculator/step-nav";
import { SummaryBar } from "@/components/calculator/summary-bar";
import { SummaryPanel } from "@/components/calculator/summary-panel";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { useLocale } from "@/lib/i18n/provider";
import { decodeShare } from "@/lib/share";
import { useCalculator } from "@/lib/state";
import { recordHistory } from "@/lib/history";
import { cn } from "@/lib/utils";

export function CalculatorApp() {
  const controller = useCalculator();
  const { dict } = useLocale();
  const [step, setStep] = useState<Step>("loops");
  const pendingRecord = useRef(false);
  const { actions } = controller;

  /**
   * A share link carries the whole project in the hash. It wins over the stored
   * one — the visitor opened the link to see exactly that project — and the hash
   * is dropped afterwards so a reload does not overwrite later edits. A pasted
   * link into a tab that already runs the app only changes the fragment, so the
   * same import also listens to `hashchange`.
   */
  useEffect(() => {
    const importShared = () => {
      const shared = decodeShare(window.location.hash);
      if (!shared) return;
      actions.replaceLoops(shared.loops);
      actions.replaceSettings(shared.settings);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
      toast.success(dict.share.loaded);
    };

    importShared();
    window.addEventListener("hashchange", importShared);
    return () => window.removeEventListener("hashchange", importShared);
  }, [actions, dict]);

  /**
   * "Calculate" is explicit, the exact search is not: a ready plan is stored
   * immediately, otherwise the effect below waits for the worker to answer.
   */
  const handleCalculate = () => {
    const outcome = controller.outcome;
    if (outcome?.ok) {
      recordHistory(controller.state, outcome.result);
    } else if (!outcome) {
      pendingRecord.current = true;
    }
    setStep("result");
  };

  useEffect(() => {
    const outcome = controller.outcome;
    if (!outcome) return;
    if (!outcome.ok) {
      pendingRecord.current = false;
      return;
    }
    if (!pendingRecord.current) return;
    pendingRecord.current = false;
    recordHistory(controller.state, outcome.result);
  }, [controller.outcome, controller.state]);

  /** The fixed phone bar belongs to the input steps, not to a finished plan. */
  const showSummaryBar = step === "loops" || step === "params";

  return (
    <div className={cn("flex min-h-dvh flex-col", showSummaryBar && "pb-20 lg:pb-0")}>
      <SiteHeader />

      <main className="container-page flex-1 py-4 sm:py-8">
        <StepNav step={step} onChange={setStep} hasResult={Boolean(controller.outcome?.ok)} />

        <div className="mt-4 grid items-start gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:gap-6">
          <div key={step} className="animate-step-in min-w-0 space-y-4 sm:space-y-5">
            {step === "loops" ? <LoopEditor controller={controller} /> : null}

            {step === "params" ? (
              <SettingsPanel controller={controller} onCalculate={handleCalculate} />
            ) : null}

            {step === "result" ? (
              <ResultPanel
                controller={controller}
                onEditLoops={() => setStep("loops")}
                onEditSettings={() => setStep("params")}
              />
            ) : null}

            {step === "history" ? (
              <HistoryPanel controller={controller} onRestored={() => setStep("result")} />
            ) : null}
          </div>

          <div className="hidden lg:block">
            <SummaryPanel controller={controller} onCalculate={handleCalculate} />
          </div>
        </div>
      </main>

      <SiteFooter />

      {showSummaryBar ? (
        <SummaryBar controller={controller} onCalculate={handleCalculate} />
      ) : null}
    </div>
  );
}
