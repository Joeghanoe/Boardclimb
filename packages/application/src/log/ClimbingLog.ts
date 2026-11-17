import { planAchievementChange, planAttemptChange, sessionDateFor, summarizeLog } from '@boardclimb/domain';
import type { LogEvent, LogPlan, LogStamp, ProblemKey } from '@boardclimb/domain';
import type { Clock } from '../ports/Clock';
import type { IdGenerator } from '../ports/IdGenerator';
import type { LogStore } from '../ports/LogStore';
import type { LogOutcome } from './LogOutcome';

/**
 * Logging use cases (FR-012 to FR-015). Each call reads the history, asks the domain rule for the events to
 * append, writes them, and returns the summary re-read from storage. Calls run one at a time, so two quick
 * taps cannot both pass the "not below zero" check. Nothing here can reach a board.
 */
export class ClimbingLog {
  private tail: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: LogStore,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  today(): string {
    return sessionDateFor(this.clock.now(), this.clock.timeZone());
  }

  summaryFor(key: ProblemKey): Promise<LogOutcome> {
    return this.serialized(async () => this.read(key));
  }

  /** Quick tap: one more manual attempt today. */
  addAttempt(key: ProblemKey): Promise<LogOutcome> {
    return this.adjustAttempts(key, 1);
  }

  /** Editor: add or remove manual attempts today (the difference between the old and new count). */
  adjustAttempts(key: ProblemKey, delta: number): Promise<LogOutcome> {
    return this.change(key, (history, stamp) =>
      planAttemptChange({ history, problemKey: key, stamp, delta }),
    );
  }

  setTop(key: ProblemKey, value: boolean): Promise<LogOutcome> {
    return this.change(key, (history, stamp) =>
      planAchievementChange({ history, problemKey: key, stamp, field: 'top', value }),
    );
  }

  setFlash(key: ProblemKey, value: boolean, acknowledgeContradiction = false): Promise<LogOutcome> {
    return this.change(key, (history, stamp) =>
      planAchievementChange({
        history,
        problemKey: key,
        stamp,
        field: 'flash',
        value,
        acknowledgeContradiction,
      }),
    );
  }

  private change(
    key: ProblemKey,
    plan: (history: readonly LogEvent[], stamp: LogStamp) => LogPlan,
  ): Promise<LogOutcome> {
    return this.serialized(async () => {
      const history = await this.store.eventsFor(key);
      const now = this.clock.now();
      const outcome = plan(history, {
        id: this.ids.next(),
        occurredAt: now.toISOString(),
        sessionDate: sessionDateFor(now, this.clock.timeZone()),
        timeZone: this.clock.timeZone(),
      });
      if (!outcome.ok) return outcome;
      if (outcome.events.length > 0) await this.store.append(outcome.events);
      return this.read(key);
    });
  }

  private async read(key: ProblemKey): Promise<LogOutcome> {
    const history = await this.store.eventsFor(key);
    return { ok: true, summary: summarizeLog(history, this.today()) };
  }

  /** Runs one operation at a time and turns a storage failure into a coded, honest result. */
  private serialized(operation: () => Promise<LogOutcome>): Promise<LogOutcome> {
    const run = this.tail.then(operation).catch((): LogOutcome => ({
      ok: false,
      code: 'storage_failed',
      message: 'Your change could not be saved. Nothing was recorded.',
    }));
    this.tail = run;
    return run;
  }
}
