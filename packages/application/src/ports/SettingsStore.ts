import type { GradeSystem, ProblemFilters } from '@boardclimb/domain';
import type { BoardSelection } from './BoardSelection';

/** Persisted preferences that must survive restarts (FR-007). Null means nothing was saved yet. */
export interface SettingsStore {
  loadFilters(): Promise<ProblemFilters | null>;
  saveFilters(filters: ProblemFilters): Promise<void>;
  loadBoardSelection(): Promise<BoardSelection | null>;
  saveBoardSelection(selection: BoardSelection): Promise<void>;
  /** The scale the climber reads grades in. Display only: published grades are kept as they are. */
  loadGradeScale(): Promise<GradeSystem | null>;
  saveGradeScale(scale: GradeSystem): Promise<void>;
}
