import { labelForDifficulty } from '@boardclimb/domain';

/** "Any" when unset, otherwise the Font grade with its V grade, for example "6A (V3)". */
export function describeGradeBound(difficulty: number | null): string {
  if (difficulty === null) return 'Any';
  const font = labelForDifficulty(difficulty, 'font');
  if (font === null) return 'Any';
  const v = labelForDifficulty(difficulty, 'v');
  return v === null ? font : `${font} (${v})`;
}
