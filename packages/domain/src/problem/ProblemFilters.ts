/** Global, manufacturer-shared filters (FR-007). Difficulty values are positions on the Font ladder. */
export interface ProblemFilters {
  minDifficulty: number | null;
  maxDifficulty: number | null;
  /** 0 means no rating filter. */
  minStars: number;
}
