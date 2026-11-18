import type { BoardConfiguration, BoardGeometry, BoardModel } from '@boardclimb/domain';
import { CatalogError } from '../catalog/CatalogError';
import type { CatalogCapabilities } from '../catalog/CatalogCapabilities';
import type { ProviderPage } from './ProviderPage';
import type { ProviderProblemRecord } from './ProviderProblemRecord';
import type { ProviderSource } from './ProviderSource';

export interface InMemoryProviderData {
  boards: BoardModel[];
  configurations: BoardConfiguration[];
  /** Problems per configuration id, in provider order. */
  problems: Record<string, ProviderProblemRecord[]>;
}

/**
 * Serves sample or test data from memory with offset cursors. It is a stand-in, never a vendor: the app
 * labels anything it serves as sample data. `failNext` injects a provider failure for failure tests.
 */
export class InMemoryProviderSource implements ProviderSource {
  failNext: CatalogError | null = null;
  fetchCount = 0;

  constructor(
    private readonly data: InMemoryProviderData,
    readonly capabilities: CatalogCapabilities,
  ) {}

  private enter(): void {
    this.fetchCount += 1;
    if (this.failNext) {
      const error = this.failNext;
      this.failNext = null;
      throw error;
    }
  }

  async fetchBoardGeometry(configurationId: string): Promise<BoardGeometry | null> {
    const bounds = this.data.problems[configurationId]?.[0]?.bounds;
    if (!bounds) return null;
    const holds = [];
    for (let y = 1; y < bounds.top; y += 1)
      for (let x = 1; x < bounds.right; x += 1) holds.push({ holdId: `sample-${x}-${y}`, x, y, radius: 0.4 });
    for (const record of this.data.problems[configurationId] ?? [])
      for (const hold of record.holds) {
        if (hold.x !== undefined && hold.y !== undefined && !holds.some((h) => h.holdId === hold.holdId))
          holds.push({ holdId: hold.holdId, x: hold.x, y: hold.y, radius: 0.4 });
      }
    return { bounds, holds };
  }

  fetchBoards(): Promise<BoardModel[]> {
    this.enter();
    return Promise.resolve(this.data.boards);
  }

  fetchConfigurations(boardId: string): Promise<BoardConfiguration[]> {
    this.enter();
    return Promise.resolve(
      this.data.configurations.filter((configuration) => configuration.boardId === boardId),
    );
  }

  fetchProblemPage(configurationId: string, cursor: string | null, pageSize: number): Promise<ProviderPage> {
    this.enter();
    const all = this.data.problems[configurationId] ?? [];
    if (this.capabilities.pagination === 'none') {
      return Promise.resolve({ records: all.map(summaryOf), nextCursor: null });
    }
    const start = cursor === null ? 0 : Number(cursor);
    const end = Math.min(start + pageSize, all.length);
    return Promise.resolve({
      records: all.slice(start, end).map(summaryOf),
      nextCursor: end < all.length ? String(end) : null,
    });
  }

  fetchProblem(configurationId: string, providerProblemId: string): Promise<ProviderProblemRecord> {
    this.enter();
    const record = (this.data.problems[configurationId] ?? []).find(
      (candidate) => candidate.id === providerProblemId,
    );
    if (!record) return Promise.reject(new CatalogError('not_found', 'That problem is not in the catalog.'));
    return Promise.resolve(record);
  }
}

function summaryOf({ id, name, gradeSystem, gradeLabel, rating }: ProviderProblemRecord) {
  return { id, name, gradeSystem, gradeLabel, rating };
}
