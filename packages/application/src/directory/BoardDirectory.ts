import { CatalogError } from '@boardclimb/catalog-core';
import { MANUFACTURERS } from '@boardclimb/domain';
import type { ProblemSummary } from '@boardclimb/domain';
import type { BoardSelection } from '../ports/BoardSelection';
import type { CatalogLookup } from '../browse/CatalogLookup';
import type { BoardWithConfigurations } from './BoardWithConfigurations';
import type { DirectoryEntry } from './DirectoryEntry';

/** Lists every manufacturer's boards and layouts for the board-first route (FR-001, FR-004). */
export class BoardDirectory {
  constructor(private readonly catalogs: CatalogLookup) {}

  list(): Promise<DirectoryEntry[]> {
    return Promise.all(MANUFACTURERS.map((manufacturer) => this.listOne(manufacturer)));
  }

  /** Resolve a downloaded problem's saved configuration without requiring a physical board. */
  async selectionFor(problem: ProblemSummary): Promise<BoardSelection> {
    const catalog = this.catalogs(problem.manufacturer);
    for (const board of await catalog.listBoards()) {
      const configuration = (await catalog.getConfigurations(board.id)).find(
        (c) => c.id === problem.configurationId,
      );
      if (configuration) return { boardName: board.name, configuration };
    }
    throw new CatalogError('not_found', 'Choose the problem’s layout again.');
  }

  private async listOne(manufacturer: DirectoryEntry['manufacturer']): Promise<DirectoryEntry> {
    const catalog = this.catalogs(manufacturer);
    try {
      const models = await catalog.listBoards();
      const boards: BoardWithConfigurations[] = await Promise.all(
        models.map(async (board) => ({ board, configurations: await catalog.getConfigurations(board.id) })),
      );
      return { manufacturer, ok: true, boards };
    } catch (error) {
      return {
        manufacturer,
        ok: false,
        code: error instanceof CatalogError ? error.code : 'provider_rejected',
      };
    }
  }
}
