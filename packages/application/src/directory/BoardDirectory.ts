import { CatalogError } from '@boardclimb/catalog-core';
import { MANUFACTURERS } from '@boardclimb/domain';
import type { CatalogLookup } from '../browse/CatalogLookup';
import type { BoardWithConfigurations } from './BoardWithConfigurations';
import type { DirectoryEntry } from './DirectoryEntry';

/** Lists every manufacturer's boards and layouts for the board-first route (FR-001, FR-004). */
export class BoardDirectory {
  constructor(private readonly catalogs: CatalogLookup) {}

  list(): Promise<DirectoryEntry[]> {
    return Promise.all(MANUFACTURERS.map((manufacturer) => this.listOne(manufacturer)));
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
