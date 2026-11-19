# ADR-0003: Local persistence, append-only climbing log and derived totals

- **Status:** Accepted
- **Date:** 2026-11-16
- **Decision owners:** Engineering team
- **Related:** ADR-0001 (sections 2.2, 2.3, 2.4; FR-012 to FR-015, FR-018; NFR-004), ADR-0002 (section 2.3)

## 1. Context

ADR-0001 requires reversible Top and Flash, non-inflating attempt counts, one local calendar day per session, history that keeps its original dates, and totals "derived from records". ADR-0002 requires transactional SQLite with migrations and idempotency keys, and cached catalogs that never orphan history. Data written to a phone cannot be reshaped later without a migration, so the stored layout is decided here, before the first write.

## 2. Decision

1. **The climbing log is an append-only table of events** (`log_events`). Rows are never updated or deleted by the app. A correction is a new event. Each row holds: client-generated unique `id`, insert-order `seq`, `problem_key`, `occurred_at` (UTC ISO 8601), `session_date` (local `YYYY-MM-DD` at logging time), `time_zone` (IANA name at logging time), `kind` and the payload.
2. **Two event kinds.**
   - `attempts` with integer `delta` (nonzero). Quick tap writes `+1`; the editor writes the difference between the old and new manual count for that session day. A write that would take a day's manual count below zero is refused (`attempts_would_be_negative`).
   - `achievement` with booleans `top` and `flash`, the full achievement state after the action, normalised so that `flash` implies `top`. The _latest_ `achievement` event is the current state.
3. **Totals are never stored.** `summarizeLog(events, today)` in `packages/domain` is the only owner of the rule `attempts = manual + success`. The success contribution is 1 when the current state has `top = true`, and it counts on the `session_date` of the event that last changed `top` from false to true. Session attempts are manual attempts on `today` plus the contribution when that is `today`; lifetime attempts are all manual attempts plus the contribution. Readers call this function on rows read in the same query; they see the result immediately after the write commits.
4. **Set, not flip.** Use cases are `setTop(value)` and `setFlash(value)`. They append an `achievement` event only when the normalised state differs from the current one, which makes repetition idempotent. Enabling Flash while the problem has manual attempts requires an explicit acknowledgement (`flash_conflicts_with_failed_attempts` otherwise).
5. **Problem identity** is the composite `problem_key` = manufacturer, configuration id, provider problem id (an opaque string built by one function). Logs store only the key. The cache table `problems` is upsert-only: refresh never deletes a row, so a logged problem stays resolvable (FR-018).
6. **Catalog cache and settings** live in `problems`, `catalog_sync_state` and `settings` in the same SQLite file. Grade is stored as published (`grade_label`, `grade_system`) plus a nullable integer `difficulty` on the Font ladder for range filtering; `rating` is a nullable real where NULL means _not rated_, never 0.
7. **Migrations** are forward-only numbered scripts, each run in a transaction, recorded in `meta.schema_version`. Version 1 is created by this change. An app that finds a newer version refuses to open the database.
8. **SQLite is behind a `SqlDatabase` port** (`exec`, `all`, `run`, `transaction`). Tests run the real schema on Bun's built-in `bun:sqlite`; the device uses `expo-sqlite`.

## 3. Alternatives considered

| Option                                            | Assessment                                                                                                | Decision                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| One mutable row per problem and day with counters | Simple reads, but toggles and edits drift and cannot be audited; rejected in ADR-0001                     | Rejected                                     |
| Store derived totals alongside events for speed   | Two owners of one value (CODE.10), drift risk; reads are small (at most a few hundred events per problem) | Rejected                                     |
| Flip-style toggle commands                        | A double tap or retry inverts state; set-style is idempotent                                              | Rejected                                     |
| Success contribution stored as its own event kind | More event kinds to keep consistent with achievement state                                                | Rejected; derived from the achievement event |
| Event-sourced log, derived totals                 | Auditable, reversible, import and sync friendly                                                           | **Selected**                                 |
| Realm, WatermelonDB or another store              | Adds a native dependency and a second query model for no stated need                                      | Not selected                                 |

## 4. Consequences

**Positive:** Totals cannot drift. Corrections keep history. Retried writes are harmless. The same rows are the export and future sync unit. The catalog can be rebuilt or replaced without touching history.

**Negative:** Every reader folds events (cost bounded by per-problem reads; a scale test covers 10,000 events). The success contribution moves to a later day if the climber turns Top off and on again on a later day; this is deliberate, because the contribution reflects the current achievement. Historical edits are appended with their own session date; no tool rewrites old rows.

**Risks:** If the success-contribution day rule proves wrong in usability testing, only `summarizeLog` and its tests change, because no total is stored. A schema change needs a numbered migration and a migration test with a fixture database from the previous version.

## Additive detail metadata (2026-11-17, ADR-0005)

`problems.detail_json` may also carry optional `setter` and `bounds`, and each hold
may carry `x`, `y`, `ledPosition` and `ledColor`. These are validated source-derived
cached details. Legacy details with only holds remain readable; there is no new
column, migration, log payload, stored total or session rule. External catalog
snapshot files are separate read-only inputs, never replacements for boardclimb.db.

## Setter and ascents on cached summaries (2026-11-18, migration 2)

Approved by the product owner on 2026-11-18 so the problem list can show who set a
problem and how many climbed it. Migration 2 adds two nullable columns to `problems`:
`setter TEXT` and `ascents INTEGER` (CHECK `ascents >= 0`). NULL means the provider did
not say; a refresh that omits them keeps the stored value (`COALESCE`). Rows from
version 1 survive with both NULL until the next refresh. Logs, the log rule and
session rule are unchanged. Covered by `packages/storage-local/tests/migrations.test.ts`
(version 1 to 2) and the shared ProblemCache contract.
