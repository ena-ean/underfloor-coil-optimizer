# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-10-26

Complete rewrite of the calculator: new solver, new UI, clean repository.

### Added

- **Exact solver** (branch and bound with a node/time budget) for up to 13
  loops, plus a lower bound on the purchase length and a visible optimality
  gap. The heuristic result is always kept as the incumbent.
- **Cost objective**: the solver can minimise money instead of metres, with
  optional per-size prices per metre (larger coils are often cheaper per metre).
- **Validation** with localised error messages (empty input, non-positive
  lengths, loops that do not fit the largest coil).
- **Vitest suite** (37 tests): reference packing cases, brute-force optimality
  comparison, property checks, cost objective, lower-bound behaviour, report
  exports, and the calculation history store.
- **Calculation history** (fourth step): every packing is saved locally together
  with its loops and purchase settings — open an entry to bring them back,
  rename it, delete it with an undo toast, or export/import the whole list as
  JSON. Recalculating identical inputs updates the existing entry instead of
  adding a duplicate; the list is capped at 50 entries and sanitised on every
  read.
- **Versioned local storage** (`coil-calc:state`, schema version 2) with a
  migration from the old unversioned key.
- **Redesigned UI**: four-step flow (loops → purchase → result → history), live
  recalculation, coil cards with fill bars, purchase specification,
  loop-to-coil distribution, savings against the naive "one coil per loop"
  purchase, dark theme by default (light is one click away), toasts,
  keyboard-friendly tables, Excel paste support, responsive layout down to
  320 px with a fixed summary bar on phones, and CSS-only motion that is
  switched off under `prefers-reduced-motion`.
- **Exports**: print/PDF stylesheet, CSV for Excel (`;` + decimal comma in
  Russian), self-contained HTML report.
- **i18n**: Russian and English dictionaries, the UI starts in the language of
  the system, the choice is remembered and `<html lang>` is kept in sync.
- **Docker**: multi-stage build on `node:22-alpine`, standalone Next.js output,
  non-root user, `HEALTHCHECK` against `/api/health`, compose file.
- **CI**: GitHub Actions running lint, typecheck, tests, build and a container
  smoke test.
- `LICENSE` (MIT), `CONTRIBUTING.md`, this changelog, README in English and
  Russian.

### Changed

- Algorithm core rewritten around integer millimetres, a lexicographic score
  (money → length → coil count) and four local-search neighbourhoods
  (move, swap, merge, split); the exponential 2ⁿ size-split enumeration was
  replaced with a capped, bounded search.
- `src/app/page.tsx` is now a thin server component; the UI lives in typed
  components under `src/components`.
- Bundle: unused shadcn/ui components and ~40 npm packages removed, images
  optimisation disabled (no raster assets), `sharp` binaries excluded from the
  runtime image.
- Docker image: 379 MB → 221 MB.

### Removed

- z.ai tooling and assets: `skills/`, `.zscripts/`, `Caddyfile`,
  `mini-services/`, `examples/websocket/`, `upload/`, `download/`,
  `z-ai-web-dev-sdk`, the remote icon from `z-cdn.chatglm.cn`.
- Dead backend: Prisma, SQLite database file, `src/lib/db.ts`,
  `src/app/api/route.ts` ("Hello, world!"), `.env` with the hard-coded
  `/home/z/my-project` path.
- `typescript.ignoreBuildErrors`, the bun lockfile, `tailwind.config.ts`
  (Tailwind v3 leftovers) and the unused shadcn/ui components.
