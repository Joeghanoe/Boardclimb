import { Platform } from 'react-native';
import type { AppContainer } from './AppContainer';
import { ExpoSqliteDatabase } from './ExpoSqliteDatabase';
import { createAppContainer } from './createAppContainer';
import { createSampleTransport } from './createRegistry';
import { randomIds, systemClock } from './systemEnvironment';

/**
 * Today's app: sample mode (made-up catalogs, scripted radio) until vendor sources and a BLE library are
 * verified. On the web preview records stay in memory; on a phone they go to SQLite.
 */
export async function createDeviceContainer(): Promise<AppContainer> {
  const database = Platform.OS === 'web' ? null : await ExpoSqliteDatabase.open();
  return createAppContainer({
    database,
    transport: createSampleTransport(),
    clock: systemClock,
    ids: randomIds,
    mode: 'sample',
  });
}
