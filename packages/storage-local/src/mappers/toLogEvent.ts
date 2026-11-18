import type { LogEvent, ProblemKey } from '@boardclimb/domain';
import type { LogRow } from './LogRow';
import { StorageError } from '../database/StorageError';

/** Reads one stored row as a domain event. A row that breaks the rules raises storage_corrupt (never skipped). */
export function toLogEvent(row: LogRow): LogEvent {
  const base = {
    id: row.id,
    problemKey: row.problem_key as ProblemKey,
    occurredAt: row.occurred_at,
    sessionDate: row.session_date,
    timeZone: row.time_zone,
  };
  if (row.kind === 'attempts' && Number.isInteger(row.delta) && row.delta !== 0 && row.delta !== null) {
    return { ...base, kind: 'attempts', delta: row.delta };
  }
  const flags = (row.top === 0 || row.top === 1) && (row.flash === 0 || row.flash === 1);
  if (row.kind === 'achievement' && flags && (row.flash === 0 || row.top === 1)) {
    return { ...base, kind: 'achievement', top: row.top === 1, flash: row.flash === 1 };
  }
  throw new StorageError('storage_corrupt', `Stored log event ${row.id} is not valid.`);
}
