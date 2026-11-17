# Report: ADR-0001 and ADR-0002 implementation

Decomposition: single thread - one dependent chain (domain, then contracts, then use cases, then storage, then screens); each layer needed the types of the one before it, so there were no parallel branches.

## Done means

ADR-0001 (FR-001 to FR-018, NFR-001 to NFR-012, acceptance criteria) and ADR-0002 (modular React Native monorepo, adapters for three manufacturers, catalog and BLE contracts, SQLite, design system, delivery gates). ADR-0002 section 7 forbids invented vendor endpoints, BLE UUIDs and byte layouts, so the real vendor sources are spikes, not features.

## What matches the design

- **Structure:** every package and boundary in `docs/solution-design.md` exists. A test reads every import and fails on a wrong direction, an undeclared package or a SQLite or BLE library in a screen.
- **Log:** append-only events, totals derived by one function (`summarizeLog`), set-style Top and Flash, one calendar day per session (ADR-0003). Cross-midnight, repeated toggles and the Flash conflict are tested.
- **Catalogs:** all three manufacturers have an adapter that runs the same contract suite. Browsing is cache-first, then revalidated in the background; a failed refresh keeps the cached list. Filters are held equal between the domain and SQL by shared vectors. A missing rating stays "not rated".
- **Board control:** all three have a controller over a `BleTransport` port. Only `Light up` sends a command (a test fails if any other use case can reach `lightUp`). Status says "sent from this phone" and says "confirmed" only on readback.
- **Storage:** SQLite schema with forward-only migrations, the same contract tests on in-memory and SQL stores, a refusal to open a newer database.
- **App:** problem list with persisted filters and a freshness notice, problem detail (Light up, Attempt with an Edit control as well as long press, Top, Flash with a confirm, history, holds by role), board layout choice, board discovery and connect with manual layout choice, opt-in diagnostics, light and dark themes, sample data and unsaved records labelled on screen.
- **Verification:** `bun run verify` (format, lint, types, 313 tests) passes. Screens were rendered with react-native-web and screenshotted at 320, 390, 768 and 1280 px, light and dark; the harness's responsive and WCAG checks reported no findings on the final run. Flows run in the browser: pick a layout, open a problem, log attempts, toggle Top, get the Flash conflict prompt, light up without a board (actionable error), connect the sample board, light up (shows "sent", not "confirmed").

## Where the code diverges, and why

- **Real vendor catalogs and BLE protocols are not built.** There is no verified source for any of them; ADR-0002 section 7 forbids guessing. Each adapter returns `provider_unverified` or `protocol_unverified` by default and has a `SPIKE.md` with the steps to finish. The app runs on sample data and a scripted radio and says so.
- **Bun, not npm and Vitest,** at the product owner's request (ADR-0004 amendment). Expo and Metro stay on Node.
- **Hold geometry is not drawn.** No source provides it; the detail screen lists holds by role.
- **Problem-first browsing** shows the saved layout's problems; there is no merged search across manufacturers.
- **The board and layout list is not cached,** so offline a climber keeps the saved layout but cannot choose a new one.

## Rules applied

T.1 (one verify command; project verify outside the repo), T.2 (clock and ids through ports; lint bans ambient time and random outside tests and the composition root), T.3 and T.5 (layered tests; scenario tests with requirement IDs), CODE.5 (one exported type, component or hook per file; reviewed by hand for TypeScript), CODE.8 (one composition root, tested boundaries), CODE.9 (expected sizes and scale tests in the design), CODE.10 (one owner for the attempts total), SEC.1 and SEC.2 (no secrets; `.env` files not read; diagnostics allow-list), OBS.3 (diagnostics carry names, counts, codes and durations only), CLD.1 and CLD.2 (no cloud use, no push, no merge), DEL.4 (design, ADRs, `AGENTS.md` and verify before feature code), UI.1 and UI.2 (rendered and screenshotted at four widths and two themes; automated WCAG checks; copy kept to what the climber acts on).

## Rules consciously not applied or not satisfied

- **CODE.5 checker:** the harness checker is C# only, so it did not run on this repo; the rule was applied by review.
- **Design gate:** run in design-only mode for the same reason.
- **UI.1 independent UX review:** the verify-frontend playbook's independent review to a UX score was not run. The automated checks cannot judge usability.
- **T.6 (real systems):** no physical board, vendor service or phone was available.
- **T.4:** no bug has yet been found by a later layer, so no such regression test exists.
- **CI:** there is no pipeline file. A pipeline is for a human to add (CLD.2); it would run `bun install --frozen-lockfile` and `bun run verify` on a supported Node and a released Bun.

## What was not verified

- Anything on real hardware: BLE scanning, connecting, LED output, simultaneous connections, takeover, readback (ADR-0002 A4, A5), latency (NFR-001, NFR-002).
- Any real manufacturer service, its terms of use, or permission to cache its data (A1 to A3; `docs/licensing-inventory.md`).
- Expo SQLite on a phone. Tests use `bun:sqlite`; the two are different builds behind the same `SqlDatabase` port.
- iOS or Android behaviour: safe areas, the Android back button, long press on Add attempt, text scaling, Bluetooth permission prompts, minimum OS versions (NFR-010).
- Screens and hooks have no automated tests; the pure presentation models do. They were checked in a browser only.
- The transitive dependency licences, and the palette reference audit (ADR-0002 section 2.6, item 6).
- Node 24.2 is below React Native 0.88's minimum and Bun is a canary build; the web export worked on this setup, a device build was not tried.

## Harness feedback, not yet filed

- `tvh verify` fails under Git Bash on Windows with a mangled path (`D:\d\Prototypes\...`); the project `verify.sh` runs fine directly.
- The design gate's code checks (D04 to D09) assume C#, so a TypeScript repo can only use design-only mode.
- Candidate playbook: the contract-suite pattern (one shared suite, run against every adapter and against the in-memory and real stores).
