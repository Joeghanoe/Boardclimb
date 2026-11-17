import { describe, expect, it } from 'bun:test';
import { defaultProblemFilters, makeGrade, makeProblemKey } from '@boardclimb/domain';
import type { Problem, ProblemFilters, ProblemSummary } from '@boardclimb/domain';
import type { ProblemCache } from '../ProblemCache';

const CONFIG = 'kilter/cfg';

function summary(
  id: string,
  label: string | null,
  rating: number | null,
  name = `Problem ${id}`,
): ProblemSummary {
  return {
    key: makeProblemKey('kilter', 'cfg', id),
    manufacturer: 'kilter',
    configurationId: 'cfg',
    providerProblemId: id,
    name,
    grade: makeGrade('font', label ?? 'unknown grade'),
    rating,
  };
}

/** Shared vectors: the reference semantics of matchesProblemFilters, run against every cache implementation. */
export const FILTER_VECTORS: { filters: ProblemFilters; ratings: boolean; expected: string[] }[] = [
  { filters: defaultProblemFilters, ratings: true, expected: ['a', 'b', 'c', 'd', 'e', 'f'] },
  { filters: { ...defaultProblemFilters, minDifficulty: 7 }, ratings: true, expected: ['b', 'c', 'd', 'e'] },
  { filters: { ...defaultProblemFilters, maxDifficulty: 7 }, ratings: true, expected: ['a', 'b'] },
  {
    filters: { minDifficulty: 7, maxDifficulty: 9, minStars: 0 },
    ratings: true,
    expected: ['b', 'c'],
  },
  { filters: { ...defaultProblemFilters, minStars: 3 }, ratings: true, expected: ['a', 'c', 'd', 'f'] },
  {
    filters: { ...defaultProblemFilters, minStars: 3 },
    ratings: false,
    expected: ['a', 'b', 'c', 'd', 'e', 'f'],
  },
  { filters: { minDifficulty: 7, maxDifficulty: null, minStars: 4 }, ratings: true, expected: ['c'] },
];

export function seedCache(cache: ProblemCache): Promise<void> {
  // a: 6A (5), b: 6B (7), c: 6C (9), d: 7A (11), e: 7A+ (12) unrated, f: unknown grade
  return cache.upsertSummaries(CONFIG, [
    summary('a', '6A', 3),
    summary('b', '6B', 2),
    summary('c', '6C', 4.5),
    summary('d', '7A', 3.5),
    summary('e', '7A+', null),
    summary('f', null, 5),
  ]);
}

function detailOf(base: ProblemSummary): Problem {
  return {
    ...base,
    holds: [
      { holdId: 'h1', role: 'start' },
      { holdId: 'h2', role: 'finish' },
    ],
  };
}

/**
 * The shared ProblemCache contract (ADR-0003). The in-memory cache and the SQLite cache both run it, so the
 * SQL filter and the domain reference function cannot drift apart (CODE.7).
 */
