import { describe, expect, it } from 'bun:test';
import type { LogEvent } from './LogEvent';
import { makeProblemKey } from './makeProblemKey';
import { summarizeLog } from './summarizeLog';

describe('summarizeLog at ten times the expected size (CODE.9)', () => {
  it('folds 10,000 events, with repeated days and alternating Top, inside the budget', () => {
    const problemKey = makeProblemKey('kilter', 'c', 'p');
    const events: LogEvent[] = [];
    for (let index = 0; index < 5000; index += 1) {
      const stamp = {
        id: `e-${index}`,
        occurredAt: '2026-11-16T10:00:00.000Z',
        sessionDate: `2026-10-${String((index % 28) + 1).padStart(2, '0')}`,
        timeZone: 'UTC',
      };
      events.push({ ...stamp, kind: 'attempts', problemKey, delta: 1 });
      events.push({
        ...stamp,
        id: `a-${index}`,
        kind: 'achievement',
        problemKey,
        top: index % 2 === 0,
        flash: false,
      });
    }

    const started = performance.now();
    const summary = summarizeLog(events, '2026-10-01');
    const elapsed = performance.now() - started;

    expect(summary.lifetimeManualAttempts).toBe(5000);
    expect(summary.days).toHaveLength(28);
    expect(elapsed).toBeLessThan(2000);
  });
});
