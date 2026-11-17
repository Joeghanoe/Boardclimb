import type { LogEvent, ProblemKey } from '@boardclimb/domain';

/** Durable, append-only climbing log (ADR-0003). Rejects with an Error when the write did not persist. */
export interface LogStore {
  /** Appends all events in one transaction. An event whose id is already stored is ignored. */
  append(events: readonly LogEvent[]): Promise<void>;
  /** One problem's events in insert order. */
  eventsFor(key: ProblemKey): Promise<LogEvent[]>;
  /** Several problems' events in one read, for list badges. Keys without events map to an empty array. */
  eventsForMany(keys: readonly ProblemKey[]): Promise<Map<ProblemKey, LogEvent[]>>;
}
