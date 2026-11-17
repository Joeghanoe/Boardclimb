import { convertedLabel } from '@boardclimb/domain';
import type { Grade, GradeSystem } from '@boardclimb/domain';

/**
 * The grade in the scale the climber chose. A paired label such as "6a/V2" gives the matching half; a grade
 * without a reliable conversion stays as published (FR-007). The published grade itself is never changed.
 */
export function displayGrade(grade: Grade, scale: GradeSystem): string {
  const paired = grade.label.split('/');
  if (paired.length === 2 && paired[0] && paired[1]) {
    const vHalf = /^v/i.test(paired[1].trim()) ? paired[1].trim() : paired[0].trim();
    const fontHalf = vHalf === paired[1].trim() ? paired[0].trim() : paired[1].trim();
    return scale === 'v' ? vHalf : fontHalf;
  }
  return convertedLabel(grade, scale) ?? grade.label;
}