export function runProblemCacheContract(
  name: string,
  create: () => ProblemCache | Promise<ProblemCache>,
): void {
  describe(`${name} satisfies the ProblemCache contract`, () => {
    it.each(FILTER_VECTORS.map((vector, index) => [index, vector] as const))(
      'filters like the domain reference: vector %i',
      async (_index, vector) => {
        const cache = await create();
        await seedCache(cache);
        const page = await cache.listProblems({
          configKey: CONFIG,
          filters: vector.filters,
          providerHasRatings: vector.ratings,
          after: null,
          limit: 100,
        });
        expect(page.items.map((item) => item.providerProblemId)).toEqual(vector.expected);
      },
    );

    it('keeps provider order and pages with a cursor without gaps or repeats', async () => {
      const cache = await create();
      await seedCache(cache);
      const seen: string[] = [];
      let after: number | null = null;
      for (let guard = 0; guard < 10; guard += 1) {
        const page = await cache.listProblems({
          configKey: CONFIG,
          filters: defaultProblemFilters,
          providerHasRatings: true,
          after,
          limit: 4,
        });
        if (page.items.length === 0) break;
        seen.push(...page.items.map((item) => item.providerProblemId));
        after = page.last;
      }
      expect(seen).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
    });

    it('updates a problem in place on upsert and never loses its position or others (FR-018)', async () => {
      const cache = await create();
      await seedCache(cache);
      await cache.upsertSummaries(CONFIG, [summary('b', '6B', 4, 'Renamed'), summary('g', '6A', 1)]);
      const page = await cache.listProblems({
        configKey: CONFIG,
        filters: defaultProblemFilters,
        providerHasRatings: true,
        after: null,
        limit: 100,
      });
      expect(page.items.map((item) => item.providerProblemId)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
      expect(page.items[1]).toMatchObject({ name: 'Renamed', rating: 4 });
    });

    it('saves a large provider page whole, in order, and updates repeats without duplicating them', async () => {
      const cache = await create();
      const page = Array.from({ length: 250 }, (_, index) => summary(`p${index}`, '6A', 3));
      await cache.upsertSummaries(CONFIG, page);
      await cache.upsertSummaries(CONFIG, [summary('p10', '7A', 4.5), summary('p10', '7B', 4)]);
      const listed = await cache.listProblems({
        configKey: CONFIG,
        filters: defaultProblemFilters,
        providerHasRatings: true,
        after: null,
        limit: 500,
      });
      expect(listed.items.map((item) => item.providerProblemId)).toEqual(
        page.map((item) => item.providerProblemId),
      );
      expect(listed.items[10]).toMatchObject({ grade: { label: '7B' }, rating: 4 });
    });

    it('stores a missing rating as not rated, not zero', async () => {
      const cache = await create();
      await seedCache(cache);
      expect((await cache.getSummary(makeProblemKey('kilter', 'cfg', 'e')))?.rating).toBeNull();
    });

    it('keeps opened problem details so they work offline, and survives a later summary refresh', async () => {
      const cache = await create();
      await seedCache(cache);
      const key = makeProblemKey('kilter', 'cfg', 'c');
      const base = await cache.getSummary(key);
      if (!base) throw new Error('seed');
      await cache.saveDetail(detailOf(base));
      await cache.upsertSummaries(CONFIG, [{ ...base, rating: 1 }]);
      const detail = await cache.getDetail(key);
      expect(detail?.holds).toHaveLength(2);
      expect((await cache.getSummary(key))?.rating).toBe(1);
      expect(await cache.getDetail(makeProblemKey('kilter', 'cfg', 'a'))).toBeNull();
    });

    it('keeps a problem opened before it was listed, in its own configuration', async () => {
      const cache = await create();
      const unseen = detailOf(summary('z', '6A', 2));
      await cache.saveDetail(unseen);
      expect(await cache.getDetail(unseen.key)).toEqual(unseen);
      const page = await cache.listProblems({
        configKey: CONFIG,
        filters: defaultProblemFilters,
        providerHasRatings: true,
        after: null,
        limit: 10,
      });
      expect(page.items.map((item) => item.providerProblemId)).toEqual(['z']);
    });

    it('keeps configurations apart', async () => {
      const cache = await create();
      await seedCache(cache);
      const page = await cache.listProblems({
        configKey: 'kilter/other',
        filters: defaultProblemFilters,
        providerHasRatings: true,
        after: null,
        limit: 100,
      });
      expect(page.items).toEqual([]);
      expect(page.last).toBeNull();
    });

    it('round-trips sync state', async () => {
      const cache = await create();
      expect(await cache.getSyncState(CONFIG)).toBeNull();
      const state = {
        configKey: CONFIG,
        lastSuccessAt: '2026-11-16T10:00:00.000Z',
        nextCursor: '50',
        exhausted: false,
        revisionToken: null,
      };
      await cache.saveSyncState(state);
      expect(await cache.getSyncState(CONFIG)).toEqual(state);
      await cache.saveSyncState({ ...state, nextCursor: null, exhausted: true });
      expect((await cache.getSyncState(CONFIG))?.exhausted).toBe(true);
    });
  });
}
