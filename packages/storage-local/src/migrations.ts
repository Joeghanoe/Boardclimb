import type { Migration } from './Migration';

/** Version 1 is the layout in ADR-0003. The CHECK constraints repeat the domain rules as a last defence. */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE log_events (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        problem_key TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        session_date TEXT NOT NULL,
        time_zone TEXT NOT NULL,
        kind TEXT NOT NULL,
        delta INTEGER,
        top INTEGER,
        flash INTEGER,
        CHECK (
          (kind = 'attempts' AND delta IS NOT NULL AND delta <> 0 AND top IS NULL AND flash IS NULL)
          OR (kind = 'achievement' AND delta IS NULL AND top IN (0, 1) AND flash IN (0, 1) AND (flash = 0 OR top = 1))
        )
      )`,
      'CREATE INDEX log_events_by_problem ON log_events (problem_key, seq)',
      `CREATE TABLE problems (
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        problem_key TEXT NOT NULL UNIQUE,
        config_key TEXT NOT NULL,
        manufacturer TEXT NOT NULL,
        configuration_id TEXT NOT NULL,
        provider_problem_id TEXT NOT NULL,
        name TEXT NOT NULL,
        grade_system TEXT NOT NULL,
        grade_label TEXT NOT NULL,
        difficulty INTEGER,
        rating REAL,
        detail_json TEXT
      )`,
      'CREATE INDEX problems_by_config ON problems (config_key, seq)',
      'CREATE INDEX problems_by_filter ON problems (config_key, difficulty, rating)',
      `CREATE TABLE catalog_sync_state (
        config_key TEXT PRIMARY KEY,
        last_success_at TEXT,
        next_cursor TEXT,
        exhausted INTEGER NOT NULL,
        revision_token TEXT
      )`,
      'CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL)',
    ],
  },
];
