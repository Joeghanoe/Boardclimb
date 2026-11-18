import type { BoardBounds } from '../board/BoardBounds';
import type { HoldPlacement } from '../board/HoldPlacement';
import type { ProblemSummary } from './ProblemSummary';

export interface Problem extends ProblemSummary {
  holds: HoldPlacement[];
  setter?: string;
  bounds?: BoardBounds;
}
