import type {
  BoardConfiguration,
  BoardModel,
  Manufacturer,
  Problem,
  ProblemSummary,
} from '@boardclimb/domain';
import type { BoardCatalog } from './BoardCatalog';
import { CatalogError } from './CatalogError';
import type { CatalogCapabilities } from './CatalogCapabilities';
import type { PaginatedResult } from './PaginatedResult';
import type { ProblemQuery } from './ProblemQuery';
import type { ProviderSource } from './ProviderSource';
import { toProblem, toProblemSummary } from './mapProviderRecord';

/**
 * The BoardCatalog every manufacturer adapter is built from. It decides what a source's answer means:
 * unknown failures become a coded CatalogError, malformed records are dropped and counted, and nothing
 * provider-shaped leaves this class (CODE.5).
 */
export class SourceBackedCatalog implements BoardCatalog {
  constructor(
    readonly manufacturer: Manufacturer,
    private readonly source: ProviderSource,
  ) {}

  capabilities(): CatalogCapabilities {
    return this.source.capabilities;
  }

  private async guard<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      if (error instanceof CatalogError) throw error;
      throw new CatalogError('provider_rejected', 'The catalog provider could not be read.');
    }
  }

  listBoards(): Promise<BoardModel[]> {
    return this.guard(() => this.source.fetchBoards());
  }

  async getBoard(boardId: string): Promise<BoardModel> {
    const board = (await this.listBoards()).find((candidate) => candidate.id === boardId);
    if (!board) throw new CatalogError('not_found', 'That board is not in the catalog.');
    return board;
  }

  getConfigurations(boardId: string): Promise<BoardConfiguration[]> {
    return this.guard(() => this.source.fetchConfigurations(boardId));
  }

  async listProblems(
    configuration: BoardConfiguration,
    query: ProblemQuery,
    cursor?: string,
  ): Promise<PaginatedResult<ProblemSummary>> {
    const page = await this.guard(() =>
      this.source.fetchProblemPage(configuration.id, cursor ?? null, query.pageSize),
    );
    const items: ProblemSummary[] = [];
    let skipped = 0;
    for (const record of page.records) {
      const summary = toProblemSummary(configuration, record);
      if (summary) items.push(summary);
      else skipped += 1;
    }
    return { items, nextCursor: page.nextCursor, skipped };
  }

  async getProblem(configuration: BoardConfiguration, providerProblemId: string): Promise<Problem> {
    const record = await this.guard(() => this.source.fetchProblem(configuration.id, providerProblemId));
    const problem = toProblem(configuration, record);
    if (!problem)
      throw new CatalogError('schema_mismatch', 'The provider sent a problem this app cannot read.');
    return problem;
  }
}
