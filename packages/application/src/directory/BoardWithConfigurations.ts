import type { BoardConfiguration, BoardModel } from '@boardclimb/domain';

export interface BoardWithConfigurations {
  board: BoardModel;
  configurations: BoardConfiguration[];
}
