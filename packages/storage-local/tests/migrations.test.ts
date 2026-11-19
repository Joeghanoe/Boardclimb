import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { RecordingDiagnostics } from '@boardclimb/application/testing';
import { makeProblemKey } from '@boardclimb/domain';
import { MIGRATIONS, SqlLogStore, StorageError, migrate } from '@boardclimb/storage-local';
import { BunSqliteDatabase } from '@boardclimb/storage-local/testing';

async function version(db: BunSqliteDatabase): Promise<string | undefined> {
  return (await db.all<{ value: string }>("SELECT value FROM meta WHERE key = 'schema_version'"))[0]?.value;
}

describe('migrations (NFR-004, AC-019)', () => {
  it('creates the ADR-0003 layout at the newest version and reports the step', async () => {
    const db = new BunSqliteDatabase();
    const diagnostics = new RecordingDiagnostics();
    expect(await migrate(db, diagnostics)).toBe(2);
    expect(await version(db)).toBe('2');
    const tables = (
      await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
    ).map((row) => row.name);
    expect(tables).toEqual(
      expect.arrayContaining(['log_events', 'problems', 'catalog_sync_state', 'settings', 'meta']),
    );
    expect(diagnostics.events).toEqual([{ name: 'storage.migrated', from: 0, to: 2 }]);
  });

  it('is safe to run again and reports nothing the second time', async () => {
    const db = new BunSqliteDatabase();
    await migrate(db);
    const diagnostics = new RecordingDiagnostics();
    expect(await migrate(db, diagnostics)).toBe(2);
    expect(diagnostics.events).toEqual([]);
  });

  it('refuses a database saved by a newer app instead of downgrading it', async () => {
    const db = new BunSqliteDatabase();
    await migrate(db);
    await db.run("UPDATE meta SET value = '99' WHERE key = 'schema_version'");
    await expect(migrate(db)).rejects.toMatchObject({ code: 'schema_too_new' });
  });

  it('refuses an unreadable version', async () => {
    const db = new BunSqliteDatabase();
    await migrate(db);
    await db.run("UPDATE meta SET value = 'banana' WHERE key = 'schema_version'");
    await expect(migrate(db)).rejects.toBeInstanceOf(StorageError);
  });

  it('rolls a failing migration back completely and keeps the previous version', async () => {
    const db = new BunSqliteDatabase();
    await migrate(db);
    const broken = [
      ...MIGRATIONS,
      { version: 3, statements: ['CREATE TABLE half_done (id INTEGER)', 'THIS IS NOT SQL'] },
    ];
    await expect(migrate(db, undefined, broken)).rejects.toThrow();
    expect(await version(db)).toBe('2');
    const half = await db.all("SELECT name FROM sqlite_master WHERE name = 'half_done'");
    expect(half).toEqual([]);
  });

  it('version 2 keeps cached problems from version 1 and adds setter and ascents empty', async () => {
    const db = new BunSqliteDatabase();
    await migrate(db, undefined, MIGRATIONS.slice(0, 1));
    await db.run(
      `INSERT INTO problems (problem_key, config_key, manufacturer, configuration_id, provider_problem_id, name,
        grade_system, grade_label, difficulty, rating) VALUES ('k', 'kilter/c', 'kilter', 'c', 'p', 'Old', 'font', '6A', 5, 3)`,
    );
    const diagnostics = new RecordingDiagnostics();
    expect(await migrate(db, diagnostics)).toBe(2);
    expect(diagnostics.events).toEqual([{ name: 'storage.migrated', from: 1, to: 2 }]);
    const rows = await db.all<{ name: string; setter: string | null; ascents: number | null }>(
      'SELECT name, setter, ascents FROM problems',
    );
    expect(rows).toEqual([{ name: 'Old', setter: null, ascents: null }]);
  });

  it('AC-019: records survive closing and reopening the database file', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'boardclimb-'));
    const file = join(folder, 'boardclimb.db');
    const key = makeProblemKey('kilter', 'cfg', 'p');
    try {
      const first = new BunSqliteDatabase(file);
      await migrate(first);
      await new SqlLogStore(first).append([
        {
          id: 'e1',
          kind: 'attempts',
          problemKey: key,
          delta: 2,
          occurredAt: '2026-11-15T10:00:00.000Z',
          sessionDate: '2026-11-15',
          timeZone: 'Europe/Amsterdam',
        },
      ]);
      first.close();

      const second = new BunSqliteDatabase(file);
      await migrate(second);
      const events = await new SqlLogStore(second).eventsFor(key);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ sessionDate: '2026-11-15', delta: 2 });
      second.close();
    } finally {
      await rm(folder, { recursive: true, force: true });
    }
  });
});
