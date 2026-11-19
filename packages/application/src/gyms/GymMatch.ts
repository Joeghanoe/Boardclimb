import type { Gym } from '@boardclimb/domain';

export interface GymMatch {
  gym: Gym;
  /** Kilometres from the query's point; null when the query had none. */
  distanceKm: number | null;
}
