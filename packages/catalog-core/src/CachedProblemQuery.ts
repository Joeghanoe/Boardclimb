import type { ProblemFilters } from '@boardclimb/domain';

export interface CachedProblemQuery {
  configKey: string;
  filters: ProblemFilters;
  /** Whether the provider gives ratings at all; decides how the rating filter applies. */
  providerHasRatings: boolean;
  /** Cache cursor returned by the previous page, or null for the first page. */
  after: number | null;
  limit: number;
}
