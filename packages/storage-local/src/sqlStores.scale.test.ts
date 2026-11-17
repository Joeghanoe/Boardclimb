import { describe, expect, it } from 'bun:test';
import { makeGrade, makeProblemKey } from '@boardclimb/domain';
import type { LogEvent, ProblemSummary } from '@boardclimb/domain';
import { SqlLogStore } from './SqlLogStore';
import { SqlProblemCache } from './SqlProblemCache';
import { openTestDatabase } from './testing';

/** CODE.9: ten times the expected size (20,000 problems, 2,000 events), with repeated grades and ratings. */
describe('storage at ten times the expected size', () => {
  it('caches 200,000 problems and reads a filtered page inside the budget', async () => {
    const db = await openTestDatabase();
    const cache = new SqlProblemCache(db);
    const labels = ['6A', '6B', '6C', '7A', '7B'];
    for (let batch = 0; batch < 20; batch += 1) {
      const items: ProblemSummary[] = Array.from({ length: 10_000 }, (_, offset) => {
        const index = batch * 10_000 + offset;
        return {
          key: makeProblemKey('kilter', 'cfg', `p-${index}`),
          manufacturer: 'kilter',
          configurationId: 'cfg',
          providerProblemId: `p-${index}`,
          name: `Problem ${index}`,
          grade: makeGrade('font', labels[index % labels.length] as string),
          rating: index % 5 === 0 ? null : (index % 6) * 0.9,
        };
      });
      await cache.upsertSummaries('kilter/cfg', items);
    }

    const started = performance.now();
    let after: number | null = null;
    let rows = 0;
    for (let page = 0; page < 5; page += 1) {
      const result = await cache.listProblems({
        configKey: 'kilter/cfg',
        filters: { minDifficulty: 7, maxDifficulty: 9, minStars: 3 },
        providerHasRatings: true,
        after,
        limit: 50,
      });
      rows += result.items.length;
      after = result.last;
    }
    const elapsed = performance.now() - started;

    expect(rows).toBe(250);
    expect(elapsed).toBeLessThan(2000);
  }, 120_000);

  it('reads one problem from 100,000 events and badges 50 problems in one query', async () => {
    const db = await openTestDatabase();
    const store = new SqlLogStore(db);
    for (let batch = 0; batch < 100; batch += 1) {
      const events: LogEvent[] = Array.from({ length: 1000 }, (_, offset) => {
        const index = batch * 1000 + offset;
        return {
          id: `e-${index}`,
          kind: 'attempts',
          problemKey: makeProblemKey('kilter', 'cfg', `p-${index % 500}`),
          delta: 1,
          occurredAt: '2026-11-16T10:00:00.000Z',
          sessionDate: '2026-11-16',
          timeZone: 'UTC',
        };
      });
      await store.append(events);
    }

    const started = performance.now();
    const one = await store.eventsFor(makeProblemKey('kilter', 'cfg', 'p-7'));
    const keys = Array.from({ length: 50 }, (_, index) => makeProblemKey('kilter', 'cfg', `p-${index}`));
    const many = await store.eventsForMany(keys);
    const elapsed = performance.now() - started;

    expect(one).toHaveLength(200);
    expect(many.get(keys[3] as never)).toHaveLength(200);
    expect(elapsed).toBeLessThan(2000);
  }, 120_000);
});
