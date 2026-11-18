import { SourceBackedCatalog, UnverifiedProviderSource } from '@boardclimb/catalog-core';
import type { BoardCatalog, ProviderSource } from '@boardclimb/catalog-core';

/** Without a verified source this answers `provider_unverified`; it never guesses a vendor response. */
export function createTensionCatalog(
  source: ProviderSource = new UnverifiedProviderSource('tension'),
): BoardCatalog {
  return new SourceBackedCatalog('tension', source);
}
