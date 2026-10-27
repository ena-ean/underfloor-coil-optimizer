# Building and running from source

You need Node.js 20 or newer (CI uses 22) and npm. Docker is only needed if you
want the container image.

```bash
npm ci
npm run dev
```

The dev server listens on <http://localhost:3000>. For a production build:

```bash
npm run build
npm start
```

`npm run check` runs ESLint, `tsc --noEmit` and the Vitest suite in one go, which
is what CI does on every push. `npm run test` runs the tests alone. They cover
the reference case (19 loops of 64 and 74 m packed into seven 200 m coils with
106 m left over, proven optimal), a brute force comparison on small random
instances, search cancellation and progress reporting, validation errors, the
lower bound, CSV and clipboard parsing, and the history store.

## Docker image

```bash
docker build -t coil-optimizer .
docker run --rm -p 3000:3000 coil-optimizer
```

The Dockerfile is a multi stage build of the Next.js standalone output, about
221 MB on disk, running as a non-root user with a `HEALTHCHECK` against
`/api/health`. No environment variables are required and `PORT` (default 3000)
is honoured everywhere, including `docker compose`.

## Where the code lives

`src/app` holds the pages and the health endpoint. `src/components/calculator`
has one component per screen block, `src/lib/algorithm` is the solver (types,
price model, seed, exact search, Web Worker), `src/lib/state` is the persisted
calculator state (types, defaults and sanitising, reducer, store, search
controller, `useCalculator`), `src/lib/history` is the same for saved
calculations, `src/lib/report` builds the CSV and HTML reports, `src/lib/i18n`
holds the Russian and English dictionaries, and `tests` is the Vitest suite.
