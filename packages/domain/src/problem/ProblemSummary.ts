import type { Grade } from '../grade/Grade';
import type { Manufacturer } from '../board/Manufacturer';
import type { ProblemKey } from './ProblemKey';

export interface ProblemSummary {
  key: ProblemKey;
  manufacturer: Manufacturer;
  configurationId: string;
  providerProblemId: string;
  name: string;
  grade: Grade;
  /** Average stars, 0 to 5. Null means the provider gave no rating: not rated, never zero. */
  rating: number | null;
  /** Who set it, as published. Absent when the provider does not say. */
  setter?: string;
  /** How many climbers logged an ascent at this angle. Absent when the provider does not say. */
  ascents?: number;
}
