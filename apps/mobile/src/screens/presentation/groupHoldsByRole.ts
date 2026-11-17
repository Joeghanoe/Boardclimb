import type { HoldPlacement, HoldRole } from '@boardclimb/domain';
import type { HoldGroup } from './HoldGroup';

const ORDER: { role: HoldRole; label: string }[] = [
  { role: 'start', label: 'Start' },
  { role: 'hand', label: 'Hands' },
  { role: 'foot', label: 'Feet' },
  { role: 'finish', label: 'Finish' },
];

/** Holds in climbing order; roles without holds are left out. */
export function groupHoldsByRole(holds: readonly HoldPlacement[]): HoldGroup[] {
  return ORDER.map(({ role, label }) => ({
    role,
    label,
    holdIds: holds.filter((hold) => hold.role === role).map((hold) => hold.holdId),
  })).filter((group) => group.holdIds.length > 0);
}
