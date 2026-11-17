import type { LogEvent, ProblemKey } from '@boardclimb/domain';
import type { LogStore } from '../ports/LogStore';

/** Log store in memory, for tests and the browser preview. Same semantics as the SQLite store (shared contract). */
export class InMemoryLogStore implements LogStore {
  private readonly events: LogEvent[] = [];

  append(events: readonly LogEvent[]): Promise<void> {
    const known = new Set(this.events.map((event) => event.id));
    for (const event of events) {
      if (known.has(event.id)) continue;
      known.add(event.id);
      this.events.push(event);
    }
    return Promise.resolve();
  }

  eventsFor(key: ProblemKey): Promise<LogEvent[]> {
    return Promise.resolve(this.events.filter((event) => event.problemKey === key));
  }

  async eventsForMany(keys: readonly ProblemKey[]): Promise<Map<ProblemKey, LogEvent[]>> {
    const result = new Map<ProblemKey, LogEvent[]>(keys.map((key) => [key, []]));
    for (const event of this.events) result.get(event.problemKey)?.push(event);
    return result;
  }
}
