# PROGRESS

Newest entry first. One dated entry per meaningful task.

## 2026-10-26 — full rewrite of the project (v1.0.0)

**Goal:** remove all z.ai leftovers, rebuild the UI, make the packing logic
correct and provable, prepare the repository for a public GitHub release.

**Done**

- Repository cleaned: `skills/` (412 files, 16.6 MB), `.zscripts/`, `Caddyfile`,
  `mini-services/`, `examples/`, `upload/`, `download/`, Prisma + SQLite
  (`prisma/`, `db/custom.db`, `src/lib/db.ts`, `src/app/api/route.ts`), the
  committed `.env`, `bun.lock`, dead `tailwind.config.ts`, unused shadcn/ui
  components (48 → 10), `z-ai-web-dev-sdk`. Tracked files: 512 → ~75.
- Algorithm rewritten: integer millimetres, cost model with per-size prices,
  greedy + local search (move/swap/merge/split), exact branch and bound for
  ≤ 13 loops, lower bound (`gcd`) and a visible gap, validation with localised
  errors, no mutation of caller arrays.
- UI rebuilt: three-step flow (loops → purchase → result), live recalculation,
  coil cards with fill bars, purchase specification, loop distribution, savings
  vs the naive purchase, print/CSV/HTML exports, dark theme, RU/EN with system
  detection, accessible labels (`aria-*`) instead of colour-only statuses.
- State: `useSyncExternalStore` store, schema version 2, migration from the old
  unversioned key.
- Build/infra: `ignoreBuildErrors` gone, `output: "standalone"`, npm lockfile,
  ESLint/TS/Vitest green, multi-stage Docker image, compose with healthcheck,
  GitHub Actions CI (lint, types, tests, build, container smoke test).
- Docs: `README.md`, `README.ru.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `LICENSE`,
  `AGENTS.md`, `docs/worklog.md` (old notes moved here).

**Verified**

- `npm run check` — lint clean, `tsc` clean, 14+ tests pass.
- Reference case: 19 loops (15 × 64 m + 4 × 74 m), reserve 2 m, 200 m coils →
  7 coils, 1 400 m purchased, 106 m waste, gap 0 (optimal).
- `docker compose up --build` → container healthy, `GET /` 200,
  `GET /api/health` 200. Image 379 MB → 221 MB, app payload 21.3 MB.
- UI smoke test in a real browser: sample load, result view, RU/EN switch
  (`<html lang>` follows), dark theme, reload keeps state, no horizontal
  overflow at 390 px.

**Decisions**

- npm instead of bun (Windows + CI friendliness); bun lockfile removed.
- No zustand/Prisma/zod: a ~50-line store, a redux-style reducer and manual
  validation keep the dependency tree small.
- Exact solver only for ≤ 13 loops; bigger inputs use the heuristic and report
  the gap honestly instead of pretending to be optimal.
- Git history is **not** rewritten (the `skills/` blobs stay in history). A
  squash requires an explicit decision by the maintainer.
- Runtime image 221 MB > the 200 MB target: the Node 22 binary alone is 124 MB.
  npm/corepack are already stripped; going lower needs a different runtime.

**Next (optional)**

- Web Worker for > 40 loops so the first paint never blocks.
- Better lower bound (large-item counting) to prove optimality for 14–20 loops.
- Screenshot/GIF in both READMEs, GitHub Pages demo.
- If the maintainer agrees: squash history to drop the 16 MB `skills/` blobs.
