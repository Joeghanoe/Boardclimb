import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { FixedClock, SequentialIds } from '@boardclimb/application/testing';
import { defaultProblemFilters, makeGrade } from '@boardclimb/domain';
import { BunSqliteDatabase } from '@boardclimb/storage-local/testing';
import { firstLayout, openWorld } from './world';

const folders: string[] = [];
afterEach(async () => {
  await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function databaseFile(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'boardclimb-scenario-'));
  folders.push(folder);
  return join(folder, 'boardclimb.db');
}

describe('closing and reopening the app (AC-019, ADR-0001 acceptance 7, 8, 9)', () => {
  it('keeps logs, achievements, session dates, cached problems and filters after a forced termination', async () => {
    const file = await databaseFile();
    const ids = new SequentialIds();
    const clock = new FixedClock(new Date('2026-11-15T18:00:00Z'));
    const first = new BunSqliteDatabase(file);
    const second = new BunSqliteDatabase(file);

    try {
      // first run, on the sample catalog, on a Sunday evening; small pages so most of the catalog stays unfetched
      const before = await openWorld({ database: first, ids, clock, pageSize: 10 });
      const selection = await firstLayout(before, 'kilter');
      await before.container.settings.saveBoardSelection(selection);
      const v3 = makeGrade('v', 'V3').difficulty as number;
      const filters = { minDifficulty: v3, maxDifficulty: null, minStars: 0 };
      await before.container.settings.saveFilters(filters);
      const page = await before.container.browser.browse(selection.configuration, filters, null);
      expect(page.hasMore).toBe(true);
      const problem = page.items[0];
      if (!problem) throw new Error('fixture');
      await before.container.browser.getProblem(selection.configuration, problem);
      await before.container.log.addAttempt(problem.key);
      await before.container.log.addAttempt(problem.key);
      await before.container.log.setTop(problem.key, true);
      first.close();

      // second run, a day later, with the provider unreachable (unverified mode answers provider_unverified)
      clock.set('2026-11-16T09:00:00Z');
      const after = await openWorld({ database: second, ids, clock, mode: 'unverified', pageSize: 10 });

      expect(await after.container.settings.loadFilters()).toEqual(filters);
      expect(await after.container.settings.loadBoardSelection()).toEqual(selection);

      const cached = await after.container.browser.browse(selection.configuration, filters, null);
      expect(cached).toMatchObject({ freshness: 'cached', notice: null });
      expect(cached.items).toEqual(page.items);

      const beyond = await after.container.browser.browse(selection.configuration, filters, cached.next);
      // the rest of what was cached is still served; the page cannot be filled, and says why
      expect(beyond).toMatchObject({ freshness: 'offline', notice: 'provider_unverified', hasMore: true });
      expect(beyond.items.length).toBeLessThan(10);
      const shown = new Set(cached.items.map((item) => item.key));
      expect(beyond.items.every((item) => !shown.has(item.key))).toBe(true);
      expect(await after.container.browser.refresh(selection.configuration)).toEqual({
        ok: false,
        code: 'provider_unverified',
      });

      const detail = await after.container.browser.getProblem(selection.configuration, problem);
      expect(detail.holds.length).toBeGreaterThan(0);

      const outcome = await after.container.log.summaryFor(problem.key);
      expect(outcome.ok && outcome.summary).toMatchObject({
        top: true,
        topAchievedOn: '2026-11-15',
        lifetimeManualAttempts: 2,
        lifetimeAttempts: 3,
        sessionAttempts: 0,
      });
      await after.container.log.addAttempt(problem.key);
      const today = await after.container.log.summaryFor(problem.key);
      expect(today.ok && today.summary).toMatchObject({ sessionAttempts: 1, lifetimeAttempts: 4 });
    } finally {
      first.close();
      second.close();
    }
  });

  it('keeps the original grade of each manufacturer under shared filters (acceptance 8, FR-007)', async () => {
    const world = await openWorld({});
    const filters = { ...defaultProblemFilters, minDifficulty: makeGrade('font', '6A').difficulty as number };
    const seen: Record<string, string> = {};
    for (const manufacturer of ['kilter', 'moonboard', 'tension'] as const) {
      const selection = await firstLayout(world, manufacturer);
      const page = await world.container.browser.browse(selection.configuration, filters, null);
      expect(page.items.length).toBeGreaterThan(0);
      for (const item of page.items) {
        expect(item.grade.difficulty).toBeGreaterThanOrEqual(filters.minDifficulty);
      }
      seen[manufacturer] = `${page.items[0]?.grade.system}:${page.items[0]?.grade.label}`;
    }
    expect(seen['kilter']).toMatch(/^v:V\d/);
    expect(seen['moonboard']).toMatch(/^font:\d/);
  });
});
