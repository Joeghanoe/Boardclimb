import type { Manufacturer } from './Manufacturer';

export interface BoardModel {
  id: string;
  manufacturer: Manufacturer;
  name: string;
}
