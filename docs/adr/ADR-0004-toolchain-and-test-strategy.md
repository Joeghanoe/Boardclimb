# ADR-0004: Toolchain, workspace layout and test strategy

- **Status:** Accepted. Amended the same day: Bun replaces npm and Vitest (product owner request), see section 5.
- **Date:** 2026-11-16
- **Decision owners:** Engineering team
- **Related:** ADR-0002 (sections 2.1, 2.7), ADR-0003

## 1. Context

ADR-0002 chose React Native with TypeScript and a modular monorepo whose packages are workspaces, not published modules. The repo had no code or tooling. A native BLE library cannot run in a test runner, yet the domain, catalog, storage and state-machine logic can and must be verified without a phone (ADR-0002 section 2.7, steps 2 and 4). The machine used for this change has no iOS or Android device or emulator.

## 2. Decision

1. **Bun workspaces** (`apps/*`, `packages/*`), one `bun.lock`, no separate publishing. Bun is the package manager and the runner for every development script. `bunfig.toml` pins the **hoisted** linker, because Metro and Expo are tested against a hoisted `node_modules` and Bun 1.4 defaults to an isolated one.
2. **TypeScript** in `strict` mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` on. One root `tsconfig.json` type-checks every workspace with `tsc --noEmit`; packages expose their TypeScript sources (`exports` points at `src/index.ts`) and there is no per-package `dist` build, so Metro, `bun test` and `tsc` all read the same files. Path aliases (`@boardclimb/*`) mirror the workspace names; Bun reads them natively.
3. **`bun test`** runs all tests. Test layers (T.3): layer 0 is unit and contract tests with fakes plus SQLite tests on a real in-memory database; scenario tests (T.5) drive use cases through the real composition root with fakes for radio, clock and ids. Every scenario carries a stable ID (AC-xx or FR-xx) in its name. Scale tests are named `*.scale.test.ts` and are skipped by `verify:fast`.
4. **Mobile app is an Expo project with a development client** (not Expo Go), because BLE needs native modules. Screens render in a browser through `react-native-web` so layouts can be screenshotted and checked (UI-1) where no device exists; that is a rendering aid, not a supported target. **Expo's CLI and Metro keep running on Node**, the runtime React Native tooling is tested against; React Native 0.88 requires Node 22.13, 24.3 or 26.
5. **`bun:sqlite`** (built in) is the SQLite used by tests; `expo-sqlite` is the device driver; both sit behind the same `SqlDatabase` port.
6. **One verify command**, `bun run verify` (`scripts/verify.ts`): prettier check, ESLint and `tsc --noEmit` run in parallel through `Bun.spawn`, then `bun test` runs alone because the scale tests assert time budgets. The project verify and CI run it. Dev scripts and architecture tests use Bun's native APIs (`Bun.spawn`, `Bun.Glob`, `Bun.file`, `import.meta.dir`).
7. **ESLint with typescript-eslint and Prettier** for lint and format, run on Bun's runtime (`bun --bun`). Each exported type or component has its own matching file (CODE.5 for TypeScript).

## 3. Alternatives considered

| Option                   | Assessment                                                                                       | Decision                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| npm workspaces + Vitest  | Ships with Node, most widely used; verify took about 12 s, tests about 4.4 s                     | Superseded by Bun (see section 5)          |
| pnpm workspaces          | Fast installs, extra tool on every developer and CI machine                                      | Not selected                               |
| Jest                     | Expo default, but needs Babel transforms for TypeScript and ESM workspaces                       | Not selected                               |
| Bare React Native CLI    | More control, more native setup; Expo prebuild gives the same native access                      | Not selected                               |
| Expo Go only             | Cannot load a BLE module                                                                         | Not selected                               |
| Biome or oxlint          | Much faster lint and format; would drop or rewrite the custom T.2 clock rules written for ESLint | Deferred, can be added without Bun changes |
| Bun as runtime for Metro | Not what React Native tooling is tested against                                                  | Not selected                               |

## 4. Consequences

**Positive:** One tool for install, scripts and tests. Full verify about 3.7 s (formatter, linter and types in parallel, tests about 2 s). Native `bun:sqlite`, `Bun.Glob` and `Bun.file` replace `node:` equivalents in dev code. Boundaries are enforced by a test, not by convention.

**Negative:** `bun test` is not Vitest: assertion messages passed as the second argument of `expect` are ignored, and `toBe` is typed strictly. Bun's SQLite and Expo's SQLite are different engine builds; the `SqlDatabase` port and the schema tests limit the difference, but physical-device storage tests remain open. The browser rendering does not prove native behaviour (safe areas, haptics, BLE permissions). Two runtimes exist: Bun for tooling, Node for Expo/Metro. Bun 1.4 is a canary build here (`1.4.5-canary.1`); CI should pin a released version. On this Windows machine `bun install` failed to link three packages (react-native among them) with the isolated linker and a cross-drive cache; the hoisted linker installed cleanly.

**Risks:** A BLE library choice (for example `react-native-ble-plx`) is not made here; it is part of the BLE spikes and needs its own ADR when the first physical-board test chooses it.

## 5. Amendment: Bun

The product owner asked for Bun as the development runtime for speed, using Bun's native APIs where possible. Measured on this repo before and after: tests 4.4 s to 1.9 s, whole verify about 12 s to 3.7 s. ESLint, Prettier and `tsc` ran no faster on Bun's runtime than on Node (within 0.3 s), so the gain comes from the test runner and from running the static checks in parallel, not from the runtime itself.

## 6. Amendment: stable Linux development baseline (2026-11-17)

The development environment is Ubuntu under WSL2, with the repository on the Linux
filesystem. Node 24.22.3 is recorded in `.node-version`; `packageManager` now pins
released Bun 1.4.4 instead of the previous 1.4.5 canary. Frozen installation and the
full project verify, including SQLite scale tests, passed with these versions.
The external project harness also passed its design and decision checks; CODE.5
reported not applicable for this tooling and documentation change.

The hoisted linker remains: its Expo/Metro compatibility rationale still applies
on Linux. No dependencies or stored layouts change. These checks establish the
local tooling baseline; they do not establish native or BLE behaviour or a hosted
CI result. The workflow in `docs/ci-proposal.md` is a proposal for a human to activate
under CLD.2.
