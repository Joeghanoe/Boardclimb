import type { DeviceMatcher } from '@boardclimb/bluetooth-core';

/** BoardSesh name-based discovery; configuration always needs the climber's confirmation. */
export const matchKilterDevice: DeviceMatcher = (device) =>
  /^Kilter(?:[ -]?Board)?(?:[ #@]|$)/i.test(device.name ?? '') ? { configurationId: null } : null;
