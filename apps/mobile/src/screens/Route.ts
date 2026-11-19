import type { BoardSelection } from '@boardclimb/application';
import type { ProblemSummary } from '@boardclimb/domain';
import type { LayoutPreset } from './presentation/LayoutPreset';

export type Route =
  | { name: 'problems' }
  | { name: 'problem'; summary: ProblemSummary; selection: BoardSelection }
  | { name: 'layout'; preset?: LayoutPreset }
  | { name: 'gyms' }
  | { name: 'board'; selection: BoardSelection | null; preset?: LayoutPreset }
  | { name: 'diagnostics' };
