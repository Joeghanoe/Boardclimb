import type { ProblemFilters } from '@boardclimb/domain';

export interface CachedProblemQuery {
  /** Null searches all previously downloaded configurations. */
  configKey: string | null;
  search?: string;
  filters: ProblemFilters;
  /** Whether the provider gives ratings at all; decides how the rating filter applies. */
  providerHasRatings: boolean;
  /** Cache cursor returned by the previous page, or null for the first page. */
  after: number | null;
  limit: number;
}
