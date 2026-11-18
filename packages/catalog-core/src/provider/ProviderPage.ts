import type { ProviderProblemSummaryRecord } from './ProviderProblemSummaryRecord';

export interface ProviderPage {
  records: ProviderProblemSummaryRecord[];
  nextCursor: string | null;
}
