import { SourceBackedCatalog, UnverifiedProviderSource } from '@boardclimb/catalog-core';
import type { BoardCatalog, ProviderSource } from '@boardclimb/catalog-core';

/** Without a verified source this answers `provider_unverified`; it never guesses a vendor response. */
export function createKilterCatalog(
  source: ProviderSource = new UnverifiedProviderSource('kilter'),
): BoardCatalog {
  return new SourceBackedCatalog('kilter', source);
}
