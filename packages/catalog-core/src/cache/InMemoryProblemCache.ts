import { matchesProblemFilters } from '@boardclimb/domain';
import type { Problem, ProblemKey, ProblemSummary } from '@boardclimb/domain';
import type { CachedProblemPage } from './CachedProblemPage';
import type { CachedProblemQuery } from './CachedProblemQuery';
import type { CatalogSyncState } from '../catalog/CatalogSyncState';
import type { ProblemCache } from './ProblemCache';
import { makeConfigKey } from './makeConfigKey';

interface Row {
  seq: number;
  configKey: string;
  summary: ProblemSummary;
  detail: Problem | null;
}

/** Cache in memory, for tests and the browser preview. Same semantics as the SQLite cache (shared contract). */
export class InMemoryProblemCache implements ProblemCache {
  private readonly rows = new Map<ProblemKey, Row>();
  private readonly sync = new Map<string, CatalogSyncState>();
  private nextSeq = 1;

  listProblems(query: CachedProblemQuery): Promise<CachedProblemPage> {
    const items: ProblemSummary[] = [];
    let last: number | null = null;
    const ordered = [...this.rows.values()].sort((a, b) => a.seq - b.seq);
    for (const row of ordered) {
      if (query.configKey !== null && row.configKey !== query.configKey) continue;
      if (query.search && !row.summary.name.toLowerCase().includes(query.search.toLowerCase())) continue;
      if (query.after !== null && row.seq <= query.after) continue;
      if (!matchesProblemFilters(row.summary, query.filters, query.providerHasRatings)) continue;
      items.push(row.summary);
      last = row.seq;
      if (items.length === query.limit) break;
    }
    return Promise.resolve({ items, last });
  }

  upsertSummaries(configKey: string, items: ProblemSummary[]): Promise<void> {
    for (const summary of items) {
      const existing = this.rows.get(summary.key);
      if (existing) existing.summary = summary;
      else this.rows.set(summary.key, { seq: this.nextSeq++, configKey, summary, detail: null });
    }
    return Promise.resolve();
  }

  getSummary(key: ProblemKey): Promise<ProblemSummary | null> {
    return Promise.resolve(this.rows.get(key)?.summary ?? null);
  }

  saveDetail(problem: Problem): Promise<void> {
    const existing = this.rows.get(problem.key);
    if (existing) {
      existing.detail = problem;
      existing.summary = summaryOf(problem);
    } else {
      const configKey = makeConfigKey({ manufacturer: problem.manufacturer, id: problem.configurationId });
      this.rows.set(problem.key, {
        seq: this.nextSeq++,
        configKey,
        summary: summaryOf(problem),
        detail: problem,
      });
    }
    return Promise.resolve();
  }

  getDetail(key: ProblemKey): Promise<Problem | null> {
    return Promise.resolve(this.rows.get(key)?.detail ?? null);
  }

  getSyncState(configKey: string): Promise<CatalogSyncState | null> {
    return Promise.resolve(this.sync.get(configKey) ?? null);
  }

  saveSyncState(state: CatalogSyncState): Promise<void> {
    this.sync.set(state.configKey, state);
    return Promise.resolve();
  }
}

function summaryOf({ holds: _holds, ...summary }: Problem): ProblemSummary {
  return summary;
}
