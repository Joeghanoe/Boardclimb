# BoardClimb

BoardClimb is a local-first React Native (iOS and Android) companion for climbers on Kilter, MoonBoard and Tension boards. It lets a climber find a problem, explicitly light it on the board and log attempts, Top and Flash, with no account. The question every change answers: does this change the physical board or the climber's history, and did the climber explicitly ask for exactly that?

TeamValue's harness applies (`.github/instructions/teamvalue.instructions.md`, `.harness/index.md`) and is not repeated here. This file holds only what is specific to this repo.

Product behaviour is `docs/adr/ADR-0001-*.md` (normative, requirement IDs FR, NFR, AC). Boundaries are ADR-0002; stored layout and the log rule are ADR-0003; toolchain is ADR-0004; the design is `docs/solution-design.md`.

**Audience (UI-1, UI-2).** A climber at a gym wall, on their own phone, usually one-handed and standing, with chalky fingers, in a dim or bright hall, and often switching between browsing, lighting and logging every few minutes. They read English and climbing grades (Font, V-scale), not engineering words. Main goal on a problem screen: **Light up** it, then log. Touch targets are at least 44 by 44 points. Screens never explain themselves; empty and error states say what happened and what to do next.

## Vocabulary

- **Board model / configuration**: a catalog entry (for example a layout, size and angle). Not a physical board.
- **Controller**: the nearby physical BLE device that drives the LEDs. The climber picks it; the app never auto-selects it.
- **Problem key**: manufacturer, configuration id and provider problem id as one stable string. Logs store only this.
- **Manual attempts**: attempts the climber added; **success contribution**: the one attempt that Top or Flash adds; **attempts** = manual + success.
- **Session**: one local calendar day. **Light up**: the explicit action that sends an LED command. **Light on swipe**: an opt-in, per-connection switch that lights the problem the climber settles on (FR-008a).
- **Sample source / scripted transport**: labelled stand-ins used until vendor access is verified. They are never presented as real hardware or real catalogs.

## Layout

```text
apps/mobile/              Expo app: entry point and composition root
  src/screens/            screens and presentation models; no adapter, BLE or SQLite imports
  src/composition/        the only place that names concrete adapters and drivers
packages/
  domain/                 Problem identity, grades, filters, the log rule (summarizeLog); imports nothing
  application/            use cases and ports (Clock, IdGenerator, LogStore, ProblemCache, SettingsStore, DiagnosticsSink)
  catalog-core/           BoardCatalog contract, CatalogError codes, cached reader (stale-while-revalidate)
  catalog-kilter|moonboard|tension/   one adapter each over a ProviderSource port
  bluetooth-core/         BoardController contract, state machines, BoardError codes, BleTransport port
  board-kilter|moonboard|tension/     one controller each over BleTransport
  provider-snapshots/     public BoardSesh dataset adapter and pinned hardware metadata
  protocol-aurora/        shared reference-derived Aurora v2/v3 encoder
  storage-local/          SQLite schema, migrations, SQL stores over the SqlDatabase port
  design-system/          tokens and primitives; imports nothing
tests/architecture/       dependency-boundary, adapter-registry and design-consistency tests
tests/scenarios/          end-to-end flows through the real composition root
scripts/                  Bun dev scripts (verify.ts)
docs/                     solution-design.md, adr/
```

Dependencies point inward: domain imports nothing; core packages and application import domain; adapters import their core; only `apps/mobile/src/composition` imports adapters, drivers and storage. Do not add `shared/`, `utils/` or `helpers/` folders. One exported type, component or hook per file, named after it.

## Naming

Packages are `@boardclimb/<folder-name>`. Test files sit beside their source as `*.test.ts`. Requirement IDs (FR-xxx, AC-xx) appear in test names. There is no cloud infrastructure; IAC naming does not apply.

## Current decisions

- Append-only event log with derived totals and set-style toggles: no stored totals, no flip commands. ADR: `docs/adr/ADR-0003-local-persistence-and-log-derivation.md`
- Native composition uses public BoardSesh snapshot sources and reference-derived BLE protocols for all three boards (ADR-0005); physical compatibility is still unverified. Sample mode remains explicit on web. Constructors without a source/encoder still return `provider_unverified` or `protocol_unverified` instead of guessing. ADR: `docs/adr/ADR-0002-react-native-architecture-and-integrations-updated.md`
- Only `lightUp` sends an LED command, from a Light up tap or from `showing` while light on swipe is on; connection, reconnection, resume and browsing with it off never do. ADR: `docs/adr/ADR-0001-product-experience-and-logging-updated.md`
- Bun workspaces and `bun test`, TypeScript strict, Expo with a development client (Expo and Metro run on Node; everything else on Bun, hoisted linker). ADR: `docs/adr/ADR-0004-toolchain-and-test-strategy.md`

