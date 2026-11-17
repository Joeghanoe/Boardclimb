import type { AppContainer } from './AppContainer';
import { createSampleDeviceContainer } from './createSampleDeviceContainer';

/** Browser preview: records stay in memory (the app says so through `persistent: false`); expo-sqlite is not loaded. */
export function createDeviceContainer(): Promise<AppContainer> {
  return createSampleDeviceContainer(null);
}
