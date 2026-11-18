import type { SqlValue } from './SqlValue';

/**
 * The SQLite driver as this package needs it (CODE.8, ADR-0003). `expo-sqlite` implements it on the device and
 * Node's built-in `node:sqlite` implements it in tests. `transaction` is not re-entrant: it commits when the
 * work resolves and rolls back, rethrowing, when it rejects.
 */
export interface SqlDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  all<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  transaction<T>(work: () => Promise<T>): Promise<T>;
}
