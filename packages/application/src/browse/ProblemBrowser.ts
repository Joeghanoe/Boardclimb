import { CatalogError, makeConfigKey } from '@boardclimb/catalog-core';
import type {
  BoardCatalog,
  CatalogErrorCode,
  CatalogSyncState,
  ProblemCache,
} from '@boardclimb/catalog-core';
import type { BoardConfiguration, Problem, ProblemFilters, ProblemSummary } from '@boardclimb/domain';
import type { Clock } from '../ports/Clock';
import type { DiagnosticsSink } from '../ports/DiagnosticsSink';
import type { BrowsePage } from './BrowsePage';
import type { CatalogLookup } from './CatalogLookup';
import type { RefreshResult } from './RefreshResult';

export interface ProblemBrowserOptions {
  catalogs: CatalogLookup;
  cache: ProblemCache;
  clock: Clock;
  diagnostics: DiagnosticsSink;
  pageSize?: number;
}

/** Provider pages one browse call may fetch to fill a filtered page; more remain reachable (hasMore). */
const MAX_PROVIDER_PAGES_PER_CALL = 20;

/**
 * Stale-while-revalidate browsing (FR-006, AC-016). `browse` answers from the cache and only goes to the
 * provider when the cache cannot fill a page; `refresh` revalidates in the background. A failed provider
 * never removes anything: the cached items come back with a notice. Nothing here can reach a board.
 */
export class ProblemBrowser {
  private readonly pageSize: number;
  private readonly refreshing = new Map<string, Promise<RefreshResult>>();

  constructor(private readonly options: ProblemBrowserOptions) {
    this.pageSize = options.pageSize ?? 50;
  }

  async browse(
    configuration: BoardConfiguration,
    filters: ProblemFilters,
    after: number | null,
  ): Promise<BrowsePage> {
    const { cache } = this.options;
    const catalog = this.options.catalogs(configuration.manufacturer);
    const configKey = makeConfigKey(configuration);
    const query = {
      configKey,
      filters,
      providerHasRatings: catalog.capabilities().ratings,
      after,
      limit: this.pageSize,
    };

    let page = await cache.listProblems(query);
    let state = await cache.getSyncState(configKey);
    let notice: CatalogErrorCode | null = null;
    let fetched = 0;

    while (page.items.length < this.pageSize && !state?.exhausted && fetched < MAX_PROVIDER_PAGES_PER_CALL) {
      try {
        state = (await this.fetchNextPage(configuration, catalog, state)).state;
        fetched += 1;
      } catch (error) {
        notice = codeOf(error);
        break;
      }
      page = await cache.listProblems(query);
    }

    return {
      items: page.items,
      next: page.last,
      hasMore: page.items.length === this.pageSize || !state?.exhausted,
      freshness: notice !== null ? 'offline' : fetched > 0 ? 'fresh' : 'cached',
      notice,
    };
  }

  /** Re-fetches the first provider page so ratings and grades stay current. One request per configuration at a time. */
  refresh(configuration: BoardConfiguration): Promise<RefreshResult> {
    const configKey = makeConfigKey(configuration);
    const running = this.refreshing.get(configKey);
    if (running) return running;
    const started = this.revalidate(configuration).finally(() => this.refreshing.delete(configKey));
    this.refreshing.set(configKey, started);
    return started;
  }

  /** The opened problem with its hold mapping: from the device if seen before, otherwise from the provider. */
  async getProblem(configuration: BoardConfiguration, summary: ProblemSummary): Promise<Problem> {
    const cached = await this.options.cache.getDetail(summary.key);
    if (cached) return cached;
    const problem = await this.options
      .catalogs(configuration.manufacturer)
      .getProblem(configuration, summary.providerProblemId);
    await this.options.cache.saveDetail(problem);
    return problem;
  }

  private async revalidate(configuration: BoardConfiguration): Promise<RefreshResult> {
    const { cache } = this.options;
    const catalog = this.options.catalogs(configuration.manufacturer);
    const configKey = makeConfigKey(configuration);
    const state = await cache.getSyncState(configKey);
    if (!state) {
      try {
        const first = await this.fetchNextPage(configuration, catalog, null);
        return { ok: true, fetched: first.fetched, skipped: first.skipped };
      } catch (error) {
        return { ok: false, code: codeOf(error) };
      }
    }
    const started = this.options.clock.now().getTime();
    try {
      const result = await catalog.listProblems(configuration, { pageSize: this.pageSize });
      await cache.upsertSummaries(configKey, result.items);
      await cache.saveSyncState({ ...state, lastSuccessAt: this.options.clock.now().toISOString() });
      this.report(configuration, result.items.length, result.skipped, null, started);
      return { ok: true, fetched: result.items.length, skipped: result.skipped };
    } catch (error) {
      this.report(configuration, 0, 0, codeOf(error), started);
      return { ok: false, code: codeOf(error) };
    }
  }

  private async fetchNextPage(
    configuration: BoardConfiguration,
    catalog: BoardCatalog,
    state: CatalogSyncState | null,
  ): Promise<{ state: CatalogSyncState; fetched: number; skipped: number }> {
    const { cache, clock } = this.options;
    const configKey = makeConfigKey(configuration);
    const started = clock.now().getTime();
    try {
      const result = await catalog.listProblems(
        configuration,
        { pageSize: this.pageSize },
        state?.nextCursor ?? undefined,
      );
      await cache.upsertSummaries(configKey, result.items);
      const next: CatalogSyncState = {
        configKey,
        lastSuccessAt: clock.now().toISOString(),
        nextCursor: result.nextCursor,
        exhausted: result.nextCursor === null,
        revisionToken: state?.revisionToken ?? null,
      };
      await cache.saveSyncState(next);
      this.report(configuration, result.items.length, result.skipped, null, started);
      return { state: next, fetched: result.items.length, skipped: result.skipped };
    } catch (error) {
      this.report(configuration, 0, 0, codeOf(error), started);
      throw error;
    }
  }

  private report(
    configuration: BoardConfiguration,
    fetched: number,
    skipped: number,
    code: string | null,
    started: number,
  ): void {
    this.options.diagnostics.emit({
      name: 'catalog.sync_result',
      manufacturer: configuration.manufacturer,
      fetched,
      skipped,
      code,
      ms: this.options.clock.now().getTime() - started,
    });
  }
}

function codeOf(error: unknown): CatalogErrorCode {
  return error instanceof CatalogError ? error.code : 'provider_rejected';
}
