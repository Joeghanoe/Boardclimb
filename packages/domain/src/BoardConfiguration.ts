import type { Manufacturer } from './Manufacturer';

/** A catalog board layout (size, hold set, angle). Not a physical controller. */
export interface BoardConfiguration {
  id: string;
  boardId: string;
  manufacturer: Manufacturer;
  name: string;
  angleDegrees: number | null;
}
