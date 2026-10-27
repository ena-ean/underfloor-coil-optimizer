import { optimizePacking } from "./index";
import type { SolverWorkerReply, SolverWorkerRequest } from "./worker-protocol";

/**
 * Off-main-thread entry point: one request at a time.
 *
 * The search has no time budget, so cancelling is done by terminating the
 * worker — a message would only be read after the synchronous search returns.
 */

type WorkerScope = {
  postMessage: (message: SolverWorkerReply) => void;
  onmessage: ((event: MessageEvent<SolverWorkerRequest>) => void) | null;
};

const scope = self as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<SolverWorkerRequest>) => {
  const { id, loops, options } = event.data;

  const outcome = optimizePacking(loops, {
    ...options,
    hooks: {
      onProgress: (progress) => scope.postMessage({ id, type: "progress", progress }),
    },
  });

  scope.postMessage({ id, type: "done", outcome });
};
