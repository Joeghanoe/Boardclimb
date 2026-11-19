import type { Grade } from './Grade';
import type { GradeSystem } from './GradeSystem';

/** Font ladder in ascending difficulty; the index is the `difficulty` used for range filtering. */
export const FONT_LADDER: readonly string[] = [
  '3',
  '4',
  '4+',
  '5',
  '5+',
  '6A',
  '6A+',
  '6B',
  '6B+',
  '6C',
  '6C+',
  '7A',
  '7A+',
  '7B',
  '7B+',
  '7C',
  '7C+',
  '8A',
  '8A+',
  '8B',
  '8B+',
  '8C',
  '8C+',
  '9A',
];

/** Common community table: the V grade usually printed beside each Font grade. */
const FONT_TO_V: Readonly<Record<string, string>> = {
  '3': 'VB',
  '4': 'VB',
  '4+': 'V0',
  '5': 'V1',
  '5+': 'V2',
  '6A': 'V3',
  '6A+': 'V3',
  '6B': 'V4',
  '6B+': 'V4',
  '6C': 'V5',
  '6C+': 'V5',
  '7A': 'V6',
  '7A+': 'V7',
  '7B': 'V8',
  '7B+': 'V8',
  '7C': 'V9',
  '7C+': 'V10',
  '8A': 'V11',
  '8A+': 'V12',
  '8B': 'V13',
  '8B+': 'V14',
  '8C': 'V15',
  '8C+': 'V16',
  '9A': 'V17',
};

/** A V grade sits at the lowest Font grade that maps to it. */
const V_TO_FONT: Readonly<Record<string, string>> = Object.fromEntries(
  [...FONT_LADDER].reverse().map((font) => [FONT_TO_V[font] as string, font] as const),
);

/**
 * Below 6A the ladder has coarse steps ("4", "4+", "5", "5+") while boards publish lettered grades ("4a", "5c").
 * Maps a lettered grade onto its step, so easy problems still match a grade range: a, b and c sit in the step,
 * except 4c and 5c, which are the "+" step. Anything below 4 is "3".
 */
function lowFontStep(label: string): string | undefined {
  const match = /^([1-5])([ABC])$/.exec(label);
  if (!match) return undefined;
  const [, number, letter] = match;
  if (Number(number) < 4) return '3';
  return letter === 'C' ? `${number}+` : number;
}

/** Builds a Grade from a published label. Unknown labels keep their text and get difficulty null. */
export function makeGrade(system: GradeSystem, publishedLabel: string): Grade {
  const published = publishedLabel.trim().toUpperCase();
  const key =
    system === 'font' && /^[0-9][A-C]?[+]?[ ]*\/V(?:B|[0-9]+)$/.test(published)
      ? published.split('/')[0]!.trim()
      : published;
  const fontLabel = system === 'font' ? (lowFontStep(key) ?? key) : V_TO_FONT[key];
  const index = fontLabel === undefined ? -1 : FONT_LADDER.indexOf(fontLabel);
  return { system, label: publishedLabel, difficulty: index >= 0 ? index : null };
}

/** The label of a position on the ladder in the given standard scale, or null when out of range. */
export function labelForDifficulty(difficulty: number, system: GradeSystem): string | null {
  const font = FONT_LADDER[difficulty];
  if (font === undefined) return null;
  return system === 'font' ? font : (FONT_TO_V[font] ?? null);
}

/** The label of this grade in the other standard scale, or null when there is no reliable conversion. */
export function convertedLabel(grade: Grade, target: GradeSystem): string | null {
  if (grade.system === target) return grade.label;
  if (grade.difficulty === null) return null;
  return labelForDifficulty(grade.difficulty, target);
}
