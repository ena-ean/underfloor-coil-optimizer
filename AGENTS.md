# AGENTS.md — working notes

Notes for an AI agent or a new maintainer. Human-facing docs: [README.md](README.md).

## Commands

```bash
npm ci                 # install (npm only, no bun)
npm run dev            # dev server, port 3000
npm run build          # production build, standalone output
npm run lint           # eslint .
npm run typecheck      # tsc --noEmit
npm run test           # vitest run
npm run check          # lint + typecheck + test (use before committing)
docker compose up --build   # image + container, port 3000
```

Windows: the shell is PowerShell; use `;` to chain commands. Docker Desktop must
be running (`docker info`) before compose commands.

## Layout

- `src/lib/algorithm/` — the solver. `types.ts` (domain), `cost.ts` (score and
  price model), `heuristic.ts` (greedy + local search), `exact.ts` (branch and
  bound), `index.ts` (`optimizePacking`, lower bound, naive baseline).
- `src/lib/calculator-state.ts` — module-level store + reducer, read through
  `useSyncExternalStore`; persists to `localStorage` on every action.
- `src/lib/i18n/` — `ru.ts` is the reference dictionary, `en.ts` is typed
  against it (`Dictionary`), `provider.tsx` holds the locale store.
- `src/lib/report/` — `spec.ts` (aggregation), `csv.ts`, `html.ts`, `download.ts`.
- `src/components/calculator/*` — one component per screen block; they receive
  the `CalculatorController` (`useCalculator()`), never call the solver directly.
- `tests/` — Vitest, node environment, aliases resolved through `vitest.config.ts`.

## Conventions

- TypeScript strict; no `any`, no non-null assertions in new code.
- All solver arithmetic is **integer millimetres**. Metres appear only at the
  public API boundary (`toMm` / `toMetres` in `algorithm/index.ts`).
- Solutions are compared with the lexicographic `Score` (weight → length →
  coil count) via `isBetter` / `compareScores`; never invent local comparisons.
- New UI strings: add the key to `ru.ts` **and** `en.ts` (the compiler enforces
  the mirror), and read it through `useLocale().dict`.
- Memory of state: no `useEffect` + `setState` — the ESLint config enables the
  React Compiler hooks rules (`react-hooks/set-state-in-effect`). Use an external
  store with `useSyncExternalStore` (see `calculator-state.ts`, `i18n/provider.tsx`).

## Gotchas

- `output: "standalone"` makes `next start` print a warning; it still serves
  correctly. In production the container runs `node server.js`.
- `images.unoptimized` and the `outputFileTracingExcludes` for `sharp` / `@img`
  keep ~46 MB of native binaries out of the image. Do not add `next/image`
  without revisiting this.
- The exact solver is capped (`maxExactLoops` 13, 250 k nodes, 400 ms). Results
  carry `diagnostics.optimal`; a zero `gap` proves optimality even in heuristic
  mode. Never claim optimality without one of those two facts.
- Reference data used by tests: 15 loops of 64 m + 4 loops of 74 m, reserve 2 m,
  coil 200 m → 7 coils, 1 400 m purchased, 106 m waste, gap 0.
- `localStorage` keys: `coil-calc:state` (v2, with migration from the legacy
  unversioned `coil-calc-state`), `coil-calc:locale`, `theme` (next-themes).
- Docker runtime stage copies only the `node` binary into `alpine:3.24` — no
  npm/pnpm in the image, so `docker exec … npm` does not exist.
- Do not reintroduce z.ai tooling (`skills/`, `.zscripts/`, `Caddyfile`,
  `mini-services/`) or Prisma/SQLite: the app is intentionally backend-free.
