import type { BoardConfiguration } from '@boardclimb/domain';

/** Identity of a cached catalog slice: manufacturer and configuration id. */
export function makeConfigKey(configuration: Pick<BoardConfiguration, 'manufacturer' | 'id'>): string {
  return `${configuration.manufacturer}/${encodeURIComponent(configuration.id)}`;
}
