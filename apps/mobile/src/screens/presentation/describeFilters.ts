import type { GradeSystem, ProblemFilters } from '@boardclimb/domain';
import { filtersToRange } from './gradeRange';
import { gradeStops } from './gradeStops';

/** The active filters in a few words, in the climber's grade scale, for example "6A to 7A · 4+ ★". */
export function describeFilters(filters: ProblemFilters, scale: GradeSystem): string {
  const stops = gradeStops(scale);
  const [low, high] = filtersToRange(filters, stops);
  const from = filters.minDifficulty === null ? null : stops[low]?.label;
  const to = filters.maxDifficulty === null ? null : stops[high]?.label;
  let grades = 'Any grade';
  if (from && to) grades = from === to ? from : `${from} to ${to}`;
  else if (from) grades = `${from} and up`;
  else if (to) grades = `Up to ${to}`;
  return filters.minStars > 0 ? `${grades} · ${filters.minStars}+ ★` : grades;
}
