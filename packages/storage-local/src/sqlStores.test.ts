import { describe, expect, it } from 'bun:test';
import { runLogStoreContract, runSettingsStoreContract } from '@boardclimb/application/testing';
import { runProblemCacheContract } from '@boardclimb/catalog-core/testing';
import { makeProblemKey } from '@boardclimb/domain';
import type { LogEvent } from '@boardclimb/domain';
import { SqlLogStore } from './SqlLogStore';
import { SqlProblemCache } from './SqlProblemCache';
import { SqlSettingsStore } from './SqlSettingsStore';
import { StorageError } from './StorageError';
import { openTestDatabase } from './testing';

runLogStoreContract('SqlLogStore on real SQLite', async () => new SqlLogStore(await openTestDatabase()));
runSettingsStoreContract(
  'SqlSettingsStore on real SQLite',
  async () => new SqlSettingsStore(await openTestDatabase()),
);
runProblemCacheContract(
  'SqlProblemCache on real SQLite',
  async () => new SqlProblemCache(await openTestDatabase()),
);

const KEY = makeProblemKey('kilter', 'cfg', 'p');
const stamp = { occurredAt: '2026-11-16T10:00:00.000Z', sessionDate: '2026-11-16', timeZone: 'UTC' };

describe('SqlLogStore protects the log (NFR-004)', () => {
  it('writes a batch all or nothing', async () => {
    const db = await openTestDatabase();
    const store = new SqlLogStore(db);
    const good: LogEvent = { ...stamp, id: 'good', kind: 'attempts', problemKey: KEY, delta: 1 };
    const bad = { ...stamp, id: 'bad', kind: 'attempts', problemKey: KEY, delta: 0 } as LogEvent;
    await expect(store.append([good, bad])).rejects.toThrow();
    expect(await store.eventsFor(KEY)).toEqual([]);
  });

  it('refuses an invalid event loudly instead of ignoring it', async () => {
    const store = new SqlLogStore(await openTestDatabase());
    const flashWithoutTop = {
      ...stamp,
      id: 'x',
      kind: 'achievement',
      problemKey: KEY,
      top: false,
      flash: true,
    } as LogEvent;
    await expect(store.append([flashWithoutTop])).rejects.toThrow();
  });

  it('raises storage_corrupt for a stored row that breaks the rules, never skips it', async () => {
    const db = await openTestDatabase();
    await db.exec('PRAGMA ignore_check_constraints = ON');
    await db.run(
      "INSERT INTO log_events (id, problem_key, occurred_at, session_date, time_zone, kind, delta) VALUES ('c1', ?, 'x', '2026-11-16', 'UTC', 'attempts', 0)",
      [KEY],
    );
    const store = new SqlLogStore(db);
    await expect(store.eventsFor(KEY)).rejects.toBeInstanceOf(StorageError);
    await expect(store.eventsFor(KEY)).rejects.toMatchObject({ code: 'storage_corrupt' });
  });
});

describe('SqlProblemCache and SqlSettingsStore refuse values they cannot trust', () => {
  it('raises storage_corrupt for a cached detail with a broken hold list', async () => {
    const db = await openTestDatabase();
    const cache = new SqlProblemCache(db);
    await cache.upsertSummaries('kilter/cfg', [
      {
        key: KEY,
        manufacturer: 'kilter',
        configurationId: 'cfg',
        providerProblemId: 'p',
        name: 'P',
        grade: { system: 'v', label: 'V3', difficulty: 5 },
        rating: null,
      },
    ]);
    await db.run('UPDATE problems SET detail_json = ? WHERE problem_key = ?', ['{"holds":"nope"}', KEY]);
    await expect(cache.getDetail(KEY)).rejects.toMatchObject({ code: 'storage_corrupt' });
  });

  it('raises storage_corrupt for unreadable saved filters', async () => {
    const db = await openTestDatabase();
    await db.run("INSERT INTO settings (key, value_json) VALUES ('filters', '{not json')");
    await expect(new SqlSettingsStore(db).loadFilters()).rejects.toMatchObject({ code: 'storage_corrupt' });
  });

  it('raises storage_corrupt for a saved grade scale it does not know', async () => {
    const db = await openTestDatabase();
    await db.run(`INSERT INTO settings (key, value_json) VALUES ('grade_scale', '"yds"')`);
    await expect(new SqlSettingsStore(db).loadGradeScale()).rejects.toMatchObject({
      code: 'storage_corrupt',
    });
  });
});
