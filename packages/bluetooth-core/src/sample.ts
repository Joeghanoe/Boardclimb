import type { Manufacturer } from '@boardclimb/domain';
import type { DeviceMatcher } from './DeviceMatcher';
import type { LedEncoder } from './LedEncoder';

/** Recognises the scripted sample controllers only: devices named `Sample <manufacturer> ...`. */
export function sampleDeviceMatcher(
  manufacturer: Manufacturer,
  configurationId: string | null,
): DeviceMatcher {
  const prefix = `sample ${manufacturer}`;
  return (device) => (device.name?.toLowerCase().startsWith(prefix) ? { configurationId } : null);
}

/**
 * NOT a vendor protocol. Encodes hold ids as text so tests and the sample mode can observe which holds
 * were sent. Must never be wired to real hardware.
 */
export const sampleLedEncoder: LedEncoder = {
  encode: (problem) => [
    new TextEncoder().encode(`SAMPLE ${problem.holds.map((hold) => hold.holdId).join(',')}`),
  ],
};
