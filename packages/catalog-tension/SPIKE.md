# Integration status (2026-11-17)

Native composition now supplies `SnapshotProviderSource` over public BoardSesh SQLite snapshots. Recorded real-response, paging, geometry and offline/restart scenarios pass. No hosted BoardSesh app API is used. Source terms/revision are in ADR-0005 and the licensing inventory; public distribution rights review remains open.

The original spike checklist below is retained as the validation history. Statements that no implementation exists describe the original baseline, not the current native composition.

# Tension catalog: open spike

Status: **no real Tension `ProviderSource` exists.** `createTensionCatalog()` defaults to `UnverifiedProviderSource`
and answers `provider_unverified`. The sample source is made-up data and deliberately bulk-only and unrated, to
exercise those fallbacks (ADR-0002 section 7).

To finish, one person must (ADR-0002 A2, A3, A8):

1. Establish authorized access and terms for problem data; record the decision before writing a request.
2. Record real responses (boards, configurations, a problem page or bulk response, a problem detail) with date,
   endpoint and app version next to them (T.6), under `fixtures/`.
3. Implement `ProviderSource` mapping the wire format to the provider records, with real `capabilities`
   (including whether ratings exist and whether paging exists).
4. Replay the recordings through `runCatalogContract`.
5. Add the licensing row in `docs/licensing-inventory.md` (NFR-011).
