export interface Migration {
  /** Consecutive from 1. Never edited once released; a change is a new migration. */
  version: number;
  statements: readonly string[];
}
