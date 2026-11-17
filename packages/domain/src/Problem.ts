import type { HoldPlacement } from './HoldPlacement';
import type { ProblemSummary } from './ProblemSummary';

export interface Problem extends ProblemSummary {
  holds: HoldPlacement[];
}
