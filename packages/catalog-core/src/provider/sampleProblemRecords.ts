import type { ProviderProblemRecord } from './ProviderProblemRecord';

const NAMES = [
  'Warm Up Slab',
  'Crimp City',
  'Sloper Dream',
  'Pocket Rocket',
  'Pinch Me',
  'Dyno Dave',
  'Heel Hook Hero',
  'Compression Session',
  'Quiet Feet',
  'Long Reach',
  'Tiny Tweaks',
  'Roof Run',
  'Side Pull Sonata',
  'Balance Beam',
  'Cross Through',
  'Knee Bar Bonus',
  'Gaston Gate',
  'Mantle Madness',
  'Slap Happy',
  'Final Boss',
];

const FONT_GRADES = ['5', '5+', '6A', '6A+', '6B', '6B+', '6C', '6C+', '7A', '7A+', '7B', '7B+'];
const V_GRADES = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8'];

export interface SampleRecordOptions {
  count: number;
  gradeSystem: 'font' | 'v';
  /** When false, every problem is unrated (a provider that does not publish ratings). */
  rated: boolean;
  idPrefix: string;
}

/** Deterministic made-up problems. They are sample data, not any manufacturer's catalog. */
export function sampleProblemRecords({
  count,
  gradeSystem,
  rated,
  idPrefix,
}: SampleRecordOptions): ProviderProblemRecord[] {
  const grades = gradeSystem === 'font' ? FONT_GRADES : V_GRADES;
  return Array.from({ length: count }, (_, index) => {
    const base = NAMES[index % NAMES.length] ?? 'Sample';
    const round = Math.floor(index / NAMES.length);
    return {
      id: `${idPrefix}-${index + 1}`,
      name: round === 0 ? base : `${base} ${round + 1}`,
      gradeSystem,
      gradeLabel: grades[(index * 5) % grades.length] ?? grades[0] ?? '',
      rating: rated && index % 7 !== 3 ? Math.round((2 + ((index * 3) % 7) / 2.4) * 10) / 10 : null,
      bounds: { left: 0, right: 10, bottom: 0, top: 18 },
      holds: [
        { holdId: `h${(index % 9) + 1}`, role: 'start', x: 3, y: 3 },
        { holdId: `h${(index % 9) + 10}`, role: 'hand', x: 6, y: 9 },
        { holdId: `h${(index % 9) + 20}`, role: 'foot', x: 7, y: 2 },
        { holdId: `h${(index % 9) + 30}`, role: 'finish', x: 4, y: 17 },
      ],
    };
  });
}