## Pitfalls

- **Fabricated vendor details**: an invented endpoint, UUID or byte layout looks real and fails at the wall. Instead: leave the transport out, return the `*_unverified` code and add a spike note in the design's Known limits.
- **Inferred LED state shown as fact**: without readback the app only knows what this phone sent. Instead: show "Last command sent from this phone" and use `confirmed` only when `ledStateReadback` is `supported`.
- **Missing rating read as zero**: a null rating means not rated. Instead: keep null through storage, filter and UI.
- **A second total**: any new place that adds up attempts drifts from `summarizeLog`. Instead: call it.
- **Provider words in screens**: provider field names or conditionals in shared components break replaceability. Instead: map in the adapter, pass domain types.
- **Resend on reconnect**: calling `lightUp` from a lifecycle handler violates FR-017. Instead: reconnect only; the climber taps Light up.

## Follow a change across boundaries

- A new board manufacturer: its `catalog-*` and `board-*` packages, the registry in `apps/mobile/src/composition`, the contract suites in `catalog-core` and `bluetooth-core`, the board selector list and the design Components table. **checked**: `tests/architecture/adapter-registry.test.ts` (every adapter package is registered and runs both contract suites).
- A new error code: the code enum in its core package, a row in the design's Failure model, and the climber's wording in `apps/mobile/src/screens/presentation/describe*Error.ts`. **checked**: `tests/architecture/design-consistency.test.ts` (every code appears in `docs/solution-design.md`) and the type-checker (the wording maps are exhaustive `Record`s; `presentation.test.ts` rejects engineering words).
- A new SQLite column or table: a numbered migration, `SqlLogStore` or cache queries, the ADR-0003 layout table and a migration test from the previous version. **checked**: `packages/storage-local/src/migrations.test.ts`.
- A new import between packages: the dependency direction above. **checked**: `tests/architecture/dependency-boundaries.test.ts`.
- A new use case that can call `BoardController.lightUp`: only `lightUp` may. **checked**: `packages/application/src/no-passive-lighting.test.ts`.
- A new telemetry event or property: the sink allow-list and the design's Observability contract. **checked**: `tests/architecture/design-consistency.test.ts`.
- A new design token: `packages/design-system` and a contrast check. **checked**: `packages/design-system/src/contrast.test.ts`.

## Development environment

On this Windows workstation, continue development in Ubuntu on WSL2 at
`/home/joeghanoe/BoardClimb` (`~/BoardClimb`). Run repository edits, installs,
verification and Expo/Metro there, through `wsl.exe -d Ubuntu -- bash -lc` when
starting from PowerShell. The checkout under `D:\Prototypes\BoardClimb` is a
separate Windows copy; changes are not automatically synchronized. Do not run
against `/mnt/d` or push into the Windows checkout's checked-out branch. Use
Node from `.node-version` and the Bun canary recorded in `packageManager` in `package.json`
(`bun upgrade --canary`; `bun lint` is not in a released Bun yet, ADR-0004 section 7).

## Verifying

CI runs `bun install --frozen-lockfile`, then `bun run verify` (`scripts/verify.ts`: `bun fmt --check`, `bun lint` and `bun check` in parallel, then `bun test` including the architecture tests). The agent's quick check is the project verify in `~/.golden-path-harness/projects/` (`--fast` skips the SQLite scale tests); this repo carries no copy of it. The design gate (`tvh greenfield check`) runs in design-only mode because its code checks are C# specific; the active `.github/workflows/verify.yml` runs the same project gate, web/iOS JavaScript exports and Android compilation. CI activation was part of the product owner’s 2026-11-17 request to finish the remaining MVP; deployment and signed release publication remain separate human actions.

Every required local check also runs in CI using the same implementation and effective policy: `bun run verify` is that implementation. ADRs live in `docs/adr/`. Screens are verified by rendering the app with react-native-web and screenshotting at 320, 390, 768 and 1280 px (UI-1). Real-device, BLE and vendor checks are not run here; missing evidence stays listed in the design's Known limits.

## Taste

Keep changes small. Do not keep code nobody calls. No tests that only count mock calls; assert what the climber or the board would observe. Say so when you break one of these.

## When to ask

Ask before: choosing a BLE library or a real provider endpoint, storing any credential, adding a backend or account, changing the log rule or session-day rule, reusing third-party code or assets (needs a provenance row first), changing the stored layout, or claiming hardware behaviour that was not tested.
