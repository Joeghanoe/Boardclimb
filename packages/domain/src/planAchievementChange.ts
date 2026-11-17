import type { LogEvent } from './LogEvent';
import type { LogPlan } from './LogPlan';
import type { LogStamp } from './LogStamp';
import type { ProblemKey } from './ProblemKey';
import { summarizeLog } from './summarizeLog';

export interface AchievementChangeRequest {
  history: readonly LogEvent[];
  problemKey: ProblemKey;
  stamp: LogStamp;
  field: 'top' | 'flash';
  value: boolean;
  /** The climber has seen that Flash contradicts earlier failed attempts and accepts it (ADR-0001 section 2.2). */
  acknowledgeContradiction?: boolean;
}

/**
 * FR-013: Top and Flash are set, not flipped, so repeating a request changes nothing. Flash implies Top,
 * Top off clears Flash, Flash off keeps Top. The success attempt is derived from the state, never added.
 */
export function planAchievementChange(request: AchievementChangeRequest): LogPlan {
  const { history, problemKey, stamp, field, value, acknowledgeContradiction } = request;
  const current = summarizeLog(history, stamp.sessionDate);

  let top = current.top;
  let flash = current.flash;
  if (field === 'flash') {
    flash = value;
    if (value) top = true;
  } else {
    top = value;
    if (!value) flash = false;
  }

  if (top === current.top && flash === current.flash) return { ok: true, events: [] };

  if (flash && !current.flash && current.lifetimeManualAttempts > 0 && !acknowledgeContradiction) {
    return {
      ok: false,
      code: 'flash_conflicts_with_failed_attempts',
      message: 'This problem already has attempts logged, so it was not a flash.',
    };
  }
  return { ok: true, events: [{ ...stamp, kind: 'achievement', problemKey, top, flash }] };
}
