import { openDatabaseAsync } from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SqlDatabase, SqlValue } from '@boardclimb/storage-local';

/** The device SQLite driver behind the SqlDatabase port (ADR-0003). Not exercised by Node tests: see Known limits. */
export class ExpoSqliteDatabase implements SqlDatabase {
  private constructor(private readonly db: SQLiteDatabase) {}

  static async open(name = 'boardclimb.db'): Promise<ExpoSqliteDatabase> {
    return new ExpoSqliteDatabase(await openDatabaseAsync(name));
  }

  exec(sql: string): Promise<void> {
    return this.db.execAsync(sql);
  }

  async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    await this.db.runAsync(sql, [...params]);
  }

  all<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, [...params]);
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    let result: T | undefined;
    await this.db.withTransactionAsync(async () => {
      result = await work();
    });
    return result as T;
  }
}
