import type { LogStore } from '@boardclimb/application';
import type { LogEvent, ProblemKey } from '@boardclimb/domain';
import type { SqlDatabase } from '../database/SqlDatabase';
import { StorageError } from '../database/StorageError';
import { toLogEvent } from '../mappers/toLogEvent';
import type { LogRow } from '../mappers/LogRow';

const COLUMNS = 'id, problem_key, occurred_at, session_date, time_zone, kind, delta, top, flash';
/** Stay well below SQLite's variable limit. */
const KEYS_PER_QUERY = 500;

/** The append-only climbing log on SQLite (ADR-0003). Rows are never updated or deleted. */
export class SqlLogStore implements LogStore {
  constructor(private readonly db: SqlDatabase) {}

  append(events: readonly LogEvent[]): Promise<void> {
    if (events.length === 0) return Promise.resolve();
    return this.db.transaction(async () => {
      for (const event of events) {
        await this.db.run(
          `INSERT INTO log_events (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
          [
            event.id,
            event.problemKey,
            event.occurredAt,
            event.sessionDate,
            event.timeZone,
            event.kind,
            event.kind === 'attempts' ? event.delta : null,
            event.kind === 'achievement' ? Number(event.top) : null,
            event.kind === 'achievement' ? Number(event.flash) : null,
          ],
        );
      }
    });
  }

  async eventsFor(key: ProblemKey): Promise<LogEvent[]> {
    const rows = await this.db.all<LogRow>(
      `SELECT ${COLUMNS} FROM log_events WHERE problem_key = ? ORDER BY seq`,
      [key],
    );
    return rows.map(toLogEvent);
  }

  async eventsForMany(keys: readonly ProblemKey[]): Promise<Map<ProblemKey, LogEvent[]>> {
    const result = new Map<ProblemKey, LogEvent[]>(keys.map((key) => [key, []]));
    for (let start = 0; start < keys.length; start += KEYS_PER_QUERY) {
      const chunk = keys.slice(start, start + KEYS_PER_QUERY);
      const rows = await this.db.all<LogRow>(
        `SELECT ${COLUMNS} FROM log_events WHERE problem_key IN (${chunk.map(() => '?').join(', ')}) ORDER BY seq`,
        chunk,
      );
      for (const row of rows) {
        const bucket = result.get(row.problem_key as ProblemKey);
        if (!bucket)
          throw new StorageError('storage_corrupt', 'A stored event does not belong to any asked problem.');
        bucket.push(toLogEvent(row));
      }
    }
    return result;
  }
}
