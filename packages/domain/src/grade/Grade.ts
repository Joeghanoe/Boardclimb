import type { GradeSystem } from './GradeSystem';

/**
 * A grade exactly as the manufacturer published it, plus a position on the Font ladder for range filtering.
 * `difficulty` is null when the label has no reliable standard conversion; the label is never altered.
 */
export interface Grade {
  system: GradeSystem;
  label: string;
  difficulty: number | null;
}
