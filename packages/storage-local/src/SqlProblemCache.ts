import { makeConfigKey } from '@boardclimb/catalog-core';
import type {
  CachedProblemPage,
  CachedProblemQuery,
  CatalogSyncState,
  ProblemCache,
} from '@boardclimb/catalog-core';
import type { Problem, ProblemKey, ProblemSummary } from '@boardclimb/domain';
import type { ProblemRow } from './ProblemRow';
import type { SqlDatabase } from './SqlDatabase';
import type { SqlValue } from './SqlValue';
import { rowToProblem, rowToSummary } from './rowToProblem';

const COLUMNS =
  'seq, problem_key, manufacturer, configuration_id, provider_problem_id, name, grade_system, grade_label, difficulty, rating, detail_json';

const UPSERT = `INSERT INTO problems
  (problem_key, config_key, manufacturer, configuration_id, provider_problem_id, name, grade_system, grade_label, difficulty, rating)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (problem_key) DO UPDATE SET
    name = excluded.name, grade_system = excluded.grade_system, grade_label = excluded.grade_label,
    difficulty = excluded.difficulty, rating = excluded.rating`;

function summaryParams(configKey: string, item: ProblemSummary): SqlValue[] {
  return [
    item.key,
    configKey,
    item.manufacturer,
    item.configurationId,
    item.providerProblemId,
    item.name,
    item.grade.system,
    item.grade.label,
    item.grade.difficulty,
    item.rating,
  ];
}

/**
 * The catalog cache on SQLite (ADR-0003). Upsert-only: a refresh updates rows in place and keeps their position,
 * and nothing deletes a problem. Filtering runs in SQL and must match matchesProblemFilters (shared contract).
 */
export class SqlProblemCache implements ProblemCache {
  constructor(private readonly db: SqlDatabase) {}

  async listProblems(query: CachedProblemQuery): Promise<CachedProblemPage> {
    const { filters } = query;
    const where = ['1=1'];
    const params: SqlValue[] = [];
    if (query.configKey !== null) {
      where.push('config_key = ?');
      params.push(query.configKey);
    }
    if (query.search) {
      where.push('instr(lower(name), lower(?)) > 0');
      params.push(query.search);
    }
    if (query.after !== null) {
      where.push('seq > ?');
      params.push(query.after);
    }
    if (filters.minDifficulty !== null) {
      where.push('difficulty >= ?');
      params.push(filters.minDifficulty);
    }
    if (filters.maxDifficulty !== null) {
      where.push('difficulty <= ?');
      params.push(filters.maxDifficulty);
    }
    if (filters.minStars > 0 && query.providerHasRatings) {
      where.push('rating >= ?');
      params.push(filters.minStars);
    }
    const rows = await this.db.all<ProblemRow>(
      `SELECT ${COLUMNS} FROM problems WHERE ${where.join(' AND ')} ORDER BY seq LIMIT ?`,
      [...params, query.limit],
    );
    return { items: rows.map(rowToSummary), last: rows.at(-1)?.seq ?? null };
  }

  upsertSummaries(configKey: string, items: ProblemSummary[]): Promise<void> {
    if (items.length === 0) return Promise.resolve();
    return this.db.transaction(async () => {
      for (const item of items) await this.db.run(UPSERT, summaryParams(configKey, item));
    });
  }

  async getSummary(key: ProblemKey): Promise<ProblemSummary | null> {
    const row = (
      await this.db.all<ProblemRow>(`SELECT ${COLUMNS} FROM problems WHERE problem_key = ?`, [key])
    )[0];
    return row ? rowToSummary(row) : null;
  }

  saveDetail(problem: Problem): Promise<void> {
    const { holds, ...summary } = problem;
    const configKey = makeConfigKey({ manufacturer: problem.manufacturer, id: problem.configurationId });
    return this.db.transaction(async () => {
      await this.db.run(UPSERT, summaryParams(configKey, summary));
      await this.db.run('UPDATE problems SET detail_json = ? WHERE problem_key = ?', [
        JSON.stringify({
          holds,
          ...(problem.bounds ? { bounds: problem.bounds } : {}),
          ...(problem.setter ? { setter: problem.setter } : {}),
        }),
        problem.key,
      ]);
    });
  }

  async getDetail(key: ProblemKey): Promise<Problem | null> {
    const row = (
      await this.db.all<ProblemRow>(`SELECT ${COLUMNS} FROM problems WHERE problem_key = ?`, [key])
    )[0];
    return row ? rowToProblem(row) : null;
  }

  async getSyncState(configKey: string): Promise<CatalogSyncState | null> {
    const row = (
      await this.db.all<{
        last_success_at: string | null;
        next_cursor: string | null;
        exhausted: number;
        revision_token: string | null;
      }>(
        'SELECT last_success_at, next_cursor, exhausted, revision_token FROM catalog_sync_state WHERE config_key = ?',
        [configKey],
      )
    )[0];
    if (!row) return null;
    return {
      configKey,
      lastSuccessAt: row.last_success_at,
      nextCursor: row.next_cursor,
      exhausted: row.exhausted === 1,
      revisionToken: row.revision_token,
    };
  }

  saveSyncState(state: CatalogSyncState): Promise<void> {
    return this.db.run(
      `INSERT INTO catalog_sync_state (config_key, last_success_at, next_cursor, exhausted, revision_token)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (config_key) DO UPDATE SET last_success_at = excluded.last_success_at,
         next_cursor = excluded.next_cursor, exhausted = excluded.exhausted, revision_token = excluded.revision_token`,
      [state.configKey, state.lastSuccessAt, state.nextCursor, Number(state.exhausted), state.revisionToken],
    );
  }
}
