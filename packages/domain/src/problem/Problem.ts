import type { BoardBounds } from '../board/BoardBounds';
import type { HoldPlacement } from '../board/HoldPlacement';
import type { ProblemSummary } from './ProblemSummary';

export interface Problem extends ProblemSummary {
  holds: HoldPlacement[];
  bounds?: BoardBounds;
  /** The same problem flipped left to right; present only when the board maps every hold to its mirror. */
  mirroredHolds?: HoldPlacement[];
}
