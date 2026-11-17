import type { SqlDatabase } from '@boardclimb/storage-local';
import type { AppContainer } from './AppContainer';
import { createAppContainer } from './createAppContainer';
import { createSampleTransport } from './createRegistry';
import { randomIds, systemClock } from './systemEnvironment';

/**
 * Today's app: sample mode (made-up catalogs, scripted radio) until vendor sources and a BLE library are
 * verified. `database` null keeps records in memory.
 */
export function createSampleDeviceContainer(database: SqlDatabase | null): Promise<AppContainer> {
  return createAppContainer({
    database,
    transport: createSampleTransport(),
    clock: systemClock,
    ids: randomIds,
    mode: 'sample',
  });
}
