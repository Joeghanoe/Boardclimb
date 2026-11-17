import { FONT_LADDER, labelForDifficulty } from '@boardclimb/domain';
import type { GradeSystem } from '@boardclimb/domain';
import type { GradeStop } from './GradeStop';

/**
 * The slider positions for a scale. Font has one per ladder grade; V groups the Font grades that share a V
 * grade (6A and 6A+ are both V3), so no V grade appears twice.
 */
export function gradeStops(scale: GradeSystem): GradeStop[] {
  const stops: GradeStop[] = [];
  FONT_LADDER.forEach((_font, difficulty) => {
    const label = labelForDifficulty(difficulty, scale) ?? '';
    const last = stops[stops.length - 1];
    if (last && last.label === label) last.to = difficulty;
    else stops.push({ label, from: difficulty, to: difficulty });
  });
  return stops;
}
