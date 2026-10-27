# Underfloor heating coil optimizer

[![CI](https://github.com/ena-ean/underfloor-coil-optimizer/actions/workflows/ci.yml/badge.svg)](https://github.com/ena-ean/underfloor-coil-optimizer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker Hub](https://img.shields.io/docker/pulls/enaresearch/underfloor-coil-optimizer?logo=docker&logoColor=white)](https://hub.docker.com/r/enaresearch/underfloor-coil-optimizer)

You have a list of underfloor heating loops and a shop that sells pipe in fixed
coil sizes. This tool decides which loops go into which coil, so that almost no
pipe is left over, and it shows how far the plan is from the mathematical
minimum. Everything runs in the browser: no accounts, no backend, no tracking.

**Live demo:** <https://coilcalculator.enaserver.ru/> (test build of the current
code).

<p align="center">
  <img src="docs/screenshot-loops.png" alt="Loop entry screen" width="49%" />
  <img src="docs/screenshot-result.png" alt="Packing result" width="49%" />
</p>

<p align="center">
  <img src="docs/screenshot-mobile-result.png" alt="Packing result on a phone" width="32%" />
  <img src="docs/screenshot-mobile-history.png" alt="Calculation history on a phone" width="32%" />
</p>

## What it does

Nineteen loops of 64 m and 74 m add up to 1 350 m of pipe. Buying one coil per
loop means 3 800 m, and simply rounding the total up is wrong too, because coils
come in fixed sizes and the offcut of one coil cannot be spliced onto the next.
So the purchase is a packing problem, and this calculator solves it instead of
guessing.

Paste a column of lengths from Excel, pick the coil sizes and the objective
(minimum metres or minimum cost with your own price per metre), and the plan
appears as you type: coils with a fill percentage, the purchase specification,
which loop went into which coil, and the saving against buying one coil per
loop. Every plan is compared with a lower bound, so a zero gap means the answer
is optimal and a positive one is an honest statement of how much room is left.
Up to 13 loops the exact solver runs and usually closes the gap.

Results can be printed or saved as PDF, exported to CSV for Excel, or saved as a
standalone HTML report. Each calculation is kept in a local history with its
inputs, so you can come back to it, rename it, or export the whole list. The
interface is Russian and English, dark by default, and usable on a phone. A
switch in the header moves every length between metres and feet, from the loop
input to the exports, and the stored calculation stays the same either way.

## Run it

The published image targets `linux/amd64`. Tags `1.1.1` and `latest` are the same
build, under 60 MB compressed, and the container runs as a non-root user:

```bash
docker run --rm -p 3000:3000 enaresearch/underfloor-coil-optimizer:latest
```

With Compose, from a clone of this repository (`docker-compose.yml` keeps the
container name, the port and `restart: unless-stopped`; the healthcheck comes
from the image):

```bash
docker compose up -d
```

Both serve <http://localhost:3000>. `PORT=8080 docker compose up -d` moves it.
To build the image yourself, run the dev server or the test suite, see
[docs/building.md](docs/building.md).

## How it packs

All arithmetic happens in integer millimetres, so a float comparison never
decides whether a loop fits. The first answer comes from a best-fit greedy pass
with a one-step lookahead over three input orders, improved by local search:
move a loop, swap two loops, merge two coils, split a coil. Then, for up to 13
loops, an exact branch and bound search runs with a node and time budget and
keeps whichever result scores better.

The lower bound is the second half of the story. Every plan is a sum of coil
sizes, therefore a multiple of their greatest common divisor, so
`ceil(total / gcd) × gcd` cannot be beaten. If the plan reaches that number the
answer is optimal and the interface says so. Candidates are compared
lexicographically: money when the cost objective is on, then purchased length,
then number of coils.

## Releases

Changes of every version are in [CHANGELOG.md](CHANGELOG.md) and releases are
tagged in this repository (`v1.1.1`). The container image is published on
[Docker Hub](https://hub.docker.com/r/enaresearch/underfloor-coil-optimizer).

## License

[MIT](LICENSE) © 2026 ena-ean
