import type { BoardConfiguration, BoardGeometry, BoardModel, ProblemFilters } from '@boardclimb/domain';
import type { CatalogCapabilities } from '../catalog/CatalogCapabilities';
import type { ProviderPage } from './ProviderPage';
import type { ProviderProblemRecord } from './ProviderProblemRecord';

/**
 * Where one provider's data comes from (CODE.8). The vendor-facing implementation (HTTP, authentication,
 * wire format, pagination style) is a spike per ADR-0002 and does not exist yet; only sample and
 * unverified sources do. Sources throw CatalogError.
 */
export interface ProviderSource {
  readonly capabilities: CatalogCapabilities;
  fetchBoardGeometry?(configurationId: string): Promise<BoardGeometry | null>;
  fetchBoards(): Promise<BoardModel[]>;
  fetchConfigurations(boardId: string): Promise<BoardConfiguration[]>;
  /** A bulk-only provider returns everything in one page with a null cursor. */
  fetchProblemPage(configurationId: string, cursor: string | null, pageSize: number): Promise<ProviderPage>;
  fetchProblem(configurationId: string, providerProblemId: string): Promise<ProviderProblemRecord>;
  /**
   * Only for sources that hold their whole catalog on the device: one page of the problems that pass the
   * filters, most climbed first, with an opaque cursor. Lets browsing skip copying the catalog page by page.
   */
  queryProblemPage?(
    configurationId: string,
    filters: ProblemFilters,
    cursor: string | null,
    pageSize: number,
  ): Promise<ProviderPage>;
}
