import { Database } from 'bun:sqlite';
import type { SqlDatabase } from '../database/SqlDatabase';
import type { SqlValue } from '../database/SqlValue';

/**
 * Real SQLite through Bun's built-in driver, for layer 0 tests (ADR-0004). It runs the same SQL the device
 * runs through `expo-sqlite`; it is not the device engine, so physical-device storage tests stay open.
 */
export class BunSqliteDatabase implements SqlDatabase {
  private readonly db: Database;
  private open = true;

  constructor(location = ':memory:') {
    this.db = new Database(location, { strict: true });
  }

  exec(sql: string): Promise<void> {
    return this.attempt(() => {
      this.db.exec(sql);
    });
  }

  run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    return this.attempt(() => {
      this.db.query(sql).run(...params);
    });
  }

  all<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    return this.attempt(() => this.db.query(sql).all(...params) as T[]);
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    this.db.exec('BEGIN');
    try {
      const result = await work();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /** Closing twice is allowed, so a test can close in `finally` after closing on purpose. */
  close(): void {
    if (!this.open) return;
    this.open = false;
    this.db.close();
  }

  private attempt<T>(work: () => T): Promise<T> {
    try {
      return Promise.resolve(work());
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
