import type { Problem, ProblemKey, ProblemSummary } from '@boardclimb/domain';
import type { CachedProblemPage } from './CachedProblemPage';
import type { CachedProblemQuery } from './CachedProblemQuery';
import type { CatalogSyncState } from '../catalog/CatalogSyncState';

/**
 * The on-device catalog cache (ADR-0003). Refresh only upserts: nothing here deletes a problem, so logged
 * problems stay resolvable (FR-018). Rows keep provider order; filtering happens inside the store.
 */
export interface ProblemCache {
  listProblems(query: CachedProblemQuery): Promise<CachedProblemPage>;
  upsertSummaries(configKey: string, items: ProblemSummary[]): Promise<void>;
  getSummary(key: ProblemKey): Promise<ProblemSummary | null>;
  /** Stores the opened problem and its hold mapping so it can be shown and lit offline. */
  saveDetail(problem: Problem): Promise<void>;
  getDetail(key: ProblemKey): Promise<Problem | null>;
  getSyncState(configKey: string): Promise<CatalogSyncState | null>;
  saveSyncState(state: CatalogSyncState): Promise<void>;
}
