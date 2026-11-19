import type { BoardBounds } from '@boardclimb/domain';
import type { ProviderHoldRecord } from './ProviderHoldRecord';
import type { ProviderProblemSummaryRecord } from './ProviderProblemSummaryRecord';

export interface ProviderProblemRecord extends ProviderProblemSummaryRecord {
  holds: ProviderHoldRecord[];
  bounds?: BoardBounds;
  /** The same problem flipped left to right, when every hold has a known mirror on the board. */
  mirroredHolds?: ProviderHoldRecord[];
}
