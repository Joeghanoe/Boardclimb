import type { BoardBounds } from '@boardclimb/domain';
import type { ProviderHoldRecord } from './ProviderHoldRecord';
import type { ProviderProblemSummaryRecord } from './ProviderProblemSummaryRecord';

export interface ProviderProblemRecord extends ProviderProblemSummaryRecord {
  holds: ProviderHoldRecord[];
  setter?: string;
  bounds?: BoardBounds;
}
