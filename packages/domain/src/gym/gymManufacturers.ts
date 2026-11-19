import { MANUFACTURERS } from '../board/Manufacturer';
import type { Manufacturer } from '../board/Manufacturer';
import type { Gym } from './Gym';

/** The manufacturers whose boards a gym has, in the app's fixed manufacturer order. */
export function gymManufacturers(gym: Gym): Manufacturer[] {
  return MANUFACTURERS.filter((manufacturer) =>
    gym.boards.some((board) => board.manufacturer === manufacturer),
  );
}
