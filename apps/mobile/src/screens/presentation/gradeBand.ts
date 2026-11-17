import type { BlockName } from '@boardclimb/design-system';
import type { Grade } from '@boardclimb/domain';

/**
 * The colour of a grade tile, by difficulty band on the Font ladder: up to 5+ mint, 6A–6B+ yellow,
 * 6C–7A+ coral, 7B–7C+ rose, 8A and up violet. An unknown grade stays neutral.
 */
export function gradeBand(grade: Grade): BlockName {
  const difficulty = grade.difficulty;
  if (difficulty === null) return 'stone';
  if (difficulty <= 4) return 'mint';
  if (difficulty <= 8) return 'yellow';
  if (difficulty <= 12) return 'coral';
  if (difficulty <= 16) return 'rose';
  return 'violet';
}
