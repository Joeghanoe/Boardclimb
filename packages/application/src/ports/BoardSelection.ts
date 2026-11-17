import type { BoardConfiguration } from '@boardclimb/domain';

/**
 * The board layout the climber chose to browse. A catalog choice, not a physical controller. It keeps the whole
 * configuration so the cached problems can be browsed on a cold start without the network.
 */
export interface BoardSelection {
  boardName: string;
  configuration: BoardConfiguration;
}
