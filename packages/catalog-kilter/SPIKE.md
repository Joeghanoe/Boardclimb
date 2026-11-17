# Kilter catalog: open spike

Status: **no real Kilter `ProviderSource` exists.** `createKilterCatalog()` defaults to `UnverifiedProviderSource`
and answers `provider_unverified`. The sample source is made-up data (ADR-0002 section 7).

To finish, one person must (ADR-0002 A2, A3, A8):

1. Establish authorized access: official API or terms, authentication, rate limits. Do not use Boardsesh's hosted
   API as a dependency. Record the answer in a decision update before writing a request (ADR-0002 section 7).
2. Record a real response for boards, configurations, a problem page and a problem detail, with the date, endpoint
   and app version next to it (T.6). Store it under `fixtures/`.
3. Implement `ProviderSource`: turn the wire format into `ProviderProblemSummaryRecord` and `ProviderProblemRecord`,
   declare real `capabilities`, and throw `CatalogError` codes. Pagination style and bulk fallback live here.
4. Run `runCatalogContract` against the recorded responses and add a test that replays them.
5. Add the licensing row in `docs/licensing-inventory.md` (NFR-011).
