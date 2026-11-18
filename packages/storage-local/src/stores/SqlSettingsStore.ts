import type { BoardSelection, SettingsStore } from '@boardclimb/application';
import { MANUFACTURERS } from '@boardclimb/domain';
import type { GradeSystem, ProblemFilters } from '@boardclimb/domain';
import type { SqlDatabase } from '../database/SqlDatabase';
import { StorageError } from '../database/StorageError';

const FILTERS = 'filters';
const SELECTION = 'board_selection';
const GRADE_SCALE = 'grade_scale';

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

/** Preferences on SQLite (FR-007). Stored values are validated on read; a bad value raises storage_corrupt. */
export class SqlSettingsStore implements SettingsStore {
  constructor(private readonly db: SqlDatabase) {}

  async loadFilters(): Promise<ProblemFilters | null> {
    const value = await this.read(FILTERS);
    if (value === undefined) return null;
    const filters = value as Partial<ProblemFilters>;
    if (
      !isNumberOrNull(filters.minDifficulty ?? null) ||
      !isNumberOrNull(filters.maxDifficulty ?? null) ||
      typeof filters.minStars !== 'number'
    ) {
      throw new StorageError('storage_corrupt', 'Saved filters are not valid.');
    }
    return {
      minDifficulty: filters.minDifficulty ?? null,
      maxDifficulty: filters.maxDifficulty ?? null,
      minStars: filters.minStars,
    };
  }

  saveFilters(filters: ProblemFilters): Promise<void> {
    return this.write(FILTERS, filters);
  }

  async loadBoardSelection(): Promise<BoardSelection | null> {
    const value = await this.read(SELECTION);
    if (value === undefined) return null;
    const selection = value as Partial<BoardSelection>;
    const configuration = selection.configuration;
    const known = MANUFACTURERS.find((candidate) => candidate === configuration?.manufacturer);
    if (
      !known ||
      !configuration ||
      typeof selection.boardName !== 'string' ||
      typeof configuration.id !== 'string' ||
      typeof configuration.boardId !== 'string' ||
      typeof configuration.name !== 'string' ||
      !isNumberOrNull(configuration.angleDegrees ?? null)
    ) {
      throw new StorageError('storage_corrupt', 'The saved board is not valid.');
    }
    return {
      boardName: selection.boardName,
      configuration: {
        id: configuration.id,
        boardId: configuration.boardId,
        manufacturer: known,
        name: configuration.name,
        angleDegrees: configuration.angleDegrees ?? null,
      },
    };
  }

  saveBoardSelection(selection: BoardSelection): Promise<void> {
    return this.write(SELECTION, selection);
  }

  async loadGradeScale(): Promise<GradeSystem | null> {
    const value = await this.read(GRADE_SCALE);
    if (value === undefined) return null;
    if (value !== 'font' && value !== 'v')
      throw new StorageError('storage_corrupt', 'The saved grade scale is not valid.');
    return value;
  }

  saveGradeScale(scale: GradeSystem): Promise<void> {
    return this.write(GRADE_SCALE, scale);
  }

  private async read(key: string): Promise<unknown> {
    const row = (
      await this.db.all<{ value_json: string }>('SELECT value_json FROM settings WHERE key = ?', [key])
    )[0];
    if (!row) return undefined;
    try {
      return JSON.parse(row.value_json);
    } catch {
      throw new StorageError('storage_corrupt', `Saved setting ${key} is not valid.`);
    }
  }

  private write(key: string, value: unknown): Promise<void> {
    return this.db.run(
      'INSERT INTO settings (key, value_json) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value_json = excluded.value_json',
      [key, JSON.stringify(value)],
    );
  }
}
