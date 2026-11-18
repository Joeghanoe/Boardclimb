import type { BoardSelection } from '@boardclimb/application';
import type { ProblemSummary } from '@boardclimb/domain';

export type Route =
  | { name: 'problems' }
  | { name: 'problem'; summary: ProblemSummary; selection: BoardSelection }
  | { name: 'layout' }
  | { name: 'board'; selection: BoardSelection | null }
  | { name: 'diagnostics' };
