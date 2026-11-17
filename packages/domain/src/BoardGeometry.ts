import type { BoardBounds } from './BoardBounds';
import type { BoardHold } from './BoardHold';

/** Complete selected layout, separate from the route and from persisted climber history. */
export interface BoardGeometry {
  bounds: BoardBounds;
  holds: readonly BoardHold[];
}
