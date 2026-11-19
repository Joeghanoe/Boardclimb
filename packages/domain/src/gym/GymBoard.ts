import type { Manufacturer } from '../board/Manufacturer';

/**
 * One board a gym lists. Only what the public listing says: null means the listing does not say,
 * not "none" (a Tension or MoonBoard listing names the gym, not its walls).
 */
export interface GymBoard {
  manufacturer: Manufacturer;
  /** The gym's own name for the wall, for example "Kilter Board 30". */
  name: string | null;
  /** The catalog board model, for example "Kilter Board Original". */
  boardName: string | null;
  /** The fixed angle of a wall that is not adjustable. */
  angleDegrees: number | null;
  adjustable: boolean | null;
  /** Whether the board has LEDs the app can light. */
  lights: boolean | null;
}
