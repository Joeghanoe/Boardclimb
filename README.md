# BoardClimb

A local-first React Native app for climbers on Kilter, MoonBoard and Tension boards: find a problem, light it on the board, and log attempts, Top and Flash. No account.

Real manufacturer catalogs and Bluetooth protocols are not connected yet; the app runs on labelled sample data and a scripted radio. See `docs/solution-design.md` (Known limits) and each adapter's `SPIKE.md`.

## Run

```sh
bun install
bun run verify       # format, lint, types, tests
cd apps/mobile && bunx expo start --web
```

Product behaviour is in `docs/adr/ADR-0001-*.md`; boundaries and layout are in `AGENTS.md` and the other ADRs.
