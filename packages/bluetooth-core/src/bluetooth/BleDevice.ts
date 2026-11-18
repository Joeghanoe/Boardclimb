export interface BleDevice {
  id: string;
  name: string | null;
  /** Signal strength observed during discovery, in dBm. */
  rssi?: number;
}
