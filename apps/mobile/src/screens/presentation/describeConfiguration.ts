import type { BoardConfiguration } from '@boardclimb/domain';

/** A layout as the climber reads it on the wall, for example "12 x 12 with kickboard · 40°". */
export function describeConfiguration(configuration: BoardConfiguration): string {
  return configuration.angleDegrees === null
    ? configuration.name
    : `${configuration.name} · ${configuration.angleDegrees}°`;
}
