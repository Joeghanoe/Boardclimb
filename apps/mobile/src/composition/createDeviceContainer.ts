import type { AppContainer } from './AppContainer';
import { SnapshotProviderSource } from '@boardclimb/provider-snapshots';
import { ExpoSqliteDatabase } from './ExpoSqliteDatabase';
import { DeviceSnapshotReader } from './DeviceSnapshotReader';
import { NativeBleTransport } from './NativeBleTransport';
import { createAppContainer } from './createAppContainer';
import { randomIds, systemClock } from './systemEnvironment';

/** Phone builds use real public snapshots and native Bluetooth; web remains an explicit sample preview. */
export async function createDeviceContainer(): Promise<AppContainer> {
  const reader = new DeviceSnapshotReader();
  return createAppContainer({
    database: await ExpoSqliteDatabase.open(),
    transport: new NativeBleTransport(),
    clock: systemClock,
    ids: randomIds,
    mode: 'live',
    sources: {
      kilter: new SnapshotProviderSource('kilter', reader),
      moonboard: new SnapshotProviderSource('moonboard', reader),
      tension: new SnapshotProviderSource('tension', reader),
    },
  });
}
