import type { BoardConfiguration } from '@boardclimb/domain';

/** The angle shown when nothing has been chosen yet: the one most walls are set to. */
export const DEFAULT_ANGLE = 40;

/**
 * The configuration to select within one layout: the climber's angle if the layout has it, else the usual
 * wall angle, else the first one it lists, so switching layout or board never leaves the angle empty.
 */
export function pickConfiguration(
  configurations: readonly BoardConfiguration[],
  preferredAngle: number | null,
): BoardConfiguration | null {
  return (
    configurations.find((c) => c.angleDegrees === preferredAngle) ??
    configurations.find((c) => c.angleDegrees === DEFAULT_ANGLE) ??
    configurations[0] ??
    null
  );
}
