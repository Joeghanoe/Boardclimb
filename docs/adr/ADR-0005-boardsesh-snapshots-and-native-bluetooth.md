# ADR-0005: Public BoardSesh snapshots and native Bluetooth

- **Status:** Accepted for private gym testing; physical compatibility and distribution rights remain unverified.
- **Date:** 2026-11-17
- **Authority:** Product owner requested borrowing BoardSesh catalogs and Bluetooth, completing the remaining MVP, and will test on an iPhone. No credentials, accounts or backend were requested.
- **Related:** ADR-0001 FR-001–FR-018; ADR-0002 A1–A5/A7/A8; ADR-0003; ADR-0004.

## Decision

Use BoardSesh revision `c788005578c3650e6684d68ca48988104d9eb32c` as the
interoperability reference. Retain Apache-2.0 attribution and license in
`docs/third-party`; inventory exact paths before reuse. Use `react-native-ble-plx`
3.5.1 over the existing `BleTransport` port. It is created lazily only on an explicit
scan/connect action. Controllers keep their capabilities unknown until observed.

Read the explicitly public nightly datasets through
`https://snapshots.boardsesh.com/board-snapshots/v1-gzip/manifest.json`.
Never use BoardSesh hosted GraphQL/accounts/sessions as this app's backend. Validate
manifest version, privacy version, origin, layout and lengths. Download each selected
layout to a separate SQLite file, decode gzip in bounded input chunks, and run
`PRAGMA quick_check` and schema probes before publishing it. Reuse installed files
offline; check for a newer artifact at most once per day per app process, in the
background when an installed catalog exists. Failed refresh never replaces a good
file or changes the climber's log database. Larger initial downloads need Wi-Fi;
Kilter Original is about 84 MB compressed in the recorded manifest.

`provider-snapshots` maps this shared external dataset onto `ProviderSource` for all
three manufacturer catalog adapters. `protocol-aurora` contains the shared pure
Aurora encoder used by Kilter and Tension controllers. Neither package imports a
native library; only composition names file, SQLite and BLE drivers. These are
explicit adapters, not a general shared/helpers layer.

The provider pages locally by UUID and exact selected angle after the bulk snapshot
is installed, filters compatible wall sizes and excludes private/draft/hidden climbs.
Multi-frame animated climbs are excluded rather than flattened into unsafe commands.
Missing stats at the chosen angle remain unrated/ungraded. Keep the published paired
Font/V label, rather than overriding the manufacturer's V label with our conversion.
Bundle only public factual geometry and grading/role metadata from the recorded
hardware snapshot and MoonBoard constants; do not bundle its passwords, account data,
aliases, beta links, hold photos, fonts or brand assets. Attribute public setters on detail.

Existing `detail_json` gains optional hold coordinates, LED position/colour, setter and
board bounds. Existing records remain readable. There are no new tables, columns or
changes to log events, identities, totals or session-day rules. Source configurations
include layout, wall size and angle, preventing lighting a different size or layout.

Only explicit Light up reaches `write`; connect/disconnect/reconnect/resume never
send LEDs. Serialize whole commands, stop after a lost link or failed chunk, and refuse
empty, partial, unmapped or unknown-protocol patterns. Negotiate a writable Nordic
UART characteristic or original MoonBoard RedBearLab fallback. Use 20-byte chunks,
write-with-response when advertised, otherwise write-without-response. Transport
success means sent from this phone; no physical LED readback is claimed.

## Evidence and release gates

- Real downloaded snapshots for all three manufacturers have recorded public subsets,
  original DDL, dated manifest metadata and pagination/hold-mapping tests.
- Real composition-root scenario: download pages, cache opened details, log, restart,
  source offline, browse across downloaded layouts and relight only explicitly.
- Encoder tests include upstream byte vectors, v2/v3, fragmentation, standard/Mini
  MoonBoard and refusal of malformed mappings. Scripted transport tests are not hardware evidence.
- CI activation was included in the product owner’s request to finish the remaining
  MVP; `.github/workflows/verify.yml` runs the portable gate and native Android
  compile with pinned actions and read-only permissions, without deployment/signing.
- Native file downloading, permissions, lifecycle, firmware and LED behaviour need
  device tests. Gym test plan: `docs/iphone-gym-test.md`. iPhone signing happens locally
  on the owner's MacBook with their Personal Team; no Apple credentials enter the repo.
- BoardSesh explicitly welcomes use of its snapshots (`LEGAL.md`, dataset docs).
  This is separate from manufacturer or commercial rights. Distribution needs review
  of the source inventory and complete dependency licenses; no legal approval is inferred.

## Alternatives

Direct manufacturer APIs would require additional access/authentication and separate
schema work. BoardSesh's hosted app backend is not an authorized dependency for forks.
Bundling all climb databases would make the app unnecessarily large; load selected
layouts and keep the normal local cache instead. Native backup remains optional and
unclaimed until restore is tested; no cloud sync or TopLogger dependency is introduced.
