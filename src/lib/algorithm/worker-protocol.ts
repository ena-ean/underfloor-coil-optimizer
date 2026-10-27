import type { LoopInput, OptimizationOptions, PackingOutcome, SolverProgress } from "./types";

/** Message the interface sends to the solver worker. */
export interface SolverWorkerRequest {
  id: number;
  loops: LoopInput[];
  options: OptimizationOptions;
}

/** Message the solver worker sends back. */
export type SolverWorkerReply =
  | { id: number; type: "progress"; progress: SolverProgress }
  | { id: number; type: "done"; outcome: PackingOutcome };
