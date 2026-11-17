import type { HoldRole } from './HoldRole';

/** A hold used by a problem. The provider hold id is opaque here; adapters own geometry and LED mapping. */
export interface HoldPlacement {
  holdId: string;
  role: HoldRole;
}
