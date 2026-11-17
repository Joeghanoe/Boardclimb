# Licensing and provenance inventory

NFR-011: every production third-party code asset, design asset and catalog source needs a reviewed record before public release. This file is the record. It lists what is in the repo today; a human reviews it before release.

## Direct dependencies

Licence is the `license` field of the installed package, read from `node_modules` on 2026-11-17. A licence field is the package's own claim; nobody has reviewed the full transitive tree yet.

| Package                               | Version | Licence    | Used for                         | Reviewed |
| ------------------------------------- | ------- | ---------- | -------------------------------- | -------- |
| expo                                  | 58.0.25 | MIT        | App runtime and tooling          | No       |
| expo-sqlite                           | 58.0.17 | MIT        | Device SQLite driver             | No       |
| expo-status-bar                       | 58.0.5  | MIT        | Status bar                       | No       |
| @expo/metro-runtime                   | 58.0.17 | MIT        | Web bundling runtime             | No       |
| react                                 | 19.3.0  | MIT        | UI                               | No       |
| react-dom                             | 19.3.0  | MIT        | Browser preview                  | No       |
| react-native                          | 0.88.1  | MIT        | UI runtime                       | No       |
| react-native-web                      | 0.21.4  | MIT        | Browser preview                  | No       |
| react-native-safe-area-context        | 5.11.1  | MIT        | Safe-area insets                 | No       |
| typescript                            | 5.9.3   | Apache-2.0 | Type checking (development only) | No       |
| eslint, @eslint/js                    | 10.15.0 | MIT        | Lint (development only)          | No       |
| typescript-eslint                     | 8.73.0  | MIT        | Lint (development only)          | No       |
| prettier                              | 3.10.1  | MIT        | Format (development only)        | No       |
| @types/bun, @types/react, @types/node | -       | MIT        | Types (development only)         | No       |

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
