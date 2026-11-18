import type { LogEvent } from './LogEvent';
import type { LogPlan } from './LogPlan';
import type { LogStamp } from './LogStamp';
import type { ProblemKey } from '../problem/ProblemKey';

export interface AttemptChangeRequest {
  history: readonly LogEvent[];
  problemKey: ProblemKey;
  stamp: LogStamp;
  /** Manual attempts to add (positive) or remove (negative) on the stamp's session day. */
  delta: number;
}

/** FR-012: a quick tap is +1, the editor sends the difference; a session day never goes below zero. */
export function planAttemptChange({ history, problemKey, stamp, delta }: AttemptChangeRequest): LogPlan {
  if (!Number.isInteger(delta)) {
    return { ok: false, code: 'invalid_attempt_delta', message: 'Attempts change in whole numbers.' };
  }
  if (delta === 0) return { ok: true, events: [] };

  const dayTotal = history
    .filter((event) => event.kind === 'attempts' && event.sessionDate === stamp.sessionDate)
    .reduce((sum, event) => sum + (event.kind === 'attempts' ? event.delta : 0), 0);
  if (dayTotal + delta < 0) {
    return { ok: false, code: 'attempts_would_be_negative', message: 'Attempts cannot go below zero.' };
  }
  return { ok: true, events: [{ ...stamp, kind: 'attempts', problemKey, delta }] };
}
