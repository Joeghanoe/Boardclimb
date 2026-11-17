# BoardClimb

A local-first React Native app for climbers on Kilter, MoonBoard and Tension boards: find a problem, light it on the board, and log attempts, Top and Flash. No account.

Phone builds use public BoardSesh catalog snapshots and native Bluetooth with reference-derived Kilter, MoonBoard and Tension encoders. Physical compatibility is pending gym validation. The web preview stays on labelled sample data and a scripted radio. See `docs/solution-design.md` (Known limits), ADR-0005 and the [iPhone build/test guide](docs/iphone-gym-test.md).

## Run

```sh
bun install --frozen-lockfile
bun run verify       # format, lint, types, tests
bun run web
```

Product behaviour is in `docs/adr/ADR-0001-*.md`; boundaries and layout are in `AGENTS.md` and the other ADRs.

## Development environment

Use Ubuntu under WSL2 for development on Windows. Keep the checkout on the Linux
filesystem (`~/BoardClimb`), rather than running tools against `/mnt/d`. The verified
baseline is Node 24.22.3 (`.node-version`) and stable Bun 1.4.4 (`packageManager` in
`package.json`). Node runs Expo and Metro; Bun runs installation, scripts and tests.
Keep the hoisted linker in `bunfig.toml` for Expo/Metro compatibility.

```sh
cd ~/BoardClimb
node --version
bun --version
bun install --frozen-lockfile
bun run verify
bun run web
```

The browser preview uses sample catalogs, a scripted radio and in-memory storage.
Phone builds use SQLite and real snapshot/BLE adapters. For a MacBook-built, locally
signed iPhone app that runs at the gym without Metro, follow [the build guide](docs/iphone-gym-test.md).

On the current workstation, the Linux clone's `origin` points to the Windows checkout
at `/mnt/d/Prototypes/BoardClimb`. Fetch committed Windows changes with `git fetch origin`
and review them before integrating. Linux edits stay in the Linux checkout; they do
not automatically appear in Windows. Do not push into the Windows checkout's checked-out
branch. Publication to GitHub remains a separate operation.

The external project harness can be run from this checkout with:

```sh
bash ~/.golden-path-harness/projects/BoardClimb-78488f35/verify.sh
```

That harness is workstation tooling, not a repository dependency. The portable gate
is `bun run verify`. GitHub Actions runs the project gate, web/iOS JavaScript exports and Android
compilation through `.github/workflows/verify.yml`. It does not deploy or sign an iOS build.
