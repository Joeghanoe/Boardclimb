import type { GeoPoint } from './GeoPoint';
import type { GymBoard } from './GymBoard';

/** A public place with at least one board, merged across the manufacturers' own gym listings. */
export interface Gym extends GeoPoint {
  id: string;
  name: string;
  city: string | null;
  /** ISO 3166 alpha-2 code when the listing gives one. */
  country: string | null;
  /** At least one entry; one per listed wall, or one per manufacturer when walls are not listed. */
  boards: readonly GymBoard[];
}
