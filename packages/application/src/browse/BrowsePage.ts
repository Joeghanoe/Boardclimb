import type { CatalogErrorCode } from '@boardclimb/catalog-core';
import type { ProblemSummary } from '@boardclimb/domain';
import type { Freshness } from './Freshness';

export interface BrowsePage {
  items: ProblemSummary[];
  /** Pass back as `after` for the next page. */
  next: number | null;
  /** False only when the provider said it has nothing more and the cache has been read to the end. */
  hasMore: boolean;
  freshness: Freshness;
  /** Why the provider could not be reached, when it could not. The cached items are still returned. */
  notice: CatalogErrorCode | null;
}
