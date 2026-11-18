import type { AppContainer } from './AppContainer';
import { SnapshotProviderSource } from '@boardclimb/provider-snapshots';
import { ExpoSqliteDatabase } from './ExpoSqliteDatabase';
import { DeviceSnapshotReader } from './DeviceSnapshotReader';
import { catalogManifestUrls } from './catalogManifestUrls';
import { NativeBleTransport } from './NativeBleTransport';
import { createAppContainer } from './createAppContainer';
import { randomIds, systemClock } from './systemEnvironment';

/** Phone builds use real public snapshots and native Bluetooth; web remains an explicit sample preview. */
export async function createDeviceContainer(): Promise<AppContainer> {
  // EXPO_PUBLIC_ values are inlined at build time; the mirror origin is public, not a secret.
  const reader = new DeviceSnapshotReader(
    Date.now,
    catalogManifestUrls(process.env.EXPO_PUBLIC_CATALOG_MIRROR_URL),
  );
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
