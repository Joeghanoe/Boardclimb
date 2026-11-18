import type { DeviceMatcher } from '../device/DeviceMatcher';
import type { LedEncoder } from './LedEncoder';

/** No verified advertisement format exists yet, so nothing is claimed to be a compatible controller. */
export const unverifiedDeviceMatcher: DeviceMatcher = () => null;

/** No verified LED protocol exists yet, so lightUp reports `protocol_unverified` instead of guessing bytes. */
export const unverifiedLedEncoder: LedEncoder = { encode: () => null };
