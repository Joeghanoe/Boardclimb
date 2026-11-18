import type { DeviceMatcher } from '@boardclimb/bluetooth-core';

/** BoardSesh name-based discovery; configuration always needs the climber's confirmation. */
export const matchTensionDevice: DeviceMatcher = (device) =>
  /^Tension(?:[ -]?Board)?(?:[ #@]|$)/i.test(device.name ?? '') ? { configurationId: null } : null;
