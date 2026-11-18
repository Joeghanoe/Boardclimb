import type { ProblemSummary } from '@boardclimb/domain';

export interface CachedProblemPage {
  items: ProblemSummary[];
  /** Pass as `after` to read the next page; null when this page is empty. */
  last: number | null;
}
