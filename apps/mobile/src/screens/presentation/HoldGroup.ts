import type { HoldRole } from '@boardclimb/domain';

export interface HoldGroup {
  role: HoldRole;
  label: string;
  holdIds: string[];
}
