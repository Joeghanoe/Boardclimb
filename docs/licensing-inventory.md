# Licensing and provenance inventory

NFR-011: every production third-party code asset, design asset and catalog source needs a reviewed record before public release. This file is the record. It lists what is in the repo today; a human reviews it before release.

## Direct dependencies

Licence is the `license` field of the installed package, read from `node_modules` on 2026-11-17. A licence field is the package's own claim; nobody has reviewed the full transitive tree yet.

| Package                               | Version | Licence    | Used for                                        | Reviewed |
| ------------------------------------- | ------- | ---------- | ----------------------------------------------- | -------- |
| expo                                  | 58.0.25 | MIT        | App runtime and tooling                         | No       |
| expo-sqlite                           | 58.0.17 | MIT        | Device SQLite driver                            | No       |
| expo-status-bar                       | 58.0.5  | MIT        | Status bar                                      | No       |
| @expo/metro-runtime                   | 58.0.17 | MIT        | Web bundling runtime                            | No       |
| react                                 | 19.3.0  | MIT        | UI                                              | No       |
| react-dom                             | 19.3.0  | MIT        | Browser preview                                 | No       |
| react-native                          | 0.88.1  | MIT        | UI runtime                                      | No       |
| react-native-web                      | 0.21.4  | MIT        | Browser preview                                 | No       |
| react-native-safe-area-context        | 5.11.1  | MIT        | Safe-area insets                                | No       |
| typescript                            | 5.9.3   | Apache-2.0 | Expo and editor type support (development only) | No       |
| @types/bun, @types/react, @types/node | -       | MIT        | Types (development only)                        | No       |

No BLE library is chosen. Choosing one needs its own ADR and a row here (ADR-0004, Risks).

## Design assets

The colour palette, spacing and type scale in `packages/design-system` are original to this repo. They are not taken from any manufacturer's app or from TopLogger. The reference audit named in ADR-0002 section 2.6, item 6 is still open. No fonts, icons or images are bundled; the UI uses the platform's system font and text characters.

## Catalog sources

None. The catalogs are made-up sample records in the repo (`sampleProblemRecords`, `buildSampleProviderData`). Each manufacturer needs a row before its real source is connected: what the source is, the terms under which the app may read and cache it, who approved that, and the date. The spike notes (`packages/catalog-*/SPIKE.md`) say when.

| Source    | Terms and permission to cache | Approved by | Date |
| --------- | ----------------------------- | ----------- | ---- |
| Kilter    | Not established               | -           | -    |
| MoonBoard | Not established               | -           | -    |
| Tension   | Not established               | -           | -    |

## BoardSesh reuse approved for this implementation (2026-11-17)

User authorization: "Borrow from BoardSesh" for catalogs and Bluetooth, with physical
iPhone validation planned separately. Upstream revision: `c788005578c3650e6684d68ca48988104d9eb32c`.

| Material                                                          | Provenance / licence                                                                                                                       | Adaptation and review status                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aurora and MoonBoard BLE encoding, chunking and service constants | `packages/shared/ble-protocol/src/{aurora,moonboard,transport}.ts`, Apache-2.0                                                             | Adapted into BoardClimb controller encoders; fail closed on unmapped holds; no auto-lighting, pairing, account or session code copied. Physical validation pending.                                                                                                                                                                                                                     |
| Role/LED colours, MoonBoard grid and angle choices                | `packages/board-constants/src/{hold-states,moonboard}.ts`, `packages/shared/board-config/src/{board-data,moonboard-config}.ts`, Apache-2.0 | Only interoperability values; original BoardClimb UI.                                                                                                                                                                                                                                                                                                                                   |
| Public catalog/hardware snapshots                                 | `docs/board-snapshots-dataset.md` and `LEGAL.md` at the revision above                                                                     | BoardSesh explicitly welcomes snapshot use. Manifests: `https://snapshots.boardsesh.com/board-snapshots/v1-gzip/manifest.json` and `https://snapshots.boardsesh.com/board-snapshots/v1-catalog/manifest.json`. No hosted GraphQL/API dependency. Public setters attributed on detail. Manufacturer/commercial rights remain a release review, not established by Apache's code licence. |
| Mirrored copies of the same snapshots (ADR-0006)                  | Same files, copied unchanged into BoardClimb's Cloudflare R2 bucket; grades files are not copied                                           | Accepted by the product owner on 2026-11-18. Before the mirror is deployed for anyone beyond private gym tests, ask BoardSesh whether a public mirror is fine and record the answer here. The mirror deletes what BoardSesh stops listing after 14 days, matching their grace window.                                                                                                   |
| react-native-ble-plx                                              | BoardSesh's chosen BLE library; Apache-2.0, package version recorded by bun.lock                                                           | User authorized borrowing this integration. Native build/permission tests and gym verification tracked separately.                                                                                                                                                                                                                                                                      |
| expo-file-system / expo-dev-client                                | Expo SDK-matched packages; MIT, versions in bun.lock                                                                                       | Native snapshot download/storage and development build.                                                                                                                                                                                                                                                                                                                                 |
| fflate                                                            | MIT, version in bun.lock                                                                                                                   | Streaming gzip decoding with bounded chunks; no assets reused.                                                                                                                                                                                                                                                                                                                          |

Upstream Apache licence is retained in `docs/third-party/boardsesh-LICENSE.txt`,
with attribution and modification notice in `docs/third-party/NOTICE.md`.
BoardSesh's legal analysis is their stated position, not independent legal approval
for BoardClimb. No manufacturer logos, photographs, hold art or UI assets are reused.

## Full-board rendering reuse approved for local implementation (2026-11-17)

| Material                                                  | Exact source                                                                                                                                       | Intended adaptation                                                                                                                                                                                                                                                                              | Status                                                                                                                                    |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Traced hold silhouettes for Kilter, MoonBoard and Tension | BoardSesh revision `2ae776efb8a6bbbe9ca05441d3606456e61c51e4`, `packages/shared/board-art-geometry/src/generated/{kilter,moonboard,tension}/*.cjs` | Bundle only outline polygons keyed by placement id, draw the complete selected layout locally and highlight route holds; no upstream app UI, hosted API, photos or logos. Repository is Apache-2.0; traced artwork origin and manufacturer rights remain an explicit public-distribution review. | User approved for this local implementation on 2026-11-17. Bundled outline polygons only; public-distribution rights review remains open. |
| react-native-svg 15.16.0                                  | Expo SDK 58 `bundledNativeModules.json`; https://github.com/software-mansion/react-native-svg                                                      | Native offline vector rendering for the board and accessible action-bar icons. MIT dependency, no accounts or network service.                                                                                                                                                                   | User approved on 2026-11-17; installed SDK-matched dependency.                                                                            |
