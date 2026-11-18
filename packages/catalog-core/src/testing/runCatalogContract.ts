import { describe, expect, it } from 'bun:test';
import { parseProblemKey } from '@boardclimb/domain';
import type { BoardConfiguration } from '@boardclimb/domain';
import type { BoardCatalog } from '../catalog/BoardCatalog';
import { CatalogError } from '../catalog/CatalogError';

export interface CatalogContractSubject {
  catalog: BoardCatalog;
  /** A configuration the catalog serves problems for. */
  configuration: BoardConfiguration;
  /** How many problems the fixture holds for that configuration. */
  expectedProblemCount: number;
}

/**
 * The shared catalog contract (FR-005, AC-015). Every manufacturer adapter runs this suite against its own
 * fixture. Fixtures written by hand prove the contract, not the vendor (T.6): see the design's Known limits.
 */
export function runCatalogContract(name: string, create: () => CatalogContractSubject): void {
  describe(`${name} satisfies the BoardCatalog contract (FR-005)`, () => {
    it('lists boards and configurations that belong to its manufacturer', async () => {
      const { catalog, configuration } = create();
      const boards = await catalog.listBoards();
      expect(boards.length).toBeGreaterThan(0);
      for (const board of boards) expect(board.manufacturer).toBe(catalog.manufacturer);
      expect((await catalog.getBoard(configuration.boardId)).id).toBe(configuration.boardId);
      const configurations = await catalog.getConfigurations(configuration.boardId);
      expect(configurations.map((candidate) => candidate.id)).toContain(configuration.id);
    });

    it('reports not_found for an unknown board', async () => {
      const { catalog } = create();
      await expect(catalog.getBoard('no-such-board')).rejects.toMatchObject({ code: 'not_found' });
    });

    it('pages through every problem once, by cursor, with stable keys (AC-016)', async () => {
      const { catalog, configuration, expectedProblemCount } = create();
      const seen = new Set<string>();
      let cursor: string | undefined;
      let pages = 0;
      do {
        const page = await catalog.listProblems(configuration, { pageSize: 7 }, cursor);
        pages += 1;
        for (const item of page.items) {
          expect(seen.has(item.key)).toBe(false);
          seen.add(item.key);
          expect(parseProblemKey(item.key)).toEqual({
            manufacturer: catalog.manufacturer,
            configurationId: configuration.id,
            providerProblemId: item.providerProblemId,
          });
        }
        cursor = page.nextCursor ?? undefined;
        expect(pages).toBeLessThan(1000);
      } while (cursor !== undefined);

      expect(seen.size).toBe(expectedProblemCount);
      if (catalog.capabilities().pagination === 'none') expect(pages).toBe(1);
      else expect(pages).toBeGreaterThan(1);
    });

    it('keeps the published grade label and never turns a missing rating into zero', async () => {
      const { catalog, configuration } = create();
      const page = await catalog.listProblems(configuration, { pageSize: 50 });
      for (const item of page.items) {
        expect(item.grade.label.length).toBeGreaterThan(0);
        if (item.rating !== null) {
          expect(item.rating).toBeGreaterThanOrEqual(0);
          expect(item.rating).toBeLessThanOrEqual(5);
        }
        if (!catalog.capabilities().ratings) expect(item.rating).toBeNull();
      }
    });

    it('returns a problem with its holds and reports not_found for an unknown one', async () => {
      const { catalog, configuration } = create();
      const first = (await catalog.listProblems(configuration, { pageSize: 1 })).items[0];
      expect(first).toBeDefined();
      const problem = await catalog.getProblem(configuration, first?.providerProblemId ?? '');
      expect(problem.key === first?.key).toBe(true);
      expect(problem.holds.length).toBeGreaterThan(0);
      await expect(catalog.getProblem(configuration, 'no-such-problem')).rejects.toBeInstanceOf(CatalogError);
    });

    it('declares capabilities honestly', () => {
      const { catalog } = create();
      const capabilities = catalog.capabilities();
      expect(['cursor', 'page', 'none']).toContain(capabilities.pagination);
      expect(typeof capabilities.ratings).toBe('boolean');
    });
  });
}
