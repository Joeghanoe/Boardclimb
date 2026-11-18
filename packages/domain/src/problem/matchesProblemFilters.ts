import type { ProblemFilters } from './ProblemFilters';
import type { ProblemSummary } from './ProblemSummary';

/**
 * The reference semantics of the global filters; the SQL cache must return the same rows (shared vectors test).
 * - A grade range hides problems whose grade has no standard conversion.
 * - A minimum rating is not applied when the provider gives no ratings at all, and hides unrated problems
 *   from providers that do give ratings; a missing rating is never treated as zero stars.
 */
export function matchesProblemFilters(
  problem: Pick<ProblemSummary, 'grade' | 'rating'>,
  filters: ProblemFilters,
  providerHasRatings: boolean,
): boolean {
  const { minDifficulty, maxDifficulty, minStars } = filters;
  if (minDifficulty !== null || maxDifficulty !== null) {
    const difficulty = problem.grade.difficulty;
    if (difficulty === null) return false;
    if (minDifficulty !== null && difficulty < minDifficulty) return false;
    if (maxDifficulty !== null && difficulty > maxDifficulty) return false;
  }
  if (minStars > 0 && providerHasRatings) {
    if (problem.rating === null || problem.rating < minStars) return false;
  }
  return true;
}
