import type { ProblemFilters } from '@boardclimb/domain';
import type { GradeStop } from './GradeStop';

/**
 * Converts between the filter (ladder difficulties, null = no limit) and slider positions. A thumb at either
 * end means no limit on that side, so problems with an unknown grade are not filtered out by accident.
 */
export function filtersToRange(filters: ProblemFilters, stops: readonly GradeStop[]): [number, number] {
  const last = stops.length - 1;
  const find = (difficulty: number) => stops.findIndex((s) => difficulty >= s.from && difficulty <= s.to);
  const low = filters.minDifficulty === null ? 0 : Math.max(0, find(filters.minDifficulty));
  const highFound = filters.maxDifficulty === null ? last : find(filters.maxDifficulty);
  const high = highFound < 0 ? last : highFound;
  return [Math.min(low, high), high];
}

export function rangeToFilters(
  filters: ProblemFilters,
  [low, high]: readonly [number, number],
  stops: readonly GradeStop[],
): ProblemFilters {
  const last = stops.length - 1;
  return {
    ...filters,
    minDifficulty: low <= 0 ? null : (stops[low]?.from ?? null),
    maxDifficulty: high >= last ? null : (stops[high]?.to ?? null),
  };
}
