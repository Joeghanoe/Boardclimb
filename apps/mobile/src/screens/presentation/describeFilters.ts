import type { ProblemFilters } from '@boardclimb/domain';
import { describeGradeBound } from './describeGradeBound';

/** The active filters in a few words, for the collapsed filter control, for example "6A (V3) to 7A (V6) · 4+ ★". */
export function describeFilters(filters: ProblemFilters): string {
  const { minDifficulty, maxDifficulty, minStars } = filters;
  let grades = 'Any grade';
  if (minDifficulty !== null && maxDifficulty !== null)
    grades = `${describeGradeBound(minDifficulty)} to ${describeGradeBound(maxDifficulty)}`;
  else if (minDifficulty !== null) grades = `${describeGradeBound(minDifficulty)} and up`;
  else if (maxDifficulty !== null) grades = `Up to ${describeGradeBound(maxDifficulty)}`;
  return minStars > 0 ? `${grades} · ${minStars}+ ★` : grades;
}
