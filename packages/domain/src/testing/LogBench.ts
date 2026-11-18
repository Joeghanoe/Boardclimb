import { makeProblemKey } from '../problem/makeProblemKey';
import type { LogEvent } from '../log/LogEvent';
import type { LogPlan } from '../log/LogPlan';
import type { LogStamp } from '../log/LogStamp';
import { planAchievementChange } from '../log/planAchievementChange';
import { planAttemptChange } from '../log/planAttemptChange';
import { summarizeLog } from '../log/summarizeLog';

export const PROBLEM = makeProblemKey('kilter', 'config-1', 'p-1');

/** Test double for the application layer: applies plans to an in-memory history, one fake day at a time. */
export class LogBench {
  readonly history: LogEvent[] = [];
  private sequence = 0;
  day = '2026-11-16';

  private stamp(): LogStamp {
    this.sequence += 1;
    return {
      id: `e-${this.sequence}`,
      occurredAt: `${this.day}T10:00:00.000Z`,
      sessionDate: this.day,
      timeZone: 'Europe/Amsterdam',
    };
  }

  private apply(plan: LogPlan): LogPlan {
    if (plan.ok) this.history.push(...plan.events);
    return plan;
  }

  attempts(delta: number): LogPlan {
    return this.apply(
      planAttemptChange({ history: this.history, problemKey: PROBLEM, stamp: this.stamp(), delta }),
    );
  }

  setTop(value: boolean): LogPlan {
    return this.apply(
      planAchievementChange({
        history: this.history,
        problemKey: PROBLEM,
        stamp: this.stamp(),
        field: 'top',
        value,
        acknowledgeContradiction: true,
      }),
    );
  }

  setFlash(value: boolean, acknowledgeContradiction = false): LogPlan {
    return this.apply(
      planAchievementChange({
        history: this.history,
        problemKey: PROBLEM,
        stamp: this.stamp(),
        field: 'flash',
        value,
        acknowledgeContradiction,
      }),
    );
  }

  get summary() {
    return summarizeLog(this.history, this.day);
  }
}
