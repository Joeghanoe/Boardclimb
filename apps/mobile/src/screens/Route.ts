import type { ProblemSummary } from '@boardclimb/domain';

export type Route =
  | { name: 'problems' }
  | { name: 'problem'; summary: ProblemSummary }
  | { name: 'layout' }
  | { name: 'board' }
  | { name: 'diagnostics' };
