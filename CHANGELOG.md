# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.2.1] — 2026-10-27

### Fixed

- On a phone the loop distribution table keeps the four columns of 1.1.x: the
  room column is desktop and print only, because it pushed the coil number off
  the screen and added a horizontal scroll. Named loops still show their room on
  the coil cards above the table.

## [1.2.0] — 2026-10-27

### Added

- **Optional room names.** Every loop can be labelled with the room it heats
  ("Kitchen", "Bedroom 2"). The name is free text and optional; it follows the
  loop into the coil cards, the loop distribution table, the CSV export, the HTML
  report and the print view. Loops left unnamed look and export exactly as
  before — the extra column appears only once at least one loop carries a name.
- A name survives a reload, a saved calculation in the history, an exported and
  imported history file and a language switch. It never takes part in the
  packing: editing it does not change the plan or create a new history entry.

### Changed

- **Load sample is smaller and more realistic**: 12 loops on two floors with
  distinct lengths from 25 to 80 m instead of 19 near-identical rows of 64 and
  74 m, so the packing logic is easier to follow.

### Removed

- The stale `docs/screenshot.png` copy, which nothing referenced any more.

## [1.1.1] — 2026-10-27

### Changed

- The interface language now follows the **system language** only: a Russian
  system gets Russian, every other primary language gets English. A Russian tag
  further down `navigator.languages` no longer switches a German or Dutch browser,
  and an explicit choice in the header still wins over both.
- `src/lib/calculator-state.ts` and `src/lib/history.ts` were split into
  focused modules (`src/lib/state/*`, `src/lib/history/*`: types, model,
  storage, reducer, store). The public import paths are now `@/lib/state` and
  `@/lib/history`.
- `docker-compose.yml` is down to the four lines that matter: the image already
  sets `NODE_ENV`, the telemetry switch and the healthcheck, so the file no
  longer repeats them.
- The image healthcheck is a single `wget` call against `/api/health`.

### Removed

- Unused dependencies (`@radix-ui/react-checkbox`, `@radix-ui/react-tooltip`)
  with the unused checkbox component, plus the dead helpers `formatMeters` and
  `looksLikeLoopColumn`.

## [1.1.0] — 2026-10-26

### Added

- **Metric / imperial switch** in the header. The chosen system is remembered
  with the rest of the settings and applies to the loop lengths and the reserve,
  the coil sizes and prices, the whole result screen, the mobile summary bar, the
  clipboard parser and both exports (CSV and the HTML report). Lengths stay in
  metres in the state, the solver and the stored history; the conversion happens
  only when a number is rendered or typed, so switching units never changes the
  packing.
- **Wound coil drawing** for every coil in the plan: the spool diameter follows
  the coil size and its outer ring is the fill percentage, so an underfilled
  coil is visible at a glance.
- **Count-up numbers** on the result KPIs and the summary rows; the animation
  honours `prefers-reduced-motion`.

### Changed

- Result screen rebuilt around four KPI tiles (coils, purchased length, waste,
  cost) with the status banner, savings row and specification table below them.
- Purchase step: coil sizes and per-size prices share one row layout, and the
  objective switch states its consequence instead of only naming the mode.
- Step navigation shows an icon per step, and the header controls collapse to
  their labels on phones.
- Switching the interface language also aligns the default currency (roubles for
  Russian, dollars for English).
- Report and interface copy is unit-neutral ("Pipe length", "per unit length"),
  so it reads correctly in both systems.
- README and the Docker Hub overview are now plain prose instead of feature
  bullets, and both point at the live demo <https://coilcalculator.enaserver.ru/>.
- Build, test and layout instructions for source users moved to
  `docs/building.md`; the text published on Docker Hub lives in
  `docs/hub-overview.md` so it can be reviewed in the repository.

### Fixed

- The result status banner no longer squeezes its hint into a one-word column on
  a phone; the metrics block wraps below the text instead.

### Tests

- 39 Vitest cases: the report tests now cover both unit systems.

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
  non-root user, `HEALTHCHECK` against `/api/health`, compose file. Prebuilt
  `linux/amd64` images are published to Docker Hub as
  `enaresearch/underfloor-coil-optimizer:1.0.0` (also `latest`).
- **CI**: GitHub Actions running lint, typecheck, tests, build and a container
  smoke test.
- `LICENSE` (MIT), `CONTRIBUTING.md`, this changelog, README.

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
