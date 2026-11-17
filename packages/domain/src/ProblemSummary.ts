import type { Grade } from './Grade';
import type { Manufacturer } from './Manufacturer';
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
}
