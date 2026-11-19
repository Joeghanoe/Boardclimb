import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { SourceBackedCatalog } from '@boardclimb/catalog-core';
import type { BoardConfiguration } from '@boardclimb/domain';
import { SnapshotProviderSource } from '@boardclimb/provider-snapshots';
import type { SnapshotReader } from '@boardclimb/provider-snapshots';
import pinned from '../data/tension-mirrors.json';
import { mirrorHolds } from '../src/source/mirrorHolds';

describe('Tension flip (pinned mirror placements)', () => {
  it('pins a mirror map where flipping twice returns every hold to where it was', () => {
    const mirrors: Record<string, number> = pinned.mirrors;
    for (const [placement, mirror] of Object.entries(mirrors))
      expect(mirrors[String(mirror)]).toBe(Number(placement));
  });

  it('moves each hold to its mirror placement, keeping role and colour, and refuses to guess a missing one', () => {
    const placements = new Map([
      [1, { x: -64, y: 4, position: 10 }],
      [2, { x: 64, y: 4, position: 20 }],
    ]);
    const hold = { holdId: '1', role: 'start', x: -64, y: 4, ledPosition: 10, ledColor: '00ff00' };
    expect(mirrorHolds([hold], placements)).toEqual([
      { holdId: '2', role: 'start', x: 64, y: 4, ledPosition: 20, ledColor: '00ff00' },
    ]);
    expect(mirrorHolds([hold], new Map([[1, placements.get(1)!]]))).toBeUndefined();
  });

  it('gives recorded Tension problems a flipped version mirrored across the board', async () => {
    const db = new Database(join(import.meta.dir, '../fixtures/tension.db'), { readonly: true });
    const reader: SnapshotReader = {
      open: async () => ({
        all: async <T>(sql: string, params: readonly (string | number | null)[]) =>
          db.query(sql).all(...params) as T[],
      }),
    };
    const configuration: BoardConfiguration = {
      manufacturer: 'tension',
      boardId: '4',
      id: 'bs-9-1-40',
      name: 'Recorded layout',
      angleDegrees: 40,
    };
    const catalog = new SourceBackedCatalog('tension', new SnapshotProviderSource('tension', reader));
    try {
      const page = await catalog.listProblems(configuration, { pageSize: 5 });
      for (const item of page.items) {
        const problem = await catalog.getProblem(configuration, item.providerProblemId);
        const flipped = problem.mirroredHolds;
        expect(flipped?.length).toBe(problem.holds.length);
        const bounds = problem.bounds!;
        const centre = (bounds.left + bounds.right) / 2;
        problem.holds.forEach((hold, index) => {
          const twin = flipped![index]!;
          expect(twin.role).toBe(hold.role);
          expect(twin.y).toBe(hold.y);
          // The same distance from the board's centre line, on the other side.
          expect(twin.x! - centre).toBe(centre - hold.x!);
          expect(Number.isInteger(twin.ledPosition)).toBe(true);
        });
      }
    } finally {
      db.close();
    }
  });
});
