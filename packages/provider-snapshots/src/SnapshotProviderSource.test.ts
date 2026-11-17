import { describe, expect, it } from 'bun:test';
import { Database } from 'bun:sqlite';
import { join } from 'node:path';
import { SourceBackedCatalog } from '@boardclimb/catalog-core';
import { defaultProblemFilters, makeGrade, matchesProblemFilters } from '@boardclimb/domain';
import type { BoardConfiguration, Manufacturer, ProblemSummary } from '@boardclimb/domain';
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

  it('FR-005: only boards with a layout to choose are offered', async () => {
    for (const manufacturer of ['kilter', 'moonboard', 'tension'] as const) {
      const source = new SnapshotProviderSource(manufacturer, {
        open: async () => ({ all: async () => [] }),
      });
      const boards = await source.fetchBoards();
      expect(boards.length).toBeGreaterThan(0);
      for (const board of boards)
        expect((await source.fetchConfigurations(board.id)).length, board.name).toBeGreaterThan(0);
    }
    const kilter = await new SnapshotProviderSource('kilter', {
      open: async () => ({ all: async () => [] }),
    }).fetchBoards();
    expect(kilter.map((board) => board.name)).not.toContain('JUUL');
    expect(kilter.map((board) => board.name)).not.toContain('Tycho');
  });

  it('FR-005 accepts exactly the listed configuration ids for every manufacturer', async () => {
    for (const manufacturer of ['kilter', 'moonboard', 'tension'] as const) {
      const source = new SnapshotProviderSource(manufacturer, {
        open: async () => ({ all: async () => [] }),
      });
      const listed = new Set<string>();
      for (const model of await source.fetchBoards())
        for (const configuration of await source.fetchConfigurations(model.id)) {
          expect(configuration.boardId).toBe(model.id);
          listed.add(configuration.id);
        }
      expect(listed.size).toBeGreaterThan(0);
      for (const id of listed) expect((await source.fetchProblemPage(id, null, 1)).records).toEqual([]);
      const unlisted = [...listed].map((id) => id.replace(/-(\d+)$/, '-1')).filter((id) => !listed.has(id));
      expect(unlisted.length).toBeGreaterThan(0);
      for (const id of [...unlisted, 'bs-999-1-40', 'bs-1-999-40', '1-7-40'])
        await expect(source.fetchProblemPage(id, null, 1)).rejects.toMatchObject({ code: 'not_found' });
    }
  });

  it('hands out configurations a caller may change without changing the catalog', async () => {
    const source = new SnapshotProviderSource('kilter', { open: async () => ({ all: async () => [] }) });
    const first = await source.fetchConfigurations('1');
    first[0]!.name = 'changed';
    first.length = 0;
    const again = await source.fetchConfigurations('1');
    expect(again.length).toBeGreaterThan(0);
    expect(again[0]!.name).not.toBe('changed');
    expect(await source.fetchConfigurations('999')).toEqual([]);
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

it.each(['kilter', 'moonboard', 'tension'] as const)(
  'FR-005/UI-1: %s exposes a complete offline board with traced silhouettes independently of route downloads',
  async (manufacturer) => {
    const { db, source, configuration } = subject(manufacturer);
    db.close();
    const geometry = await source.fetchBoardGeometry(configuration.id);
    expect(geometry.holds.length).toBeGreaterThan(40);
    expect(new Set(geometry.holds.map((hold) => hold.holdId)).size).toBe(geometry.holds.length);
    expect(geometry.holds.filter((hold) => hold.outline).length).toBeGreaterThan(40);
    for (const hold of geometry.holds) {
      expect(hold.x).toBeGreaterThan(geometry.bounds.left);
      expect(hold.x).toBeLessThan(geometry.bounds.right);
      expect(hold.y).toBeGreaterThan(geometry.bounds.bottom);
      expect(hold.y).toBeLessThan(geometry.bounds.top);
      expect(hold.radius).toBeGreaterThan(0);
      if (hold.outline) {
        expect(hold.outline.length % 2).toBe(0);
        expect(hold.outline.length).toBeGreaterThanOrEqual(6);
        expect(hold.outline.every(Number.isFinite)).toBe(true);
      }
    }
  },
);

describe('FR-006/FR-007: filtered browsing straight from the downloaded catalog', () => {
  async function everything(filters = defaultProblemFilters) {
    const { catalog, configuration } = subject('kilter');
    const items: ProblemSummary[] = [];
    let cursor: string | undefined;
    for (let guard = 0; guard < 100; guard += 1) {
      const page = await catalog.queryProblems!(configuration, filters, { pageSize: 4 }, cursor);
      items.push(...page.items);
      if (page.nextCursor === null) break;
      cursor = page.nextCursor;
    }
    const all: ProblemSummary[] = [];
    let listCursor: string | undefined;
    for (let guard = 0; guard < 100; guard += 1) {
      const page = await catalog.listProblems(configuration, { pageSize: 50 }, listCursor);
      all.push(...page.items);
      if (page.nextCursor === null) break;
      listCursor = page.nextCursor;
    }
    return { items, all };
  }

  it('returns exactly the problems the filter rule allows, each once, graded ones before unrepeated ones', async () => {
    const { items, all } = await everything();
    expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
    expect(items.map((item) => item.key).sort()).toEqual(all.map((item) => item.key).sort());
    const unrepeated = (item: ProblemSummary) => item.grade.label === 'Not graded';
    const firstUnrepeated = items.findIndex(unrepeated);
    expect(firstUnrepeated).toBeGreaterThan(0);
    expect(items.slice(firstUnrepeated).every(unrepeated)).toBe(true);
  });

  it('applies a grade range and a minimum rating in the query, matching the domain rule exactly', async () => {
    const filters = {
      minDifficulty: makeGrade('font', '6A').difficulty,
      maxDifficulty: makeGrade('font', '7A').difficulty,
      minStars: 2,
    };
    const { items, all } = await everything(filters);
    const expected = all.filter((item) => matchesProblemFilters(item, filters, true));
    expect(expected.length).toBeGreaterThan(0);
    expect(items.map((item) => item.key).sort()).toEqual(expected.map((item) => item.key).sort());
  });

  it('refuses a list position it did not issue', async () => {
    const { catalog, configuration } = subject('kilter');
    await expect(
      catalog.queryProblems!(configuration, defaultProblemFilters, { pageSize: 4 }, 'nonsense'),
    ).rejects.toMatchObject({ code: 'schema_mismatch' });
  });
});
