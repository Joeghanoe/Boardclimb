import type { Manufacturer } from '@boardclimb/domain';

/** What a gym listing says about one of its boards, used to start the board picker there. Nothing is chosen for the climber. */
export interface LayoutPreset {
  gymName: string;
  manufacturer: Manufacturer;
  /** Catalog board model name, matched exactly; null when the listing does not say. */
  boardName: string | null;
  angleDegrees: number | null;
}
