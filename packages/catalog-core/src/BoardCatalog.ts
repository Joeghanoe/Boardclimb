import type {
  BoardConfiguration,
  BoardModel,
  Manufacturer,
  Problem,
  ProblemSummary,
} from '@boardclimb/domain';
import type { CatalogCapabilities } from './CatalogCapabilities';
import type { PaginatedResult } from './PaginatedResult';
import type { ProblemQuery } from './ProblemQuery';

/** The one app-facing catalog contract (FR-005). Provider details never cross it. Failures throw CatalogError. */
export interface BoardCatalog {
  readonly manufacturer: Manufacturer;
  listBoards(): Promise<BoardModel[]>;
  getBoard(boardId: string): Promise<BoardModel>;
  getConfigurations(boardId: string): Promise<BoardConfiguration[]>;
  listProblems(
    configuration: BoardConfiguration,
    query: ProblemQuery,
    cursor?: string,
  ): Promise<PaginatedResult<ProblemSummary>>;
  getProblem(configuration: BoardConfiguration, providerProblemId: string): Promise<Problem>;
  capabilities(): CatalogCapabilities;
}
