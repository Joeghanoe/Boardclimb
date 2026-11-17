import { FONT_LADDER } from '@boardclimb/domain';
import type { ProblemFilters } from '@boardclimb/domain';

const TOP = FONT_LADDER.length - 1;

/**
 * Moves the lower or upper grade limit one step. Null means no limit: stepping the lower limit down from the
 * easiest grade clears it, stepping the upper limit up from the hardest grade clears it. The limits never cross.
 */
export function stepGradeBound(
  filters: ProblemFilters,
  bound: 'min' | 'max',
  direction: 1 | -1,
): ProblemFilters {
  if (bound === 'min') {
    const current = filters.minDifficulty;
    const moved = current === null ? (direction === 1 ? 0 : null) : current + direction;
    const next = moved !== null && moved < 0 ? null : moved;
    const ceiling = filters.maxDifficulty;
    return {
      ...filters,
      minDifficulty: next !== null && ceiling !== null && next > ceiling ? ceiling : next,
    };
  }
  const current = filters.maxDifficulty;
  const moved = current === null ? (direction === -1 ? TOP : null) : current + direction;
  const next = moved !== null && moved > TOP ? null : moved;
  const floor = filters.minDifficulty;
  return { ...filters, maxDifficulty: next !== null && floor !== null && next < floor ? floor : next };
}
