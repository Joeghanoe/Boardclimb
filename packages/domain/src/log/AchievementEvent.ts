import type { LogStamp } from './LogStamp';
import type { ProblemKey } from '../problem/ProblemKey';

/** The full Top and Flash state after a climber action. The latest one is current. `flash` implies `top`. */
export interface AchievementEvent extends LogStamp {
  kind: 'achievement';
  problemKey: ProblemKey;
  top: boolean;
  flash: boolean;
}
