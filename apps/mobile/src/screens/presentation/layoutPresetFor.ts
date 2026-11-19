import type { Gym, GymBoard } from '@boardclimb/domain';
import type { LayoutPreset } from './LayoutPreset';

export function layoutPresetFor(gym: Gym, board: GymBoard): LayoutPreset {
  return {
    gymName: gym.name,
    manufacturer: board.manufacturer,
    boardName: board.boardName,
    angleDegrees: board.angleDegrees,
  };
}
