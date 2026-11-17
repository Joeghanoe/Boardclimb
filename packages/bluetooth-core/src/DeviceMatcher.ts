import type { BleDevice } from './BleDevice';
import type { DeviceMatch } from './DeviceMatch';

/** Decides whether a scanned device is this manufacturer's controller. Null means not recognised. */
export type DeviceMatcher = (device: BleDevice) => DeviceMatch | null;
