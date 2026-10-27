"use client";

import { optimizePacking } from "@/lib/algorithm";
import type {
  LoopInput,
  OptimizationOptions,
  PackingOutcome,
  SolverProgress,
} from "@/lib/algorithm/types";
import type { SolverWorkerReply, SolverWorkerRequest } from "@/lib/algorithm/worker-protocol";

/**
 * Search controller for the packing.
 *
 * The exact solver can run for a long time, so it lives in a worker and the
 * interface reads its progress through this external store — the same
 * `useSyncExternalStore` pattern as the calculator state. Navigating away or
 * editing the loops terminates the worker instead of waiting for it.
 */

export interface SolverRequest {
  /** Identity of the inputs; a finished plan for another key is never shown. */
  key: string;
  loops: LoopInput[];
  options: OptimizationOptions;
}

export interface SolverSnapshot {
  key: string;
  outcome: PackingOutcome | null;
  progress: SolverProgress | null;
  running: boolean;
  /** True when the last run ended without proving optimality. */
  stopped: boolean;
}

/** Budget of the synchronous fallback, used only where workers are missing. */
const FALLBACK_BUDGET_MS = 15_000;

const IDLE: SolverSnapshot = {
  key: "",
  outcome: null,
  progress: null,
  running: false,
  stopped: false,
};

let snapshot: SolverSnapshot = IDLE;
const listeners = new Set<() => void>();

let worker: Worker | null = null;
let requestId = 0;
let activeRequest: SolverRequest | null = null;

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeToSolver(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function getSolverSnapshot(): SolverSnapshot {
  return snapshot;
}

export function getSolverServerSnapshot(): SolverSnapshot {
  return IDLE;
}

const proven = (outcome: PackingOutcome | null): boolean =>
  outcome !== null && outcome.ok && outcome.result.diagnostics.optimal;

function createWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  try {
    return new Worker(new URL("../algorithm/optimizer.worker.ts", import.meta.url), {
      type: "module",
    });
  } catch {
    return null;
  }
}

function disposeWorker(): void {
  if (!worker) return;
  worker.onmessage = null;
  worker.onerror = null;
  worker.terminate();
  worker = null;
}

/** Runs the solver on the main thread: only for browsers without workers. */
function solveHere(request: SolverRequest, id: number): void {
  const deadline = Date.now() + FALLBACK_BUDGET_MS;
  const outcome = optimizePacking(request.loops, {
    ...request.options,
    hooks: { shouldStop: () => Date.now() > deadline },
  });
  if (id !== requestId) return;
  snapshot = {
    key: request.key,
    outcome,
    progress: snapshot.progress,
    running: false,
    stopped: !proven(outcome),
  };
  emit();
}

function finish(request: SolverRequest, outcome: PackingOutcome): void {
  if (snapshot.key !== request.key) return;
  snapshot = {
    key: request.key,
    outcome,
    progress: snapshot.progress,
    running: false,
    stopped: !proven(outcome),
  };
  emit();
}

/** Starts the search unless this exact request already has a plan or is running. */
export function startSolve(request: SolverRequest): void {
  if (snapshot.key === request.key && (snapshot.running || snapshot.outcome !== null)) return;

  const id = ++requestId;
  activeRequest = request;
  snapshot = { key: request.key, outcome: null, progress: null, running: true, stopped: false };
  emit();

  if (!worker) worker = createWorker();
  if (!worker) {
    solveHere(request, id);
    return;
  }

  worker.onmessage = (event: MessageEvent<SolverWorkerReply>) => {
    const reply = event.data;
    if (reply.id !== id || id !== requestId) return;
    if (reply.type === "progress") {
      snapshot = { ...snapshot, progress: reply.progress };
      emit();
      return;
    }
    finish(request, reply.outcome);
  };

  worker.onerror = () => {
    disposeWorker();
    if (id !== requestId) return;
    solveHere(request, id);
  };

  const message: SolverWorkerRequest = { id, loops: request.loops, options: request.options };
  worker.postMessage(message);
}

/** Drops the current run without reporting a result (inputs changed). */
export function abandonSolve(): void {
  requestId += 1;
  disposeWorker();
}

/** Stops the run and keeps whatever is on screen; the user decides what next. */
export function cancelSolve(): void {
  abandonSolve();
  if (!snapshot.running) return;
  snapshot = { ...snapshot, running: false, stopped: true };
  emit();
}

/** Returns to the empty state, e.g. after every loop was removed. */
export function resetSolver(): void {
  abandonSolve();
  activeRequest = null;
  snapshot = IDLE;
  emit();
}

/** Re-runs the last request, used by the "search again" button. */
export function retrySolve(): void {
  if (!activeRequest) return;
  const request = activeRequest;
  snapshot = IDLE;
  startSolve(request);
}
