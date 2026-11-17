import { convertedLabel } from '@boardclimb/domain';
import type { Grade } from '@boardclimb/domain';

/** The grade as published, with the other standard scale beside it when the conversion is reliable (FR-007). */
export function formatGrade(grade: Grade): string {
  if (grade.label.includes('/')) return grade.label;
  const other = convertedLabel(grade, grade.system === 'font' ? 'v' : 'font');
  return other === null ? grade.label : `${grade.label} (${other})`;
}
