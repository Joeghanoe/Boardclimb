import type { ProviderHoldRecord } from './ProviderHoldRecord';
import type { ProviderProblemSummaryRecord } from './ProviderProblemSummaryRecord';

export interface ProviderProblemRecord extends ProviderProblemSummaryRecord {
  holds: ProviderHoldRecord[];
}
