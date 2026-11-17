import type { DeviceMatcher } from '@boardclimb/bluetooth-core';

/** BoardSesh name-based discovery; configuration always needs the climber's confirmation. */
export const matchMoonBoardDevice: DeviceMatcher = (device) =>
  /^Moon[Bb]oard(?:[ #@]|$)/i.test(device.name ?? '') ? { configurationId: null } : null;
