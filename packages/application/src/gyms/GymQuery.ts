import type { GeoPoint, Manufacturer } from '@boardclimb/domain';

export interface GymQuery {
  /** Results are nearest first from here; null sorts them by name. */
  near: GeoPoint | null;
  /** Only gyms with this manufacturer's board; null for every gym. */
  manufacturer: Manufacturer | null;
  /** Words that must all appear in the gym's name, city or country; empty matches every gym. */
  text: string;
  limit: number;
}
