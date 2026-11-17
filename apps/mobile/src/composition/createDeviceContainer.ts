import type { AppContainer } from './AppContainer';
import { ExpoSqliteDatabase } from './ExpoSqliteDatabase';
import { createSampleDeviceContainer } from './createSampleDeviceContainer';

/** On a phone, records go to SQLite. The browser preview uses `createDeviceContainer.web.ts`, which has no SQLite. */
export async function createDeviceContainer(): Promise<AppContainer> {
  return createSampleDeviceContainer(await ExpoSqliteDatabase.open());
}
