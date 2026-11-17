import type { GradeSystem, ProblemFilters } from '@boardclimb/domain';
import type { BoardSelection } from '../ports/BoardSelection';
import type { SettingsStore } from '../ports/SettingsStore';

/** Settings in memory, for tests and the browser preview. Same semantics as the SQLite store (shared contract). */
export class InMemorySettingsStore implements SettingsStore {
  private filters: ProblemFilters | null = null;
  private selection: BoardSelection | null = null;
  private gradeScale: GradeSystem | null = null;

  loadFilters(): Promise<ProblemFilters | null> {
    return Promise.resolve(this.filters);
  }

  saveFilters(filters: ProblemFilters): Promise<void> {
    this.filters = { ...filters };
    return Promise.resolve();
  }

  loadBoardSelection(): Promise<BoardSelection | null> {
    return Promise.resolve(this.selection);
  }

  saveBoardSelection(selection: BoardSelection): Promise<void> {
    this.selection = { ...selection };
    return Promise.resolve();
  }

  loadGradeScale(): Promise<GradeSystem | null> {
    return Promise.resolve(this.gradeScale);
  }

  saveGradeScale(scale: GradeSystem): Promise<void> {
    this.gradeScale = scale;
    return Promise.resolve();
  }
}
