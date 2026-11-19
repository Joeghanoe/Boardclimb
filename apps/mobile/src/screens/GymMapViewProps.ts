import type { GymMatch } from '@boardclimb/application';
import type { GeoPoint, Gym } from '@boardclimb/domain';
import type { GymMapFocus } from './GymMapFocus';

export interface GymMapViewProps {
  /** The gyms to draw: the nearest ones to the centre, already filtered. */
  matches: readonly GymMatch[];
  selectedId: string | null;
  /** Where the map opens. */
  initial: GymMapFocus;
  focus: GymMapFocus | null;
  /** Shows the climber's own position; only set after they tap Near me. */
  showUser: boolean;
  onSelect: (gym: Gym) => void;
  onCenterChange: (center: GeoPoint) => void;
  onUserLocation: (point: GeoPoint) => void;
  /** Location permission was refused. */
  onLocationDenied: () => void;
}
