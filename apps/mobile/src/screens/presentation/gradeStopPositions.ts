import { FONT_LADDER } from '@boardclimb/domain';
import type { GradeStop } from './GradeStop';

/**
 * Where each stop sits on the slider, by its lowest grade on the shared Font ladder (0 to 1). Font and V use the
 * same fractions, so switching scale leaves the thumbs where they were.
 */
export function gradeStopPositions(stops: readonly GradeStop[]): number[] {
  const last = FONT_LADDER.length - 1;
  return stops.map((stop, index) => (index === stops.length - 1 ? 1 : stop.from / last));
}
