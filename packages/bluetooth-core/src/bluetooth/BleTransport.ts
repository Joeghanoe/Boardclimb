import type { BleDevice } from './BleDevice';
import type { TransportConnectResult } from '../board/TransportConnectResult';

/**
 * The raw radio (CODE.8): permissions, scanning, connecting and writing bytes. A BLE library implements it;
 * manufacturer logic never touches the library. Permission is requested only inside user-started actions.
 */
export interface BleTransport {
  requestPermission(): Promise<'granted' | 'denied'>;
  radioState(): Promise<'on' | 'off'>;
  scan(): Promise<BleDevice[]>;
  connect(deviceId: string): Promise<TransportConnectResult>;
  /** Resolves false when the controller rejects or drops the write. */
  write(deviceId: string, frame: Uint8Array): Promise<boolean>;
  disconnect(deviceId: string): Promise<void>;
  onDisconnected(listener: (deviceId: string) => void): () => void;
}
