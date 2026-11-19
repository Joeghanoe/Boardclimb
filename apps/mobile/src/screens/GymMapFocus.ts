import type { GeoPoint } from '@boardclimb/domain';

/** Where the map should move. A new object moves it again, even to the same place. */
export interface GymMapFocus {
  point: GeoPoint;
  /** Degrees of latitude to show: small for one gym, larger for a neighbourhood. */
  span: number;
}
