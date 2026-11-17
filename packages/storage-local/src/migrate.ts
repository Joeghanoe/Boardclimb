import type { DiagnosticsSink } from '@boardclimb/application';
import type { Migration } from './Migration';
import type { SqlDatabase } from './SqlDatabase';
import { StorageError } from './StorageError';
import { MIGRATIONS } from './migrations';

/**
 * Brings the database to the newest layout. Each migration runs in its own transaction together with its
 * version bump, so a crash leaves the previous version intact. A database newer than this app is refused
 * instead of being downgraded.
 */
export async function migrate(
  db: SqlDatabase,
  diagnostics?: DiagnosticsSink,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<number> {
  await db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  const rows = await db.all<{ value: string }>("SELECT value FROM meta WHERE key = 'schema_version'");
  const from = rows[0] ? Number(rows[0].value) : 0;
  const latest = migrations.at(-1)?.version ?? 0;
  if (!Number.isInteger(from) || from < 0)
    throw new StorageError('storage_corrupt', 'The schema version is unreadable.');
  if (from > latest) {
    throw new StorageError('schema_too_new', 'This data was saved by a newer version of the app.');
  }

  for (const migration of migrations.filter((candidate) => candidate.version > from)) {
    await db.transaction(async () => {
      for (const statement of migration.statements) await db.exec(statement);
      await db.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('schema_version', ?)", [
        String(migration.version),
      ]);
    });
  }
  if (latest > from) diagnostics?.emit({ name: 'storage.migrated', from, to: latest });
  return latest;
}
