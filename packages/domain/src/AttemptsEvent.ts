import type { LogStamp } from './LogStamp';
import type { ProblemKey } from './ProblemKey';

/** Manual attempts added (positive) or corrected away (negative) on one session day. */
export interface AttemptsEvent extends LogStamp {
  kind: 'attempts';
  problemKey: ProblemKey;
  delta: number;
}
