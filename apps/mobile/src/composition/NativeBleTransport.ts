import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, State } from 'react-native-ble-plx';
import type { Characteristic, Device, Subscription } from 'react-native-ble-plx';
import type { BleDevice, BleTransport, TransportConnectResult } from '@boardclimb/bluetooth-core';

// Adapted from BoardSesh transport.ts; Apache-2.0, c788005 (NOTICE).
const UART = ['6e400001-b5a3-f393-e0a9-e50e24dcca9e', '6e400002-b5a3-f393-e0a9-e50e24dcca9e'];
const REDBEAR = ['713d0000-503e-4c75-ba94-3148f18d941e', '713d0003-503e-4c75-ba94-3148f18d941e'];

/** Lazy manager: opening the app neither prompts for Bluetooth nor selects a controller. */
export class NativeBleTransport implements BleTransport {
  private manager: BleManager | null = null;
  private readonly links = new Map<
    string,
    { device: Device; characteristic: Characteristic; subscription: Subscription }
  >();
  private readonly listeners = new Set<(id: string) => void>();
  private scanning: Promise<BleDevice[]> | null = null;
  private get radio(): BleManager {
    return (this.manager ??= new BleManager());
  }

  async requestPermission(): Promise<'granted' | 'denied'> {
    if (Platform.OS === 'android') {
      const permissions =
        Number(Platform.Version) >= 31
          ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
          : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const results = await PermissionsAndroid.requestMultiple(permissions);
      if (permissions.some((p) => results[p] !== PermissionsAndroid.RESULTS.GRANTED)) return 'denied';
    }
    const state = await this.readyState();
    return state === State.Unauthorized ? 'denied' : 'granted';
  }
  private async readyState(): Promise<State> {
    const state = await this.radio.state();
    if (state !== State.Unknown && state !== State.Resetting) return state;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        subscription.remove();
        resolve(State.PoweredOff);
      }, 5000);
      const subscription = this.radio.onStateChange((next) => {
        if (next !== State.Unknown && next !== State.Resetting) {
          clearTimeout(timeout);
          subscription.remove();
          resolve(next);
        }
      }, false);
    });
  }
  async radioState(): Promise<'on' | 'off'> {
    return (await this.readyState()) === State.PoweredOn ? 'on' : 'off';
  }
  scan(): Promise<BleDevice[]> {
    if (this.scanning) return this.scanning;
    this.scanning = new Promise<BleDevice[]>((resolve, reject) => {
      const found = new Map<string, BleDevice>();
      const timer = setTimeout(() => {
        this.radio.stopDeviceScan();
        resolve([...found.values()]);
      }, 8000);
      this.radio.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          clearTimeout(timer);
          this.radio.stopDeviceScan();
          reject(error);
          return;
        }
        if (device) found.set(device.id, { id: device.id, name: device.name ?? device.localName });
      });
    }).finally(() => {
      this.scanning = null;
    });
    return this.scanning;
  }
  async connect(id: string): Promise<TransportConnectResult> {
    if (this.links.has(id)) return { ok: true };
    let device: Device | undefined;
    try {
      device = await this.radio.connectToDevice(id, { timeout: 12000 });
      device = await device.discoverAllServicesAndCharacteristics();
      let characteristic: Characteristic | undefined;
      for (const [service, uuid] of [UART, REDBEAR]) {
        if (!service || !uuid) continue;
        try {
          characteristic = (await device.characteristicsForService(service)).find(
            (c) => c.uuid.toLowerCase() === uuid && (c.isWritableWithResponse || c.isWritableWithoutResponse),
          );
          if (characteristic) break;
        } catch {
          /* Try the older MoonBoard service only when this service is absent. */
        }
      }
      if (!characteristic) {
        await device.cancelConnection();
        return { ok: false, reason: 'failed' };
      }
      const subscription = this.radio.onDeviceDisconnected(id, () => {
        this.links.get(id)?.subscription.remove();
        this.links.delete(id);
        for (const l of this.listeners) l(id);
      });
      this.links.set(id, { device, characteristic, subscription });
      return { ok: true };
    } catch {
      await device?.cancelConnection().catch(() => undefined);
      return { ok: false, reason: 'failed' };
    }
  }
  async write(id: string, frame: Uint8Array): Promise<boolean> {
    const link = this.links.get(id);
    if (!link || !frame.length) return false;
    try {
      for (let offset = 0; offset < frame.length; offset += 20) {
        if (this.links.get(id) !== link) return false;
        const base64 = btoa(String.fromCharCode(...frame.slice(offset, offset + 20)));
        const c = link.characteristic;
        if (c.isWritableWithResponse)
          await link.device.writeCharacteristicWithResponseForService(c.serviceUUID, c.uuid, base64);
        else await link.device.writeCharacteristicWithoutResponseForService(c.serviceUUID, c.uuid, base64);
        await new Promise<void>((resolve) => setTimeout(resolve, 5));
      }
      return true;
    } catch {
      return false;
    }
  }
  async disconnect(id: string): Promise<void> {
    const link = this.links.get(id);
    this.links.delete(id);
    link?.subscription.remove();
    await link?.device.cancelConnection();
  }
  onDisconnected(listener: (id: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
