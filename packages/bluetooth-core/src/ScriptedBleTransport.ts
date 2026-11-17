import type { BleDevice } from './BleDevice';
import type { BleTransport } from './BleTransport';
import type { TransportConnectResult } from './TransportConnectResult';

/**
 * A scripted stand-in for the radio: it shows the devices it is given, records every call and can be told to
 * fail. It serves tests and the labelled sample mode, never real hardware (T.6: not evidence for a vendor).
 */
export class ScriptedBleTransport implements BleTransport {
  devices: BleDevice[] = [];
  permission: 'granted' | 'denied' = 'granted';
  radio: 'on' | 'off' = 'on';
  connectResult: TransportConnectResult = { ok: true };
  writeResult = true;
  scanFails = false;
  /** Every transport call in order, as `name` or `name:deviceId`. */
  readonly calls: string[] = [];
  readonly writes: { deviceId: string; frame: Uint8Array }[] = [];
  private readonly listeners = new Set<(deviceId: string) => void>();

  requestPermission(): Promise<'granted' | 'denied'> {
    this.calls.push('requestPermission');
    return Promise.resolve(this.permission);
  }

  radioState(): Promise<'on' | 'off'> {
    this.calls.push('radioState');
    return Promise.resolve(this.radio);
  }

  scan(): Promise<BleDevice[]> {
    this.calls.push('scan');
    return this.scanFails ? Promise.reject(new Error('scan failed')) : Promise.resolve(this.devices);
  }

  connect(deviceId: string): Promise<TransportConnectResult> {
    this.calls.push(`connect:${deviceId}`);
    return Promise.resolve(this.connectResult);
  }

  write(deviceId: string, frame: Uint8Array): Promise<boolean> {
    this.calls.push(`write:${deviceId}`);
    if (this.writeResult) this.writes.push({ deviceId, frame });
    return Promise.resolve(this.writeResult);
  }

  disconnect(deviceId: string): Promise<void> {
    this.calls.push(`disconnect:${deviceId}`);
    return Promise.resolve();
  }

  onDisconnected(listener: (deviceId: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Simulates the link dropping (phone locked, out of range). */
  simulateDisconnect(deviceId: string): void {
    for (const listener of this.listeners) listener(deviceId);
  }

  get writeCount(): number {
    return this.calls.filter((call) => call.startsWith('write:')).length;
  }
}
