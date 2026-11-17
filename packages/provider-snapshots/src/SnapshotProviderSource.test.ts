import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { SourceBackedCatalog } from '@boardclimb/catalog-core';
import type { BoardConfiguration, Manufacturer } from '@boardclimb/domain';
import { SnapshotProviderSource } from './SnapshotProviderSource';
import type { SnapshotReader } from './SnapshotReader';
import { parseSnapshotArtifact } from './parseSnapshotArtifact';

function subject(manufacturer: Manufacturer) {
  const db = new Database(join(import.meta.dir, '../fixtures', `${manufacturer}.db`), { readonly: true });
  const reader: SnapshotReader = {
    open: async () => ({
      all: async <T>(sql: string, params: readonly (string | number | null)[]) =>
        db.query(sql).all(...params) as T[],
    }),
  };
  const source = new SnapshotProviderSource(manufacturer, reader);
  const configuration: BoardConfiguration = {
    manufacturer,
    boardId: manufacturer === 'tension' ? '4' : '1',
    id: manufacturer === 'kilter' ? 'bs-1-7-40' : manufacturer === 'tension' ? 'bs-9-1-40' : 'bs-2-1-40',
    name: 'Recorded layout',
    angleDegrees: 40,
  };
  return { db, source, configuration, catalog: new SourceBackedCatalog(manufacturer, source) };
}

describe('recorded BoardSesh catalogs (FR-001, FR-005, FR-006)', () => {
  it.each(['kilter', 'moonboard', 'tension'] as const)(
    '%s pages recorded rows without duplicates and maps every hold',
    async (manufacturer) => {
      const { db, catalog, configuration } = subject(manufacturer);
      try {
        const models = await catalog.listBoards();
        expect(models.some((m) => m.id === configuration.boardId)).toBe(true);
        expect(
          (await catalog.getConfigurations(configuration.boardId)).some((c) => c.id === configuration.id),
        ).toBe(true);
        const keys = new Set<string>();
        let cursor: string | undefined;
        do {
          const page = await catalog.listProblems(configuration, { pageSize: 7 }, cursor);
          expect(page.skipped).toBe(0);
          for (const item of page.items) {
            expect(keys.has(item.key)).toBe(false);
            keys.add(item.key);
            const problem = await catalog.getProblem(configuration, item.providerProblemId);
            expect(problem.holds.length).toBeGreaterThan(0);
            expect(problem.setter).toBeTruthy();
            expect(problem.holds.every((h) => Number.isFinite(h.x) && Number.isFinite(h.y))).toBe(true);
            if (manufacturer !== 'moonboard')
              expect(
                problem.holds.every(
                  (h) => h.ledPosition !== undefined && /^[a-f0-9]{6}$/i.test(h.ledColor ?? ''),
                ),
              ).toBe(true);
          }
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
        expect(keys.size).toBeGreaterThan(7);
      } finally {
        db.close();
      }
    },
  );

  it('FR-007 keeps angle-specific null ratings rather than substituting another angle', async () => {
    const { db, catalog, configuration } = subject('kilter');
    try {
      const page = await catalog.listProblems(
        { ...configuration, id: 'bs-1-7-70', angleDegrees: 70 },
        { pageSize: 50 },
      );
      expect(page.items.some((p) => p.rating === null)).toBe(true);
    } finally {
      db.close();
    }
  });

  it('FR-005 refuses unknown configuration ids and out-of-range pagination', async () => {
    const { db, source } = subject('tension');
    try {
      await expect(source.fetchProblemPage('bs-9-999-40', null, 50)).rejects.toMatchObject({
        code: 'not_found',
      });
      await expect(source.fetchProblemPage('bs-9-1-40', null, 0)).rejects.toMatchObject({
        code: 'schema_mismatch',
      });
      await expect(source.fetchProblem('bs-9-1-40', 'missing')).rejects.toMatchObject({ code: 'not_found' });
    } finally {
      db.close();
    }
  });

  it('rejects a changed manifest, stale privacy format, or an off-origin download', () => {
    const entry = {
      boardType: 'kilter',
      layoutId: 1,
      privacyVersion: 1,
      url: 'https://snapshots.boardsesh.com/board-snapshots/v1-gzip/kilter/1/catalog.db',
      bytes: 100,
      uncompressedBytes: 1000,
      builtAt: '2026-11-17T07:00:00Z',
    };
    expect(parseSnapshotArtifact({ formatVersion: 2, entries: [entry] }, 'kilter', 1).bytes).toBe(100);
    for (const invalid of [
      { ...entry, privacyVersion: 0 },
      { ...entry, url: 'https://example.com/file.db' },
      { ...entry, uncompressedBytes: 0 },
      { ...entry, boardType: 'moonboard' },
    ]) {
      expect(() => parseSnapshotArtifact({ formatVersion: 2, entries: [invalid] }, 'kilter', 1)).toThrow();
    }
  });
});
