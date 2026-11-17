import type { ProblemSummary } from '@boardclimb/domain';

/** The problem list as currently loaded on the home screen, so the problem screen can step through it live. */
export interface BrowsedList {
  items: readonly ProblemSummary[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
}
