import type {
  BoardConfiguration,
  BoardGeometry,
  BoardModel,
  Manufacturer,
  Problem,
  ProblemFilters,
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
  getBoardGeometry(configuration: BoardConfiguration): Promise<BoardGeometry | null>;
  capabilities(): CatalogCapabilities;
  /**
   * Present only when the catalog can filter on the device: one page of problems that pass `filters`, most
   * climbed first. Every item satisfies matchesProblemFilters.
   */
  readonly queryProblems?:
    | ((
        configuration: BoardConfiguration,
        filters: ProblemFilters,
        query: ProblemQuery,
        cursor?: string,
      ) => Promise<PaginatedResult<ProblemSummary>>)
    | undefined;
}
