# Contributing

Thanks for taking the time to improve the calculator.

## Workflow

1. Fork the repository and create a branch: `feat/…`, `fix/…`, `docs/…`.
2. `npm ci`
3. Make the change. Keep the diff focused — no unrelated refactoring.
4. Run the full check before pushing:

   ```bash
   npm run check     # lint + typecheck + tests
   npm run build
   ```

5. Open a pull request describing **what** changed and **why**. Screenshots help
   for UI changes.

## Conventions

- TypeScript strict, no `any`, no non-null assertions unless unavoidable.
- Solver code works on **integer millimetres**; never compare floats for fits.
- Results are compared with the lexicographic `Score` (money → length → coils).
- UI strings live in `src/lib/i18n/ru.ts` and `en.ts`; the English dictionary is
  typed against the Russian one, so both must be updated together.
- Components stay presentational; state lives in `src/lib/calculator-state.ts`.
- Every algorithm change must come with a test — either a reference case or a
  brute-force comparison (`tests/packing.test.ts`).

## Reporting bugs

Please include:

- the loop lengths and coil sizes you used (or the exported CSV),
- what you expected and what you got,
- browser and OS.

## License

By contributing you agree that your work is released under the [MIT license](LICENSE).
